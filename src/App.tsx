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
  IconButton,
  PageLayout,
  PageHeader,
  Text,
} from '@primer/react';
import { GearIcon, DatabaseIcon } from '@primer/octicons-react';
import './App.css';
import GitVegasLogo from './assets/GitVegas.svg?react';
import { SlotMachineLoader } from './components/SlotMachineLoader';
import SearchForm from './components/SearchForm';
import ResultsList from './components/ResultsList';
import SettingsDialog from './components/SettingsDialog';
import { StorageManager } from './components/StorageManager';
import { OfflineBanner } from './components/OfflineBanner';
import ShareButton from './components/ShareButton';
import TimelineView from './components/TimelineView';
import OverviewTab from './components/OverviewTab';
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
import { filterByText } from './utils/resultsUtils';
import SummaryView from './components/Summary';

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

  const [uiSettings, setUISettings] = useLocalStorage<UISettings>(
    'github-ui-settings',
    {
      isCompactView: true,
      timelineViewMode: 'standard',
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

  // Get available labels from raw data
  const availableLabels = useMemo(() => {
    if (apiMode === 'events' || apiMode === 'events-grouped') {
      return getAvailableLabelsFromRawEvents(indexedDBEvents);
    } else if (apiMode === 'search') {
      return extractAvailableLabels(
        indexedDBSearchItems as unknown as GitHubItem[]
      );
    } else {
      // For 'overview' mode, return empty array as it handles its own data
      return [];
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

  // Separate search text states for events and issues
  const [eventsSearchText, setEventsSearchText] = useState('');
  const [issuesSearchText, setIssuesSearchText] = useState('');

  // Apply search text filtering to results (supports label:name, user:username syntax)
  const filteredResults = useMemo(() => {
    if (apiMode === 'overview') {
      return results;
    }
    
    return filterByText(results, issuesSearchText);
  }, [results, issuesSearchText, apiMode]);

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
    (apiMode: 'search' | 'events' | 'overview' | 'events-grouped') => {
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
    (timelineViewMode: 'standard' | 'raw') => {
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
    <PageLayout sx={{ '--spacing': '4 !important' }} containerWidth='full'>
      <PageLayout.Header className="border-bottom bgColor-inset">
        <PageHeader role="banner" aria-label="Title" sx={{ 'p': '2'}}>
          <PageHeader.TitleArea>
            <PageHeader.LeadingVisual>
            <GitVegasLogo width={32} height={32}  onClick={handleManualSpin}/>
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
              searchText={apiMode === 'events' ? eventsSearchText : issuesSearchText}
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
          }}
        >
          <ResultsContext.Provider
            value={{
              results,
              filteredResults: filteredResults,
              filter: 'all',
              statusFilter: 'all',
              includedLabels: [],
              excludedLabels: [],
              searchText: issuesSearchText, // Use issues search text for search results
              repoFilters: [],
              userFilter: '',
              availableLabels,
              setFilter: () => {}, // No-op functions since we removed filtering
              setStatusFilter: () => {},
              setIncludedLabels: () => {},
              setExcludedLabels: () => {},
              setSearchText: setIssuesSearchText,
              toggleDescriptionVisibility,
              toggleExpand,
              copyResultsToClipboard,
              descriptionVisible,
              expanded,
              clipboardMessage,
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
                viewMode={timelineViewMode === 'raw' ? 'raw' : 'standard'}
                setViewMode={setTimelineViewMode}
                selectedItems={selectedItems}
                toggleItemSelection={toggleItemSelection}
                selectAllItems={selectAllItems}
                clearSelection={clearSelection}
                copyResultsToClipboard={copyResultsToClipboard}
                searchText={eventsSearchText}
                setSearchText={setEventsSearchText}
                isClipboardCopied={isClipboardCopied}
              />
            ) : apiMode === 'overview' ? (
              <OverviewTab 
                indexedDBSearchItems={indexedDBSearchItems as unknown as GitHubItem[]}
                indexedDBEvents={indexedDBEvents}
              />
            ) : apiMode === 'events-grouped' ? (
              <SummaryView
                items={results}
                rawEvents={indexedDBEvents}
                selectedItems={selectedItems}
                toggleItemSelection={toggleItemSelection}
                selectAllItems={selectAllItems}
                clearSelection={clearSelection}
                copyResultsToClipboard={copyResultsToClipboard}
                searchText={eventsSearchText}
                setSearchText={setEventsSearchText}
                isClipboardCopied={isClipboardCopied}
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
