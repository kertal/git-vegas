import React, { memo, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Text,
  Checkbox,
  Button,
  Heading,
} from '@primer/react';
import {
  GitPullRequestIcon,
  IssueOpenedIcon,
  GitMergeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@primer/octicons-react';

import { GitHubItem } from '../types';

// import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { useFormContext } from '../App';
import { filterByText } from '../utils/resultsUtils';
import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';

import { ResultsContainer } from '../components/ResultsContainer';
import { CloneIssueDialog } from '../components/CloneIssueDialog';
import DescriptionDialog from '../components/DescriptionDialog';
import BulkCopyButtons from '../components/BulkCopyButtons';
import EmptyState from '../components/EmptyState';
import './EventView.css';
import ItemRow from '../components/ItemRow';
import { useLocalStorage } from '../hooks/useLocalStorage';

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
  // Get GitHub token and username from form context
  const { githubToken, username } = useFormContext();

  // Internal state management (previously from context)
  const [searchText] = useLocalStorage<string>('issuesAndPRs-searchText', '');
  const [selectedItems, setSelectedItems] = useLocalStorage<Set<string | number>>('issuesAndPRs-selectedItems', new Set());
  const [collapsedSections, setCollapsedSections] = useLocalStorage<Set<string>>('issuesAndPRs-collapsedSections', new Set());

  // Use copy feedback hook
  const { isCopied, triggerCopy } = useCopyFeedback(2000);

  // Apply search text filtering to results
  const filteredResults = useMemo(() => {
    return filterByText(results, searchText);
  }, [results, searchText]);

  // Group items into sections
  const groupedItems = useMemo(() => {
    const groups: {
      'PRs': GitHubItem[];
      'Issues Authored': GitHubItem[];
      'Issues Assigned': GitHubItem[];
    } = {
      'PRs': [],
      'Issues Authored': [],
      'Issues Assigned': [],
    };

    // Parse usernames from the search (can be comma-separated)
    const searchedUsernames = username.split(',').map(u => u.trim().toLowerCase());

    filteredResults.forEach(item => {
      if (item.pull_request) {
        // All pull requests go to PRs section
        groups['PRs'].push(item);
      } else {
        // For issues, check if authored by searched user(s) or assigned
        const itemAuthor = item.user.login.toLowerCase();
        if (searchedUsernames.includes(itemAuthor)) {
          groups['Issues Authored'].push(item);
        } else {
          // If not authored by searched user, it must be assigned (since our API query uses author OR assignee)
          groups['Issues Assigned'].push(item);
        }
      }
    });

    // Sort each group by updated date (newest first)
    Object.keys(groups).forEach(key => {
      groups[key as keyof typeof groups].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });

    return groups;
  }, [filteredResults, username]);

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
    const allDisplayedItems = Object.values(groupedItems).flat();
    setSelectedItems(new Set(allDisplayedItems.map((item: GitHubItem) => item.event_id || item.id)));
  }, [groupedItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const bulkSelectItems = useCallback((itemIds: (string | number)[], shouldSelect: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (shouldSelect) {
        itemIds.forEach(id => newSet.add(id));
      } else {
        itemIds.forEach(id => newSet.delete(id));
      }
      return newSet;
    });
  }, []);

  // Toggle section collapse state
  const toggleSectionCollapse = useCallback((sectionName: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  }, []);

  // Copy results to clipboard for content
  const copyResultsToClipboard = useCallback(async (format: 'detailed' | 'compact') => {
    // Convert to the format expected by clipboard utility
    const groupedData = Object.entries(groupedItems)
      .filter(([, items]) => items.length > 0)
      .map(([groupName, items]) => ({
        groupName,
        items,
      }));

    // Use the enhanced clipboard utility with grouped data
    // If items are selected, filter the grouped data to only include selected items
    let finalGroupedData = groupedData;
    if (selectedItems.size > 0) {
      finalGroupedData = groupedData.map(group => ({
        ...group,
        items: group.items.filter(item =>
          selectedItems.has(item.event_id || item.id)
        )
      })).filter(group => group.items.length > 0);
    }

    // Get all items for the clipboard (either selected or all)
    const allItems = Object.values(groupedItems).flat();
    const selectedItemsArray =
      selectedItems.size > 0
        ? allItems.filter(item =>
            selectedItems.has(item.event_id || item.id)
          )
        : allItems;

    await copyToClipboard(selectedItemsArray, {
      isCompactView: format === 'compact',
      isGroupedView: true,
      groupedData: finalGroupedData,
      onSuccess: () => {
        triggerCopy(format);
      },
      onError: (error: Error) => {
        console.error('Failed to copy grouped results:', error);
      },
    });
  }, [groupedItems, selectedItems, triggerCopy]);

  // Clipboard feedback helper
  const isClipboardCopied = useCallback((itemId: string | number) => {
    return isCopied(itemId);
  }, [isCopied]);

  // Calculate select all checkbox state
  const selectAllState = useMemo(() => {
    const allDisplayedItems = Object.values(groupedItems).flat();
    if (allDisplayedItems.length === 0) {
      return { checked: false, indeterminate: false };
    }

    const selectedCount = allDisplayedItems.filter(item =>
      selectedItems.has(item.event_id || item.id)
    ).length;

    if (selectedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedCount === allDisplayedItems.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  }, [groupedItems, selectedItems]);

  // Handle select all checkbox click
  const handleSelectAllChange = () => {
    const allDisplayedItems = Object.values(groupedItems).flat();
    const selectedCount = allDisplayedItems.filter(item =>
      selectedItems.has(item.event_id || item.id)
    ).length;

    if (selectedCount === allDisplayedItems.length) {
      // All are selected, clear selection
      clearSelection();
    } else {
      // Some or none are selected, select all
      selectAllItems();
    }
  };

  // Dialog state
  const [selectedItemForDialog, setSelectedItemForDialog] =
    useState<GitHubItem | null>(null);
  const [selectedItemForClone, setSelectedItemForClone] =
    useState<GitHubItem | null>(null);

  // Dialog navigation handlers
  const handlePreviousItem = () => {
    if (!selectedItemForDialog) return;
    const allItems = Object.values(groupedItems).flat();
    const currentIndex = allItems.findIndex(
      item => item.id === selectedItemForDialog.id
    );
    if (currentIndex > 0) {
      setSelectedItemForDialog(allItems[currentIndex - 1]);
    }
  };

  const handleNextItem = () => {
    if (!selectedItemForDialog) return;
    const allItems = Object.values(groupedItems).flat();
    const currentIndex = allItems.findIndex(
      item => item.id === selectedItemForDialog.id
    );
    if (currentIndex < allItems.length - 1) {
      setSelectedItemForDialog(allItems[currentIndex + 1]);
    }
  };

  const getCurrentItemIndex = () => {
    if (!selectedItemForDialog) return -1;
    const allItems = Object.values(groupedItems).flat();
    return allItems.findIndex(item => item.id === selectedItemForDialog.id);
  };

  const allDisplayedItems = Object.values(groupedItems).flat();

  return (
    <Box>
      <ResultsContainer
        headerLeft={
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Checkbox
                checked={selectAllState.checked}
                indeterminate={selectAllState.indeterminate}
                onChange={handleSelectAllChange}
                aria-label="Select all items"
                disabled={allDisplayedItems.length === 0}
              />
              <Text
                sx={{
                  fontSize: 1,
                  color: 'fg.default',
                  m: 0,
                }}
              >
                Select All
              </Text>
            </Box>
            <BulkCopyButtons
              selectedItems={selectedItems}
              totalItems={allDisplayedItems.length}
              isCopied={isClipboardCopied}
              onCopy={copyResultsToClipboard}
              buttonStyles={buttonStyles}
              showOnlyWhenSelected={true}
            />
          </>
        }
        headerRight={
          <>
            {/* Search functionality temporarily hidden */}
          </>
        }
      >
        <div className="timeline-container">
          {/* Results List */}
          {(() => {
            if (allDisplayedItems.length === 0) {
              return (
                <EmptyState
                  type={results.length === 0 ? 'no-data' : 'no-matches'}
                  searchText={searchText}
                  totalItems={results.length}
                  showClearSearch={!!searchText}
                  onClearSearch={() => {}}
                />
              );
            }

            return (
              <div className="timeline-content">
                {Object.entries(groupedItems).map(([groupName, groupItems]) => {
                  if (groupItems.length === 0) return null;

                  return (
                    <div key={groupName} className="timeline-section">
                      <div className="timeline-section-header">
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                            <Checkbox
                              checked={(() => {
                                const sectionItemIds = groupItems.map(item => item.event_id || item.id);
                                return sectionItemIds.length > 0 && sectionItemIds.every(id => selectedItems.has(id));
                              })()}
                              indeterminate={(() => {
                                const sectionItemIds = groupItems.map(item => item.event_id || item.id);
                                const selectedCount = sectionItemIds.filter(id => selectedItems.has(id)).length;
                                return selectedCount > 0 && selectedCount < sectionItemIds.length;
                              })()}
                              onChange={() => {
                                const sectionItemIds = groupItems.map(item => item.event_id || item.id);
                                const selectedCount = sectionItemIds.filter(id => selectedItems.has(id)).length;
                                const allSelected = selectedCount === sectionItemIds.length;
                                bulkSelectItems(sectionItemIds, !allSelected);
                              }}
                              sx={{ flexShrink: 0 }}
                              aria-label={`Select all items in ${groupName} section`}
                            />
                            <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'bold', m: 0 }}>
                              {groupName} ({groupItems.length})
                            </Heading>
                          </Box>
                          <Button
                            variant="invisible"
                            size="small"
                            onClick={() => toggleSectionCollapse(groupName)}
                            className="timeline-section-collapse-button"
                            sx={{ 
                              fontSize: '0.75rem',
                              color: 'fg.muted',
                              flexShrink: 0,
                              '&:hover': { color: 'fg.default' }
                            }}
                            aria-label={`${collapsedSections.has(groupName) ? 'Show' : 'Hide'} ${groupName} section`}
                          >
                            {collapsedSections.has(groupName) ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                          </Button>
                        </Box>
                      </div>
                      {!collapsedSections.has(groupName) && (
                        <div className="timeline-section-content">
                          {groupItems.map((item: GitHubItem) => (
                            <div key={item.id} className="timeline-group">
                              <ItemRow
                                item={item}
                                githubToken={githubToken}
                                onShowDescription={setSelectedItemForDialog}
                                onCloneItem={setSelectedItemForClone}
                                selected={selectedItems.has(item.event_id || item.id)}
                                onSelect={toggleItemSelection}
                                showCheckbox={true}
                                showRepo={true}
                                showUser={true}
                                showTime={true}
                                size="small"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
        hasNext={getCurrentItemIndex() < allDisplayedItems.length - 1}
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
