import { memo } from 'react';
import { Box, Text, Avatar, Link, Button, ButtonGroup } from '@primer/react';
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
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Text color="fg.muted">
          {!hasRawEvents
            ? 'No cached events found. Please perform a search in events mode to load events.'
            : 'No events found for the selected time period. Try adjusting your date range or filters.'}
        </Text>
      </Box>
    );
  }

  // Header left content
  const headerLeft = (
    <Text sx={{ fontSize: 1, fontWeight: 'semibold', color: 'fg.default' }}>
      Activity Timeline
    </Text>
  );

  // Header right content
  const headerRight = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
        {sortedItems.length} events
      </Text>
      {setViewMode && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Text sx={{ fontSize: 1, color: 'fg.muted' }}>View:</Text>
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
        </Box>
      )}
    </Box>
  );

  return (
    <ResultsContainer
      headerLeft={headerLeft}
      headerRight={headerRight}
      className="timeline-view"
    >
      {/* Timeline content */}
      <Box sx={{ p: 2 }}>
        {viewMode === 'raw' ? (
          // Raw JSON view - show actual GitHub API events
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rawEvents.length > 0 ? (
              rawEvents
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                .map((event, index) => (
                  <Box
                    key={`${event.id}-${index}`}
                    sx={{
                      border: '1px solid',
                      borderColor: 'border.default',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        bg: 'canvas.subtle',
                        borderBottom: '1px solid',
                        borderColor: 'border.default',
                      }}
                    >
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                      >
                        <Text sx={{ fontSize: 1, fontWeight: 'semibold' }}>
                          {event.type}
                        </Text>
                        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                          by {event.actor.login} in {event.repo.name}
                        </Text>
                      </Box>
                      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                        {formatDistanceToNow(new Date(event.created_at), {
                          addSuffix: true,
                        })}
                      </Text>
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        bg: 'canvas.default',
                        fontFamily: 'mono',
                        fontSize: 0,
                        overflow: 'auto',
                        maxHeight: '400px',
                      }}
                    >
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {JSON.stringify(event, null, 2)}
                      </pre>
                    </Box>
                  </Box>
                ))
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Text color="fg.muted">
                  No raw events available. Raw events are only available after
                  performing a new search in events mode.
                </Text>
              </Box>
            )}
          </Box>
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Individual Issues & PRs Section */}
                {individualGroups.length > 0 && (
                  <Box>
                    <Box
                      sx={{
                        border: '1px solid',
                        borderColor: 'border.default',
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Section Header */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 2,
                          bg: 'accent.subtle',
                          borderBottom: '1px solid',
                          borderColor: 'border.default',
                        }}
                      >
                        <Box sx={{ color: 'accent.fg' }}>
                          <RepoIcon size={20} />
                        </Box>
                        <Text
                          sx={{
                            fontSize: 1,
                            fontWeight: 'semibold',
                            color: 'accent.fg',
                            flex: 1,
                          }}
                        >
                          Issues & Pull Requests
                        </Text>
                        <Box
                          sx={{
                            px: 2,
                            py: 1,
                            bg: 'accent.emphasis',
                            color: 'fg.onEmphasis',
                            borderRadius: 1,
                            fontSize: 0,
                            fontWeight: 'semibold',
                          }}
                        >
                          {individualGroups.length}
                        </Box>
                      </Box>

                      {/* Individual Items List */}
                      <Box sx={{ bg: 'canvas.default' }}>
                        {individualGroups.map((group, index) => {
                          const item = group.mostRecent;
                          const repoName = formatRepoName(item.repository_url);

                          return (
                            <Box
                              key={group.url}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                py: 2,
                                px: 2,
                                borderBottom:
                                  index < individualGroups.length - 1
                                    ? '1px solid'
                                    : 'none',
                                borderColor: 'border.muted',
                                '&:hover': {
                                  bg: 'canvas.subtle',
                                },
                                fontSize: 0,
                              }}
                            >
                              {/* Icon */}
                              <Box sx={{ color: 'fg.muted', flexShrink: 0 }}>
                                {getEventIcon(item)}
                              </Box>

                              {/* Avatar */}
                              <Avatar
                                src={item.user.avatar_url}
                                size={16}
                                alt={item.user.login}
                                sx={{ flexShrink: 0 }}
                              />

                              {/* User */}
                              <Link
                                href={item.user.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                  fontWeight: 'semibold',
                                  flexShrink: 0,
                                  color: 'fg.default',
                                  textDecoration: 'none',
                                  '&:hover': { textDecoration: 'underline' },
                                }}
                              >
                                {item.user.login}
                              </Link>

                              {/* Title (truncated) */}
                              <Link
                                href={item.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                  color: 'fg.default',
                                  textDecoration: 'none',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  minWidth: 0,
                                  flex: 1,
                                  '&:hover': {
                                    textDecoration: 'underline',
                                  },
                                }}
                              >
                                {item.title}
                              </Link>

                              {/* Event count badge */}
                              {group.items.length > 1 && (
                                <Box
                                  sx={{
                                    px: 2,
                                    py: 1,
                                    bg: 'neutral.subtle',
                                    color: 'neutral.fg',
                                    borderRadius: 1,
                                    fontSize: 0,
                                    fontWeight: 'semibold',
                                    flexShrink: 0,
                                  }}
                                >
                                  {group.items.length} events
                                </Box>
                              )}

                              {/* Repo */}
                              <Text
                                color="fg.muted"
                                sx={{ flexShrink: 0, fontSize: 0 }}
                              >
                                {repoName.split('/')[1] || repoName}
                              </Text>

                              {/* Time */}
                              <Text
                                color="fg.muted"
                                sx={{ flexShrink: 0, fontSize: 0 }}
                              >
                                {formatDistanceToNow(
                                  new Date(item.created_at),
                                  {
                                    addSuffix: true,
                                  }
                                )}
                              </Text>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Action Type Groups Section */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                      <Box
                        key={groupName}
                        sx={{
                          border: '1px solid',
                          borderColor: 'border.default',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Group Header */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 2,
                            bg: 'canvas.subtle',
                            borderBottom: '1px solid',
                            borderColor: 'border.default',
                          }}
                        >
                          <Box sx={{ color: 'fg.muted' }}>{getGroupIcon()}</Box>
                          <Text
                            sx={{
                              fontSize: 1,
                              fontWeight: 'semibold',
                              color: 'fg.default',
                              flex: 1,
                            }}
                          >
                            {groupName}
                          </Text>
                          <Box
                            sx={{
                              px: 2,
                              py: 1,
                              bg: 'accent.subtle',
                              color: 'accent.fg',
                              borderRadius: 1,
                              fontSize: 0,
                              fontWeight: 'semibold',
                            }}
                          >
                            {groupItems.length}
                          </Box>
                        </Box>

                        {/* Events List */}
                        <Box sx={{ bg: 'canvas.default' }}>
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
                                <Box
                                  key={group.url}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    py: 1,
                                    px: 2,
                                    borderBottom:
                                      index < groupedItems.length - 1
                                        ? '1px solid'
                                        : 'none',
                                    borderColor: 'border.muted',
                                    '&:hover': {
                                      bg: 'canvas.subtle',
                                    },
                                    fontSize: 0,
                                  }}
                                >
                                  {/* Avatar */}
                                  <Avatar
                                    src={item.user.avatar_url}
                                    size={14}
                                    alt={item.user.login}
                                    sx={{ flexShrink: 0 }}
                                  />

                                  {/* User */}
                                  <Link
                                    href={item.user.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{
                                      fontWeight: 'semibold',
                                      flexShrink: 0,
                                      color: 'fg.default',
                                      textDecoration: 'none',
                                      '&:hover': { textDecoration: 'underline' },
                                    }}
                                  >
                                    {item.user.login}
                                  </Link>

                                  {/* Title (truncated) */}
                                  <Link
                                    href={item.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{
                                      color: 'fg.default',
                                      textDecoration: 'none',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      minWidth: 0,
                                      flex: 1,
                                      '&:hover': {
                                        textDecoration: 'underline',
                                      },
                                    }}
                                  >
                                    {item.title}
                                  </Link>

                                  {/* Event count badge */}
                                  {group.items.length > 1 && (
                                    <Box
                                      sx={{
                                        px: 2,
                                        py: 1,
                                        bg: 'neutral.subtle',
                                        color: 'neutral.fg',
                                        borderRadius: 1,
                                        fontSize: 0,
                                        fontWeight: 'semibold',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {group.items.length}
                                    </Box>
                                  )}

                                  {/* Repo */}
                                  <Text
                                    color="fg.muted"
                                    sx={{ flexShrink: 0, fontSize: 0 }}
                                  >
                                    {repoName.split('/')[1] || repoName}
                                  </Text>

                                  {/* Time */}
                                  <Text
                                    color="fg.muted"
                                    sx={{ flexShrink: 0, fontSize: 0 }}
                                  >
                                    {formatDistanceToNow(
                                      new Date(item.created_at),
                                      {
                                        addSuffix: true,
                                      }
                                    )}
                                  </Text>
                                </Box>
                              );
                            });
                          })()}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
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
                <Box
                  key={`${item.id}-${index}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1,
                    px: 1,
                    mb: 1,
                    borderRadius: 1,
                    '&:hover': {
                      bg: 'canvas.subtle',
                    },
                    fontSize: 0,
                  }}
                >
                  {/* Icon */}
                  <Box sx={{ color: 'fg.muted', flexShrink: 0 }}>
                    {getEventIcon(item)}
                  </Box>

                  {/* Avatar */}
                  <Avatar
                    src={item.user.avatar_url}
                    size={16}
                    alt={item.user.login}
                    sx={{ flexShrink: 0 }}
                  />

                  {/* User and action */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      minWidth: 0,
                    }}
                  >
                    <Link
                      href={item.user.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontWeight: 'semibold', flexShrink: 0 }}
                    >
                      {item.user.login}
                    </Link>
                    <Text color="fg.muted" sx={{ flexShrink: 0 }}>
                      {eventDescription}
                    </Text>
                  </Box>

                  {/* Title (truncated) */}
                  <Link
                    href={item.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      fontWeight: 'semibold',
                      color: 'fg.default',
                      textDecoration: 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      flex: 1,
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {item.title}
                  </Link>

                  {/* Repo */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexShrink: 0,
                    }}
                  >
                    <RepoIcon size={12} />
                    <Link
                      href={`https://github.com/${repoName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: 'fg.muted', textDecoration: 'none' }}
                    >
                      {repoName.split('/')[1] || repoName}
                    </Link>
                  </Box>

                  {/* Time */}
                  <Text color="fg.muted" sx={{ flexShrink: 0, fontSize: 0 }}>
                    {formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                    })}
                  </Text>
                </Box>
              );
            })}
          </>
        )}
      </Box>
    </ResultsContainer>
  );
});

export default TimelineView;
