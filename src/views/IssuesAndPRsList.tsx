import React, { memo, useMemo, useCallback, useEffect } from 'react';
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
import { useListSelection } from '../hooks/useListSelection';
import { useDialogNavigation } from '../hooks/useDialogNavigation';
import { useFormContext } from '../App';

import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';
import { sortItemsByUpdatedDate, filterItemsByAdvancedSearch } from '../utils/viewFiltering';

import { ResultsContainer } from '../components/ResultsContainer';
import DescriptionDialog from '../components/DescriptionDialog';
import BulkCopyButtons from '../components/BulkCopyButtons';
import EmptyState from '../components/EmptyState';
import './EventView.css';
import ItemRow from '../components/ItemRow';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Custom title component for the description dialog
const DialogTitle = ({ item }: { item: GitHubItem }) => (
  <Box sx={{ display: 'flex', p: 2, alignItems: 'center', gap: 2, width: '100%' }}>
    {item.pull_request ? (
      item.pull_request.merged_at ? (
        <Box sx={{ color: 'done.fg' }}><GitMergeIcon size={16} /></Box>
      ) : item.state === 'closed' ? (
        <Box sx={{ color: 'closed.fg' }}><GitPullRequestIcon size={16} /></Box>
      ) : (
        <Box sx={{ color: 'open.fg' }}>
          {item.draft || item.pull_request.draft ? <GitPullRequestDraftIcon size={16} /> : <GitPullRequestIcon size={16} />}
        </Box>
      )
    ) : (
      <Box sx={{ color: item.state === 'closed' ? 'closed.fg' : 'open.fg' }}>
        <IssueOpenedIcon size={16} />
      </Box>
    )}
    <Text sx={{ flex: 1, fontWeight: 'bold', fontSize: 2 }}>{item.title}</Text>
  </Box>
);

