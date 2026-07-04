import { GitHubItem } from '../types';

/**
 * Search-text parsing and advanced filtering for GitHub items.
 *
 * This is the single source of truth for the free-text search box. It parses
 * `label:`, `-label:`, `user:`, `repo:`, `-repo:`, `org:`, and `-org:`
 * qualifiers out of the query string and filters items accordingly.
 */

/** Structured result of parsing a raw search query. */
export interface ParsedSearchText {
  includedLabels: string[];
  excludedLabels: string[];
  userFilters: string[];
  includedRepos: string[];
  excludedRepos: string[];
  includedOrgs: string[];
  excludedOrgs: string[];
  cleanText: string;
}

// Cache parsed queries to avoid repeated regex work on the hot filtering path.
const parseSearchTextCache = new Map<string, ParsedSearchText>();

// Limit cache size to prevent unbounded memory growth.
const MAX_CACHE_SIZE = 100;

/**
 * Extracts all `qualifier:value` matches for a given regex, pushing the values
 * into `out` and stripping the matched substrings from the working text.
 *
 * @returns the text with every match replaced by a space
 */
const extractQualifier = (
  text: string,
  regex: RegExp,
  out: string[]
): string => {
  let result = text;
  let match: RegExpExecArray | null;
  const matched: string[] = [];
  while ((match = regex.exec(text)) !== null) {
    out.push(match[1]);
    matched.push(match[0]);
  }
  matched.forEach(m => {
    result = result.replace(m, ' ');
  });
  return result;
};

/**
 * Parses search text into label / user / repo / org qualifiers plus the
 * remaining free text. Results are memoized.
 *
 * @param searchText - The raw search text to parse
 * @returns Structured qualifiers and the cleaned free-text remainder
 */
export const parseSearchText = (searchText: string): ParsedSearchText => {
  if (!searchText.trim()) {
    return {
      includedLabels: [],
      excludedLabels: [],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    };
  }

  const cached = parseSearchTextCache.get(searchText);
  if (cached) {
    return cached;
  }

  const includedLabels: string[] = [];
  const excludedLabels: string[] = [];
  const userFilters: string[] = [];
  const includedRepos: string[] = [];
  const excludedRepos: string[] = [];
  const includedOrgs: string[] = [];
  const excludedOrgs: string[] = [];

  // Order matters: strip the negated form before the positive form so that a
  // leading `-` isn't left behind and re-matched as an included qualifier.
  let cleanText = searchText;
  cleanText = extractQualifier(cleanText, /-label:([^\s]+)/g, excludedLabels);
  cleanText = extractQualifier(cleanText, /\blabel:([^\s]+)/g, includedLabels);
  cleanText = extractQualifier(cleanText, /\buser:([^\s]+)/g, userFilters);
  cleanText = extractQualifier(cleanText, /-repo:([^\s]+)/g, excludedRepos);
  cleanText = extractQualifier(cleanText, /\brepo:([^\s]+)/g, includedRepos);
  cleanText = extractQualifier(cleanText, /-org:([^\s]+)/g, excludedOrgs);
  cleanText = extractQualifier(cleanText, /\borg:([^\s]+)/g, includedOrgs);

  // Clean up extra whitespace
  cleanText = cleanText.replace(/\s+/g, ' ').trim();

  const result: ParsedSearchText = {
    includedLabels,
    excludedLabels,
    userFilters,
    includedRepos,
    excludedRepos,
    includedOrgs,
    excludedOrgs,
    cleanText,
  };

  // Cache the result, evicting the oldest entry when full.
  if (parseSearchTextCache.size >= MAX_CACHE_SIZE) {
    const firstKey = parseSearchTextCache.keys().next().value;
    if (firstKey !== undefined) {
      parseSearchTextCache.delete(firstKey);
    }
  }
  parseSearchTextCache.set(searchText, result);

  return result;
};

/**
 * Filters GitHub items using the advanced search syntax (labels, users, repos,
 * orgs) plus free-text matching against title, body, and username.
 */
export const filterItemsByAdvancedSearch = (
  items: GitHubItem[],
  searchText: string
): GitHubItem[] => {
  if (!searchText || !searchText.trim()) {
    return items;
  }

  const {
    includedLabels,
    excludedLabels,
    userFilters,
    includedRepos,
    excludedRepos,
    includedOrgs,
    excludedOrgs,
    cleanText,
  } = parseSearchText(searchText);

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
 * Sorts GitHub items by updated date (newest first).
 */
export const sortItemsByUpdatedDate = (items: GitHubItem[]): GitHubItem[] => {
  return [...items].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
};
