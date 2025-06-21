import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from 'react';
import {
  Box,
  Button,
  IconButton,
  PageLayout,
  PageHeader,
  Text,
} from '@primer/react';
import { GearIcon, DatabaseIcon } from '@primer/octicons-react';
import './App.css';
import { SlotMachineLoader } from './components/SlotMachineLoader';
import SearchForm from './components/SearchForm';
import ResultsList from './components/ResultsList';
import SettingsDialog from './components/SettingsDialog';
import { StorageManager } from './components/StorageManager';
import { OfflineBanner } from './components/OfflineBanner';
import ShareButton from './components/ShareButton';
import TimelineView from './components/TimelineView';
import { LoadingIndicator } from './components/LoadingIndicator';
import { useLocalStorage, useFormSettings } from './hooks/useLocalStorage';
import { useIndexedDBStorage } from './hooks/useIndexedDBStorage';
import { useCopyFeedback } from './hooks/useCopyFeedback';
import {
  UISettings,
  ItemUIState,
  UsernameCache,
  FormContextType,
  ResultsContextType,
  GitHubItem,
  GitHubEvent,
} from './types';
import { extractAvailableLabels } from './utils/resultsUtils';
import { copyResultsToClipboard as copyToClipboard } from './utils/clipboard';
import { validateUsernameList } from './utils';
import {
  performCombinedGitHubSearch,
  type GitHubSearchParams,
} from './utils/githubSearch';
import {
  categorizeRawEvents,
  categorizeRawSearchItems,
  getAvailableLabelsFromRawEvents,
} from './utils/rawDataUtils';

// Form Context to isolate form state changes
const FormContext = createContext<FormContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormContextProvider');
  }
  return context;
}

