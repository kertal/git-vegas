import React, { memo, useMemo, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  ButtonGroup,
  ActionMenu,
  ActionList,
  Checkbox,
  SelectPanel,
  FormControl,
} from '@primer/react';
import {
  TriangleDownIcon,
  FilterIcon,
  ChevronDownIcon,
  ChevronRightIcon as ChevronRightIconCollapse,
} from '@primer/octicons-react';
import { type ActionListItemInput } from '@primer/react/deprecated';
import { GitHubItem } from '../types';

interface FiltersPanelProps {
  // Results data
  results: GitHubItem[];
  availableLabels: string[];
  
  // Filter states
  filter: 'all' | 'issue' | 'pr' | 'comment';
  statusFilter: 'all' | 'open' | 'closed' | 'merged';
  userFilter: string;
  includedLabels: string[];
  excludedLabels: string[];
  repoFilters: string[];
  
  // Filter setters
  setFilter: (filter: 'all' | 'issue' | 'pr' | 'comment') => void;
  setStatusFilter: (filter: 'all' | 'open' | 'closed' | 'merged') => void;
  setUserFilter: React.Dispatch<React.SetStateAction<string>>;
  setIncludedLabels: React.Dispatch<React.SetStateAction<string[]>>;
  setExcludedLabels: React.Dispatch<React.SetStateAction<string[]>>;
  setRepoFilters: React.Dispatch<React.SetStateAction<string[]>>;
  
  // UI state
  areFiltersCollapsed: boolean;
  setAreFiltersCollapsed: (collapsed: boolean) => void;
  hasConfiguredFilters: boolean;
  
  // Helper functions
  clearAllFilters: () => void;
  getFilterSummary: () => string;
  
  // Styles
  buttonStyles: React.CSSProperties;
}

