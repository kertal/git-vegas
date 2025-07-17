import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from 'react';
import { PageLayout, PageHeader, Box, Text, IconButton } from '@primer/react';
import { GearIcon, DatabaseIcon } from '@primer/octicons-react';

import { useFormSettings, useLocalStorage } from './hooks/useLocalStorage';
import { useIndexedDBStorage } from './hooks/useIndexedDBStorage';
import { validateUsernameList } from './utils';
import {
  categorizeRawEvents,
  categorizeRawSearchItems,
} from './utils/rawDataUtils';
import { GitHubItem, UISettings } from './types';

import SearchForm from './components/SearchForm';
import IssuesAndPRsList from './views/IssuesAndPRsList';
import EventView from './views/EventView';
import SummaryView from './views/Summary';
import OverviewTab from './views/OverviewTab';
import SettingsDialog from './components/SettingsDialog';
import { StorageManager } from './components/StorageManager';
import { LoadingIndicator } from './components/LoadingIndicator';
import ShareButton from './components/ShareButton';
import { SlotMachineLoader } from './components/SlotMachineLoader';
import { OfflineBanner } from './components/OfflineBanner';
import GitVegasLogo from './assets/GitVegas.svg?react';

// Form context for sharing form state across components
interface FormContextType {
  username: string;
  startDate: string;
  endDate: string;
  githubToken: string;
  apiMode: 'search' | 'events' | 'overview' | 'events-grouped';
  setUsername: (username: string) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setGithubToken: (token: string) => void;
  setApiMode: (
    mode: 'search' | 'events' | 'overview' | 'events-grouped'
  ) => void;
  handleSearch: () => void;
  handleUsernameBlur: () => void;
  validateUsernameFormat: (username: string) => void;
  loading: boolean;
  loadingProgress: string;
  error: string | null;
  searchItemsCount: number;
  eventsCount: number;
  rawEventsCount: number;
  groupedEventsCount: number;
}

const FormContext = createContext<FormContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormContextProvider');
  }
  return context;
}

// Update button styles to be consistent
// eslint-disable-next-line react-refresh/only-export-components
export const buttonStyles = {
  height: 28,
  minWidth: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
};

