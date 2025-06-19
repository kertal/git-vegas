import { memo, useMemo, useState } from 'react';
import { Text, Avatar, Link, Button, ButtonGroup, Heading,ActionMenu, ActionList, Flash, Checkbox, Box, Token, IconButton, Dialog } from '@primer/react';
import {
  IssueOpenedIcon,
  IssueClosedIcon,
  GitPullRequestIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  CommentIcon,
  RepoIcon,
  EyeIcon,
  PasteIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@primer/octicons-react';
import { GitHubItem, GitHubEvent } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ResultsContainer } from './ResultsContainer';
import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './TimelineView.css';

type ViewMode = 'standard' | 'raw' | 'grouped';

interface TimelineViewProps {
  items: GitHubItem[];
  rawEvents?: GitHubEvent[];
  viewMode?: ViewMode;
  setViewMode?: (viewMode: ViewMode) => void;
  // Selection functionality
  selectedItems?: Set<string | number>;
  toggleItemSelection?: (id: string | number) => void;
  selectAllItems?: () => void;
  clearSelection?: () => void;
  copyResultsToClipboard?: (format: 'detailed' | 'compact') => void;
  clipboardMessage?: string | null;
}

const TimelineView = memo(function TimelineView({
  items,
  rawEvents = [],
  viewMode = 'standard',
  setViewMode,
  selectedItems = new Set(),
  toggleItemSelection,
  selectAllItems,
  clearSelection,
  copyResultsToClipboard,
  clipboardMessage,
}: TimelineViewProps) {
  // Sort items by updated date (newest first)
  const sortedItems = [...items].sort(
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

  const getEventIcon = (item: GitHubItem) => {
    const type = getEventType(item);
    if (type === 'comment') {
      return <CommentIcon size={16} />;
    } else if (type === 'pull_request') {
      if (item.merged_at) return <GitMergeIcon size={16} />;
      if (item.state === 'closed')
        return <GitPullRequestClosedIcon size={16} />;
      return <GitPullRequestIcon size={16} />;
    } else {
      return item.state === 'closed' ? (
        <IssueClosedIcon size={16} />
      ) : (
        <IssueOpenedIcon size={16} />
      );
    }
  };

  const getEventDescription = (item: GitHubItem): string => {
    const type = getEventType(item);
    if (type === 'comment') {
      if (item.pull_request) {
        return 'commented on pull request';
      } else {
        return 'commented on issue';
      }
    } else if (type === 'pull_request') {
      // Check if this is a pull request review
      if (item.title.startsWith('Review on:')) {
        return 'reviewed pull request';
      }
      if (item.merged_at) return 'merged pull request';
      if (item.state === 'closed') return 'closed pull request';
      return 'opened pull request';
    } else {
      return item.state === 'closed' ? 'closed issue' : 'opened issue';
    }
  };

  const formatRepoName = (url: string | undefined): string => {
    if (!url) return 'Unknown Repository';
    const match = url.match(/repos\/(.+)$/);
    return match ? match[1] : url;
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
  const [selectedItemForDialog, setSelectedItemForDialog] = useState<GitHubItem | null>(null);

  // Single item clipboard copy handler
  const copySingleItemToClipboard = async (item: GitHubItem) => {
    const result = await copyToClipboard([item], {
      isCompactView: true, // Use compact format for single items
      onSuccess: () => {
        // Success feedback is handled by the clipboard utility
      },
      onError: (error: Error) => {
        console.error('Failed to copy item:', error);
      },
    });

    return result;
  };

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
    return sortedItems.findIndex(
      item => item.id === selectedItemForDialog.id
    );
  };

  if (sortedItems.length === 0) {
    // Check if we have raw events but they're filtered out
    const hasRawEvents = rawEvents && rawEvents.length > 0;

    return (
      <div className="timeline-empty">
        <Text color="fg.muted">
          {!hasRawEvents
            ? 'No cached events found. Please perform a search in events mode to load events.'
            : 'No events found for the selected time period. Try adjusting your date range or filters.'}
        </Text>
      </div>
    );
  }

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
      {copyResultsToClipboard && (
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
            <PasteIcon size={14} />
            {selectedItems.size > 0 ? selectedItems.size : sortedItems.length}
          </ActionMenu.Button>

          <ActionMenu.Overlay>
            <ActionList>
              <ActionList.Item
                onSelect={() => copyResultsToClipboard('detailed')}
              >
                Detailed Format
              </ActionList.Item>
              <ActionList.Item
                onSelect={() => copyResultsToClipboard('compact')}
              >
                Compact Format
              </ActionList.Item>
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
      )}
      {clipboardMessage && (
        <Flash variant="success" sx={{ py: 1, px: 2 }}>
          {clipboardMessage}
        </Flash>
      )}
    </>
  );

  // Header right content
  const headerRight = (
    <div className="timeline-header-right">
    


      
      {setViewMode && (
        <div className="timeline-view-controls">
          <Text className="timeline-view-label">View:</Text>
          <ButtonGroup>
            <Button
              size="small"
              variant={viewMode === 'standard' ? 'primary' : 'default'}
              onClick={() => setViewMode('standard')}
            >
              Standard
            </Button>
            <Button
              size="small"
              variant={viewMode === 'grouped' ? 'primary' : 'default'}
              onClick={() => setViewMode('grouped')}
            >
              Grouped
            </Button>
            <Button
              size="small"
              variant={viewMode === 'raw' ? 'primary' : 'default'}
              onClick={() => setViewMode('raw')}
            >
              Raw
            </Button>
          </ButtonGroup>
        </div>
      )}
    </div>
  );

  return (
    <ResultsContainer
      headerLeft={headerLeft}
      headerRight={headerRight}
      className="timeline-view"
    >
      {/* Timeline content */}
      <div className="timeline-content">
        {viewMode === 'raw' ? (
          // Raw JSON view - show actual GitHub API events
          <div className="timeline-raw-container">
            {rawEvents.length > 0 ? (
              rawEvents
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                .map((event, index) => (
                  <div
                    key={`${event.id}-${index}`}
                    className="timeline-raw-event"
                  >
                    <div className="timeline-raw-event-header">
                      <div className="timeline-raw-event-header-left">
                        <Text className="timeline-raw-event-type">
                          {event.type}
                        </Text>
                        <Text className="timeline-raw-event-meta">
                          by {event.actor.login} in {event.repo.name}
                        </Text>
                      </div>
                      <Text className="timeline-raw-event-time">
                        {formatDistanceToNow(new Date(event.created_at), {
                          addSuffix: true,
                        })}
                      </Text>
                    </div>
                    <div className="timeline-raw-event-content">
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {JSON.stringify(event, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))
            ) : (
              <div className="timeline-raw-empty">
                <Text color="fg.muted">
                  No raw events available. Raw events are only available after
                  performing a new search in events mode.
                </Text>
              </div>
            )}
          </div>
        ) : viewMode === 'grouped' ? (
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
                  {Object.entries(actionGroups).map(([groupName, groupItems]) => {
                    if (groupItems.length === 0) return null;

                    // Get the appropriate icon for the group
                    const getGroupIcon = () => {
                      if (groupName === 'PRs - opened')
                        return <GitPullRequestIcon size={20} />;
                      if (groupName === 'PRs - merged')
                        return <GitMergeIcon size={20} />;
                      if (groupName === 'PRs - closed')
                        return <GitPullRequestClosedIcon size={20} />;
                      if (groupName === 'PRs - reviewed')
                        return <EyeIcon size={20} />;
                      if (groupName === 'Issues - opened')
                        return <IssueOpenedIcon size={20} />;
                      if (groupName === 'Issues - closed')
                        return <IssueClosedIcon size={20} />;
                      if (groupName === 'Issues - commented')
                        return <CommentIcon size={20} />;
                      return <IssueOpenedIcon size={20} />;
                    };

                    return (
                      <div
                        key={groupName}
                        className="timeline-section"
                      >
                        {/* Group Header */}
                        <div className="timeline-section-header timeline-section-header--subtle">
                          {/* Section Select All Checkbox */}
                          {toggleItemSelection && (
                            <Checkbox
                              checked={(() => {
                                // Check if all items in this section are selected
                                const allItemIds = groupItems.map(item => item.event_id || item.id);
                                return allItemIds.length > 0 && allItemIds.every(id => selectedItems.has(id));
                              })()}
                              indeterminate={(() => {
                                // Check if some (but not all) items in this section are selected
                                const allItemIds = groupItems.map(item => item.event_id || item.id);
                                const selectedCount = allItemIds.filter(id => selectedItems.has(id)).length;
                                return selectedCount > 0 && selectedCount < allItemIds.length;
                              })()}
                              onChange={() => {
                                // Toggle all items in this section
                                const allItemIds = groupItems.map(item => item.event_id || item.id);
                                const allSelected = allItemIds.every(id => selectedItems.has(id));
                                
                                if (allSelected) {
                                  // Deselect all items in this section
                                  allItemIds.forEach(id => {
                                    if (selectedItems.has(id)) {
                                      toggleItemSelection(id);
                                    }
                                  });
                                } else {
                                  // Select all items in this section
                                  allItemIds.forEach(id => {
                                    if (!selectedItems.has(id)) {
                                      toggleItemSelection(id);
                                    }
                                  });
                                }
                              }}
                              sx={{ flexShrink: 0, mr: 2 }}
                              aria-label={`Select all events in ${groupName} section`}
                            />
                          )}
                          
                          <div className="timeline-section-icon timeline-section-icon--muted">{getGroupIcon()}</div>
                          <Text className="timeline-section-title timeline-section-title--default">
                            {groupName} <Token 
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
                            const itemGroups: { [url: string]: GitHubItem[] } = {};
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
                                items: items.sort((a, b) => 
                                  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                                ),
                                mostRecent: items.reduce((latest, current) => 
                                  new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest
                                )
                              }))
                              .sort((a, b) => 
                                new Date(b.mostRecent.updated_at).getTime() - new Date(a.mostRecent.updated_at).getTime()
                              );

                            // Show grouped items with count badges but individual checkboxes for each event using event_id
                            return groupedItems.map((group, groupIndex) => {
                              const repoName = formatRepoName(group.mostRecent.repository_url);
                              const isLastGroup = groupIndex === groupedItems.length - 1;

                              return (
                                <div key={group.url} className="timeline-group">
                                  {/* Group Header with Most Recent Item */}
                                  <div
                                    className={`timeline-item ${
                                      !isLastGroup ? '' : 'timeline-item--no-border'
                                    }`}
                                  >
                                    {/* Checkbox for most recent item */}
                                    {toggleItemSelection && (
                                      <Checkbox
                                        checked={selectedItems.has(group.mostRecent.event_id || group.mostRecent.id)}
                                        onChange={() => toggleItemSelection(group.mostRecent.event_id || group.mostRecent.id)}
                                        sx={{ flexShrink: 0 }}
                                      />
                                    )}
                                    
                                    {/* Avatar */}
                                    <Avatar
                                      src={group.mostRecent.user.avatar_url}
                                      size={14}
                                      alt={group.mostRecent.user.login}
                                      className="timeline-item-avatar"
                                    />

                                    {/* User */}
                                    <Link
                                      href={group.mostRecent.user.html_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="timeline-item-user"
                                    >
                                      {group.mostRecent.user.login}
                                    </Link>

                                    {/* Title (truncated) */}
                                    <Link
                                      href={group.mostRecent.html_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="timeline-item-title"
                                    >
                                      {group.mostRecent.title} {group.items.length > 1 && (
                                        <Token 
                                          text={group.items.length.toString()} 
                                          size="small"
                                          sx={{ ml: 1, flexShrink: 0 }}
                                        />
                                      )}
                                    </Link>

                                    {/* Repo */}
                                    <Text className="timeline-item-repo">
                                      {repoName.split('/')[1] || repoName}
                                    </Text>

                                    {/* Time */}
                                    <Text className="timeline-item-time">
                                      {formatDistanceToNow(
                                        new Date(group.mostRecent.updated_at),
                                        {
                                          addSuffix: true,
                                        }
                                      )}
                                    </Text>

                                    {/* Action buttons */}
                                    {group.mostRecent.body && (
                                      <div>
                                        <IconButton icon={EyeIcon} variant="invisible" aria-label="Show description" size="small" onClick={() => setSelectedItemForDialog(group.mostRecent)} />
                                        <IconButton icon={PasteIcon} variant="invisible" aria-label="Copy to clipboard" size="small" onClick={() => copySingleItemToClipboard(group.mostRecent)} />
                                      </div>
                                    )}
                                  </div>


                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()
        ) : (
          // Standard timeline view
          <>
            {sortedItems.map((item, index) => {
              // const eventType = getEventType(item); // unused
              const repoName = formatRepoName(item.repository_url);
              const eventDescription = getEventDescription(item);

              return (
                                  <div
                    key={`${item.id}-${index}`}
                    className="timeline-item timeline-item--standard"
                  >
                    {/* Checkbox */}
                    {toggleItemSelection && (
                      <Checkbox
                        checked={selectedItems.has(item.event_id || item.id)}
                        onChange={() => toggleItemSelection(item.event_id || item.id)}
                        sx={{ flexShrink: 0 }}
                      />
                    )}
                    
                    {/* Icon */}
                    <div className="timeline-item-icon">
                      {getEventIcon(item)}
                    </div>

                  {/* Avatar */}
                  <Avatar
                    src={item.user.avatar_url}
                    size={16}
                    alt={item.user.login}
                    className="timeline-item-avatar"
                  />

                  {/* User and action */}
                  <div className="timeline-item-action-container">
                    <Link
                      href={item.user.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="timeline-item-user"
                    >
                      {item.user.login}
                    </Link>
                    <Text className="timeline-item-action">
                      {eventDescription}
                    </Text>
                  </div>

                  {/* Title (truncated) */}
                  <Link
                    href={item.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="timeline-item-title timeline-item-title--bold"
                  >
                    {item.title}
                  </Link>

                  {/* Repo */}
                  <div className="timeline-item-repo-container">
                    <RepoIcon size={12} />
                    <Link
                      href={`https://github.com/${repoName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="timeline-item-repo"
                    >
                      {repoName.split('/')[1] || repoName}
                    </Link>
                  </div>

                  {/* Time */}
                  <Text className="timeline-item-time">
                    {formatDistanceToNow(new Date(item.updated_at), {
                      addSuffix: true,
                    })}
                  </Text>

                  {/* Action buttons */}
                  {item.body && (
                    <div>
                      <IconButton icon={EyeIcon} variant="invisible" aria-label="Show description" size="small" onClick={() => setSelectedItemForDialog(item)} />
                      <IconButton icon={PasteIcon} variant="invisible" aria-label="Copy to clipboard" size="small" onClick={() => copySingleItemToClipboard(item)} />
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Description Dialog */}
      {selectedItemForDialog && (
        <Dialog
          onClose={() => setSelectedItemForDialog(null)}
          role="dialog"
          title={(
            <Box
              sx={{ display: 'flex', p: 2, alignItems: 'center', gap: 2, width: '100%' }}
            >
              {selectedItemForDialog.pull_request ? (
                <GitPullRequestIcon size={16} />
              ) : (
                <IssueOpenedIcon size={16} />
              )}
              <Text sx={{ fontWeight: 'bold', flex: 1 }}>
                {selectedItemForDialog.title}
              </Text>
            </Box>
          )}
          renderFooter={() => (
            <div>
              <IconButton
                icon={ChevronLeftIcon}
                aria-label="Previous item"
                onClick={handlePreviousItem}
                disabled={getCurrentItemIndex() <= 0}
                sx={{ color: getCurrentItemIndex() > 0 ? 'fg.default' : 'fg.muted' }}
              />
              <IconButton
                icon={ChevronRightIcon}
                aria-label="Next item"
                onClick={handleNextItem}
                disabled={getCurrentItemIndex() >= sortedItems.length - 1}
                sx={{ color: getCurrentItemIndex() < sortedItems.length - 1 ? 'fg.default' : 'fg.muted' }}
              />
            </div>
          )}
        >
          <Box
            sx={{
              p: 3,
              maxHeight: '70vh',
              overflow: 'auto',
            }}
          >
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
    </ResultsContainer>
  );
});

export default TimelineView;
