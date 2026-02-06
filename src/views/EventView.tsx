import { memo, useEffect } from 'react';
import {
  Text,
  Checkbox,
  Box,
  Pagination,
} from '@primer/react';
import { GitHubItem, GitHubEvent } from '../types';
import { ResultsContainer } from '../components/ResultsContainer';

import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { useListSelection } from '../hooks/useListSelection';
import { useDialogNavigation } from '../hooks/useDialogNavigation';
import { filterItemsByAdvancedSearch, sortItemsByUpdatedDate } from '../utils/viewFiltering';
import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';

import DescriptionDialog from '../components/DescriptionDialog';
import BulkCopyButtons from '../components/BulkCopyButtons';
import ItemRow from '../components/ItemRow';
import EmptyState from '../components/EmptyState';
import './EventView.css';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { DismissibleBanner } from '../components/DismissibleBanner';
import { useFormContext } from '../App';

interface EventViewProps {
  items: GitHubItem[];
  rawEvents?: GitHubEvent[];
}

const EventView = memo(function EventView({
  items,
  rawEvents = [],
}: EventViewProps) {
  const { searchText, setSearchText } = useFormContext();

  // Pagination state
  const [currentPage, setCurrentPage] = useLocalStorage<number>('eventView-currentPage', 1);
  const itemsPerPage = 100;

  // Filter and sort items
  const filteredItems = filterItemsByAdvancedSearch(items, searchText);
  const sortedItems = sortItemsByUpdatedDate(filteredItems);

  // Shared hooks
  const {
    selectedItems, toggleItemSelection, selectAllItems, clearSelection,
    selectAllState,
  } = useListSelection('eventView-selectedItems', sortedItems);

  const {
    selectedItemForDialog, setSelectedItemForDialog,
    handlePreviousItem, handleNextItem, hasPrevious, hasNext,
  } = useDialogNavigation(sortedItems);

  const { isCopied, triggerCopy } = useCopyFeedback(2000);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  // Pagination
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = sortedItems.slice(startIndex, startIndex + itemsPerPage);

  // Copy handler
  const copyResultsToClipboard = async (format: 'detailed' | 'compact') => {
    const selectedItemsArray =
      selectedItems.size > 0
        ? sortedItems.filter((item: GitHubItem) =>
            selectedItems.has(item.event_id || item.id)
          )
        : sortedItems;

    await copyToClipboard(selectedItemsArray, {
      isCompactView: format === 'compact',
      onSuccess: () => triggerCopy(format),
      onError: (error: Error) => console.error('Failed to copy results:', error),
    });
  };

  // Select all toggle
  const handleSelectAllChange = () => {
    if (selectAllState.checked) {
      clearSelection();
    } else {
      selectAllItems();
    }
  };

  const hasRawEvents = rawEvents && rawEvents.length > 0;
  const hasSearchText = searchText && searchText.trim().length > 0;

  return (
    <ResultsContainer
      headerLeft={
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Checkbox
              checked={selectAllState.checked}
              indeterminate={selectAllState.indeterminate}
              onChange={handleSelectAllChange}
              aria-label="Select all events"
              disabled={sortedItems.length === 0}
            />
            <Text sx={{ fontSize: 1, color: 'fg.default', m: 0 }}>
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
            isCopied={isCopied}
            onCopy={copyResultsToClipboard}
            showOnlyWhenSelected={true}
          />
        </>
      }
      headerRight={null}
      className="timeline-view"
    >
      <DismissibleBanner bannerId="events-api-limitation">
        <strong>Note:</strong> Events includes up to 300 events from the past 30 days. Event latency can be 30s to 6h depending on time of day.
      </DismissibleBanner>

      <div className="timeline-content">
        {sortedItems.length === 0 ? (
          <EmptyState
            type={hasSearchText ? 'no-search-results' : !hasRawEvents ? 'no-cached-data' : 'no-data'}
            searchText={searchText}
            showClearSearch={!!searchText}
            onClearSearch={() => setSearchText('')}
          />
        ) : (
          <>
            {paginatedItems.map((item: GitHubItem, index: number) => (
              <ItemRow
                key={`${item.id}-${index}`}
                item={item}
                onShowDescription={setSelectedItemForDialog}
                selected={selectedItems.has(item.event_id || item.id)}
                onSelect={toggleItemSelection}
                showCheckbox={true}
                showRepo={true}
                showTime={true}
                size="small"
              />
            ))}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, pb: 3 }}>
                <Pagination
                  pageCount={totalPages}
                  currentPage={currentPage}
                  onPageChange={(_event: React.MouseEvent, page: number) => setCurrentPage(page)}
                  showPages={{ narrow: false }}
                  marginPageCount={2}
                  surroundingPageCount={2}
                />
              </Box>
            )}
          </>
        )}
      </div>

      <DescriptionDialog
        item={selectedItemForDialog}
        onClose={() => setSelectedItemForDialog(null)}
        onPrevious={handlePreviousItem}
        onNext={handleNextItem}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
      />
    </ResultsContainer>
  );
});

export default EventView;
