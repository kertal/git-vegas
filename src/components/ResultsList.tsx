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
  BranchName,
  Label,
  Checkbox,
  ActionMenu,
  ActionList,
  Dialog,
  IconButton,
  SelectPanel,
  FormControl,
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
  sortOrder: 'updated' | 'created';
  includedLabels: string[];
  excludedLabels: string[];
  searchText: string;
  repoFilters: string[];
  availableLabels: string[];
  setFilter: (filter: 'all' | 'issue' | 'pr' | 'comment') => void;
  setStatusFilter: (filter: 'all' | 'open' | 'closed' | 'merged') => void;
  setSortOrder: (order: 'updated' | 'created') => void;
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
  buttonStyles: any;
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
  if (!item) return null;

  // Add keyboard navigation
  React.useEffect(() => {
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
  }, [onPrevious, onNext, onClose, hasPrevious, hasNext]);

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
              a: ({ node, ...props }) => (
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: 'accent.fg' }}
                  {...props}
                />
              ),
              pre: ({ node, ...props }) => (
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
              img: ({ node, ...props }) => (
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
    sortOrder,
    includedLabels = [],
    excludedLabels = [],
    searchText,
    repoFilters = [],
    availableLabels,
    setFilter,
    setStatusFilter,
    setSortOrder,
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

  // Helper to check if any filters are active
  const hasActiveFilters =
    filter !== 'all' ||
    statusFilter !== 'all' ||
    includedLabels.length > 0 ||
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
            item.labels?.some((l: any) => l.name === requiredLabel)
          );
      const excludeMatch =
        excludedLabels.length === 0
          ? true
          : !item.labels?.some((l: any) => excludedLabels.includes(l.name));
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
            console.log('Repository URL:', item.repository_url);
            console.log('Extracted repo:', repo);
            return repo;
          })
          .filter((repo): repo is string => Boolean(repo))
      )
    ).sort((a, b) =>
      (a || '').toLowerCase().localeCompare((b || '').toLowerCase())
    );
    console.log('Unique repositories:', repos);
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
      {/* Filters Section */}
      <Box
        sx={{
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
                      renderAnchor={({children, ...anchorProps}) => (
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
                      renderAnchor={({children, ...anchorProps}) => (
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
      {filteredResults.length > 0 && (
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
                {hasActiveFilters
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Sort by:</Text>
                <ButtonGroup>
                  <Button
                    variant={sortOrder === 'updated' ? 'primary' : 'default'}
                    onClick={() =>
                      setSortOrder(
                        sortOrder === 'updated' ? 'created' : 'updated'
                      )
                    }
                    size="small"
                    sx={buttonStyles}
                  >
                    Last Updated
                  </Button>
                  <Button
                    variant={sortOrder === 'created' ? 'primary' : 'default'}
                    onClick={() =>
                      setSortOrder(
                        sortOrder === 'created' ? 'updated' : 'created'
                      )
                    }
                    size="small"
                    sx={buttonStyles}
                  >
                    Creation Date
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

          {/* Actions toolbar */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              bg: 'canvas.subtle',
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'border.default',
            }}
          >
            <ActionMenu>
              <ActionMenu.Button
                variant="default"
                sx={{
                  ...buttonStyles,
                  fontSize: 1,
                  borderColor: 'border.default',
                }}
              >
                Export to Clipboard{' '}
                {(() => {
                  const visibleSelectedCount = filteredResults.filter(
                    item =>
                      selectedItems instanceof Set && selectedItems.has(item.id)
                  ).length;
                  return visibleSelectedCount > 0
                    ? `(${visibleSelectedCount} selected)`
                    : '(all)';
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
          </Box>

          {/* Results List */}
          {isCompactView ? (
            <Box as="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {filteredResults.map(item => (
                <Box
                  as="li"
                  key={item.id}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'border.muted',
                    py: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Checkbox
                      checked={
                        selectedItems instanceof Set &&
                        selectedItems.has(item.id)
                      }
                      onChange={() => toggleItemSelection(item.id)}
                    />
                    {item.body && (
                      <IconButton
                        icon={EyeIcon}
                        aria-label="Show description"
                        onClick={() => setSelectedItemForDialog(item)}
                        sx={{
                          color: 'fg.subtle',
                          opacity: 0.6,
                          padding: '4px',
                          ':hover': {
                            color: 'fg.default',
                            opacity: 1,
                            bg: 'transparent',
                          },
                          ':active': {
                            bg: 'transparent',
                          },
                        }}
                      />
                    )}
                  </Box>
                  <Avatar
                    src={item.user.avatar_url}
                    alt={`${item.user.login}'s avatar`}
                    size={20}
                  />
                  <Link
                    href={item.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: 'accent.fg',
                      textDecoration: 'none',
                      ':hover': { textDecoration: 'underline' },
                      flex: 1,
                    }}
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
                              color: 'open.fg',
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
                          <Text sx={{ ml: 1 }}>
                            {item.state === 'closed' ? 'Closed' : 'Open'}
                          </Text>
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
                    sx={{ color: 'fg.muted', fontSize: 0, gap: 2 }}
                  >
                    <Text>•</Text>
                    <BranchName>
                      {item.repository_url?.split('/').slice(-2).join('/')}
                    </BranchName>
                    <Text>•</Text>
                    <Text>
                      {new Date(item.updated_at).toLocaleDateString()}
                    </Text>
                  </Stack>
                </Box>
              ))}
            </Box>
          ) : (
            <Stack sx={{ gap: 3 }}>
              {filteredResults.map(item => (
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
                      {item.body && (
                        <IconButton
                          icon={EyeIcon}
                          aria-label="Show description"
                          onClick={() => setSelectedItemForDialog(item)}
                          size="small"
                        />
                      )}
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
                      item.labels.map((l: any) => (
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
          )}
        </Box>
      )}

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
