import { GitHubItem } from '../types';
import { SUMMARY_GROUP_NAMES, createEmptyGroups, type SummaryGroupName } from './summaryConstants';

/**
 * Extracts the base PR URL by removing fragments (e.g., #pullrequestreview-123456)
 */
export const getBasePRUrl = (htmlUrl: string): string => {
  return htmlUrl.split('#')[0];
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
        break;
    }
  }

  if (item.title.startsWith('Review on:')) return 'pull_request';
  if (item.title.startsWith('Review comment on:')) return 'comment';
  if (item.title.startsWith('Comment on:')) return 'comment';
  if (item.title.startsWith('Committed')) return 'commit';
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
  end.setDate(end.getDate() + 1);
  return date >= start && date < end;
};

/**
 * Categorizes a GitHub item based on its type and content.
 * When applyDateFiltering is false (already date-filtered results), items that don't
 * match created/merged/closed are placed in the "updated" bucket instead of being excluded.
 */
export const categorizeItem = (
  item: GitHubItem,
  addedReviewPRs: Set<string>,
  startDate: string,
  endDate: string,
  applyDateFiltering = true,
): SummaryGroupName | null => {
  const type = getEventType(item);

  // Review deduplication
  if (type === 'pull_request' && item.title?.startsWith('Review on:')) {
    const basePRUrl = getBasePRUrl(item.html_url);
    const reviewKey = `${item.user.login}:${basePRUrl}`;
    if (!addedReviewPRs.has(reviewKey)) {
      addedReviewPRs.add(reviewKey);
      return SUMMARY_GROUP_NAMES.PRS_REVIEWED;
    }
    return null;
  }

  if (type === 'comment' && item.title?.startsWith('Review comment on:')) return null;
  if (type === 'comment') return SUMMARY_GROUP_NAMES.COMMENTS;
  if (type === 'commit') return SUMMARY_GROUP_NAMES.COMMITS;
  if (type === 'other') return SUMMARY_GROUP_NAMES.OTHER_EVENTS;

  if (type === 'pull_request') {
    const mergedAt = item.merged_at || item.pull_request?.merged_at;
    const createdInRange = isDateInRange(item.created_at, startDate, endDate);
    const mergedInRange = mergedAt && isDateInRange(mergedAt, startDate, endDate);
    const closedInRange = item.closed_at && isDateInRange(item.closed_at, startDate, endDate);

    if (mergedAt && mergedInRange) return SUMMARY_GROUP_NAMES.PRS_MERGED;
    if (item.state === 'closed' && closedInRange && !mergedAt) return SUMMARY_GROUP_NAMES.PRS_CLOSED;
    if (createdInRange) return SUMMARY_GROUP_NAMES.PRS_OPENED;

    if (applyDateFiltering) {
      // Strict: only include if updated in range (and not already matched above)
      const updatedInRange = isDateInRange(item.updated_at, startDate, endDate);
      return updatedInRange ? SUMMARY_GROUP_NAMES.PRS_UPDATED : null;
    }
    // Lenient: always fall back to "updated" for pre-filtered data
    return SUMMARY_GROUP_NAMES.PRS_UPDATED;
  }

  if (type === 'issue' && !item.pull_request) {
    const createdInRange = isDateInRange(item.created_at, startDate, endDate);
    const closedInRange = item.closed_at && isDateInRange(item.closed_at, startDate, endDate);

    if (item.state === 'closed' && closedInRange) return SUMMARY_GROUP_NAMES.ISSUES_CLOSED;
    if (createdInRange && (!item.action || item.action === 'opened')) return SUMMARY_GROUP_NAMES.ISSUES_OPENED;

    if (applyDateFiltering) {
      const updatedInRange = isDateInRange(item.updated_at, startDate, endDate);
      return updatedInRange ? SUMMARY_GROUP_NAMES.ISSUES_UPDATED : null;
    }
    return SUMMARY_GROUP_NAMES.ISSUES_UPDATED;
  }

  return null;
};

/**
 * Groups GitHub items into summary categories
 */
export const groupItems = (
  items: GitHubItem[],
  startDate: string,
  endDate: string,
  applyDateFiltering = true,
): Record<SummaryGroupName, GitHubItem[]> => {
  const groups = createEmptyGroups<GitHubItem>();
  const addedReviewKeys = new Set<string>();

  items.forEach(item => {
    const groupName = categorizeItem(item, addedReviewKeys, startDate, endDate, applyDateFiltering);
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
  endDate: string,
): void => {
  const startDateTime = new Date(startDate).getTime();
  const endDateTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;

  const existingMergedPRUrls = new Set(groups[SUMMARY_GROUP_NAMES.PRS_MERGED].map(item => item.html_url));

  searchItems.forEach(searchItem => {
    const mergedAt = searchItem.merged_at || searchItem.pull_request?.merged_at;
    if (searchItem.pull_request && mergedAt && !existingMergedPRUrls.has(searchItem.html_url)) {
      const mergeTime = new Date(mergedAt).getTime();
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
  endDate: string,
): void => {
  const existingIssueUrls = new Set([
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_OPENED].map(item => item.html_url),
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_CLOSED].map(item => item.html_url),
    ...groups[SUMMARY_GROUP_NAMES.ISSUES_UPDATED].map(item => item.html_url),
  ]);

  searchItems.forEach(searchItem => {
    if (!searchItem.pull_request && !existingIssueUrls.has(searchItem.html_url)) {
      const addedReviewPRs = new Set<string>();
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
 * Adds reviewed PRs from the Search API `reviewed-by:` query results.
 * These are more accurate and comprehensive than the Events API review data,
 * which is limited to ~300 events and 30 days.
 */
export const addReviewedPRsFromSearchItems = (
  groups: Record<SummaryGroupName, GitHubItem[]>,
  reviewItems: GitHubItem[],
): void => {
  const existingReviewUrls = new Set(
    groups[SUMMARY_GROUP_NAMES.PRS_REVIEWED].map(item => getBasePRUrl(item.html_url))
  );

  reviewItems.forEach(reviewItem => {
    const baseUrl = getBasePRUrl(reviewItem.html_url);
    if (!existingReviewUrls.has(baseUrl)) {
      existingReviewUrls.add(baseUrl);
      groups[SUMMARY_GROUP_NAMES.PRS_REVIEWED].push(reviewItem);
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
  endDate: string,
  reviewItems: GitHubItem[] = [],
): Record<SummaryGroupName, GitHubItem[]> => {
  const groups = groupItems(items, startDate, endDate, true);
  addMergedPRsFromSearchItems(groups, searchItems, startDate, endDate);
  addIssuesFromSearchItems(groups, searchItems, startDate, endDate);
  addReviewedPRsFromSearchItems(groups, reviewItems);
  return groups;
};
