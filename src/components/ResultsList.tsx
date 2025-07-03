import React, { memo, useState } from 'react';
import {
  Box,
  Button,
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
  TextInput,
  FormControl,
} from '@primer/react';
import {
  GitPullRequestIcon,
  IssueOpenedIcon,
  GitMergeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  CheckIcon,
  PasteIcon,
  RepoIcon,
} from '@primer/octicons-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getContrastColor } from '../utils';
import { GitHubItem } from '../types';

import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { useFormContext } from '../App';

import { ResultsContainer } from './ResultsContainer';
import { truncateMiddle } from '../utils/textUtils';

import { CloneIssueDialog } from './CloneIssueDialog';
import ActionButtonsRow from './ActionButtonsRow';
import './TimelineView.css';



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
  isCompactView: boolean;
  setIsCompactView: (compact: boolean) => void;
  selectedItems: Set<string | number>;
  selectAllItems: () => void;
  clearSelection: () => void;
  toggleItemSelection: (id: string | number) => void;
  setRepoFilters: React.Dispatch<React.SetStateAction<string[]>>;
  setUserFilter: React.Dispatch<React.SetStateAction<string>>;
  setSearchText: (searchText: string) => void;
  isClipboardCopied: (itemId: string | number) => boolean;
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
      role="dialog"
      title={
        <Box
          sx={{
            display: 'flex',
            p: 2,
            alignItems: 'center',
            gap: 2,
            width: '100%',
          }}
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
      }
      renderFooter={() => (
        <div>
          <IconButton
            icon={ChevronLeftIcon}
            aria-label="Previous item"
            onClick={onPrevious}
            disabled={!hasPrevious}
            sx={{
              color: hasPrevious ? 'fg.default' : 'fg.muted',
            }}
          />
          <IconButton
            icon={ChevronRightIcon}
            aria-label="Next item"
            onClick={onNext}
            disabled={!hasNext}
            sx={{
              color: hasNext ? 'fg.default' : 'fg.muted',
            }}
          />
        </div>
      )}
    >
      <Box
        sx={{
          p: 3,
          maxHeight: '70vh',
          overflow: 'auto',
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <Link href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </Link>
            ),
          }}
        >
          {item.body || 'No description available.'}
        </ReactMarkdown>
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
    searchText,
    setSearchText,
    selectedItems,
    toggleItemSelection,
    selectAllItems,
    clearSelection,
    isClipboardCopied,
    copyResultsToClipboard,
    isCompactView,
    setIsCompactView,
  } = useResultsContext();

  // Get GitHub token from form context
  const { githubToken } = useFormContext();

  // Use copy feedback hook
  const { isCopied } = useCopyFeedback(2000);

  // Use debounced search hook
  const { inputValue, setInputValue, clearSearch } = useDebouncedSearch(
    searchText,
    value => setSearchText(value),
    300
  );

  // Dialog state
  const [selectedItemForDialog, setSelectedItemForDialog] = useState<GitHubItem | null>(null);
  const [selectedItemForClone, setSelectedItemForClone] = useState<GitHubItem | null>(null);

  // Check if filters are active
  const areFiltersActive = filteredResults.length !== results.length;

  // Selection handlers
  const handleSelectAllChange = () => {
    if (selectedItems instanceof Set && selectedItems.size === (areFiltersActive ? filteredResults.length : results.length)) {
      clearSelection();
    } else {
      selectAllItems();
    }
  };



  // Dialog navigation handlers
  const handlePreviousItem = () => {
    const currentIndex = getCurrentItemIndex();
    if (currentIndex > 0) {
      setSelectedItemForDialog(filteredResults[currentIndex - 1]);
    }
  };

  const handleNextItem = () => {
    const currentIndex = getCurrentItemIndex();
    if (currentIndex < filteredResults.length - 1) {
      setSelectedItemForDialog(filteredResults[currentIndex + 1]);
    }
  };

  const getCurrentItemIndex = () => {
    return filteredResults.findIndex(item => item.id === selectedItemForDialog?.id);
  };

  const formatRepoName = (url: string | undefined): string => {
    if (!url) return 'Unknown';
    return url.replace('https://api.github.com/repos/', '');
  };

  return (
    <Box>
      <ResultsContainer
        headerLeft={
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Checkbox
                checked={
                  selectedItems instanceof Set &&
                  selectedItems.size === (areFiltersActive ? filteredResults.length : results.length) &&
                  (areFiltersActive ? filteredResults.length : results.length) > 0
                }
                indeterminate={
                  selectedItems instanceof Set &&
                  selectedItems.size > 0 &&
                  selectedItems.size < (areFiltersActive ? filteredResults.length : results.length)
                }
                onChange={handleSelectAllChange}
                aria-label="Select all items"
                disabled={
                  (areFiltersActive ? filteredResults : results).length === 0
                }
              />
              <Heading
                as="h2"
                sx={{
                  fontSize: 2,
                  fontWeight: 'semibold',
                  color: 'fg.default',
                  m: 0,
                }}
              >
                Issues and PRs
              </Heading>
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
                  {(isClipboardCopied('compact') || isClipboardCopied('detailed')) ? (
                    <CheckIcon size={14} />
                  ) : (
                    <PasteIcon size={14} />
                  )}
                  {(() => {
                    const displayResults = areFiltersActive
                      ? filteredResults
                      : results;
                    const visibleSelectedCount = displayResults.filter(
                      item =>
                        selectedItems instanceof Set &&
                        selectedItems.has(item.event_id || item.id)
                    ).length;
                    return visibleSelectedCount > 0
                      ? visibleSelectedCount
                      : displayResults.length;
                  })()}
                </ActionMenu.Button>

                <ActionMenu.Overlay>
                  <ActionList>
                    <ActionList.Item
                      onSelect={() => copyResultsToClipboard('compact')}
                    >
                      Compact (Links with Titles)
                    </ActionList.Item>
                    <ActionList.Item
                      onSelect={() => copyResultsToClipboard('detailed')}
                    >
                      Detailed (Containing the content)
                    </ActionList.Item>
                  </ActionList>
                </ActionMenu.Overlay>
              </ActionMenu>
            </Box>

          </>
        }
        headerRight={
          <>


            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControl>
                <FormControl.Label visuallyHidden>
                  Search issues and PRs
                </FormControl.Label>
                <TextInput
                  placeholder="Search issues and PRs"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  leadingVisual={SearchIcon}
                  size="small"
                  sx={{ minWidth: '300px' }}
                />
              </FormControl>
              <Text sx={{ fontSize: 1, color: 'fg.muted' }}>View:</Text>
              <ButtonGroup>
              
                <Button
                  size="small"
                  variant={isCompactView ? 'primary' : 'default'}
                  onClick={() => setIsCompactView(true)}
                  sx={buttonStyles}
                >
                  Compact
                </Button>
                <Button
                  size="small"
                  variant={!isCompactView ? 'primary' : 'default'}
                  onClick={() => setIsCompactView(false)}
                  sx={buttonStyles}
                >
                  Detailed
                </Button>
              </ButtonGroup>
            </Box>
          </>
        }
      >
        <div className="timeline-container">
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
                        {searchText 
                          ? `No items found matching "${searchText}". Try a different search term, use label:name or -label:name for label filtering, or adjust your filters.`
                          : `Your current filters don't match any of the ${results.length} available items.`}
                      </Text>
                      {searchText && (
                        <Button
                          variant="default"
                          onClick={clearSearch}
                          sx={{ ...buttonStyles, ml: 2 }}
                        >
                          Clear Search
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
                  <div
                    key={item.id}
                    className="timeline-item timeline-item--standard"
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={
                        selectedItems instanceof Set &&
                        selectedItems.has(item.event_id || item.id)
                      }
                      onChange={() =>
                        toggleItemSelection(item.event_id || item.id)
                      }
                      sx={{ flexShrink: 0 }}
                    />

                    {/* Icon */}
                    <div className="timeline-item-icon">
                      {item.pull_request ? (
                        item.pull_request.merged_at || item.merged ? (
                          <GitMergeIcon size={16} className="timeline-item-icon--merged" />
                        ) : item.state === 'closed' ? (
                          <GitPullRequestIcon size={16} className="timeline-item-icon--closed" />
                        ) : (
                          <GitPullRequestIcon size={16} className="timeline-item-icon--open" />
                        )
                      ) : item.state === 'closed' ? (
                        <IssueOpenedIcon size={16} className="timeline-item-icon--closed" />
                      ) : (
                        <IssueOpenedIcon size={16} className="timeline-item-icon--open" />
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar
                      src={item.user.avatar_url}
                      size={16}
                      alt={item.user.login}
                      className="timeline-item-avatar"
                      sx={{ cursor: 'pointer' }}
                      onClick={() => {
                        // Add user to search text in format user:{username}
                        const userSearchTerm = `user:${item.user.login}`;
                        const currentSearch = searchText.trim();
                        
                        // Check if this user is already in the search text
                        const userRegex = new RegExp(`\\buser:${item.user.login.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`);
                        if (!userRegex.test(currentSearch)) {
                          const newSearchText = currentSearch 
                            ? `${currentSearch} ${userSearchTerm}`
                            : userSearchTerm;
                          setSearchText(newSearchText);
                        }
                      }}
                    />

                    {/* User and action */}
                    <div className="timeline-item-action-container">
                      <Link
                        href={item.user.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="timeline-item-user"
                      >
                        {item.user.login}
                      </Link>
                    </div>

                    {/* Title (truncated) */}
                    <div className="timeline-item-title-container">
                      <Link
                        href={item.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="timeline-item-title timeline-item-title--bold"
                        title={item.title}
                      >
                        {truncateMiddle(item.title, 100)}
                      </Link>
                      {item.pull_request && (item.draft || item.pull_request.draft) && (
                        <Label
                          variant="secondary"
                          size="small"
                          sx={{ ml: 1 }}
                        >
                          Draft
                        </Label>
                      )}
                    </div>

                    {/* Repo */}
                    <div className="timeline-item-repo-container">
                      <RepoIcon size={12} />
                      <Link
                        href={`https://github.com/${formatRepoName(item.repository_url)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="timeline-item-repo"
                      >
                        {formatRepoName(item.repository_url).split('/')[1] || formatRepoName(item.repository_url)}
                      </Link>
                    </div>

                    {/* Time */}
                    <Text className="timeline-item-time">
                      {new Date(item.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>

                    {/* Action buttons */}
                    <ActionButtonsRow
                      item={item}
                      githubToken={githubToken}
                      isCopied={isCopied}
                      onShowDescription={setSelectedItemForDialog}
                      onCloneItem={setSelectedItemForClone}
                      size="small"
                    />
                  </div>
                ))}
              </Box>
            ) : (
              <Stack sx={{ gap: 3 }}>
                {displayResults.map(item => (
                  <div
                    key={item.id}
                    className="timeline-item timeline-item--standard"
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={
                        selectedItems instanceof Set &&
                        selectedItems.has(item.event_id || item.id)
                      }
                      onChange={() =>
                        toggleItemSelection(item.event_id || item.id)
                      }
                      sx={{ flexShrink: 0 }}
                    />

                    {/* Icon */}
                    <div className="timeline-item-icon">
                      {item.pull_request ? (
                        item.pull_request.merged_at || item.merged ? (
                          <GitMergeIcon size={16} className="timeline-item-icon--merged" />
                        ) : item.state === 'closed' ? (
                          <GitPullRequestIcon size={16} className="timeline-item-icon--closed" />
                        ) : (
                          <GitPullRequestIcon size={16} className="timeline-item-icon--open" />
                        )
                      ) : item.state === 'closed' ? (
                        <IssueOpenedIcon size={16} className="timeline-item-icon--closed" />
                      ) : (
                        <IssueOpenedIcon size={16} className="timeline-item-icon--open" />
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar
                      src={item.user.avatar_url}
                      size={24}
                      alt={item.user.login}
                      className="timeline-item-avatar"
                      sx={{ cursor: 'pointer' }}
                      onClick={() => {
                        // Add user to search text in format user:{username}
                        const userSearchTerm = `user:${item.user.login}`;
                        const currentSearch = searchText.trim();
                        
                        // Check if this user is already in the search text
                        const userRegex = new RegExp(`\\buser:${item.user.login.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`);
                        if (!userRegex.test(currentSearch)) {
                          const newSearchText = currentSearch 
                            ? `${currentSearch} ${userSearchTerm}`
                            : userSearchTerm;
                          setSearchText(newSearchText);
                        }
                      }}
                    />

                    {/* User and action */}
                    <div className="timeline-item-action-container">
                      <Link
                        href={item.user.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="timeline-item-user"
                      >
                        {item.user.login}
                      </Link>
                    </div>

                    {/* Title */}
                    <div className="timeline-item-title-container">
                      <Link
                        href={item.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="timeline-item-title timeline-item-title--bold"
                        title={item.title}
                      >
                        {item.title}
                      </Link>
                      {item.pull_request && (item.draft || item.pull_request.draft) && (
                        <Label
                          variant="secondary"
                          size="small"
                          sx={{ ml: 1 }}
                        >
                          Draft
                        </Label>
                      )}
                    </div>

                    {/* Repo */}
                    <div className="timeline-item-repo-container">
                      <RepoIcon size={12} />
                      <Link
                        href={`https://github.com/${formatRepoName(item.repository_url)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="timeline-item-repo"
                      >
                        {formatRepoName(item.repository_url).split('/')[1] || formatRepoName(item.repository_url)}
                      </Link>
                    </div>

                    {/* Labels */}
                    {item.labels && item.labels.length > 0 && (
                      <div className="timeline-item-labels">
                        {item.labels.map((l: { name: string; color?: string; description?: string }) => (
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
                            onClick={() => {
                              // Add label to search text in format label:{labelName}
                              const labelSearchTerm = `label:${l.name}`;
                              const currentSearch = searchText.trim();
                              
                              // Check if this label is already in the search text
                              const labelRegex = new RegExp(`\\blabel:${l.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`);
                              if (!labelRegex.test(currentSearch)) {
                                const newSearchText = currentSearch 
                                  ? `${currentSearch} ${labelSearchTerm}`
                                  : labelSearchTerm;
                                setSearchText(newSearchText);
                              }
                            }}
                          >
                            {l.name}
                          </Label>
                        ))}
                      </div>
                    )}

                    {/* Time */}
                    <Text className="timeline-item-time">
                      {new Date(item.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>

                    {/* Action buttons */}
                    <ActionButtonsRow
                      item={item}
                      githubToken={githubToken}
                      isCopied={isCopied}
                      onShowDescription={setSelectedItemForDialog}
                      onCloneItem={setSelectedItemForClone}
                      size="small"
                    />
                  </div>
                ))}
              </Stack>
            );
          })()}
        </div>
      </ResultsContainer>

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

      {/* Clone Issue Dialog */}
      <CloneIssueDialog
        isOpen={selectedItemForClone !== null}
        onClose={() => setSelectedItemForClone(null)}
        originalIssue={selectedItemForClone}
        onSuccess={(newIssue) => {
          console.log('Issue cloned successfully:', newIssue);
          // Optionally refresh data or show success message
        }}
      />
    </Box>
  );
});

export default ResultsList;
