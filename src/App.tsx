import { useState, useEffect, useCallback, createContext, useContext, memo, useMemo } from 'react';
import type { FormEvent } from 'react';
import './App.css';
import {
  TextInput,
  Button,
  Box,
  Text,
  Link,
  Label,
  PageLayout,
  Flash,
  Spinner,
  FormControl,
  ButtonGroup,
  Avatar,
  BranchName,
  Heading,
  Stack,
  Dialog,
  IconButton
} from '@primer/react';
import {
  IssueOpenedIcon,
  GitPullRequestIcon,
  CheckIcon,
  XIcon,
  GitMergeIcon,
  GearIcon
} from '@primer/octicons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Add a simple debounce function
const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

// Helper function to determine the optimal text color for a given background
const getContrastColor = (hexColor: string): string => {
  // Convert Hex to RGB
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);
  
  // YIQ formula to calculate brightness (standard for accessibility)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Return black or white based on brightness
  return yiq >= 128 ? '#000' : '#fff';
};

// Helper function to safely parse a date string
const isValidDateString = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  // Check for YYYY-MM-DD format
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateFormatRegex.test(dateStr)) return false;
  
  // Check if it's a valid date
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

// Helper functions for URL params
const getParamFromUrl = (param: string): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
};

const updateUrlParams = (params: Record<string, string | null>): void => {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  window.history.replaceState({}, '', url.toString());
};

interface GitHubItem {
  id: number;
  html_url: string;
  title: string;
  pull_request?: {
    merged_at?: string;  // Zeitpunkt, an dem der PR gemerged wurde
    url?: string;        // URL des PRs für weitere API-Anfragen
  };
  created_at: string;
  updated_at: string;
  state: string;
  body?: string; // Added body field
  labels?: { name: string; color?: string; description?: string }[];
  repository_url?: string;
  repository?: { full_name: string; html_url: string };
  merged?: boolean;      // Ob der PR gemerged wurde
  merged_at?: string;    // Zeitpunkt, an dem der PR gemerged wurde (auf oberster Ebene)
  closed_at?: string;    // Zeitpunkt, an dem der Issue/PR geschlossen wurde
  number?: number; // Added for PR number reference
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

// Form Context to isolate form state changes
interface FormContextType {
  username: string;
  startDate: string;
  endDate: string;
  githubToken: string;  // Add token
  setUsername: (value: string) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setGithubToken: (value: string) => void;  // Add token setter
  handleSearch: () => void;
  loading: boolean;
  loadingProgress: string;
  error: string | null;
}

const FormContext = createContext<FormContextType | null>(null);

function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormContextProvider');
  }
  return context;
}

// Results Context to isolate results state changes
interface ResultsContextType {
  results: GitHubItem[];
  filteredResults: GitHubItem[];
  filter: 'all' | 'issue' | 'pr';
  statusFilter: 'all' | 'open' | 'closed' | 'merged';
  sortOrder: 'updated' | 'created';
  labelFilter: string;
  excludedLabels: string[];
  searchText: string;
  repoFilters: string[];
  availableLabels: string[];
  setFilter: (filter: 'all' | 'issue' | 'pr') => void;
  setStatusFilter: (status: 'all' | 'open' | 'closed' | 'merged') => void;
  setSortOrder: (sort: 'updated' | 'created') => void;
  setLabelFilter: (filter: string) => void;
  setExcludedLabels: React.Dispatch<React.SetStateAction<string[]>>;
  toggleDescriptionVisibility: (id: number) => void;
  toggleExpand: (id: number) => void;
  copyResultsToClipboard: (format?: 'markdown' | 'html') => void;
  descriptionVisible: { [id: number]: boolean };
  expanded: { [id: number]: boolean };
  clipboardMessage: string | null;
  clearAllFilters: () => void;
  isCompactView: boolean;
  setIsCompactView: React.Dispatch<React.SetStateAction<boolean>>;
}

const ResultsContext = createContext<ResultsContextType | null>(null);

function useResultsContext() {
  const context = useContext(ResultsContext);
  if (!context) {
    throw new Error('useResultsContext must be used within a ResultsContextProvider');
  }
  return context;
}

// Add type for code component props
interface CodeComponentProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
}

// Update button styles to be consistent
const buttonStyles = {
  height: 28,
  minWidth: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2
};

// Component for the search form, wrapped in memo to prevent unnecessary re-renders
const SearchForm = memo(function SearchForm() {
  const { 
    username, setUsername, 
    startDate, setStartDate, 
    endDate, setEndDate,
    handleSearch, 
    loading, 
    loadingProgress,
    error 
  } = useFormContext();

  const debouncedSaveToLocalStorage = useCallback(
    debounce((key: string, value: string) => {
      localStorage.setItem(key, value);
    }, 500),
    []
  );

  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    setUsername(newUsername);
    debouncedSaveToLocalStorage('github-username', newUsername);
  }, [debouncedSaveToLocalStorage, setUsername]);

  return (
    <Box sx={{maxWidth: '1200px', margin: '0 auto'}}>
      <Box as="form" 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }} 
        onSubmit={(e: FormEvent<HTMLFormElement>) => { 
          e.preventDefault(); 
          handleSearch(); 
        }}
      >
        {/* Main search fields in a horizontal layout */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 3fr) repeat(2, minmax(150px, 1fr)) auto',
          gap: 3,
          alignItems: 'flex-start'
        }}>
          <Box>
            <FormControl>
              <TextInput
                placeholder="Enter usernames (comma-separated for multiple)"
                value={username}
                onChange={handleUsernameChange}
                aria-required="true"
                block
                required
              />
            </FormControl>
          </Box>
          
          <FormControl>
            <TextInput
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-required="true"
              block
              required
            />
          </FormControl>
          
          <FormControl>
            <TextInput
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-required="true"
              block
              required
            />
          </FormControl>

          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={loading}
              sx={{ 
                minWidth: '120px',
                height: '32px'
              }}
            >
              {loading ? <Spinner size="small" /> : 'Search'}
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Flash variant="danger" sx={{marginTop: 3}}>
          {error}
        </Flash>
      )}

      {loading && loadingProgress && (
        <Flash variant="default" sx={{marginTop: 3}}>
          {loadingProgress}
        </Flash>
      )}
    </Box>
  );
});

