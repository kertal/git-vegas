import { useCallback, useState } from 'react';
import { GitHubEvent, GitHubItem } from '../types';
import { EventsData } from '../utils/indexedDB';

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
    const perPage = 100;
    let hasMorePages = true;

    while (hasMorePages) {
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
          throw new Error(`Failed to fetch events page ${page}: ${response.statusText}`);
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
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error fetching events page ${page} for ${username}:`, error);
        // Continue with what we have so far
        hasMorePages = false;
      }
    }

    return allEvents;
  };

  const handleSearch = useCallback(async () => {
    if (!username.trim()) {
      onError('Please enter a GitHub username');
      return;
    }

    // Check if there's existing data using actual arrays
    const hasExistingData = indexedDBEvents.length > 0 || indexedDBSearchItems.length > 0;
    
    setLoading(true);
    onError(''); // Clear any previous errors
    setLoadingProgress(hasExistingData ? 'Updating data in background...' : 'Starting search...');

    try {
      const usernames = username
        .split(',')
        .map(u => u.trim())
        .filter(Boolean);
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
          // Fetch all events with pagination
          const userEvents = await fetchAllEvents(singleUsername, githubToken, startDate, endDate, onProgress);
          allEvents.push(...userEvents);
          onProgress(`Fetched ${userEvents.length} events for ${singleUsername}`);

          // Fetch issues and PRs with date range filtering
          const searchQuery = `author:${singleUsername} updated:${startDate}..${endDate}`;
          const searchResponse = await fetch(
            `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=100&sort=updated`,
            {
              headers: {
                ...(githubToken && { Authorization: `token ${githubToken}` }),
                Accept: 'application/vnd.github.v3+json',
              },
            }
          );

          if (!searchResponse.ok) {
            throw new Error(
              `Failed to fetch issues/PRs: ${searchResponse.statusText}`
            );
          }

          const searchData = await searchResponse.json();
          // Add original property to search items
          const searchItemsWithOriginal = searchData.items.map((item: Record<string, unknown>) => ({
            ...item,
            original: item, // Store the original item as the original payload
          }));
          allSearchItems.push(...searchItemsWithOriginal);
          onProgress(`Fetched issues/PRs for ${singleUsername}`);
        } catch (error) {
          console.error(`Error fetching data for ${singleUsername}:`, error);
          onError(
            `Error fetching data for ${singleUsername}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          break;
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