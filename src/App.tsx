import { useState, useEffect, useCallback, createContext, useContext, memo, useMemo } from 'react';
import type { FormEvent } from 'react'; // Changed to type-only import
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
  Timeline,
  BranchName,
  StateLabel,
  Heading,
  Stack,
  ThemeProvider,
  BaseStyles
} from '@primer/react';
import {
  IssueOpenedIcon,
  GitPullRequestIcon,
  CheckIcon,
  XIcon,
  SearchIcon,
  FilterIcon,
  SortAscIcon,
  SortDescIcon,
  TrashIcon,
  EyeIcon,
  EyeClosedIcon,
  ClockIcon,
  CalendarIcon,
  GitMergeIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@primer/octicons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// Commenting out the problematic Table import for now to isolate the issue
// import { Table } from '@primer/react/drafts';

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
  const searchParams = url.searchParams;
  
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === '') {
      searchParams.delete(key);
    } else {
      searchParams.set(key, value);
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

// Define a type for Label variants based on Primer's documentation
type PrimerLabelVariant = 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'attention' | 'severe' | 'danger' | 'done' | 'sponsors';

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

function calculateDuration(){
  return 'test';
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
  availableRepos: string[];
  startDate: string;  // Add start date
  endDate: string;    // Add end date
  stats: {
    total: number;
    issues: number;
    prs: number;
    open: number;
    closed: number;
  };
  setFilter: (filter: 'all' | 'issue' | 'pr') => void;
  setStatusFilter: (status: 'all' | 'open' | 'closed' | 'merged') => void;
  setSortOrder: (sort: 'updated' | 'created') => void;
  setLabelFilter: (filter: string) => void;
  setExcludedLabels: React.Dispatch<React.SetStateAction<string[]>>;
  setSearchText: (text: string) => void;
  setRepoFilters: React.Dispatch<React.SetStateAction<string[]>>;
  toggleDescriptionVisibility: (id: number) => void;
  toggleExpand: (id: number) => void;
  copyResultsToClipboard: (format?: 'markdown' | 'html') => void;
  descriptionVisible: { [id: number]: boolean };
  expanded: { [id: number]: boolean };
  clipboardMessage: string | null;
  clearAllFilters: () => void;
  isCompactView: boolean;
  setIsCompactView: (value: boolean) => void;
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
    githubToken, setGithubToken,
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
    <Box sx={{maxWidth: '800px', margin: '0 auto'}}>
      <Box as="form" 
        sx={{display: 'flex', flexDirection: 'column', gap: 3}} 
        onSubmit={(e: FormEvent<HTMLFormElement>) => { 
          e.preventDefault(); 
          handleSearch(); 
        }}
      >
        <FormControl>
          <FormControl.Label>
            GitHub Token (optional)
            <Text as="span" sx={{ ml: 1, color: 'fg.muted', fontWeight: 'normal' }}>
              - stored in session only
            </Text>
          </FormControl.Label>
          <TextInput
            type="password"
            placeholder="GitHub personal access token"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            block
          />
        </FormControl>

        <FormControl>
          <FormControl.Label>GitHub Username(s)</FormControl.Label>
          <TextInput
            placeholder="Enter usernames (comma-separated for multiple)"
            value={username}
            onChange={handleUsernameChange}
            block
          />
        </FormControl>
        
        <FormControl>
          <FormControl.Label>
            Start Date (Last Updated)
            <Text as="span" sx={{ ml: 1, color: 'fg.muted', fontWeight: 'normal' }}>
              - when items were last updated
            </Text>
          </FormControl.Label>
          <TextInput
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            block
          />
        </FormControl>
        
        <FormControl>
          <FormControl.Label>
            End Date (Last Updated)
            <Text as="span" sx={{ ml: 1, color: 'fg.muted', fontWeight: 'normal' }}>
              - when items were last updated
            </Text>
          </FormControl.Label>
          <TextInput
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            block
          />
        </FormControl>
        
        <Button variant="primary" type="submit" sx={{width: '100%', mt: 1}}>Search</Button>
      </Box>
      {error && (
        <Flash variant="danger" sx={{marginTop: 3}}>
          {error}
        </Flash>
      )}
    </Box>
  );
});

