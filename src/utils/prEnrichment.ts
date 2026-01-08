import { GitHubItem } from '../types';
import { prCacheStorage, PRCacheRecord } from './indexedDB';

/**
 * Pull Request Enrichment Utilities
 *
 * Fetches and caches full PR details when they're not available in the event payload.
 * Uses IndexedDB for persistent caching with SWR (stale-while-revalidate) pattern.
 */

// Cache expiry time: 24 hours (PR details don't change frequently)
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

// In-memory cache for session-level deduplication of in-flight requests
const inFlightRequests = new Map<string, Promise<PRCacheRecord | null>>();

// Known GitHub PR actions for validation
const VALID_PR_ACTIONS = [
  'opened', 'closed', 'labeled', 'unlabeled', 'synchronized', 'reopened',
  'edited', 'assigned', 'unassigned', 'review_requested', 'review_request_removed'
] as const;

/**
 * Checks if a title matches the generic PR fallback pattern with a known action
 * Returns the matched action or null if pattern doesn't match or action is unknown
 */
const matchGenericPRAction = (title: string | undefined): string | null => {
  if (!title) return null;
  
  // Match pattern: "Pull Request #123 action" or "Pull Request action"
  const match = title.match(/^Pull Request (?:#\d+ )?(.+)$/);
  if (!match) return null;
  
  const action = match[1];
  // Only return action if it's a known GitHub PR action
  return (VALID_PR_ACTIONS as readonly string[]).includes(action) ? action : null;
};

/**
 * Extracts PR API URL from a GitHubItem
 * Returns null if the item is not a PR or doesn't have a PR URL
 */
export const getPRApiUrl = (item: GitHubItem): string | null => {
  // Check if this is a PR-related item
  if (!item.originalEventType?.includes('PullRequest')) {
    return null;
  }

  // Try to extract PR number from html_url
  // Format: https://github.com/owner/repo/pull/123
  const match = item.html_url?.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/);
  if (match) {
    const [, repoFullName, prNumber] = match;
    return `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`;
  }

  // Try to extract from pull_request.url if available
  // Format: https://api.github.com/repos/owner/repo/pulls/123
  if (item.pull_request?.url) {
    const apiMatch = item.pull_request.url.match(/api\.github\.com\/repos\/([^/]+\/[^/]+)\/pulls\/(\d+)/);
    if (apiMatch) {
      const [, repoFullName, prNumber] = apiMatch;
      return `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`;
    }
    // If it's a regular GitHub URL in pull_request.url
    const htmlMatch = item.pull_request.url.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/);
    if (htmlMatch) {
      const [, repoFullName, prNumber] = htmlMatch;
      return `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`;
    }
  }

  // If we have repository info and PR number, construct the URL
  if (item.repository?.full_name && item.number) {
    return `https://api.github.com/repos/${item.repository.full_name}/pulls/${item.number}`;
  }

  return null;
};

/**
 * Extracts repo info from API URL
 */
const extractRepoInfo = (apiUrl: string): { repoFullName: string; prNumber: number } | null => {
  const match = apiUrl.match(/repos\/([^/]+\/[^/]+)\/pulls\/(\d+)/);
  if (!match) return null;
  return {
    repoFullName: match[1],
    prNumber: parseInt(match[2], 10),
  };
};

/**
 * Checks if an item needs PR details enrichment
 */
export const needsPREnrichment = (item: GitHubItem): boolean => {
  // Check if this is a PR-related item
  if (!item.originalEventType?.includes('PullRequest')) {
    return false;
  }

  // Check if title contains "undefined" (indicates missing data from API)
  if (item.title?.includes('undefined')) {
    return true;
  }

  // Check if title is a generic fallback with known PR action (indicates missing data)
  if (matchGenericPRAction(item.title)) {
    return true;
  }

  // Check if title starts with "Review on: Pull Request #" (indicates missing PR title)
  if (item.title?.startsWith('Review on: Pull Request #')) {
    return true;
  }

  // Check if title starts with "Review comment on: Pull Request #" (indicates missing PR title)
  if (item.title?.startsWith('Review comment on: Pull Request #')) {
    return true;
  }

  // Check if title is just "Review on: Pull Request" without a number
  if (item.title === 'Review on: Pull Request' || item.title === 'Review comment on: Pull Request') {
    return true;
  }

  return false;
};

/**
 * Checks if cached data is still fresh
 */
const isCacheFresh = (cachedAt: number): boolean => {
  return Date.now() - cachedAt < CACHE_EXPIRY_MS;
};

