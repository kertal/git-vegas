import React, { memo, useMemo, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Flash,
  Text,
  Heading,
  Link,
  ButtonGroup,
  Avatar,
  Stack,
  Label,
  Checkbox,
  ActionMenu,
  ActionList,
  Dialog,
  IconButton,
  SelectPanel,
  FormControl,
  ActionBar,
} from '@primer/react';
import {
  GitPullRequestIcon,
  IssueOpenedIcon,
  XIcon,
  GitMergeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  TriangleDownIcon,
  FilterIcon,
  ChevronDownIcon,
  ChevronRightIcon as ChevronRightIconCollapse,
  PasteIcon,
} from '@primer/octicons-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getContrastColor } from '../utils';
import { GitHubItem } from '../types';
import { FilterType, FilterValue } from '../utils/filterUtils';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { type ActionListItemInput } from '@primer/react/deprecated';

// Import context hook and helper functions from App.tsx
interface UseResultsContextHookType {
  results: GitHubItem[];
  filteredResults: GitHubItem[];
  filter: 'all' | 'issue' | 'pr' | 'comment';
  statusFilter: 'all' | 'open' | 'closed' | 'merged';
  includedLabels: string[];
  excludedLabels: string[];
  searchText: string;
  repoFilters: string[];
  availableLabels: string[];
  setFilter: (filter: 'all' | 'issue' | 'pr' | 'comment') => void;
  setStatusFilter: (filter: 'all' | 'open' | 'closed' | 'merged') => void;
  setIncludedLabels: React.Dispatch<React.SetStateAction<string[]>>;
  setExcludedLabels: React.Dispatch<React.SetStateAction<string[]>>;
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
interface ResultsListProps {
  useResultsContext: () => UseResultsContextHookType;
  countItemsMatchingFilter: (
    items: GitHubItem[],
    filterType: FilterType,
    filterValue: FilterValue,
    excludedLabels: string[]
  ) => number;
  buttonStyles: React.CSSProperties;
}

// Add new interface for the description dialog
interface DescriptionDialogProps {
  item: GitHubItem | null;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}



const DescriptionDialog = memo(function DescriptionDialog({
  item,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: DescriptionDialogProps) {
  // Add keyboard navigation
  React.useEffect(() => {
    if (!item) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && hasNext) {
        onNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onPrevious, onNext, onClose, hasPrevious, hasNext]);

  if (!item) return null;

  return (
    <Dialog
      onClose={onClose}
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: ['100%', '100%', '600px'],
        maxWidth: '800px',
        height: '100vh',
        margin: 0,
        borderRadius: 0,
        borderLeft: '1px solid',
        borderColor: 'border.default',
      }}
      role="dialog"
    >
      <Dialog.Header>
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}
        >
          {item.pull_request ? (
            item.pull_request.merged_at ? (
              <Box sx={{ color: 'done.fg' }}>
                <GitMergeIcon size={16} />
              </Box>
            ) : item.state === 'closed' ? (
              <Box sx={{ color: 'closed.fg' }}>
                <GitPullRequestIcon size={16} />
              </Box>
            ) : (
              <Box sx={{ color: 'open.fg' }}>
                <GitPullRequestIcon size={16} />
              </Box>
            )
          ) : (
            <Box
              sx={{ color: item.state === 'closed' ? 'closed.fg' : 'open.fg' }}
            >
              <IssueOpenedIcon size={16} />
            </Box>
          )}
          <Text sx={{ flex: 1, fontWeight: 'bold', fontSize: 2 }}>
            {item.title}
          </Text>
        </Box>
      </Dialog.Header>

      <Box
        sx={{
          p: 3,
          height: 'calc(100vh - 120px)',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            fontSize: 1,
            color: 'fg.muted',
          }}
        >
          <Avatar src={item.user.avatar_url} size={20} />
          <Link
            href={item.user.html_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.user.login}
          </Link>
          <Text>•</Text>
          <Link href={item.html_url} target="_blank" rel="noopener noreferrer">
            {new URL(item.html_url).pathname}
          </Link>
        </Box>

        <Box
          sx={{
            bg: 'canvas.default',
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'border.default',
            fontSize: 1,
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ ...props }) => (
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: 'accent.fg' }}
                  {...props}
                />
              ),
              pre: ({ ...props }) => (
                <Box
                  as="pre"
                  sx={{
                    bg: 'canvas.subtle',
                    p: 2,
                    borderRadius: 1,
                    overflowX: 'auto',
                    fontSize: 0,
                    border: '1px solid',
                    borderColor: 'border.muted',
                  }}
                  {...props}
                />
              ),
              code: ({
                inline,
                ...props
              }: { inline?: boolean } & React.HTMLAttributes<HTMLElement>) =>
                inline ? (
                  <Box
                    as="code"
                    sx={{
                      bg: 'canvas.subtle',
                      p: '2px 4px',
                      borderRadius: 1,
                      fontSize: 0,
                    }}
                    {...props}
                  />
                ) : (
                  <Box
                    as="code"
                    sx={{ display: 'block', fontSize: 0 }}
                    {...props}
                  />
                ),
              img: ({ ...props }) => (
                <Box
                  as="img"
                  sx={{ maxWidth: '100%', height: 'auto' }}
                  {...props}
                />
              ),
            }}
          >
            {item.body || '*No description provided*'}
          </ReactMarkdown>
        </Box>
      </Box>

      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          p: 3,
          borderTop: '1px solid',
          borderColor: 'border.default',
          bg: 'canvas.default',
          display: 'flex',
          gap: 2,
          justifyContent: 'space-between',
        }}
      >
        <IconButton
          icon={ChevronLeftIcon}
          aria-label="Previous item"
          onClick={onPrevious}
          disabled={!hasPrevious}
          sx={{ color: hasPrevious ? 'fg.default' : 'fg.muted' }}
        />
        <IconButton
          icon={ChevronRightIcon}
          aria-label="Next item"
          onClick={onNext}
          disabled={!hasNext}
          sx={{ color: hasNext ? 'fg.default' : 'fg.muted' }}
        />
      </Box>
    </Dialog>
  );
});