// Update countItemsMatchingFilter to accept date range
const countItemsMatchingFilter = (
  items: GitHubItem[], 
  filterType: string, 
  filterValue: string, 
  excludedLabels: string[],
  dateRange: { startDate: string; endDate: string }
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
          item.pull_request?.merged_at && 
          new Date(item.pull_request.merged_at) >= new Date(dateRange.startDate) &&
          new Date(item.pull_request.merged_at) <= new Date(dateRange.endDate)
        ).length;
      }
      return items.filter(item => 
        filterValue === 'all' ? true :
        item.state === filterValue
      ).length;
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
    availableRepos,
    stats,
    setFilter,
    setStatusFilter,
    setSortOrder,
    setLabelFilter,
    setExcludedLabels,
    setSearchText,
    setRepoFilters,
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

  const { startDate, endDate } = useFormContext();
  const dateRange = { startDate, endDate };

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
    if (sortOrder !== 'updated') {
      summaryParts.push('Sorted by creation date');
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

  // Add statsVisible state
  const [statsVisible, setStatsVisible] = useState(true);

  return (
    <Box>
      {/* Filters Section */}
      <Box sx={{
        maxWidth: '1200px',
        margin: '24px auto',
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
          p: 3,
          bg: 'canvas.default',
          borderBottom: '1px solid',
          borderColor: 'border.default'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Heading as="h2" sx={{fontSize: 2, fontWeight: 'bold', color: 'fg.default', m: 0}}>
              <FilterIcon size={16} /> Filters
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
                <TrashIcon size={16} />
                Clear All Filters
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
              {areFiltersCollapsed ? <ChevronDownIcon size={16} /> : <ChevronUpIcon size={16} />}
              {areFiltersCollapsed ? 'Show Filters' : 'Hide Filters'}
            </Button>
          </Box>
        </Box>

        {/* Filter Summary when collapsed */}
        {areFiltersCollapsed && hasActiveFilters && (
          <Box sx={{
            p: 3,
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
          <Box sx={{ p: 3 }}>
            {/* Type Filter UI */}
            <Stack sx={{ mb: 4 }}>
              <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'bold', color: 'fg.muted', mb: 2 }}>
                <FilterIcon size={16} /> Type
              </Heading>
              <ButtonGroup>
                <Button 
                  variant={filter === 'issue' ? 'primary' : 'default'} 
                  onClick={() => setFilter(filter === 'issue' ? 'all' : 'issue')}
                  size="small"
                  sx={buttonStyles}
                >
                  <IssueOpenedIcon size={16} />
                  Issues ({countItemsMatchingFilter(baseResults, 'type', 'issue', excludedLabels, dateRange)})
                </Button>
                <Button 
                  variant={filter === 'pr' ? 'primary' : 'default'} 
                  onClick={() => setFilter(filter === 'pr' ? 'all' : 'pr')}
                  size="small"
                  sx={buttonStyles}
                >
                  <GitPullRequestIcon size={16} />
                  PRs ({countItemsMatchingFilter(baseResults, 'type', 'pr', excludedLabels, dateRange)})
                </Button>
              </ButtonGroup>
            </Stack>

            {/* Status Filter UI */}
            <Stack sx={{ mb: 4 }}>
              <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'bold', color: 'fg.muted', mb: 2 }}>
                <FilterIcon size={16} /> Status
              </Heading>
              <ButtonGroup>
                <Button 
                  variant={statusFilter === 'open' ? 'primary' : 'default'} 
                  onClick={() => setStatusFilter(statusFilter === 'open' ? 'all' : 'open')}
                  size="small"
                  sx={buttonStyles}
                >
                  <IssueOpenedIcon size={16} />
                  Open ({countItemsMatchingFilter(baseResults, 'status', 'open', excludedLabels, dateRange)})
                </Button>
                <Button 
                  variant={statusFilter === 'closed' ? 'primary' : 'default'} 
                  onClick={() => setStatusFilter(statusFilter === 'closed' ? 'all' : 'closed')}
                  size="small"
                  sx={buttonStyles}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                    <XIcon size={12} />
                  </Box>
                  Closed ({countItemsMatchingFilter(baseResults, 'status', 'closed', excludedLabels, dateRange)})
                </Button>
                <Button 
                  variant={statusFilter === 'merged' ? 'primary' : 'default'} 
                  onClick={() => setStatusFilter(statusFilter === 'merged' ? 'all' : 'merged')}
                  size="small"
                  sx={{ 
                    ...buttonStyles,
                    borderColor: statusFilter === 'merged' ? 'done.emphasis' : undefined,
                    backgroundColor: statusFilter === 'merged' ? 'done.emphasis' : undefined,
                    color: statusFilter === 'merged' ? 'fg.onEmphasis' : undefined,
                    '&:hover:not([disabled])': {
                      backgroundColor: statusFilter === 'merged' ? 'done.emphasis' : undefined,
                      borderColor: statusFilter === 'merged' ? 'done.emphasis' : undefined,
                      color: statusFilter === 'merged' ? 'fg.onEmphasis' : undefined
                    }
                  }}
                >
                  <GitMergeIcon size={16} />
                  Merged in {startDate} - {endDate} ({countItemsMatchingFilter(baseResults, 'status', 'merged', excludedLabels, dateRange)})
                </Button>
              </ButtonGroup>
            </Stack>

            {/* Label Filters */}
            {availableLabels.length > 0 && (
              <>
                {/* Inclusive Label Filter */}
                <Stack sx={{ mb: 4 }}>
                  <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'bold', color: 'success.fg', mb: 2 }}>
                    Label Filter (inclusive)
                    <Text as="span" sx={{ml: 2, fontSize: 1, color: 'fg.muted', fontWeight: 'normal'}}>
                      - show items with selected label
                    </Text>
                  </Heading>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    {availableLabels
                      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                      .map(label => {
                        const currentCount = countItemsMatchingFilter(baseResults, 'label', label, excludedLabels, dateRange);
                        const potentialCount = countItemsMatchingFilter(results, 'label', label, excludedLabels, dateRange);
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
                              textDecoration: !hasMatches && hasPotentialMatches ? 'line-through' : 'none'
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
                <Stack sx={{ mb: 4 }}>
                  <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'bold', color: 'danger.fg', mb: 2 }}>
                    Label Filter (exclusive)
                    <Text as="span" sx={{ml: 2, fontSize: 1, color: 'fg.muted', fontWeight: 'normal'}}>
                      - hide items with selected labels
                    </Text>
                  </Heading>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    {availableLabels
                      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                      .map(label => {
                        const currentCount = countItemsMatchingFilter(baseResults, 'label', label, excludedLabels, dateRange);
                        const potentialCount = countItemsMatchingFilter(results, 'label', label, [], dateRange);
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
                              textDecoration: !hasMatches && hasPotentialMatches ? 'line-through' : 'none'
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
              </>
            )}
          </Box>
        )}
      </Box>

      {/* Statistics Section */}
      <Box sx={{
        maxWidth: '1200px',
        margin: '24px auto',
        bg: 'canvas.default',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'border.default',
        p: 3
      }}>
        {/* Statistics header */}
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
            <Heading as="h2" sx={{fontSize: 3, fontWeight: 'semibold', color: 'fg.default'}}>Statistics</Heading>
            <Text sx={{ fontSize: 1, color: 'fg.muted' }}>({stats.total} items)</Text>
          </Box>
          <Button
            variant="invisible"
            onClick={() => setStatsVisible(!statsVisible)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              color: 'fg.muted',
              ':hover': { color: 'fg.default' }
            }}
          >
            {statsVisible ? 'Hide Details' : 'Show Details'}
            {statsVisible ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
          </Button>
        </Box>

        {/* Statistics content */}
        <Box sx={{
          overflow: 'hidden',
          maxHeight: statsVisible ? '500px' : '0px',
          transition: 'max-height 0.3s ease-in-out, opacity 0.2s ease-in-out',
          opacity: statsVisible ? 1 : 0
        }}>
          <Stack direction="horizontal" sx={{ gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 3,
              py: 1,
              bg: 'canvas.subtle',
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2
            }}>
              <Text sx={{fontSize: 3, fontWeight: 'bold', color: 'fg.default'}}>{stats.total}</Text>
              <Text sx={{fontSize: 1, color: 'fg.muted'}}>Total</Text>
            </Box>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 3,
              py: 1,
              bg: 'canvas.subtle',
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2
            }}>
              <IssueOpenedIcon size={16} />
              <Text sx={{fontSize: 3, fontWeight: 'bold', color: 'accent.fg'}}>{stats.issues}</Text>
              <Text sx={{fontSize: 1, color: 'fg.muted'}}>Issues</Text>
            </Box>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 3,
              py: 1,
              bg: 'canvas.subtle',
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2
            }}>
              <GitPullRequestIcon size={16} />
              <Text sx={{fontSize: 3, fontWeight: 'bold', color: 'success.fg'}}>{stats.prs}</Text>
              <Text sx={{fontSize: 1, color: 'fg.muted'}}>PRs</Text>
            </Box>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 3,
              py: 1,
              bg: 'canvas.subtle',
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2
            }}>
              <IssueOpenedIcon size={16} />
              <Text sx={{fontSize: 3, fontWeight: 'bold', color: 'open.fg'}}>{stats.open}</Text>
              <Text sx={{fontSize: 1, color: 'fg.muted'}}>Open</Text>
            </Box>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 3,
              py: 1,
              bg: 'canvas.subtle',
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2
            }}>
              <CheckIcon size={16} />
              <Text sx={{fontSize: 3, fontWeight: 'bold', color: 'done.fg'}}>{stats.closed}</Text>
              <Text sx={{fontSize: 1, color: 'fg.muted'}}>Closed</Text>
            </Box>
          </Stack>
        </Box>
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
              <Heading as="h2" sx={{fontSize: 3, fontWeight: 'semibold', color: 'fg.default'}}>Results</Heading>
              {clipboardMessage && (
                <Flash variant="success" sx={{ py: 1, px: 2 }}>
                  {clipboardMessage}
                </Flash>
              )}
            </Box>
            <Stack direction="horizontal" alignItems="center" sx={{ gap: 3 }}>
              <ButtonGroup>
                <Button 
                  variant={sortOrder === 'updated' ? 'primary' : 'default'} 
                  onClick={() => setSortOrder(sortOrder === 'updated' ? 'created' : 'updated')}
                  size="small"
                  sx={buttonStyles}
                >
                  <ClockIcon size={16} />
                  Last Updated
                </Button>
                <Button 
                  variant={sortOrder === 'created' ? 'primary' : 'default'} 
                  onClick={() => setSortOrder(sortOrder === 'created' ? 'updated' : 'created')}
                  size="small"
                  sx={buttonStyles}
                >
                  <CalendarIcon size={16} />
                  Creation Date
                </Button>
              </ButtonGroup>
              <ButtonGroup>
                <Button
                  onClick={() => setIsCompactView(!isCompactView)}
                  variant="default"
                  size="small"
                  sx={{ 
                    ...buttonStyles,
                    borderColor: isCompactView ? 'accent.emphasis' : 'border.default',
                    color: isCompactView ? 'accent.fg' : 'fg.default'
                  }}
                >
                  {isCompactView ? <EyeIcon size={16} /> : <EyeClosedIcon size={16} />}
                  {isCompactView ? 'Detailed View' : 'Compact View'}
                </Button>
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
              </ButtonGroup>
            </Stack>
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
                    {item.title}
                  </Link>
                  <Stack direction="horizontal" alignItems="center" sx={{ color: 'fg.muted', fontSize: 0, gap: 2 }}>
                    {item.pull_request ? (
                      item.merged ? (
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
                          <Box sx={{ display: 'inline-flex', ml: '-4px' }}>
                            <XIcon size={12} />
                          </Box>
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
                    <Text sx={{fontWeight: 'semibold', fontSize: 2, color: 'accent.fg'}}>{item.title}</Text>
                  </Link>
                  <Stack direction="horizontal" alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                    {item.pull_request ? (
                      item.merged ? (
                        <Box 
                          as="span"
                          aria-label="Merged Pull Request"
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: 'done.fg',
                            bg: 'done.subtle',
                            border: '1px solid',
                            borderColor: 'done.emphasis',
                            borderRadius: '2em',
                            px: 2,
                            py: 1
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
                            color: 'closed.fg',
                            bg: 'closed.subtle',
                            border: '1px solid',
                            borderColor: 'closed.emphasis',
                            borderRadius: '2em',
                            px: 2,
                            py: 1
                          }}
                        >
                          <GitPullRequestIcon size={16} />
                          <Box sx={{ display: 'inline-flex', ml: '-4px' }}>
                            <XIcon size={12} />
                          </Box>
                          <Text sx={{ ml: 1 }}>Closed</Text>
                        </Box>
                      ) : (
                        <Box 
                          as="span"
                          aria-label="Open Pull Request"
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: 'open.fg',
                            bg: 'open.subtle',
                            border: '1px solid',
                            borderColor: 'open.emphasis',
                            borderRadius: '2em',
                            px: 2,
                            py: 1
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
                          color: item.state === 'closed' ? 'closed.fg' : 'open.fg',
                          bg: item.state === 'closed' ? 'closed.subtle' : 'open.subtle',
                          border: '1px solid',
                          borderColor: item.state === 'closed' ? 'closed.emphasis' : 'open.emphasis',
                          borderRadius: '2em',
                          px: 2,
                          py: 1
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
                    {/* Display labels */}
                    {item.labels && item.labels.map(l => (
                      <Label
                        key={l.name}
                        sx={{
                          ml: 1,
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
                        {descriptionVisible[item.id] ? <EyeClosedIcon size={16} /> : <EyeIcon size={16} />}
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

// Wrap App component with Context Providers
function AppWithContexts() {

  // Get initial values from URL if present, then fall back to localStorage
  const [username, setUsername] = useState(() => {
    const urlUsername = getParamFromUrl('username');
    if (urlUsername) return urlUsername;
    return localStorage.getItem('github-username') || '';
  });
  
  const [startDate, setStartDate] = useState(() => {
    const urlStartDate = getParamFromUrl('startDate');
    if (urlStartDate && isValidDateString(urlStartDate)) return urlStartDate;
    return localStorage.getItem('start-date') || '';
  });
  
  const [endDate, setEndDate] = useState(() => {
    const urlEndDate = getParamFromUrl('endDate');
    if (urlEndDate && isValidDateString(urlEndDate)) return urlEndDate;
    return localStorage.getItem('end-date') || '';
  });
  
  const [results, setResults] = useState<GitHubItem[]>(() => {
    const savedResults = localStorage.getItem('results');
    return savedResults ? JSON.parse(savedResults) : [];
  });
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'issue' | 'pr'>(() => 
    (localStorage.getItem('filter') as 'all' | 'issue' | 'pr') || 'all'
  );
  const [expanded, setExpanded] = useState<{ [id: number]: boolean }>(() => {
    const savedExpanded = localStorage.getItem('expanded');
    return savedExpanded ? JSON.parse(savedExpanded) : {};
  });
  const [descriptionVisible, setDescriptionVisible] = useState<{ [id: number]: boolean }>(() => {
    const savedDescVisible = localStorage.getItem('description-visible');
    return savedDescVisible ? JSON.parse(savedDescVisible) : {};
  });
  const [labelFilter, setLabelFilter] = useState<string>(() => localStorage.getItem('label-filter') || '');
  const [searchText, setSearchText] = useState<string>(() => localStorage.getItem('search-text') || '');
  const [availableLabels, setAvailableLabels] = useState<string[]>(() => {
    const savedLabels = localStorage.getItem('available-labels');
    return savedLabels ? JSON.parse(savedLabels) : [];
  });
  const [availableRepos, setAvailableRepos] = useState<string[]>(() => {
    const savedRepos = localStorage.getItem('available-repos');
    return savedRepos ? JSON.parse(savedRepos) : [];
  });
  const [repoFilters, setRepoFilters] = useState<string[]>(() => {
    const savedRepoFilters = localStorage.getItem('repo-filters');
    return savedRepoFilters ? JSON.parse(savedRepoFilters) : [];
  });
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'merged'>(() => 
    (localStorage.getItem('status-filter') as 'all' | 'open' | 'closed' | 'merged') || 'all'
  );
  const [sortOrder, setSortOrder] = useState<'updated' | 'created'>(() => 
    (localStorage.getItem('sort-order') as 'updated' | 'created') || 'updated'
  );

  // Add GitHub token state using sessionStorage
  const [githubToken, setGithubToken] = useState(() => 
    sessionStorage.getItem('github-token') || ''
  );

  const [isCompactView, setIsCompactView] = useState(() => 
    localStorage.getItem('is-compact-view') === 'true'
  );

  const [excludedLabels, setExcludedLabels] = useState<string[]>(() => {
    const savedExcludedLabels = localStorage.getItem('excluded-labels');
    return savedExcludedLabels ? JSON.parse(savedExcludedLabels) : [];
  });

  // Save state to localStorage on changes (excluding username which is handled separately)
  useEffect(() => {
    // We handle username with debounced updates, so we don't need to save it here
    localStorage.setItem('start-date', startDate);
    localStorage.setItem('end-date', endDate);
    localStorage.setItem('results', JSON.stringify(results));
    localStorage.setItem('filter', filter);
    localStorage.setItem('label-filter', labelFilter);
    localStorage.setItem('search-text', searchText);
    localStorage.setItem('available-labels', JSON.stringify(availableLabels));
    localStorage.setItem('available-repos', JSON.stringify(availableRepos));
    localStorage.setItem('repo-filters', JSON.stringify(repoFilters));
    localStorage.setItem('expanded', JSON.stringify(expanded));
    localStorage.setItem('description-visible', JSON.stringify(descriptionVisible));
    localStorage.setItem('status-filter', statusFilter);
    localStorage.setItem('sort-order', sortOrder);
    localStorage.setItem('is-compact-view', isCompactView.toString());
    localStorage.setItem('excluded-labels', JSON.stringify(excludedLabels));
  }, [startDate, endDate, results, filter, labelFilter, searchText, availableLabels, availableRepos, repoFilters, expanded, descriptionVisible, statusFilter, sortOrder, isCompactView, excludedLabels]);

  // Save token to sessionStorage when it changes
  useEffect(() => {
    if (githubToken) {
      sessionStorage.setItem('github-token', githubToken);
    } else {
      sessionStorage.removeItem('github-token');
    }
  }, [githubToken]);

  // Auto-fetch results when URL parameters are present on initial load
  useEffect(() => {
    const urlUsername = getParamFromUrl('username');
    const urlStartDate = getParamFromUrl('startDate');
    const urlEndDate = getParamFromUrl('endDate');
    
    // If we have valid URL parameters on first load, automatically fetch the data
    if (urlUsername && urlStartDate && urlEndDate && 
        isValidDateString(urlStartDate) && isValidDateString(urlEndDate) && 
        results.length === 0) {
      fetchGitHubData();
    }
  }, []); // Empty dependency array means this runs only on component mount

  const fetchGitHubData = async () => {
    if (!username || !startDate || !endDate) {
      setError('Please fill in all fields.');
      return;
    }
    
    // Split usernames and trim whitespace
    const usernames = username.split(',').map(u => u.trim()).filter(u => u);
    
    if (usernames.length === 0) {
      setError('Please provide at least one username.');
      return;
    }
    
    // Update URL with current search parameters when the form is submitted
    updateUrlParams({
      username: username || null,
      startDate: isValidDateString(startDate) ? startDate : null,
      endDate: isValidDateString(endDate) ? endDate : null
    });
    
    setError(null);
    setLoading(true);
    setLoadingProgress('Fetching data...');

    // Prepare headers for GitHub API requests
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json'
    };
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    try {
      const MAX_PAGES = 5; // Fetch up to 5 pages (500 results total) per user
      let allItems: GitHubItem[] = [];
      const labelsSet = new Set<string>();
      const reposSet = new Set<string>();
      
      // Fetch data for each username
      for (let userIndex = 0; userIndex < usernames.length; userIndex++) {
        const currentUsername = usernames[userIndex];
        setLoadingProgress(`Fetching data for ${currentUsername} (${userIndex + 1}/${usernames.length})...`);
        
        let hasMorePages = true;
        
        // Fetch pages in sequence for current user
        for (let page = 1; page <= MAX_PAGES && hasMorePages; page++) {
          setLoadingProgress(`Fetching page ${page} of ${MAX_PAGES} for ${currentUsername}...`);
          
          const response = await fetch(
            `https://api.github.com/search/issues?q=author:${encodeURIComponent(currentUsername)}+updated:${startDate}..${endDate}&per_page=100&page=${page}`,
            { headers }
          );
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to fetch page ${page} for ${currentUsername}`);
          }
          
          const data = await response.json();
          const items = data.items || [];
          
          // Process items from this page
          items.forEach((item: GitHubItem) => {
            // For PRs, check if it's merged based on the state and merged_at field
            if (item.pull_request) {
              item.merged = !!item.pull_request.merged_at;
            }
            
            // Add labels to set
            item.labels?.forEach(l => labelsSet.add(l.name));
            
            // Add repository to set if available
            if (item.repository_url) {
              const repoName = item.repository_url.replace('https://api.github.com/repos/', '');
              reposSet.add(repoName);
            }
          });
          
          // Add items from this page to our results
          allItems = [...allItems, ...items];
          
          // Check if we've reached the end of results
          hasMorePages = items.length === 100 && data.total_count > page * 100;
          
          // Add a small delay to avoid rate limiting issues
          if ((page < MAX_PAGES && hasMorePages) || userIndex < usernames.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay for multiple users
          }
        }
      }
      
      setLoadingProgress(`Found ${allItems.length} results across ${usernames.length} user${usernames.length > 1 ? 's' : ''}.`);
      
      // Update state with all collected items
      setResults(allItems);
      setAvailableLabels(Array.from(labelsSet));
      setAvailableRepos(Array.from(reposSet));
      setRepoFilters([]);
      
    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      if (err instanceof Error) {
        setError(err.message || 'Failed to fetch data. Please try again.');
      } else {
        setError('An unknown error occurred. Please try again.');
      }
      setResults([]);
      setAvailableLabels([]);
      setAvailableRepos([]);
    } finally {
      setLoading(false);
      setLoadingProgress('');
    }
  };

// Hilfsfunktion zur Berechnung der Zeit zwischen zwei Datumsangaben
const calculateDuration = (startDate: string, endDate: string | undefined): string => {
  if (!endDate) return "Nicht abgeschlossen";
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Berechnung der Differenz in Millisekunden
  const diffTime = Math.abs(end.getTime() - start.getTime());
  
  // Umrechnung in Tage, Stunden, Minuten
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffTime % (1000 * 60)) / (1000 * 60));
  
  // Formatierung der Ausgabe
  if (days > 0) {
    return `${days} ${days === 1 ? 'Tag' : 'Tage'}${hours > 0 ? `, ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}` : ''}`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}${minutes > 0 ? `, ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}` : ''}`;
  } else {
    return `${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
  }
};

  // Update filteredResults to properly handle merged filter
  const filteredResults = useMemo(() => {
    const filtered = results.filter(item => {
      // Type filter (Issue or PR)
      const typeMatch = 
        filter === 'all' ? true : 
        filter === 'pr' ? !!item.pull_request : 
        !item.pull_request;
      
      // Status filter with proper merge date check
      const statusMatch = 
        statusFilter === 'all' ? true :
        statusFilter === 'merged' ? (
          !!item.pull_request?.merged_at && 
          new Date(item.pull_request.merged_at) >= new Date(startDate) &&
          new Date(item.pull_request.merged_at) <= new Date(endDate)
        ) :
        statusFilter === item.state;
      
      // Label filter - include and exclude
      const labelMatch = labelFilter ? item.labels?.some(l => l.name === labelFilter) : true;
      const excludeMatch = excludedLabels.length === 0 ? true : 
        !item.labels?.some(l => excludedLabels.includes(l.name));
      
      // Repository filter
      const repoMatch = repoFilters.length === 0 ? true : (
        item.repository_url && repoFilters.includes(
          item.repository_url.replace('https://api.github.com/repos/', '')
        )
      );
      
      // Text filter
      const searchMatch = searchText.trim() === '' ? true : (
        (item.title?.toLowerCase().includes(searchText.toLowerCase()) || 
         item.body?.toLowerCase().includes(searchText.toLowerCase()))
      );
      
      return typeMatch && statusMatch && labelMatch && excludeMatch && repoMatch && searchMatch;
    });

    return [...filtered].sort((a, b) => {
      const dateA = new Date(sortOrder === 'updated' ? a.updated_at : a.created_at);
      const dateB = new Date(sortOrder === 'updated' ? b.updated_at : b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
  }, [results, filter, statusFilter, labelFilter, excludedLabels, repoFilters, searchText, sortOrder, startDate, endDate]);

  // Memoize stats calculation to prevent recalculations on form changes
  const stats = useMemo(() => ({
    total: filteredResults.length,
    issues: filteredResults.filter(item => !item.pull_request).length,
    prs: filteredResults.filter(item => !!item.pull_request).length,
    open: filteredResults.filter(item => item.state === 'open').length,
    closed: filteredResults.filter(item => item.state === 'closed').length
  }), [filteredResults]);

  const toggleExpand = useCallback((id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleDescriptionVisibility = useCallback((id: number) => {
    setDescriptionVisible(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Update formatResultsForExport to support both formats
  const formatResultsForExport = useCallback((items: GitHubItem[], format: 'markdown' | 'html' = 'markdown'): string => {
    const dateRangeInfo = `GitHub activity from ${startDate} to ${endDate}`;
    const statsInfo = `Total: ${stats.total} (Issues: ${stats.issues}, PRs: ${stats.prs}, Open: ${stats.open}, Closed: ${stats.closed})`;
    
    if (format === 'html') {
      const header = `<h1>${username}'s GitHub Activity</h1>\n<p>${dateRangeInfo}</p>\n<p>${statsInfo}</p>\n\n`;
      
      const formattedItems = `<ul>\n${items.map(item => {
        const type = item.pull_request ? 'PR' : 'Issue';
        const status = item.pull_request?.merged_at ? 'merged' : item.state;
        const repo = item.repository_url 
          ? item.repository_url.replace('https://api.github.com/repos/', '')
          : 'Unknown Repository';
        
        return `  <li><a href="${item.html_url}">${item.title}</a> (${type}, ${status}) - ${repo}</li>`;
      }).join('\n')}\n</ul>`;
      
      return header + formattedItems;
    }
    
    // Original markdown format
    const header = `# ${username}'s GitHub Activity\n${dateRangeInfo}\n${statsInfo}\n\n`;
    
    const formattedItems = items.map(item => {
      const type = item.pull_request ? 'PR' : 'Issue';
      const status = item.state;
      const repo = item.repository_url 
        ? item.repository_url.replace('https://api.github.com/repos/', '')
        : 'Unknown Repository';
      const createdDate = new Date(item.created_at).toLocaleDateString();
      const labels = item.labels && item.labels.length > 0
        ? `\nLabels: ${item.labels.map(l => l.name).join(', ')}`
        : '';
      
      const description = item.body
        ? `\n\n### Description\n${item.body.slice(0, 5000)}${item.body.length > 5000 ? '...(truncated)' : ''}`
        : '';
      
      return `## [${type}] ${item.title}\n` +
        `Repository: ${repo}\n` +
        `Status: ${status} | Created: ${createdDate}${labels}\n` +
        `Link: ${item.html_url}${description}\n`;
    }).join('\n');
    
    return header + formattedItems;
  }, [startDate, endDate, stats, username]);

  // Update copyResultsToClipboard to support formats
  const copyResultsToClipboard = useCallback(async (format: 'markdown' | 'html' = 'markdown') => {
    try {
      const formattedText = formatResultsForExport(filteredResults, format);
      await navigator.clipboard.writeText(formattedText);
      setClipboardMessage('Results copied to clipboard!');
      
      setTimeout(() => {
        setClipboardMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setClipboardMessage('Failed to copy to clipboard. Please try again.');
      
      setTimeout(() => {
        setClipboardMessage(null);
      }, 3000);
    }
  }, [filteredResults, formatResultsForExport]);

  // Memoized form context value to prevent unnecessary re-renders
  const formContextValue = useMemo(() => ({
    username,
    startDate,
    endDate,
    githubToken,
    setUsername,
    setStartDate,
    setEndDate,
    setGithubToken,
    handleSearch: fetchGitHubData,
    loading,
    loadingProgress,
    error
  }), [username, startDate, endDate, githubToken, loading, loadingProgress, error]);

  // Add clearAllFilters function
  const clearAllFilters = useCallback(() => {
    setFilter('all');
    setStatusFilter('all');
    setSortOrder('updated');
    setLabelFilter('');
    setSearchText('');
    setRepoFilters([]);
    setExcludedLabels([]);
  }, []);

  // Memoized results context value to prevent unnecessary re-renders
  const resultsContextValue = useMemo(() => ({
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
    availableRepos,
    startDate,    // Add start date
    endDate,      // Add end date
    stats,
    setFilter,
    setStatusFilter,
    setSortOrder,
    setLabelFilter,
    setExcludedLabels,
    setSearchText,
    setRepoFilters,
    toggleDescriptionVisibility,
    toggleExpand,
    copyResultsToClipboard,
    descriptionVisible,
    expanded,
    clipboardMessage,
    clearAllFilters,
    isCompactView,
    setIsCompactView
  }), [
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
    availableRepos,
    startDate,    // Add start date
    endDate,      // Add end date
    stats,
    toggleDescriptionVisibility,
    toggleExpand,
    copyResultsToClipboard,
    descriptionVisible,
    expanded,
    clipboardMessage,
    clearAllFilters,
    isCompactView
  ]);

  return (
    <FormContext.Provider value={formContextValue}>
      <ResultsContext.Provider value={resultsContextValue}>
        <ThemeProvider>
          <BaseStyles>
            <Box sx={{ minHeight: '100vh', bg: 'canvas.default' }}>
              <PageLayout>
                <PageLayout.Header>
                  <Box sx={{padding: 3, borderBottom: '1px solid', borderColor: 'border.default', bg: 'canvas.subtle' }}>
                    <Heading as="h1" sx={{fontSize: 4, fontWeight: 'semibold', color: 'fg.default'}}>GitHub Issues & PRs Viewer</Heading>
                  </Box>
                </PageLayout.Header>
                <PageLayout.Content sx={{ padding: 3 }}>
                  <SearchForm />
                  {!loading && filteredResults.length > 0 && <ResultsList />}
                  {loading && (
                    <Box sx={{maxWidth: '800px', margin: '32px auto', textAlign: 'center'}}>
                      <Spinner size="large" />
                      {loadingProgress && (
                        <Text sx={{ mt: 2, color: 'fg.muted' }}>{loadingProgress}</Text>
                      )}
                    </Box>
                  )}
                  {filteredResults.length === 0 && !loading && (
                    <Box sx={{maxWidth: '800px', margin: '24px auto', textAlign: 'center'}}>
                      <Text sx={{color: 'fg.default'}}>No results to display for the given criteria.</Text>
                    </Box>
                  )}
                </PageLayout.Content>
              </PageLayout>
            </Box>
          </BaseStyles>
        </ThemeProvider>
      </ResultsContext.Provider>
    </FormContext.Provider>
  );
}

// Simplified App component that uses the contexts
function App() {
  const { loading, loadingProgress } = useFormContext();
  const { filteredResults } = useResultsContext();

  return (
    <ThemeProvider>
      <BaseStyles>
        <Box sx={{ minHeight: '100vh', bg: 'canvas.default' }}>
          <PageLayout>
            <PageLayout.Header>
              <Box sx={{padding: 3, borderBottom: '1px solid', borderColor: 'border.default', bg: 'canvas.subtle' }}>
                <Heading as="h1" sx={{fontSize: 4, fontWeight: 'semibold', color: 'fg.default'}}>GitHub Issues & PRs Viewer</Heading>
              </Box>
            </PageLayout.Header>
            <PageLayout.Content sx={{ padding: 3 }}>
              <SearchForm />
              {!loading && filteredResults.length > 0 && <ResultsList />}
              {loading && (
                <Box sx={{maxWidth: '800px', margin: '32px auto', textAlign: 'center'}}>
                  <Spinner size="large" />
                  {loadingProgress && (
                    <Text sx={{ mt: 2, color: 'fg.muted' }}>{loadingProgress}</Text>
                  )}
                </Box>
              )}
              {filteredResults.length === 0 && !loading && (
                <Box sx={{maxWidth: '800px', margin: '24px auto', textAlign: 'center'}}>
                  <Text sx={{color: 'fg.default'}}>No results to display for the given criteria.</Text>
                </Box>
              )}
            </PageLayout.Content>
          </PageLayout>
        </Box>
      </BaseStyles>
    </ThemeProvider>
  );
}

export default AppWithContexts;