/**
 * Fetches PR details from GitHub API and stores in cache
 */
const fetchAndCachePRDetails = async (
  apiUrl: string,
  githubToken?: string
): Promise<PRCacheRecord | null> => {
  // Check for in-flight request to avoid duplicate fetches
  if (inFlightRequests.has(apiUrl)) {
    return inFlightRequests.get(apiUrl)!;
  }

  const repoInfo = extractRepoInfo(apiUrl);
  if (!repoInfo) return null;

  const fetchPromise = (async (): Promise<PRCacheRecord | null> => {
    try {
      const headers: HeadersInit = {
        Accept: 'application/vnd.github.v3+json',
      };

      if (githubToken) {
        headers['Authorization'] = `token ${githubToken}`;
      }

      const response = await fetch(apiUrl, { headers });

      if (!response.ok) {
        console.warn(`Failed to fetch PR details from ${apiUrl}: ${response.status}`);
        return null;
      }

      const data = await response.json();

      const prRecord: PRCacheRecord = {
        id: apiUrl,
        prNumber: repoInfo.prNumber,
        repoFullName: repoInfo.repoFullName,
        title: data.title,
        state: data.state,
        body: data.body || '',
        html_url: data.html_url,
        labels: data.labels || [],
        updated_at: data.updated_at,
        closed_at: data.closed_at,
        merged_at: data.merged_at,
        merged: data.merged,
        cachedAt: Date.now(),
      };

      // Store in IndexedDB cache
      await prCacheStorage.store(prRecord);

      return prRecord;
    } catch (error) {
      console.warn(`Error fetching PR details from ${apiUrl}:`, error);
      return null;
    } finally {
      inFlightRequests.delete(apiUrl);
    }
  })();

  inFlightRequests.set(apiUrl, fetchPromise);
  return fetchPromise;
};

/**
 * Gets PR details from cache or fetches if not available
 * Implements SWR pattern: returns cached data immediately if available,
 * then fetches fresh data in background if cache is stale
 */
export const getPRDetails = async (
  apiUrl: string,
  githubToken?: string,
  forceRefresh = false
): Promise<PRCacheRecord | null> => {
  // Try to get from cache first
  const cached = await prCacheStorage.get(apiUrl);

  if (cached && !forceRefresh) {
    // If cache is fresh, return it directly
    if (isCacheFresh(cached.cachedAt)) {
      return cached;
    }

    // Cache is stale - return stale data but trigger background refresh
    // Don't await the refresh - let it happen in background
    if (githubToken) {
      fetchAndCachePRDetails(apiUrl, githubToken).catch(err => {
        console.warn('Background PR refresh failed:', err);
      });
    }
    return cached;
  }

  // No cache or force refresh - fetch fresh data
  if (!githubToken) {
    return cached; // Return stale cache if no token available
  }

  return fetchAndCachePRDetails(apiUrl, githubToken);
};

/**
 * Applies PR details to a GitHubItem
 */
const applyPRDetailsToItem = (item: GitHubItem, prDetails: PRCacheRecord): GitHubItem => {
  const enrichedItem: GitHubItem = {
    ...item,
    labels: prDetails.labels.length > 0 ? prDetails.labels : item.labels,
    updated_at: prDetails.updated_at || item.updated_at,
    closed_at: prDetails.closed_at || item.closed_at,
    merged_at: prDetails.merged_at || item.merged_at,
    merged: prDetails.merged !== undefined ? prDetails.merged : item.merged,
    state: prDetails.state || item.state,
  };

  // Update title based on event type (only if we have a valid PR title)
  const hasValidTitle = prDetails.title && prDetails.title !== 'undefined' && prDetails.title.trim() !== '';

  if (hasValidTitle) {
    if (item.originalEventType === 'PullRequestReviewEvent') {
      enrichedItem.title = `Review on: ${prDetails.title}`;
    } else if (item.originalEventType === 'PullRequestReviewCommentEvent') {
      enrichedItem.title = `Review comment on: ${prDetails.title}`;
    } else {
      // Check if title has a generic PR pattern with action
      const action = matchGenericPRAction(item.title);
      if (action) {
        // Use the actual PR title with the action appended
        enrichedItem.title = `${prDetails.title} (${action})`;
      } else if (item.title?.includes('undefined')) {
        // Handle titles with "undefined" - replace with actual PR title
        enrichedItem.title = prDetails.title;
      }
    }
  }

  return enrichedItem;
};

