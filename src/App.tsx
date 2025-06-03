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
import { validateGitHubUsernames, isValidDateString, getParamFromUrl, updateUrlParams, validateUsernameList, type BatchValidationResult } from './utils';
import { copyResultsToClipboard as copyToClipboard } from './utils/clipboard';
import { countItemsMatchingFilter } from './utils/filterUtils';
import { createAddToCache, createRemoveFromCache, categorizeUsernames, getInvalidUsernames } from './utils/usernameCache';
import { extractAvailableLabels, applyFiltersAndSort, createDefaultFilter, ResultsFilter } from './utils/resultsUtils';

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
  const [lastSearchParams, setLastSearchParams] = useLocalStorage<{
    username: string;
    startDate: string;
    endDate: string;
    timestamp: number;
  } | null>('github-last-search', null);

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

  // Update handleSearch to validate before submission
  const handleSearch = useCallback(async () => {
    if (!username) {
      setError('Please enter a GitHub username');
      return;
    }
    
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
      setError('Invalid date format. Please use YYYY-MM-DD');
      return;
    }

    // First, validate the username format and list
    const validation = validateUsernameList(username);
    
    if (validation.errors.length > 0) {
      setError(validation.errors.join('\n'));
      return;
    }

    const usernames = validation.usernames;

    // Use the new username cache utilities
    const alreadyInvalidUsernames = getInvalidUsernames(usernames, invalidUsernames);
    
    // If any usernames are known to be invalid, show error and don't proceed
    if (alreadyInvalidUsernames.length > 0) {
      setError(`Invalid GitHub username${alreadyInvalidUsernames.length > 1 ? 's' : ''}: ${alreadyInvalidUsernames.join(', ')}`);
      return;
    }

    // Check which usernames need validation
    const { needValidation } = categorizeUsernames(usernames, validatedUsernames, invalidUsernames);

    // Only validate usernames that haven't been validated yet
    if (needValidation.length > 0) {
      setError('Validating usernames...');
      
      try {
        const result: BatchValidationResult = await validateGitHubUsernames(needValidation, githubToken);
        
        // Update validated usernames
        if (result.valid.length > 0) {
          addToValidated(result.valid);
        }
        
        // Update invalid usernames
        if (result.invalid.length > 0) {
          addToInvalid(result.invalid);
          
          // Show detailed error messages and don't proceed
          const detailedErrors = result.invalid.map(username => {
            const errorMsg = result.errors[username] || 'Invalid username';
            return `${username}: ${errorMsg}`;
          });
          setError(`Validation failed:\n${detailedErrors.join('\n')}`);
          return;
        }
      } catch (err) {
        setError('Error validating usernames. Please try again.');
        return;
      }
    }

    // At this point, all usernames are valid, proceed with search
    setError(null);

    // Check if we have cached results for the exact same search
    const currentParams = {
      username,
      startDate,
      endDate,
      timestamp: Date.now()
    };

    // If the search parameters are exactly the same and less than 1 hour old,
    // use the cached results
    if (lastSearchParams && 
        lastSearchParams.username === username &&
        lastSearchParams.startDate === startDate &&
        lastSearchParams.endDate === endDate &&
        Date.now() - lastSearchParams.timestamp < 3600000) { // 1 hour in milliseconds
      return;
    }

    setLoading(true);
    setLoadingProgress('Starting search...');

    try {
      const allResults: GitHubItem[] = [];
      
      for (const user of usernames) {
        setLoadingProgress(`Fetching data for ${user}...`);
        
        const headers: HeadersInit = {
          'Accept': 'application/vnd.github.v3+json'
        };
        
        if (githubToken) {
          headers['Authorization'] = `token ${githubToken}`;
        }
        
        const response = await fetch(
          `https://api.github.com/search/issues?q=author:${user}+created:${startDate}..${endDate}&per_page=100`,
          { headers }
        );
        
        if (!response.ok) {
          // If a previously validated username now fails, remove it from cache
          if (response.status === 404 && validatedUsernames.has(user)) {
            removeFromValidated(user);
            addToInvalid([user]);
          }
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        allResults.push(...data.items);

        // Update progress
        setLoadingProgress(`Found ${data.items.length} items for ${user}`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for visual feedback
      }

      // Update results and search parameters
      setResults(allResults);
      setLastSearchParams(currentParams);
      
      // Show success message briefly
      setLoadingProgress(`Successfully loaded ${allResults.length} items!`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear loading state
      setLoading(false);
      setLoadingProgress('');

      // Update URL params
      updateUrlParams({
        username,
        startDate,
        endDate
      });
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
    setLastSearchParams,
    lastSearchParams
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
