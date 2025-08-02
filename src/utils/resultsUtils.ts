import { GitHubItem } from '../types';

/**
 * Results Utilities
 *
 * Provides functions for filtering, sorting, and manipulating GitHub items results.
 */

// Cache for parseSearchText to avoid repeated regex parsing
const parseSearchTextCache = new Map<string, {
  includedLabels: string[];
  excludedLabels: string[];
  userFilters: string[];
  includedRepos: string[];
  excludedRepos: string[];
  cleanText: string;
}>();

// Limit cache size to prevent memory leaks
const MAX_CACHE_SIZE = 100;

/**
 * Filter configuration for GitHub items
 */
export interface ResultsFilter {
  /** Type filter: 'all', 'issue', 'pr', or 'comment' */
  filter: 'all' | 'issue' | 'pr' | 'comment';
  /** Status filter: 'all', 'open', 'closed', or 'merged' */
  statusFilter: 'all' | 'open' | 'closed' | 'merged';
  /** Array of label names to include */
  includedLabels?: string[];
  /** Array of label names to exclude */
  excludedLabels?: string[];
  /** Array of repository filters in 'owner/repo' format */
  repoFilters?: string[];
  /** User filter for a specific GitHub username */
  userFilter?: string;
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
  // Check if this is a pull request review (title starts with "Reviewed:")
  if (item.title.startsWith('Reviewed:')) {
    return 'pr';
  }
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
 * @param includedLabels - Array of label names to include (empty array means no filter)
 * @param excludedLabels - Array of label names to exclude
 * @returns Filtered array of items
 */
export const filterByLabels = (
  items: GitHubItem[],
  includedLabels: string[] | undefined,
  excludedLabels: string[] | undefined
): GitHubItem[] => {
  // Provide default empty arrays if parameters are undefined
  const safeIncludedLabels = includedLabels || [];
  const safeExcludedLabels = excludedLabels || [];

  return items.filter(item => {
    // Apply inclusive label filter - item must have ALL included labels
    if (safeIncludedLabels.length > 0) {
      const itemLabels = item.labels?.map(l => l.name) || [];
      const hasAllIncludedLabels = safeIncludedLabels.every(requiredLabel =>
        itemLabels.includes(requiredLabel)
      );
      if (!hasAllIncludedLabels) {
        return false;
      }
    }

    // Apply exclusive label filters - item must have NONE of the excluded labels
    if (
      safeExcludedLabels.length > 0 &&
      item.labels?.some(l => safeExcludedLabels.includes(l.name))
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
  repoFilters: string[] | undefined
): GitHubItem[] => {
  const safeRepoFilters = repoFilters || [];
  if (safeRepoFilters.length === 0) return items;

  return items.filter(item => {
    const itemRepo = item.repository_url?.replace(
      'https://api.github.com/repos/',
      ''
    );
    const included = itemRepo && safeRepoFilters.includes(itemRepo);
    return included;
  });
};

/**
 * Filters GitHub items based on user
 *
 * @param items - Array of GitHub items to filter
 * @param userFilter - Username to filter by (case-insensitive)
 * @returns Filtered array of items
 */
export const filterByUser = (
  items: GitHubItem[],
  userFilter: string | undefined
): GitHubItem[] => {
  if (!userFilter?.trim()) return items;

  return items.filter(item => {
    return item.user.login.toLowerCase() === userFilter.toLowerCase();
  });
};

/**
 * Parses search text to extract label filters, user filters, repo filters, and regular text
 * 
 * @param searchText - The search text to parse
 * @returns Object containing includedLabels, excludedLabels, userFilters, includedRepos, excludedRepos, and cleanText
 */
export const parseSearchText = (searchText: string): {
  includedLabels: string[];
  excludedLabels: string[];
  userFilters: string[];
  includedRepos: string[];
  excludedRepos: string[];
  cleanText: string;
} => {
  if (!searchText.trim()) {
    return { includedLabels: [], excludedLabels: [], userFilters: [], includedRepos: [], excludedRepos: [], cleanText: '' };
  }

  // Check cache first
  const cached = parseSearchTextCache.get(searchText);
  if (cached) {
    return cached;
  }

  const includedLabels: string[] = [];
  const excludedLabels: string[] = [];
  const userFilters: string[] = [];
  const includedRepos: string[] = [];
  const excludedRepos: string[] = [];
  let cleanText = searchText;

  // First, find all -label:{labelname} patterns (excluded labels)
  const excludeLabelRegex = /-label:([^\s]+)/g;
  let match;
  const excludeMatches: RegExpExecArray[] = [];
  while ((match = excludeLabelRegex.exec(searchText)) !== null) {
    excludedLabels.push(match[1]);
    excludeMatches.push(match);
  }

  // Remove all excluded label matches from cleanText
  excludeMatches.forEach(m => {
    cleanText = cleanText.replace(m[0], ' ');
  });

  // Then find all label:{labelname} patterns (included labels) from the cleaned text
  const includeLabelRegex = /\blabel:([^\s]+)/g;
  const includeMatches: RegExpExecArray[] = [];
  while ((match = includeLabelRegex.exec(cleanText)) !== null) {
    includedLabels.push(match[1]);
    includeMatches.push(match);
  }

  // Remove all included label matches from cleanText
  includeMatches.forEach(m => {
    cleanText = cleanText.replace(m[0], ' ');
  });

  // Then find all user:{username} patterns from the cleaned text
  const userRegex = /\buser:([^\s]+)/g;
  const userMatches: RegExpExecArray[] = [];
  while ((match = userRegex.exec(cleanText)) !== null) {
    userFilters.push(match[1]);
    userMatches.push(match);
  }

  // Remove all user matches from cleanText
  userMatches.forEach(m => {
    cleanText = cleanText.replace(m[0], ' ');
  });

  // Then find all -repo:{reponame} patterns (excluded repos)
  const excludeRepoRegex = /-repo:([^\s]+)/g;
  const excludeRepoMatches: RegExpExecArray[] = [];
  while ((match = excludeRepoRegex.exec(cleanText)) !== null) {
    excludedRepos.push(match[1]);
    excludeRepoMatches.push(match);
  }

  // Remove all excluded repo matches from cleanText
  excludeRepoMatches.forEach(m => {
    cleanText = cleanText.replace(m[0], ' ');
  });

  // Then find all repo:{reponame} patterns from the cleaned text
  const includeRepoRegex = /\brepo:([^\s]+)/g;
  const includeRepoMatches: RegExpExecArray[] = [];
  while ((match = includeRepoRegex.exec(cleanText)) !== null) {
    includedRepos.push(match[1]);
    includeRepoMatches.push(match);
  }

  // Remove all included repo matches from cleanText
  includeRepoMatches.forEach(m => {
    cleanText = cleanText.replace(m[0], ' ');
  });

  // Clean up extra whitespace
  cleanText = cleanText.replace(/\s+/g, ' ').trim();

  const result = { includedLabels, excludedLabels, userFilters, includedRepos, excludedRepos, cleanText };

  // Cache the result
  if (parseSearchTextCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry (first in Map)
    const firstKey = parseSearchTextCache.keys().next().value;
    if (firstKey !== undefined) {
      parseSearchTextCache.delete(firstKey);
    }
  }
  parseSearchTextCache.set(searchText, result);

  return result;
};

/**
 * Filters GitHub items based on text search in title and body, with support for label, user, and repo syntax
 *
 * @param items - Array of GitHub items to filter
 * @param searchText - Text to search for, supporting label:{name}, -label:{name}, user:{username}, repo:{owner/repo}, and -repo:{owner/repo} syntax
 * @returns Filtered array of items
 */
export const filterByText = (
  items: GitHubItem[],
  searchText: string
): GitHubItem[] => {
  if (!searchText.trim()) return items;

  const { includedLabels, excludedLabels, userFilters, includedRepos, excludedRepos, cleanText } = parseSearchText(searchText);

  return items.filter(item => {
    // Check label filters first
    if (includedLabels.length > 0 || excludedLabels.length > 0) {
      const itemLabels = (item.labels || []).map(label => label.name.toLowerCase());
      
      // Check if item has all required included labels
      if (includedLabels.length > 0) {
        const hasAllIncludedLabels = includedLabels.every(labelName =>
          itemLabels.includes(labelName.toLowerCase())
        );
        if (!hasAllIncludedLabels) return false;
      }
      
      // Check if item has any excluded labels
      if (excludedLabels.length > 0) {
        const hasExcludedLabel = excludedLabels.some(labelName =>
          itemLabels.includes(labelName.toLowerCase())
        );
        if (hasExcludedLabel) return false;
      }
    }

    // Check user filters
    if (userFilters.length > 0) {
      const itemUser = item.user.login.toLowerCase();
      const matchesUser = userFilters.some(userFilter =>
        itemUser === userFilter.toLowerCase()
      );
      if (!matchesUser) return false;
    }

    // Check repository filters
    if (includedRepos.length > 0 || excludedRepos.length > 0) {
      // Extract repository name from repository_url (format: https://api.github.com/repos/owner/repo)
      const itemRepo = item.repository_url?.replace('https://api.github.com/repos/', '');
      
      if (!itemRepo) {
        // If no repository info, exclude if any repo filters are specified
        if (includedRepos.length > 0) return false;
      } else {
        // Check if item has all required included repos
        if (includedRepos.length > 0) {
          const hasIncludedRepo = includedRepos.some(repoFilter =>
            itemRepo.toLowerCase() === repoFilter.toLowerCase()
          );
          if (!hasIncludedRepo) return false;
        }

        // Check if item has any excluded repos
        if (excludedRepos.length > 0) {
          const hasExcludedRepo = excludedRepos.some(repoFilter =>
            itemRepo.toLowerCase() === repoFilter.toLowerCase()
          );
          if (hasExcludedRepo) return false;
        }
      }
    }

    // If there's clean text remaining, search in title and body
    if (cleanText) {
      const searchLower = cleanText.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(searchLower);
      const bodyMatch = item.body?.toLowerCase().includes(searchLower);
      return titleMatch || bodyMatch;
    }

    // If only label/user/repo filters were used, item passed checks above
    return true;
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
    filters.includedLabels,
    filters.excludedLabels
  );
  filteredItems = filterByRepository(filteredItems, filters.repoFilters);
  filteredItems = filterByUser(filteredItems, filters.userFilter);
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
    (filters.includedLabels || []).length > 0 ||
    (filters.excludedLabels || []).length > 0 ||
    filters.searchText !== '' ||
    (filters.repoFilters || []).length > 0 ||
    Boolean(filters.userFilter && filters.userFilter.trim() !== '')
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
  includedLabels: [],
  excludedLabels: [],
  repoFilters: [],
  userFilter: '',
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
  if (filters.userFilter && filters.userFilter.trim() !== '') {
    summaryParts.push(`User: ${filters.userFilter}`);
  }
  if ((filters.includedLabels || []).length > 0) {
    summaryParts.push(`Include: ${(filters.includedLabels || []).join(', ')}`);
  }
  if ((filters.excludedLabels || []).length > 0) {
    summaryParts.push(`Excluded labels: ${(filters.excludedLabels || []).join(', ')}`);
  }
  if (filters.searchText) {
    summaryParts.push(`Search: "${filters.searchText}"`);
  }
  if ((filters.repoFilters || []).length > 0) {
    summaryParts.push(`Repos: ${(filters.repoFilters || []).join(', ')}`);
  }

  return summaryParts;
};
