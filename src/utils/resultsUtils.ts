import { GitHubItem } from '../types';

/**
 * Results Utilities
 *
 * Provides functions for filtering, sorting, and manipulating GitHub items results.
 */

/**
 * Filter configuration for GitHub items
 */
export interface ResultsFilter {
  /** Type filter: 'all', 'issue', 'pr', or 'comment' */
  filter: 'all' | 'issue' | 'pr' | 'comment';
  /** Status filter: 'all', 'open', 'closed', or 'merged' */
  statusFilter: 'all' | 'open' | 'closed' | 'merged';
  /** Label filter: specific label name to include */
  labelFilter: string;
  /** Array of label names to exclude */
  excludedLabels: string[];
  /** Array of repository filters in 'owner/repo' format */
  repoFilters: string[];
  /** Text search query */
  searchText: string;
}

/**
 * Extracts unique labels from an array of GitHub items
 *
 * @param items - Array of GitHub items
 * @returns Array of unique label names sorted alphabetically
 */
export const extractAvailableLabels = (items: GitHubItem[]): string[] => {
  const labels = new Set<string>();

  if (!Array.isArray(items)) {
    return [];
  }

  items.forEach(item => {
    item.labels?.forEach(label => labels.add(label.name));
  });

  return Array.from(labels).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
};

/**
 * Determines the type of a GitHub item (issue, pull request, or comment)
 *
 * @param item - GitHub item to analyze
 * @returns The item type
 */
export const getItemType = (item: GitHubItem): 'issue' | 'pr' | 'comment' => {
  // Check if this is a comment event (title starts with "Comment on:")
  if (item.title.startsWith('Comment on:')) {
    return 'comment';
  }
  // Check if it's a pull request
  if (item.pull_request) {
    return 'pr';
  }
  // Default to issue
  return 'issue';
};

/**
 * Filters GitHub items based on type (issue vs pull request vs comment)
 *
 * @param items - Array of GitHub items to filter
 * @param filter - Type filter ('all', 'issue', 'pr', 'comment')
 * @returns Filtered array of items
 */
export const filterByType = (
  items: GitHubItem[],
  filter: 'all' | 'issue' | 'pr' | 'comment'
): GitHubItem[] => {
  if (filter === 'all') return items;

  return items.filter(item => {
    const itemType = getItemType(item);

    if (filter === 'pr') {
      return itemType === 'pr';
    } else if (filter === 'issue') {
      return itemType === 'issue';
    } else if (filter === 'comment') {
      return itemType === 'comment';
    }

    return false;
  });
};

/**
 * Filters GitHub items based on status (open, closed, merged)
 *
 * @param items - Array of GitHub items to filter
 * @param statusFilter - Status filter ('all', 'open', 'closed', 'merged')
 * @returns Filtered array of items
 */
export const filterByStatus = (
  items: GitHubItem[],
  statusFilter: 'all' | 'open' | 'closed' | 'merged'
): GitHubItem[] => {
  if (statusFilter === 'all') return items;

  if (statusFilter === 'merged') {
    return items.filter(
      item => item.pull_request && (item.pull_request.merged_at || item.merged)
    );
  }

  return items.filter(item => {
    // For pull requests, exclude merged ones when filtering by open/closed
    if (item.pull_request && (item.pull_request.merged_at || item.merged)) {
      return false;
    }
    return item.state === statusFilter;
  });
};

/**
 * Filters GitHub items based on label criteria
 *
 * @param items - Array of GitHub items to filter
 * @param labelFilter - Label name to include (empty string means no filter)
 * @param excludedLabels - Array of label names to exclude
 * @returns Filtered array of items
 */
export const filterByLabels = (
  items: GitHubItem[],
  labelFilter: string,
  excludedLabels: string[]
): GitHubItem[] => {
  return items.filter(item => {
    // Apply inclusive label filter
    if (labelFilter && !item.labels?.some(l => l.name === labelFilter)) {
      return false;
    }

    // Apply exclusive label filters
    if (
      excludedLabels.length > 0 &&
      item.labels?.some(l => excludedLabels.includes(l.name))
    ) {
      return false;
    }

    return true;
  });
};

/**
 * Filters GitHub items based on repository
 *
 * @param items - Array of GitHub items to filter
 * @param repoFilters - Array of repository names in 'owner/repo' format
 * @returns Filtered array of items
 */
export const filterByRepository = (
  items: GitHubItem[],
  repoFilters: string[]
): GitHubItem[] => {
  if (repoFilters.length === 0) return items;

  console.log('Filtering by repositories:', repoFilters);
  return items.filter(item => {
    const itemRepo = item.repository_url?.replace(
      'https://api.github.com/repos/',
      ''
    );
    console.log('Item repository:', itemRepo);
    const included = itemRepo && repoFilters.includes(itemRepo);
    console.log('Is included:', included);
    return included;
  });
};

