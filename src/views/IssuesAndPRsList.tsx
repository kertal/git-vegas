import React, { memo, useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Text,
  Checkbox,
  Button,
  Heading,
  Pagination,
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
  const { searchText, setSearchText } = useFormContext();

  // Internal state management (previously from context)
  
  // Internal state for selection and collapsed sections
  const [selectedItems, setSelectedItems] = useLocalStorage<Set<string | number>>('issuesAndPRs-selectedItems', new Set());
  const [collapsedSections, setCollapsedSections] = useLocalStorage<Set<string>>('issuesAndPRs-collapsedSections', new Set());

  // Pagination state - separate for each section
  const [prsCurrentPage, setPrsCurrentPage] = useLocalStorage<number>('issuesAndPRs-prsCurrentPage', 1);
  const [issuesCurrentPage, setIssuesCurrentPage] = useLocalStorage<number>('issuesAndPRs-issuesCurrentPage', 1);
  const itemsPerPage = 100;

  // Use copy feedback hook
  const { isCopied, triggerCopy } = useCopyFeedback(2000);

  // Apply search text filtering to results
  const filteredResults = useMemo(() => {
    return filterItemsByAdvancedSearch(results, searchText);
  }, [results, searchText]);

  // Reset to first page when search changes
  useEffect(() => {
    setPrsCurrentPage(1);
    setIssuesCurrentPage(1);
  }, [searchText]);

  // Define helper variables for empty state logic (consistent with other views)
  const hasRawData = results && results.length > 0;
  const hasSearchText = searchText && searchText.trim().length > 0;

  // Group items into sections (before pagination)
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

  // Calculate pagination for each section
  const prsTotalPages = Math.ceil(groupedItems['PRs'].length / itemsPerPage);
  const prsStartIndex = (prsCurrentPage - 1) * itemsPerPage;
  const paginatedPRs = groupedItems['PRs'].slice(prsStartIndex, prsStartIndex + itemsPerPage);

  const issuesTotalPages = Math.ceil(groupedItems['Issues'].length / itemsPerPage);
  const issuesStartIndex = (issuesCurrentPage - 1) * itemsPerPage;
  const paginatedIssues = groupedItems['Issues'].slice(issuesStartIndex, issuesStartIndex + itemsPerPage);

  // Paginated grouped items for display
  const paginatedGroupedItems = useMemo(() => ({
    'PRs': paginatedPRs,
    'Issues': paginatedIssues,
  }), [paginatedPRs, paginatedIssues]);

  // Handle page change for each section
  const handlePrsPageChange = useCallback((_event: React.MouseEvent, page: number) => {
    setPrsCurrentPage(page);
  }, []);

  const handleIssuesPageChange = useCallback((_event: React.MouseEvent, page: number) => {
    setIssuesCurrentPage(page);
  }, []);

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
    const allDisplayedItems = Object.entries(paginatedGroupedItems)
      .filter(([groupName]) => !collapsedSections.has(groupName))
      .flatMap(([, items]) => items);
    setSelectedItems(new Set(allDisplayedItems.map((item: GitHubItem) => item.event_id || item.id)));
  }, [paginatedGroupedItems, collapsedSections]);

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
        const sectionItems = paginatedGroupedItems[sectionName as keyof typeof paginatedGroupedItems] || [];
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
  }, [paginatedGroupedItems, setSelectedItems]);

  // Copy results to clipboard for content
  const copyResultsToClipboard = useCallback(async (format: 'detailed' | 'compact') => {
    // Convert to the format expected by clipboard utility
    const groupedData = Object.entries(paginatedGroupedItems)
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
    const allItems = Object.values(paginatedGroupedItems).flat();
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
  }, [paginatedGroupedItems, selectedItems, triggerCopy]);

  // Clipboard feedback helper
  const isClipboardCopied = useCallback((itemId: string | number) => {
    return isCopied(itemId);
  }, [isCopied]);

  // Calculate select all checkbox state (only consider expanded sections)
  const selectAllState = useMemo(() => {
    const allDisplayedItems = Object.entries(paginatedGroupedItems)
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
  }, [paginatedGroupedItems, selectedItems, collapsedSections]);

  // Handle select all checkbox click (only consider expanded sections)
  const handleSelectAllChange = () => {
    const allDisplayedItems = Object.entries(paginatedGroupedItems)
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
    const allItems = Object.values(paginatedGroupedItems).flat();
    const currentIndex = allItems.findIndex(
      item => item.id === selectedItemForDialog.id
    );
    if (currentIndex > 0) {
      setSelectedItemForDialog(allItems[currentIndex - 1]);
    }
  };

  const handleNextItem = () => {
    if (!selectedItemForDialog) return;
    const allItems = Object.values(paginatedGroupedItems).flat();
    const currentIndex = allItems.findIndex(
      item => item.id === selectedItemForDialog.id
    );
    if (currentIndex < allItems.length - 1) {
      setSelectedItemForDialog(allItems[currentIndex + 1]);
    }
  };

  const getCurrentItemIndex = () => {
    if (!selectedItemForDialog) return -1;
    const allItems = Object.values(paginatedGroupedItems).flat();
    return allItems.findIndex(item => item.id === selectedItemForDialog.id);
  };

  const allDisplayedItems = Object.entries(paginatedGroupedItems)
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
        headerRight={null}
      >
        <div className="timeline-container">
          {/* Results List */}
          {(() => {
            if (allDisplayedItems.length === 0) {
              return (
                <EmptyState
                  type={hasSearchText ? 'no-search-results' : !hasRawData ? 'no-cached-data' : 'no-data'}
                  searchText={searchText}
                  showClearSearch={!!searchText}
                  onClearSearch={() => setSearchText('')}
                />
              );
            }

            return (
              <div className="timeline-content">
                {/* PRs Section */}
                {groupedItems['PRs'].length > 0 && (
                  <div className="timeline-section">
                    <div className="timeline-section-header">
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                          <Checkbox
                            checked={(() => {
                              const sectionItemIds = paginatedGroupedItems['PRs'].map(item => item.event_id || item.id);
                              return sectionItemIds.length > 0 && sectionItemIds.every(id => selectedItems.has(id));
                            })()}
                            indeterminate={(() => {
                              const sectionItemIds = paginatedGroupedItems['PRs'].map(item => item.event_id || item.id);
                              const selectedCount = sectionItemIds.filter(id => selectedItems.has(id)).length;
                              return selectedCount > 0 && selectedCount < sectionItemIds.length;
                            })()}
                            onChange={() => {
                              if (collapsedSections.has('PRs')) return;
                              const sectionItemIds = paginatedGroupedItems['PRs'].map(item => item.event_id || item.id);
                              const selectedCount = sectionItemIds.filter(id => selectedItems.has(id)).length;
                              const allSelected = selectedCount === sectionItemIds.length;
                              bulkSelectItems(sectionItemIds, !allSelected);
                            }}
                            sx={{ flexShrink: 0 }}
                            aria-label="Select all items in PRs section"
                            disabled={collapsedSections.has('PRs')}
                          />
                          <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'bold', m: 0 }}>
                            PRs ({groupedItems['PRs'].length})
                            {prsTotalPages > 1 && (
                              <Text as="span" sx={{ fontSize: 1, fontWeight: 'normal', color: 'fg.muted', ml: 2 }}>
                                Page {prsCurrentPage} of {prsTotalPages}
                              </Text>
                            )}
                          </Heading>
                        </Box>
                        <Button
                          variant="invisible"
                          size="small"
                          onClick={() => toggleSectionCollapse('PRs')}
                          className="timeline-section-collapse-button"
                          sx={{
                            fontSize: '0.75rem',
                            color: 'fg.muted',
                            flexShrink: 0,
                            '&:hover': { color: 'fg.default' }
                          }}
                          aria-label={`${collapsedSections.has('PRs') ? 'Show' : 'Hide'} PRs section`}
                        >
                          {collapsedSections.has('PRs') ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                        </Button>
                      </Box>
                    </div>
                    {!collapsedSections.has('PRs') && (
                      <>
                        <div className="timeline-section-content">
                          {paginatedGroupedItems['PRs'].map((item: GitHubItem) => (
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
                        {prsTotalPages > 1 && (
                          <Box sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            mt: 3,
                            mb: 3
                          }}>
                            <Pagination
                              pageCount={prsTotalPages}
                              currentPage={prsCurrentPage}
                              onPageChange={handlePrsPageChange}
                              showPages={{ narrow: false }}
                              marginPageCount={2}
                              surroundingPageCount={2}
                            />
                          </Box>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Issues Section */}
                {groupedItems['Issues'].length > 0 && (
                  <div className="timeline-section">
                    <div className="timeline-section-header">
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                          <Checkbox
                            checked={(() => {
                              const sectionItemIds = paginatedGroupedItems['Issues'].map(item => item.event_id || item.id);
                              return sectionItemIds.length > 0 && sectionItemIds.every(id => selectedItems.has(id));
                            })()}
                            indeterminate={(() => {
                              const sectionItemIds = paginatedGroupedItems['Issues'].map(item => item.event_id || item.id);
                              const selectedCount = sectionItemIds.filter(id => selectedItems.has(id)).length;
                              return selectedCount > 0 && selectedCount < sectionItemIds.length;
                            })()}
                            onChange={() => {
                              if (collapsedSections.has('Issues')) return;
                              const sectionItemIds = paginatedGroupedItems['Issues'].map(item => item.event_id || item.id);
                              const selectedCount = sectionItemIds.filter(id => selectedItems.has(id)).length;
                              const allSelected = selectedCount === sectionItemIds.length;
                              bulkSelectItems(sectionItemIds, !allSelected);
                            }}
                            sx={{ flexShrink: 0 }}
                            aria-label="Select all items in Issues section"
                            disabled={collapsedSections.has('Issues')}
                          />
                          <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'bold', m: 0 }}>
                            Issues ({groupedItems['Issues'].length})
                            {issuesTotalPages > 1 && (
                              <Text as="span" sx={{ fontSize: 1, fontWeight: 'normal', color: 'fg.muted', ml: 2 }}>
                                Page {issuesCurrentPage} of {issuesTotalPages}
                              </Text>
                            )}
                          </Heading>
                        </Box>
                        <Button
                          variant="invisible"
                          size="small"
                          onClick={() => toggleSectionCollapse('Issues')}
                          className="timeline-section-collapse-button"
                          sx={{
                            fontSize: '0.75rem',
                            color: 'fg.muted',
                            flexShrink: 0,
                            '&:hover': { color: 'fg.default' }
                          }}
                          aria-label={`${collapsedSections.has('Issues') ? 'Show' : 'Hide'} Issues section`}
                        >
                          {collapsedSections.has('Issues') ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                        </Button>
                      </Box>
                    </div>
                    {!collapsedSections.has('Issues') && (
                      <>
                        <div className="timeline-section-content">
                          {paginatedGroupedItems['Issues'].map((item: GitHubItem) => (
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
                        {issuesTotalPages > 1 && (
                          <Box sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            mt: 3,
                            mb: 3
                          }}>
                            <Pagination
                              pageCount={issuesTotalPages}
                              currentPage={issuesCurrentPage}
                              onPageChange={handleIssuesPageChange}
                              showPages={{ narrow: false }}
                              marginPageCount={2}
                              surroundingPageCount={2}
                            />
                          </Box>
                        )}
                      </>
                    )}
                  </div>
                )}
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
        maxHeight="85vh"
      />


    </Box>
  );
});

export default IssuesAndPRsList;