// Update countItemsMatchingFilter to remove dateRange parameter
const countItemsMatchingFilter = (
  items: GitHubItem[], 
  filterType: string, 
  filterValue: string, 
  excludedLabels: string[]
): number => {
  switch (filterType) {
    case 'type':
      return items.filter(item => 
        filterValue === 'all' ? true :
        filterValue === 'pr' ? !!item.pull_request :
        !item.pull_request
      ).length;
    case 'status':
      if (filterValue === 'merged') {
        return items.filter(item => 
          item.pull_request && (item.pull_request.merged_at || item.merged)
        ).length;
      }
      return items.filter(item => {
        if (filterValue === 'all') return true;
        if (item.pull_request) {
          if (item.pull_request.merged_at || item.merged) return false;
          return item.state === filterValue;
        }
        return item.state === filterValue;
      }).length;
    case 'label':
      return items.filter(item => 
        item.labels?.some(l => l.name === filterValue) &&
        !item.labels?.some(l => excludedLabels.includes(l.name))
      ).length;
    case 'repo':
      return items.filter(item => 
        item.repository_url?.replace('https://api.github.com/repos/', '') === filterValue
      ).length;
    default:
      return 0;
  }
};

// Update ResultsList to pass date range to countItemsMatchingFilter
const ResultsList = memo(function ResultsList() {
  const {
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
  } = useResultsContext();

  // Add state for filter collapse
  const [areFiltersCollapsed, setAreFiltersCollapsed] = useState(false);

  // Helper to check if any filters are active
  const hasActiveFilters = filter !== 'all' || 
    statusFilter !== 'all' || 
    sortOrder !== 'updated' || 
    labelFilter !== '' || 
    searchText !== '' || 
    repoFilters.length > 0 ||
    excludedLabels.length > 0;

  // Function to generate filter summary text
  const getFilterSummary = () => {
    const summaryParts = [];

    if (filter !== 'all') {
      summaryParts.push(`Type: ${filter === 'pr' ? 'PRs' : 'Issues'}`);
    }
    if (statusFilter !== 'all') {
      summaryParts.push(`Status: ${statusFilter}`);
    }
    if (labelFilter) {
      summaryParts.push(`Label: ${labelFilter}`);
    }
    if (excludedLabels.length > 0) {
      summaryParts.push(`Excluded labels: ${excludedLabels.join(', ')}`);
    }
    if (searchText) {
      summaryParts.push(`Search: "${searchText}"`);
    }
    if (repoFilters.length > 0) {
      summaryParts.push(`Repos: ${repoFilters.join(', ')}`);
    }

    return summaryParts.join(' | ');
  };

  // Get base results for counting (before text search filter)
  const baseResults = useMemo(() => {
    return filteredResults.filter(item => {
      // Apply only the other active filters, not the current one being counted
      const labelMatch = labelFilter ? item.labels?.some(l => l.name === labelFilter) : true;
      const excludeMatch = excludedLabels.length === 0 ? true : 
        !item.labels?.some(l => excludedLabels.includes(l.name));
      const repoMatch = repoFilters.length === 0 ? true : (
        item.repository_url && repoFilters.includes(
          item.repository_url.replace('https://api.github.com/repos/', '')
        )
      );
      return labelMatch && excludeMatch && repoMatch;
    });
  }, [filteredResults, labelFilter, excludedLabels, repoFilters]);

  return (
    <Box>
      {/* Filters Section */}
      <Box sx={{
        maxWidth: '1200px',
        margin: '16px auto',
        bg: 'canvas.subtle',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'border.default',
        overflow: 'hidden'
      }}>
        {/* Filters header */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          p: 2,
          bg: 'canvas.default',
          borderBottom: '1px solid',
          borderColor: 'border.default'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Heading as="h2" sx={{fontSize: 2, fontWeight: 'semibold', color: 'fg.default', m: 0}}>
              Filters
            </Heading>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {hasActiveFilters && (
              <Button
                variant="danger"
                size="small"
                onClick={clearAllFilters}
                sx={buttonStyles}
              >
                Clear All
              </Button>
            )}
            <Button
              variant="invisible"
              size="small"
              onClick={() => setAreFiltersCollapsed(!areFiltersCollapsed)}
              sx={{ 
                ...buttonStyles,
                color: 'fg.muted', 
                ':hover': { color: 'fg.default' }
              }}
            >
              {areFiltersCollapsed ? 'Show' : 'Hide'}
            </Button>
          </Box>
        </Box>

        {/* Filter Summary when collapsed */}
        {areFiltersCollapsed && hasActiveFilters && (
          <Box sx={{
            p: 2,
            bg: 'canvas.subtle',
            borderBottom: '1px solid',
            borderColor: 'border.default'
          }}>
            <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
              {getFilterSummary()}
            </Text>
          </Box>
        )}

        {/* Filter UI */}
        {!areFiltersCollapsed && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 3
            }}>
              {/* Type Filter UI */}
              <Stack sx={{ gap: 1 }}>
                <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'semibold', color: 'fg.muted' }}>
                  Type
                </Heading>
                <ButtonGroup>
                  <Button
                    variant={filter === 'issue' ? 'primary' : 'default'} 
                    onClick={() => setFilter(filter === 'issue' ? 'all' : 'issue')}
                    size="small"
                    sx={buttonStyles}
                  >
                    Issues ({countItemsMatchingFilter(baseResults, 'type', 'issue', excludedLabels)})
                  </Button>
                  <Button
                    variant={filter === 'pr' ? 'primary' : 'default'} 
                    onClick={() => setFilter(filter === 'pr' ? 'all' : 'pr')}
                    size="small"
                    sx={buttonStyles}
                  >
                    PRs ({countItemsMatchingFilter(baseResults, 'type', 'pr', excludedLabels)})
                  </Button>
                </ButtonGroup>
              </Stack>

              {/* Status Filter UI */}
              <Stack sx={{ gap: 1 }}>
                <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'semibold', color: 'fg.muted' }}>
                  Status
                </Heading>
                <ButtonGroup>
                  <Button 
                    variant={statusFilter === 'open' ? 'primary' : 'default'} 
                    onClick={() => setStatusFilter(statusFilter === 'open' ? 'all' : 'open')}
                    size="small"
                    sx={buttonStyles}
                  >
                    Open ({countItemsMatchingFilter(baseResults, 'status', 'open', excludedLabels)})
                  </Button>
                  <Button 
                    variant={statusFilter === 'closed' ? 'primary' : 'default'} 
                    onClick={() => setStatusFilter(statusFilter === 'closed' ? 'all' : 'closed')}
                    size="small"
                    sx={buttonStyles}
                  >
                    Closed ({countItemsMatchingFilter(baseResults, 'status', 'closed', excludedLabels)})
                  </Button>
                  <Button 
                    variant={statusFilter === 'merged' ? 'primary' : 'default'} 
                    onClick={() => setStatusFilter(statusFilter === 'merged' ? 'all' : 'merged')}
                    size="small"
                    sx={buttonStyles}
                  >
                    Merged ({countItemsMatchingFilter(baseResults, 'status', 'merged', excludedLabels)})
                  </Button>
                </ButtonGroup>
              </Stack>
            </Box>

            {/* Label Filters */}
            {availableLabels.length > 0 && (
              <Box sx={{ mt: 3 }}>
                {/* Inclusive Label Filter */}
                <Stack sx={{ gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'semibold', color: 'success.fg' }}>
                      Labels (include)
                    </Heading>
                    <Text as="span" sx={{fontSize: 0, color: 'fg.muted', fontWeight: 'normal'}}>
                      show items with selected label
                    </Text>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    {availableLabels
                      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                      .map(label => {
                        const currentCount = countItemsMatchingFilter(baseResults, 'label', label, excludedLabels);
                        const potentialCount = countItemsMatchingFilter(results, 'label', label, excludedLabels);
                        const hasMatches = currentCount > 0;
                        const hasPotentialMatches = potentialCount > 0;
                        
                        return (
                          <Button
                            key={label}
                            size="small"
                            variant={labelFilter === label ? 'primary' : 'default'}
                            onClick={() => setLabelFilter(labelFilter === label ? '' : label)}
                            sx={{
                              color: hasMatches ? 'fg.default' : 'fg.muted',
                              opacity: (!hasMatches || excludedLabels.includes(label)) ? 0.5 : 1,
                              cursor: (!hasPotentialMatches || excludedLabels.includes(label)) ? 'not-allowed' : 'pointer',
                              textDecoration: !hasMatches && hasPotentialMatches ? 'line-through' : 'none',
                              fontSize: 0,
                              py: 0,
                              height: '24px'
                            }}
                            disabled={!hasPotentialMatches || excludedLabels.includes(label)}
                            title={!hasMatches && hasPotentialMatches ? 'No matches with current filters' : ''}
                          >
                            {label} ({currentCount}{currentCount !== potentialCount ? ` / ${potentialCount}` : ''})
                          </Button>
                        );
                      })}
                  </Box>
                </Stack>

                {/* Exclusive Label Filter */}
                <Stack sx={{ mt: 2, gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'semibold', color: 'danger.fg' }}>
                      Labels (exclude)
                    </Heading>
                    <Text as="span" sx={{fontSize: 0, color: 'fg.muted', fontWeight: 'normal'}}>
                      hide items with selected labels
                    </Text>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    {availableLabels
                      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                      .map(label => {
                        const currentCount = countItemsMatchingFilter(baseResults, 'label', label, excludedLabels);
                        const potentialCount = countItemsMatchingFilter(results, 'label', label, []);
                        const hasMatches = currentCount > 0;
                        const hasPotentialMatches = potentialCount > 0;

                        return (
                          <Button
                            key={label}
                            size="small"
                            variant={excludedLabels.includes(label) ? 'danger' : 'default'}
                            onClick={() => {
                              if (excludedLabels.includes(label)) {
                                setExcludedLabels(prev => prev.filter(l => l !== label));
                              } else {
                                setExcludedLabels(prev => [...prev, label]);
                                if (labelFilter === label) {
                                  setLabelFilter('');
                                }
                              }
                            }}
                            sx={{
                              opacity: (!hasMatches || labelFilter === label) ? 0.5 : 1,
                              cursor: (!hasPotentialMatches || labelFilter === label) ? 'not-allowed' : 'pointer',
                              textDecoration: !hasMatches && hasPotentialMatches ? 'line-through' : 'none',
                              fontSize: 0,
                              py: 0,
                              height: '24px'
                            }}
                            disabled={!hasPotentialMatches || labelFilter === label}
                            title={!hasMatches && hasPotentialMatches ? 'No matches with current filters' : ''}
                          >
                            {label} ({currentCount}{currentCount !== potentialCount ? ` / ${potentialCount}` : ''})
                          </Button>
                        );
                      })}
                  </Box>
                </Stack>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Results Section */}
      {filteredResults.length > 0 && (
        <Box sx={{
          maxWidth: '1200px',
          margin: '24px auto',
          bg: 'canvas.default',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'border.default',
          p: 3
        }}>
          {/* Results header */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            pb: 3,
            borderBottom: '1px solid',
            borderColor: 'border.muted'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Heading as="h2" sx={{fontSize: 3, fontWeight: 'semibold', color: 'fg.default', m: 0}}>Results</Heading>
              {clipboardMessage && (
                <Flash variant="success" sx={{ py: 1, px: 2 }}>
                  {clipboardMessage}
                </Flash>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Text sx={{ fontSize: 1, color: 'fg.muted' }}>View:</Text>
              <ButtonGroup>
                <Button
                  size="small"
                  variant={!isCompactView ? 'primary' : 'default'}
                  onClick={() => setIsCompactView(false)}
                  sx={buttonStyles}
                >
                  Detailed
                </Button>
                <Button
                  size="small"
                  variant={isCompactView ? 'primary' : 'default'}
                  onClick={() => setIsCompactView(true)}
                  sx={buttonStyles}
                >
                  Compact
                </Button>
              </ButtonGroup>
            </Box>
          </Box>

          {/* Actions toolbar */}
          <Box sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            bg: 'canvas.subtle',
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'border.default'
          }}>
            <Text sx={{ fontSize: 1, color: 'fg.muted', mr: 1 }}>Sort by:</Text>
            <ButtonGroup>
              <Button 
                variant={sortOrder === 'updated' ? 'primary' : 'default'} 
                onClick={() => setSortOrder(sortOrder === 'updated' ? 'created' : 'updated')}
                size="small"
                sx={buttonStyles}
              >
                Last Updated
              </Button>
              <Button 
                variant={sortOrder === 'created' ? 'primary' : 'default'} 
                onClick={() => setSortOrder(sortOrder === 'created' ? 'updated' : 'created')}
                size="small"
                sx={buttonStyles}
              >
                Creation Date
              </Button>
            </ButtonGroup>

            <Box sx={{ width: 1, borderRight: '1px solid', borderColor: 'border.muted' }} />

            <Button 
              onClick={() => copyResultsToClipboard(isCompactView ? 'html' : 'markdown')}
              variant="default"
              size="small"
              sx={{ 
                ...buttonStyles,
                fontSize: 1,
                borderColor: 'border.default'
              }}
            >
              Export to Clipboard
            </Button>
          </Box>

          {/* Results List */}
          {isCompactView ? (
            <Box as="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {filteredResults.map((item) => (
                <Box 
                  as="li" 
                  key={item.id} 
                  sx={{ 
                    borderBottom: '1px solid',
                    borderColor: 'border.muted',
                    py: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <Avatar src={item.user.avatar_url} alt={`${item.user.login}'s avatar`} size={20} />
                  <Link
                    href={item.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: 'accent.fg',
                      textDecoration: 'none',
                      ':hover': { textDecoration: 'underline' },
                      flex: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {item.pull_request ? (
                        (item.pull_request.merged_at || item.merged) ? (
                          <Box 
                            as="span"
                            aria-label="Merged Pull Request"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              color: 'done.fg'
                            }}
                          >
                            <GitMergeIcon size={16} />
                            <Text sx={{ ml: 1 }}>Merged</Text>
                          </Box>
                        ) : item.state === 'closed' ? (
                          <Box 
                            as="span"
                            aria-label="Closed Pull Request"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              color: 'closed.fg'
                            }}
                          >
                            <GitPullRequestIcon size={16} />
                            <Text sx={{ ml: 1 }}>Closed</Text>
                          </Box>
                        ) : (
                          <Box 
                            as="span"
                            aria-label="Open Pull Request"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              color: 'open.fg'
                            }}
                          >
                            <GitPullRequestIcon size={16} />
                            <Text sx={{ ml: 1 }}>Open</Text>
                          </Box>
                        )
                      ) : (
                        <Box 
                          as="span"
                          aria-label={`${item.state === 'closed' ? 'Closed' : 'Open'} Issue`}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: item.state === 'closed' ? 'closed.fg' : 'open.fg'
                          }}
                        >
                          <IssueOpenedIcon size={16} />
                          {item.state === 'closed' && (
                            <Box sx={{ display: 'inline-flex', ml: '-4px' }}>
                              <XIcon size={12} />
                            </Box>
                          )}
                          <Text sx={{ ml: 1 }}>{item.state === 'closed' ? 'Closed' : 'Open'}</Text>
                        </Box>
                      )}
                      <Text sx={{fontWeight: 'semibold', fontSize: 2, color: 'accent.fg'}}>{item.title}</Text>
                    </Box>
                  </Link>
                  <Stack direction="horizontal" alignItems="center" sx={{ color: 'fg.muted', fontSize: 0, gap: 2 }}>
                    <Text>•</Text>
                    <BranchName>{item.repository_url?.split('/').slice(-2).join('/')}</BranchName>
                    <Text>•</Text>
                    <Text>{new Date(item.updated_at).toLocaleDateString()}</Text>
                  </Stack>
                </Box>
              ))}
            </Box>
          ) : (
            <Stack sx={{ gap: 3 }}>
              {filteredResults.map((item) => (
                <Box key={item.id} sx={{ 
                  border: '1px solid',
                  borderColor: 'border.default',
                  borderRadius: 2,
                  p: 3,
                  bg: 'canvas.subtle',
                  ':last-child': { mb: 0 }
                }}>
                  {/* Project info section */}
                  <Stack direction="horizontal" alignItems="center" sx={{ mb: 2, gap: 2 }}>
                    <Avatar src={item.user.avatar_url} alt={`${item.user.login}'s avatar`} size={24} />
                    <Link
                      href={item.user.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{fontSize: 1, color: 'fg.muted', textDecoration: 'none', ':hover': { textDecoration: 'underline' }}}
                    >
                      {item.user.login}
                    </Link>
                    {item.repository_url && (
                      <>
                        <Text sx={{color: 'fg.muted'}}>/</Text>
                        <Link
                          href={`https://github.com/${item.repository_url.replace('https://api.github.com/repos/', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{fontSize: 1, color: 'accent.fg'}}
                        >
                          {item.repository_url.replace('https://api.github.com/repos/', '').split('/')[1]}
                        </Link>
                      </>
                    )}
                  </Stack>
                  <Link href={item.html_url} target="_blank" rel="noopener noreferrer" sx={{display: 'block', mb: 1}}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {item.pull_request ? (
                        (item.pull_request.merged_at || item.merged) ? (
                          <Box 
                            as="span"
                            aria-label="Merged Pull Request"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              color: 'done.fg'
                            }}
                          >
                            <GitMergeIcon size={16} />
                          </Box>
                        ) : item.state === 'closed' ? (
                          <Box 
                            as="span"
                            aria-label="Closed Pull Request"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              color: 'closed.fg'
                            }}
                          >
                            <GitPullRequestIcon size={16} />
                          </Box>
                        ) : (
                          <Box 
                            as="span"
                            aria-label="Open Pull Request"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              color: 'open.fg'
                            }}
                          >
                            <GitPullRequestIcon size={16} />
                          </Box>
                        )
                      ) : (
                        <Box 
                          as="span"
                          aria-label={`${item.state === 'closed' ? 'Closed' : 'Open'} Issue`}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: item.state === 'closed' ? 'closed.fg' : 'open.fg'
                          }}
                        >
                          <IssueOpenedIcon size={16} />
                          {item.state === 'closed' && (
                            <Box sx={{ display: 'inline-flex', ml: '-4px' }}>
                              <XIcon size={12} />
                            </Box>
                          )}
                        </Box>
                      )}
                      <Text sx={{fontWeight: 'semibold', fontSize: 2, color: 'accent.fg'}}>{item.title}</Text>
                    </Box>
                  </Link>
                  <Stack direction="horizontal" alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                    {/* Display labels */}
                    {item.labels && item.labels.map(l => (
                      <Label
                        key={l.name}
                        sx={{
                          backgroundColor: l.color ? `#${l.color}` : undefined,
                          color: l.color ? getContrastColor(l.color) : undefined,
                          fontWeight: 'bold',
                          fontSize: 0,
                          cursor: 'pointer',
                        }}
                        title={l.description || l.name}
                        onClick={() => setLabelFilter(l.name)}
                      >
                        {l.name}
                      </Label>
                    ))}
                  </Stack>
                  <Stack direction="horizontal" alignItems="center" sx={{ fontSize: 0, color: 'fg.muted', mt: 2, flexWrap: 'wrap', gap: 3 }}>
                    <Stack direction="horizontal" sx={{ flexWrap: 'wrap', gap: 2 }}>
                      <Text>Created: {new Date(item.created_at).toLocaleDateString()}</Text>
                      <Text>Updated: {new Date(item.updated_at).toLocaleDateString()}</Text>
                      {item.pull_request?.merged_at && (
                        <Text sx={{ color: 'done.fg', fontWeight: 'bold' }}>
                          Merged: {new Date(item.pull_request.merged_at).toLocaleDateString()}
                        </Text>
                      )}
                      {item.state === 'closed' && !item.pull_request?.merged_at && (
                        <Text sx={{ color: 'danger.fg' }}>
                          Closed: {new Date(item.closed_at!).toLocaleDateString()}
                        </Text>
                      )}
                    </Stack>
                    {item.body && (
                      <Button 
                        size="small" 
                        variant={descriptionVisible[item.id] ? "primary" : "default"}
                        onClick={() => toggleDescriptionVisibility(item.id)}
                        sx={{ ml: 'auto', ...buttonStyles }}
                      >
                        {descriptionVisible[item.id] ? 'Hide description' : 'Show description'}
                      </Button>
                    )}
                  </Stack>
                  
                  {/* Description shown only on demand */}
                  {item.body && descriptionVisible[item.id] && (
                    <Box sx={{
                      maxHeight: expanded[item.id] ? '500px' : '200px',
                      overflow: 'auto',
                      position: 'relative',
                      mt: 2,
                      bg: 'canvas.default',
                      p: 2,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'border.muted',
                      fontSize: 1,
                      color: 'fg.muted',
                    }}>
                      <Box sx={{
                        position: 'relative',
                        '& pre': {
                          maxWidth: '100%',
                          overflow: 'auto'
                        }
                      }}>
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({node, ...props}) => (
                              <Link 
                                target="_blank" 
                                rel="noopener noreferrer"
                                sx={{color: 'accent.fg'}}
                                {...props} 
                              />
                            ),
                            pre: ({node, ...props}) => (
                              <Box 
                                as="pre"
                                sx={{
                                  bg: 'canvas.subtle',
                                  p: 2,
                                  borderRadius: 1,
                                  overflowX: 'auto',
                                  fontSize: 0,
                                  border: '1px solid',
                                  borderColor: 'border.muted'
                                }}
                                {...props}
                              />
                            ),
                            code: ({inline, ...props}: CodeComponentProps) => (
                              inline
                                ? <Box as="code" sx={{bg: 'canvas.subtle', p: '2px 4px', borderRadius: 1, fontSize: 0}} {...props} />
                                : <Box as="code" sx={{display: 'block', fontSize: 0}} {...props} />
                            ),
                            img: ({node, ...props}) => (
                              <Box as="img" sx={{maxWidth: '100%', height: 'auto'}} {...props} />
                            )
                          }}
                        >
                          {item.body}
                        </ReactMarkdown>
                      </Box>
                      {!expanded[item.id] && item.body.length > 400 && (
                        <Box sx={{
                          position: 'sticky',
                          bottom: 0,
                          left: 0,
                          width: '100%',
                          height: '3em',
                          background: 'linear-gradient(to bottom, transparent, var(--color-canvas-default) 90%)',
                          pointerEvents: 'none'
                        }} />
                      )}
                      
                      {item.body.length > 400 && (
                        <Button 
                          size="small"
                          variant="invisible"
                          onClick={() => toggleExpand(item.id)}
                          sx={{ 
                            mt: 1,
                            position: 'sticky',
                            bottom: 0,
                            bg: 'canvas.default',
                            width: '100%',
                            textAlign: 'center',
                            py: 2
                          }}
                        >
                          {expanded[item.id] ? 'Show less' : 'Show more'}
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
});

// Add Settings Dialog Component
const SettingsDialog = memo(function SettingsDialog({ 
  isOpen, 
  onDismiss 
}: { 
  isOpen: boolean; 
  onDismiss: () => void;
}) {
  const { githubToken, setGithubToken } = useFormContext();
  const [tokenStorage, setTokenStorage] = useState(() => 
    localStorage.getItem('github-token-storage') || 'session'
  );
  
  const handleStorageChange = useCallback((newStorage: string) => {
    setTokenStorage(newStorage);
    localStorage.setItem('github-token-storage', newStorage);
    
    // Move token to selected storage
    if (newStorage === 'local') {
      const sessionToken = sessionStorage.getItem('github-token');
      if (sessionToken) {
        localStorage.setItem('github-token', sessionToken);
        sessionStorage.removeItem('github-token');
      }
    } else {
      const localToken = localStorage.getItem('github-token');
      if (localToken) {
        sessionStorage.setItem('github-token', localToken);
        localStorage.removeItem('github-token');
      }
    }
  }, []);

  const handleTokenChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newToken = e.target.value;
    setGithubToken(newToken);
    
    // Store in selected storage
    if (tokenStorage === 'local') {
      if (newToken) {
        localStorage.setItem('github-token', newToken);
      } else {
        localStorage.removeItem('github-token');
      }
    } else {
      if (newToken) {
        sessionStorage.setItem('github-token', newToken);
      } else {
        sessionStorage.removeItem('github-token');
      }
    }
  }, [setGithubToken, tokenStorage]);

  if (!isOpen) return null;

  return (
    <Dialog
      onClose={onDismiss}
      sx={{
        width: ['90%', '80%', '600px'],
        maxWidth: '800px',
        margin: '0 auto'
      }}
    >
      <Dialog.Header>Settings</Dialog.Header>
      
      <Box sx={{ p: 3 }}>
        <Box sx={{ 
          mb: 3,
          p: 3,
          bg: 'accent.subtle',
          border: '1px solid',
          borderColor: 'accent.muted',
          borderRadius: 2
        }}>
          <Heading as="h2" sx={{ fontSize: 2, mb: 2, color: 'accent.fg' }}>About GitHub Tokens</Heading>
          <Text as="p" sx={{ fontSize: 1, mb: 2, color: 'fg.default' }}>
            A GitHub token is optional but recommended for:
          </Text>
          <Text as="ul" sx={{ fontSize: 1, pl: 3, color: 'fg.default' }}>
            <li>Accessing private repositories</li>
            <li>Increased API rate limits (5,000/hour vs 60/hour)</li>
            <li>Reduced likelihood of hitting request limits</li>
          </Text>
        </Box>

        <FormControl sx={{ mb: 3 }}>
          <FormControl.Label>Personal Access Token (Optional)</FormControl.Label>
          <TextInput
            type="password"
            value={githubToken}
            onChange={handleTokenChange}
            placeholder="GitHub personal access token"
            block
            aria-describedby="token-help"
            sx={{ bg: 'canvas.default', color: 'fg.default' }}
          />
          <FormControl.Caption id="token-help">
            Use a fine-grained token with minimal permissions - read-only access to repositories is sufficient
          </FormControl.Caption>
        </FormControl>

        <FormControl>
          <FormControl.Label>Token Storage Location</FormControl.Label>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box as="label" sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'fg.default' }}>
              <input
                type="radio"
                name="storage"
                value="session"
                checked={tokenStorage === 'session'}
                onChange={(e) => handleStorageChange(e.target.value)}
              />
              Browser Session (Recommended)
            </Box>
            <Text sx={{ ml: 4, mb: 2, fontSize: 0, color: 'fg.muted' }}>
              Token is cleared when you close your browser. Most secure option.
            </Text>
            
            <Box as="label" sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'fg.default' }}>
              <input
                type="radio"
                name="storage"
                value="local"
                checked={tokenStorage === 'local'}
                onChange={(e) => handleStorageChange(e.target.value)}
              />
              Local Storage
            </Box>
            <Text sx={{ ml: 4, fontSize: 0, color: 'fg.muted' }}>
              Token persists after browser closes. Less secure but more convenient.
            </Text>
          </Box>
        </FormControl>

        <Box sx={{ 
          mt: 3, 
          p: 3, 
          bg: 'canvas.subtle',
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 2
        }}>
          <Heading as="h3" sx={{ fontSize: 1, mb: 2, color: 'fg.muted' }}>Security Best Practices</Heading>
          <Text as="ul" sx={{ fontSize: 0, color: 'fg.muted', pl: 3 }}>
            <li>Use fine-grained tokens with minimal permissions when possible</li>
            <li>Never share your token or commit it to version control</li>
            <li>Set an expiration date on your token for better security</li>
            <li>Review and revoke tokens regularly in your GitHub settings</li>
          </Text>
        </Box>
      </Box>
    </Dialog>
  );
});

