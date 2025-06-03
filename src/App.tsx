import { useState, useCallback, useContext, createContext, useEffect, useMemo } from 'react';
import { Box, Button, Heading, IconButton, PageLayout } from '@primer/react';
import { GearIcon } from '@primer/octicons-react';
import './App.css';
import { SlotMachineLoader } from './components/SlotMachineLoader';
import SearchForm from './components/SearchForm';
import SettingsDialog from './components/SettingsDialog';
import ResultsList from './components/ResultsList';
import { GitHubItem, FormContextType, ResultsContextType } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { getParamFromUrl, validateUsernameList } from './utils';
import { copyResultsToClipboard as copyToClipboard } from './utils/clipboard';
import { countItemsMatchingFilter } from './utils/filterUtils';
import { createAddToCache, createRemoveFromCache } from './utils/usernameCache';
import { extractAvailableLabels, applyFiltersAndSort, createDefaultFilter, ResultsFilter } from './utils/resultsUtils';
import { performGitHubSearch, GitHubSearchParams, UsernameCache } from './utils/githubSearch';

// Form Context to isolate form state changes
const FormContext = createContext<FormContextType | null>(null);

export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormContextProvider');
  }
  return context;
}

// Results Context to isolate results state changes
const ResultsContext = createContext<ResultsContextType | null>(null);

export function useResultsContext() {
  const context = useContext(ResultsContext);
  if (!context) {
    throw new Error('useResultsContext must be used within a ResultsContextProvider');
  }
  return context;
}

// Update button styles to be consistent
export const buttonStyles = {
  height: 28,
  minWidth: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2
};

