import { GitHubItem } from '../types';
import { validateGitHubUsernames, isValidDateString, validateUsernameList, type BatchValidationResult } from '../utils';
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
  apiMode?: 'search' | 'events';
}

/**
 * Search result with metadata
 */
export interface GitHubSearchResult {
  /** Array of GitHub items found */
  items: GitHubItem[];
  /** Total number of items fetched */
  totalCount: number;
  /** Usernames that were successfully processed */
  processedUsernames: string[];
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
export const validateSearchParams = (params: GitHubSearchParams): { valid: boolean; errors: string[] } => {
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

  if (params.startDate && params.endDate && new Date(params.startDate) > new Date(params.endDate)) {
    errors.push('Start date must be before end date');
  }

  // Check if offline
  if (!isOnline()) {
    errors.push('You are currently offline. Please check your internet connection and try again.');
  }

  return {
    valid: errors.length === 0,
    errors
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
  const alreadyInvalidUsernames = getInvalidUsernames(usernames, cache.invalidUsernames);
  
  if (alreadyInvalidUsernames.length > 0) {
    const plural = alreadyInvalidUsernames.length > 1;
    return {
      valid: false,
      errors: [`Invalid GitHub username${plural ? 's' : ''}: ${alreadyInvalidUsernames.join(', ')}`]
    };
  }

  // Check which usernames need validation
  const { needValidation } = categorizeUsernames(usernames, cache.validatedUsernames, cache.invalidUsernames);

  // Only validate usernames that haven't been validated yet
  if (needValidation.length > 0) {
    try {
      const result: BatchValidationResult = await validateGitHubUsernames(needValidation, githubToken);
      
      // Update validated usernames
      if (result.valid.length > 0 && cacheCallbacks?.addToValidated) {
        cacheCallbacks.addToValidated(result.valid);
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
          errors: [`Validation failed:\n${detailedErrors.join('\n')}`]
        };
      }
    } catch (err) {
      return {
        valid: false,
        errors: ['Error validating usernames. Please try again.']
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
  startDate: string,
  endDate: string,
  githubToken?: string,
  cache?: UsernameCache,
  cacheCallbacks?: CacheCallbacks
): Promise<GitHubItem[]> => {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }
  
  const response = await fetch(
    `https://api.github.com/search/issues?q=author:${username}+created:${startDate}..${endDate}&per_page=100`,
    { headers }
  );
  
  if (!response.ok) {
    // If a previously validated username now fails, remove it from cache
    if (response.status === 404 && cache?.validatedUsernames.has(username) && cacheCallbacks) {
      cacheCallbacks.removeFromValidated(username);
      cacheCallbacks.addToInvalid([username]);
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.items || [];
};

/**
 * GitHub Events API response interface
 */
export interface GitHubEvent {
  id: string;
  type: string;
  actor: {
    id: number;
    login: string;
    display_login?: string;
    avatar_url: string;
    url: string;
  };
  repo: {
    id: number;
    name: string;
    url: string;
  };
  payload: {
    action?: string;
    issue?: {
      id: number;
      number: number;
      title: string;
      html_url: string;
      state: string;
      body?: string;
      labels: { name: string; color?: string; description?: string }[];
      created_at: string;
      updated_at: string;
      closed_at?: string;
      pull_request?: {
        merged_at?: string;
        url?: string;
      };
      user: {
        login: string;
        avatar_url: string;
        html_url: string;
      };
    };
    pull_request?: {
      id: number;
      number: number;
      title: string;
      html_url: string;
      state: string;
      body?: string;
      labels: { name: string; color?: string; description?: string }[];
      created_at: string;
      updated_at: string;
      closed_at?: string;
      merged_at?: string;
      merged?: boolean;
      user: {
        login: string;
        avatar_url: string;
        html_url: string;
      };
    };
    comment?: {
      id: number;
      body: string;
      html_url: string;
      created_at: string;
      updated_at: string;
      user: {
        login: string;
        avatar_url: string;
        html_url: string;
      };
    };
  };
  public: boolean;
  created_at: string;
}

/**
 * Transforms GitHub Event to GitHubItem
 * 
 * @param event - GitHub event from Events API
 * @returns GitHubItem or null if event doesn't contain relevant data
 */
export const transformEventToItem = (event: GitHubEvent): GitHubItem | null => {
  const { type, payload, repo, created_at, actor } = event;
  
  // Only process events that contain issues, pull requests, or comments
  if (type === 'IssuesEvent' && payload.issue) {
    const issue = payload.issue;
    return {
      id: issue.id,
      html_url: issue.html_url,
      title: issue.title,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      state: issue.state,
      body: issue.body,
      labels: issue.labels,
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`
      },
      closed_at: issue.closed_at,
      number: issue.number,
      user: issue.user,
      pull_request: issue.pull_request
    };
  }
  
  if (type === 'PullRequestEvent' && payload.pull_request) {
    const pr = payload.pull_request;
    return {
      id: pr.id,
      html_url: pr.html_url,
      title: pr.title,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      state: pr.state,
      body: pr.body,
      labels: pr.labels,
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`
      },
      closed_at: pr.closed_at,
      merged_at: pr.merged_at,
      merged: pr.merged,
      number: pr.number,
      user: pr.user,
      pull_request: {
        merged_at: pr.merged_at,
        url: pr.html_url
      }
    };
  }
  
  if (type === 'IssueCommentEvent' && payload.comment && payload.issue) {
    const comment = payload.comment;
    const issue = payload.issue;
    return {
      id: comment.id,
      html_url: comment.html_url,
      title: `Comment on: ${issue.title}`,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      state: issue.state,
      body: comment.body,
      labels: issue.labels,
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`
      },
      closed_at: issue.closed_at,
      number: issue.number,
      user: comment.user,
      pull_request: issue.pull_request
    };
  }
  
  return null;
};

/**
 * Fetches GitHub events for a single user
 * 
 * @param username - GitHub username
 * @param startDate - Start date in YYYY-MM-DD format (for filtering)
 * @param endDate - End date in YYYY-MM-DD format (for filtering)
 * @param githubToken - GitHub token for authentication
 * @param cache - Username validation cache
 * @param cacheCallbacks - Callbacks for cache updates
 * @returns Promise with GitHub items from events
 */
export const fetchUserEvents = async (
  username: string,
  startDate: string,
  endDate: string,
  githubToken?: string,
  cache?: UsernameCache,
  cacheCallbacks?: CacheCallbacks
): Promise<GitHubItem[]> => {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }
  
  // GitHub Events API only returns last 30 days and max 300 events
  // Pagination is limited for this resource - reduce to 3 pages max
  const allItems: GitHubItem[] = [];
  let page = 1;
  const maxPages = 3; // Limited pagination to respect GitHub API constraints
  
  while (page <= maxPages) {
    const response = await fetch(
      `https://api.github.com/users/${username}/events?page=${page}&per_page=100`,
      { headers }
    );
    
    if (!response.ok) {
      // If a previously validated username now fails, remove it from cache
      if (response.status === 404 && cache?.validatedUsernames.has(username) && cacheCallbacks) {
        cacheCallbacks.removeFromValidated(username);
        cacheCallbacks.addToInvalid([username]);
      }
      
      // Handle pagination limit error specifically
      if (response.status === 422) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.message?.includes('pagination is limited')) {
          // Return what we have so far instead of throwing
          console.warn(`GitHub Events API pagination limit reached for ${username}. Returning partial results.`);
          return allItems;
        }
      }
      
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const events: GitHubEvent[] = await response.json();
    
    if (events.length === 0) {
      break; // No more events
    }
    
    // Transform and filter events
    const startDateTime = new Date(startDate).getTime();
    const endDateTime = new Date(endDate).getTime() + (24 * 60 * 60 * 1000); // Add 1 day to include end date
    
    for (const event of events) {
      const eventTime = new Date(event.created_at).getTime();
      
      // Stop if event is before start date (events are sorted newest first)
      if (eventTime < startDateTime) {
        return allItems;
      }
      
      // Include if within date range
      if (eventTime <= endDateTime) {
        const item = transformEventToItem(event);
        if (item) {
          allItems.push(item);
        }
      }
    }
    
    page++;
  }
  
  return allItems;
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
  lastSearchParams: { username: string; startDate: string; endDate: string; timestamp: number } | null,
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
  const allResults: GitHubItem[] = [];
  
  for (const username of usernames) {
    onProgress?.(`Fetching data for ${username}...`);
    
    try {
      const items = apiMode === 'events' 
        ? await fetchUserEvents(
            username,
            params.startDate,
            params.endDate,
            params.githubToken,
            cache,
            cacheCallbacks
          )
        : await fetchUserItems(
            username,
            params.startDate,
            params.endDate,
            params.githubToken,
            cache,
            cacheCallbacks
          );
      
      allResults.push(...items);
      onProgress?.(`Found ${items.length} items for ${username}`);
      
      // Add delay between requests to avoid rate limiting
      if (requestDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, requestDelay));
      }
    } catch (error) {
      // Re-throw with context about which user failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch data for ${username}: ${errorMessage}`);
    }
  }

  // URL parameters are no longer automatically updated

  onProgress?.(`Successfully loaded ${allResults.length} items!`);

  return {
    items: allResults,
    totalCount: allResults.length,
    processedUsernames: usernames
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
  timestamp: Date.now()
}); 