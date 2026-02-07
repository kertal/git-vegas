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
 * Determines the event type based on item properties using stable GitHub event types
 * Falls back to title parsing for items without originalEventType (e.g., from Search API)
 */
export const getEventType = (item: GitHubItem): string => {
  // Use original GitHub event type if available (from Events API)
  if (item.originalEventType) {
    switch (item.originalEventType) {
      case 'PullRequestReviewEvent':
        return 'pull_request';
      case 'PullRequestReviewCommentEvent':
        return 'comment';
      case 'PullRequestEvent':
        return 'pull_request';
      case 'IssuesEvent':
        return 'issue';
      case 'IssueCommentEvent':
        return 'comment';
      case 'PushEvent':
        return 'commit';
      case 'CreateEvent':
      case 'DeleteEvent':
      case 'ForkEvent':
      case 'WatchEvent':
      case 'PublicEvent':
      case 'GollumEvent':
        return 'other';
      default:
        // Unknown event type, fall back to title parsing
        break;
    }
  }

  // Fallback to title parsing for items without originalEventType (e.g., from Search API)
  // Check if this is a pull request review (title starts with "Review on:")
  if (item.title.startsWith('Review on:')) {
    return 'pull_request';
  }
  // Check if this is a review comment (title starts with "Review comment on:")
  if (item.title.startsWith('Review comment on:')) {
    return 'comment';
  }
  // Check if this is a comment event (title starts with "Comment on:")
  if (item.title.startsWith('Comment on:')) {
    return 'comment';
  }
  // Check if this is a push event (title starts with "Committed")
  if (item.title.startsWith('Committed')) {
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
  addedReviewPRs: Set<string>,
  startDate: string,
  endDate: string
): SummaryGroupName | null => {
  const type = getEventType(item);

  if (type === 'pull_request' && item.title?.startsWith('Review on:')) {
    const basePRUrl = getBasePRUrl(item.html_url);
    const reviewKey = `${item.user.login}:${basePRUrl}`; // Deduplicate per person per PR
    if (!addedReviewPRs.has(reviewKey)) {
      addedReviewPRs.add(reviewKey);
      return SUMMARY_GROUP_NAMES.PRS_REVIEWED;
    }
    return null; // Skip duplicate reviews from same person on same PR
  }

  if (type === 'comment' && item.title?.startsWith('Review comment on:')) {
    // Review comments on PRs are ignored (section removed)
    return null;
  }

  if (type === 'comment') {
    return SUMMARY_GROUP_NAMES.COMMENTS;
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

  // Handle issues - categorize by recent activity regardless of authorship
  // Ensure this is actually an issue and not a PR
  if (type === 'issue' && !item.pull_request) {
    const createdInRange = isDateInRange(item.created_at, startDate, endDate);
    const closedInRange = item.closed_at && isDateInRange(item.closed_at, startDate, endDate);

    if (item.state === 'closed' && closedInRange) {
      return SUMMARY_GROUP_NAMES.ISSUES_CLOSED;
    } else if (createdInRange && (!item.action || item.action === 'opened')) {
      // Issue was created in range - either explicitly opened or no action specified (from Search API)
      return SUMMARY_GROUP_NAMES.ISSUES_OPENED;
    } else {
      return SUMMARY_GROUP_NAMES.ISSUES_UPDATED;
    }
  }

  return null;
};

/**
 * Categories a GitHub item based on its type and content
 */
export const categorizeItem = (
  item: GitHubItem,
  addedReviewPRs: Set<string>,
  startDate: string,
  endDate: string
): SummaryGroupName | null => {
  const type = getEventType(item);

  if (type === 'pull_request' && item.title?.startsWith('Review on:')) {
    const basePRUrl = getBasePRUrl(item.html_url);
    const reviewKey = `${item.user.login}:${basePRUrl}`; // Deduplicate per person per PR
    if (!addedReviewPRs.has(reviewKey)) {
      addedReviewPRs.add(reviewKey);
      return SUMMARY_GROUP_NAMES.PRS_REVIEWED;
    }
    return null; // Skip duplicate reviews from same person on same PR
  }

  if (type === 'comment' && item.title?.startsWith('Review comment on:')) {
    // Review comments on PRs are ignored (section removed)
    return null;
  }

  if (type === 'comment') {
    return SUMMARY_GROUP_NAMES.COMMENTS;
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

  // Handle issues - apply date range filtering regardless of authorship
  // Ensure this is actually an issue and not a PR
  if (type === 'issue' && !item.pull_request) {
    const createdInRange = isDateInRange(item.created_at, startDate, endDate);
    const closedInRange = item.closed_at && isDateInRange(item.closed_at, startDate, endDate);
    const updatedInRange = isDateInRange(item.updated_at, startDate, endDate);

    if (item.state === 'closed' && closedInRange) {
      // Issue was closed within the timeframe
      return SUMMARY_GROUP_NAMES.ISSUES_CLOSED;
    } else if (createdInRange && (!item.action || item.action === 'opened')) {
      // Issue was created in range - either explicitly opened or no action specified (from Search API)
      return SUMMARY_GROUP_NAMES.ISSUES_OPENED;
    } else if (updatedInRange) {
      // Issue was updated in the timeframe (labeled, assigned, etc.) but was not categorized as opened/closed in this summary
      return SUMMARY_GROUP_NAMES.ISSUES_UPDATED;
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
  startDate: string,
  endDate: string,
  applyDateFiltering = true
): Record<SummaryGroupName, GitHubItem[]> => {
  const groups = createEmptyGroups<GitHubItem>();
  const addedReviewKeys = new Set<string>(); // Tracks person:PR combinations for review deduplication

  items.forEach(item => {
    const groupName = applyDateFiltering 
      ? categorizeItem(item, addedReviewKeys, startDate, endDate)
      : categorizeItemWithoutDateFiltering(item, addedReviewKeys, startDate, endDate);
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
 * Adds issues from search items that aren't already included
 */
export const addIssuesFromSearchItems = (
  groups: Record<SummaryGroupName, GitHubItem[]>,
  searchItems: GitHubItem[],
  startDate: string,
  endDate: string
): void => {
  const existingIssueUrls = new Set([
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_OPENED].map(item => item.html_url),
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_CLOSED].map(item => item.html_url),
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_UPDATED].map(item => item.html_url),
  ]);

  searchItems.forEach(searchItem => {
    // Explicitly filter out PRs to ensure they don't appear in issue sections
    if (!searchItem.pull_request && !existingIssueUrls.has(searchItem.html_url)) {
      // Categorize the issue using the same logic as other issues
      const addedReviewPRs = new Set<string>(); // Empty set since we're only dealing with issues
      const groupName = categorizeItem(searchItem, addedReviewPRs, startDate, endDate);
      
      if (groupName && (groupName === SUMMARY_GROUP_NAMES.ISSUES_OPENED || 
                        groupName === SUMMARY_GROUP_NAMES.ISSUES_CLOSED || 
                        groupName === SUMMARY_GROUP_NAMES.ISSUES_UPDATED)) {
        groups[groupName].push(searchItem);
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
  startDate: string,
  endDate: string
): Record<SummaryGroupName, GitHubItem[]> => {
  // Group items first (apply proper date filtering for categorization)
  const groups = groupItems(items, startDate, endDate, true);
  
  // Add merged PRs from search items
  addMergedPRsFromSearchItems(groups, searchItems, startDate, endDate);
  
  // Add issues from search items
  addIssuesFromSearchItems(groups, searchItems, startDate, endDate);
  

  
  return groups;
}; 