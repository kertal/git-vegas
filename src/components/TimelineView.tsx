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
} from '@primer/octicons-react';
import { GitHubItem } from '../types';
import { GitHubEvent } from '../utils/githubSearch';
import { formatDistanceToNow } from 'date-fns';

interface TimelineViewProps {
  items: GitHubItem[];
  rawEvents?: GitHubEvent[];
  isRawView?: boolean;
  setIsRawView?: (isRawView: boolean) => void;
}

const TimelineView = memo(function TimelineView({ 
  items, 
  rawEvents = [],
  isRawView = false, 
  setIsRawView 
}: TimelineViewProps) {
  // Sort items by created date (newest first)
  const sortedItems = [...items].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const getEventType = (
    item: GitHubItem
  ): 'issue' | 'pull_request' | 'comment' => {
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
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Text color="fg.muted">
          No events found for the selected time period.
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
          {setIsRawView && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Text sx={{ fontSize: 1, color: 'fg.muted' }}>View:</Text>
              <ButtonGroup>
                <Button
                  size="small"
                  variant={!isRawView ? 'primary' : 'default'}
                  onClick={() => setIsRawView(false)}
                >
                  Standard
                </Button>
                <Button
                  size="small"
                  variant={isRawView ? 'primary' : 'default'}
                  onClick={() => setIsRawView(true)}
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
        {isRawView ? (
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
