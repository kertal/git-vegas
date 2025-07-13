import { memo, useMemo, useState } from 'react';
import {
  Text,
  Link,
  Button,
  Checkbox,
  Box,
  Token,
  IconButton,
  Dialog,
} from '@primer/react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@primer/octicons-react';
import { GitHubItem, GitHubEvent } from '../types';

import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { parseSearchText } from '../utils/resultsUtils';
import { CloneIssueDialog } from './CloneIssueDialog';
import ItemRow from './ItemRow';
import { useFormContext } from '../App';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface GitHubEventsGroupedTabProps {
  items: GitHubItem[];
  rawEvents?: GitHubEvent[];
  selectedItems?: Set<string | number>;
  toggleItemSelection?: (id: string | number) => void;
  bulkSelectItems?: (itemIds: (string | number)[], shouldSelect: boolean) => void;
  copyResultsToClipboard?: (format: 'detailed' | 'compact') => void;
  searchText?: string;
  setSearchText?: (searchText: string) => void;
}

const GitHubEventsGroupedTab = memo(function GitHubEventsGroupedTab({
  items,
  rawEvents = [],
  selectedItems = new Set(),
  toggleItemSelection,
  bulkSelectItems,
  copyResultsToClipboard,
  searchText = '',
  setSearchText,
}: GitHubEventsGroupedTabProps) {
  // Get GitHub token from form context
  const { githubToken } = useFormContext();
  
  // Use debounced search hook
  const { inputValue, setInputValue, clearSearch } = useDebouncedSearch(
    searchText,
    value => setSearchText?.(value),
    300
  );

  // Use copy feedback hook
  const { isCopied } = useCopyFeedback(2000);

  // State for description dialog
  const [selectedItemForDialog, setSelectedItemForDialog] = useState<GitHubItem | null>(null);
  const [selectedItemForClone, setSelectedItemForClone] = useState<GitHubItem | null>(null);

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

  // Navigation functions for description dialog
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

  // Check if we have search text or raw events
  const hasSearchText = searchText && searchText.trim().length > 0;
  const hasRawEvents = rawEvents && rawEvents.length > 0;

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Text as="h1" sx={{ fontSize: 2, fontWeight: 'bold' }}>
          GitHub Events Grouped
        </Text>
        {copyResultsToClipboard && (
          <Button
            size="small"
            onClick={() => copyResultsToClipboard('detailed')}
            variant="invisible"
          >
            Copy Results
          </Button>
        )}
      </Box>

      {/* API Limitation Note */}
      <Box sx={{ p: 2, bg: 'attention.subtle', mb: 2 }}>
        <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
          <strong>Note:</strong> Timeline includes up to 300 events from the
          past 30 days. Event latency can be 30s to 6h depending on time of day.
        </Text>
      </Box>

      {/* Search Box */}
      {setSearchText && (
        <Box sx={{ mb: 3 }}>
          <input
            type="text"
            placeholder="Search events, filter by label:name or -label:name, or filter by user:username"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d0d7de',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </Box>
      )}

      {/* Grouped Events Content */}
      <div>
        {sortedItems.length === 0 ? (
          // Empty state
          <Box
            sx={{
              p: 2,
              textAlign: 'center',
              color: 'fg.muted',
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2,
              fontSize: 0,
            }}
          >
            <Text>
              {hasSearchText
                ? `No events found matching "${searchText}". Try a different search term or use label:name / -label:name for label filtering.`
                : !hasRawEvents
                  ? 'No cached events found. Please perform a search in events mode to load events.'
                  : 'No events found for the selected time period. Try adjusting your date range or filters.'}
            </Text>
            {hasSearchText && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button variant="default" size="small" onClick={clearSearch}>
                  Clear search
                </Button>
              </Box>
            )}
          </Box>
        ) : (
          // Grouped view - organize events by individual issues/PRs and by type
          (() => {
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
            });

            return (
              <div>
                {/* Action Type Groups Section */}
                <div>
                  {Object.entries(actionGroups).map(
                    ([groupName, groupItems]) => {
                      if (groupItems.length === 0) return null;

                      return (
                        <Box key={groupName} sx={{ mb: 3 }}>
                          {/* Group Header */}
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            mb: 2,
                            p: 2,
                            bg: 'canvas.subtle',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'border.default'
                          }}>
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

                            <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>
                              {groupName}{' '}
                              <Token
                                text={groupItems.length.toString()}
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            </Text>
                          </Box>

                          {/* Events List */}
                          <Box>
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
                                  <Box
                                    key={group.url}
                                    sx={{ 
                                      mb: 1,
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: 2
                                    }}
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
                                    />
                                    {/* Group count badge if more than one item in group */}
                                    {group.items.length > 1 && (
                                      <Token
                                        text={group.items.length.toString()}
                                        size="small"
                                        sx={{ mt: 1 }}
                                      />
                                    )}
                                  </Box>
                                );
                              });
                            })()}
                          </Box>
                        </Box>
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
    </Box>
  );
});

export default GitHubEventsGroupedTab; 