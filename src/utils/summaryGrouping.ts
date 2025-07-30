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
 * Checks if a date is within the specified range
 */
export const isDateInRange = (dateStr: string, startDate: string, endDate: string): boolean => {
  const date = new Date(dateStr);
  const start = new Date(startDate);
  const end = new Date(endDate);
  // Add one day to end date to include the entire end day
  end.setDate(end.getDate() + 1);
  return date >= start && date < end;
};

/**
 * Categories a GitHub item without date filtering (for already date-filtered results)
 */
export const categorizeItemWithoutDateFiltering = (
  item: GitHubItem,
  searchedUsernames: string[],
  addedReviewPRs: Set<string>,
  startDate: string,
  endDate: string
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
    return SUMMARY_GROUP_NAMES.ISSUES_UPDATED_ASSIGNEE;
  }

  if (type === 'commit') {
    return SUMMARY_GROUP_NAMES.COMMITS;
  }

  if (type === 'other') {
    return SUMMARY_GROUP_NAMES.OTHER_EVENTS;
  }

  if (type === 'pull_request') {
    // Categorize PRs by their state and recent activity rather than strict date filtering
    const mergedAt = item.merged_at || item.pull_request?.merged_at;
    const createdInRange = isDateInRange(item.created_at, startDate, endDate);
    const mergedInRange = mergedAt && isDateInRange(mergedAt, startDate, endDate);
    const closedInRange = item.closed_at && isDateInRange(item.closed_at, startDate, endDate);

    if (mergedAt && mergedInRange) {
      return SUMMARY_GROUP_NAMES.PRS_MERGED;
    } else if (item.state === 'closed' && closedInRange && !mergedAt) {
      return SUMMARY_GROUP_NAMES.PRS_CLOSED;
    } else if (createdInRange) {
      return SUMMARY_GROUP_NAMES.PRS_OPENED;
    } else {
      // PR was updated but not created/merged/closed within timeframe
      return SUMMARY_GROUP_NAMES.PRS_UPDATED;
    }
  }

  // Handle issues - categorize by authorship and recent activity
  // Ensure this is actually an issue and not a PR
  if (type === 'issue' && !item.pull_request) {
    const createdInRange = isDateInRange(item.created_at, startDate, endDate);
    const closedInRange = item.closed_at && isDateInRange(item.closed_at, startDate, endDate);

    if (isAuthoredBySearchedUser(item, searchedUsernames)) {
      if (item.state === 'closed' && closedInRange) {
        return SUMMARY_GROUP_NAMES.ISSUES_CLOSED;
      } else if (createdInRange) {
        return SUMMARY_GROUP_NAMES.ISSUES_OPENED;
      } else {
        return SUMMARY_GROUP_NAMES.ISSUES_UPDATED_AUTHOR;
      }
    } else {
      // Assigned issue - always goes to assignee updated section
      return SUMMARY_GROUP_NAMES.ISSUES_UPDATED_ASSIGNEE;
    }
  }

  return null;
};

/**
 * Categories a GitHub item based on its type and content
 */
