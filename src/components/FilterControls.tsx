import React, { memo, useMemo } from 'react';
import { Box, Button, Text, Heading, ButtonGroup, TextInput, FormControl } from '@primer/react';
import { GitHubItem } from '../types';
import { FilterType, FilterValue } from '../utils/filterUtils';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Interface for the useResultsContext hook
interface UseResultsContextHookType {
  results: GitHubItem[];
  filteredResults: GitHubItem[];
  filter: 'all' | 'issue' | 'pr' | 'comment';
  statusFilter: 'all' | 'open' | 'closed' | 'merged';
  sortOrder: 'updated' | 'created';
  labelFilter: string;
  excludedLabels: string[];
  searchText: string;
  repoFilters: string[];
  availableLabels: string[];
  setFilter: (filter: 'all' | 'issue' | 'pr' | 'comment') => void;
  setStatusFilter: (filter: 'all' | 'open' | 'closed' | 'merged') => void;
  setSortOrder: (order: 'updated' | 'created') => void;
  setLabelFilter: (label: string) => void;
  setExcludedLabels: React.Dispatch<React.SetStateAction<string[]>>;
  setSearchText: (searchText: string) => void;
  toggleDescriptionVisibility: (id: number) => void;
  toggleExpand: (id: number) => void;
  copyResultsToClipboard: (format: 'detailed' | 'compact') => void;
  descriptionVisible: { [id: number]: boolean };
  expanded: { [id: number]: boolean };
  clipboardMessage: string | null;
  clearAllFilters: () => void;
  isCompactView: boolean;
  setIsCompactView: (compact: boolean) => void;
  selectedItems: Set<number>;
  selectAllItems: () => void;
  clearSelection: () => void;
  toggleItemSelection: (id: number) => void;
  setRepoFilters: React.Dispatch<React.SetStateAction<string[]>>;
}

// Props interface
interface FilterControlsProps {
  useResultsContext: () => UseResultsContextHookType;
  countItemsMatchingFilter: (
    items: GitHubItem[],
    filterType: FilterType,
    filterValue: FilterValue,
    excludedLabels: string[]
  ) => number;
  buttonStyles: any;
}

