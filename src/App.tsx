import {
  useState,
  useCallback,
  useContext,
  createContext,
  useEffect,
  useMemo,
} from 'react';
import { Box, Button, IconButton, PageLayout, PageHeader } from '@primer/react';
import { GearIcon } from '@primer/octicons-react';
import './App.css';
import { SlotMachineLoader } from './components/SlotMachineLoader';
import SearchForm from './components/SearchForm';
import SettingsDialog from './components/SettingsDialog';
import ResultsList from './components/ResultsList';
import TimelineView from './components/TimelineView';

import { OfflineBanner } from './components/OfflineBanner';
import {
  GitHubItem,
  FormContextType,
  ResultsContextType,
  UISettings,
  ItemUIState,
  UsernameCache,
} from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useFormSettings } from './hooks/useLocalStorage';
import { validateUsernameList } from './utils';
import { copyResultsToClipboard as copyToClipboard } from './utils/clipboard';
import { countItemsMatchingFilter } from './utils/filterUtils';
import { createAddToCache, createRemoveFromCache } from './utils/usernameCache';
import {
  extractAvailableLabels,
  applyFiltersAndSort,
  createDefaultFilter,
  ResultsFilter,
} from './utils/resultsUtils';
import { performGitHubSearch, GitHubSearchParams, GitHubEvent } from './utils/githubSearch';
import {
  parseUrlParams,
  applyUrlOverrides,
  cleanupUrlParams,
} from './utils/urlState';
import ShareButton from './components/ShareButton';

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
      isCompactView: false,
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

  const [usernameCache, setUsernameCache] = useLocalStorage<UsernameCache>(
    'github-username-cache',
    {
      validatedUsernames: new Set(),
      invalidUsernames: new Set(),
    }
  );

  // Separate filter states for different API modes
  const [searchFilters, setSearchFilters] = useLocalStorage<ResultsFilter>(
    'github-search-filters',
    createDefaultFilter()
  );
  const [eventsFilters, setEventsFilters] = useLocalStorage<ResultsFilter>(
    'github-events-filters',
    createDefaultFilter()
  );
  const [searchResults, setSearchResults] = useLocalStorage<GitHubItem[]>(
    'github-search-results',
    []
  );
  const [eventsResults, setEventsResults] = useLocalStorage<GitHubItem[]>(
    'github-events-results',
    []
  );
  const [rawEventsResults, setRawEventsResults] = useLocalStorage<GitHubEvent[]>(
    'github-raw-events-results',
    []
  );
  const [lastSearchParams, setLastSearchParams] = useLocalStorage<{
    username: string;
    startDate: string;
    endDate: string;
    apiMode: string;
    timestamp: number;
  } | null>('github-last-search-params', null);



  // Extract individual values for convenience
  const { username, startDate, endDate, githubToken, apiMode } = formSettings;

  // Get the appropriate results and filters based on current API mode
  const results = useMemo(() => {
    return apiMode === 'events' ? eventsResults : searchResults;
  }, [apiMode, eventsResults, searchResults]);

  const currentFilters = useMemo(() => {
    return apiMode === 'events' ? eventsFilters : searchFilters;
  }, [apiMode, eventsFilters, searchFilters]);

  const setCurrentFilters = useMemo(() => {
    return apiMode === 'events' ? setEventsFilters : setSearchFilters;
  }, [apiMode, setEventsFilters, setSearchFilters]);
  const { isCompactView, timelineViewMode } = uiSettings;
  const {
    descriptionVisible,
    expanded,
    selectedItems: rawSelectedItems,
  } = itemUIState;
  const {
    validatedUsernames: rawValidatedUsernames,
    invalidUsernames: rawInvalidUsernames,
  } = usernameCache;

  // Ensure selectedItems is always a Set instance (defensive programming)
  const selectedItems = useMemo(() => {
    if (rawSelectedItems instanceof Set) {
      return rawSelectedItems;
    }
    // If it's not a Set (corrupted data or deserialization issue), create a new empty Set
    console.warn(
      'selectedItems is not a Set instance, creating new empty Set:',
      rawSelectedItems
    );
    return new Set<number>();
  }, [rawSelectedItems]);

  // Ensure validatedUsernames is always a Set instance (defensive programming)
  const validatedUsernames = useMemo(() => {
    if (rawValidatedUsernames instanceof Set) {
      return rawValidatedUsernames;
    }
    // If it's not a Set (corrupted data or deserialization issue), create a new empty Set
    console.warn(
      'validatedUsernames is not a Set instance, creating new empty Set:',
      rawValidatedUsernames
    );
    return new Set<string>();
  }, [rawValidatedUsernames]);

  // Ensure invalidUsernames is always a Set instance (defensive programming)
  const invalidUsernames = useMemo(() => {
    if (rawInvalidUsernames instanceof Set) {
      return rawInvalidUsernames;
    }
    // If it's not a Set (corrupted data or deserialization issue), create a new empty Set
    console.warn(
      'invalidUsernames is not a Set instance, creating new empty Set:',
      rawInvalidUsernames
    );
    return new Set<string>();
  }, [rawInvalidUsernames]);

  // Additional component state (not persisted)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isManuallySpinning, setIsManuallySpinning] = useState(false);
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);

  // URL state initialization - apply URL overrides on mount if present
  useEffect(() => {
    const urlState = parseUrlParams();

    if (Object.keys(urlState).length > 0) {
      // Apply URL overrides to current state
      const overrides = applyUrlOverrides(
        urlState,
        formSettings,
        uiSettings,
        currentFilters
      );

      // Update state with URL overrides
      if (
        JSON.stringify(overrides.formSettings) !== JSON.stringify(formSettings)
      ) {
        setFormSettings(overrides.formSettings);
      }
      if (JSON.stringify(overrides.uiSettings) !== JSON.stringify(uiSettings)) {
        setUISettings(overrides.uiSettings);
      }
      if (
        JSON.stringify(overrides.currentFilters) !==
        JSON.stringify(currentFilters)
      ) {
        setCurrentFilters(overrides.currentFilters);
      }

      // Clean up URL after applying overrides (only when URL params were actually used)
      cleanupUrlParams();
    }
    // This effect should only run on mount to apply URL overrides
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Individual setters for form settings
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

  // Individual setters for UI settings
  const setIsCompactView = useCallback(
    (isCompactView: boolean | ((prev: boolean) => boolean)) => {
      setUISettings(prev => ({
        ...prev,
        isCompactView:
          typeof isCompactView === 'function'
            ? isCompactView(prev.isCompactView)
            : isCompactView,
      }));
    },
    [setUISettings]
  );

  const setTimelineViewMode = useCallback(
    (viewMode: 'standard' | 'raw' | 'grouped' | ((prev: 'standard' | 'raw' | 'grouped') => 'standard' | 'raw' | 'grouped')) => {
      setUISettings(prev => ({
        ...prev,
        timelineViewMode:
          typeof viewMode === 'function'
            ? viewMode(prev.timelineViewMode)
            : viewMode,
      }));
    },
    [setUISettings]
  );



  // Individual setters for item UI state
  const setDescriptionVisible = useCallback(
    (
      descriptionVisible:
        | { [id: number]: boolean }
        | ((prev: { [id: number]: boolean }) => { [id: number]: boolean })
    ) => {
      setItemUIState(prev => ({
        ...prev,
        descriptionVisible:
          typeof descriptionVisible === 'function'
            ? descriptionVisible(prev.descriptionVisible)
            : descriptionVisible,
      }));
    },
    [setItemUIState]
  );

  const setExpanded = useCallback(
    (
      expanded:
        | { [id: number]: boolean }
        | ((prev: { [id: number]: boolean }) => { [id: number]: boolean })
    ) => {
      setItemUIState(prev => ({
        ...prev,
        expanded:
          typeof expanded === 'function' ? expanded(prev.expanded) : expanded,
      }));
    },
    [setItemUIState]
  );

  const setSelectedItems = useCallback(
    (selectedItems: Set<number> | ((prev: Set<number>) => Set<number>)) => {
      setItemUIState(prev => {
        // Ensure prev.selectedItems is always a Set
        const currentSelectedItems =
          prev.selectedItems instanceof Set
            ? prev.selectedItems
            : new Set<number>();

        return {
          ...prev,
          selectedItems:
            typeof selectedItems === 'function'
              ? selectedItems(currentSelectedItems)
              : selectedItems,
        };
      });
    },
    [setItemUIState]
  );

  // Individual setters for username cache
  const setValidatedUsernames = useCallback(
    (
      validatedUsernames: Set<string> | ((prev: Set<string>) => Set<string>)
    ) => {
      setUsernameCache(prev => {
        // Ensure prev.validatedUsernames is always a Set
        const currentValidatedUsernames =
          prev.validatedUsernames instanceof Set
            ? prev.validatedUsernames
            : new Set<string>();

        return {
          ...prev,
          validatedUsernames:
            typeof validatedUsernames === 'function'
              ? validatedUsernames(currentValidatedUsernames)
              : validatedUsernames,
        };
      });
    },
    [setUsernameCache]
  );

  const setInvalidUsernames = useCallback(
    (invalidUsernames: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      setUsernameCache(prev => {
        // Ensure prev.invalidUsernames is always a Set
        const currentInvalidUsernames =
          prev.invalidUsernames instanceof Set
            ? prev.invalidUsernames
            : new Set<string>();

        return {
          ...prev,
          invalidUsernames:
            typeof invalidUsernames === 'function'
              ? invalidUsernames(currentInvalidUsernames)
              : invalidUsernames,
        };
      });
    },
    [setUsernameCache]
  );

  // Individual filter setters for convenience
  const setFilter = useCallback(
    (filter: 'all' | 'issue' | 'pr' | 'comment') => {
      setCurrentFilters(prev => ({ ...prev, filter }));
    },
    [setCurrentFilters]
  );

  const setStatusFilter = useCallback(
    (statusFilter: 'all' | 'open' | 'closed' | 'merged') => {
      setCurrentFilters(prev => ({ ...prev, statusFilter }));
    },
    [setCurrentFilters]
  );

  const setIncludedLabels = useCallback(
    (includedLabels: string[] | ((prev: string[]) => string[])) => {
      setCurrentFilters(prev => ({
        ...prev,
        includedLabels:
          typeof includedLabels === 'function'
            ? includedLabels(prev.includedLabels || [])
            : includedLabels,
      }));
    },
    [setCurrentFilters]
  );

  const setExcludedLabels = useCallback(
    (excludedLabels: string[] | ((prev: string[]) => string[])) => {
      setCurrentFilters(prev => ({
        ...prev,
        excludedLabels:
          typeof excludedLabels === 'function'
            ? excludedLabels(prev.excludedLabels || [])
            : excludedLabels,
      }));
    },
    [setCurrentFilters]
  );

  const setRepoFilters = useCallback(
    (repoFilters: string[] | ((prev: string[]) => string[])) => {
      setCurrentFilters(prev => ({
        ...prev,
        repoFilters:
          typeof repoFilters === 'function'
            ? repoFilters(prev.repoFilters || [])
            : repoFilters,
      }));
    },
    [setCurrentFilters]
  );

  const setSearchText = useCallback(
    (searchText: string) => {
      setCurrentFilters(prev => ({ ...prev, searchText }));
    },
    [setCurrentFilters]
  );

  const setUserFilter = useCallback(
    (userFilter: string | ((prev: string) => string)) => {
      setCurrentFilters(prev => ({
        ...prev,
        userFilter:
          typeof userFilter === 'function'
            ? userFilter(prev.userFilter || '')
            : userFilter,
      }));
    },
    [setCurrentFilters]
  );

  // Extract individual filter values for convenience
  const {
    filter,
    statusFilter,
    includedLabels,
    excludedLabels,
    searchText,
    repoFilters,
    userFilter,
  } = currentFilters;

  // Helper functions for Set operations using the new utilities
  // These functions are created by utility functions and don't need dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const addToValidated = useCallback(createAddToCache(setValidatedUsernames), [
    setValidatedUsernames,
  ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const addToInvalid = useCallback(createAddToCache(setInvalidUsernames), [
    setInvalidUsernames,
  ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const removeFromValidated = useCallback(
    createRemoveFromCache(setValidatedUsernames),
    [setValidatedUsernames]
  );

  // Derived state using new utilities
  const availableLabels = useMemo(() => {
    return extractAvailableLabels(Array.isArray(results) ? results : []);
  }, [results]);

  const filteredResults = useMemo(() => {
    return applyFiltersAndSort(
      Array.isArray(results) ? results : [],
      currentFilters,
      'updated'
    );
  }, [results, currentFilters]);

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

  // Helper function to check if cached results are valid
  const isCacheValid = useCallback(
    (cacheExpiryMs: number = 3600000) => {
      if (!lastSearchParams) return false;

      return (
        lastSearchParams.username === username &&
        lastSearchParams.startDate === startDate &&
        lastSearchParams.endDate === endDate &&
        lastSearchParams.apiMode === apiMode &&
        Date.now() - lastSearchParams.timestamp < cacheExpiryMs
      );
    },
    [lastSearchParams, username, startDate, endDate, apiMode]
  );

  // Helper function to set the appropriate results based on API mode
  const setCurrentResults = useCallback(
    (items: GitHubItem[]) => {
      if (apiMode === 'events') {
        setEventsResults(items);
      } else {
        setSearchResults(items);
      }
    },
    [apiMode, setEventsResults, setSearchResults]
  );

  // Update handleSearch to check cache first
  const handleSearch = useCallback(async () => {
    // Never use cache for repeated searches - if user clicks search again, they want fresh data
    const shouldUseCache = false;

    // Check if we have valid cached results for the current parameters
    if (shouldUseCache) {
      setLoadingProgress(`Using cached results (${results.length} items)`);
      await new Promise(resolve => setTimeout(resolve, 500));
      setLoadingProgress('');



      return;
    }

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

    // Create cache callbacks
    const cacheCallbacks = {
      addToValidated,
      addToInvalid,
      removeFromValidated,
    };

    // Set up progress callback
    const onProgress = (message: string) => {
      setLoadingProgress(message);
    };

    setLoading(true);
    setError(null);

    try {
      const result = await performGitHubSearch(searchParams, cache, {
        onProgress,
        cacheCallbacks,
        requestDelay: 500,
      });

      // Update results and search parameters
      setCurrentResults(result.items);

      // Store raw events if using events API
      if (apiMode === 'events' && result.rawEvents) {
        setRawEventsResults(result.rawEvents);
      }

      setLastSearchParams({
        username,
        startDate,
        endDate,
        apiMode,
        timestamp: Date.now(),
      });

      // Show success message briefly
      setLoadingProgress(`Successfully loaded ${result.totalCount} items!`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clear loading state
      setLoading(false);
      setLoadingProgress('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while fetching data'
      );
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
    addToValidated,
    addToInvalid,
    removeFromValidated,
    setCurrentResults,
    setRawEventsResults,
    setLastSearchParams,
    setLoading,
    setLoadingProgress,
    setError,
    results.length,
  ]);

  // Show initial loading animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-load cached results when switching API modes (if cache is valid)
  useEffect(() => {
    if (isCacheValid() && results.length === 0) {
      // If we have cached results but current results array is empty,
      // it means we switched API modes and should show the cached data immediately
      const cachedResults =
        apiMode === 'events' ? eventsResults : searchResults;
      if (cachedResults.length > 0) {
        setLoadingProgress(`Loaded ${cachedResults.length} cached items`);
        setTimeout(() => setLoadingProgress(''), 1000);
      }
    }
  }, [
    apiMode,
    isCacheValid,
    results.length,
    eventsResults,
    searchResults,
    setLoadingProgress,
  ]);

  // Handle manual spin
  const handleManualSpin = useCallback(() => {
    if (!isManuallySpinning) {
      setIsManuallySpinning(true);
      setTimeout(() => {
        setIsManuallySpinning(false);
      }, 3000);
    }
  }, [isManuallySpinning]);

  // Toggle description visibility
  const toggleDescriptionVisibility = useCallback(
    (id: number) => {
      setDescriptionVisible(prev => ({
        ...prev,
        [id]: !prev[id],
      }));
    },
    [setDescriptionVisible]
  );

  // Toggle expanded state
  const toggleExpand = useCallback(
    (id: number) => {
      setExpanded(prev => ({
        ...prev,
        [id]: !prev[id],
      }));
    },
    [setExpanded]
  );

  // Clear all filters for current mode only (preserves filters for other mode)
  const clearAllFilters = useCallback(() => {
    setCurrentFilters(createDefaultFilter());
  }, [setCurrentFilters]);

  // Clipboard handler
  const copyResultsToClipboard = useCallback(
    async (format: 'detailed' | 'compact') => {
      // Only consider items that are both selected and in the filtered results
      const visibleSelectedItems =
        selectedItems.size > 0
          ? filteredResults.filter(item => selectedItems.has(item.id))
          : filteredResults;

      const result = await copyToClipboard(visibleSelectedItems, {
        isCompactView: format === 'compact',
        onSuccess: (message: string) => {
          setClipboardMessage(message);
          setTimeout(() => setClipboardMessage(null), 3000);
        },
        onError: (error: Error) => {
          setClipboardMessage(`Error: ${error.message}`);
          setTimeout(() => setClipboardMessage(null), 3000);
        },
      });

      return result;
    },
    [filteredResults, selectedItems]
  );

  // Selection handlers
  const toggleItemSelection = useCallback(
    (id: number) => {
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    },
    [setSelectedItems]
  );

  const selectAllItems = useCallback(() => {
    setSelectedItems(new Set(filteredResults.map(item => item.id)));
  }, [filteredResults, setSelectedItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, [setSelectedItems]);

  return (


    <PageLayout sx={{ '--spacing': '0 !important' }}>
      <PageLayout.Header className='border-bottom'>

        <PageHeader role="banner" aria-label="Title">
          <PageHeader.TitleArea>
            <PageHeader.LeadingVisual>
              <SlotMachineLoader
                avatarUrls={(Array.isArray(results) ? results : [])
                  .map(item => item.user.avatar_url)
                  .filter(Boolean)}
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

            </PageHeader.LeadingVisual>
            <PageHeader.Title>Git Vegas</PageHeader.Title>
          </PageHeader.TitleArea>
          <PageHeader.Actions>

            <ShareButton
              formSettings={formSettings}
              uiSettings={uiSettings}
              currentFilters={currentFilters}
              searchText={currentFilters.searchText}
              size="medium"
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

      <PageLayout.Content sx={{ px: 3, py: 4 }}>
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
          }}
        >
          <ResultsContext.Provider
            value={{
              results,
              filteredResults,
              filter,
              statusFilter,
              includedLabels: includedLabels || [],
              excludedLabels: excludedLabels || [],
              searchText,
              repoFilters: repoFilters || [],
              userFilter: userFilter || '',
              availableLabels,
              setFilter,
              setStatusFilter,
              setIncludedLabels,
              setExcludedLabels,
              setSearchText,
              toggleDescriptionVisibility,
              toggleExpand,
              copyResultsToClipboard,
              descriptionVisible,
              expanded,
              clipboardMessage,
              clearAllFilters,
              isCompactView,
              setIsCompactView,
              selectedItems,
              toggleItemSelection,
              selectAllItems,
              clearSelection,
              setRepoFilters,
              setUserFilter,
            }}
          >
            <SearchForm />
            {apiMode === 'events' ? (
              <TimelineView
                items={results}
                rawEvents={rawEventsResults}
                viewMode={timelineViewMode}
                setViewMode={setTimelineViewMode}
              />
            ) : (
              <ResultsList
                useResultsContext={useResultsContext}
                countItemsMatchingFilter={countItemsMatchingFilter}
                buttonStyles={buttonStyles}
              />
            )}
            <SettingsDialog
              isOpen={isSettingsOpen}
              onDismiss={() => setIsSettingsOpen(false)}
            />
          </ResultsContext.Provider>
        </FormContext.Provider>
      </PageLayout.Content>

      <PageLayout.Footer
        padding="condensed"
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1,
            minHeight: '40px',
          }}
        >

          {/* Right side: Loading Message */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <OfflineBanner />
            {((loading || initialLoading) || (loadingProgress && loadingProgress.includes('cached'))) && loadingProgress && (
              <Box
                sx={{
                  px: 3,
                  py: 1,
                  bg: 'attention.subtle',
                  color: 'attention.fg',
                  borderRadius: 2,
                  fontSize: 1,
                  fontWeight: 'medium',
                }}
              >
                {loadingProgress}
              </Box>
            )}
          </Box>
        </Box>
      </PageLayout.Footer>
    </PageLayout>

  );
}

export default App;
