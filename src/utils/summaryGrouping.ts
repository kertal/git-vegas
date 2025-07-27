import { GitHubItem } from '../types';
import { SUMMARY_GROUP_NAMES, createEmptyGroups, type SummaryGroupName } from './summaryConstants';

/**
 * Extracts the base PR URL by removing fragments (e.g., #pullrequestreview-123456)
 */
export const getBasePRUrl = (htmlUrl: string): string => {
  return htmlUrl.split('#')[0];
};

/**
 * Parses usernames from a comma-separated string
 */
export const parseUsernames = (username: string): string[] => {
  return username.split(',').map(u => u.trim().toLowerCase());
};

/**
 * Checks if an item is authored by any of the searched users
 */
export const isAuthoredBySearchedUser = (item: GitHubItem, searchedUsernames: string[]): boolean => {
  const itemAuthor = item.user.login.toLowerCase();
  return searchedUsernames.includes(itemAuthor);
};

/**
 * Determines the event type based on item properties (exact copy of original getEventType logic)
 */
export const getEventType = (item: GitHubItem): string => {
  // Check if this is a review comment (title starts with "Review comment on:")
  if (item.title.startsWith('Review comment on:')) {
    return 'comment';
  }
  // Check if this is a comment event (title starts with "Comment on:")
  if (item.title.startsWith('Comment on:')) {
    return 'comment';
  }
  // Check if this is a push event (title starts with "Pushed")
  if (item.title.startsWith('Pushed')) {
    return 'commit';
  }
  // Check for other event types that don't belong to issues/PRs
  if (
    item.title.startsWith('Created branch') ||
    item.title.startsWith('Created tag') ||
    item.title.startsWith('Created repository') ||
    item.title.startsWith('Deleted branch') ||
    item.title.startsWith('Deleted tag') ||
    item.title.startsWith('Forked repository') ||
    item.title.startsWith('Starred') ||
    item.title.startsWith('Unstarred') ||
    item.title.startsWith('Made repository public') ||
    item.title.includes('wiki page')
  ) {
    return 'other';
  }
  return item.pull_request ? 'pull_request' : 'issue';
};

/**
 * Categories a GitHub item based on its type and content (preserves original logic exactly)
 */
export const categorizeItem = (
  item: GitHubItem,
  searchedUsernames: string[],
  addedReviewPRs: Set<string>
): SummaryGroupName | null => {
  const type = getEventType(item);

  if (type === 'pull_request' && item.title?.startsWith('Review on:')) {
    const basePRUrl = getBasePRUrl(item.html_url);
    if (!addedReviewPRs.has(basePRUrl)) {
      addedReviewPRs.add(basePRUrl);
      return SUMMARY_GROUP_NAMES.PRS_REVIEWED;
    }
    return null; // Skip duplicate reviews
  }

  if (type === 'comment' && item.title?.startsWith('Review comment on:')) {
    // Review comments on PRs are ignored (section removed)
    return null;
  }

  if (type === 'comment') {
    return SUMMARY_GROUP_NAMES.ISSUES_UPDATED;
  }

  if (type === 'commit') {
    return SUMMARY_GROUP_NAMES.COMMITS;
  }

  if (type === 'other') {
    return SUMMARY_GROUP_NAMES.OTHER_EVENTS;
  }

  if (type === 'pull_request') {
    if (item.merged_at) {
      return SUMMARY_GROUP_NAMES.PRS_MERGED;
    } else if (item.state === 'closed') {
      return SUMMARY_GROUP_NAMES.PRS_CLOSED;
    } else {
      return SUMMARY_GROUP_NAMES.PRS_OPENED;
    }
  }

  // Handle issues (default case - matches original logic)
  if (isAuthoredBySearchedUser(item, searchedUsernames)) {
    // Authored by searched user
    if (item.state === 'closed') {
      return SUMMARY_GROUP_NAMES.ISSUES_CLOSED;
    } else {
      return SUMMARY_GROUP_NAMES.ISSUES_OPENED;
    }
  } else {
    // Not authored by searched user, must be assigned
    // All assigned issues go to updated section regardless of state
    return SUMMARY_GROUP_NAMES.ISSUES_UPDATED;
  }
};

/**
 * Groups GitHub items into summary categories
 */
export const groupItems = (
  items: GitHubItem[],
  searchedUsernames: string[]
): Record<SummaryGroupName, GitHubItem[]> => {
  const groups = createEmptyGroups<GitHubItem>();
  const addedReviewPRs = new Set<string>();

  items.forEach(item => {
    const groupName = categorizeItem(item, searchedUsernames, addedReviewPRs);
    if (groupName) {
      groups[groupName].push(item);
    }
  });

  return groups;
};

/**
 * Filters and adds merged PRs from search items that fall within date range
 */
export const addMergedPRsFromSearchItems = (
  groups: Record<SummaryGroupName, GitHubItem[]>,
  searchItems: GitHubItem[],
  startDate: string,
  endDate: string
): void => {
  const startDateTime = new Date(startDate).getTime();
  const endDateTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1; // End of day

  const existingMergedPRUrls = new Set(groups[SUMMARY_GROUP_NAMES.PRS_MERGED].map(item => item.html_url));
  
  searchItems.forEach(searchItem => {
    const mergedAt = searchItem.merged_at || searchItem.pull_request?.merged_at;
    if (searchItem.pull_request && mergedAt && !existingMergedPRUrls.has(searchItem.html_url)) {
      const mergeDate = new Date(mergedAt);
      const mergeTime = mergeDate.getTime();
      if (mergeTime >= startDateTime && mergeTime <= endDateTime) {
        groups[SUMMARY_GROUP_NAMES.PRS_MERGED].push(searchItem);
      }
    }
  });
};

/**
 * Adds assigned issues from search items that aren't already included
 */
export const addAssignedIssuesFromSearchItems = (
  groups: Record<SummaryGroupName, GitHubItem[]>,
  searchItems: GitHubItem[],
  searchedUsernames: string[]
): void => {
  const existingIssueUrls = new Set([
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_OPENED].map(item => item.html_url),
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_CLOSED].map(item => item.html_url),
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_UPDATED].map(item => item.html_url),
  ]);

  searchItems.forEach(searchItem => {
    if (!searchItem.pull_request && !existingIssueUrls.has(searchItem.html_url)) {
      const itemAuthor = searchItem.user.login.toLowerCase();
      if (!searchedUsernames.includes(itemAuthor)) {
        // This is an assigned issue (not authored by searched user)
        // All assigned issues go to updated section regardless of state
        groups[SUMMARY_GROUP_NAMES.ISSUES_UPDATED].push(searchItem);
      }
    }
  });
};

/**
 * Main function to group all GitHub data for the Summary view
 */
export const groupSummaryData = (
  items: GitHubItem[],
  searchItems: GitHubItem[],
  username: string,
  startDate: string,
  endDate: string
): Record<SummaryGroupName, GitHubItem[]> => {
  const searchedUsernames = parseUsernames(username);
  
  // Group items first
  const groups = groupItems(items, searchedUsernames);
  
  // Add merged PRs from search items
  addMergedPRsFromSearchItems(groups, searchItems, startDate, endDate);
  
  // Add assigned issues from search items
  addAssignedIssuesFromSearchItems(groups, searchItems, searchedUsernames);
  
  return groups;
}; 