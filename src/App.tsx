import { useState, useEffect, useCallback, createContext, useContext, memo, useMemo } from 'react';
import type { FormEvent } from 'react'; // Changed to type-only import
import './App.css';
import { TextInput, Button, Box, Text, Link, Label, PageLayout, Flash, Spinner } from '@primer/react';
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
  setUsername: (value: string) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
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
  statusFilter: 'all' | 'open' | 'closed';
  sortOrder: 'updated' | 'created';  // Add sort order
  labelFilter: string;
  searchText: string;
  repoFilters: string[];
  availableLabels: string[];
  availableRepos: string[];
  stats: {
    total: number;
    issues: number;
    prs: number;
    open: number;
    closed: number;
  };
  setFilter: (filter: 'all' | 'issue' | 'pr') => void;
  setStatusFilter: (status: 'all' | 'open' | 'closed') => void;
  setSortOrder: (sort: 'updated' | 'created') => void;  // Add sort order setter
  setLabelFilter: (filter: string) => void;
  setSearchText: (text: string) => void;
  setRepoFilters: (repos: string[]) => void;
  toggleDescriptionVisibility: (id: number) => void;
  toggleExpand: (id: number) => void;
  copyResultsToClipboard: () => void;
  descriptionVisible: { [id: number]: boolean };
  expanded: { [id: number]: boolean };
  clipboardMessage: string | null;
}

const ResultsContext = createContext<ResultsContextType | null>(null);

function useResultsContext() {
  const context = useContext(ResultsContext);
  if (!context) {
    throw new Error('useResultsContext must be used within a ResultsContextProvider');
  }
  return context;
}

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

  // Debounced handler for localStorage (defined at component level to avoid recreating on each render)
  const debouncedSaveToLocalStorage = useCallback(
    debounce((key: string, value: string) => {
      localStorage.setItem(key, value);
    }, 500),
    []
  );

  // Handle username input with optimized performance
  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    setUsername(newUsername);
    debouncedSaveToLocalStorage('github-username', newUsername);
  }, [debouncedSaveToLocalStorage, setUsername]);

  return (
    <>
      <Box sx={{maxWidth: '800px', margin: '0 auto'}}>
        <Box as="form" 
          sx={{display: 'flex', flexDirection: 'column', gap: 3}} 
          onSubmit={(e: FormEvent<HTMLFormElement>) => { 
            e.preventDefault(); 
            handleSearch(); 
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Text as="label" htmlFor="username" sx={{ fontWeight: 'bold', fontSize: 1 }}>GitHub Username(s)</Text>
            <TextInput
              id="username"
              aria-label="GitHub Usernames"
              name="username"
              placeholder="Enter usernames (comma-separated for multiple)"
              value={username}
              onChange={handleUsernameChange}
              sx={{width: '100%'}}
              block
            />
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Text as="label" htmlFor="startDate" sx={{ fontWeight: 'bold', fontSize: 1 }}>Start Date</Text>
            <TextInput
              id="startDate"
              aria-label="Start Date"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              sx={{width: '100%'}}
              block
            />
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Text as="label" htmlFor="endDate" sx={{ fontWeight: 'bold', fontSize: 1 }}>End Date</Text>
            <TextInput
              id="endDate"
              aria-label="End Date"
              name="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              sx={{width: '100%'}}
              block
            />
          </Box>
          
          <Button variant="primary" type="submit" sx={{width: '100%', mt: 1}}>Search</Button>
        </Box>
        {error && (
          <Flash variant="danger" sx={{marginTop: 3}}>
            {error}
          </Flash>
        )}
      </Box>

      {loading && (
        <Box sx={{maxWidth: '800px', margin: '32px auto', textAlign: 'center'}}>
          <Spinner size="large" />
          {loadingProgress && (
            <Text sx={{ mt: 2, color: 'fg.muted' }}>{loadingProgress}</Text>
          )}
        </Box>
      )}
    </>
  );
});