const FilterControls = memo(function FilterControls({
  useResultsContext,
  countItemsMatchingFilter,
  buttonStyles,
}: FilterControlsProps) {
  const {
    results,
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
    setSearchText,
    clearAllFilters,
    setRepoFilters,
    isCompactView,
    setIsCompactView,
  } = useResultsContext();

  // Collapsible state for filters
  const [areFiltersCollapsed, setAreFiltersCollapsed] = useLocalStorage(
    'github-events-filters-collapsed',
    false
  );

  // Helper to get base results for counting (before current filters but after other filters)
  const baseResults = useMemo(() => {
    return results || [];
  }, [results]);

  // Get unique repositories from all items
  const getUniqueRepositories = useMemo(() => {
    if (!Array.isArray(results)) return [];
    const repositories = results
      .map(item => {
        const repoUrl = item.repository_url;
        return repoUrl?.replace('https://api.github.com/repos/', '');
      })
      .filter(Boolean) as string[];

    return Array.from(new Set(repositories)).sort();
  }, [results]);

  // Handle repository filter changes
  const handleRepoFilterChange = (repo: string) => {
    setRepoFilters(prev => {
      if (prev.includes(repo)) {
        return prev.filter(r => r !== repo);
      } else {
        return [...prev, repo];
      }
    });
  };

  // Generate filter summary
  const getFilterSummary = () => {
    const summaryParts: string[] = [];
    if (filter !== 'all') {
      const filterName =
        filter === 'pr' ? 'PRs' : filter === 'comment' ? 'Comments' : 'Issues';
      summaryParts.push(`Type: ${filterName}`);
    }
    if (statusFilter !== 'all') {
      summaryParts.push(`Status: ${statusFilter}`);
    }
    if (labelFilter) {
      summaryParts.push(`Label: ${labelFilter}`);
    }
    if (excludedLabels.length > 0) {
      summaryParts.push(`Excluded: ${excludedLabels.join(', ')}`);
    }
    if (searchText) {
      summaryParts.push(`Search: "${searchText}"`);
    }
    if (repoFilters.length > 0) {
      summaryParts.push(`Repos: ${repoFilters.join(', ')}`);
    }
    return summaryParts.join(' • ');
  };

  // Check if any filters are applied
  const hasActiveFilters =
    filter !== 'all' ||
    statusFilter !== 'all' ||
    labelFilter !== '' ||
    excludedLabels.length > 0 ||
    searchText !== '' ||
    repoFilters.length > 0;

  return (
    <Box
      sx={{
        maxWidth: '1200px',
        margin: '16px auto',
        bg: 'canvas.subtle',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'border.default',
        overflow: 'hidden',
      }}
    >
      {/* Filters header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          p: 2,
          bg: 'canvas.default',
          borderBottom: '1px solid',
          borderColor: 'border.default',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Heading
            as="h2"
            sx={{
              fontSize: 2,
              fontWeight: 'semibold',
              color: 'fg.default',
              m: 0,
            }}
          >
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
              ':hover': { color: 'fg.default' },
            }}
          >
            {areFiltersCollapsed ? 'Show' : 'Hide'}
          </Button>
        </Box>
      </Box>

      {/* Filter Summary when collapsed */}
      {areFiltersCollapsed && hasActiveFilters && (
        <Box
          sx={{
            p: 2,
            bg: 'canvas.subtle',
            borderBottom: '1px solid',
            borderColor: 'border.default',
          }}
        >
          <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
            {getFilterSummary()}
          </Text>
        </Box>
      )}

      {/* Filter UI */}
      {!areFiltersCollapsed && (
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 3,
            }}
          >
            {/* Type Filter UI */}
            <Box sx={{ gap: 1 }}>
              <Heading
                as="h3"
                sx={{ fontSize: 1, fontWeight: 'semibold', color: 'fg.muted' }}
              >
                Type
              </Heading>
              <ButtonGroup>
                <Button
                  variant={filter === 'issue' ? 'primary' : 'default'}
                  onClick={() =>
                    setFilter(filter === 'issue' ? 'all' : 'issue')
                  }
                  size="small"
                  sx={buttonStyles}
                >
                  Issues (
                  {countItemsMatchingFilter(
                    baseResults,
                    'type',
                    'issue',
                    excludedLabels
                  )}
                  )
                </Button>
                <Button
                  variant={filter === 'pr' ? 'primary' : 'default'}
                  onClick={() => setFilter(filter === 'pr' ? 'all' : 'pr')}
                  size="small"
                  sx={buttonStyles}
                >
                  PRs (
                  {countItemsMatchingFilter(
                    baseResults,
                    'type',
                    'pr',
                    excludedLabels
                  )}
                  )
                </Button>
                <Button
                  variant={filter === 'comment' ? 'primary' : 'default'}
                  onClick={() =>
                    setFilter(filter === 'comment' ? 'all' : 'comment')
                  }
                  size="small"
                  sx={buttonStyles}
                >
                  Comments (
                  {countItemsMatchingFilter(
                    baseResults,
                    'type',
                    'comment',
                    excludedLabels
                  )}
                  )
                </Button>
              </ButtonGroup>
            </Box>

            {/* Status Filter UI */}
            <Box sx={{ gap: 1 }}>
              <Heading
                as="h3"
                sx={{ fontSize: 1, fontWeight: 'semibold', color: 'fg.muted' }}
              >
                Status
              </Heading>
              <ButtonGroup>
                <Button
                  variant={statusFilter === 'open' ? 'primary' : 'default'}
                  onClick={() =>
                    setStatusFilter(statusFilter === 'open' ? 'all' : 'open')
                  }
                  size="small"
                  sx={buttonStyles}
                >
                  Open (
                  {countItemsMatchingFilter(
                    baseResults,
                    'status',
                    'open',
                    excludedLabels
                  )}
                  )
                </Button>
                <Button
                  variant={statusFilter === 'closed' ? 'primary' : 'default'}
                  onClick={() =>
                    setStatusFilter(
                      statusFilter === 'closed' ? 'all' : 'closed'
                    )
                  }
                  size="small"
                  sx={buttonStyles}
                >
                  Closed (
                  {countItemsMatchingFilter(
                    baseResults,
                    'status',
                    'closed',
                    excludedLabels
                  )}
                  )
                </Button>
                <Button
                  variant={statusFilter === 'merged' ? 'primary' : 'default'}
                  onClick={() =>
                    setStatusFilter(
                      statusFilter === 'merged' ? 'all' : 'merged'
                    )
                  }
                  size="small"
                  sx={buttonStyles}
                >
                  Merged (
                  {countItemsMatchingFilter(
                    baseResults,
                    'status',
                    'merged',
                    excludedLabels
                  )}
                  )
                </Button>
              </ButtonGroup>
            </Box>

            {/* Search Text Filter */}
            <Box sx={{ gap: 1 }}>
              <Heading
                as="h3"
                sx={{ fontSize: 1, fontWeight: 'semibold', color: 'fg.muted' }}
              >
                Search
              </Heading>
              <FormControl>
                <FormControl.Label visuallyHidden>
                  Search in titles and descriptions
                </FormControl.Label>
                <TextInput
                  placeholder="Search in titles and descriptions..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  size="small"
                  sx={{ width: '100%' }}
                />
              </FormControl>
            </Box>

            {/* Sort Order */}
            <Box sx={{ gap: 1 }}>
              <Heading
                as="h3"
                sx={{ fontSize: 1, fontWeight: 'semibold', color: 'fg.muted' }}
              >
                Sort by
              </Heading>
              <ButtonGroup>
                <Button
                  variant={sortOrder === 'updated' ? 'primary' : 'default'}
                  onClick={() =>
                    setSortOrder(sortOrder === 'updated' ? 'created' : 'updated')
                  }
                  size="small"
                  sx={buttonStyles}
                >
                  Last Updated
                </Button>
                <Button
                  variant={sortOrder === 'created' ? 'primary' : 'default'}
                  onClick={() =>
                    setSortOrder(sortOrder === 'created' ? 'updated' : 'created')
                  }
                  size="small"
                  sx={buttonStyles}
                >
                  Creation Date
                </Button>
              </ButtonGroup>
            </Box>

            {/* View Options */}
            <Box sx={{ gap: 1 }}>
              <Heading
                as="h3"
                sx={{ fontSize: 1, fontWeight: 'semibold', color: 'fg.muted' }}
              >
                View
              </Heading>
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

          {/* Label Filters */}
          {availableLabels.length > 0 && (
            <Box sx={{ mt: 3 }}>
              {/* Inclusive Label Filter */}
              <Box sx={{ gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <Heading
                    as="h3"
                    sx={{
                      fontSize: 1,
                      fontWeight: 'semibold',
                      color: 'success.fg',
                    }}
                  >
                    Include Labels
                  </Heading>
                  <Text
                    as="span"
                    sx={{
                      fontSize: 0,
                      color: 'fg.muted',
                      fontWeight: 'normal',
                    }}
                  >
                    show items with selected label
                  </Text>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {availableLabels
                    .sort((a, b) =>
                      a.toLowerCase().localeCompare(b.toLowerCase())
                    )
                    .map(label => {
                      const currentCount = countItemsMatchingFilter(
                        baseResults,
                        'label',
                        label,
                        excludedLabels
                      );
                      const potentialCount = countItemsMatchingFilter(
                        results,
                        'label',
                        label,
                        excludedLabels
                      );
                      const hasMatches = currentCount > 0;
                      const hasPotentialMatches = potentialCount > 0;

                      return (
                        <Button
                          key={label}
                          size="small"
                          variant={
                            labelFilter === label ? 'primary' : 'default'
                          }
                          onClick={() =>
                            setLabelFilter(labelFilter === label ? '' : label)
                          }
                          sx={{
                            color: hasMatches ? 'fg.default' : 'fg.muted',
                            opacity:
                              !hasMatches || excludedLabels.includes(label)
                                ? 0.5
                                : 1,
                            cursor:
                              !hasPotentialMatches ||
                              excludedLabels.includes(label)
                                ? 'not-allowed'
                                : 'pointer',
                            textDecoration:
                              !hasMatches && hasPotentialMatches
                                ? 'line-through'
                                : 'none',
                            fontSize: 0,
                            py: 0,
                            height: '24px',
                          }}
                          disabled={
                            !hasPotentialMatches ||
                            excludedLabels.includes(label)
                          }
                          title={
                            !hasMatches && hasPotentialMatches
                              ? 'No matches with current filters'
                              : ''
                          }
                        >
                          {label} ({currentCount}
                          {currentCount !== potentialCount
                            ? ` / ${potentialCount}`
                            : ''}
                          )
                        </Button>
                      );
                    })}
                </Box>
              </Box>

              {/* Exclusive Label Filter */}
              <Box sx={{ mt: 2, gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <Heading
                    as="h3"
                    sx={{
                      fontSize: 1,
                      fontWeight: 'semibold',
                      color: 'danger.fg',
                    }}
                  >
                    Exclude Labels
                  </Heading>
                  <Text
                    as="span"
                    sx={{
                      fontSize: 0,
                      color: 'fg.muted',
                      fontWeight: 'normal',
                    }}
                  >
                    hide items with selected labels
                  </Text>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {availableLabels
                    .sort((a, b) =>
                      a.toLowerCase().localeCompare(b.toLowerCase())
                    )
                    .map(label => {
                      const currentCount = countItemsMatchingFilter(
                        baseResults,
                        'label',
                        label,
                        excludedLabels
                      );
                      const potentialCount = countItemsMatchingFilter(
                        results,
                        'label',
                        label,
                        []
                      );
                      const hasMatches = currentCount > 0;
                      const hasPotentialMatches = potentialCount > 0;

                      return (
                        <Button
                          key={label}
                          size="small"
                          variant={
                            excludedLabels.includes(label)
                              ? 'danger'
                              : 'default'
                          }
                          onClick={() => {
                            if (excludedLabels.includes(label)) {
                              setExcludedLabels(prev =>
                                prev.filter(l => l !== label)
                              );
                            } else {
                              setExcludedLabels(prev => [...prev, label]);
                              if (labelFilter === label) {
                                setLabelFilter('');
                              }
                            }
                          }}
                          sx={{
                            opacity:
                              !hasMatches || labelFilter === label ? 0.5 : 1,
                            cursor:
                              !hasPotentialMatches || labelFilter === label
                                ? 'not-allowed'
                                : 'pointer',
                            textDecoration:
                              !hasMatches && hasPotentialMatches
                                ? 'line-through'
                                : 'none',
                            fontSize: 0,
                            py: 0,
                            height: '24px',
                          }}
                          disabled={
                            !hasPotentialMatches || labelFilter === label
                          }
                          title={
                            !hasMatches && hasPotentialMatches
                              ? 'No matches with current filters'
                              : ''
                          }
                        >
                          {label} ({currentCount}
                          {currentCount !== potentialCount
                            ? ` / ${potentialCount}`
                            : ''}
                          )
                        </Button>
                      );
                    })}
                </Box>
              </Box>
            </Box>
          )}

          {/* Repository Filter */}
          {getUniqueRepositories.length > 0 && (
            <Box sx={{ mt: 3, gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <Heading
                  as="h3"
                  sx={{
                    fontSize: 1,
                    fontWeight: 'semibold',
                    color: 'fg.muted',
                  }}
                >
                  Repositories
                </Heading>
                <Text
                  as="span"
                  sx={{ fontSize: 0, color: 'fg.muted', fontWeight: 'normal' }}
                >
                  filter by repository
                </Text>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {getUniqueRepositories.map(repo => {
                  const currentCount = countItemsMatchingFilter(
                    baseResults,
                    'repo',
                    repo,
                    excludedLabels
                  );
                  const potentialCount = countItemsMatchingFilter(
                    results,
                    'repo',
                    repo,
                    excludedLabels
                  );
                  const hasMatches = currentCount > 0;
                  const hasPotentialMatches = potentialCount > 0;

                  return (
                    <Button
                      key={repo}
                      size="small"
                      variant={
                        repoFilters.includes(repo) ? 'primary' : 'default'
                      }
                      onClick={() => handleRepoFilterChange(repo)}
                      sx={{
                        color: hasMatches ? 'fg.default' : 'fg.muted',
                        opacity: !hasMatches ? 0.5 : 1,
                        cursor: !hasPotentialMatches
                          ? 'not-allowed'
                          : 'pointer',
                        textDecoration:
                          !hasMatches && hasPotentialMatches
                            ? 'line-through'
                            : 'none',
                        fontSize: 0,
                        py: 0,
                        height: '24px',
                        ':hover:not([disabled])': {
                          bg: repoFilters.includes(repo)
                            ? 'btn.primary.hoverBg'
                            : 'btn.hoverBg',
                        },
                      }}
                      disabled={!hasPotentialMatches}
                      title={
                        !hasMatches && hasPotentialMatches
                          ? 'No matches with current filters'
                          : ''
                      }
                    >
                      {repo} ({currentCount}
                      {currentCount !== potentialCount
                        ? ` / ${potentialCount}`
                        : ''}
                      )
                    </Button>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
});

export default FilterControls;