// Slot Machine Loader Component
const SlotMachineLoader = memo(function SlotMachineLoader({ avatarUrls, isLoading }: { avatarUrls: string[], isLoading: boolean }) {
  const getRandomPositions = useCallback((itemCount: number) => {
    return Array(3).fill(0).map(() => Math.floor(Math.random() * itemCount));
  }, []);

  // Default emojis as fallback
  const defaultSymbols = ['🎰', '💎', '7️⃣', '🎲', '🎮', '🎪', '🎨', '🎭', '🎪'];
  
  // Ensure we always have items to display
  const allItems = avatarUrls.length > 0 
    ? avatarUrls 
    : defaultSymbols;

  const [positions, setPositions] = useState(() => getRandomPositions(allItems.length));
  const [spinning, setSpinning] = useState([false, false, false]);
  
  // Reset positions when items change
  useEffect(() => {
    if (!isLoading && allItems.length > 0) {
      setPositions(getRandomPositions(allItems.length));
    }
  }, [allItems.length, getRandomPositions, isLoading]);
  
  useEffect(() => {
    if (isLoading) {
      setSpinning([true, true, true]);
      const intervals = positions.map((_, index) => {
        const randomSpeed = Math.floor(Math.random() * 50) + 50;
        return setInterval(() => {
          setPositions(prev => {
            const newPositions = [...prev];
            const randomJump = Math.floor(Math.random() * 3) + 1;
            newPositions[index] = (prev[index] + randomJump) % allItems.length;
            return newPositions;
          });
        }, randomSpeed);
      });

      return () => intervals.forEach(interval => clearInterval(interval));
    } else {
      const stopTimeouts = spinning.map((_, index) => {
        return setTimeout(() => {
          setSpinning(prev => {
            const newSpinning = [...prev];
            newSpinning[index] = false;
            return newSpinning;
          });
        }, 100 + (index * 150));
      });

      return () => stopTimeouts.forEach(timeout => clearTimeout(timeout));
    }
  }, [isLoading, allItems.length]);

  const SlotReel = ({ position, isSpinning }: { position: number; isSpinning: boolean; index?: number }) => {
    // Ensure we always have a valid position
    const safePosition = position % allItems.length;
    const currentItem = allItems[safePosition];
    
    // Create array of visible items for animation
    const visibleItems = isSpinning 
      ? [-1, 0, 1].map(offset => {
          const pos = (safePosition + offset + allItems.length) % allItems.length;
          return allItems[pos];
        })
      : [currentItem, currentItem, currentItem];

    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: '4px',
        bg: 'canvas.subtle',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '72px',
          transform: `translateY(-24px)`,
          transition: isSpinning ? 'none' : 'transform 0.3s cubic-bezier(0.4, 2, 0.5, 1)',
          animation: isSpinning ? 'spin 0.2s infinite linear' : 'none',
          '@keyframes spin': {
            '0%': { transform: 'translateY(0px)' },
            '100%': { transform: 'translateY(-24px)' }
          }
        }}>
          {visibleItems.map((item, i) => (
            <Box key={i} sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              flexShrink: 0,
              opacity: i === 1 ? 1 : 0,
              transform: !isSpinning && i === 1 ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.3s ease',
              bg: !isSpinning && i === 1 ? 'accent.subtle' : 'transparent',
              borderRadius: '2px'
            }}>
              {item && (
                typeof item === 'string' && item.startsWith('http')
                  ? <Avatar src={item} size={20} /> 
                  : <Text sx={{ fontSize: 2, lineHeight: 1 }}>{item}</Text>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  // Check if all reels have stopped spinning
  const allStopped = !spinning.some(s => s);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1
    }}>
      <Box sx={{
        display: 'flex',
        gap: 1,
        padding: '2px',
        bg: 'canvas.default',
        borderRadius: '6px',
        border: '1px solid',
        borderColor: allStopped ? 'accent.emphasis' : 'border.default',
        boxShadow: allStopped ? 'shadow.medium' : 'shadow.small',
        transition: 'all 0.3s ease'
      }}>
        {positions.map((position, index) => (
          <SlotReel 
            key={index}
            position={position}
            isSpinning={spinning[index]}
          />
        ))}
      </Box>
    </Box>
  );
});