// Results Context to isolate results state changes
const ResultsContext = createContext<ResultsContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useResultsContext() {
  const context = useContext(ResultsContext);
  if (!context) {
    throw new Error(
      'useResultsContext must be used within a ResultsContextProvider'
    );
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
      apiMode: 'search',
    }
  );

  const [uiSettings, setUISettings] = useLocalStorage<UISettings>(
    'github-ui-settings',
    {
      isCompactView: true,
      timelineViewMode: 'grouped',
    }
  );

  const [itemUIState, setItemUIState] = useLocalStorage<ItemUIState>(
    'github-item-ui-state',
    {
      descriptionVisible: {},
      expanded: {},
      selectedItems: new Set(),
    }
  );

  const [usernameCache] = useLocalStorage<UsernameCache>(
    'github-username-cache',
    {
      validatedUsernames: new Set(),
      invalidUsernames: new Set(),
    }
  );

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
  const { isCompactView, timelineViewMode } = uiSettings;
  const { descriptionVisible, expanded, selectedItems } = itemUIState;
  const { validatedUsernames, invalidUsernames } = usernameCache;

  // Categorize raw data into processed items based on current API mode and date filters
  const results = useMemo(() => {
    if (apiMode === 'events') {
      return categorizeRawEvents(indexedDBEvents, startDate, endDate);
    } else {
      // Cast indexedDBSearchItems to GitHubItem[] since the hook returns GitHubEvent[]
      return categorizeRawSearchItems(
        indexedDBSearchItems as unknown as GitHubItem[],
        startDate,
        endDate
      );
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

  // Get available labels from raw data
  const availableLabels = useMemo(() => {
    if (apiMode === 'events') {
      return getAvailableLabelsFromRawEvents(indexedDBEvents);
    } else {
      return extractAvailableLabels(
        indexedDBSearchItems as unknown as GitHubItem[]
      );
    }
  }, [apiMode, indexedDBEvents, indexedDBSearchItems]);

  // Additional component state (not persisted)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStorageManagerOpen, setIsStorageManagerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isManuallySpinning, setIsManuallySpinning] = useState(false);
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState('');

  // Clipboard feedback
  const { isCopied: isClipboardCopied, triggerCopy: triggerClipboardCopy } = useCopyFeedback(2000);

  // Simple search text state (no complex filtering)
  const [searchText, setSearchText] = useState('');

  // Memoize avatar URLs extraction to avoid recalculating on every render
  const avatarUrls = useMemo(() => {
    return (Array.isArray(results) ? results : [])
      .map(item => item.user.avatar_url)
      .filter(Boolean);
  }, [results]);

  // Real-time username format validation
  const validateUsernameFormat = useCallback((usernameString: string) => {
    if (!usernameString.trim()) {
      setError(null);
      return;
    }

    const validation = validateUsernameList(usernameString);

    if (validation.errors.length > 0) {
      setError(validation.errors.join('\n'));
    } else {
      setError(null);
    }
  }, []);

  // Handle username field blur with basic format validation
  const handleUsernameBlur = useCallback(async () => {
    if (!username) return;

    // Only do format validation on blur, not API validation
    // API validation will happen during form submission
    const validation = validateUsernameList(username);

    if (validation.errors.length > 0) {
      setError(validation.errors.join('\n'));
    } else {
      setError(null);
    }
  }, [username]);



  // Update handleSearch to check cache first
  const handleSearch = useCallback(async () => {
    // Create search parameters
    const searchParams: GitHubSearchParams = {
      username,
      startDate,
      endDate,
      githubToken,
      apiMode,
    };

    // Create username cache object
    const cache: UsernameCache = {
      validatedUsernames,
      invalidUsernames,
    };

    // Set up progress callback
    const onProgress = (message: string) => {
      setLoadingProgress(message);

      // Extract username from progress message
      const usernameMatch = message.match(/for\s+([a-zA-Z0-9_-]+)/);
      if (usernameMatch) {
        setCurrentUsername(usernameMatch[1]);
      } else if (
        message.includes('Successfully loaded') ||
        message.includes('Validating usernames')
      ) {
        setCurrentUsername('');
      }
    };

    setLoading(true);
    setError(null);

    try {
      // Always fetch both events and issues/PRs
      const result = await performCombinedGitHubSearch(searchParams, cache, {
        onProgress,
        requestDelay: 500,
      });

      // Store both types of data
      if (result.rawEvents && result.rawEvents.length > 0) {
        // Store events in IndexedDB
        await storeEvents('github-events-indexeddb', result.rawEvents, {
          lastFetch: Date.now(),
          usernames: result.processedUsernames,
          apiMode: 'events',
          startDate,
          endDate,
        });
      }

      if (result.rawSearchItems && result.rawSearchItems.length > 0) {
        // Store search items in IndexedDB (cast to GitHubEvent[] for storage)
        await storeSearchItems(
          'github-search-items-indexeddb',
          result.rawSearchItems as unknown as GitHubEvent[],
          {
            lastFetch: Date.now(),
            usernames: result.processedUsernames,
            apiMode: 'search',
            startDate,
            endDate,
          }
        );
      }

      // Show success message briefly
      const eventsCount = result.rawEvents?.length || 0;
      const itemsCount = result.rawSearchItems?.length || 0;
      setLoadingProgress(
        `Successfully loaded ${eventsCount} events and ${itemsCount} issues/PRs!`
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clear loading state
      setLoading(false);
      setLoadingProgress('');
    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
      setLoadingProgress('');
    }
  }, [
    username,
    startDate,
    endDate,
    githubToken,
    apiMode,
    validatedUsernames,
    invalidUsernames,
    storeEvents,
    storeSearchItems,
  ]);

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
    (apiMode: 'search' | 'events') => {
      setFormSettings(prev => ({ ...prev, apiMode }));
    },
    [setFormSettings]
  );

  // Handle UI settings changes
  const setIsCompactView = useCallback(
    (isCompactView: boolean) => {
      setUISettings(prev => ({ ...prev, isCompactView }));
    },
    [setUISettings]
  );

  const setTimelineViewMode = useCallback(
    (timelineViewMode: 'standard' | 'raw' | 'grouped') => {
      setUISettings(prev => ({ ...prev, timelineViewMode }));
    },
    [setUISettings]
  );

  // Handle item UI state changes
  const setSelectedItems = useCallback(
    (selectedItems: Set<string | number>) => {
      setItemUIState(prev => ({ ...prev, selectedItems }));
    },
    [setItemUIState]
  );

  const toggleDescriptionVisibility = useCallback(
    (id: number) => {
      setItemUIState(prev => ({
        ...prev,
        descriptionVisible: {
          ...prev.descriptionVisible,
          [id]: !prev.descriptionVisible[id],
        },
      }));
    },
    [setItemUIState]
  );

  const toggleExpand = useCallback(
    (id: number) => {
      setItemUIState(prev => ({
        ...prev,
        expanded: {
          ...prev.expanded,
          [id]: !prev.expanded[id],
        },
      }));
    },
    [setItemUIState]
  );

  // Clipboard handler
  const copyResultsToClipboard = useCallback(
    async (format: 'detailed' | 'compact') => {
      // Only consider items that are both selected and in the filtered results
      const visibleSelectedItems =
        selectedItems.size > 0
          ? results.filter(item =>
              selectedItems.has(item.event_id || item.id)
            )
          : results;

      const result = await copyToClipboard(visibleSelectedItems, {
        isCompactView: format === 'compact',
        onSuccess: () => {
          // Trigger visual feedback via copy feedback system
          triggerClipboardCopy(format);
        },
        onError: (error: Error) => {
          setClipboardMessage(`Error: ${error.message}`);
          setTimeout(() => setClipboardMessage(null), 3000);
        },
      });

      return result;
    },
    [results, selectedItems, triggerClipboardCopy]
  );

  // Selection handlers
  const toggleItemSelection = useCallback(
    (id: string | number) => {
      const newSet = new Set(selectedItems);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      setSelectedItems(newSet);
    },
    [selectedItems, setSelectedItems]
  );

  const selectAllItems = useCallback(() => {
    setSelectedItems(
      new Set(results.map(item => item.event_id || item.id))
    );
  }, [results, setSelectedItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, [setSelectedItems]);

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

  return (
    <PageLayout sx={{ '--spacing': '4 !important' }}>
      <PageLayout.Header className="border-bottom" divider="line">
        <PageHeader role="banner" aria-label="Title">
          <PageHeader.TitleArea>
            <PageHeader.Title>Git Vegas</PageHeader.Title>
            <PageHeader.TrailingVisual>
              <SlotMachineLoader
                avatarUrls={avatarUrls}
                isLoading={loading || initialLoading}
                isManuallySpinning={isManuallySpinning}
              />
              <Button
                variant="invisible"
                onClick={handleManualSpin}
                disabled={isManuallySpinning || loading || initialLoading}
                sx={{
                  p: 1,
                  color: 'fg.default',
                  opacity:
                    isManuallySpinning || loading || initialLoading ? 0.5 : 1,
                  '&:hover:not(:disabled)': {
                    color: 'accent.fg',
                    transform: 'scale(1.1)',
                    transition: 'transform 0.2s ease-in-out',
                  },
                  '&:disabled': {
                    cursor: 'not-allowed',
                  },
                  '&:focus': {
                    outline: 'none',
                    boxShadow: 'none',
                  },
                  cursor: 'pointer',
                  fontSize: '12px',
                  lineHeight: 1,
                  height: 'auto',
                  minWidth: 'auto',
                }}
              >
                🕹️
              </Button>
            </PageHeader.TrailingVisual>
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
              searchText={searchText}
              size="medium"
              variant="invisible"
            />
            <IconButton
              icon={DatabaseIcon}
              aria-label="Storage Manager"
              onClick={() => setIsStorageManagerOpen(true)}
              variant="invisible"
            />
            <IconButton
              icon={GearIcon}
              aria-label="Settings"
              onClick={() => setIsSettingsOpen(true)}
              variant="invisible"
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
          }}
        >
          <ResultsContext.Provider
            value={{
              results,
              filteredResults: results, // No filtering, just use results directly
              filter: 'all',
              statusFilter: 'all',
              includedLabels: [],
              excludedLabels: [],
              searchText,
              repoFilters: [],
              userFilter: '',
              availableLabels,
              setFilter: () => {}, // No-op functions since we removed filtering
              setStatusFilter: () => {},
              setIncludedLabels: () => {},
              setExcludedLabels: () => {},
              setSearchText,
              toggleDescriptionVisibility,
              toggleExpand,
              copyResultsToClipboard,
              descriptionVisible,
              expanded,
              clipboardMessage,
              clearAllFilters: () => {},
              isCompactView,
              setIsCompactView,
              selectedItems,
              toggleItemSelection,
              selectAllItems,
              clearSelection,
              setRepoFilters: () => {},
              setUserFilter: () => {},
              isClipboardCopied,
            }}
          >
            <SearchForm />
            {apiMode === 'events' ? (
              <TimelineView
                items={results}
                rawEvents={indexedDBEvents}
                viewMode={timelineViewMode}
                setViewMode={setTimelineViewMode}
                selectedItems={selectedItems}
                toggleItemSelection={toggleItemSelection}
                selectAllItems={selectAllItems}
                clearSelection={clearSelection}
                copyResultsToClipboard={copyResultsToClipboard}
                searchText={searchText}
                setSearchText={setSearchText}
                isClipboardCopied={isClipboardCopied}
                triggerClipboardCopy={triggerClipboardCopy}
              />
            ) : (
              <ResultsList
                useResultsContext={useResultsContext}
                buttonStyles={buttonStyles}
              />
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
          </ResultsContext.Provider>
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
