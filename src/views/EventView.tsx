import React, { memo, useCallback, useEffect, useMemo } from 'react';
import {
  Text,
  Checkbox,
  Box,
  Pagination,
  Button,
  Heading,
  Avatar,
  Token,
} from '@primer/react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PeopleIcon,
} from '@primer/octicons-react';
import { GitHubItem, GitHubEvent, getItemId } from '../types';
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

/** Groups items by user login, preserving configured user order. */
const groupItemsByUser = (
  items: GitHubItem[],
  configuredUsernames: string[]
): Record<string, GitHubItem[]> => {
  const userGroups: Record<string, GitHubItem[]> = {};
  const configuredLower = configuredUsernames.map(u => u.toLowerCase());

  items.forEach(item => {
    const login = item.user.login;
    if (!userGroups[login]) {
      userGroups[login] = [];
    }
    userGroups[login].push(item);
  });

  const ordered: Record<string, GitHubItem[]> = {};
  for (const configUser of configuredUsernames) {
    const matchKey = Object.keys(userGroups).find(
      k => k.toLowerCase() === configUser.toLowerCase()
    );
    if (matchKey && userGroups[matchKey].length > 0) {
      ordered[matchKey] = userGroups[matchKey];
    }
  }
  Object.keys(userGroups)
    .filter(k => !configuredLower.includes(k.toLowerCase()))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .forEach(k => {
      if (userGroups[k].length > 0) {
        ordered[k] = userGroups[k];
      }
    });

  return ordered;
};

