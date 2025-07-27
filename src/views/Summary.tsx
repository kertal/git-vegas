import { memo, useMemo, useState, useCallback } from 'react';
import {
  Text,
  Button,
  Heading,
  Checkbox,
  Box,
} from '@primer/react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from '@primer/octicons-react';
import { GitHubItem, GitHubEvent } from '../types';

import { ResultsContainer } from '../components/ResultsContainer';
import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { parseSearchText } from '../utils/resultsUtils';
import { CloneIssueDialog } from '../components/CloneIssueDialog';
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
  // Get GitHub token and form settings from form context
  const { githubToken, startDate, endDate, username } = useFormContext();
  
  // Internal state for selection
  const [selectedItems, setSelectedItems] = useLocalStorage<Set<string | number>>('summary-selectedItems', new Set());
  
  // Internal state for search
  const [searchText] = useLocalStorage<string>('summary-searchText', '');
  
  // Internal state for collapsed sections
  const [collapsedSections, setCollapsedSections] = useLocalStorage<Set<string>>('summary-collapsedSections', new Set());
  
  // Use debounced search hook (search functionality temporarily hidden)
  // const { inputValue, setInputValue, clearSearch } = useDebouncedSearch(
  //   searchText,
  //   setSearchText,
  //   300
  // );

  // Use copy feedback hook
  const { isCopied, triggerCopy } = useCopyFeedback(2000);

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


  // Memoize search text parsing to avoid repeated regex operations
  const parsedSearchText = useMemo(() => {
    return parseSearchText(searchText || '');
  }, [searchText]);

  // Filter items by search text
  const filteredItems = useMemo(() => {
    if (!searchText || !searchText.trim()) {
      return items;
    }

    const { includedLabels, excludedLabels, userFilters, cleanText } = parsedSearchText;

    return items.filter(item => {
      // Check label filters first
      if (includedLabels.length > 0 || excludedLabels.length > 0) {
        const itemLabels = (item.labels || []).map(label =>
          label.name.toLowerCase()
        );

        // Check if item has all required included labels
        if (includedLabels.length > 0) {
          const hasAllIncludedLabels = includedLabels.every(labelName =>
            itemLabels.includes(labelName.toLowerCase())
          );
          if (!hasAllIncludedLabels) return false;
        }

        // Check if item has any excluded labels
        if (excludedLabels.length > 0) {
          const hasExcludedLabel = excludedLabels.some(labelName =>
            itemLabels.includes(labelName.toLowerCase())
          );
          if (hasExcludedLabel) return false;
        }
      }

      // Check user filters
      if (userFilters.length > 0) {
        const itemUser = item.user.login.toLowerCase();
        const matchesUser = userFilters.some(userFilter =>
          itemUser === userFilter.toLowerCase()
        );
        if (!matchesUser) return false;
      }

      // If there's clean text remaining, search in title, body, and username
      if (cleanText) {
        const searchLower = cleanText.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(searchLower);
        const bodyMatch = item.body?.toLowerCase().includes(searchLower);
        const userMatch = item.user.login.toLowerCase().includes(searchLower);
        return titleMatch || bodyMatch || userMatch;
      }

      // If only label/user filters were used, item passed checks above
      return true;
    });
  }, [items, parsedSearchText, searchText]);

  // Sort filtered items by updated date (newest first)
  const sortedItems = [...filteredItems].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );



  // Grouping logic for summary view using extracted utility functions
  const actionGroups = useMemo(() => {
    return groupSummaryData(
      sortedItems,
      indexedDBSearchItems,
      username,
      startDate,
      endDate
    );
  }, [sortedItems, indexedDBSearchItems, startDate, endDate, username]);

  // Select all items that are actually displayed in the view
  const selectAllItems = useCallback(() => {
    const allDisplayedItems = getAllDisplayedItems(actionGroups);
    setSelectedItems(new Set(allDisplayedItems.map(item => item.event_id || item.id)));
  }, [actionGroups]);

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

  // Calculate select all checkbox state
  const selectAllState = useMemo(() => {
    const allDisplayedItems = Object.values(actionGroups).flat();
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
  }, [actionGroups, selectedItems]);

  // Handle select all checkbox click
  const handleSelectAllChange = () => {
    const allDisplayedItems = Object.values(actionGroups).flat();
    const selectedCount = allDisplayedItems.filter(item =>
      selectedItems.has(item.event_id || item.id)
    ).length;

    if (selectedCount === allDisplayedItems.length) {
      // All are selected, clear selection
      clearSelection?.();
    } else {
      // Some or none are selected, select all
      selectAllItems?.();
    }
  };

  // Description dialog state and handlers
  const [selectedItemForDialog, setSelectedItemForDialog] =
    useState<GitHubItem | null>(null);

  // Clone dialog state
  const [selectedItemForClone, setSelectedItemForClone] =
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
  const headerRight = (
    <div className="timeline-header-right">
      {/* Search functionality temporarily hidden */}
    </div>
  );

  return (
    <ResultsContainer
      headerLeft={headerLeft}
      headerRight={headerRight}
      className="timeline-view"
    >
      {/* API Limitation Note */}
      <Box sx={{ p: 2,  bg: 'attention.subtle'}}>
        <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
          <strong>Note:</strong> This view merges  the last 100 Github issues/PRs and 300 public Github Events per user. 
           Event latency can be 30s to 6h depending on time of day.
        </Text>
      </Box>

      {/* Timeline content */}
      <div className="timeline-content">
        {!hasAnyItems(actionGroups) ? (
          <EmptyState
            type={hasSearchText ? 'no-search-results' : !hasRawEvents ? 'no-cached-data' : 'no-data'}
            searchText={searchText}
            showClearSearch={!!searchText}
            onClearSearch={() => {}}
          />
        ) : (
          // Grouped view - organize events by individual issues/PRs and by type
          Object.entries(actionGroups).map(([groupName, groupItems]) => {
            if (groupItems.length === 0) return null;
            // Group items by URL
            const urlGroups: { [url: string]: GitHubItem[] } = {};
            groupItems.forEach(item => {
              let groupingUrl = item.html_url;
              if (getEventType(item) === 'comment') {
                groupingUrl = groupingUrl.split('#')[0];
              }
              if (!urlGroups[groupingUrl]) {
                urlGroups[groupingUrl] = [];
              }
              urlGroups[groupingUrl].push(item);
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
                      />
                      <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'bold', m: 0 }}>
                        {groupName}
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
                            githubToken={githubToken}
                            onShowDescription={setSelectedItemForDialog}
                            onCloneItem={setSelectedItemForClone}
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
    </ResultsContainer>
  );
});

export default SummaryView;
