import { memo } from 'react';
import { Text, Avatar, Link, Button, ButtonGroup } from '@primer/react';
import {
  IssueOpenedIcon,
  IssueClosedIcon,
  GitPullRequestIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  CommentIcon,
  RepoIcon,
  EyeIcon,
} from '@primer/octicons-react';
import { GitHubItem, GitHubEvent } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ResultsContainer } from './ResultsContainer';
import './TimelineView.css';

type ViewMode = 'standard' | 'raw' | 'grouped';

interface TimelineViewProps {
  items: GitHubItem[];
  rawEvents?: GitHubEvent[];
  viewMode?: ViewMode;
  setViewMode?: (viewMode: ViewMode) => void;
}

const TimelineView = memo(function TimelineView({
  items,
  rawEvents = [],
  viewMode = 'standard',
  setViewMode,
}: TimelineViewProps) {
  // Sort items by created date (newest first)
  const sortedItems = [...items].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const getEventType = (
    item: GitHubItem
  ): 'issue' | 'pull_request' | 'comment' => {
    // Check if this is a pull request review (title starts with "Reviewed:")
    if (item.title.startsWith('Reviewed:')) {
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
      if (item.title.startsWith('Reviewed:')) {
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
    <Text className="timeline-header-left">
      Activity Timeline
    </Text>
  );

  // Header right content
  const headerRight = (
    <div className="timeline-header-right">
      <Text className="timeline-event-count">
        {sortedItems.length} events
      </Text>
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
                item.title.startsWith('Reviewed:')
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
              if (!item.title.startsWith('Reviewed:')) {
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

            // Convert individual groups to array and sort by most recent activity
            const individualGroups = Object.entries(issuesPRsGroups)
              .map(([url, items]) => ({
                url,
                items: items.sort((a, b) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ),
                mostRecent: items.reduce((latest, current) => 
                  new Date(current.created_at) > new Date(latest.created_at) ? current : latest
                )
              }))
              .sort((a, b) => 
                new Date(b.mostRecent.created_at).getTime() - new Date(a.mostRecent.created_at).getTime()
              );

            return (
              <div className="timeline-grouped-container">
                {/* Individual Issues & PRs Section */}
                {individualGroups.length > 0 && (
                  <div>
                    <div className="timeline-section">
                      {/* Section Header */}
                      <div className="timeline-section-header timeline-section-header--accent">
                        <div className="timeline-section-icon timeline-section-icon--accent">
                          <RepoIcon size={20} />
                        </div>
                        <Text className="timeline-section-title timeline-section-title--accent">
                          Issues & Pull Requests
                        </Text>
                        <div className="timeline-section-count timeline-section-count--accent">
                          {individualGroups.length}
                        </div>
                      </div>

                      {/* Individual Items List */}
                      <div className="timeline-section-content">
                        {individualGroups.map((group, index) => {
                          const item = group.mostRecent;
                          const repoName = formatRepoName(item.repository_url);

                          return (
                            <div
                              key={group.url}
                              className={`timeline-item timeline-item--large ${
                                index < individualGroups.length - 1 ? '' : 'timeline-item--no-border'
                              }`}
                            >
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

                              {/* User */}
                              <Link
                                href={item.user.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="timeline-item-user"
                              >
                                {item.user.login}
                              </Link>

                              {/* Title (truncated) */}
                              <Link
                                href={item.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="timeline-item-title"
                              >
                                {item.title}
                              </Link>

                              {/* Event count badge */}
                              {group.items.length > 1 && (
                                <div className="timeline-item-count-badge">
                                  {group.items.length} events
                                </div>
                              )}

                              {/* Repo */}
                              <Text className="timeline-item-repo">
                                {repoName.split('/')[1] || repoName}
                              </Text>

                              {/* Time */}
                              <Text className="timeline-item-time">
                                {formatDistanceToNow(
                                  new Date(item.created_at),
                                  {
                                    addSuffix: true,
                                  }
                                )}
                              </Text>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

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
                          <div className="timeline-section-icon timeline-section-icon--muted">{getGroupIcon()}</div>
                          <Text className="timeline-section-title timeline-section-title--default">
                            {groupName}
                          </Text>
                          <div className="timeline-section-count timeline-section-count--subtle">
                            {groupItems.length}
                          </div>
                        </div>

                        {/* Events List */}
                        <div className="timeline-section-content">
                          {(() => {
                            // Group items within this action type by URL
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
                                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                                ),
                                mostRecent: items.reduce((latest, current) => 
                                  new Date(current.created_at) > new Date(latest.created_at) ? current : latest
                                )
                              }))
                              .sort((a, b) => 
                                new Date(b.mostRecent.created_at).getTime() - new Date(a.mostRecent.created_at).getTime()
                              );

                            return groupedItems.map((group, index) => {
                              const item = group.mostRecent;
                              const repoName = formatRepoName(item.repository_url);

                              return (
                                <div
                                  key={group.url}
                                  className={`timeline-item ${
                                    index < groupedItems.length - 1 ? '' : 'timeline-item--no-border'
                                  }`}
                                >
                                  {/* Avatar */}
                                  <Avatar
                                    src={item.user.avatar_url}
                                    size={14}
                                    alt={item.user.login}
                                    className="timeline-item-avatar"
                                  />

                                  {/* User */}
                                  <Link
                                    href={item.user.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="timeline-item-user"
                                  >
                                    {item.user.login}
                                  </Link>

                                  {/* Title (truncated) */}
                                  <Link
                                    href={item.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="timeline-item-title"
                                  >
                                    {item.title}
                                  </Link>

                                  {/* Event count badge */}
                                  {group.items.length > 1 && (
                                    <div className="timeline-item-count-badge">
                                      {group.items.length}
                                    </div>
                                  )}

                                  {/* Repo */}
                                  <Text className="timeline-item-repo">
                                    {repoName.split('/')[1] || repoName}
                                  </Text>

                                  {/* Time */}
                                  <Text className="timeline-item-time">
                                    {formatDistanceToNow(
                                      new Date(item.created_at),
                                      {
                                        addSuffix: true,
                                      }
                                    )}
                                  </Text>
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
                    {formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                    })}
                  </Text>
                </div>
              );
            })}
          </>
        )}
      </div>
    </ResultsContainer>
  );
});

export default TimelineView;
