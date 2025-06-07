import { GitHubItem } from '../types';

/**
 * Supported filter types for counting GitHub items
 */
export type FilterType = 'type' | 'status' | 'label' | 'repo';

/**
 * Filter values for different filter types
 */
export type FilterValue = string;

/**
 * Options for filtering GitHub items
 */
export interface FilterOptions {
  /** The type of filter to apply */
  filterType: FilterType;
  /** The value to filter by */
  filterValue: FilterValue;
  /** Array of label names to exclude from results */
  excludedLabels: string[];
}

/**
 * Counts the number of GitHub items that match the specified filter criteria.
 *
 * This function supports filtering by:
 * - **Type**: Filter by issue ('issue') or pull request ('pr'), or show all ('all')
 * - **Status**: Filter by open ('open'), closed ('closed'), merged ('merged'), or show all ('all')
 * - **Label**: Filter by items that have a specific label name
 * - **Repository**: Filter by items from a specific repository
 *
 * @param items - Array of GitHub items to filter and count
 * @param filterType - The type of filter to apply ('type', 'status', 'label', 'repo')
 * @param filterValue - The value to filter by (depends on filterType)
 * @param excludedLabels - Array of label names to exclude from label filtering
 * @returns The number of items that match the filter criteria
 *
 * @example
 * ```typescript
 * // Count all pull requests
 * const prCount = countItemsMatchingFilter(items, 'type', 'pr', []);
 *
 * // Count open issues
 * const openCount = countItemsMatchingFilter(items, 'status', 'open', []);
 *
 * // Count items with 'bug' label, excluding 'wontfix' labeled items
 * const bugCount = countItemsMatchingFilter(items, 'label', 'bug', ['wontfix']);
 *
 * // Count items from specific repository
 * const repoCount = countItemsMatchingFilter(items, 'repo', 'owner/repo-name', []);
 * ```
 */
export const countItemsMatchingFilter = (
  items: GitHubItem[],
  filterType: FilterType,
  filterValue: FilterValue,
  excludedLabels: string[]
): number => {
  if (!Array.isArray(items)) {
    return 0;
  }

  switch (filterType) {
    case 'type':
      return items.filter(item => {
        if (filterValue === 'all') return true;

        // Check if this is a comment event
        const isComment = item.title.startsWith('Comment on:');

        if (filterValue === 'pr') {
          return !!item.pull_request && !isComment;
        }
        if (filterValue === 'issue') {
          return !item.pull_request && !isComment;
        }
        if (filterValue === 'comment') {
          return isComment;
        }
        return false;
      }).length;

    case 'status':
      if (filterValue === 'merged') {
        return items.filter(
          item =>
            item.pull_request && (item.pull_request.merged_at || item.merged)
        ).length;
      }
      return items.filter(item => {
        if (filterValue === 'all') return true;

        // For pull requests, check if they're merged first
        if (item.pull_request) {
          if (item.pull_request.merged_at || item.merged) return false;
          return item.state === filterValue;
        }

        // For issues, just check the state
        return item.state === filterValue;
      }).length;

    case 'label':
      return items.filter(item => {
        // Must have the specified label
        const hasLabel = item.labels?.some(l => l.name === filterValue);
        if (!hasLabel) return false;

        // Must not have any excluded labels
        const hasExcludedLabel = item.labels?.some(l =>
          excludedLabels.includes(l.name)
        );
        return !hasExcludedLabel;
      }).length;

    case 'repo':
      return items.filter(item => {
        const itemRepo = item.repository_url?.replace(
          'https://api.github.com/repos/',
          ''
        );
        return itemRepo === filterValue;
      }).length;

    default:
      return 0;
  }
};
