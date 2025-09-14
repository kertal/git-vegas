import { memo, useMemo, useState, useCallback } from 'react';
import {
  Text,
  Button,
  Heading,
  Checkbox,
  Box,
  Token,
} from '@primer/react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from '@primer/octicons-react';
import { GitHubItem, GitHubEvent } from '../types';

import { ResultsContainer } from '../components/ResultsContainer';
import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { filterItemsByAdvancedSearch, sortItemsByUpdatedDate } from '../utils/viewFiltering';

import DescriptionDialog from '../components/DescriptionDialog';
import BulkCopyButtons from '../components/BulkCopyButtons';
import ItemRow from '../components/ItemRow';
import EmptyState from '../components/EmptyState';
import './Summary.css';
import { useFormContext } from '../App';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { groupSummaryData, getEventType } from '../utils/summaryGrouping';
import { 
  formatGroupedDataForClipboard, 
  getAllDisplayedItems, 
  hasAnyItems,
  getGroupSelectState 
} from '../utils/summaryHelpers';
import { DismissibleBanner } from '../components/DismissibleBanner';


interface SummaryProps {
  items: GitHubItem[];
  rawEvents?: GitHubEvent[];
  indexedDBSearchItems?: GitHubItem[];
}

const SummaryView = memo(function SummaryView({
  items,
  rawEvents = [],
  indexedDBSearchItems = [],
}: SummaryProps) {
  // Get form settings from form context
  const { startDate, endDate, searchText, setSearchText } = useFormContext();
  
  // Internal state for selection and collapsed sections
  const [selectedItems, setSelectedItems] = useLocalStorage<Set<string | number>>('summary-selectedItems', new Set());
  const [collapsedSections, setCollapsedSections] = useLocalStorage<Set<string>>('summary-collapsedSections', new Set());
  
  // Filter and sort items using utility functions
  const filteredItems = filterItemsByAdvancedSearch(items, searchText);
  const sortedItems = sortItemsByUpdatedDate(filteredItems);
  
  // Internal selection handlers
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

  // Use copy feedback hook
  const { isCopied, triggerCopy } = useCopyFeedback(2000);

  // Filter IndexedDB search items with the same search criteria
  const filteredIndexedDBSearchItems = useMemo(() => {
    return filterItemsByAdvancedSearch(indexedDBSearchItems, searchText);
  }, [indexedDBSearchItems, searchText]);

  // Grouping logic for summary view using extracted utility functions
  const actionGroups = useMemo(() => {
    return groupSummaryData(
      sortedItems,
      filteredIndexedDBSearchItems,
      startDate,
      endDate
    );
  }, [sortedItems, filteredIndexedDBSearchItems, startDate, endDate]);

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
        const sectionItems = actionGroups[sectionName as keyof typeof actionGroups] || [];
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
  }, [actionGroups, setSelectedItems]);

  // Select all items that are actually displayed in the view (only from expanded sections)
  const selectAllItems = useCallback(() => {
    const allDisplayedItems = Object.entries(actionGroups)
      .filter(([groupName]) => !collapsedSections.has(groupName))
      .flatMap(([, items]) => items);
    setSelectedItems(new Set(allDisplayedItems.map(item => item.event_id || item.id)));
  }, [actionGroups, collapsedSections]);

  // Internal copy handler for content
  const copyResultsToClipboard = useCallback(async (format: 'detailed' | 'compact') => {
    const groupedData = formatGroupedDataForClipboard(actionGroups, selectedItems);

    // Get all items for the clipboard (either selected or all)
    const allItems = getAllDisplayedItems(actionGroups);
    const selectedItemsArray =
      selectedItems.size > 0
        ? allItems.filter(item =>
            selectedItems.has(item.event_id || item.id)
          )
        : allItems;

    await copyToClipboard(selectedItemsArray, {
      isCompactView: format === 'compact',
      isGroupedView: true,
      groupedData,
      onSuccess: () => {
        // Trigger visual feedback via copy feedback system
        triggerCopy(format);
      },
      onError: (error: Error) => {
        console.error('Failed to copy grouped results:', error);
      },
    });
  }, [actionGroups, selectedItems, triggerCopy]);



  // Clipboard feedback helper
  const isClipboardCopied = useCallback((itemId: string | number) => {
    return isCopied(itemId);
  }, [isCopied]);

  // Calculate select all checkbox state (only consider expanded sections)
  const selectAllState = useMemo(() => {
    const allDisplayedItems = Object.entries(actionGroups)
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
  }, [actionGroups, selectedItems, collapsedSections]);

  // Handle select all checkbox click (only consider expanded sections)
  const handleSelectAllChange = () => {
    const allDisplayedItems = Object.entries(actionGroups)
      .filter(([groupName]) => !collapsedSections.has(groupName))
      .flatMap(([, items]) => items);
      
    const selectedCount = allDisplayedItems.filter(item =>
      selectedItems.has(item.event_id || item.id)
    ).length;

    if (selectedCount === allDisplayedItems.length) {
      // All are selected, clear selection
      clearSelection?.();
    } else {
      // Some or none are selected, select all
      selectAllItems();
    }
  };

  // Description dialog state and handlers
  const [selectedItemForDialog, setSelectedItemForDialog] =
    useState<GitHubItem | null>(null);



  // Single item clipboard copy handler


  // Dialog navigation handlers
  const handlePreviousItem = () => {
    if (!selectedItemForDialog) return;
    const currentIndex = sortedItems.findIndex(
      item => item.id === selectedItemForDialog.id
    );
    if (currentIndex > 0) {
      setSelectedItemForDialog(sortedItems[currentIndex - 1]);
    }
  };

  const handleNextItem = () => {
    if (!selectedItemForDialog) return;
    const currentIndex = sortedItems.findIndex(
      item => item.id === selectedItemForDialog.id
    );
    if (currentIndex < sortedItems.length - 1) {
      setSelectedItemForDialog(sortedItems[currentIndex + 1]);
    }
  };

  const getCurrentItemIndex = () => {
    if (!selectedItemForDialog) return -1;
    return sortedItems.findIndex(item => item.id === selectedItemForDialog.id);
  };



  // Check if we have no results but should show different messages
  const hasRawEvents = rawEvents && rawEvents.length > 0;
  const hasSearchText = searchText && searchText.trim().length > 0;

  // Header left content
  const headerLeft = (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Checkbox
          checked={selectAllState.checked}
          indeterminate={selectAllState.indeterminate}
          onChange={handleSelectAllChange}
          aria-label="Select all events"
          disabled={sortedItems.length === 0}
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
        totalItems={sortedItems.length}
        isCopied={isClipboardCopied}
        onCopy={copyResultsToClipboard}
        showOnlyWhenSelected={true}
      />

    </>
  );

  // Header right content
  const headerRight = null;

  return (
    <ResultsContainer
      headerLeft={headerLeft}
      headerRight={headerRight}
      className="timeline-view"
    >
      {/* API Limitation Note */}
      <DismissibleBanner bannerId="summary-api-limitation">
        <strong>Note:</strong> This view merges the last 100 GitHub issues/PRs and 300 public GitHub Events per user. 
        Event latency can be 30s to 6h depending on time of day.
      </DismissibleBanner>

      {/* Timeline content */}
      <div className="timeline-content">
        {!hasAnyItems(actionGroups) ? (
          <EmptyState
            type={hasSearchText ? 'no-search-results' : !hasRawEvents ? 'no-cached-data' : 'no-data'}
            searchText={searchText}
            showClearSearch={!!searchText}
            onClearSearch={() => setSearchText('')}
          />
        ) : (
          // Grouped view - organize events by individual issues/PRs and by type
          Object.entries(actionGroups).map(([groupName, groupItems]) => {
            if (groupItems.length === 0) return null;
            // Group items by URL (for reviews, include user to allow multiple reviewers per PR)
            const urlGroups: { [url: string]: GitHubItem[] } = {};
            groupItems.forEach(item => {
              let groupingKey = item.html_url;
              if (getEventType(item) === 'comment') {
                groupingKey = groupingKey.split('#')[0];
              }
              
              // For reviews, include user in grouping key to allow multiple reviewers per PR
              const isReview = item.title.startsWith('Review on:') || item.originalEventType === 'PullRequestReviewEvent';
              if (isReview) {
                groupingKey = `${item.user.login}:${groupingKey}`;
              }
              
              if (!urlGroups[groupingKey]) {
                urlGroups[groupingKey] = [];
              }
              urlGroups[groupingKey].push(item);
            });
            // Render one ItemRow per group, showing groupCount
            return (
              <div key={groupName} className="timeline-section">
                <div className="timeline-section-header">
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                      <Checkbox
                        {...getGroupSelectState(groupItems, selectedItems)}
                        onChange={() => {
                          // Don't allow selection if section is collapsed
                          if (collapsedSections.has(groupName)) return;
                          
                          const sectionItemIds = Object.values(urlGroups).map(items => {
                            const mostRecent = items.reduce((latest, current) =>
                              new Date(current.updated_at) > new Date(latest.updated_at)
                                ? current
                                : latest
                            );
                            return mostRecent.event_id || mostRecent.id;
                          });
                          const selectedCount = sectionItemIds.filter(id => selectedItems.has(id)).length;
                          const allSelected = selectedCount === sectionItemIds.length;
                          bulkSelectItems(sectionItemIds, !allSelected);
                        }}
                        sx={{ flexShrink: 0 }}
                        aria-label={`Select all events in ${groupName} section`}
                        disabled={collapsedSections.has(groupName)}
                      />
                      <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'bold', m: 0 }}>
                        {groupName}
                      </Heading>
                      {(() => {
                        // Calculate total count (number of URL groups = number of displayed items)
                        const totalCount = Object.keys(urlGroups).length;
                        
                        // Calculate selected count
                        const sectionItemIds = Object.values(urlGroups).map(items => {
                          const mostRecent = items.reduce((latest, current) =>
                            new Date(current.updated_at) > new Date(latest.updated_at)
                              ? current
                              : latest
                          );
                          return mostRecent.event_id || mostRecent.id;
                        });
                        const selectedCount = sectionItemIds.filter(id => selectedItems.has(id)).length;
                        
                        return (
                          <Token
                            text={selectedCount > 0 ? `${selectedCount} / ${totalCount}` : `${totalCount}`}
                            size="small"
                            sx={{ ml: 2, flexShrink: 0 }}
                          />
                        );
                      })()}
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
                    {Object.entries(urlGroups).map(([url, items]) => {
                      // Show the most recent item in the group
                      const mostRecent = items.reduce((latest, current) =>
                        new Date(current.updated_at) > new Date(latest.updated_at)
                          ? current
                          : latest
                      );
                      return (
                        <div key={url} className="timeline-group">
                          <ItemRow
                            item={mostRecent}
                            onShowDescription={setSelectedItemForDialog}
                            selected={selectedItems.has(mostRecent.event_id || mostRecent.id)}
                            onSelect={toggleItemSelection}
                            showCheckbox={true}
                            groupCount={items.length > 1 ? items.length : undefined}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Description Dialog */}
      <DescriptionDialog
        item={selectedItemForDialog}
        onClose={() => setSelectedItemForDialog(null)}
        onPrevious={handlePreviousItem}
        onNext={handleNextItem}
        hasPrevious={getCurrentItemIndex() > 0}
        hasNext={getCurrentItemIndex() < sortedItems.length - 1}
      />


    </ResultsContainer>
  );
});

export default SummaryView;