// Add the main App component
function App() {
  // State declarations
  const [validatedUsernames, setValidatedUsernames] = useLocalStorage<Set<string>>('validated-github-usernames', new Set());
  const [invalidUsernames, setInvalidUsernames] = useLocalStorage<Set<string>>('invalid-github-usernames', new Set());
  const [username, setUsername] = useLocalStorage('github-username', '');
  const [startDate, setStartDate] = useLocalStorage('github-start-date', (() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to last 30 days
    return date.toISOString().split('T')[0];
  })());
  const [endDate, setEndDate] = useLocalStorage('github-end-date', new Date().toISOString().split('T')[0]);
  const [githubToken, setGithubToken] = useLocalStorage('github-token', '');
  const [isCompactView, setIsCompactView] = useLocalStorage('github-compact-view', false);
  const [filter, setFilter] = useLocalStorage<'all' | 'issue' | 'pr'>('github-filter', 'all');
  const [statusFilter, setStatusFilter] = useLocalStorage<'all' | 'open' | 'closed' | 'merged'>('github-status-filter', 'all');
  const [sortOrder, setSortOrder] = useLocalStorage<'updated' | 'created'>('github-sort-order', 'updated');
  const [labelFilter, setLabelFilter] = useLocalStorage('github-label-filter', '');
  const [excludedLabels, setExcludedLabels] = useLocalStorage<string[]>('github-excluded-labels', []);
  const [searchText, setSearchText] = useLocalStorage('github-search-text', '');
  const [repoFilters, setRepoFilters] = useLocalStorage<string[]>('github-repo-filters', []);
  const [descriptionVisible, setDescriptionVisible] = useLocalStorage<{[id: number]: boolean}>('github-description-visible', {});
  const [expanded, setExpanded] = useLocalStorage<{[id: number]: boolean}>('github-expanded', {});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isManuallySpinning, setIsManuallySpinning] = useState(false);
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);
  const [results, setResults] = useLocalStorage<GitHubItem[]>('github-search-results', []);

  // Helper functions for Set operations using the new utilities
  const addToValidated = useCallback(createAddToCache(setValidatedUsernames), [setValidatedUsernames]);
  const addToInvalid = useCallback(createAddToCache(setInvalidUsernames), [setInvalidUsernames]);
  const removeFromValidated = useCallback(createRemoveFromCache(setValidatedUsernames), [setValidatedUsernames]);

  // Derived state using new utilities
  const availableLabels = useMemo(() => {
    return extractAvailableLabels(Array.isArray(results) ? results : []);
  }, [results]);

  const currentFilters: ResultsFilter = useMemo(() => ({
    filter,
    statusFilter,
    labelFilter,
    excludedLabels,
    repoFilters,
    searchText,
    sortOrder
  }), [filter, statusFilter, labelFilter, excludedLabels, repoFilters, searchText, sortOrder]);

  const filteredResults = useMemo(() => {
    return applyFiltersAndSort(Array.isArray(results) ? results : [], currentFilters);
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

  // Update handleSearch to always trigger new requests (no caching on button click)
  const handleSearch = useCallback(async () => {
    // Create search parameters
    const searchParams: GitHubSearchParams = {
      username,
      startDate,
      endDate,
      githubToken
    };

    // Create username cache object
    const cache: UsernameCache = {
      validatedUsernames,
      invalidUsernames
    };

    // Create cache callbacks
    const cacheCallbacks = {
      addToValidated,
      addToInvalid,
      removeFromValidated
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
        updateUrl: true,
        requestDelay: 500
      });

      // Update results and search parameters
      setResults(result.items);
      
      // Show success message briefly
      setLoadingProgress(`Successfully loaded ${result.totalCount} items!`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear loading state
      setLoading(false);
      setLoadingProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
      setLoading(false);
      setLoadingProgress('');
    }
  }, [
    username,
    startDate,
    endDate,
    githubToken,
    validatedUsernames,
    invalidUsernames,
    addToValidated,
    addToInvalid,
    removeFromValidated,
    setResults,
    setLoading,
    setLoadingProgress,
    setError
  ]);

  // Effect to populate form fields from URL parameters on mount (but don't auto-search)
  useEffect(() => {
    const urlUsername = getParamFromUrl('username');
    const urlStartDate = getParamFromUrl('startDate');
    const urlEndDate = getParamFromUrl('endDate');

    // If we have URL parameters, populate form values
    if (urlUsername && urlStartDate && urlEndDate) {
      setUsername(urlUsername);
      setStartDate(urlStartDate);
      setEndDate(urlEndDate);
    }
  }, []); // Only run once on mount

  // Show initial loading animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

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
  const toggleDescriptionVisibility = useCallback((id: number) => {
    setDescriptionVisible(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, [setDescriptionVisible]);

  // Toggle expanded state
  const toggleExpand = useCallback((id: number) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, [setExpanded]);

  // Clear all filters using new utilities
  const clearAllFilters = useCallback(() => {
    const defaultFilter = createDefaultFilter();
    setFilter(defaultFilter.filter);
    setStatusFilter(defaultFilter.statusFilter);
    setSortOrder(defaultFilter.sortOrder);
    setLabelFilter(defaultFilter.labelFilter);
    setExcludedLabels(defaultFilter.excludedLabels);
    setSearchText(defaultFilter.searchText);
    setRepoFilters(defaultFilter.repoFilters);
  }, [setFilter, setStatusFilter, setSortOrder, setLabelFilter, setExcludedLabels, setSearchText, setRepoFilters]);

  // Clipboard handler
  const copyResultsToClipboard = useCallback(async () => {
    const result = await copyToClipboard(filteredResults, {
      isCompactView,
      onSuccess: (message: string) => {
        setClipboardMessage(message);
        setTimeout(() => setClipboardMessage(null), 3000);
      },
      onError: (error: Error) => {
        setClipboardMessage(`Error: ${error.message}`);
        setTimeout(() => setClipboardMessage(null), 3000);
      }
    });
    
    return result;
  }, [filteredResults, isCompactView]);

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bg: 'canvas.default',
      color: 'fg.default'
    }}>
      <PageLayout sx={{ '--spacing': '0 !important' }}>
        <PageLayout.Header sx={{ p: 0 }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderColor: 'border.default',
            borderBottom: '1px solid',
            height: '56px',
            position: 'relative'
          }}>
            <Box sx={{ pl: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Heading sx={{ fontSize: 3, m: 0 }}>🎰 Git Vegas</Heading>
            </Box>
            
            {/* Center slot machine */}
            <Box sx={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'column',
              gap: 1
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SlotMachineLoader 
                  avatarUrls={(Array.isArray(results) ? results : [])
                    .map(item => item.user.avatar_url)
                    .filter(Boolean)
                  }
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
                    opacity: (isManuallySpinning || loading || initialLoading) ? 0.5 : 1,
                    '&:hover:not(:disabled)': { 
                      color: 'accent.fg',
                      transform: 'scale(1.1)',
                      transition: 'transform 0.2s ease-in-out'
                    },
                    '&:disabled': {
                      cursor: 'not-allowed'
                    },
                    '&:focus': {
                      outline: 'none',
                      boxShadow: 'none'
                    },
                    cursor: 'pointer',
                    fontSize: '12px',
                    lineHeight: 1,
                    height: 'auto',
                    minWidth: 'auto'
                  }}
                >
                  🕹️
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, pr: 3 }}>
              <IconButton
                icon={GearIcon}
                aria-label="Settings"
                onClick={() => setIsSettingsOpen(true)}
                variant="invisible"
                sx={{
                  color: 'fg.default',
                  '&:hover': { color: 'accent.fg' }
                }}
              />
            </Box>
          </Box>
        </PageLayout.Header>

        <PageLayout.Content sx={{ px: 3, py: 4 }}>
          <FormContext.Provider value={{
            username,
            startDate,
            endDate,
            githubToken,
            setUsername,
            setStartDate,
            setEndDate,
            setGithubToken,
            handleSearch,
            handleUsernameBlur,
            validateUsernameFormat,
            loading,
            loadingProgress,
            error
          }}>
            <ResultsContext.Provider value={{
              results,
              filteredResults,
              filter,
              statusFilter,
              sortOrder,
              labelFilter,
              excludedLabels,
              searchText,
              repoFilters,
              availableLabels,
              setFilter,
              setStatusFilter,
              setSortOrder,
              setLabelFilter,
              setExcludedLabels,
              toggleDescriptionVisibility,
              toggleExpand,
              copyResultsToClipboard,
              descriptionVisible,
              expanded,
              clipboardMessage,
              clearAllFilters,
              isCompactView,
              setIsCompactView
            }}>
              <SearchForm />
              <ResultsList 
                useResultsContext={useResultsContext}
                countItemsMatchingFilter={countItemsMatchingFilter}
                buttonStyles={buttonStyles}
              />
              <SettingsDialog 
                isOpen={isSettingsOpen}
                onDismiss={() => setIsSettingsOpen(false)}
              />
            </ResultsContext.Provider>
          </FormContext.Provider>
        </PageLayout.Content>
      </PageLayout>
    </Box>
  );
}

export default App;
