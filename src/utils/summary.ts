/**
 * Summary View Utilities
 *
 * Consolidates all summary-related functionality:
 * - Group name constants and types
 * - Event categorization and grouping logic
 * - Clipboard formatting helpers
 * - UI state helpers for summary sections
 */

import { GitHubItem } from '../types';

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

/**
 * Summary view group name constants
 */
export const SUMMARY_GROUP_NAMES = {
  PRS_OPENED: 'PRs - opened',
  PRS_UPDATED: 'PRs - updated',
  PRS_REVIEWED: 'PRs - reviewed',
  PRS_MERGED: 'PRs - merged',
  PRS_CLOSED: 'PRs - closed',
  ISSUES_OPENED: 'Issues - opened',
  ISSUES_UPDATED: 'Issues - updated',
  ISSUES_CLOSED: 'Issues - closed',
  COMMENTS: 'Comments',
  COMMITS: 'Commits',
  OTHER_EVENTS: 'Other Events',
} as const;

export type SummaryGroupName = (typeof SUMMARY_GROUP_NAMES)[keyof typeof SUMMARY_GROUP_NAMES];

/**
 * Returns all group names as an array
 */
export const getAllGroupNames = (): SummaryGroupName[] => {
  return Object.values(SUMMARY_GROUP_NAMES);
};

/**
 * Creates an empty groups object with all summary categories
 */
export const createEmptyGroups = <T = unknown>(): Record<SummaryGroupName, T[]> => {
  return Object.values(SUMMARY_GROUP_NAMES).reduce(
    (acc, groupName) => {
      acc[groupName] = [];
      return acc;
    },
    {} as Record<SummaryGroupName, T[]>
  );
};

// ============================================================================
// GROUPING LOGIC
// ============================================================================

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
  return username.split(',').map((u) => u.trim().toLowerCase());
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
  if (item.title.startsWith('Review on:')) {
    return 'pull_request';
  }
  if (item.title.startsWith('Review comment on:')) {
    return 'comment';
  }
  if (item.title.startsWith('Comment on:')) {
    return 'comment';
  }
  if (item.title.startsWith('Pushed')) {
    return 'commit';
  }
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
 * Categorizes a GitHub item without date filtering (for already date-filtered results)
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
  if (type === 'issue' && !item.pull_request) {
    const createdInRange = isDateInRange(item.created_at, startDate, endDate);
    const closedInRange = item.closed_at && isDateInRange(item.closed_at, startDate, endDate);

    if (item.state === 'closed' && closedInRange) {
      return SUMMARY_GROUP_NAMES.ISSUES_CLOSED;
    } else if (createdInRange) {
      return SUMMARY_GROUP_NAMES.ISSUES_OPENED;
    } else {
      return SUMMARY_GROUP_NAMES.ISSUES_UPDATED;
    }
  }

  return null;
};

/**
 * Categorizes a GitHub item based on its type and content with date filtering
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
  if (type === 'issue' && !item.pull_request) {
    const createdInRange = isDateInRange(item.created_at, startDate, endDate);
    const closedInRange = item.closed_at && isDateInRange(item.closed_at, startDate, endDate);
    const updatedInRange = isDateInRange(item.updated_at, startDate, endDate);

    if (item.state === 'closed' && closedInRange) {
      // Issue was closed within the timeframe
      return SUMMARY_GROUP_NAMES.ISSUES_CLOSED;
    } else if (createdInRange) {
      // Issue was created within the timeframe (regardless of current state)
      return SUMMARY_GROUP_NAMES.ISSUES_OPENED;
    } else if (updatedInRange && !createdInRange && !closedInRange) {
      // Issue had activity but wasn't created/closed within timeframe
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

  items.forEach((item) => {
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

  const existingMergedPRUrls = new Set(
    groups[SUMMARY_GROUP_NAMES.PRS_MERGED].map((item) => item.html_url)
  );

  searchItems.forEach((searchItem) => {
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
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_OPENED].map((item) => item.html_url),
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_CLOSED].map((item) => item.html_url),
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_UPDATED].map((item) => item.html_url),
  ]);

  searchItems.forEach((searchItem) => {
    // Explicitly filter out PRs to ensure they don't appear in issue sections
    if (!searchItem.pull_request && !existingIssueUrls.has(searchItem.html_url)) {
      // Categorize the issue using the same logic as other issues
      const addedReviewPRs = new Set<string>(); // Empty set since we're only dealing with issues
      const groupName = categorizeItem(searchItem, addedReviewPRs, startDate, endDate);

      if (
        groupName &&
        (groupName === SUMMARY_GROUP_NAMES.ISSUES_OPENED ||
          groupName === SUMMARY_GROUP_NAMES.ISSUES_CLOSED ||
          groupName === SUMMARY_GROUP_NAMES.ISSUES_UPDATED)
      ) {
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

// ============================================================================
// CLIPBOARD & UI HELPERS
// ============================================================================

/**
 * Creates a formatted group data structure for clipboard operations
 */
export const formatGroupedDataForClipboard = (
  actionGroups: Record<string, GitHubItem[]>,
  selectedItems?: Set<string | number>
): Array<{ groupName: string; items: GitHubItem[] }> => {
  let groupedData = Object.entries(actionGroups)
    .filter(([, items]) => items.length > 0)
    .map(([groupName, items]) => ({
      groupName,
      items,
    }));

  // Filter to only selected items if any are selected
  if (selectedItems && selectedItems.size > 0) {
    groupedData = groupedData
      .map(({ groupName, items }) => ({
        groupName,
        items: items.filter((item) => selectedItems.has(item.event_id || item.id)),
      }))
      .filter(({ items }) => items.length > 0);
  }

  return groupedData;
};

/**
 * Gets all displayed items from grouped data
 */
export const getAllDisplayedItems = (actionGroups: Record<string, GitHubItem[]>): GitHubItem[] => {
  return Object.values(actionGroups).flat();
};

/**
 * Checks if any groups have items
 */
export const hasAnyItems = (actionGroups: Record<string, GitHubItem[]>): boolean => {
  return Object.values(actionGroups).some((items) => items.length > 0);
};

/**
 * Gets total count of all items across groups
 */
export const getTotalItemCount = (actionGroups: Record<string, GitHubItem[]>): number => {
  return Object.values(actionGroups).reduce((total, items) => total + items.length, 0);
};

/**
 * Checks if a section should be collapsed based on stored preferences
 */
export const isSectionCollapsed = (sectionName: string, collapsedSections: Set<string>): boolean => {
  return collapsedSections.has(sectionName);
};

/**
 * Gets the select all state for a specific group
 */
export const getGroupSelectState = (
  groupItems: GitHubItem[],
  selectedItems: Set<string | number>
): { checked: boolean; indeterminate: boolean } => {
  if (groupItems.length === 0) {
    return { checked: false, indeterminate: false };
  }

  const selectedCount = groupItems.filter((item) =>
    selectedItems.has(item.event_id || item.id)
  ).length;

  if (selectedCount === 0) {
    return { checked: false, indeterminate: false };
  } else if (selectedCount === groupItems.length) {
    return { checked: true, indeterminate: false };
  } else {
    return { checked: false, indeterminate: true };
  }
};
