import { memo, useMemo, useState, useCallback } from 'react';
import {
  Text,
  Link,
  Button,
  Heading,
  ActionMenu,
  ActionList,
  Checkbox,
  Box,
  Token,
  IconButton,
  Dialog,
  TextInput,
  FormControl,
} from '@primer/react';
import {
  CopyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  CheckIcon,
} from '@primer/octicons-react';
import { GitHubItem, GitHubEvent } from '../types';

import { ResultsContainer } from './ResultsContainer';
import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { parseSearchText } from '../utils/resultsUtils';
import { CloneIssueDialog } from './CloneIssueDialog';
import ItemRow from './ItemRow';
import './Summary.css';
import { useFormContext } from '../App';



interface SummaryProps {
  items: GitHubItem[];
  rawEvents?: GitHubEvent[];
}

const SummaryView = memo(function SummaryView({
  items,
  rawEvents = [],
}: SummaryProps) {
  // Get GitHub token from form context
  const { githubToken } = useFormContext();
  
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

  const selectAllItems = useCallback(() => {
    setSelectedItems(new Set(items.map(item => item.event_id || item.id)));
  }, [items]);

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

  // Internal copy handler
  const copyResultsToClipboard = useCallback(async (format: 'detailed' | 'compact') => {
    // Prepare grouped data structure
    const actionGroups: {
      'PRs - opened': GitHubItem[];
      'PRs - merged': GitHubItem[];
      'PRs - closed': GitHubItem[];
      'PRs - reviewed': GitHubItem[];
      'Issues - opened': GitHubItem[];
      'Issues - closed': GitHubItem[];
      'Issues - commented': GitHubItem[];
    } = {
      'PRs - opened': [],
      'PRs - merged': [],
      'PRs - closed': [],
      'PRs - reviewed': [],
      'Issues - opened': [],
      'Issues - closed': [],
      'Issues - commented': [],
    };

    sortedItems.forEach(item => {
      const type = getEventType(item);

      if (type === 'pull_request' && item.title.startsWith('Review on:')) {
        actionGroups['PRs - reviewed'].push(item);
      } else if (type === 'comment') {
        actionGroups['Issues - commented'].push(item);
      } else if (type === 'pull_request') {
        if (item.merged_at) {
          actionGroups['PRs - merged'].push(item);
        } else if (item.state === 'closed') {
          actionGroups['PRs - closed'].push(item);
        } else {
          actionGroups['PRs - opened'].push(item);
        }
      } else {
        // issue
        if (item.state === 'closed') {
          actionGroups['Issues - closed'].push(item);
        } else {
          actionGroups['Issues - opened'].push(item);
        }
      }
    });

    // Convert to the format expected by clipboard utility
    const groupedData = Object.entries(actionGroups)
      .filter(([, items]) => items.length > 0)
      .map(([groupName, items]) => ({
        groupName,
        items,
      }));

    // Use the enhanced clipboard utility with grouped data
    const selectedItemsArray =
      selectedItems.size > 0
        ? sortedItems.filter(item =>
            selectedItems.has(item.event_id || item.id)
          )
        : sortedItems;

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
  }, [sortedItems, selectedItems, triggerCopy]);

  // Clipboard feedback helper
  const isClipboardCopied = useCallback((itemId: string | number) => {
    return isCopied(itemId);
  }, [isCopied]);

  const getEventType = (
    item: GitHubItem
  ): 'issue' | 'pull_request' | 'comment' => {
    // Check if this is a pull request review (title starts with "Review on:")
    if (item.title.startsWith('Review on:')) {
      return 'pull_request';
    }
    // Check if this is a comment event (title starts with "Comment on:")
    if (item.title.startsWith('Comment on:')) {
      return 'comment';
    }
    return item.pull_request ? 'pull_request' : 'issue';
  };

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
    const selectedCount = sortedItems.filter(item =>
      selectedItems.has(item.event_id || item.id)
    ).length;

    if (selectedCount === sortedItems.length) {
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
          Events
        </Heading>
      </Box>
      <ActionMenu>
        <ActionMenu.Button
          variant="default"
          size="small"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: 0,
            borderColor: 'border.default',
          }}
        >
          {(isClipboardCopied('compact') || isClipboardCopied('detailed')) ? (
            <CheckIcon size={14} />
          ) : (
            <CopyIcon size={14} />
          )} {' '}
          {selectedItems.size > 0 ? selectedItems.size : sortedItems.length}
        </ActionMenu.Button>

        <ActionMenu.Overlay>
          <ActionList>
            <ActionList.Item onSelect={() => copyResultsToClipboard('detailed')}>
              Detailed Format
            </ActionList.Item>
            <ActionList.Item onSelect={() => copyResultsToClipboard('compact')}>
              Compact Format
            </ActionList.Item>
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>

    </>
  );

  // Header right content
  const headerRight = (
    <div className="timeline-header-right">
      <FormControl>
        <FormControl.Label visuallyHidden>Search events</FormControl.Label>
        <TextInput
          placeholder="Search events..."
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
          <strong>Note:</strong> Timeline includes up to 300 events from the
          past 30 days. Event latency can be 30s to 6h depending on time of day.
        </Text>
      </Box>

      {/* Timeline content */}
      <div className="timeline-content">
        {sortedItems.length === 0 ? (
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
          (() => {
            // Group by individual issue/PR URL (exclude comments and reviews)
            const issuesPRsGroups: { [url: string]: GitHubItem[] } = {};

            // Group by action type
            const actionGroups: {
              'PRs - opened': GitHubItem[];
              'PRs - merged': GitHubItem[];
              'PRs - closed': GitHubItem[];
              'PRs - reviewed': GitHubItem[];
              'Issues - opened': GitHubItem[];
              'Issues - closed': GitHubItem[];
              'Issues - commented': GitHubItem[];
            } = {
              'PRs - opened': [],
              'PRs - merged': [],
              'PRs - closed': [],
              'PRs - reviewed': [],
              'Issues - opened': [],
              'Issues - closed': [],
              'Issues - commented': [],
            };

            sortedItems.forEach(item => {
              const type = getEventType(item);

              // Add to action groups
              if (
                type === 'pull_request' &&
                item.title.startsWith('Review on:')
              ) {
                actionGroups['PRs - reviewed'].push(item);
              } else if (type === 'comment') {
                actionGroups['Issues - commented'].push(item);
              } else if (type === 'pull_request') {
                if (item.merged_at) {
                  actionGroups['PRs - merged'].push(item);
                } else if (item.state === 'closed') {
                  actionGroups['PRs - closed'].push(item);
                } else {
                  actionGroups['PRs - opened'].push(item);
                }
              } else {
                // issue
                if (item.state === 'closed') {
                  actionGroups['Issues - closed'].push(item);
                } else {
                  actionGroups['Issues - opened'].push(item);
                }
              }

              // Add to individual issue/PR groups (include comments now that we can group them properly)
              if (!item.title.startsWith('Review on:')) {
                let groupingUrl = item.html_url;
                if (type === 'comment') {
                  // For comments, extract the issue/PR URL from the comment URL
                  groupingUrl = groupingUrl.split('#')[0];
                }

                if (!issuesPRsGroups[groupingUrl]) {
                  issuesPRsGroups[groupingUrl] = [];
                }
                issuesPRsGroups[groupingUrl].push(item);
              }
            });

            return (
              <div className="timeline-grouped-container">
                {/* Action Type Groups Section */}
                <div className="timeline-action-groups">
                  {Object.entries(actionGroups).map(
                    ([groupName, groupItems]) => {
                      if (groupItems.length === 0) return null;

                  

                      return (
                        <div key={groupName} className="timeline-section">
                          {/* Group Header */}
                          <div className="timeline-section-header timeline-section-header--subtle">
                            {/* Section Select All Checkbox */}
                            {toggleItemSelection && (
                              <Checkbox
                                checked={(() => {
                                  // In grouped view, we only work with the most recent items from each URL group
                                  // since those are the only ones that have individual checkboxes
                                  
                                  // Group items by URL first to get the actual structure
                                  const itemGroups: { [url: string]: GitHubItem[] } = {};
                                  groupItems.forEach(item => {
                                    let groupingUrl = item.html_url;
                                    if (getEventType(item) === 'comment') {
                                      groupingUrl = groupingUrl.split('#')[0];
                                    }
                                    if (!itemGroups[groupingUrl]) {
                                      itemGroups[groupingUrl] = [];
                                    }
                                    itemGroups[groupingUrl].push(item);
                                  });
                                  
                                  // Get only the most recent item from each URL group (these have checkboxes)
                                  const displayedItems = Object.values(itemGroups).map(urlGroupItems => {
                                    return urlGroupItems.reduce((latest, current) =>
                                      new Date(current.updated_at) > new Date(latest.updated_at)
                                        ? current
                                        : latest
                                    );
                                  });
                                  
                                  const displayedItemIds = displayedItems.map(
                                    item => item.event_id || item.id
                                  );
                                  return (
                                    displayedItemIds.length > 0 &&
                                    displayedItemIds.every(id =>
                                      selectedItems.has(id)
                                    )
                                  );
                                })()}
                                indeterminate={(() => {
                                  // In grouped view, we only work with the most recent items from each URL group
                                  // since those are the only ones that have individual checkboxes
                                  
                                  // Group items by URL first to get the actual structure
                                  const itemGroups: { [url: string]: GitHubItem[] } = {};
                                  groupItems.forEach(item => {
                                    let groupingUrl = item.html_url;
                                    if (getEventType(item) === 'comment') {
                                      groupingUrl = groupingUrl.split('#')[0];
                                    }
                                    if (!itemGroups[groupingUrl]) {
                                      itemGroups[groupingUrl] = [];
                                    }
                                    itemGroups[groupingUrl].push(item);
                                  });
                                  
                                  // Get only the most recent item from each URL group (these have checkboxes)
                                  const displayedItems = Object.values(itemGroups).map(urlGroupItems => {
                                    return urlGroupItems.reduce((latest, current) =>
                                      new Date(current.updated_at) > new Date(latest.updated_at)
                                        ? current
                                        : latest
                                    );
                                  });
                                  
                                  const displayedItemIds = displayedItems.map(
                                    item => item.event_id || item.id
                                  );
                                  const selectedCount = displayedItemIds.filter(id =>
                                    selectedItems.has(id)
                                  ).length;
                                  return (
                                    selectedCount > 0 &&
                                    selectedCount < displayedItemIds.length
                                  );
                                })()}
                                onChange={() => {
                                  // In grouped view, we only work with the most recent items from each URL group
                                  // since those are the only ones that have individual checkboxes
                                  
                                  // Group items by URL first to get the actual structure
                                  const itemGroups: { [url: string]: GitHubItem[] } = {};
                                  groupItems.forEach(item => {
                                    let groupingUrl = item.html_url;
                                    if (getEventType(item) === 'comment') {
                                      groupingUrl = groupingUrl.split('#')[0];
                                    }
                                    if (!itemGroups[groupingUrl]) {
                                      itemGroups[groupingUrl] = [];
                                    }
                                    itemGroups[groupingUrl].push(item);
                                  });
                                  
                                  // Get only the most recent item from each URL group (these have checkboxes)
                                  const displayedItems = Object.values(itemGroups).map(urlGroupItems => {
                                    return urlGroupItems.reduce((latest, current) =>
                                      new Date(current.updated_at) > new Date(latest.updated_at)
                                        ? current
                                        : latest
                                    );
                                  });
                                  
                                  const displayedItemIds = displayedItems.map(
                                    item => item.event_id || item.id
                                  );
                                  
                                  // Check current selection state
                                  const selectedCount = displayedItemIds.filter(id =>
                                    selectedItems.has(id)
                                  ).length;
                                  const allSelected = selectedCount === displayedItemIds.length;
                                  
                                  // Use bulkSelectItems if available, otherwise fall back to individual toggles
                                  if (bulkSelectItems) {
                                    // Efficient bulk selection
                                    bulkSelectItems(displayedItemIds, !allSelected);
                                  } else {
                                    // Fallback to individual toggles (less efficient but still works)
                                    if (allSelected) {
                                      // Deselect all displayed items in this section
                                      displayedItemIds.forEach(id => {
                                        if (selectedItems.has(id)) {
                                          toggleItemSelection(id);
                                        }
                                      });
                                    } else {
                                      // Select all unselected displayed items in this section
                                      displayedItemIds.forEach(id => {
                                        if (!selectedItems.has(id)) {
                                          toggleItemSelection(id);
                                        }
                                      });
                                    }
                                  }
                                }}
                                sx={{ flexShrink: 0, mr: 2 }}
                                aria-label={`Select all events in ${groupName} section`}
                              />
                            )}

                         
                            <Text className="timeline-section-title timeline-section-title--default">
                              {groupName}{' '}
                              <Token
                                text={groupItems.length.toString()}
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            </Text>
                          </div>

                          {/* Events List */}
                          <div className="timeline-section-content">
                            {(() => {
                              // Group items within this action type by URL for display grouping
                              const itemGroups: {
                                [url: string]: GitHubItem[];
                              } = {};
                              groupItems.forEach(item => {
                                // For comments, extract the issue/PR URL from the comment URL
                                let groupingUrl = item.html_url;
                                if (getEventType(item) === 'comment') {
                                  // Comment URLs typically end with #issuecomment-123456 or #discussion_r123456
                                  // Remove the comment hash part to group by the issue/PR URL
                                  groupingUrl = groupingUrl.split('#')[0];
                                }

                                if (!itemGroups[groupingUrl]) {
                                  itemGroups[groupingUrl] = [];
                                }
                                itemGroups[groupingUrl].push(item);
                              });

                              // Convert to array and sort by most recent
                              const groupedItems = Object.entries(itemGroups)
                                .map(([url, items]) => ({
                                  url,
                                  items: items.sort(
                                    (a, b) =>
                                      new Date(b.updated_at).getTime() -
                                      new Date(a.updated_at).getTime()
                                  ),
                                  mostRecent: items.reduce((latest, current) =>
                                    new Date(current.updated_at) >
                                    new Date(latest.updated_at)
                                      ? current
                                      : latest
                                  ),
                                }))
                                .sort(
                                  (a, b) =>
                                    new Date(
                                      b.mostRecent.updated_at
                                    ).getTime() -
                                    new Date(a.mostRecent.updated_at).getTime()
                                );

                              // Show grouped items with count badges but individual checkboxes for each event using event_id
                              return groupedItems.map((group) => {
                                return (
                                  <div
                                    key={group.url}
                                    className="timeline-group"
                                  >
                                    <ItemRow
                                      item={group.mostRecent}
                                      githubToken={githubToken}
                                      isCopied={isCopied}
                                      onShowDescription={setSelectedItemForDialog}
                                      onCloneItem={setSelectedItemForClone}
                                      selected={selectedItems.has(group.mostRecent.event_id || group.mostRecent.id)}
                                      onSelect={toggleItemSelection}
                                      showCheckbox={!!toggleItemSelection}
                                      showLabels={false}
                                      showRepo={true}
                                      showUser={true}
                                      showTime={true}
                                      size="small"
                                      groupCount={group.items.length}
                                    />
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            );
          })()
        )}

      </div>

      {/* Description Dialog */}
      {selectedItemForDialog && (
        <Dialog
          onClose={() => setSelectedItemForDialog(null)}
          role="dialog"
          title={selectedItemForDialog.title}
          renderFooter={() => (
            <div>
              <IconButton
                icon={ChevronLeftIcon}
                aria-label="Previous item"
                onClick={handlePreviousItem}
                disabled={getCurrentItemIndex() <= 0}
                sx={{
                  color: getCurrentItemIndex() > 0 ? 'fg.default' : 'fg.muted',
                }}
              />
              <IconButton
                icon={ChevronRightIcon}
                aria-label="Next item"
                onClick={handleNextItem}
                disabled={getCurrentItemIndex() >= sortedItems.length - 1}
                sx={{
                  color:
                    getCurrentItemIndex() < sortedItems.length - 1
                      ? 'fg.default'
                      : 'fg.muted',
                }}
              />
            </div>
          )}
        >
          <Box sx={{ p: 3, maxHeight: '40vh', overflow: 'auto' }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  <Link href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </Link>
                ),
              }}
            >
              {selectedItemForDialog.body || 'No description available.'}
            </ReactMarkdown>
          </Box>
        </Dialog>
      )}

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
