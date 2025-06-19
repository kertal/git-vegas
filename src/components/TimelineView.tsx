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
  setViewMode 
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
            : 'No events found for the selected time period. Try adjusting your date range or filters.'
          }
        </Text>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: '1200px',
        margin: '16px auto',
        bg: 'canvas.default',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'border.default',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
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
        <Text sx={{ fontSize: 1, fontWeight: 'semibold', color: 'fg.default' }}>
          Activity Timeline
        </Text>
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
      </Box>

      {/* Timeline content */}
      <Box sx={{ p: 2 }}>
        {viewMode === 'raw' ? (
          // Raw JSON view - show actual GitHub API events
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rawEvents.length > 0 ? (
              rawEvents
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                  No raw events available. Raw events are only available after performing a new search in events mode.
                </Text>
              </Box>
            )}
          </Box>
        ) : viewMode === 'grouped' ? (
          // Grouped view - organize events by type
          (() => {
            // Group items by event type and action
            const groups: {
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
              // Add to reviewed if it's a PR review (title starts with "Reviewed:")
              if (type === 'pull_request' && item.title.startsWith('Reviewed:')) {
                groups['PRs - reviewed'].push(item);
              } else if (type === 'comment') {
                groups['Issues - commented'].push(item);
              } else if (type === 'pull_request') {
                if (item.merged_at) {
                  groups['PRs - merged'].push(item);
                } else if (item.state === 'closed') {
                  groups['PRs - closed'].push(item);
                } else {
                  groups['PRs - opened'].push(item);
                }
              } else { // issue
                if (item.state === 'closed') {
                  groups['Issues - closed'].push(item);
                } else {
                  groups['Issues - opened'].push(item);
                }
              }
            });

            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.entries(groups).map(([groupName, groupItems]) => {
                  if (groupItems.length === 0) return null;
                  
                  // Get the appropriate icon for the group
                  const getGroupIcon = () => {
                    if (groupName === 'PRs - opened') return <GitPullRequestIcon size={20} />;
                    if (groupName === 'PRs - merged') return <GitMergeIcon size={20} />;
                    if (groupName === 'PRs - closed') return <GitPullRequestClosedIcon size={20} />;
                    if (groupName === 'PRs - reviewed') return <EyeIcon size={20} />;
                    if (groupName === 'Issues - opened') return <IssueOpenedIcon size={20} />;
                    if (groupName === 'Issues - closed') return <IssueClosedIcon size={20} />;
                    if (groupName === 'Issues - commented') return <CommentIcon size={20} />;
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
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 2, 
                          p: 2,
                          bg: 'canvas.subtle',
                          borderBottom: '1px solid',
                          borderColor: 'border.default'
                        }}>
                          <Box sx={{ color: 'fg.muted' }}>
                            {getGroupIcon()}
                          </Box>
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
                          {groupItems.map((item, index) => {
                            const repoName = formatRepoName(item.repository_url);
                            
                            return (
                              <Box
                                key={`${item.id}-${index}`}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                  py: 1,
                                  px: 2,
                                  borderBottom: index < groupItems.length - 1 ? '1px solid' : 'none',
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
                                    '&:hover': { textDecoration: 'underline' }
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

                                {/* Repo */}
                                <Text color="fg.muted" sx={{ flexShrink: 0, fontSize: 0 }}>
                                  {repoName.split('/')[1] || repoName}
                                </Text>

                                {/* Time */}
                                <Text color="fg.muted" sx={{ flexShrink: 0, fontSize: 0 }}>
                                  {formatDistanceToNow(new Date(item.created_at), {
                                    addSuffix: true,
                                  })}
                                </Text>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    );
                })}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
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
    </Box>
  );
});

export default TimelineView;
