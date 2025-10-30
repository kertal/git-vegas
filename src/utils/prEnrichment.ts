import { GitHubItem } from '../types';

/**
 * Pull Request Enrichment Utilities
 * 
 * Fetches and caches full PR details when they're not available in the event payload
 */

interface PRDetails {
  title: string;
  state: string;
  body: string;
  html_url: string;
  labels: Array<{ name: string; color?: string; description?: string }>;
  updated_at: string;
  closed_at?: string;
  merged_at?: string;
  merged?: boolean;
}

// In-memory cache for PR details to avoid duplicate fetches
const prCache = new Map<string, PRDetails>();

/**
 * Extracts PR API URL from a GitHubItem
 * Returns null if the item is not a PR or doesn't have a PR URL
 */
const getPRApiUrl = (item: GitHubItem): string | null => {
  // Check if this is a PR-related item
  if (!item.originalEventType?.includes('PullRequest')) {
    return null;
  }

  // Try to extract PR number from html_url
  // Format: https://github.com/owner/repo/pull/123
  const match = item.html_url?.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/);
  if (!match) {
    return null;
  }

  const [, repoFullName, prNumber] = match;
  return `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`;
};

/**
 * Checks if an item needs PR details enrichment
 */
export const needsPREnrichment = (item: GitHubItem): boolean => {
  // Check if this is a PR-related item
  if (!item.originalEventType?.includes('PullRequest')) {
    return false;
  }

  // Check if title is a generic fallback (indicates missing data)
  if (item.title?.match(/^Pull Request #\d+ (opened|closed|labeled|unlabeled|synchronized|reopened|edited|assigned|unassigned|review_requested|review_request_removed)$/)) {
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

  return false;
};

/**
 * Fetches PR details from GitHub API
 */
const fetchPRDetails = async (
  apiUrl: string,
  githubToken?: string
): Promise<PRDetails | null> => {
  // Check cache first
  if (prCache.has(apiUrl)) {
    return prCache.get(apiUrl)!;
  }

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

    const details: PRDetails = {
      title: data.title,
      state: data.state,
      body: data.body || '',
      html_url: data.html_url,
      labels: data.labels || [],
      updated_at: data.updated_at,
      closed_at: data.closed_at,
      merged_at: data.merged_at,
      merged: data.merged,
    };

    // Cache the result
    prCache.set(apiUrl, details);

    return details;
  } catch (error) {
    console.warn(`Error fetching PR details from ${apiUrl}:`, error);
    return null;
  }
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

  // Fetch PR details
  const prDetails = await fetchPRDetails(apiUrl, githubToken);
  if (!prDetails) {
    return item;
  }

  // Enrich the item
  const enrichedItem: GitHubItem = {
    ...item,
    labels: prDetails.labels.length > 0 ? prDetails.labels : item.labels,
    updated_at: prDetails.updated_at || item.updated_at,
    closed_at: prDetails.closed_at || item.closed_at,
    merged_at: prDetails.merged_at || item.merged_at,
    merged: prDetails.merged !== undefined ? prDetails.merged : item.merged,
    state: prDetails.state || item.state,
  };

  // Update title based on event type
  if (item.originalEventType === 'PullRequestReviewEvent') {
    enrichedItem.title = `Review on: ${prDetails.title}`;
  } else if (item.originalEventType === 'PullRequestReviewCommentEvent') {
    enrichedItem.title = `Review comment on: ${prDetails.title}`;
  } else if (item.title?.match(/^Pull Request #\d+/)) {
    // Extract the action from the current title
    const actionMatch = item.title?.match(/^Pull Request #\d+ (.+)$/);
    const action = actionMatch ? actionMatch[1] : '';
    enrichedItem.title = action ? `${prDetails.title} (${action})` : prDetails.title;
  }

  return enrichedItem;
};

/**
 * Enriches multiple GitHubItems with PR details in batch
 * Only fetches details for items that need enrichment
 */
export const enrichItemsWithPRDetails = async (
  items: GitHubItem[],
  githubToken?: string,
  onProgress?: (current: number, total: number) => void
): Promise<GitHubItem[]> => {
  // Don't fetch without a token
  if (!githubToken) {
    return items;
  }

  // Filter items that need enrichment
  const itemsNeedingEnrichment = items.filter(needsPREnrichment);
  
  if (itemsNeedingEnrichment.length === 0) {
    return items;
  }

  console.log(`Enriching ${itemsNeedingEnrichment.length} items with PR details...`);

  // Create a map for quick lookup
  const enrichmentMap = new Map<number, GitHubItem>();

  // Enrich items that need it (with progress tracking)
  let processed = 0;
  for (const item of itemsNeedingEnrichment) {
    const enrichedItem = await enrichItemWithPRDetails(item, githubToken);
    enrichmentMap.set(item.id, enrichedItem);
    
    processed++;
    if (onProgress) {
      onProgress(processed, itemsNeedingEnrichment.length);
    }

    // Add a small delay to respect rate limits
    if (processed < itemsNeedingEnrichment.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Return all items with enriched ones replaced
  return items.map(item => enrichmentMap.get(item.id) || item);
};

/**
 * Clears the PR details cache
 */
export const clearPRCache = (): void => {
  prCache.clear();
};

/**
 * Gets the current cache size (for debugging/monitoring)
 */
export const getPRCacheSize = (): number => {
  return prCache.size;
};

