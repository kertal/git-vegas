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

  const { includedLabels, excludedLabels, userFilters, includedRepos, excludedRepos, includedOrgs, excludedOrgs, cleanText } = parseSearchText(searchText);

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

    // Check organization filters
    // Organization is extracted from repository_url: https://api.github.com/repos/{org}/{repo}
    if (includedOrgs.length > 0 || excludedOrgs.length > 0) {
      const itemRepo = item.repository_url?.replace('https://api.github.com/repos/', '');
      const itemOrg = itemRepo?.split('/')[0]; // Extract org from "org/repo"

      if (!itemOrg) {
        // If no organization info, exclude if any org filters are specified
        if (includedOrgs.length > 0) return false;
      } else {
        // Check if item belongs to an included org
        if (includedOrgs.length > 0) {
          const hasIncludedOrg = includedOrgs.some(orgFilter =>
            itemOrg.toLowerCase() === orgFilter.toLowerCase()
          );
          if (!hasIncludedOrg) return false;
        }

        // Check if item belongs to an excluded org
        if (excludedOrgs.length > 0) {
          const hasExcludedOrg = excludedOrgs.some(orgFilter =>
            itemOrg.toLowerCase() === orgFilter.toLowerCase()
          );
          if (hasExcludedOrg) return false;
        }
      }
    }

    // If there's clean text remaining, search in title, body, and username
    if (cleanText) {
      const searchLower = cleanText.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(searchLower);
      const bodyMatch = item.body?.toLowerCase().includes(searchLower);
      const userMatch = item.user.login.toLowerCase().includes(searchLower);
      return titleMatch || bodyMatch || userMatch;
    }

    // If only label/user/repo/org filters were used, item passed checks above
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

 