// Add back the events-grouped logic in the results calculation and render logic. Update the results useMemo to include 'events-grouped' mode and add the SummaryView component usage in the render section.
// Add the main App component
function App() {
  // Consolidated settings - reducing from 11 useLocalStorage calls to 5
  const [formSettings, setFormSettings] = useFormSettings(
    'github-form-settings',
    {
      username: '',
      startDate: (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30); // Default to last 30 days
        return date.toISOString().split('T')[0];
      })(),
      endDate: new Date().toISOString().split('T')[0],
      githubToken: '',
      apiMode: 'overview',
    }
  );

  const [uiSettings] = useLocalStorage<UISettings>('github-ui-settings', {
    isCompactView: true,
  });

  // const [itemUIState] = useLocalStorage<ItemUIState>(
  //   'github-item-ui-state',
  //   {
  //     descriptionVisible: {},
  //     expanded: {},
  //     selectedItems: new Set(),
  //   }
  // );

  // const [usernameCache] = useLocalStorage<UsernameCache>(
  //   'github-username-cache',
  //   {
  //     validatedUsernames: new Set(),
  //     invalidUsernames: new Set(),
  //   }
  // );

  // IndexedDB storage for events
  const {
    events: indexedDBEvents,
    error: eventsError,
    storeEvents,
    clearEvents,
  } = useIndexedDBStorage('github-events-indexeddb');

  // IndexedDB storage for search items (reusing the same hook with different key)
  const {
    events: indexedDBSearchItems,
    storeEvents: storeSearchItems,
    clearEvents: clearSearchItems,
  } = useIndexedDBStorage('github-search-items-indexeddb');

  // Extract individual values for convenience
  const { username, startDate, endDate, githubToken, apiMode } = formSettings;
  // const { validatedUsernames, invalidUsernames } = usernameCache;

  // Categorize raw data into processed items based on current API mode and date filters
  const results = useMemo(() => {
    if (apiMode === 'events' || apiMode === 'events-grouped') {
      return categorizeRawEvents(indexedDBEvents, startDate, endDate);
    } else if (apiMode === 'search') {
      // Cast indexedDBSearchItems to GitHubItem[] since the hook returns GitHubEvent[]
      return categorizeRawSearchItems(
        indexedDBSearchItems as unknown as GitHubItem[],
        startDate,
        endDate
      );
    } else {
      // For 'overview' mode, return empty array as it handles its own data
      return [];
    }
  }, [apiMode, indexedDBEvents, indexedDBSearchItems, startDate, endDate]);

  // Calculate counts for navigation tabs
  const searchItemsCount = useMemo(() => {
    return categorizeRawSearchItems(
      indexedDBSearchItems as unknown as GitHubItem[],
      startDate,
      endDate
    ).length;
  }, [indexedDBSearchItems, startDate, endDate]);

  const eventsCount = useMemo(() => {
    return categorizeRawEvents(indexedDBEvents, startDate, endDate).length;
  }, [indexedDBEvents, startDate, endDate]);

  // Calculate grouped events count (number of unique URLs after grouping)
  const groupedEventsCount = useMemo(() => {
    if (apiMode !== 'events-grouped') return 0;

    const categorizedEvents = categorizeRawEvents(
      indexedDBEvents,
      startDate,
      endDate
    );

    // Group by URL to count unique items
    const urlGroups: { [url: string]: GitHubItem[] } = {};

    categorizedEvents.forEach(item => {
      let groupingUrl = item.html_url;
      // For comments, extract the issue/PR URL from the comment URL
      if (item.title.startsWith('Comment on:')) {
        groupingUrl = groupingUrl.split('#')[0];
      }

      if (!urlGroups[groupingUrl]) {
        urlGroups[groupingUrl] = [];
      }
      urlGroups[groupingUrl].push(item);
    });

    return Object.keys(urlGroups).length;
  }, [indexedDBEvents, startDate, endDate, apiMode]);

  // Get available labels from raw data
  // const availableLabels = useMemo(() => {
  //   if (apiMode === 'events' || apiMode === 'events-grouped') {
  //     return getAvailableLabelsFromRawEvents(indexedDBEvents);
  //   } else if (apiMode === 'search') {
  //     return extractAvailableLabels(
  //       indexedDBSearchItems as unknown as GitHubItem[]
  //   );
  //   } else {
  //     // For 'overview' mode, return empty array as it handles its own data
  //     return [];
  //   }
  // }, [apiMode, indexedDBEvents, indexedDBSearchItems]);

  // Additional component state (not persisted)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStorageManagerOpen, setIsStorageManagerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isManuallySpinning, setIsManuallySpinning] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');

  // Clipboard feedback
  // const { isCopied: isClipboardCopied, triggerCopy: triggerClipboardCopy } = useCopyFeedback(2000);

  // Separate search text states for events and issues
  const [issuesSearchText] = useState('');

  // Apply search text filtering to results (supports label:name, user:username syntax)
  // const filteredResults = useMemo(() => {
  //   if (apiMode === 'overview') {
  //     return results;
  //   }
  //
  //   return filterByText(results, issuesSearchText);
  // }, [results, issuesSearchText, apiMode]);

  // Memoize avatar URLs extraction to avoid recalculating on every render
  const avatarUrls = useMemo(() => {
    return (Array.isArray(results) ? results : [])
      .map(item => item.user.avatar_url)
      .filter(Boolean);
  }, [results]);

  // Real-time username format validation
  const validateUsernameFormat = useCallback(
    (usernameString: string) => {
      if (!usernameString.trim()) {
        setError(null);
        return;
      }

      const validation = validateUsernameList(usernameString);

      if (validation.errors.length === 0) {
        setError(null);
        // Update cache with validated usernames
        setFormSettings(prev => ({
          ...prev,
          username: usernameString,
        }));
      } else {
        setError(validation.errors.join('\n'));
      }
    },
    [setFormSettings]
  );

  // Handle username blur event
  const handleUsernameBlur = useCallback(() => {
    if (username.trim()) {
      validateUsernameFormat(username);
    }
  }, [username, validateUsernameFormat]);

  // Handle form settings changes
  const setUsername = useCallback(
    (username: string) => {
      setFormSettings(prev => ({ ...prev, username }));
    },
    [setFormSettings]
  );

  const setStartDate = useCallback(
    (startDate: string) => {
      setFormSettings(prev => ({ ...prev, startDate }));
    },
    [setFormSettings]
  );

  const setEndDate = useCallback(
    (endDate: string) => {
      setFormSettings(prev => ({ ...prev, endDate }));
    },
    [setFormSettings]
  );

  const setGithubToken = useCallback(
    (githubToken: string) => {
      setFormSettings(prev => ({ ...prev, githubToken }));
    },
    [setFormSettings]
  );

  const setApiMode = useCallback(
    (apiMode: 'search' | 'events' | 'overview' | 'events-grouped') => {
      setFormSettings(prev => ({ ...prev, apiMode }));
    },
    [setFormSettings]
  );

  // Handle search with progress tracking
  const handleSearch = useCallback(async () => {
    if (!username.trim()) {
      setError('Please enter a GitHub username');
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingProgress('Starting search...');

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
        setLoadingProgress(`${message} (${progressPercent}%)`);
      };

      // Clear existing data
      await clearEvents();
      await clearSearchItems();

      // Fetch events for each username
      for (const singleUsername of usernames) {
        setCurrentUsername(singleUsername);

        try {
          // Fetch events
          const eventsResponse = await fetch(
            `https://api.github.com/users/${singleUsername}/events?per_page=300`,
            {
              headers: {
                ...(githubToken && { Authorization: `token ${githubToken}` }),
                Accept: 'application/vnd.github.v3+json',
              },
            }
          );

          if (!eventsResponse.ok) {
            throw new Error(
              `Failed to fetch events: ${eventsResponse.statusText}`
            );
          }

          const events = await eventsResponse.json();
          await storeEvents('github-events-indexeddb', events, {
            lastFetch: Date.now(),
            usernames: [singleUsername],
            apiMode: 'events',
            startDate,
            endDate,
          });
          onProgress(`Fetched events for ${singleUsername}`);

          // Fetch issues and PRs
          const searchResponse = await fetch(
            `https://api.github.com/search/issues?q=author:${singleUsername}&per_page=100&sort=updated`,
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
          await storeSearchItems(
            'github-search-items-indexeddb',
            searchData.items,
            {
              lastFetch: Date.now(),
              usernames: [singleUsername],
              apiMode: 'search',
              startDate,
              endDate,
            }
          );
          onProgress(`Fetched issues/PRs for ${singleUsername}`);
        } catch (error) {
          console.error(`Error fetching data for ${singleUsername}:`, error);
          setError(
            `Error fetching data for ${singleUsername}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          break;
        }
      }

      setLoadingProgress('Search completed!');
      setCurrentUsername('');
    } catch (error) {
      console.error('Search error:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'An error occurred during search'
      );
    } finally {
      setLoading(false);
      setLoadingProgress('');
    }
  }, [
    username,
    githubToken,
    clearEvents,
    clearSearchItems,
    storeEvents,
    storeSearchItems,
    startDate,
    endDate,
  ]);

  // Handle manual slot machine spin
  const handleManualSpin = useCallback(() => {
    setIsManuallySpinning(true);
    setTimeout(() => setIsManuallySpinning(false), 2000);
  }, []);

  // Mark initial loading as complete
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const rawEventsCount = indexedDBEvents.length;

  return (
    <PageLayout sx={{ '--spacing': '4 !important' }} containerWidth="full">
      <PageLayout.Header className="border-bottom bgColor-inset">
        <PageHeader role="banner" aria-label="Title" sx={{ p: '2' }}>
          <PageHeader.TitleArea>
            <PageHeader.LeadingVisual>
              <GitVegasLogo width={32} height={32} onClick={handleManualSpin} />
            </PageHeader.LeadingVisual>
            <PageHeader.Title>GitVegas</PageHeader.Title>
          </PageHeader.TitleArea>
          <PageHeader.Actions>
            <LoadingIndicator
              loadingProgress={loadingProgress}
              isLoading={loading || initialLoading}
              currentUsername={currentUsername}
            />
            <ShareButton
              formSettings={formSettings}
              uiSettings={uiSettings}
              searchText={issuesSearchText}
              size="medium"
            />
            <IconButton
              icon={DatabaseIcon}
              aria-label="Storage Manager"
              onClick={() => setIsStorageManagerOpen(true)}
            />
            <IconButton
              icon={GearIcon}
              aria-label="Settings"
              onClick={() => setIsSettingsOpen(true)}
            />
            <SlotMachineLoader
              avatarUrls={avatarUrls}
              isLoading={loading || initialLoading}
              isManuallySpinning={isManuallySpinning}
            />
          </PageHeader.Actions>
        </PageHeader>
      </PageLayout.Header>

      <PageLayout.Content sx={{ px: 3, py: 1 }}>
        <FormContext.Provider
          value={{
            username,
            startDate,
            endDate,
            githubToken,
            apiMode,
            setUsername,
            setStartDate,
            setEndDate,
            setGithubToken,
            setApiMode,
            handleSearch,
            handleUsernameBlur,
            validateUsernameFormat,
            loading,
            loadingProgress,
            error,
            searchItemsCount,
            eventsCount,
            rawEventsCount,
            groupedEventsCount,
          }}
        >
          <SearchForm />
          {apiMode === 'events' ? (
            <EventView items={results} rawEvents={indexedDBEvents} />
          ) : apiMode === 'overview' ? (
            <OverviewTab
              indexedDBSearchItems={
                indexedDBSearchItems as unknown as GitHubItem[]
              }
              indexedDBEvents={indexedDBEvents}
            />
          ) : apiMode === 'events-grouped' ? (
            <SummaryView
              items={results}
              rawEvents={indexedDBEvents}
              indexedDBSearchItems={
                indexedDBSearchItems as unknown as GitHubItem[]
              }
            />
          ) : (
            <IssuesAndPRsList results={results} buttonStyles={buttonStyles} />
          )}
          {eventsError && (
            <Box
              sx={{
                p: 2,
                bg: 'danger.subtle',
                color: 'danger.fg',
                borderRadius: 2,
                mb: 2,
              }}
            >
              <Text>Error loading events: {eventsError}</Text>
            </Box>
          )}
          <SettingsDialog
            isOpen={isSettingsOpen}
            onDismiss={() => setIsSettingsOpen(false)}
          />
          <StorageManager
            isOpen={isStorageManagerOpen}
            onClose={() => setIsStorageManagerOpen(false)}
            onClearEvents={clearEvents}
            onClearSearchItems={clearSearchItems}
          />
        </FormContext.Provider>
      </PageLayout.Content>

      <PageLayout.Footer padding="condensed">
        <small>
          v0.0.7.7.7, prompted by{' '}
          <a href="https://github.com/kertal">@kertal</a>
        </small>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1,
            minHeight: '40px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <OfflineBanner />
          </Box>
        </Box>
      </PageLayout.Footer>
    </PageLayout>
  );
}

export default App;