export const categorizeItem = (
  item: GitHubItem,
  searchedUsernames: string[],
  addedReviewPRs: Set<string>,
  startDate: string,
  endDate: string
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
    return SUMMARY_GROUP_NAMES.ISSUES_UPDATED_ASSIGNEE;
  }

  if (type === 'commit') {
    return SUMMARY_GROUP_NAMES.COMMITS;
  }

  if (type === 'other') {
    return SUMMARY_GROUP_NAMES.OTHER_EVENTS;
  }

  if (type === 'pull_request') {
    const mergedAt = item.merged_at || item.pull_request?.merged_at;
    const createdInRange = isDateInRange(item.created_at, startDate, endDate);
    const mergedInRange = mergedAt && isDateInRange(mergedAt, startDate, endDate);
    const closedInRange = item.closed_at && isDateInRange(item.closed_at, startDate, endDate);
    const updatedInRange = isDateInRange(item.updated_at, startDate, endDate);



    // Check if PR was merged within the timeframe
    if (mergedAt && mergedInRange) {
      return SUMMARY_GROUP_NAMES.PRS_MERGED;
    } 
    // Check if PR was closed within the timeframe (and not merged)
    else if (item.state === 'closed' && closedInRange && !mergedAt) {
      return SUMMARY_GROUP_NAMES.PRS_CLOSED;
    } 
    // Check if PR was created within the timeframe
    else if (createdInRange) {
      return SUMMARY_GROUP_NAMES.PRS_OPENED;
    } 
    // Check if PR was updated but not created/merged/closed within the timeframe
    else if (updatedInRange && !createdInRange && !mergedInRange && !closedInRange) {
      return SUMMARY_GROUP_NAMES.PRS_UPDATED;
    }
    
    // If none of the above, this PR doesn't belong in this timeframe summary
    return null;
  }

  // Handle issues - apply date range filtering similar to PRs
  // Ensure this is actually an issue and not a PR
  if (type === 'issue' && !item.pull_request) {
    const createdInRange = isDateInRange(item.created_at, startDate, endDate);
    const closedInRange = item.closed_at && isDateInRange(item.closed_at, startDate, endDate);
    const updatedInRange = isDateInRange(item.updated_at, startDate, endDate);

    if (isAuthoredBySearchedUser(item, searchedUsernames)) {
      // Issue authored by searched user
      if (item.state === 'closed' && closedInRange) {
        // Issue was closed within the timeframe
        return SUMMARY_GROUP_NAMES.ISSUES_CLOSED;
      } else if (createdInRange) {
        // Issue was created within the timeframe (regardless of current state)
        return SUMMARY_GROUP_NAMES.ISSUES_OPENED;
      } else if (updatedInRange && !createdInRange && !closedInRange) {
        // Issue had activity but wasn't created/closed within timeframe
        return SUMMARY_GROUP_NAMES.ISSUES_UPDATED_AUTHOR;
      }
    } else {
      // Issue not authored by searched user (assigned)
      if (updatedInRange) {
        // Any activity on assigned issue goes to updated section
        return SUMMARY_GROUP_NAMES.ISSUES_UPDATED_ASSIGNEE;
      }
    }
    
    // If none of the above conditions are met, filter out the issue
    return null;
  }

  // Default fallback (shouldn't reach here for normal issues)
  return null;
};

/**
 * Groups GitHub items into summary categories
 */
export const groupItems = (
  items: GitHubItem[],
  searchedUsernames: string[],
  startDate: string,
  endDate: string,
  applyDateFiltering = true
): Record<SummaryGroupName, GitHubItem[]> => {
  const groups = createEmptyGroups<GitHubItem>();
  const addedReviewPRs = new Set<string>();

  items.forEach(item => {
    const groupName = applyDateFiltering 
      ? categorizeItem(item, searchedUsernames, addedReviewPRs, startDate, endDate)
      : categorizeItemWithoutDateFiltering(item, searchedUsernames, addedReviewPRs, startDate, endDate);
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
  searchedUsernames: string[],
  startDate: string,
  endDate: string
): void => {
  const existingIssueUrls = new Set([
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_OPENED].map(item => item.html_url),
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_CLOSED].map(item => item.html_url),
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_UPDATED_AUTHOR].map(item => item.html_url),
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_UPDATED_ASSIGNEE].map(item => item.html_url),
  ]);

  searchItems.forEach(searchItem => {
    // Explicitly filter out PRs to ensure they don't appear in issue sections
    if (!searchItem.pull_request && !existingIssueUrls.has(searchItem.html_url)) {
      const itemAuthor = searchItem.user.login.toLowerCase();
      if (!searchedUsernames.includes(itemAuthor)) {
        // This is an assigned issue (not authored by searched user)
        // Only add if it has activity within the timeframe
        const updatedInRange = isDateInRange(searchItem.updated_at, startDate, endDate);
        if (updatedInRange) {
          groups[SUMMARY_GROUP_NAMES.ISSUES_UPDATED_ASSIGNEE].push(searchItem);
        }
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
  
  // Group items first (apply proper date filtering for categorization)
  const groups = groupItems(items, searchedUsernames, startDate, endDate, true);
  
  // Add merged PRs from search items
  addMergedPRsFromSearchItems(groups, searchItems, startDate, endDate);
  
  // Add assigned issues from search items
  addAssignedIssuesFromSearchItems(groups, searchItems, searchedUsernames, startDate, endDate);
  

  
  return groups;
}; 