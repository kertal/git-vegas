import { GitHubItem } from '../types';
import { parseSearchText } from './resultsUtils';

/**
 * Advanced filtering logic for GitHub items based on labels, users, and text
 * This replaces the duplicate filtering logic found in Summary.tsx and EventView.tsx
 */
export const filterItemsByAdvancedSearch = (
  items: GitHubItem[],
  searchText: string
): GitHubItem[] => {
  if (!searchText || !searchText.trim()) {
    return items;
  }

  const { includedLabels, excludedLabels, userFilters, cleanText } = parseSearchText(searchText);

  return items.filter(item => {
    // Check label filters first
    if (includedLabels.length > 0 || excludedLabels.length > 0) {
      const itemLabels = (item.labels || []).map(label =>
        label.name.toLowerCase()
      );

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

    // If there's clean text remaining, search in title, body, and username
    if (cleanText) {
      const searchLower = cleanText.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(searchLower);
      const bodyMatch = item.body?.toLowerCase().includes(searchLower);
      const userMatch = item.user.login.toLowerCase().includes(searchLower);
      return titleMatch || bodyMatch || userMatch;
    }

    // If only label/user filters were used, item passed checks above
    return true;
  });
};

/**
 * Sorts GitHub items by updated date (newest first)
 * This replaces the duplicate sorting logic found across all view components
 */
export const sortItemsByUpdatedDate = (items: GitHubItem[]): GitHubItem[] => {
  return [...items].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
};

/**
 * Parses comma-separated usernames (common pattern in IssuesAndPRsList)
 */
export const parseCommaSeparatedUsernames = (username: string): string[] => {
  return username.split(',').map(u => u.trim().toLowerCase());
};

/**
 * Checks if an item is authored by any of the searched users (common pattern)
 */
export const isItemAuthoredBySearchedUsers = (item: GitHubItem, searchedUsernames: string[]): boolean => {
  const itemAuthor = item.user.login.toLowerCase();
  return searchedUsernames.includes(itemAuthor);
}; 