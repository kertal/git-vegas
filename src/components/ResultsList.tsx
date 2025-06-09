import React, { memo, useState } from 'react';
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
  PasteIcon,
} from '@primer/octicons-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getContrastColor } from '../utils';
import { GitHubItem } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import FiltersPanel from './FiltersPanel';

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
  userFilter: string;
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
  setUserFilter: React.Dispatch<React.SetStateAction<string>>;
}

// Props interface
interface ResultsListProps {
  useResultsContext: () => UseResultsContextHookType;

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
    userFilter = '',
    availableLabels = [],
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
    setUserFilter,
  } = useResultsContext();

  // Add state for filter collapse with localStorage persistence
  const [areFiltersCollapsed, setAreFiltersCollapsed] = useLocalStorage(
    'github-filters-collapsed',
    false // Force expanded for debugging
  );

  // Add state for filters active/inactive toggle
  const [areFiltersActive, setAreFiltersActive] = useLocalStorage(
    'github-filters-active',
    true
  );

  // Add state for the description dialog
  const [selectedItemForDialog, setSelectedItemForDialog] =
    useState<GitHubItem | null>(null);





  // Helper to check if any filters are configured
  const hasConfiguredFilters =
    filter !== 'all' ||
    statusFilter !== 'all' ||
    userFilter !== '' ||
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
    if (userFilter) {
      summaryParts.push(`User: ${userFilter}`);
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

  return (
    <Box>


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



                    {/* Filters Section */}
          {areFiltersActive && (
            <FiltersPanel
              results={results}
              availableLabels={availableLabels}
              filter={filter}
              statusFilter={statusFilter}
              userFilter={userFilter}
              includedLabels={includedLabels}
              excludedLabels={excludedLabels}
              repoFilters={repoFilters}
              setFilter={setFilter}
              setStatusFilter={setStatusFilter}
              setUserFilter={setUserFilter}
              setIncludedLabels={setIncludedLabels}
              setExcludedLabels={setExcludedLabels}
              setRepoFilters={setRepoFilters}
              areFiltersCollapsed={areFiltersCollapsed}
              setAreFiltersCollapsed={setAreFiltersCollapsed}
              hasConfiguredFilters={hasConfiguredFilters}
              clearAllFilters={clearAllFilters}
              getFilterSummary={getFilterSummary}
              buttonStyles={buttonStyles}
            />
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