const EventView = memo(function EventView({
  items,
  rawEvents = [],
}: EventViewProps) {
  const { searchText, setSearchText, isMultiUser, groupByUsers, usernames } = useFormContext();
  const showUserGroups = isMultiUser && groupByUsers;

  // Pagination state (per-section for multi-user, single for single-user)
  const [currentPage, setCurrentPage] = useLocalStorage<number>('eventView-currentPage', 1);
  const [sectionPages, setSectionPages] = useLocalStorage<Record<string, number>>('eventView-sectionPages', {});
  const [collapsedSections, setCollapsedSections] = useLocalStorage<Set<string>>('eventView-collapsedSections', new Set());
  const itemsPerPage = 100;

  const getSectionPage = useCallback((sectionName: string) => {
    return sectionPages[sectionName] || 1;
  }, [sectionPages]);

  const setSectionPage = useCallback((sectionName: string, page: number) => {
    setSectionPages(prev => ({ ...prev, [sectionName]: page }));
  }, [setSectionPages]);

  // Filter and sort items
  const filteredItems = filterItemsByAdvancedSearch(items, searchText);
  const sortedItems = sortItemsByUpdatedDate(filteredItems);

  // --- Multi-user grouping ---
  const perUserItems = useMemo(() => {
    if (!showUserGroups) return null;
    return groupItemsByUser(sortedItems, usernames);
  }, [showUserGroups, sortedItems, usernames]);

  // Build flat list of displayed items for selection
  const allDisplayedItems = useMemo(() => {
    if (showUserGroups && perUserItems) {
      return Object.entries(perUserItems)
        .filter(([login]) => !collapsedSections.has(`@user:${login}`))
        .flatMap(([, items]) => items);
    }
    return sortedItems;
  }, [showUserGroups, perUserItems, sortedItems, collapsedSections]);

  // Shared hooks
  const {
    selectedItems, toggleItemSelection, selectAllItems, clearSelection,
    bulkSelectItems, selectAllState,
  } = useListSelection('eventView-selectedItems', allDisplayedItems);

  const {
    selectedItemForDialog, setSelectedItemForDialog,
    handlePreviousItem, handleNextItem, hasPrevious, hasNext,
  } = useDialogNavigation(sortedItems);

  const { isCopied, triggerCopy } = useCopyFeedback(2000);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
    setSectionPages({});
  }, [searchText, setCurrentPage, setSectionPages]);

  // Single-user pagination
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = sortedItems.slice(startIndex, startIndex + itemsPerPage);

  // Toggle section collapse
  const toggleSectionCollapse = useCallback((sectionName: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
        if (showUserGroups && perUserItems) {
          const login = sectionName.replace('@user:', '');
          const userItems = perUserItems[login];
          if (userItems) {
            const idsToRemove = userItems.map(item => getItemId(item));
            bulkSelectItems(idsToRemove, false);
          }
        }
      }
      return newSet;
    });
  }, [showUserGroups, perUserItems, bulkSelectItems]);

  // Copy handler
  const copyResultsToClipboard = useCallback(async (format: 'detailed' | 'compact') => {
    const selectedItemsArray =
      selectedItems.size > 0
        ? sortedItems.filter((item: GitHubItem) =>
            selectedItems.has(getItemId(item))
          )
        : sortedItems;

    await copyToClipboard(selectedItemsArray, {
      isCompactView: format === 'compact',
      onSuccess: () => triggerCopy(format),
      onError: (error: Error) => console.error('Failed to copy results:', error),
    });
  }, [selectedItems, sortedItems, triggerCopy]);

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
              {!showUserGroups && totalPages > 1 && (
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
        ) : showUserGroups && perUserItems ? (
          // Multi-user: group by user
          Object.entries(perUserItems).map(([login, userItems]) => {
            if (userItems.length === 0) return null;
            const userCollapseKey = `@user:${login}`;
            const isUserCollapsed = collapsedSections.has(userCollapseKey);
            const avatarUrl = userItems[0]?.user?.avatar_url;

            // Per-user pagination
            const userPage = getSectionPage(login);
            const userTotalPages = Math.ceil(userItems.length / itemsPerPage);
            const userStartIndex = (userPage - 1) * itemsPerPage;
            const paginatedUserItems = userItems.slice(userStartIndex, userStartIndex + itemsPerPage);

            return (
              <div key={login} className="timeline-section" style={{ marginBottom: '1rem' }}>
                <div className="timeline-section-header">
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                      {avatarUrl ? (
                        <Avatar src={avatarUrl} size={20} alt={login} />
                      ) : (
                        <PeopleIcon size={16} />
                      )}
                      <Heading as="h2" sx={{ fontSize: 2, fontWeight: 'bold', m: 0 }}>
                        {login}
                      </Heading>
                      <Token
                        text={`${userItems.length}`}
                        size="small"
                        sx={{ ml: 2, flexShrink: 0 }}
                      />
                    </Box>
                    <Button
                      variant="invisible"
                      size="small"
                      onClick={() => toggleSectionCollapse(userCollapseKey)}
                      className="timeline-section-collapse-button"
                      sx={{
                        fontSize: '0.75rem',
                        color: 'fg.muted',
                        flexShrink: 0,
                        '&:hover': { color: 'fg.default' },
                      }}
                      aria-label={`${isUserCollapsed ? 'Show' : 'Hide'} ${login} section`}
                    >
                      {isUserCollapsed ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                    </Button>
                  </Box>
                </div>
                {!isUserCollapsed && (
                  <Box sx={{ pl: 3 }}>
                    {paginatedUserItems.map((item: GitHubItem, index: number) => (
                      <ItemRow
                        key={`${item.id}-${index}`}
                        item={item}
                        onShowDescription={setSelectedItemForDialog}
                        selected={selectedItems.has(getItemId(item))}
                        onSelect={toggleItemSelection}
                        showCheckbox={true}
                        showRepo={true}
                        showTime={true}
                        size="small"
                      />
                    ))}
                    {userTotalPages > 1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, pb: 3 }}>
                        <Pagination
                          pageCount={userTotalPages}
                          currentPage={userPage}
                          onPageChange={(_event: React.MouseEvent, page: number) => setSectionPage(login, page)}
                          showPages={{ narrow: false }}
                          marginPageCount={2}
                          surroundingPageCount={2}
                        />
                      </Box>
                    )}
                  </Box>
                )}
              </div>
            );
          })
        ) : (
          // Single-user: existing behavior
          <>
            {paginatedItems.map((item: GitHubItem, index: number) => (
              <ItemRow
                key={`${item.id}-${index}`}
                item={item}
                onShowDescription={setSelectedItemForDialog}
                selected={selectedItems.has(getItemId(item))}
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
