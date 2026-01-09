import { GitHubItem, GitHubEvent, GitHubOrgMember, GitHubOrganization } from '../types';
import {
  validateGitHubUsernames,
  isValidDateString,
  validateUsernameList,
  type BatchValidationResult,
} from '../utils';
import { categorizeUsernames, getInvalidUsernames } from './usernameCache';
import type { UsernameCache } from '../types';

/**
 * GitHub Search Utilities
 *
 * Provides functions for searching GitHub issues and pull requests with validation,
 * caching, and error handling.
 */

/**
 * Search parameters for GitHub API
 */
export interface GitHubSearchParams {
  /** Username or comma-separated list of usernames */
  username: string;
  /** Start date in YYYY-MM-DD format */
  startDate: string;
  /** End date in YYYY-MM-DD format */
  endDate: string;
  /** GitHub personal access token (optional) */
  githubToken?: string;
  /** API mode to use */
  apiMode?: 'search' | 'events' | 'summary';
}

/**
 * Search result with metadata
 */
export interface GitHubSearchResult {
  /** Array of GitHub items found (for backward compatibility) */
  items: GitHubItem[];
  /** Total number of items fetched */
  totalCount: number;
  /** Usernames that were successfully processed */
  processedUsernames: string[];
  /** Raw GitHub events (only when using events API) */
  rawEvents?: GitHubEvent[];
  /** Raw GitHub items from search API */
  rawSearchItems?: GitHubItem[];
}

/**
 * Search progress callback
 */
export type SearchProgressCallback = (message: string) => void;

/**
 * Cache update callbacks
 */
export interface CacheCallbacks {
  /** Add usernames to validated cache */
  addToValidated: (usernames: string[]) => void;
  /** Add usernames to invalid cache */
  addToInvalid: (usernames: string[]) => void;
  /** Remove username from validated cache */
  removeFromValidated: (username: string) => void;
  /** Add avatar URLs to cache */
  addAvatarsToCache: (avatarUrls: { [username: string]: string }) => void;
}

/**
 * Search options configuration
 */
export interface GitHubSearchOptions {
  /** Progress callback for status updates */
  onProgress?: SearchProgressCallback;
  /** Cache callbacks for username validation */
  cacheCallbacks?: CacheCallbacks;
  /** Delay between requests in milliseconds (default: 500) */
  requestDelay?: number;
}

/**
 * Checks if the browser is online
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Validates search parameters
 *
 * @param params - Search parameters to validate
 * @returns Validation result with errors array
 */
