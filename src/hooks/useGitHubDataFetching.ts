import { useCallback, useState } from 'react';
import { GitHubEvent, GitHubItem } from '../types';
import { EventsData } from '../utils/indexedDB';
import { validateUsernameList, isValidDateString } from '../utils';
import { MAX_USERNAMES_PER_REQUEST, GITHUB_API_PER_PAGE, GITHUB_API_DELAY_MS } from '../utils/settings';

interface UseGitHubDataFetchingProps {
  username: string;
  githubToken: string;
  startDate: string;
  endDate: string;
  indexedDBEvents: GitHubEvent[];
  indexedDBSearchItems: GitHubEvent[];
  onError: (error: string) => void;
  storeEvents: (key: string, events: GitHubEvent[], metadata: EventsData['metadata']) => Promise<void>;
  clearEvents: () => Promise<void>;
  storeSearchItems: (key: string, items: GitHubEvent[], metadata: EventsData['metadata']) => Promise<void>;
  clearSearchItems: () => Promise<void>;
}

interface UseGitHubDataFetchingReturn {
  loading: boolean;
  loadingProgress: string;
  currentUsername: string;
  handleSearch: () => Promise<void>;
}

export const useGitHubDataFetching = ({
  username,
  githubToken,
  startDate,
  endDate,
  indexedDBEvents,
  indexedDBSearchItems,
  onError,
  storeEvents,
  clearEvents,
  storeSearchItems,
  clearSearchItems,
}: UseGitHubDataFetchingProps): UseGitHubDataFetchingReturn => {
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');

  // Fetch all events for a username with pagination
  const fetchAllEvents = async (
    username: string,
    token: string,
    startDate: string,
    endDate: string,
    onProgress: (message: string) => void
  ): Promise<GitHubEvent[]> => {
    const allEvents: GitHubEvent[] = [];
    let page = 1;
    const perPage = GITHUB_API_PER_PAGE;
    let hasMorePages = true;
    const maxPages = 3; // GitHub Events API has pagination limits - stay within safe bounds

    while (hasMorePages && page <= maxPages) {
      try {
        onProgress(`Fetching events page ${page} for ${username}...`);
        
        const response = await fetch(
          `https://api.github.com/users/${username}/events?per_page=${perPage}&page=${page}`,
          {
            headers: {
              ...(token && { Authorization: `token ${token}` }),
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (!response.ok) {
          const responseJSON = await response.json();
          
          // Handle pagination limit error (422) - return what we have so far
          if (response.status === 422 && responseJSON.message?.includes('pagination is limited')) {
            console.warn(
              `GitHub Events API pagination limit reached for ${username} at page ${page}. Returning ${allEvents.length} events collected so far.`
            );
            hasMorePages = false;
            break; // Exit the pagination loop gracefully
          }
          
          throw new Error(`Failed to fetch events page ${page}: ${responseJSON.message}`);
        }

        const events = await response.json();
        
        // Filter events by date range
        const startDateTime = new Date(startDate).getTime();
        const endDateTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000; // Add 24 hours to include end date
        
        const filteredEvents = events.filter((event: GitHubEvent) => {
          const eventTime = new Date(event.created_at).getTime();
          return eventTime >= startDateTime && eventTime <= endDateTime;
        });
        
        allEvents.push(...filteredEvents);
        
        // If we get fewer events than requested, we've reached the end
        if (events.length < perPage) {
          hasMorePages = false;
        }
        
        page++;
        
        // Add a small delay to respect GitHub API rate limits
        await new Promise(resolve => setTimeout(resolve, GITHUB_API_DELAY_MS));
        
      } catch (error) {
        console.error(`Error fetching events page ${page} for ${username}:`, error);
        throw error;
        // Continue with what we have so far
        hasMorePages = false;
      }
    }

    // Log if we hit the pagination limit
    if (page > maxPages) {
      console.warn(
        `Reached GitHub Events API pagination limit (${maxPages} pages) for ${username}. ` +
        `Returning ${allEvents.length} events. GitHub API limits pagination for the events endpoint.`
      );
    }

    return allEvents;
  };

  // Fetch all search items (issues/PRs) for a username with pagination
  const fetchAllSearchItems = async (
    username: string,
    token: string,
    startDate: string,
    endDate: string,
    onProgress: (message: string) => void
  ): Promise<GitHubItem[]> => {
    const allItems: GitHubItem[] = [];
    let page = 1;
    const perPage = GITHUB_API_PER_PAGE;
    const maxPages = 10; // GitHub Search API allows up to 1000 results (10 pages * 100 per page)

    const searchQuery = `(author:${username} OR assignee:${username}) AND updated:${startDate}..${endDate} AND (is:issue OR is:pr)`;

    while (page <= maxPages) {
      try {
        onProgress(`Fetching issues/PRs page ${page} for ${username}...`);

        const response = await fetch(
          `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=${perPage}&page=${page}&sort=updated`,
          {
            headers: {
              ...(token && { Authorization: `token ${token}` }),
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (!response.ok) {
          const responseJSON = await response.json();
          throw new Error(`Failed to fetch issues/PRs page ${page}: ${responseJSON.message}`);
        }

        const searchData = await response.json();
        const totalCount = searchData.total_count;
        const items = searchData.items;

        // Add original property to search items and ensure assignee data is preserved
        const itemsWithOriginal = items.map((item: Record<string, unknown>) => ({
          ...item,
          assignee: item.assignee || null,
          assignees: item.assignees || [],
          original: item,
        }));

        allItems.push(...itemsWithOriginal);

        // Check if we've fetched all items
        if (allItems.length >= totalCount || items.length < perPage) {
          break;
        }

        page++;

        // Add a small delay to respect GitHub API rate limits
        await new Promise(resolve => setTimeout(resolve, GITHUB_API_DELAY_MS));

      } catch (error) {
        console.error(`Error fetching issues/PRs page ${page} for ${username}:`, error);
        throw error;
      }
    }

    // Log if we hit the pagination limit
    if (page > maxPages) {
      console.warn(
        `Reached GitHub Search API pagination limit (${maxPages} pages) for ${username}. ` +
        `Returning ${allItems.length} items. GitHub API limits search results to 1000 items.`
      );
    }

    return allItems;
  };

  const handleSearch = useCallback(async () => {
    if (!username.trim()) {
      onError('Please enter a GitHub username');
      return;
    }

    // Validate username format before proceeding
    const usernameValidation = validateUsernameList(username);
    if (usernameValidation.errors.length > 0) {
      onError(`Invalid username format: ${usernameValidation.errors.join(', ')}`);
      return;
    }

    if (usernameValidation.usernames.length === 0) {
      onError('Please enter at least one valid username');
      return;
    }

    // Check username count limit
    if (usernameValidation.usernames.length > MAX_USERNAMES_PER_REQUEST) {
      onError(`Too many usernames. Please limit to ${MAX_USERNAMES_PER_REQUEST} usernames at a time for performance reasons.`);
      return;
    }

    // Validate date parameters
    if (!isValidDateString(startDate)) {
      onError('Invalid start date format. Please use YYYY-MM-DD');
      return;
    }

    if (!isValidDateString(endDate)) {
      onError('Invalid end date format. Please use YYYY-MM-DD');
      return;
    }

    // Check if start date is before end date
    if (new Date(startDate) >= new Date(endDate)) {
      onError('Start date must be before end date');
      return;
    }

    // Reset loading state if it was stuck
    setLoading(false);

    // Check if there's existing data using actual arrays
    const hasExistingData = indexedDBEvents.length > 0 || indexedDBSearchItems.length > 0;
    
    setLoading(true);
    onError(''); // Clear any previous errors
    setLoadingProgress(hasExistingData ? 'Updating data in background...' : 'Starting search...');

    try {
      // Use the validated usernames instead of manual splitting
      const usernames = usernameValidation.usernames;
      let currentProgress = 0;
      const totalUsernames = usernames.length;

      const onProgress = (message: string) => {
        currentProgress++;
        const progressPercent = Math.round(
          (currentProgress / totalUsernames) * 100
        );
        const prefix = hasExistingData ? 'Updating' : 'Fetching';
        setLoadingProgress(`${prefix} ${message} (${progressPercent}%)`);
      };

      // Only clear existing data if this is a fresh search (no existing data)
      if (!hasExistingData) {
        await clearEvents();
        await clearSearchItems();
      }

      // Accumulate all data from all users
      const allEvents: GitHubEvent[] = [];
      const allSearchItems: GitHubItem[] = [];

      // Fetch events for each username with pagination
      for (const singleUsername of usernames) {
        setCurrentUsername(singleUsername);

        try {
          // Fetch all issues and PRs with pagination
          const userSearchItems = await fetchAllSearchItems(singleUsername, githubToken, startDate, endDate, onProgress);
          allSearchItems.push(...userSearchItems);
          onProgress(`Fetched ${userSearchItems.length} issues/PRs for ${singleUsername}`);

           // Fetch all events with pagination
           const userEvents = await fetchAllEvents(singleUsername, githubToken, startDate, endDate, onProgress);
           allEvents.push(...userEvents);
           onProgress(`Fetched ${userEvents.length} events for ${singleUsername}`);


        } catch (error) {
          console.error(`Error fetching data for ${singleUsername}:`, error);
          onError(
            `Error fetching data for ${singleUsername}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          // Continue with other usernames instead of breaking
          continue;
        }
      }

      // Sort all accumulated data by date (newest first) before storing
      const sortedEvents = allEvents.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      const sortedSearchItems = allSearchItems.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      // Store all accumulated data at once
      if (sortedEvents.length > 0) {
        await storeEvents('github-events-indexeddb', sortedEvents, {
          lastFetch: Date.now(),
          usernames: usernames,
          apiMode: 'events',
          startDate,
          endDate,
        });
      }

      if (sortedSearchItems.length > 0) {
        await storeSearchItems('github-search-items-indexeddb', sortedSearchItems as unknown as GitHubEvent[], {
          lastFetch: Date.now(),
          usernames: usernames,
          apiMode: 'search',
          startDate,
          endDate,
        });
      }

      setLoadingProgress('Data fetch completed successfully!');
      setCurrentUsername('');
      
      // Clear success message after a delay
      setTimeout(() => {
        setLoadingProgress('');
      }, 2000);

    } catch (error) {
      console.error('Error during search:', error);
      onError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
      setLoadingProgress('');
      setCurrentUsername('');
    } finally {
      setLoading(false);
    }
  }, [
    username,
    githubToken,
    startDate,
    endDate,
    indexedDBEvents.length,
    indexedDBSearchItems.length,
    onError,
    storeEvents,
    clearEvents,
    storeSearchItems,
    clearSearchItems,
  ]);

  return {
    loading,
    loadingProgress,
    currentUsername,
    handleSearch,
  };
}; 