// ResultsList component wrapped in memo to prevent unnecessary re-renders when form state changes
const ResultsList = memo(function ResultsList() {
  const {
    filteredResults,
    filter,
    statusFilter,
    sortOrder,
    labelFilter,
    availableLabels,
    availableRepos,
    repoFilters,
    searchText,
    setFilter,
    setStatusFilter,
    setSortOrder,
    setLabelFilter,
    setSearchText,
    setRepoFilters,
    stats,
    toggleDescriptionVisibility,
    toggleExpand,
    copyResultsToClipboard,
    descriptionVisible,
    expanded,
    clipboardMessage
  } = useResultsContext();

  return (
    <>
      {/* Type Filter UI */}
      <Box sx={{maxWidth: '800px', margin: '24px auto 0', display: 'flex', gap: 2, alignItems: 'center'}}>
        <Text as="span" sx={{fontWeight: 'bold'}}>Type:</Text>
        <Button variant={filter === 'all' ? 'primary' : 'default'} onClick={() => setFilter('all')}>All</Button>
        <Button variant={filter === 'issue' ? 'primary' : 'default'} onClick={() => setFilter('issue')}>Issues</Button>
        <Button variant={filter === 'pr' ? 'primary' : 'default'} onClick={() => setFilter('pr')}>PRs</Button>
      </Box>

      {/* Status Filter UI */}
      <Box sx={{maxWidth: '800px', margin: '16px auto 0', display: 'flex', gap: 2, alignItems: 'center'}}>
        <Text as="span" sx={{fontWeight: 'bold'}}>Status:</Text>
        <Button variant={statusFilter === 'all' ? 'primary' : 'default'} onClick={() => setStatusFilter('all')}>All</Button>
        <Button variant={statusFilter === 'open' ? 'primary' : 'default'} onClick={() => setStatusFilter('open')}>Open</Button>
        <Button variant={statusFilter === 'closed' ? 'primary' : 'default'} onClick={() => setStatusFilter('closed')}>Closed</Button>
      </Box>

      {/* Sort Order UI */}
      <Box sx={{maxWidth: '800px', margin: '16px auto 0', display: 'flex', gap: 2, alignItems: 'center'}}>
        <Text as="span" sx={{fontWeight: 'bold'}}>Sort by:</Text>
        <Button 
          variant={sortOrder === 'updated' ? 'primary' : 'default'} 
          onClick={() => setSortOrder('updated')}
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M2.5 3.5v3h3v-3h-3zM2 2a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V3a1 1 0 00-1-1H2zm4.655 8.595a.75.75 0 010 1.06L4.03 14.28a.75.75 0 01-1.06 0l-2.625-2.625a.75.75 0 011.06-1.06l2.095 2.095 2.095-2.095a.75.75 0 011.06 0z"/>
          </svg>
          Last Updated
        </Button>
        <Button 
          variant={sortOrder === 'created' ? 'primary' : 'default'} 
          onClick={() => setSortOrder('created')}
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M8 3.5a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 018 3.5z"/>
          </svg>
          Creation Date
        </Button>
      </Box>

      {/* Label-Filter UI */}
      {availableLabels.length > 0 && (
        <Box sx={{maxWidth: '800px', margin: '16px auto 0', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap'}}>
          <Text as="span" sx={{fontWeight: 'bold'}}>Label Filter:</Text>
          <Button
            size="small"
            variant={labelFilter === '' ? 'primary' : 'default'}
            onClick={() => setLabelFilter('')}
          >All</Button>
          {availableLabels.map(label => (
            <Button
              key={label}
              size="small"
              variant={labelFilter === label ? 'primary' : 'default'}
              onClick={() => setLabelFilter(label)}
              sx={{bg: labelFilter === label ? undefined : undefined, color: 'fg.default'}}
            >{label}</Button>
          ))}
        </Box>
      )}

      {/* Repository Filter UI */}
      {availableRepos.length > 0 && (
        <Box sx={{maxWidth: '800px', margin: '16px auto 0'}}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Text as="span" sx={{ fontWeight: 'bold', fontSize: 1 }}>Repository Filter:</Text>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                size="small"
                variant={repoFilters.length === 0 ? 'primary' : 'default'}
                onClick={() => setRepoFilters([])}
              >
                All Repositories
              </Button>
              {availableRepos.map(repo => (
                <Button
                  key={repo}
                  size="small"
                  variant={repoFilters.includes(repo) ? 'primary' : 'default'}
                  onClick={() => {
                    if (repoFilters.includes(repo)) {
                      // Remove from selection
                      setRepoFilters((prev: string[]) => prev.filter((r: string) => r !== repo));
                    } else {
                      // Add to selection
                      setRepoFilters([...repoFilters, repo]);
                    }
                  }}
                  sx={{
                    borderColor: repoFilters.includes(repo) ? 'accent.emphasis' : 'border.default',
                    color: 'fg.default'
                  }}
                >
                  {repo.split('/')[1] || repo} {/* Show only repo name, not owner/repo */}
                </Button>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Text Search */}
      <Box sx={{maxWidth: '800px', margin: '16px auto 0'}}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Text as="label" htmlFor="searchText" sx={{ fontWeight: 'bold', fontSize: 1 }}>Text Search</Text>
          <TextInput
            id="searchText"
            aria-label="Text Search"
            name="searchText"
            placeholder="Search in title and description..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            leadingVisual={() => (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                <path fillRule="evenodd" d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"></path>
              </svg>
            )}
            trailingAction={searchText ? (
              <TextInput.Action onClick={() => setSearchText('')} aria-label="Reset search">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                  <path fillRule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"></path>
                </svg>
              </TextInput.Action>
            ) : undefined}
            sx={{width: '100%'}}
            block
          />
        </Box>
      </Box>

      {filteredResults.length > 0 && (
        <Box sx={{maxWidth: '800px', margin: '24px auto'}}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            borderBottom: '1px solid',
            borderColor: 'border.default',
            pb: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Text as="h2" sx={{fontSize: 3, fontWeight: 'semibold', color: 'fg.default'}}>Results</Text>
              {clipboardMessage && (
                <Flash variant="success" sx={{ py: 1, px: 2 }}>
                  {clipboardMessage}
                </Flash>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button 
                onClick={copyResultsToClipboard}
                variant="default"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  fontSize: 1,
                  borderColor: 'border.default'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }}>
                  <path fillRule="evenodd" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path>
                  <path fillRule="evenodd" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path>
                </svg>
                Export to Clipboard
              </Button>
              <Box sx={{display: 'flex', gap: 3}}>
                <Box sx={{textAlign: 'center'}}>
                  <Text sx={{fontSize: 4, fontWeight: 'bold', color: 'fg.default'}}>{stats.total}</Text>
                  <Text sx={{fontSize: 1, color: 'fg.muted'}}>Total</Text>
                </Box>
                <Box sx={{textAlign: 'center'}}>
                  <Text sx={{fontSize: 4, fontWeight: 'bold', color: 'accent.fg'}}>{stats.issues}</Text>
                  <Text sx={{fontSize: 1, color: 'fg.muted'}}>Issues</Text>
                </Box>
                <Box sx={{textAlign: 'center'}}>
                  <Text sx={{fontSize: 4, fontWeight: 'bold', color: 'success.fg'}}>{stats.prs}</Text>
                  <Text sx={{fontSize: 1, color: 'fg.muted'}}>PRs</Text>
                </Box>
                <Box sx={{textAlign: 'center'}}>
                  <Text sx={{fontSize: 4, fontWeight: 'bold', color: 'success.fg'}}>{stats.open}</Text>
                  <Text sx={{fontSize: 1, color: 'fg.muted'}}>Open</Text>
                </Box>
                <Box sx={{textAlign: 'center'}}>
                  <Text sx={{fontSize: 4, fontWeight: 'bold', color: 'done.fg'}}>{stats.closed}</Text>
                  <Text sx={{fontSize: 1, color: 'fg.muted'}}>Closed</Text>
                </Box>
              </Box>
            </Box>
          </Box>
          <Box>
            {filteredResults.map((item) => (
              <Box key={item.id} sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, p: 3, mb: 3, bg: 'canvas.subtle' }}>
                {/* Replace the project info section */}
                <Box sx={{mb: 2, display: 'flex', alignItems: 'center', gap: 2}}>
                  <img 
                    src={item.user.avatar_url} 
                    alt={`${item.user.login}'s avatar`}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: '1px solid var(--color-border-default)'
                    }}
                  />
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
                </Box>
                <Link href={item.html_url} target="_blank" rel="noopener noreferrer" sx={{display: 'block', mb: 1}}>
                  <Text sx={{fontWeight: 'semibold', fontSize: 2, color: 'accent.fg'}}>{item.title}</Text>
                </Link>
                <Box sx={{display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap'}}>
                  <Label variant={item.pull_request ? 'success' : 'accent' as PrimerLabelVariant}>
                    {item.pull_request ? 'PR' : 'Issue'}
                  </Label>
                  {/* Enhanced state labels with distinct colors */}
                  {item.pull_request ? (
                    item.state === 'closed' ? (
                      item.merged ? (
                        <Label variant="sponsors" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd" d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5-6.5a.75.75 0 100-1.5.75.75 0 000 1.5zM5.75 15.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                          </svg>
                          Merged
                        </Label>
                      ) : (
                        <Label variant="done" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd" d="M2.343 13.657A8 8 0 1113.657 2.343 8 8 0 012.343 13.657zM6.03 4.97a.75.75 0 00-1.06 1.06L6.94 8 4.97 9.97a.75.75 0 101.06 1.06L8 9.06l1.97 1.97a.75.75 0 101.06-1.06L9.06 8l1.97-1.97a.75.75 0 10-1.06-1.06L8 6.94 6.03 4.97z" />
                          </svg>
                          Closed
                        </Label>
                      )
                    ) : (
                      <Label variant="success" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path fillRule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
                        </svg>
                        Open PR
                      </Label>
                    )
                  ) : (
                    item.state === 'closed' ? (
                      <Label variant="done" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path fillRule="evenodd" d="M1.5 8a6.5 6.5 0 0110.65-5.003.75.75 0 00.959-1.153 8 8 0 102.592 8.33.75.75 0 10-1.444-.407A6.5 6.5 0 011.5 8zM8 12a1 1 0 100-2 1 1 0 000 2zm0-8a.75.75 0 01.75.75v3.5a.75.75 0 11-1.5 0v-3.5A.75.75 0 018 4zm4.78 4.28l3-3a.75.75 0 00-1.06-1.06l-2.47 2.47-.97-.97a.749.749 0 10-1.06 1.06l1.5 1.5a.75.75 0 001.06 0z" />
                        </svg>
                        Closed Issue
                      </Label>
                    ) : (
                      <Label variant="success" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z" />
                        </svg>
                        Open Issue
                      </Label>
                    )
                  )}
                  {/* Display labels nicely */}
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
                    >{l.name}</Label>
                  ))}
                </Box>
                <Box sx={{fontSize: 0, color: 'fg.muted', mt: 2, display: 'flex', alignItems: 'center', gap: 3}}>
                  <Box sx={{display: 'flex', gap: 2}}>
                    <Text>Created: {new Date(item.created_at).toLocaleDateString()}</Text>
                    <Text>Updated: {new Date(item.updated_at).toLocaleDateString()}</Text>
                  </Box>
                  {item.body && (
                    <Button 
                      size="small" 
                      variant={descriptionVisible[item.id] ? "primary" : "default"}
                      onClick={() => toggleDescriptionVisibility(item.id)}
                      sx={{ ml: 'auto' }}
                    >
                      {descriptionVisible[item.id] ? 'Hide description' : 'Show description'}
                    </Button>
                  )}
                </Box>
                
                {/* Description shown only on demand */}
                {item.body && descriptionVisible[item.id] && (
                  <Box sx={{
                    maxHeight: expanded[item.id] ? 'none' : '200px',
                    overflow: 'hidden',
                    position: 'relative',
                    mt: 2,
                    bg: 'canvas.default',
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'border.muted',
                    fontSize: 1,
                    color: 'fg.muted',
                  }}><pre>
                    {JSON.stringify(item)}
                  </pre>
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
                        code: ({node, inline, ...props}: {node: any, inline?: boolean, [key: string]: any}) => (
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
                    {!expanded[item.id] && item.body.length > 400 && (
                      <Box sx={{
                        position: 'absolute', 
                        bottom: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '3em', 
                        background: 'linear-gradient(to bottom, transparent, var(--color-canvas-default) 90%)'
                      }} />
                    )}
                    
                    {item.body.length > 400 && (
                      <Button 
                        size="small" 
                        variant="invisible" 
                        onClick={() => toggleExpand(item.id)}
                        sx={{ mt: 1 }}
                      >
                        {expanded[item.id] ? 'Show less' : 'Show more'}
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}
      {filteredResults.length === 0 && (
        <Box sx={{maxWidth: '800px', margin: '24px auto', textAlign: 'center'}}>
             <Text sx={{color: 'fg.default'}}>No results to display for the given criteria.</Text>
        </Box>
      )}
    </>
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>(() => 
    (localStorage.getItem('status-filter') as 'all' | 'open' | 'closed') || 'all'
  );
  const [sortOrder, setSortOrder] = useState<'updated' | 'created'>(() => 
    (localStorage.getItem('sort-order') as 'updated' | 'created') || 'updated'
  );

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
  }, [startDate, endDate, results, filter, labelFilter, searchText, availableLabels, availableRepos, repoFilters, expanded, descriptionVisible, statusFilter, sortOrder]);

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
            `https://api.github.com/search/issues?q=author:${encodeURIComponent(currentUsername)}+created:${startDate}..${endDate}&per_page=100&page=${page}`
          );
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to fetch page ${page} for ${currentUsername}`);
          }
          
          const data = await response.json();
          const items = data.items || [];
          
          // Fetch additional PR details for merged_at information
          const prDetailsPromises = items
            .filter((item: GitHubItem) => item.pull_request)
            .map(async (pr: GitHubItem) => {
              try {
                if (pr.pull_request?.url) {
                  const prResponse = await fetch(pr.pull_request.url);
                  if (prResponse.ok) {
                    const prData = await prResponse.json();
                    pr.merged = prData.merged;
                    pr.merged_at = prData.merged_at;
                    pr.closed_at = prData.closed_at;
                  }
                }
                return pr;
              } catch (error) {
                console.error(`Error fetching PR details for #${pr.number}:`, error);
                return pr;
              }
            });
          
          // Wait for all PR detail requests
          await Promise.all(prDetailsPromises);
          
          // Process items from this page
          items.forEach((item: GitHubItem) => {
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

  // Memoize the filteredResults to prevent recalculations on form changes
  const filteredResults = useMemo(() => {
    const filtered = results.filter(item => {
      // Type filter (Issue or PR)
      const typeMatch = 
        filter === 'all' ? true : 
        filter === 'pr' ? !!item.pull_request : 
        !item.pull_request;
      
      // Status filter
      const statusMatch = 
        statusFilter === 'all' ? true :
        statusFilter === item.state;
      
      // Label filter
      const labelMatch = labelFilter ? item.labels?.some(l => l.name === labelFilter) : true;
      
      // Repository filter - if repo filters are selected, only show items from those repos
      const repoMatch = repoFilters.length === 0 ? true : (
        item.repository_url && repoFilters.includes(
          item.repository_url.replace('https://api.github.com/repos/', '')
        )
      );
      
      // Text filter (search in title and description)
      const searchMatch = searchText.trim() === '' ? true : (
        (item.title?.toLowerCase().includes(searchText.toLowerCase()) || 
         item.body?.toLowerCase().includes(searchText.toLowerCase()))
      );
      
      return typeMatch && statusMatch && labelMatch && repoMatch && searchMatch;
    });

    // Sort the filtered results
    return [...filtered].sort((a, b) => {
      const dateA = new Date(sortOrder === 'updated' ? a.updated_at : a.created_at);
      const dateB = new Date(sortOrder === 'updated' ? b.updated_at : b.created_at);
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });
  }, [results, filter, statusFilter, labelFilter, repoFilters, searchText, sortOrder]);

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

  // Format the filtered results for export to clipboard
  const formatResultsForExport = useCallback((items: GitHubItem[]): string => {
    const dateRangeInfo = `GitHub activity from ${startDate} to ${endDate}`;
    const statsInfo = `Total: ${stats.total} (Issues: ${stats.issues}, PRs: ${stats.prs}, Open: ${stats.open}, Closed: ${stats.closed})`;
    
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
      
      // Format the description if available, with a character limit to prevent excessively long exports
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

  // Copy formatted results to clipboard
  const copyResultsToClipboard = useCallback(async () => {
    try {
      const formattedText = formatResultsForExport(filteredResults);
      await navigator.clipboard.writeText(formattedText);
      setClipboardMessage('Results copied to clipboard!');
      
      // Clear the message after 3 seconds
      setTimeout(() => {
        setClipboardMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setClipboardMessage('Failed to copy to clipboard. Please try again.');
      
      // Clear the error message after 3 seconds
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
    setUsername,
    setStartDate,
    setEndDate,
    handleSearch: fetchGitHubData,
    loading,
    loadingProgress,
    error
  }), [username, startDate, endDate, loading, loadingProgress, error]);

  // Memoized results context value to prevent unnecessary re-renders
  const resultsContextValue = useMemo(() => ({
    results,
    filteredResults,
    filter,
    statusFilter,
    sortOrder,
    labelFilter,
    searchText,
    repoFilters,
    availableLabels,
    availableRepos,
    stats,
    setFilter,
    setStatusFilter,
    setSortOrder,
    setLabelFilter,
    setSearchText,
    setRepoFilters,
    toggleDescriptionVisibility,
    toggleExpand,
    copyResultsToClipboard,
    descriptionVisible,
    expanded,
    clipboardMessage
  }), [
    results, 
    filteredResults, 
    filter, 
    statusFilter, 
    sortOrder,
    labelFilter, 
    searchText, 
    repoFilters, 
    availableLabels, 
    availableRepos, 
    stats, 
    toggleDescriptionVisibility, 
    toggleExpand, 
    copyResultsToClipboard, 
    descriptionVisible, 
    expanded, 
    clipboardMessage
  ]);

  return (
    <FormContext.Provider value={formContextValue}>
      <ResultsContext.Provider value={resultsContextValue}>
        <App />
      </ResultsContext.Provider>
    </FormContext.Provider>
  );
}

// Simplified App component that uses the contexts
function App() {
  const { loading, loadingProgress } = useFormContext();
  const { filteredResults } = useResultsContext();

  return (
    <Box sx={{ minHeight: '100vh', bg: 'canvas.default' }}>
      <PageLayout>
        <PageLayout.Header>
          <Box sx={{padding: 3, borderBottom: '1px solid', borderColor: 'border.default', bg: 'canvas.subtle' }}>
            <Text as="h1" sx={{fontSize: 4, fontWeight: 'semibold', color: 'fg.default'}}>GitHub Issues & PRs Viewer</Text>
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
  );
}

export default AppWithContexts;