const FiltersPanel = memo(function FiltersPanel({
  results,
  availableLabels = [],
  filter,
  statusFilter,
  userFilter,
  includedLabels,
  excludedLabels,
  repoFilters,
  setFilter,
  setStatusFilter,
  setUserFilter,
  setIncludedLabels,
  setExcludedLabels,
  setRepoFilters,
  areFiltersCollapsed,
  setAreFiltersCollapsed,
  hasConfiguredFilters,
  clearAllFilters,
  getFilterSummary,
  buttonStyles,
}: FiltersPanelProps) {
  // Internal state for SelectPanel components
  const [includeLabelsOpen, setIncludeLabelsOpen] = useState(false);
  const [excludeLabelsOpen, setExcludeLabelsOpen] = useState(false);
  const [includeLabelFilter, setIncludeLabelFilter] = useState('');
  const [excludeLabelFilter, setExcludeLabelFilter] = useState('');

  // Handle repository filter changes
  const handleRepoFilterChange = useCallback(
    (repo: string) => {
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

  // Get unique repositories
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

  // Get unique users
  const getUniqueUsers = useMemo(() => {
    const users = Array.from(
      new Set(
        results
          .map(item => item.user.login)
          .filter(Boolean)
      )
    ).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    
    return users;
  }, [results]);

  // Create label items for SelectPanel
  const createLabelItems = useMemo(() => {
    if (!availableLabels || availableLabels.length === 0) {
      return [];
    }
    
    try {
      return availableLabels
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .map(label => ({
          text: label,
          id: label,
        } as ActionListItemInput));
    } catch (error) {
      console.error('Error in createLabelItems:', error);
      return [];
    }
  }, [availableLabels]);

  // Filter items for include labels
  const filteredIncludeItems = useMemo(() => {
    return createLabelItems.filter(item => {
      const labelId = String(item.id);
      const isSelected = includedLabels.some(selected => selected === labelId);
      const matchesFilter = item.text?.toLowerCase().includes(includeLabelFilter.toLowerCase());
      const notExcluded = !excludedLabels.includes(labelId);
      return (isSelected || matchesFilter) && notExcluded;
    });
  }, [createLabelItems, includedLabels, includeLabelFilter, excludedLabels]);

  // Filter items for exclude labels
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
    setExcludedLabels(prev => prev.filter(label => !labelIds.includes(label)));
  }, [setIncludedLabels, setExcludedLabels]);

  const handleExcludeLabelsChange = useCallback((selected: ActionListItemInput[]) => {
    const labelIds = selected.map(item => String(item.id!));
    setExcludedLabels(labelIds);
    setIncludedLabels(prev => prev.filter(label => !labelIds.includes(label)));
  }, [setExcludedLabels, setIncludedLabels]);

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 2,
        overflow: 'hidden',
        mb: 3,
      }}
    >
      {/* Filter Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          bg: 'canvas.subtle',
          cursor: 'pointer',
          borderBottom: !areFiltersCollapsed ? '1px solid' : 'none',
          borderColor: 'border.default',
          ':hover': {
            bg: 'canvas.default',
          },
        }}
        onClick={() => setAreFiltersCollapsed(!areFiltersCollapsed)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {areFiltersCollapsed ? (
            <ChevronRightIconCollapse size={16} />
          ) : (
            <ChevronDownIcon size={16} />
          )}
          <FilterIcon size={16} />
          {areFiltersCollapsed && hasConfiguredFilters ? (
            <Text sx={{ fontSize: 1, fontWeight: 'semibold', color: 'fg.default' }}>
              Filters: {getFilterSummary()}
            </Text>
          ) : (
            <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'semibold', m: 0 }}>
              Filters
            </Heading>
          )}
        </Box>
        {hasConfiguredFilters && (
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

      {/* Filter Content */}
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
                  Issues
                </Button>
                <Button
                  variant={filter === 'pr' ? 'primary' : 'default'}
                  onClick={() => setFilter(filter === 'pr' ? 'all' : 'pr')}
                  size="small"
                  sx={{ ...buttonStyles, fontSize: 0 }}
                >
                  PRs
                </Button>
                <Button
                  variant={filter === 'comment' ? 'primary' : 'default'}
                  onClick={() =>
                    setFilter(filter === 'comment' ? 'all' : 'comment')
                  }
                  size="small"
                  sx={{ ...buttonStyles, fontSize: 0 }}
                >
                  Comments
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
                  Open
                </Button>
                <Button
                  variant={statusFilter === 'closed' ? 'primary' : 'default'}
                  onClick={() =>
                    setStatusFilter(statusFilter === 'closed' ? 'all' : 'closed')
                  }
                  size="small"
                  sx={{ ...buttonStyles, fontSize: 0 }}
                >
                  Closed
                </Button>
                <Button
                  variant={statusFilter === 'merged' ? 'primary' : 'default'}
                  onClick={() =>
                    setStatusFilter(statusFilter === 'merged' ? 'all' : 'merged')
                  }
                  size="small"
                  sx={{ ...buttonStyles, fontSize: 0 }}
                >
                  Merged
                </Button>
              </ButtonGroup>
            </Box>

            {/* User Filter */}
            {getUniqueUsers.length > 1 && (
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
                  User
                </Heading>
                <ActionMenu>
                  <ActionMenu.Button
                    variant={userFilter ? 'primary' : 'default'}
                    size="small"
                    sx={{
                      ...buttonStyles,
                      fontSize: 0,
                      justifyContent: 'space-between',
                      border: userFilter ? '2px solid' : '1px solid',
                      borderColor: userFilter ? 'accent.emphasis' : 'border.default',
                    }}
                  >
                    {userFilter || 'All Users'}
                  </ActionMenu.Button>
                  <ActionMenu.Overlay>
                    <ActionList selectionVariant="single">
                      <ActionList.Item
                        selected={userFilter === ''}
                        onSelect={() => setUserFilter('')}
                      >
                        All Users
                      </ActionList.Item>
                      <ActionList.Divider />
                      {getUniqueUsers.map(user => (
                        <ActionList.Item
                          key={user}
                          selected={userFilter === user}
                          onSelect={() => setUserFilter(userFilter === user ? '' : user)}
                        >
                          {user}
                        </ActionList.Item>
                      ))}
                    </ActionList>
                  </ActionMenu.Overlay>
                </ActionMenu>
              </Box>
            )}

            {/* Repository Filter */}
            {getUniqueRepositories.length > 0 && (
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
                  Repositories
                </Heading>
                <ActionMenu>
                  <ActionMenu.Button
                    variant={repoFilters.length > 0 ? 'primary' : 'default'}
                    size="small"
                    sx={{
                      ...buttonStyles,
                      fontSize: 0,
                      justifyContent: 'space-between',
                      border: repoFilters.length > 0 ? '2px solid' : '1px solid',
                      borderColor: repoFilters.length > 0 ? 'accent.emphasis' : 'border.default',
                    }}
                  >
                    {repoFilters.length === 0
                      ? 'All Repositories'
                      : repoFilters.length === 1
                      ? repoFilters[0]
                      : `${repoFilters.length} repositories selected`
                    }
                  </ActionMenu.Button>
                  <ActionMenu.Overlay>
                    <ActionList selectionVariant="multiple">
                      <ActionList.Item
                        selected={repoFilters.length === 0}
                        onSelect={() => setRepoFilters([])}
                      >
                        All Repositories
                      </ActionList.Item>
                      <ActionList.Divider />
                      {getUniqueRepositories.map(repo => (
                        <ActionList.Item
                          key={repo}
                          selected={repoFilters.includes(repo)}
                          onSelect={() => handleRepoFilterChange(repo)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <Checkbox
                              checked={repoFilters.includes(repo)}
                              onChange={() => handleRepoFilterChange(repo)}
                            />
                            <Text sx={{ flex: 1 }}>
                              {repo}
                            </Text>
                          </Box>
                        </ActionList.Item>
                      ))}
                      {repoFilters.length > 0 && (
                        <>
                          <ActionList.Divider />
                          <ActionList.Item
                            variant="danger"
                            onSelect={() => setRepoFilters([])}
                          >
                            Clear Selection
                          </ActionList.Item>
                        </>
                      )}
                    </ActionList>
                  </ActionMenu.Overlay>
                </ActionMenu>
              </Box>
            )}
          </Box>

          {/* Label Filters */}
          {availableLabels.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: ['1fr', '1fr 1fr'] }}>
                {/* Include Labels */}
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
                    onOpenChange={(open) => {
                      setIncludeLabelsOpen(open);
                      if (open) {
                        setExcludeLabelsOpen(false);
                      }
                    }}
                    items={filteredIncludeItems}
                    selected={selectedIncludeItems}
                    onSelectedChange={handleIncludeLabelsChange}
                    onFilterChange={setIncludeLabelFilter}
                    filterValue={includeLabelFilter}
                    placeholderText="Filter labels..."
                  />
                </FormControl>

                {/* Exclude Labels */}
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
                    onOpenChange={(open) => {
                      setExcludeLabelsOpen(open);
                      if (open) {
                        setIncludeLabelsOpen(false);
                      }
                    }}
                    items={filteredExcludeItems}
                    selected={selectedExcludeItems}
                    onSelectedChange={handleExcludeLabelsChange}
                    onFilterChange={setExcludeLabelFilter}
                    filterValue={excludeLabelFilter}
                    placeholderText="Filter labels..."
                  />
                </FormControl>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
});

export default FiltersPanel; 