const ResultsList = memo(function ResultsList({
  useResultsContext,
  countItemsMatchingFilter,
  buttonStyles,
}: ResultsListProps) {
  const {
    results,
    filteredResults,
    filter,
    statusFilter,
    includedLabels = [],
    excludedLabels = [],
    searchText,
    repoFilters = [],
    availableLabels,
    setFilter,
    setStatusFilter,
    setIncludedLabels,
    setExcludedLabels,
    copyResultsToClipboard,
    clipboardMessage,
    clearAllFilters,
    isCompactView,
    setIsCompactView,
    selectedItems,
    toggleItemSelection,
    setRepoFilters,
  } = useResultsContext();

  // Add state for filter collapse with localStorage persistence
  const [areFiltersCollapsed, setAreFiltersCollapsed] = useLocalStorage(
    'github-filters-collapsed',
    false
  );

  // Add state for filters active/inactive toggle
  const [areFiltersActive, setAreFiltersActive] = useLocalStorage(
    'github-filters-active',
    true
  );

  // Add state for the description dialog
  const [selectedItemForDialog, setSelectedItemForDialog] =
    useState<GitHubItem | null>(null);

  // Add state for SelectPanel components
  const [includeLabelsOpen, setIncludeLabelsOpen] = useState(false);
  const [excludeLabelsOpen, setExcludeLabelsOpen] = useState(false);
  const [includeLabelFilter, setIncludeLabelFilter] = useState('');
  const [excludeLabelFilter, setExcludeLabelFilter] = useState('');

  // Handle repository filter changes
  const handleRepoFilterChange = useCallback(
    (repo: string) => {
      if (!setRepoFilters) {
        console.error('setRepoFilters is not available');
        return;
      }

      setRepoFilters(prev => {
        if (prev.includes(repo)) {
          return prev.filter(r => r !== repo);
        } else {
          return [...prev, repo];
        }
      });
    },
    [setRepoFilters]
  );

  // Helper to check if any filters are configured
  const hasConfiguredFilters =
    filter !== 'all' ||
    statusFilter !== 'all' ||
    includedLabels.length > 0 ||
    searchText !== '' ||
    repoFilters.length > 0 ||
    excludedLabels.length > 0;

  // Helper to check if any filters are active (configured AND enabled)
  const hasActiveFilters = areFiltersActive && hasConfiguredFilters;

  // Function to generate filter summary text
  const getFilterSummary = () => {
    const summaryParts = [];

    if (filter !== 'all') {
      summaryParts.push(`Type: ${filter === 'pr' ? 'PRs' : 'Issues'}`);
    }
    if (statusFilter !== 'all') {
      summaryParts.push(`Status: ${statusFilter}`);
    }
    if (includedLabels.length > 0) {
      summaryParts.push(`Include: ${includedLabels.join(', ')}`);
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
              const labelMatch = includedLabels.length === 0
        ? true
        : includedLabels.every(requiredLabel =>
          item.labels?.some((l: { name: string }) => l.name === requiredLabel)
        );
      const excludeMatch =
        excludedLabels.length === 0
          ? true
          : !item.labels?.some((l: { name: string }) => excludedLabels.includes(l.name));
      const repoMatch =
        repoFilters.length === 0
          ? true
          : item.repository_url &&
          repoFilters.includes(
            item.repository_url.replace('https://api.github.com/repos/', '')
          );
      return labelMatch && excludeMatch && repoMatch;
    });
  }, [filteredResults, includedLabels, excludedLabels, repoFilters]);

  // Add helper to get unique repositories
  const getUniqueRepositories = useMemo(() => {
    const repos = Array.from(
      new Set(
        results
          .map(item => {
            const repo = item.repository_url?.replace(
              'https://api.github.com/repos/',
              ''
            );
            
            return repo;
          })
          .filter((repo): repo is string => Boolean(repo))
      )
    ).sort((a, b) =>
      (a || '').toLowerCase().localeCompare((b || '').toLowerCase())
    );
    
    return repos;
  }, [results]);

  // Add navigation logic
  const handlePreviousItem = () => {
    if (!selectedItemForDialog) return;
    const currentIndex = filteredResults.findIndex(
      item => item.id === selectedItemForDialog.id
    );
    if (currentIndex > 0) {
      setSelectedItemForDialog(filteredResults[currentIndex - 1]);
    }
  };

  const handleNextItem = () => {
    if (!selectedItemForDialog) return;
    const currentIndex = filteredResults.findIndex(
      item => item.id === selectedItemForDialog.id
    );
    if (currentIndex < filteredResults.length - 1) {
      setSelectedItemForDialog(filteredResults[currentIndex + 1]);
    }
  };

  const getCurrentItemIndex = () => {
    if (!selectedItemForDialog) return -1;
    return filteredResults.findIndex(
      item => item.id === selectedItemForDialog.id
    );
  };

  // Debug logging
  

  // Helper functions for SelectPanel
  const createLabelItems = useMemo(() => {
    return availableLabels
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
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

        return {
          text: `${label} (${currentCount}${currentCount !== potentialCount ? ` / ${potentialCount}` : ''})`,
          id: label,
          disabled: potentialCount === 0,
        } as ActionListItemInput;
      });
  }, [availableLabels, baseResults, results, excludedLabels, countItemsMatchingFilter]);

  // Filter items for include labels (show selected + search filtered)
  const filteredIncludeItems = useMemo(() => {
    return createLabelItems.filter(item => {
      const labelId = String(item.id);
      const isSelected = includedLabels.some(selected => selected === labelId);
      const matchesFilter = item.text?.toLowerCase().includes(includeLabelFilter.toLowerCase());
      const notExcluded = !excludedLabels.includes(labelId);
      return (isSelected || matchesFilter) && notExcluded;
    });
  }, [createLabelItems, includedLabels, includeLabelFilter, excludedLabels]);

  // Filter items for exclude labels (show selected + search filtered)
  const filteredExcludeItems = useMemo(() => {
    return createLabelItems.filter(item => {
      const labelId = String(item.id);
      const isSelected = excludedLabels.some(selected => selected === labelId);
      const matchesFilter = item.text?.toLowerCase().includes(excludeLabelFilter.toLowerCase());
      const notIncluded = !includedLabels.includes(labelId);
      return (isSelected || matchesFilter) && notIncluded;
    });
  }, [createLabelItems, excludedLabels, excludeLabelFilter, includedLabels]);

  // Convert selected labels to ActionListItemInput format
  const selectedIncludeItems = useMemo(() => {
    return includedLabels.map(label =>
      createLabelItems.find(item => item.id === label)
    ).filter(Boolean) as ActionListItemInput[];
  }, [includedLabels, createLabelItems]);

  const selectedExcludeItems = useMemo(() => {
    return excludedLabels.map(label =>
      createLabelItems.find(item => item.id === label)
    ).filter(Boolean) as ActionListItemInput[];
  }, [excludedLabels, createLabelItems]);

  // Handle label selection changes
  const handleIncludeLabelsChange = useCallback((selected: ActionListItemInput[]) => {
    const labelIds = selected.map(item => String(item.id!));
    setIncludedLabels(labelIds);
    // Remove any newly selected labels from excluded
    setExcludedLabels(prev => prev.filter(label => !labelIds.includes(label)));
  }, [setIncludedLabels, setExcludedLabels]);

  const handleExcludeLabelsChange = useCallback((selected: ActionListItemInput[]) => {
    const labelIds = selected.map(item => String(item.id!));
    setExcludedLabels(labelIds);
    // Remove any newly selected labels from included
    setIncludedLabels(prev => prev.filter(label => !labelIds.includes(label)));
  }, [setExcludedLabels, setIncludedLabels]);

  return (
    <Box>
      {/* Original Filters Section - Hidden, now integrated into Results */}
      <Box
        sx={{
          display: 'none',
          margin: '16px auto 0',
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
                  sx={{
                    fontSize: 1,
                    fontWeight: 'semibold',
                    color: 'fg.muted',
                  }}
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
                  sx={{
                    fontSize: 1,
                    fontWeight: 'semibold',
                    color: 'fg.muted',
                  }}
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
            </Box>

            {/* Label Filters using SelectPanel */}
            {availableLabels.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: ['1fr', '1fr 1fr'] }}>
                  {/* Include Labels SelectPanel */}
                  <FormControl>
                    <FormControl.Label sx={{ fontSize: 1, fontWeight: 'semibold', color: 'success.fg' }}>
                      Include Labels
                      <Text as="span" sx={{ fontSize: 0, color: 'fg.muted', fontWeight: 'normal', ml: 2 }}>
                        show items with ALL selected labels
                      </Text>
                    </FormControl.Label>
                    <SelectPanel
                      renderAnchor={({ children, ...anchorProps }) => (
                        <Button
                          {...anchorProps}
                          trailingAction={TriangleDownIcon}
                          aria-haspopup="dialog"
                          variant="default"
                          sx={{
                            justifyContent: 'space-between',
                            border: selectedIncludeItems.length > 0 ? '2px solid' : '1px solid',
                            borderColor: selectedIncludeItems.length > 0 ? 'success.emphasis' : 'border.default',
                          }}
                        >
                          {children}
                        </Button>
                      )}
                      placeholder={
                        selectedIncludeItems.length === 0
                          ? 'Select labels to include...'
                          : `${selectedIncludeItems.length} label${selectedIncludeItems.length === 1 ? '' : 's'} selected`
                      }
                      open={includeLabelsOpen}
                      onOpenChange={setIncludeLabelsOpen}
                      items={filteredIncludeItems}
                      selected={selectedIncludeItems}
                      onSelectedChange={handleIncludeLabelsChange}
                      onFilterChange={setIncludeLabelFilter}
                      filterValue={includeLabelFilter}
                      placeholderText="Filter labels..."
                      showSelectedOptionsFirst
                    />
                  </FormControl>

                  {/* Exclude Labels SelectPanel */}
                  <FormControl>
                    <FormControl.Label sx={{ fontSize: 1, fontWeight: 'semibold', color: 'danger.fg' }}>
                      Exclude Labels
                      <Text as="span" sx={{ fontSize: 0, color: 'fg.muted', fontWeight: 'normal', ml: 2 }}>
                        hide items with ANY selected labels
                      </Text>
                    </FormControl.Label>
                    <SelectPanel
                      renderAnchor={({ children, ...anchorProps }) => (
                        <Button
                          {...anchorProps}
                          trailingAction={TriangleDownIcon}
                          aria-haspopup="dialog"
                          variant="default"
                          sx={{
                            justifyContent: 'space-between',
                            border: selectedExcludeItems.length > 0 ? '2px solid' : '1px solid',
                            borderColor: selectedExcludeItems.length > 0 ? 'danger.emphasis' : 'border.default',
                          }}
                        >
                          {children}
                        </Button>
                      )}
                      placeholder={
                        selectedExcludeItems.length === 0
                          ? 'Select labels to exclude...'
                          : `${selectedExcludeItems.length} label${selectedExcludeItems.length === 1 ? '' : 's'} excluded`
                      }
                      open={excludeLabelsOpen}
                      onOpenChange={setExcludeLabelsOpen}
                      items={filteredExcludeItems}
                      selected={selectedExcludeItems}
                      onSelectedChange={handleExcludeLabelsChange}
                      onFilterChange={setExcludeLabelFilter}
                      filterValue={excludeLabelFilter}
                      placeholderText="Filter labels..."
                      showSelectedOptionsFirst
                    />
                  </FormControl>
                </Box>
              </Box>
            )}

            {/* Repository Filter - Moved to end */}
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
                    sx={{
                      fontSize: 0,
                      color: 'fg.muted',
                      fontWeight: 'normal',
                    }}
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

      {/* Results Section */}
      <Box
          sx={{
            margin: '24px auto 0',
            bg: 'canvas.default',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'border.default',
            p: 3,
          }}
        >
          {/* Results header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
              pb: 3,
              borderBottom: '1px solid',
              borderColor: 'border.muted',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Heading
                as="h2"
                sx={{
                  fontSize: 3,
                  fontWeight: 'semibold',
                  color: 'fg.default',
                  m: 0,
                }}
              >
                Results
              </Heading>
              <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
                {areFiltersActive && hasConfiguredFilters
                  ? `${filteredResults.length} filtered / ${results.length} total`
                  : `${results.length} items`}
              </Text>
              {clipboardMessage && (
                <Flash variant="success" sx={{ py: 1, px: 2 }}>
                  {clipboardMessage}
                </Flash>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <ActionMenu>
                <ActionMenu.Button
                  variant="default"
                  size="small"
                  sx={{
                    ...buttonStyles,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: 0,
                    borderColor: 'border.default',
                  }}
                >
                  <PasteIcon size={14} />
                  {(() => {
                    const displayResults = areFiltersActive ? filteredResults : results;
                    const visibleSelectedCount = displayResults.filter(
                      item =>
                        selectedItems instanceof Set && selectedItems.has(item.id)
                    ).length;
                    return visibleSelectedCount > 0
                      ? visibleSelectedCount
                      : displayResults.length;
                  })()}
                </ActionMenu.Button>

                <ActionMenu.Overlay>
                  <ActionList>
                    <ActionList.Item
                      onSelect={() => copyResultsToClipboard('detailed')}
                    >
                      Detailed Format
                    </ActionList.Item>
                    <ActionList.Item
                      onSelect={() => copyResultsToClipboard('compact')}
                    >
                      Compact Format
                    </ActionList.Item>
                  </ActionList>
                </ActionMenu.Overlay>
              </ActionMenu>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Filters:</Text>
                <ButtonGroup>
                  <Button
                    size="small"
                    variant={areFiltersActive ? 'primary' : 'default'}
                    onClick={() => setAreFiltersActive(true)}
                    sx={{
                      ...buttonStyles,
                      border: areFiltersActive && hasConfiguredFilters ? '2px solid' : '1px solid',
                      borderColor: areFiltersActive && hasConfiguredFilters ? 'success.emphasis' : 'border.default',
                    }}
                  >
                    Active
                  </Button>
                  <Button
                    size="small"
                    variant={!areFiltersActive ? 'primary' : 'default'}
                    onClick={() => setAreFiltersActive(false)}
                    sx={buttonStyles}
                  >
                    Off
                  </Button>
                </ButtonGroup>
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
          </Box>



          {/* Integrated Filters Section - Only show when filters are active */}
          {areFiltersActive && (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'border.default',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
            {/* Filter Header */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                bg: hasActiveFilters ? 'accent.subtle' : 'canvas.subtle',
                borderBottom: areFiltersCollapsed ? 'none' : '1px solid',
                borderColor: 'border.default',
                cursor: 'pointer',
                ':hover': {
                  bg: hasActiveFilters ? 'accent.muted' : 'canvas.default',
                },
              }}
              onClick={() => setAreFiltersCollapsed(!areFiltersCollapsed)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {areFiltersCollapsed ? (
                    <ChevronRightIconCollapse size={16} />
                  ) : (
                    <ChevronDownIcon size={16} />
                  )}
                </Box>
                <FilterIcon size={16} />
                <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'semibold', m: 0 }}>
                  Filters
                                     {hasActiveFilters && (
                     <Text as="span" sx={{ 
                       fontSize: 0, 
                       fontWeight: 'bold',
                       ml: 1,
                       px: 1,
                       py: 0.5,
                       bg: 'accent.emphasis',
                       color: 'fg.onEmphasis',
                       borderRadius: 1
                     }}>
                       ON
                     </Text>
                   )}
                </Heading>
              </Box>
              {hasActiveFilters && (
                <Button
                  size="small"
                  variant="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAllFilters();
                  }}
                  sx={buttonStyles}
                >
                  Clear All
                </Button>
              )}
            </Box>

            {/* Filter Summary when collapsed - Simple single row */}
            {areFiltersCollapsed && hasActiveFilters && (
              <Box sx={{ p: 2, bg: 'canvas.default' }}>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                  Filters: {getFilterSummary()}
                </Text>
              </Box>
            )}

            {/* Filter Content when expanded */}
            {!areFiltersCollapsed && (
              <Box sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 3,
                  }}
                >
                  {/* Type Filter */}
                  <Box>
                    <Heading
                      as="h4"
                      sx={{
                        fontSize: 1,
                        fontWeight: 'semibold',
                        color: 'fg.muted',
                        mb: 2,
                      }}
                    >
                      Type
                    </Heading>
                    <ButtonGroup sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Button
                        variant={filter === 'issue' ? 'primary' : 'default'}
                        onClick={() =>
                          setFilter(filter === 'issue' ? 'all' : 'issue')
                        }
                        size="small"
                        sx={{ ...buttonStyles, fontSize: 0 }}
                      >
                        Issues ({countItemsMatchingFilter(baseResults, 'type', 'issue', excludedLabels)})
                      </Button>
                      <Button
                        variant={filter === 'pr' ? 'primary' : 'default'}
                        onClick={() => setFilter(filter === 'pr' ? 'all' : 'pr')}
                        size="small"
                        sx={{ ...buttonStyles, fontSize: 0 }}
                      >
                        PRs ({countItemsMatchingFilter(baseResults, 'type', 'pr', excludedLabels)})
                      </Button>
                      <Button
                        variant={filter === 'comment' ? 'primary' : 'default'}
                        onClick={() =>
                          setFilter(filter === 'comment' ? 'all' : 'comment')
                        }
                        size="small"
                        sx={{ ...buttonStyles, fontSize: 0 }}
                      >
                        Comments ({countItemsMatchingFilter(baseResults, 'type', 'comment', excludedLabels)})
                      </Button>
                    </ButtonGroup>
                  </Box>

                  {/* Status Filter */}
                  <Box>
                    <Heading
                      as="h4"
                      sx={{
                        fontSize: 1,
                        fontWeight: 'semibold',
                        color: 'fg.muted',
                        mb: 2,
                      }}
                    >
                      Status
                    </Heading>
                    <ButtonGroup sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Button
                        variant={statusFilter === 'open' ? 'primary' : 'default'}
                        onClick={() =>
                          setStatusFilter(statusFilter === 'open' ? 'all' : 'open')
                        }
                        size="small"
                        sx={{ ...buttonStyles, fontSize: 0 }}
                      >
                        Open ({countItemsMatchingFilter(baseResults, 'status', 'open', excludedLabels)})
                      </Button>
                      <Button
                        variant={statusFilter === 'closed' ? 'primary' : 'default'}
                        onClick={() =>
                          setStatusFilter(statusFilter === 'closed' ? 'all' : 'closed')
                        }
                        size="small"
                        sx={{ ...buttonStyles, fontSize: 0 }}
                      >
                        Closed ({countItemsMatchingFilter(baseResults, 'status', 'closed', excludedLabels)})
                      </Button>
                      <Button
                        variant={statusFilter === 'merged' ? 'primary' : 'default'}
                        onClick={() =>
                          setStatusFilter(statusFilter === 'merged' ? 'all' : 'merged')
                        }
                        size="small"
                        sx={{ ...buttonStyles, fontSize: 0 }}
                      >
                        Merged ({countItemsMatchingFilter(baseResults, 'status', 'merged', excludedLabels)})
                      </Button>
                    </ButtonGroup>
                  </Box>
                </Box>

                                 {/* Label Filters - Full functionality restored */}
                 {availableLabels.length > 0 && (
                   <Box sx={{ mt: 3 }}>
                     <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: ['1fr', '1fr 1fr'] }}>
                       {/* Include Labels */}
                       <Box>
                         <Heading
                           as="h4"
                           sx={{
                             fontSize: 1,
                             fontWeight: 'semibold',
                             color: 'success.fg',
                             mb: 2,
                           }}
                         >
                           Include Labels
                           <Text as="span" sx={{ fontSize: 0, color: 'fg.muted', fontWeight: 'normal', ml: 1 }}>
                             (show items with ALL selected)
                           </Text>
                         </Heading>
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                           {availableLabels.map(label => {
                             const isSelected = includedLabels.includes(label);
                             const isExcluded = excludedLabels.includes(label);
                             const count = countItemsMatchingFilter(baseResults, 'label', label, excludedLabels);
                             
                             return (
                               <Button
                                 key={label}
                                 variant={isSelected ? 'primary' : 'default'}
                                 size="small"
                                 disabled={isExcluded || count === 0}
                                 onClick={() => {
                                   if (isSelected) {
                                     setIncludedLabels(prev => prev.filter(l => l !== label));
                                   } else {
                                     setIncludedLabels(prev => [...prev, label]);
                                     // Remove from excluded if it was there
                                     setExcludedLabels(prev => prev.filter(l => l !== label));
                                   }
                                 }}
                                 sx={{
                                   ...buttonStyles,
                                   fontSize: 0,
                                   border: isSelected ? '2px solid' : '1px solid',
                                   borderColor: isSelected ? 'success.emphasis' : 'border.default',
                                   opacity: isExcluded ? 0.5 : 1,
                                 }}
                               >
                                 {label} ({count})
                               </Button>
                             );
                           })}
                         </Box>
                         {includedLabels.length > 0 && (
                           <Button
                             variant="default"
                             size="small"
                             onClick={() => setIncludedLabels([])}
                             sx={{ ...buttonStyles, fontSize: 0, mt: 1 }}
                           >
                             Clear ({includedLabels.length})
                           </Button>
                         )}
                       </Box>

                       {/* Exclude Labels */}
                       <Box>
                         <Heading
                           as="h4"
                           sx={{
                             fontSize: 1,
                             fontWeight: 'semibold',
                             color: 'danger.fg',
                             mb: 2,
                           }}
                         >
                           Exclude Labels
                           <Text as="span" sx={{ fontSize: 0, color: 'fg.muted', fontWeight: 'normal', ml: 1 }}>
                             (hide items with ANY selected)
                           </Text>
                         </Heading>
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                           {availableLabels.map(label => {
                             const isSelected = excludedLabels.includes(label);
                             const isIncluded = includedLabels.includes(label);
                             const count = countItemsMatchingFilter(results, 'label', label, []);
                             
                             return (
                               <Button
                                 key={label}
                                 variant={isSelected ? 'primary' : 'default'}
                                 size="small"
                                 disabled={isIncluded || count === 0}
                                 onClick={() => {
                                   if (isSelected) {
                                     setExcludedLabels(prev => prev.filter(l => l !== label));
                                   } else {
                                     setExcludedLabels(prev => [...prev, label]);
                                     // Remove from included if it was there
                                     setIncludedLabels(prev => prev.filter(l => l !== label));
                                   }
                                 }}
                                 sx={{
                                   ...buttonStyles,
                                   fontSize: 0,
                                   border: isSelected ? '2px solid' : '1px solid',
                                   borderColor: isSelected ? 'danger.emphasis' : 'border.default',
                                   opacity: isIncluded ? 0.5 : 1,
                                 }}
                               >
                                 {label} ({count})
                               </Button>
                             );
                           })}
                         </Box>
                         {excludedLabels.length > 0 && (
                           <Button
                             variant="default"
                             size="small"
                             onClick={() => setExcludedLabels([])}
                             sx={{ ...buttonStyles, fontSize: 0, mt: 1 }}
                           >
                             Clear ({excludedLabels.length})
                           </Button>
                         )}
                       </Box>
                     </Box>
                   </Box>
                 )}

                {/* Repository Filters */}
                {getUniqueRepositories.length > 1 && (
                  <Box sx={{ mt: 3 }}>
                    <Heading
                      as="h4"
                      sx={{
                        fontSize: 1,
                        fontWeight: 'semibold',
                        color: 'fg.muted',
                        mb: 2,
                      }}
                    >
                      Repositories
                    </Heading>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {getUniqueRepositories.map(repo => (
                        <Button
                          key={repo}
                          variant={repoFilters.includes(repo) ? 'primary' : 'default'}
                          onClick={() => handleRepoFilterChange(repo)}
                          size="small"
                          sx={{ ...buttonStyles, fontSize: 0 }}
                        >
                          {repo} ({results.filter(item => 
                            item.repository_url?.includes(repo)
                          ).length})
                        </Button>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
          )}

          {/* Results List */}
          {(() => {
            const displayResults = areFiltersActive ? filteredResults : results;
            
            if (displayResults.length === 0) {
              return (
                <Box
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    border: '1px solid',
                    borderColor: 'border.default',
                    borderRadius: 2,
                    bg: 'canvas.subtle',
                  }}
                >
                  {results.length === 0 ? (
                    <Box>
                      <Text sx={{ fontSize: 2, color: 'fg.muted', mb: 2 }}>
                        No data available
                      </Text>
                      <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
                        Load some GitHub data to see results here.
                      </Text>
                    </Box>
                  ) : (
                    <Box>
                      <Text sx={{ fontSize: 2, color: 'fg.muted', mb: 2 }}>
                        No matches found
                      </Text>
                      <Text sx={{ fontSize: 1, color: 'fg.muted', mb: 3 }}>
                        Your current filters don't match any of the {results.length} available items.
                      </Text>
                      {hasActiveFilters && (
                        <Button
                          variant="default"
                          onClick={clearAllFilters}
                          sx={buttonStyles}
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              );
            }

            return isCompactView ? (
              <Box sx={{ gap: 1 }}>
                {displayResults.map(item => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1,
                    px: 2,
                    borderRadius: 1,
                    ':hover': {
                      bg: 'canvas.subtle',
                    },
                  }}
                >
                  <Checkbox
                    checked={
                      selectedItems instanceof Set &&
                      selectedItems.has(item.id)
                    }
                    onChange={() => toggleItemSelection(item.id)}
                  />
                  {item.pull_request ? (
                    item.pull_request.merged_at || item.merged ? (
                      <Box sx={{ color: 'done.fg', display: 'flex' }}>
                        <GitMergeIcon size={16} />
                      </Box>
                    ) : item.state === 'closed' ? (
                      <Box sx={{ color: 'closed.fg', display: 'flex' }}>
                        <GitPullRequestIcon size={16} />
                      </Box>
                    ) : (
                      <Box sx={{ color: 'open.fg', display: 'flex' }}>
                        <GitPullRequestIcon size={16} />
                      </Box>
                    )
                  ) : (
                    item.state === 'closed' ? (
                      <Box sx={{ position: 'relative', display: 'inline-flex', color: 'closed.fg' }}>
                        <IssueOpenedIcon size={16} />
                        <Box sx={{ position: 'absolute', top: '3px', left: '3px' }}>
                          <XIcon size={10} />
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ color: 'open.fg', display: 'flex' }}>
                        <IssueOpenedIcon size={16} />
                      </Box>
                    )
                  )}
                  <Avatar
                    src={item.user.avatar_url}
                    alt={`${item.user.login}'s avatar`}
                    size={16}
                  />
                  <Text sx={{ fontSize: 1, color: 'fg.muted', flexShrink: 0 }}>
                    {item.user.login}
                  </Text>
                  <Link
                    href={item.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: 'accent.fg',
                      textDecoration: 'none',
                      fontSize: 1,
                      flexGrow: 1,
                      minWidth: 0,
                      ':hover': { textDecoration: 'underline' },
                    }}
                  >
                    <Text
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.title}
                    </Text>
                  </Link>
                  <Text sx={{ fontSize: 0, color: 'fg.muted', flexShrink: 0 }}>
                    {item.repository_url?.split('/').slice(-1)[0] || 'N/A'}
                  </Text>
                  <Text sx={{ fontSize: 0, color: 'fg.muted', flexShrink: 0 }}>
                    {new Date(item.updated_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  {item.body && (
                    <div
                    style={{
                      width: '50xpx',
                    }}
                  >
                    <ActionBar aria-label="Toolbar" size='small'>
                      <ActionBar.IconButton icon={EyeIcon} aria-label="Show description" size="small" onClick={() => setSelectedItemForDialog(item)}></ActionBar.IconButton>
                    </ActionBar>
                    </div>
                  )}
                </Box>
              ))}
            </Box>
                        ) : (
                <Stack sx={{ gap: 3 }}>
                  {displayResults.map(item => (
                <Box
                  key={item.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'border.default',
                    borderRadius: 2,
                    p: 3,
                    bg: 'canvas.subtle',
                    ':last-child': { mb: 0 },
                  }}
                >
                  {/* Project info section */}
                  <Stack
                    direction="horizontal"
                    alignItems="center"
                    sx={{ mb: 2, gap: 2 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Checkbox
                        checked={
                          selectedItems instanceof Set &&
                          selectedItems.has(item.id)
                        }
                        onChange={() => toggleItemSelection(item.id)}
                      />
                    </Box>
                    <Avatar
                      src={item.user.avatar_url}
                      alt={`${item.user.login}'s avatar`}
                      size={24}
                    />
                    <Link
                      href={item.user.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        fontSize: 1,
                        color: 'fg.muted',
                        textDecoration: 'none',
                        ':hover': { textDecoration: 'underline' },
                      }}
                    >
                      {item.user.login}
                    </Link>
                    {item.repository_url && (
                      <>
                        <Text sx={{ color: 'fg.muted' }}>/</Text>
                        <Link
                          href={`https://github.com/${item.repository_url.replace('https://api.github.com/repos/', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ fontSize: 1, color: 'accent.fg' }}
                        >
                          {
                            item.repository_url
                              .replace('https://api.github.com/repos/', '')
                              .split('/')[1]
                          }
                        </Link>
                      </>
                    )}
                  </Stack>
                  <Link
                    href={item.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'block', mb: 1 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {item.pull_request ? (
                        item.pull_request.merged_at || item.merged ? (
                          <Box
                            as="span"
                            aria-label="Merged Pull Request"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              color: 'done.fg',
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
                              color: 'closed.fg',
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
                              color: 'open.fg',
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
                            color:
                              item.state === 'closed' ? 'closed.fg' : 'open.fg',
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
                      <Text
                        sx={{
                          fontWeight: 'semibold',
                          fontSize: 2,
                          color: 'accent.fg',
                        }}
                      >
                        {item.title}
                      </Text>
                    </Box>
                  </Link>
                  <Stack
                    direction="horizontal"
                    alignItems="center"
                    sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}
                  >
                    {/* Display labels */}
                    {item.labels &&
                      item.labels.map((l: { name: string; color?: string; description?: string }) => (
                        <Label
                          key={l.name}
                          sx={{
                            backgroundColor: l.color
                              ? `#${l.color}`
                              : undefined,
                            color: l.color
                              ? getContrastColor(l.color)
                              : undefined,
                            fontWeight: 'bold',
                            fontSize: 0,
                            cursor: 'pointer',
                          }}
                          title={l.description || l.name}
                          onClick={() => setIncludedLabels(prev => [...prev, l.name])}
                        >
                          {l.name}
                        </Label>
                      ))}
                  </Stack>
                  <Stack
                    direction="horizontal"
                    alignItems="center"
                    sx={{
                      fontSize: 0,
                      color: 'fg.muted',
                      mt: 2,
                      flexWrap: 'wrap',
                      gap: 3,
                    }}
                  >
                    <Stack
                      direction="horizontal"
                      sx={{ flexWrap: 'wrap', gap: 2 }}
                    >
                      <Text>
                        Created:{' '}
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                      <Text>
                        Updated:{' '}
                        {new Date(item.updated_at).toLocaleDateString()}
                      </Text>
                      {item.pull_request?.merged_at && (
                        <Text sx={{ color: 'done.fg', fontWeight: 'bold' }}>
                          Merged:{' '}
                          {new Date(
                            item.pull_request.merged_at
                          ).toLocaleDateString()}
                        </Text>
                      )}
                      {item.state === 'closed' &&
                        !item.pull_request?.merged_at && (
                          <Text sx={{ color: 'danger.fg' }}>
                            Closed:{' '}
                            {new Date(item.closed_at!).toLocaleDateString()}
                          </Text>
                        )}
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
            );
          })()}
        </Box>

      {/* Description Dialog */}
      {selectedItemForDialog && (
        <DescriptionDialog
          item={selectedItemForDialog}
          onClose={() => setSelectedItemForDialog(null)}
          onPrevious={handlePreviousItem}
          onNext={handleNextItem}
          hasPrevious={getCurrentItemIndex() > 0}
          hasNext={getCurrentItemIndex() < filteredResults.length - 1}
        />
      )}
    </Box>
  );
});

export default ResultsList;