/**
 * Filters GitHub items based on text search in title and body
 *
 * @param items - Array of GitHub items to filter
 * @param searchText - Text to search for (case-insensitive)
 * @returns Filtered array of items
 */
export const filterByText = (
  items: GitHubItem[],
  searchText: string
): GitHubItem[] => {
  if (!searchText.trim()) return items;

  const searchLower = searchText.toLowerCase();

  return items.filter(item => {
    const titleMatch = item.title.toLowerCase().includes(searchLower);
    const bodyMatch = item.body?.toLowerCase().includes(searchLower);
    return titleMatch || bodyMatch;
  });
};

/**
 * Sorts GitHub items by date
 *
 * @param items - Array of GitHub items to sort
 * @param sortOrder - Sort order ('updated' or 'created')
 * @returns Sorted array of items (newest first)
 */
export const sortItems = (
  items: GitHubItem[],
  sortOrder: 'updated' | 'created'
): GitHubItem[] => {
  return [...items].sort((a, b) => {
    const dateA = new Date(
      sortOrder === 'updated' ? a.updated_at : a.created_at
    );
    const dateB = new Date(
      sortOrder === 'updated' ? b.updated_at : b.created_at
    );
    return dateB.getTime() - dateA.getTime();
  });
};

/**
 * Applies all filters and sorting to GitHub items
 *
 * @param items - Array of GitHub items to process
 * @param filters - Filter configuration object
 * @param sortOrder - Sort order ('updated' or 'created')
 * @returns Filtered and sorted array of items
 */
export const applyFiltersAndSort = (
  items: GitHubItem[],
  filters: ResultsFilter,
  sortOrder: 'updated' | 'created' = 'updated'
): GitHubItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  let filteredItems = items;

  // Apply all filters in sequence
  filteredItems = filterByType(filteredItems, filters.filter);
  filteredItems = filterByStatus(filteredItems, filters.statusFilter);
  filteredItems = filterByLabels(
    filteredItems,
    filters.labelFilter,
    filters.excludedLabels
  );
  filteredItems = filterByRepository(filteredItems, filters.repoFilters);
  filteredItems = filterByText(filteredItems, filters.searchText);

  // Apply sorting
  filteredItems = sortItems(filteredItems, sortOrder);

  return filteredItems;
};

/**
 * Checks if a GitHub item is merged
 *
 * @param item - GitHub item to check
 * @returns True if the item is a merged pull request
 */
export const isMerged = (item: GitHubItem): boolean => {
  return !!(item.pull_request && (item.pull_request.merged_at || item.merged));
};

/**
 * Gets the repository name from a GitHub item
 *
 * @param item - GitHub item
 * @returns Repository name in 'owner/repo' format, or undefined if not available
 */
export const getRepositoryName = (item: GitHubItem): string | undefined => {
  return item.repository_url?.replace('https://api.github.com/repos/', '');
};

/**
 * Checks if any filters are active (not in default state)
 *
 * @param filters - Filter configuration object
 * @returns True if any filters are active
 */
export const hasActiveFilters = (filters: ResultsFilter): boolean => {
  return (
    filters.filter !== 'all' ||
    filters.statusFilter !== 'all' ||
    filters.labelFilter !== '' ||
    filters.excludedLabels.length > 0 ||
    filters.searchText !== '' ||
    filters.repoFilters.length > 0
  );
};

/**
 * Creates a default filter configuration
 *
 * @returns Default ResultsFilter object
 */
export const createDefaultFilter = (): ResultsFilter => ({
  filter: 'all',
  statusFilter: 'all',
  labelFilter: '',
  excludedLabels: [],
  repoFilters: [],
  searchText: '',
});

/**
 * Generates a human-readable summary of active filters
 *
 * @param filters - Filter configuration object
 * @returns Array of filter summary strings
 */
export const getFilterSummary = (filters: ResultsFilter): string[] => {
  const summaryParts: string[] = [];

  if (filters.filter !== 'all') {
    summaryParts.push(`Type: ${filters.filter === 'pr' ? 'PRs' : 'Issues'}`);
  }
  if (filters.statusFilter !== 'all') {
    summaryParts.push(`Status: ${filters.statusFilter}`);
  }
  if (filters.labelFilter) {
    summaryParts.push(`Label: ${filters.labelFilter}`);
  }
  if (filters.excludedLabels.length > 0) {
    summaryParts.push(`Excluded labels: ${filters.excludedLabels.join(', ')}`);
  }
  if (filters.searchText) {
    summaryParts.push(`Search: "${filters.searchText}"`);
  }
  if (filters.repoFilters.length > 0) {
    summaryParts.push(`Repos: ${filters.repoFilters.join(', ')}`);
  }

  return summaryParts;
};
