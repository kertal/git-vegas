import { memo, useMemo, useState, useCallback } from 'react';
import {
  Text,
  Button,
  Heading,
  Checkbox,
  Box,
  TextInput,
  FormControl,
} from '@primer/react';
import {
  SearchIcon,
} from '@primer/octicons-react';
import { GitHubItem, GitHubEvent } from '../types';

import { ResultsContainer } from '../components/ResultsContainer';
import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { parseSearchText } from '../utils/resultsUtils';
import { CloneIssueDialog } from '../components/CloneIssueDialog';
import DescriptionDialog from '../components/DescriptionDialog';
import BulkCopyButtons from '../components/BulkCopyButtons';
import ItemRow from '../components/ItemRow';
import './Summary.css';
import { useFormContext } from '../App';



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
  const { githubToken, startDate, endDate } = useFormContext();
  
  // Internal state for selection
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(new Set());
  
  // Internal state for search
  const [searchText, setSearchText] = useState('');
  
  // Use debounced search hook
  const { inputValue, setInputValue, clearSearch } = useDebouncedSearch(
    searchText,
    setSearchText,
    300
  );

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

  // Helper to determine event type
  const getEventType = (
    item: GitHubItem
  ): 'issue' | 'pull_request' | 'comment' | 'commit' => {
    // Check if this is a pull request review (title starts with "Review on:")
    if (item.title.startsWith('Review on:')) {
      return 'pull_request';
    }
    // Check if this is a review comment (title starts with "Review comment on:")
    if (item.title.startsWith('Review comment on:')) {
      return 'comment';
    }
    // Check if this is a comment event (title starts with "Comment on:")
    if (item.title.startsWith('Comment on:')) {
      return 'comment';
    }
    // Check if this is a push event (title starts with "Pushed")
    if (item.title.startsWith('Pushed')) {
      return 'commit';
    }
    return item.pull_request ? 'pull_request' : 'issue';
  };

  // Grouping logic for summary view
  const actionGroups = useMemo(() => {
    const groups: {
      'PRs - opened': GitHubItem[];
      'PRs - merged': GitHubItem[];
      'PRs - closed': GitHubItem[];
      'PRs - reviewed': GitHubItem[];
      'PRs - commented': GitHubItem[];
      'Issues - opened': GitHubItem[];
      'Issues - closed': GitHubItem[];
      'Issues - commented': GitHubItem[];
      'Commits': GitHubItem[];
    } = {
      'PRs - opened': [],
      'PRs - merged': [],
      'PRs - closed': [],
      'PRs - reviewed': [],
      'PRs - commented': [],
      'Issues - opened': [],
      'Issues - closed': [],
      'Issues - commented': [],
      'Commits': [],
    };

    // Add items from events
    sortedItems.forEach(item => {
      const type = getEventType(item);
      if (type === 'pull_request' && item.title.startsWith('Review on:')) {
        groups['PRs - reviewed'].push(item);
      } else if (type === 'comment' && item.title.startsWith('Review comment on:')) {
        groups['PRs - commented'].push(item);
      } else if (type === 'comment') {
        groups['Issues - commented'].push(item);
      } else if (type === 'commit') {
        groups['Commits'].push(item);
      } else if (type === 'pull_request') {
        if (item.merged_at) {
          groups['PRs - merged'].push(item);
        } else if (item.state === 'closed') {
          groups['PRs - closed'].push(item);
        } else {
          groups['PRs - opened'].push(item);
        }
      } else {
        // issue
        if (item.state === 'closed') {
          groups['Issues - closed'].push(item);
        } else {
          groups['Issues - opened'].push(item);
        }
      }
    });

    // Add merged PRs from indexedDBSearchItems that are not already in the events
    const existingMergedPRUrls = new Set(groups['PRs - merged'].map(item => item.html_url));
    indexedDBSearchItems.forEach(searchItem => {
      const mergedAt = searchItem.merged_at || searchItem.pull_request?.merged_at;
      if (
        searchItem.pull_request &&
        mergedAt &&
        searchItem.state === 'closed' &&
        !existingMergedPRUrls.has(searchItem.html_url)
      ) {
        // Check if the merge date falls within the current date range
        const mergeDate = new Date(mergedAt);
        const startDateTime = startDate ? new Date(startDate).getTime() : 0;
        const endDateTime = endDate ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 : Infinity;
        const mergeTime = mergeDate.getTime();
        if (mergeTime >= startDateTime && mergeTime <= endDateTime) {
          groups['PRs - merged'].push(searchItem);
        }
      }
    });
    return groups;
  }, [sortedItems, indexedDBSearchItems, startDate, endDate]);

  // Select all items that are actually displayed in the view
  const selectAllItems = useCallback(() => {
    // Get all items that are actually displayed in the view
    const allDisplayedItems = Object.values(actionGroups).flat();
    setSelectedItems(new Set(allDisplayedItems.map(item => item.event_id || item.id)));
  }, [actionGroups]);

  // Internal copy handler for content
  const copyResultsToClipboard = useCallback(async (format: 'detailed' | 'compact') => {
    // Convert to the format expected by clipboard utility
    const groupedData = Object.entries(actionGroups)
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
    const allItems = Object.values(actionGroups).flat();
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
        <Heading
          as="h2"
          sx={{
            fontSize: 2,
            fontWeight: 'semibold',
            color: 'fg.default',
            m: 0,
          }}
        >
          Summary
        </Heading>
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
      <FormControl>
        <FormControl.Label visuallyHidden>Search</FormControl.Label>
        <TextInput
          placeholder="Search"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          leadingVisual={SearchIcon}
          size="small"
          sx={{ minWidth: '300px' }}
        />
      </FormControl>


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
          <strong>Note:</strong> This view merges Github issues, PRs, and Events. 
          Events includes up to 300 events from the past 30 days. Event latency can be 30s to 6h depending on time of day.
        </Text>
      </Box>

      {/* Timeline content */}
      <div className="timeline-content">
        {Object.values(actionGroups).flat().length === 0 ? (
          // Empty state - keep search box visible
          <div className="timeline-empty">
            <Text color="fg.muted">
              {hasSearchText
                ? `No events found matching "${searchText}". Try a different search term or use label:name / -label:name for label filtering.`
                : !hasRawEvents
                  ? 'No cached events found. Please perform a search in events mode to load events.'
                  : 'No events found for the selected time period. Try adjusting your date range or filters.'}
            </Text>
            {hasSearchText && (
              <Box
                sx={{
                  mt: 2,
                  textAlign: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Button variant="default" size="small" onClick={clearSearch}>
                  Clear search
                </Button>
              </Box>
            )}
          </div>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Checkbox
                      checked={(() => {
                        const sectionItemIds = Object.values(urlGroups).map(items => {
                          const mostRecent = items.reduce((latest, current) =>
                            new Date(current.updated_at) > new Date(latest.updated_at)
                              ? current
                              : latest
                          );
                          return mostRecent.event_id || mostRecent.id;
                        });
                        return sectionItemIds.length > 0 && sectionItemIds.every(id => selectedItems.has(id));
                      })()}
                      indeterminate={(() => {
                        const sectionItemIds = Object.values(urlGroups).map(items => {
                          const mostRecent = items.reduce((latest, current) =>
                            new Date(current.updated_at) > new Date(latest.updated_at)
                              ? current
                              : latest
                          );
                          return mostRecent.event_id || mostRecent.id;
                        });
                        const selectedCount = sectionItemIds.filter(id => selectedItems.has(id)).length;
                        return selectedCount > 0 && selectedCount < sectionItemIds.length;
                      })()}
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
                </div>
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
