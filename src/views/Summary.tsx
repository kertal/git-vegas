import { memo, useMemo, useCallback } from 'react';
import {
  Text,
  Button,
  Heading,
  Checkbox,
  Box,
  Token,
  Avatar,
} from '@primer/react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PeopleIcon,
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

  // Order: configured users first (in order), then others alphabetically
  const ordered: Record<string, GitHubItem[]> = {};
  for (const configUser of configuredUsernames) {
    // Find the actual case-sensitive key that matches
    const matchKey = Object.keys(userGroups).find(
      k => k.toLowerCase() === configUser.toLowerCase()
    );
    if (matchKey && userGroups[matchKey].length > 0) {
      ordered[matchKey] = userGroups[matchKey];
    }
  }
  // Add remaining users not in configured list
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

const SummaryView = memo(function SummaryView({
  items,
  rawEvents = [],
  indexedDBSearchItems = [],
}: SummaryProps) {
  const { startDate, endDate, searchText, setSearchText, isMultiUser, groupByUsers, usernames } = useFormContext();
  const showUserGroups = isMultiUser && groupByUsers;

  const [collapsedSections, setCollapsedSections] = useLocalStorage<Set<string>>('summary-collapsedSections', new Set());

  // Filter and sort items
  const filteredItems = filterItemsByAdvancedSearch(items, searchText);
  const sortedItems = sortItemsByUpdatedDate(filteredItems);

  // Filtered search items for summary grouping
  const filteredIndexedDBSearchItems = useMemo(() => {
    return filterItemsByAdvancedSearch(indexedDBSearchItems, searchText);
  }, [indexedDBSearchItems, searchText]);

  // --- Multi-user grouping ---
  type UserActionGroups = Record<string, Record<string, GitHubItem[]>>;
  const perUserActionGroups = useMemo((): UserActionGroups | null => {
    if (!showUserGroups) return null;
    const userItems = groupItemsByUser(sortedItems, usernames);
    const userSearchItems = groupItemsByUser(filteredIndexedDBSearchItems, usernames);

    const result: Record<string, Record<string, GitHubItem[]>> = {};
    // Process all users that appear in either items or search items
    const allUsers = new Set([...Object.keys(userItems), ...Object.keys(userSearchItems)]);
    for (const login of allUsers) {
      result[login] = groupSummaryData(
        userItems[login] || [],
        userSearchItems[login] || [],
        startDate,
        endDate
      );
    }

    // Re-order by configured usernames first
    const configuredLower = usernames.map(u => u.toLowerCase());
    const ordered: Record<string, Record<string, GitHubItem[]>> = {};
    for (const configUser of usernames) {
      const matchKey = Object.keys(result).find(
        k => k.toLowerCase() === configUser.toLowerCase()
      );
      if (matchKey) {
        ordered[matchKey] = result[matchKey];
      }
    }
    Object.keys(result)
      .filter(k => !configuredLower.includes(k.toLowerCase()))
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .forEach(k => {
        ordered[k] = result[k];
      });

    return ordered;
  }, [showUserGroups, sortedItems, filteredIndexedDBSearchItems, usernames, startDate, endDate]);

  // --- Single-user grouping (existing logic) ---
  const actionGroups = useMemo((): Record<string, GitHubItem[]> => {
    if (showUserGroups) return {};
    return groupSummaryData(sortedItems, filteredIndexedDBSearchItems, startDate, endDate);
  }, [showUserGroups, sortedItems, filteredIndexedDBSearchItems, startDate, endDate]);

  // Build flat list of items from expanded sections for selection
  const allDisplayedItems = useMemo((): GitHubItem[] => {
    if (showUserGroups && perUserActionGroups) {
      return Object.entries(perUserActionGroups)
        .filter(([login]) => !collapsedSections.has(`@user:${login}`))
        .flatMap(([login, groups]) =>
          Object.entries(groups)
            .filter(([groupName]) => !collapsedSections.has(`@user:${login}/${groupName}`))
            .flatMap(([, items]) => items)
        );
    }
    return Object.entries(actionGroups)
      .filter(([groupName]) => !collapsedSections.has(groupName))
      .flatMap(([, items]) => items);
  }, [showUserGroups, perUserActionGroups, actionGroups, collapsedSections]);

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

  // Get all action groups flattened (for copy and other operations)
  const allActionGroups = useMemo(() => {
    if (showUserGroups && perUserActionGroups) {
      const merged: Record<string, GitHubItem[]> = {};
      Object.entries(perUserActionGroups).forEach(([login, groups]) => {
        Object.entries(groups).forEach(([groupName, items]) => {
          const key = `${login} - ${groupName}`;
          merged[key] = items;
        });
      });
      return merged;
    }
    return actionGroups;
  }, [showUserGroups, perUserActionGroups, actionGroups]);

  // Toggle section collapse and clear selections on collapse
  const toggleSectionCollapse = useCallback((sectionName: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
        // Find items in this section to deselect
        if (showUserGroups && perUserActionGroups) {
          // Could be a user section or a group within a user
          if (sectionName.startsWith('@user:') && !sectionName.includes('/')) {
            // User section - deselect all items for this user
            const login = sectionName.replace('@user:', '');
            const userGroups = perUserActionGroups[login];
            if (userGroups) {
              const idsToRemove = Object.values(userGroups).flat().map(item => getItemId(item));
              bulkSelectItems(idsToRemove, false);
            }
          } else if (sectionName.includes('/')) {
            // Action group within a user
            const [userPart, groupName] = sectionName.split('/');
            const login = userPart.replace('@user:', '');
            const userGroups = perUserActionGroups[login];
            if (userGroups && userGroups[groupName]) {
              const idsToRemove = userGroups[groupName].map(item => getItemId(item));
              bulkSelectItems(idsToRemove, false);
            }
          }
        } else {
          const sectionItems = actionGroups[sectionName as keyof typeof actionGroups] || [];
          if (sectionItems.length > 0) {
            const idsToRemove = sectionItems.map(item => getItemId(item));
            bulkSelectItems(idsToRemove, false);
          }
        }
      }
      return newSet;
    });
  }, [showUserGroups, perUserActionGroups, actionGroups, bulkSelectItems]);

  // Copy handler
  const copyResultsToClipboard = useCallback(async (format: 'detailed' | 'compact') => {
    const groupedData = formatGroupedDataForClipboard(allActionGroups, selectedItems);
    const allItems = getAllDisplayedItems(allActionGroups);
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
  }, [allActionGroups, selectedItems, triggerCopy]);

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
  const hasItems = showUserGroups && perUserActionGroups
    ? Object.values(perUserActionGroups).some(groups =>
        Object.values(groups).some(items => items.length > 0)
      )
    : Object.values(actionGroups).some(items => items.length > 0);

  /** Renders the action group sections (shared between single and multi-user). */
  const renderActionGroup = (
    groupName: string,
    groupItems: GitHubItem[],
    collapseKey: string,
  ) => {
    if (groupItems.length === 0) return null;
    const urlGroups = groupItemsByUrl(groupItems);
    const mostRecentIds = Object.values(urlGroups).map(items => getItemId(getMostRecent(items)));
    const selectedCount = mostRecentIds.filter(id => selectedItems.has(id)).length;
    const isCollapsed = collapsedSections.has(collapseKey);

    return (
      <div key={collapseKey} className="timeline-section">
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
              onClick={() => toggleSectionCollapse(collapseKey)}
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
  };

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
        ) : showUserGroups && perUserActionGroups ? (
          // Multi-user: group by user, then by action type
          Object.entries(perUserActionGroups).map(([login, groups]) => {
            const userItemCount = Object.values(groups).reduce((sum, items) => sum + items.length, 0);
            if (userItemCount === 0) return null;
            const userCollapseKey = `@user:${login}`;
            const isUserCollapsed = collapsedSections.has(userCollapseKey);
            // Get first item to extract avatar URL
            const firstItem = Object.values(groups).flat()[0];
            const avatarUrl = firstItem?.user?.avatar_url;

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
                        text={`${userItemCount}`}
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
                    {Object.entries(groups).map(([groupName, groupItems]) =>
                      renderActionGroup(groupName, groupItems, `@user:${login}/${groupName}`)
                    )}
                  </Box>
                )}
              </div>
            );
          })
        ) : (
          // Single-user: existing behavior
          Object.entries(actionGroups).map(([groupName, groupItems]) =>
            renderActionGroup(groupName, groupItems, groupName)
          )
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
