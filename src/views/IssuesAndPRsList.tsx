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
  GitPullRequestDraftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@primer/octicons-react';

import { GitHubItem } from '../types';

// import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { useFormContext } from '../App';

import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';
import { sortItemsByUpdatedDate } from '../utils/viewFiltering';
import { filterItemsByAdvancedSearch } from '../utils/viewFiltering';

import { ResultsContainer } from '../components/ResultsContainer';

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
          {item.draft || item.pull_request.draft ? (
            <GitPullRequestDraftIcon size={16} />
          ) : (
            <GitPullRequestIcon size={16} />
          )}
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
  // Get shared search text from form context
  const { searchText } = useFormContext();

  // Internal state management (previously from context)
  
  // Internal state for selection and collapsed sections
  const [selectedItems, setSelectedItems] = useLocalStorage<Set<string | number>>('issuesAndPRs-selectedItems', new Set());
  const [collapsedSections, setCollapsedSections] = useLocalStorage<Set<string>>('issuesAndPRs-collapsedSections', new Set());

  // Use copy feedback hook
  const { isCopied, triggerCopy } = useCopyFeedback(2000);

  // Apply search text filtering to results
  const filteredResults = useMemo(() => {
    return filterItemsByAdvancedSearch(results, searchText);
  }, [results, searchText]);

  // Group items into sections
  const groupedItems = useMemo(() => {
    const groups: {
      'PRs': GitHubItem[];
      'Issues': GitHubItem[];
    } = {
      'PRs': [],
      'Issues': [],
    };

    filteredResults.forEach(item => {
      if (item.pull_request) {
        // All pull requests go to PRs section
        groups['PRs'].push(item);
      } else {
        // All issues go to Issues section regardless of authorship
        groups['Issues'].push(item);
      }
    });

    // Sort each group by updated date (newest first)
    Object.keys(groups).forEach(key => {
      groups[key as keyof typeof groups] = sortItemsByUpdatedDate(groups[key as keyof typeof groups]);
    });

    return groups;
  }, [filteredResults]);

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
    const allDisplayedItems = Object.entries(groupedItems)
      .filter(([groupName]) => !collapsedSections.has(groupName))
      .flatMap(([, items]) => items);
    setSelectedItems(new Set(allDisplayedItems.map((item: GitHubItem) => item.event_id || item.id)));
  }, [groupedItems, collapsedSections]);

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

  // Toggle section collapse state and clear selections when collapsing
  const toggleSectionCollapse = useCallback((sectionName: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      const isCurrentlyCollapsed = newSet.has(sectionName);
      
      if (isCurrentlyCollapsed) {
        // Expanding the section
        newSet.delete(sectionName);
      } else {
        // Collapsing the section - clear any selected items in this section
        newSet.add(sectionName);
        
        // Find all items in this section and remove them from selection
        const sectionItems = groupedItems[sectionName as keyof typeof groupedItems] || [];
        if (sectionItems.length > 0) {
          setSelectedItems(prevSelected => {
            const newSelected = new Set(prevSelected);
            sectionItems.forEach(item => {
              newSelected.delete(item.event_id || item.id);
            });
            return newSelected;
          });
        }
      }
      return newSet;
    });
  }, [groupedItems, setSelectedItems]);

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

  // Calculate select all checkbox state (only consider expanded sections)
  const selectAllState = useMemo(() => {
    const allDisplayedItems = Object.entries(groupedItems)
      .filter(([groupName]) => !collapsedSections.has(groupName))
      .flatMap(([, items]) => items);
      
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
  }, [groupedItems, selectedItems, collapsedSections]);

  // Handle select all checkbox click (only consider expanded sections)
  const handleSelectAllChange = () => {
    const allDisplayedItems = Object.entries(groupedItems)
      .filter(([groupName]) => !collapsedSections.has(groupName))
      .flatMap(([, items]) => items);
      
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

  const allDisplayedItems = Object.entries(groupedItems)
    .filter(([groupName]) => !collapsedSections.has(groupName))
    .flatMap(([, items]) => items);

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
                                // Don't allow selection if section is collapsed
                                if (collapsedSections.has(groupName)) return;
                                
                                const sectionItemIds = groupItems.map(item => item.event_id || item.id);
                                const selectedCount = sectionItemIds.filter(id => selectedItems.has(id)).length;
                                const allSelected = selectedCount === sectionItemIds.length;
                                bulkSelectItems(sectionItemIds, !allSelected);
                              }}
                              sx={{ flexShrink: 0 }}
                              aria-label={`Select all items in ${groupName} section`}
                              disabled={collapsedSections.has(groupName)}
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
                                onShowDescription={setSelectedItemForDialog}
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


    </Box>
  );
});

export default IssuesAndPRsList;
