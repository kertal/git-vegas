import React, { memo, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  Text,
  Heading,
  ButtonGroup,
  Stack,
  Checkbox,
  TextInput,
  FormControl,
} from '@primer/react';
import {
  GitPullRequestIcon,
  IssueOpenedIcon,
  GitMergeIcon,
  SearchIcon,
} from '@primer/octicons-react';

import { GitHubItem } from '../types';

import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { useFormContext } from '../App';
import { filterByText } from '../utils/resultsUtils';
import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';

import { ResultsContainer } from '../components/ResultsContainer';
import { CloneIssueDialog } from '../components/CloneIssueDialog';
import DescriptionDialog from '../components/DescriptionDialog';
import BulkCopyButton from '../components/BulkCopyButton';
import './EventView.css';
import ItemRow from '../components/ItemRow';

// Props interface
interface IssuesAndPRsListProps {
  results: GitHubItem[];
  buttonStyles: React.CSSProperties;
}

// Custom title component for the description dialog
const DialogTitle = ({ item }: { item: GitHubItem }) => (
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
);

const IssuesAndPRsList = memo(function IssuesAndPRsList({
  results,
  buttonStyles,
}: IssuesAndPRsListProps) {
  // Get GitHub token from form context
  const { githubToken } = useFormContext();

  // Internal state management (previously from context)
  const [searchText, setSearchText] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(new Set());
  const [isCompactView, setIsCompactView] = useState(true);

  // Use copy feedback hook
  const { isCopied, triggerCopy } = useCopyFeedback(2000);

  // Use debounced search hook
  const { inputValue, setInputValue, clearSearch } = useDebouncedSearch(
    searchText,
    setSearchText,
    300
  );

  // Apply search text filtering to results
  const filteredResults = useMemo(() => {
    return filterByText(results, searchText);
  }, [results, searchText]);

  // Selection handlers
  const toggleItemSelection = useCallback((id: string | number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAllItems = useCallback(() => {
    setSelectedItems(new Set(results.map((item: GitHubItem) => item.event_id || item.id)));
  }, [results]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Copy results to clipboard
  const copyResultsToClipboard = useCallback(async (format: 'detailed' | 'compact') => {
    const selectedItemsArray = selectedItems.size > 0
      ? results.filter((item: GitHubItem) => selectedItems.has(item.event_id || item.id))
      : results;

    await copyToClipboard(selectedItemsArray, {
      isCompactView: format === 'compact',
      onSuccess: () => {
        triggerCopy(format);
      },
      onError: (error: Error) => {
        console.error('Failed to copy results:', error);
      },
    });
  }, [results, selectedItems, triggerCopy]);

  // Clipboard feedback helper
  const isClipboardCopied = useCallback((itemId: string | number) => {
    return isCopied(itemId);
  }, [isCopied]);

  // Dialog state
  const [selectedItemForDialog, setSelectedItemForDialog] =
    useState<GitHubItem | null>(null);
  const [selectedItemForClone, setSelectedItemForClone] =
    useState<GitHubItem | null>(null);

  // Check if filters are active
  const areFiltersActive = filteredResults.length !== results.length;

  // Selection handlers
  const handleSelectAllChange = () => {
    if (
      selectedItems instanceof Set &&
      selectedItems.size ===
        (areFiltersActive ? filteredResults.length : results.length)
    ) {
      clearSelection();
    } else {
      selectAllItems();
    }
  };

  // Dialog navigation handlers
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
    return filteredResults.findIndex(item => item.id === selectedItemForDialog.id);
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
                  selectedItems.size ===
                    (areFiltersActive
                      ? filteredResults.length
                      : results.length) &&
                  (areFiltersActive ? filteredResults.length : results.length) >
                    0
                }
                indeterminate={
                  selectedItems instanceof Set &&
                  selectedItems.size > 0 &&
                  selectedItems.size <
                    (areFiltersActive ? filteredResults.length : results.length)
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
              <BulkCopyButton
                selectedItems={selectedItems}
                totalItems={areFiltersActive ? filteredResults.length : results.length}
                isCopied={isClipboardCopied}
                onCopy={copyResultsToClipboard}
                buttonStyles={buttonStyles}
                showOnlyWhenSelected={true}
              />
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
                  onChange={e => setInputValue(e.target.value)}
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
              <Box sx={{ gap: 1, p: 2 }}>
                {displayResults.map((item: GitHubItem) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    githubToken={githubToken}
                    isCopied={isCopied}
                    onShowDescription={setSelectedItemForDialog}
                    onCloneItem={setSelectedItemForClone}
                    selected={selectedItems.has(item.event_id || item.id)}
                    onSelect={toggleItemSelection}
                    showCheckbox={!!toggleItemSelection}
                    showRepo={true}
                    showUser={true}
                    showTime={true}
                    size="small"
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ gap: 1, p: 2 }}>
                <Stack sx={{ gap: 3, p: 2 }}>
                  {displayResults.map((item: GitHubItem) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      githubToken={githubToken}
                      isCopied={isCopied}
                      onShowDescription={setSelectedItemForDialog}
                      onCloneItem={setSelectedItemForClone}
                      selected={selectedItems.has(item.event_id || item.id)}
                      onSelect={toggleItemSelection}
                      showCheckbox={!!toggleItemSelection}
                      showRepo={true}
                      showUser={true}
                      showTime={true}
                      size="medium"
                    />
                  ))}
                </Stack>
              </Box>
            );
          })()}
        </div>
      </ResultsContainer>

      {/* Description Dialog */}
      <DescriptionDialog
        item={selectedItemForDialog}
        onClose={() => setSelectedItemForDialog(null)}
        onPrevious={handlePreviousItem}
        onNext={handleNextItem}
        hasPrevious={getCurrentItemIndex() > 0}
        hasNext={getCurrentItemIndex() < filteredResults.length - 1}
        title={selectedItemForDialog ? <DialogTitle item={selectedItemForDialog} /> : undefined}
        maxHeight="70vh"
      />

      {/* Clone Issue Dialog */}
      <CloneIssueDialog
        isOpen={selectedItemForClone !== null}
        onClose={() => setSelectedItemForClone(null)}
        originalIssue={selectedItemForClone}
        onSuccess={newIssue => {
          console.log('Issue cloned successfully:', newIssue);
          // Optionally refresh data or show success message
        }}
      />
    </Box>
  );
});

export default IssuesAndPRsList;
