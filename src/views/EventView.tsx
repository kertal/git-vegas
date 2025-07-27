import { memo, useMemo, useState, useCallback, useEffect } from 'react';
import {
  Text,
  Checkbox,
  Box,
  Pagination,
} from '@primer/react';
import { GitHubItem, GitHubEvent } from '../types';
import { ResultsContainer } from '../components/ResultsContainer';
// import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { filterItemsByAdvancedSearch, sortItemsByUpdatedDate } from '../utils/viewFiltering';
import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';

import DescriptionDialog from '../components/DescriptionDialog';
import BulkCopyButtons from '../components/BulkCopyButtons';
import ItemRow from '../components/ItemRow';
import EmptyState from '../components/EmptyState';
import './EventView.css';

import { useLocalStorage } from '../hooks/useLocalStorage';



interface EventViewProps {
  items: GitHubItem[];
  rawEvents?: GitHubEvent[];
}

const EventView = memo(function EventView({
  items,
  rawEvents = [],
}: EventViewProps) {

  
  // Internal state for selection
  const [selectedItems, setSelectedItems] = useLocalStorage<Set<string | number>>('eventView-selectedItems', new Set());
  
  // Internal state for search (search functionality temporarily hidden)
  const [searchText] = useLocalStorage<string>('eventView-searchText', '');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useLocalStorage<number>('eventView-currentPage', 1);
  const itemsPerPage = 100;

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
  
  // Use debounced search hook (search functionality temporarily hidden)
  // const { inputValue, setInputValue, clearSearch } = useDebouncedSearch(
  //   searchText,
  //   setSearchText,
  //   300
  // );

  // Use copy feedback hook
  const { isCopied, triggerCopy } = useCopyFeedback(2000);



  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = sortedItems.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = useCallback((_event: React.MouseEvent, page: number) => {
    setCurrentPage(page);
  }, []);

  // Select all items across all pages
  const selectAllItems = useCallback(() => {
    setSelectedItems(new Set(sortedItems.map((item: GitHubItem) => item.event_id || item.id)));
  }, [sortedItems]);

  // Internal copy handler for content
  const copyResultsToClipboard = useCallback(async (format: 'detailed' | 'compact') => {
    const selectedItemsArray =
      selectedItems.size > 0
        ? sortedItems.filter((item: GitHubItem) =>
            selectedItems.has(item.event_id || item.id)
          )
        : sortedItems;

    await copyToClipboard(selectedItemsArray, {
      isCompactView: format === 'compact',
      onSuccess: () => {
        // Trigger visual feedback via copy feedback system
        triggerCopy(format);
      },
      onError: (error: Error) => {
        console.error('Failed to copy results:', error);
      },
    });
  }, [sortedItems, selectedItems, triggerCopy]);



  // Clipboard feedback helper
  const isClipboardCopied = useCallback((itemId: string | number) => {
    return isCopied(itemId);
  }, [isCopied]);

  // Calculate select all checkbox state
  const selectAllState = useMemo(() => {
    if (sortedItems.length === 0) {
      return { checked: false, indeterminate: false };
    }

    const selectedCount = sortedItems.filter(item =>
      selectedItems.has(item.event_id || item.id)
    ).length;

    if (selectedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedCount === sortedItems.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  }, [sortedItems, selectedItems]);

  // Handle select all checkbox click
  const handleSelectAllChange = () => {
    const selectedCount = sortedItems.filter((item: GitHubItem) =>
      selectedItems.has(item.event_id || item.id)
    ).length;

    if (selectedCount === sortedItems.length) {
      // All are selected, clear selection
      clearSelection();
    } else {
      // Some or none are selected, select all
      selectAllItems();
    }
  };

  // Description dialog state and handlers
  const [selectedItemForDialog, setSelectedItemForDialog] =
    useState<GitHubItem | null>(null);



  // Check if we have no results but should show different messages
  const hasRawEvents = rawEvents && rawEvents.length > 0;
  const hasSearchText = searchText && searchText.trim().length > 0;

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
      (item: GitHubItem) => item.id === selectedItemForDialog.id
    );
    if (currentIndex < sortedItems.length - 1) {
      setSelectedItemForDialog(sortedItems[currentIndex + 1]);
    }
  };

  const getCurrentItemIndex = () => {
    if (!selectedItemForDialog) return -1;
    return sortedItems.findIndex((item: GitHubItem) => item.id === selectedItemForDialog.id);
  };

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
          {totalPages > 1 && (
            <Text as="span" sx={{ fontSize: 1, color: 'fg.muted', ml: 2 }}>
              (Page {currentPage} of {totalPages})
            </Text>
          )}
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
          <strong>Note:</strong> Events includes up to 300 events from the past 30 days. Event latency can be 30s to 6h depending on time of day.
        </Text>
      </Box>

      {/* Timeline content */}
      <div className="timeline-content">
        {sortedItems.length === 0 ? (
          <EmptyState
            type={hasSearchText ? 'no-search-results' : !hasRawEvents ? 'no-cached-data' : 'no-data'}
            searchText={searchText}
            showClearSearch={!!searchText}
            onClearSearch={() => {}}
          />
        ) : (
          // Standard timeline view
          <>
            {paginatedItems.map((item: GitHubItem, index: number) => (
              <ItemRow
                key={`${item.id}-${index}`}
                item={item}
                onShowDescription={setSelectedItemForDialog}
                selected={selectedItems.has(item.event_id || item.id)}
                onSelect={toggleItemSelection}
                showCheckbox={!!toggleItemSelection}
                showRepo={true}
                showUser={true}
                showTime={true}
                size="small"
              />
            ))}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                mt: 4, 
                pb: 3 
              }}>
                <Pagination
                  pageCount={totalPages}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  showPages={{ narrow: false }}
                  marginPageCount={2}
                  surroundingPageCount={2}
                />
              </Box>
            )}
          </>
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

export default EventView; 