const IssuesAndPRsList = memo(function IssuesAndPRsList({
  results,
}: {
  results: GitHubItem[];
}) {
  const { searchText, setSearchText } = useFormContext();

  const [collapsedSections, setCollapsedSections] = useLocalStorage<Set<string>>('issuesAndPRs-collapsedSections', new Set());

  // Per-section pagination state
  const [sectionPages, setSectionPages] = useLocalStorage<Record<string, number>>('issuesAndPRs-sectionPages', {});
  const itemsPerPage = 100;

  const getSectionPage = useCallback((sectionName: string) => {
    return sectionPages[sectionName] || 1;
  }, [sectionPages]);

  const setSectionPage = useCallback((sectionName: string, page: number) => {
    setSectionPages(prev => ({ ...prev, [sectionName]: page }));
  }, []);

  // Reset pagination when search changes
  useEffect(() => {
    setSectionPages({});
  }, [searchText]);

  const { isCopied, triggerCopy } = useCopyFeedback(2000);

  // Filter and group
  const filteredResults = useMemo(() => {
    return filterItemsByAdvancedSearch(results, searchText);
  }, [results, searchText]);

  const hasRawData = results && results.length > 0;
  const hasSearchText = searchText && searchText.trim().length > 0;

  const groupedItems = useMemo(() => {
    const groups: { 'PRs': GitHubItem[]; 'Issues': GitHubItem[] } = { 'PRs': [], 'Issues': [] };
    filteredResults.forEach(item => {
      if (item.pull_request) {
        groups['PRs'].push(item);
      } else {
        groups['Issues'].push(item);
      }
    });
    Object.keys(groups).forEach(key => {
      groups[key as keyof typeof groups] = sortItemsByUpdatedDate(groups[key as keyof typeof groups]);
    });
    return groups;
  }, [filteredResults]);

  // Build flat list of items from expanded sections for selection
  const allDisplayedItems = useMemo(() => {
    return Object.entries(groupedItems)
      .filter(([groupName]) => !collapsedSections.has(groupName))
      .flatMap(([, items]) => items);
  }, [groupedItems, collapsedSections]);

  // Shared hooks
  const {
    selectedItems, toggleItemSelection, selectAllItems, clearSelection,
    bulkSelectItems, selectAllState,
  } = useListSelection('issuesAndPRs-selectedItems', allDisplayedItems);

  const {
    selectedItemForDialog, setSelectedItemForDialog,
    handlePreviousItem, handleNextItem, hasPrevious, hasNext,
  } = useDialogNavigation(allDisplayedItems);

  // Toggle section collapse and clear selections on collapse
  const toggleSectionCollapse = useCallback((sectionName: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
        const sectionItems = groupedItems[sectionName as keyof typeof groupedItems] || [];
        if (sectionItems.length > 0) {
          const idsToRemove = sectionItems.map(item => item.event_id || item.id);
          bulkSelectItems(idsToRemove, false);
        }
      }
      return newSet;
    });
  }, [groupedItems, bulkSelectItems]);

  // Copy handler
  const copyResultsToClipboard = useCallback(async (format: 'detailed' | 'compact') => {
    const groupedData = Object.entries(groupedItems)
      .filter(([, items]) => items.length > 0)
      .map(([groupName, items]) => ({ groupName, items }));

    let finalGroupedData = groupedData;
    if (selectedItems.size > 0) {
      finalGroupedData = groupedData
        .map(group => ({
          ...group,
          items: group.items.filter(item => selectedItems.has(item.event_id || item.id)),
        }))
        .filter(group => group.items.length > 0);
    }

    const allItems = Object.values(groupedItems).flat();
    const selectedItemsArray =
      selectedItems.size > 0
        ? allItems.filter(item => selectedItems.has(item.event_id || item.id))
        : allItems;

    await copyToClipboard(selectedItemsArray, {
      isCompactView: format === 'compact',
      isGroupedView: true,
      groupedData: finalGroupedData,
      onSuccess: () => triggerCopy(format),
      onError: (error: Error) => console.error('Failed to copy grouped results:', error),
    });
  }, [groupedItems, selectedItems, triggerCopy]);

  // Select all toggle
  const handleSelectAllChange = () => {
    if (selectAllState.checked) {
      clearSelection();
    } else {
      selectAllItems();
    }
  };

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
              <Text sx={{ fontSize: 1, color: 'fg.default', m: 0 }}>
                Select All
              </Text>
            </Box>
            <BulkCopyButtons
              selectedItems={selectedItems}
              totalItems={allDisplayedItems.length}
              isCopied={isCopied}
              onCopy={copyResultsToClipboard}
              showOnlyWhenSelected={true}
            />
          </>
        }
        headerRight={null}
      >
        <div className="timeline-container">
          {allDisplayedItems.length === 0 ? (
            <EmptyState
              type={hasSearchText ? 'no-search-results' : !hasRawData ? 'no-cached-data' : 'no-data'}
              searchText={searchText}
              showClearSearch={!!searchText}
              onClearSearch={() => setSearchText('')}
            />
          ) : (
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
                              if (collapsedSections.has(groupName)) return;
                              const sectionItemIds = groupItems.map(item => item.event_id || item.id);
                              const selectedCount = sectionItemIds.filter(id => selectedItems.has(id)).length;
                              bulkSelectItems(sectionItemIds, selectedCount !== sectionItemIds.length);
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
                            '&:hover': { color: 'fg.default' },
                          }}
                          aria-label={`${collapsedSections.has(groupName) ? 'Show' : 'Hide'} ${groupName} section`}
                        >
                          {collapsedSections.has(groupName) ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                        </Button>
                      </Box>
                    </div>
                    {!collapsedSections.has(groupName) && (() => {
                      const sectionPage = getSectionPage(groupName);
                      const sectionTotalPages = Math.ceil(groupItems.length / itemsPerPage);
                      const startIndex = (sectionPage - 1) * itemsPerPage;
                      const paginatedGroupItems = groupItems.slice(startIndex, startIndex + itemsPerPage);
                      return (
                        <div className="timeline-section-content">
                          {paginatedGroupItems.map((item: GitHubItem) => (
                            <div key={item.id} className="timeline-group">
                              <ItemRow
                                item={item}
                                onShowDescription={setSelectedItemForDialog}
                                selected={selectedItems.has(item.event_id || item.id)}
                                onSelect={toggleItemSelection}
                                showCheckbox={true}
                                showRepo={true}
                                showTime={true}
                                size="small"
                              />
                            </div>
                          ))}
                          {sectionTotalPages > 1 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, pb: 2 }}>
                              <Pagination
                                pageCount={sectionTotalPages}
                                currentPage={sectionPage}
                                onPageChange={(_e: React.MouseEvent, page: number) => setSectionPage(groupName, page)}
                                showPages={{ narrow: false }}
                                marginPageCount={2}
                                surroundingPageCount={2}
                              />
                            </Box>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ResultsContainer>

      <DescriptionDialog
        item={selectedItemForDialog}
        onClose={() => setSelectedItemForDialog(null)}
        onPrevious={handlePreviousItem}
        onNext={handleNextItem}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        title={selectedItemForDialog ? <DialogTitle item={selectedItemForDialog} /> : undefined}
        maxHeight="85vh"
      />
    </Box>
  );
});

export default IssuesAndPRsList;