export const validateSearchParams = (
  params: GitHubSearchParams
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!params.username?.trim()) {
    errors.push('Please enter a GitHub username');
  }

  if (!params.startDate || !params.endDate) {
    errors.push('Please select both start and end dates');
  }

  if (params.startDate && !isValidDateString(params.startDate)) {
    errors.push('Invalid start date format. Please use YYYY-MM-DD');
  }

  if (params.endDate && !isValidDateString(params.endDate)) {
    errors.push('Invalid end date format. Please use YYYY-MM-DD');
  }

  if (
    params.startDate &&
    params.endDate &&
    new Date(params.startDate) > new Date(params.endDate)
  ) {
    errors.push('Start date must be before end date');
  }

  // Check if offline
  if (!isOnline()) {
    errors.push(
      'You are currently offline. Please check your internet connection and try again.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validates usernames and checks cache
 *
 * @param usernames - Array of usernames to validate
 * @param cache - Username validation cache
 * @param githubToken - GitHub token for API calls
 * @param cacheCallbacks - Callbacks for cache updates
 * @returns Promise with validation result
 */
export const validateAndCacheUsernames = async (
  usernames: string[],
  cache: UsernameCache,
  githubToken?: string,
  cacheCallbacks?: CacheCallbacks
): Promise<{ valid: boolean; errors: string[] }> => {
  // Check for already invalid usernames
  const alreadyInvalidUsernames = getInvalidUsernames(
    usernames,
    cache.invalidUsernames
  );

  if (alreadyInvalidUsernames.length > 0) {
    const plural = alreadyInvalidUsernames.length > 1;
    return {
      valid: false,
      errors: [
        `Invalid GitHub username${plural ? 's' : ''}: ${alreadyInvalidUsernames.join(', ')}`,
      ],
    };
  }

  // Check which usernames need validation
  const { needValidation } = categorizeUsernames(
    usernames,
    cache.validatedUsernames,
    cache.invalidUsernames
  );

  // Only validate usernames that haven't been validated yet
  if (needValidation.length > 0) {
    try {
      const result: BatchValidationResult = await validateGitHubUsernames(
        needValidation,
        githubToken
      );

      // Update validated usernames
      if (result.valid.length > 0 && cacheCallbacks?.addToValidated) {
        cacheCallbacks.addToValidated(result.valid);
      }

      // Cache avatar URLs for validated usernames
      if (Object.keys(result.avatarUrls).length > 0 && cacheCallbacks?.addAvatarsToCache) {
        cacheCallbacks.addAvatarsToCache(result.avatarUrls);
      }

      // Update invalid usernames
      if (result.invalid.length > 0) {
        if (cacheCallbacks?.addToInvalid) {
          cacheCallbacks.addToInvalid(result.invalid);
        }

        // Show detailed error messages
        const detailedErrors = result.invalid.map(username => {
          const errorMsg = result.errors[username] || 'Invalid username';
          return `${username}: ${errorMsg}`;
        });

        return {
          valid: false,
          errors: [`Validation failed:\n${detailedErrors.join('\n')}`],
        };
      }
    } catch {
      return {
        valid: false,
        errors: ['Error validating usernames. Please try again.'],
      };
    }
  }

  return { valid: true, errors: [] };
};

/**
 * Fetches GitHub issues/PRs for a single user
 *
 * @param username - GitHub username
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param githubToken - GitHub token for authentication
 * @param cache - Username validation cache
 * @param cacheCallbacks - Callbacks for cache updates
 * @returns Promise with GitHub items
 */
export const fetchUserItems = async (
  username: string,
  _startDate: string,
  _endDate: string,
  githubToken?: string,
  cache?: UsernameCache,
  cacheCallbacks?: CacheCallbacks
): Promise<GitHubItem[]> => {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  const response = await fetch(
    `https://api.github.com/search/issues?q=author:${username}+updated:${_startDate}..${_endDate}&per_page=100`,
    { headers }
  );

  if (!response.ok) {
    // If a previously validated username now fails, remove it from cache
    if (
      response.status === 404 &&
      cache?.validatedUsernames.has(username) &&
      cacheCallbacks
    ) {
      cacheCallbacks.removeFromValidated(username);
      cacheCallbacks.addToInvalid([username]);
    }
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.items || [];
};

/**
 * Result interface for fetching GitHub events
 */
export interface FetchEventsResult {
  items: GitHubItem[];
  rawEvents: GitHubEvent[];
}

/**
 * Fetches GitHub events for a single user
 *
 * @param username - GitHub username
 * @param startDate - Start date in YYYY-MM-DD format (for filtering)
 * @param endDate - End date in YYYY-MM-DD format (for filtering)
 * @param githubToken - GitHub token for authentication
 * @param cache - Username validation cache
 * @param cacheCallbacks - Callbacks for cache updates
 * @returns Promise with GitHub items and raw events
 */
export const fetchUserEvents = async (
  username: string,
  _startDate: string,
  _endDate: string,
  githubToken?: string,
  cache?: UsernameCache,
  cacheCallbacks?: CacheCallbacks
): Promise<FetchEventsResult> => {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  // GitHub Events API only returns last 30 days and max 300 events
  // Pagination is limited for this resource - reduce to 3 pages max
  const allItems: GitHubItem[] = [];
  const allRawEvents: GitHubEvent[] = [];
  let page = 1;
  const maxPages = 3; // Limited pagination to respect GitHub API constraints

  while (page <= maxPages) {
    const response = await fetch(
      `https://api.github.com/users/${username}/events?page=${page}&per_page=100`,
      { headers }
    );

    if (!response.ok) {
      // If a previously validated username now fails, remove it from cache
      if (
        response.status === 404 &&
        cache?.validatedUsernames.has(username) &&
        cacheCallbacks
      ) {
        cacheCallbacks.removeFromValidated(username);
        cacheCallbacks.addToInvalid([username]);
      }

      // Handle pagination limit error specifically
      if (response.status === 422) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.message?.includes('pagination is limited')) {
          // Return what we have so far instead of throwing
          console.warn(
            `GitHub Events API pagination limit reached for ${username}. Returning partial results.`
          );
          return { items: allItems, rawEvents: allRawEvents };
        }
      }

      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`
      );
    }

    const events: GitHubEvent[] = await response.json();

    if (events.length === 0) {
      break; // No more events
    }

    // Store all raw events (no filtering or transformation here)
    allRawEvents.push(...events);

    page++;
  }

  return { items: allItems, rawEvents: allRawEvents };
};

/**
 * Checks if search results are cached and still valid
 *
 * @param params - Search parameters
 * @param lastSearchParams - Last search parameters with timestamp
 * @param cacheExpiryMs - Cache expiry time in milliseconds (default: 1 hour)
 * @returns True if cached results can be used
 */
export const isCacheValid = (
  params: GitHubSearchParams,
  lastSearchParams: {
    username: string;
    startDate: string;
    endDate: string;
    timestamp: number;
  } | null,
  cacheExpiryMs: number = 3600000 // 1 hour
): boolean => {
  if (!lastSearchParams) return false;

  return (
    lastSearchParams.username === params.username &&
    lastSearchParams.startDate === params.startDate &&
    lastSearchParams.endDate === params.endDate &&
    Date.now() - lastSearchParams.timestamp < cacheExpiryMs
  );
};

/**
 * Performs GitHub search for both events and issues/pull requests
 *
 * @param params - Search parameters
 * @param cache - Username validation cache
 * @param options - Search options
 * @returns Promise with search results containing both data types
 */
export const performCombinedGitHubSearch = async (
  params: GitHubSearchParams,
  cache: UsernameCache,
  options: GitHubSearchOptions = {}
): Promise<GitHubSearchResult> => {
  const { onProgress, cacheCallbacks, requestDelay = 500 } = options;

  // Validate search parameters
  const paramValidation = validateSearchParams(params);
  if (!paramValidation.valid) {
    throw new Error(paramValidation.errors.join('\n'));
  }

  // Validate username format and list
  const validation = validateUsernameList(params.username);
  if (validation.errors.length > 0) {
    throw new Error(validation.errors.join('\n'));
  }

  const usernames = validation.usernames;

  // Validate usernames and check cache
  onProgress?.('Validating usernames...');
  const usernameValidation = await validateAndCacheUsernames(
    usernames,
    cache,
    params.githubToken,
    cacheCallbacks
  );

  if (!usernameValidation.valid) {
    throw new Error(usernameValidation.errors.join('\n'));
  }

  // Fetch both events and issues/PRs for all users
  onProgress?.('Starting combined fetch (events + issues/PRs)...');
  const allRawEvents: GitHubEvent[] = [];
  const allRawSearchItems: GitHubItem[] = [];

  for (const username of usernames) {
    onProgress?.(`Fetching events for ${username}...`);

    try {
      // Fetch events
      const eventsResult = await fetchUserEvents(
        username,
        params.startDate,
        params.endDate,
        params.githubToken,
        cache,
        cacheCallbacks
      );
      
      allRawEvents.push(...eventsResult.rawEvents);
      onProgress?.(`Found ${eventsResult.rawEvents.length} events for ${username}`);

      // Add delay between requests to avoid rate limiting
      if (requestDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, requestDelay));
      }

      // Fetch issues/PRs
      onProgress?.(`Fetching issues/PRs for ${username}...`);
      const searchItems = await fetchUserItems(
        username,
        params.startDate,
        params.endDate,
        params.githubToken,
        cache,
        cacheCallbacks
      );
      
      allRawSearchItems.push(...searchItems);
      onProgress?.(`Found ${searchItems.length} issues/PRs for ${username}`);

      // Add delay between requests to avoid rate limiting
      if (requestDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, requestDelay));
      }
    } catch (error) {
      // Re-throw with context about which user failed
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch data for ${username}: ${errorMessage}`);
    }
  }

  onProgress?.(`Successfully loaded ${allRawEvents.length} events and ${allRawSearchItems.length} issues/PRs!`);

  return {
    items: [], // Empty for now - will be processed in UI
    totalCount: allRawEvents.length + allRawSearchItems.length,
    processedUsernames: usernames,
    rawEvents: allRawEvents,
    rawSearchItems: allRawSearchItems,
  };
};

