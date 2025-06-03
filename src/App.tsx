import React, { useState, useCallback, useContext, createContext, memo, useEffect, useMemo } from 'react';
import { Box, Button, Flash, Text, Heading, Link, IconButton, ButtonGroup, Avatar, Stack, BranchName, Label, PageLayout } from '@primer/react';
import { GearIcon, GitPullRequestIcon, IssueOpenedIcon, XIcon, GitMergeIcon } from '@primer/octicons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css';
import { SlotMachineLoader } from './components/SlotMachineLoader';
import SearchForm from './components/SearchForm';
import SettingsDialog from './components/SettingsDialog';
import { GitHubItem, FormContextType, ResultsContextType } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { validateGitHubUsernames, isValidDateString, getParamFromUrl, updateUrlParams, validateUsernameList, getContrastColor, type BatchValidationResult } from './utils';

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

function useResultsContext() {
  const context = useContext(ResultsContext);
  if (!context) {
    throw new Error('useResultsContext must be used within a ResultsContextProvider');
  }
  return context;
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
              <Box sx={{ gap: 1 }}>
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
              </Box>

              {/* Status Filter UI */}
              <Box sx={{ gap: 1 }}>
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
              </Box>
            </Box>

            {/* Label Filters */}
            {availableLabels.length > 0 && (
              <Box sx={{ mt: 3 }}>
                {/* Inclusive Label Filter */}
                <Box sx={{ gap: 2 }}>
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
                </Box>

                {/* Exclusive Label Filter */}
                <Box sx={{ mt: 2, gap: 2 }}>
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
                </Box>
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
              <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
                {hasActiveFilters 
                  ? `${filteredResults.length} filtered / ${results.length} total`
                  : `${results.length} items`
                }
              </Text>
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
                            code: ({inline, ...props}: { inline?: boolean } & React.HTMLAttributes<HTMLElement>) => (
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

  // Helper functions for Set operations
  const addToValidated = useCallback((usernames: string[]) => {
    setValidatedUsernames(prevSet => {
      const newSet = new Set(prevSet);
      usernames.forEach(u => newSet.add(u));
      return newSet;
    });
  }, [setValidatedUsernames]);

  const addToInvalid = useCallback((usernames: string[]) => {
    setInvalidUsernames(prevSet => {
      const newSet = new Set(prevSet);
      usernames.forEach(u => newSet.add(u));
      return newSet;
    });
  }, [setInvalidUsernames]);

  const removeFromValidated = useCallback((username: string) => {
    setValidatedUsernames(prevSet => {
      const newSet = new Set(prevSet);
      newSet.delete(username);
      return newSet;
    });
  }, [setValidatedUsernames]);

  // Derived state
  const availableLabels = useMemo(() => {
    const labels = new Set<string>();
    if (Array.isArray(results)) {
      results.forEach(item => {
        item.labels?.forEach(label => labels.add(label.name));
      });
    }
    return Array.from(labels);
  }, [results]);

  const filteredResults = useMemo(() => {
    if (!Array.isArray(results)) {
      return [];
    }
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

    // Check if all usernames are already validated (skip API validation if so)
    const needValidation = usernames.filter(u => !validatedUsernames.has(u) && !invalidUsernames.has(u));
    const alreadyInvalid = usernames.filter(u => invalidUsernames.has(u));

    // If any usernames are known to be invalid, show error and don't proceed
    if (alreadyInvalid.length > 0) {
      setError(`Invalid GitHub username${alreadyInvalid.length > 1 ? 's' : ''}: ${alreadyInvalid.join(', ')}`);
      return;
    }

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

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilter('all');
    setStatusFilter('all');
    setSortOrder('updated');
    setLabelFilter('');
    setExcludedLabels([]);
    setSearchText('');
    setRepoFilters([]);
  }, [setFilter, setStatusFilter, setSortOrder, setLabelFilter, setExcludedLabels, setSearchText, setRepoFilters]);

  // Clipboard handler
  const copyResultsToClipboard = useCallback(() => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString();
    };

    let plainText = '';
    let htmlContent = '';

    if (isCompactView) {
      // Compact format
      plainText = filteredResults.map((item) => {
        const status = item.pull_request
          ? (item.pull_request.merged_at || item.merged) ? 'merged'
            : item.state
          : item.state;
        return `${item.title} (${status}) - ${item.html_url}`;
      }).join('\n');

      htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5;">
  <ul style="list-style-type: none; padding: 0; margin: 0;">
    ${filteredResults.map(item => {
      const status = item.pull_request
        ? (item.pull_request.merged_at || item.merged) ? 'merged'
          : item.state
        : item.state;
      const statusColor = 
        (item.pull_request?.merged_at || item.merged) ? '#8250df' :
        item.state === 'closed' ? '#cf222e' : '#1a7f37';
      
      return `
    <li style="margin: 4px 0;">
      <a href="${item.html_url}" style="color: #0969da; text-decoration: none;">${item.title}</a>
      <span style="color: ${statusColor}; margin-left: 8px;">(${status})</span>
    </li>`;
    }).join('')}
  </ul>
</div>`;
    } else {
      // Detailed format
      plainText = '';
      htmlContent = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Helvetica, Arial, sans-serif;">\n';

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
    }

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

export default App;
