import { memo, useMemo, useCallback } from 'react';
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
import { GitHubItem, GitHubEvent, getItemId } from '../types';

import { ResultsContainer } from '../components/ResultsContainer';
import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { useListSelection } from '../hooks/useListSelection';
import { useDialogNavigation } from '../hooks/useDialogNavigation';
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
  getGroupSelectState,
} from '../utils/summaryHelpers';
import { DismissibleBanner } from '../components/DismissibleBanner';

interface SummaryProps {
  items: GitHubItem[];
  rawEvents?: GitHubEvent[];
  indexedDBSearchItems?: GitHubItem[];
  indexedDBReviewItems?: GitHubItem[];
}

/** Returns the most recently updated item from a group. */
const getMostRecent = (items: GitHubItem[]): GitHubItem =>
  items.reduce((latest, current) =>
    new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest
  );

/** Groups items by URL, deduplicating comments and separating reviewers. */
const groupItemsByUrl = (groupItems: GitHubItem[]): Record<string, GitHubItem[]> => {
  const urlGroups: Record<string, GitHubItem[]> = {};
  groupItems.forEach(item => {
    let groupingKey = item.html_url;
    if (getEventType(item) === 'comment') {
      groupingKey = groupingKey.split('#')[0];
    }
    const isReview = (item.title && item.title.startsWith('Review on:')) || item.originalEventType === 'PullRequestReviewEvent';
    if (isReview) {
      groupingKey = `${item.user.login}:${groupingKey}`;
    }
    if (!urlGroups[groupingKey]) {
      urlGroups[groupingKey] = [];
    }
    urlGroups[groupingKey].push(item);
  });
  return urlGroups;
};

const SummaryView = memo(function SummaryView({
  items,
  rawEvents = [],
  indexedDBSearchItems = [],
  indexedDBReviewItems = [],
}: SummaryProps) {
  const { startDate, endDate, searchText, setSearchText } = useFormContext();

  const [collapsedSections, setCollapsedSections] = useLocalStorage<Set<string>>('summary-collapsedSections', new Set());

  // Filter and sort items
  const filteredItems = filterItemsByAdvancedSearch(items, searchText);
  const sortedItems = sortItemsByUpdatedDate(filteredItems);

  // Filtered search items for summary grouping
  const filteredIndexedDBSearchItems = useMemo(() => {
    return filterItemsByAdvancedSearch(indexedDBSearchItems, searchText);
  }, [indexedDBSearchItems, searchText]);

  // Filtered review items for summary grouping
  const filteredIndexedDBReviewItems = useMemo(() => {
    return filterItemsByAdvancedSearch(indexedDBReviewItems, searchText);
  }, [indexedDBReviewItems, searchText]);

  // Group items for summary view
  const actionGroups = useMemo(() => {
    return groupSummaryData(sortedItems, filteredIndexedDBSearchItems, startDate, endDate, filteredIndexedDBReviewItems);
  }, [sortedItems, filteredIndexedDBSearchItems, startDate, endDate, filteredIndexedDBReviewItems]);

  // Build flat list of items from expanded sections for selection
  const allDisplayedItems = useMemo(() => {
    return Object.entries(actionGroups)
      .filter(([groupName]) => !collapsedSections.has(groupName))
      .flatMap(([, items]) => items);
  }, [actionGroups, collapsedSections]);

  // Shared hooks
  const {
    selectedItems, toggleItemSelection, selectAllItems, clearSelection,
    bulkSelectItems, selectAllState,
  } = useListSelection('summary-selectedItems', allDisplayedItems);

  const {
    selectedItemForDialog, setSelectedItemForDialog,
    handlePreviousItem, handleNextItem, hasPrevious, hasNext,
  } = useDialogNavigation(sortedItems);

  const { isCopied, triggerCopy } = useCopyFeedback(2000);

  // Toggle section collapse and clear selections on collapse
  const toggleSectionCollapse = useCallback((sectionName: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
        const sectionItems = actionGroups[sectionName as keyof typeof actionGroups] || [];
        if (sectionItems.length > 0) {
          const idsToRemove = sectionItems.map(item => getItemId(item));
          bulkSelectItems(idsToRemove, false);
        }
      }
      return newSet;
    });
  }, [actionGroups, bulkSelectItems]);

  // Copy handler
  const copyResultsToClipboard = useCallback(async (format: 'detailed' | 'compact') => {
    const groupedData = formatGroupedDataForClipboard(actionGroups, selectedItems);
    const allItems = getAllDisplayedItems(actionGroups);
    const selectedItemsArray =
      selectedItems.size > 0
        ? allItems.filter(item => selectedItems.has(getItemId(item)))
        : allItems;

    await copyToClipboard(selectedItemsArray, {
      isCompactView: format === 'compact',
      isGroupedView: true,
      groupedData,
      onSuccess: () => triggerCopy(format),
      onError: (error: Error) => console.error('Failed to copy grouped results:', error),
    });
  }, [actionGroups, selectedItems, triggerCopy]);

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
  const hasItems = Object.values(actionGroups).some(items => items.length > 0);

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
      className="timeline-view"
    >
      <DismissibleBanner bannerId="summary-api-limitation">
        <strong>Note:</strong> This view merges the last 100 GitHub issues/PRs and 300 public GitHub Events per user.
        Event latency can be 30s to 6h depending on time of day.
      </DismissibleBanner>

      <div className="timeline-content">
        {!hasItems ? (
          <EmptyState
            type={hasSearchText ? 'no-search-results' : !hasRawEvents ? 'no-cached-data' : 'no-data'}
            searchText={searchText}
            showClearSearch={!!searchText}
            onClearSearch={() => setSearchText('')}
          />
        ) : (
          Object.entries(actionGroups).map(([groupName, groupItems]) => {
            if (groupItems.length === 0) return null;
            const urlGroups = groupItemsByUrl(groupItems);
            const mostRecentIds = Object.values(urlGroups).map(items => getItemId(getMostRecent(items)));
            const selectedCount = mostRecentIds.filter(id => selectedItems.has(id)).length;
            const isCollapsed = collapsedSections.has(groupName);

            return (
              <div key={groupName} className="timeline-section">
                <div className="timeline-section-header">
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                      <Checkbox
                        {...getGroupSelectState(groupItems, selectedItems)}
                        onChange={() => {
                          if (isCollapsed) return;
                          bulkSelectItems(mostRecentIds, selectedCount !== mostRecentIds.length);
                        }}
                        sx={{ flexShrink: 0 }}
                        aria-label={`Select all events in ${groupName} section`}
                        disabled={isCollapsed}
                      />
                      <Heading as="h3" sx={{ fontSize: 1, fontWeight: 'bold', m: 0 }}>
                        {groupName}
                      </Heading>
                      <Token
                        text={selectedCount > 0 ? `${selectedCount} / ${mostRecentIds.length}` : `${mostRecentIds.length}`}
                        size="small"
                        sx={{ ml: 2, flexShrink: 0 }}
                      />
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
                        '&:hover': { color: 'fg.default' },
                      }}
                      aria-label={`${isCollapsed ? 'Show' : 'Hide'} ${groupName} section`}
                    >
                      {isCollapsed ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                    </Button>
                  </Box>
                </div>
                {!isCollapsed && (
                  <div className="timeline-section-content">
                    {Object.entries(urlGroups).map(([url, items]) => {
                      const mostRecent = getMostRecent(items);
                      return (
                        <div key={url} className="timeline-group">
                          <ItemRow
                            item={mostRecent}
                            onShowDescription={setSelectedItemForDialog}
                            selected={selectedItems.has(getItemId(mostRecent))}
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

export default SummaryView;