/**
 * Performs GitHub search for issues and pull requests
 *
 * @param params - Search parameters
 * @param cache - Username validation cache
 * @param options - Search options
 * @returns Promise with search results
 */
export const performGitHubSearch = async (
  params: GitHubSearchParams,
  cache: UsernameCache,
  options: GitHubSearchOptions = {}
): Promise<GitHubSearchResult> => {
  const { onProgress, cacheCallbacks, requestDelay = 500 } = options;

  // Validate search parameters
  const paramValidation = validateSearchParams(params);
  if (!paramValidation.valid) {
    throw new Error(paramValidation.errors.join('\n'));
  }

  // Validate username format and list
  const validation = validateUsernameList(params.username);
  if (validation.errors.length > 0) {
    throw new Error(validation.errors.join('\n'));
  }

  const usernames = validation.usernames;

  // Validate usernames and check cache
  onProgress?.('Validating usernames...');
  const usernameValidation = await validateAndCacheUsernames(
    usernames,
    cache,
    params.githubToken,
    cacheCallbacks
  );

  if (!usernameValidation.valid) {
    throw new Error(usernameValidation.errors.join('\n'));
  }

  // Fetch data for all users
  const apiMode = params.apiMode || 'search';
  onProgress?.(`Starting ${apiMode === 'events' ? 'events' : 'search'} API...`);
  const allRawEvents: GitHubEvent[] = [];
  const allRawSearchItems: GitHubItem[] = [];

  for (const username of usernames) {
    onProgress?.(`Fetching data for ${username}...`);

    try {
      if (apiMode === 'events') {
        const eventsResult = await fetchUserEvents(
          username,
          params.startDate,
          params.endDate,
          params.githubToken,
          cache,
          cacheCallbacks
        );
        
        allRawEvents.push(...eventsResult.rawEvents);
        onProgress?.(`Found ${eventsResult.rawEvents.length} raw events for ${username}`);
      } else {
        const searchItems = await fetchUserItems(
          username,
          params.startDate,
          params.endDate,
          params.githubToken,
          cache,
          cacheCallbacks
        );
        
        allRawSearchItems.push(...searchItems);
        onProgress?.(`Found ${searchItems.length} items for ${username}`);
      }

      // Add delay between requests to avoid rate limiting
      if (requestDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, requestDelay));
      }
    } catch (error) {
      // Re-throw with context about which user failed
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch data for ${username}: ${errorMessage}`);
    }
  }

  onProgress?.(`Successfully loaded raw data!`);

  return {
    items: [], // Empty for now - will be processed in UI
    totalCount: apiMode === 'events' ? allRawEvents.length : allRawSearchItems.length,
    processedUsernames: usernames,
    ...(apiMode === 'events' && { rawEvents: allRawEvents }),
    ...(apiMode === 'search' && { rawSearchItems: allRawSearchItems }),
  };
};

/**
 * Creates search parameters with current timestamp for caching
 *
 * @param params - Search parameters
 * @returns Search parameters with timestamp
 */
export const createSearchCacheParams = (params: GitHubSearchParams) => ({
  username: params.username,
  startDate: params.startDate,
  endDate: params.endDate,
  timestamp: Date.now(),
});

/**
 * Result interface for fetching organization members
 */
export interface FetchOrgMembersResult {
  members: GitHubOrgMember[];
  organization: GitHubOrganization | null;
  totalCount: number;
}

/**
 * Validates a GitHub organization name
 *
 * @param orgName - Organization name to validate
 * @param githubToken - GitHub token for authentication
 * @returns Promise with organization data or throws an error
 */
export const validateGitHubOrganization = async (
  orgName: string,
  githubToken?: string
): Promise<GitHubOrganization> => {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  const response = await fetch(`https://api.github.com/orgs/${orgName}`, {
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Organization "${orgName}" not found`);
    }
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
};

/**
 * Fetches public members of a GitHub organization
 *
 * @param orgName - Organization name
 * @param githubToken - GitHub token for authentication (required for private orgs)
 * @param onProgress - Optional progress callback
 * @returns Promise with organization members
 */
export const fetchOrgMembers = async (
  orgName: string,
  githubToken?: string,
  onProgress?: SearchProgressCallback
): Promise<FetchOrgMembersResult> => {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  // First, validate the organization exists
  onProgress?.(`Validating organization "${orgName}"...`);
  const organization = await validateGitHubOrganization(orgName, githubToken);

  // Fetch members with pagination
  onProgress?.(`Fetching members for organization "${orgName}"...`);
  const allMembers: GitHubOrgMember[] = [];
  let page = 1;
  const maxPages = 10; // Limit to 1000 members (100 per page * 10 pages)

  while (page <= maxPages) {
    // Use /public_members for unauthenticated requests, /members for authenticated
    // Note: /members requires org:read scope for the authenticated user
    const endpoint = githubToken
      ? `https://api.github.com/orgs/${orgName}/members`
      : `https://api.github.com/orgs/${orgName}/public_members`;

    const response = await fetch(`${endpoint}?page=${page}&per_page=100`, {
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Organization "${orgName}" not found or you don't have access`);
      }
      if (response.status === 403) {
        // If we can't access /members, try /public_members
        if (githubToken && endpoint.includes('/members')) {
          onProgress?.('Switching to public members endpoint...');
          const publicResponse = await fetch(
            `https://api.github.com/orgs/${orgName}/public_members?page=${page}&per_page=100`,
            { headers }
          );
          if (publicResponse.ok) {
            const publicMembers: GitHubOrgMember[] = await publicResponse.json();
            if (publicMembers.length === 0) break;
            allMembers.push(...publicMembers);
            onProgress?.(`Found ${allMembers.length} public members...`);
            page++;
            await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit delay
            continue;
          }
        }
        throw new Error(
          'Access denied. You may need a GitHub token with org:read scope.'
        );
      }
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`
      );
    }

    const members: GitHubOrgMember[] = await response.json();

    if (members.length === 0) {
      break; // No more members
    }

    allMembers.push(...members);
    onProgress?.(`Found ${allMembers.length} members...`);

    if (members.length < 100) {
      break; // Last page
    }

    page++;
    // Rate limit delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  onProgress?.(`Successfully loaded ${allMembers.length} members from ${orgName}`);

  return {
    members: allMembers,
    organization,
    totalCount: allMembers.length,
  };
};