/**
 * Enriches a single GitHubItem with full PR details if needed
 */
export const enrichItemWithPRDetails = async (
  item: GitHubItem,
  githubToken?: string
): Promise<GitHubItem> => {
  // Don't fetch without a token to respect rate limits
  if (!githubToken) {
    return item;
  }

  // Check if enrichment is needed
  if (!needsPREnrichment(item)) {
    return item;
  }

  // Get PR API URL
  const apiUrl = getPRApiUrl(item);
  if (!apiUrl) {
    return item;
  }

  // Get PR details (from cache or fresh fetch)
  const prDetails = await getPRDetails(apiUrl, githubToken);
  if (!prDetails) {
    return item;
  }

  return applyPRDetailsToItem(item, prDetails);
};

/**
 * Pre-loads PR cache for a set of items that need enrichment
 * Returns items enriched with cached data (if available)
 */
export const preloadPRCache = async (
  items: GitHubItem[]
): Promise<{ enrichedItems: GitHubItem[]; itemsNeedingFetch: GitHubItem[] }> => {
  const enrichedItems: GitHubItem[] = [];
  const itemsNeedingFetch: GitHubItem[] = [];

  // Get all cached PR data
  const allCached = await prCacheStorage.getAll();
  const cacheMap = new Map(allCached.map(pr => [pr.id, pr]));

  for (const item of items) {
    if (!needsPREnrichment(item)) {
      enrichedItems.push(item);
      continue;
    }

    const apiUrl = getPRApiUrl(item);
    if (!apiUrl) {
      enrichedItems.push(item);
      continue;
    }

    const cached = cacheMap.get(apiUrl);
    if (cached) {
      // Apply cached data
      enrichedItems.push(applyPRDetailsToItem(item, cached));

      // If cache is stale, mark for background refresh
      if (!isCacheFresh(cached.cachedAt)) {
        itemsNeedingFetch.push(item);
      }
    } else {
      // No cache - needs fresh fetch
      enrichedItems.push(item);
      itemsNeedingFetch.push(item);
    }
  }

  return { enrichedItems, itemsNeedingFetch };
};

/**
 * Enriches multiple GitHubItems with PR details in batch
 * Implements SWR pattern:
 * 1. First pass: Apply cached data to all items (instant)
 * 2. Second pass: Fetch missing/stale data in background
 */
export const enrichItemsWithPRDetails = async (
  items: GitHubItem[],
  githubToken?: string,
  onProgress?: (current: number, total: number) => void,
  onInitialEnrichmentDone?: (items: GitHubItem[]) => void
): Promise<GitHubItem[]> => {
  // Don't fetch without a token
  if (!githubToken) {
    return items;
  }

  // First pass: Apply cached data immediately (SWR - stale data first)
  const { enrichedItems, itemsNeedingFetch } = await preloadPRCache(items);

  // If we have enriched data, notify immediately (stale-while-revalidate)
  if (onInitialEnrichmentDone && itemsNeedingFetch.length > 0) {
    onInitialEnrichmentDone(enrichedItems);
  }

  // If nothing needs fetching, return enriched items
  if (itemsNeedingFetch.length === 0) {
    return enrichedItems;
  }

  console.log(`Fetching ${itemsNeedingFetch.length} PR details...`);

  // Second pass: Fetch missing/stale data
  const enrichmentMap = new Map<number, GitHubItem>();

  let processed = 0;
  for (const item of itemsNeedingFetch) {
    const apiUrl = getPRApiUrl(item);
    if (!apiUrl) {
      processed++;
      continue;
    }

    // Force refresh for items in the fetch list
    const prDetails = await fetchAndCachePRDetails(apiUrl, githubToken);
    if (prDetails) {
      enrichmentMap.set(item.id, applyPRDetailsToItem(item, prDetails));
    }

    processed++;
    if (onProgress) {
      onProgress(processed, itemsNeedingFetch.length);
    }

    // Add a small delay to respect rate limits
    if (processed < itemsNeedingFetch.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Return all items with freshly enriched ones replaced
  return enrichedItems.map(item => enrichmentMap.get(item.id) || item);
};

/**
 * Clears the PR details cache
 */
export const clearPRCache = async (): Promise<void> => {
  await prCacheStorage.clear();
  inFlightRequests.clear();
};

/**
 * Gets the current cache size (for debugging/monitoring)
 */
export const getPRCacheSize = async (): Promise<number> => {
  const all = await prCacheStorage.getAll();
  return all.length;
};