// Add the main App component
function App() {
  // State for settings dialog
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Form state with URL params and local storage fallback
  const [username, setUsername] = useState(() => {
    const urlUsername = getParamFromUrl('username');
    if (urlUsername) return urlUsername;
    return localStorage.getItem('github-username') || '';
  });
  
  const [startDate, setStartDate] = useState(() => {
    const urlStartDate = getParamFromUrl('startDate');
    if (urlStartDate && isValidDateString(urlStartDate)) return urlStartDate;
    
    const storedDate = localStorage.getItem('github-start-date');
    if (storedDate && isValidDateString(storedDate)) return storedDate;
    
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to last 30 days
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const urlEndDate = getParamFromUrl('endDate');
    if (urlEndDate && isValidDateString(urlEndDate)) return urlEndDate;
    
    const storedDate = localStorage.getItem('github-end-date');
    if (storedDate && isValidDateString(storedDate)) return storedDate;
    
    return new Date().toISOString().split('T')[0];
  });

  // Update URL and localStorage when values change
  useEffect(() => {
    updateUrlParams({
      username,
      startDate,
      endDate
    });
  }, [username, startDate, endDate]);

  // Form state with local storage
  const [githubToken, setGithubToken] = useState(() => {
    return sessionStorage.getItem('github-token') || localStorage.getItem('github-token') || '';
  });
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Results state with local storage
  const [results, setResults] = useState<GitHubItem[]>(() => {
    const storedResults = localStorage.getItem('github-results');
    return storedResults ? JSON.parse(storedResults) : [];
  });

  // Add state for stored avatars
  const [storedAvatars, setStoredAvatars] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('github-avatars');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Update stored avatars when results change
  useEffect(() => {
    if (results.length > 0) {
      const newAvatars = [...new Set([
        ...storedAvatars,
        ...results.map(item => item.user.avatar_url)
      ])].filter(Boolean);
      setStoredAvatars(newAvatars);
      localStorage.setItem('github-avatars', JSON.stringify(newAvatars));
    }
  }, [results, storedAvatars]);

  // Background refresh functionality
  const fetchDataInBackground = useCallback(async () => {
    if (!username) return;

    setLoadingProgress('Refreshing data in background...');

    try {
      const usernames = username.split(',').map(u => u.trim());
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
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        allResults.push(...data.items);
      }

      setResults(allResults);
      setLoadingProgress('Data updated successfully!');
      setTimeout(() => setLoadingProgress(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
      console.error('Background fetch error:', err);
    }
  }, [username, startDate, endDate, githubToken]);

  // Remove automatic initial load and background refresh
  useEffect(() => {
    if (results.length > 0) {
      localStorage.setItem('github-results', JSON.stringify(results));
      localStorage.setItem('github-results-timestamp', Date.now().toString());
    }
  }, [results]);

  // Remove duplicate localStorage updates
  useEffect(() => {
    if (username) localStorage.setItem('github-username', username);
    if (startDate) localStorage.setItem('github-start-date', startDate);
    if (endDate) localStorage.setItem('github-end-date', endDate);
  }, [username, startDate, endDate]);

  // Main search handler
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

    setLoading(true);
    setError(null);
    await fetchDataInBackground();
    setLoading(false);
  }, [username, startDate, endDate, fetchDataInBackground]);

  // Results state
  const [filter, setFilter] = useState<'all' | 'issue' | 'pr'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'merged'>('all');
  const [sortOrder, setSortOrder] = useState<'updated' | 'created'>('updated');
  const [labelFilter, setLabelFilter] = useState('');
  const [excludedLabels, setExcludedLabels] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [repoFilters, setRepoFilters] = useState<string[]>([]);
  const [descriptionVisible, setDescriptionVisible] = useState<{[id: number]: boolean}>({});
  const [expanded, setExpanded] = useState<{[id: number]: boolean}>({});
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);
  const [isCompactView, setIsCompactView] = useState(false);

  // Derived state
  const availableLabels = useMemo(() => {
    const labels = new Set<string>();
    results.forEach(item => {
      item.labels?.forEach(label => labels.add(label.name));
    });
    return Array.from(labels);
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter(item => {
      // Apply type filter
      if (filter === 'pr' && !item.pull_request) return false;
      if (filter === 'issue' && item.pull_request) return false;

      // Apply status filter
      if (statusFilter === 'merged') {
        if (!item.pull_request) return false;
        return item.pull_request.merged_at || item.merged;
      }
      if (statusFilter !== 'all') {
        if (item.pull_request && (item.pull_request.merged_at || item.merged)) return false;
        return item.state === statusFilter;
      }

      // Apply label filters
      if (labelFilter && !item.labels?.some(l => l.name === labelFilter)) return false;
      if (excludedLabels.length > 0 && item.labels?.some(l => excludedLabels.includes(l.name))) return false;

      // Apply repo filters
      if (repoFilters.length > 0) {
        const itemRepo = item.repository_url?.replace('https://api.github.com/repos/', '');
        if (!itemRepo || !repoFilters.includes(itemRepo)) return false;
      }

      // Apply text search
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(searchLower);
        const bodyMatch = item.body?.toLowerCase().includes(searchLower);
        if (!titleMatch && !bodyMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(sortOrder === 'updated' ? a.updated_at : a.created_at);
      const dateB = new Date(sortOrder === 'updated' ? b.updated_at : b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
  }, [results, filter, statusFilter, labelFilter, excludedLabels, repoFilters, searchText, sortOrder]);

  // Event handlers
  const toggleDescriptionVisibility = useCallback((id: number) => {
    setDescriptionVisible(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  const toggleExpand = useCallback((id: number) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  const copyResultsToClipboard = useCallback(() => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString();
    };

    let plainText = '';
    let htmlContent = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Helvetica, Arial, sans-serif;">\n';

    filteredResults.forEach((item, index) => {
      // Plain text format
      plainText += `${index + 1}. ${item.title}\n`;
      plainText += `   Link: ${item.html_url}\n`;
      plainText += `   Type: ${item.pull_request ? 'Pull Request' : 'Issue'}\n`;
      plainText += `   Status: ${item.state}${item.merged ? ' (merged)' : ''}\n`;
      plainText += `   Created: ${formatDate(item.created_at)}\n`;
      plainText += `   Updated: ${formatDate(item.updated_at)}\n`;
      if (item.labels?.length) {
        plainText += `   Labels: ${item.labels.map(l => l.name).join(', ')}\n`;
      }
      plainText += '\n';

      // HTML format with styling
      htmlContent += `<div style="margin-bottom: 16px;">\n`;
      htmlContent += `  <div style="font-size: 16px; margin-bottom: 8px;">\n`;
      htmlContent += `    ${index + 1}. <a href="${item.html_url}" style="color: #0969da; text-decoration: none;">${item.title}</a>\n`;
      htmlContent += `  </div>\n`;
      htmlContent += `  <div style="color: #57606a; font-size: 14px; margin-left: 24px;">\n`;
      htmlContent += `    <div>Type: ${item.pull_request ? 'Pull Request' : 'Issue'}</div>\n`;
      htmlContent += `    <div>Status: <span style="color: ${
        item.merged ? '#8250df' : 
        item.state === 'closed' ? '#cf222e' : '#1a7f37'
      };">${item.state}${item.merged ? ' (merged)' : ''}</span></div>\n`;
      htmlContent += `    <div>Created: ${formatDate(item.created_at)}</div>\n`;
      htmlContent += `    <div>Updated: ${formatDate(item.updated_at)}</div>\n`;
      if (item.labels?.length) {
        htmlContent += `    <div style="margin-top: 4px;">Labels: `;
        htmlContent += item.labels.map(l => {
          const bgColor = l.color ? `#${l.color}` : '#ededed';
          const textColor = l.color ? getContrastColor(l.color) : '#000000';
          return `<span style="
            display: inline-block;
            padding: 0 7px;
            font-size: 12px;
            font-weight: 500;
            line-height: 18px;
            border-radius: 2em;
            background-color: ${bgColor};
            color: ${textColor};
            margin-right: 4px;
          ">${l.name}</span>`;
        }).join('');
        htmlContent += `</div>\n`;
      }
      htmlContent += `  </div>\n`;
      htmlContent += `</div>\n`;
    });

    htmlContent += '</div>';

    // Use the Clipboard API to write both formats
    try {
      const clipboardItem = new ClipboardItem({
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
        'text/html': new Blob([htmlContent], { type: 'text/html' })
      });
      
      navigator.clipboard.write([clipboardItem]).then(() => {
        setClipboardMessage('Results copied to clipboard with formatting!');
        setTimeout(() => setClipboardMessage(null), 3000);
      });
    } catch (err) {
      // Fallback to basic text clipboard if the advanced API is not available
      navigator.clipboard.writeText(plainText).then(() => {
        setClipboardMessage('Results copied to clipboard (plain text only)');
        setTimeout(() => setClipboardMessage(null), 3000);
      });
    }
  }, [filteredResults]);

  const clearAllFilters = useCallback(() => {
    setFilter('all');
    setStatusFilter('all');
    setSortOrder('updated');
    setLabelFilter('');
    setExcludedLabels([]);
    setSearchText('');
    setRepoFilters([]);
  }, []);

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
            borderBottom: '1px solid',
            borderColor: 'border.default',
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
              alignItems: 'center'
            }}>
              <SlotMachineLoader 
                avatarUrls={storedAvatars.length > 0 
                  ? storedAvatars 
                  : results
                    .map(item => item.user.avatar_url)
                    .filter(Boolean)
                }
                isLoading={loading}
              />
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
              <ResultsList />
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

// Add default export
export default App;

