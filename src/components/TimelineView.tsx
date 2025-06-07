import { memo } from 'react';
import { Box, Text, Avatar, Link, Label, Timeline } from '@primer/react';
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
import { formatDistanceToNow, format } from 'date-fns';
import { getContrastColor } from '../utils';

interface TimelineViewProps {
  items: GitHubItem[];
}

const TimelineView = memo(function TimelineView({ items }: TimelineViewProps) {
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
    <Box>
      {/* Timeline Section */}
      <Box
        sx={{
          maxWidth: '1200px',
          margin: '24px auto',
          bg: 'canvas.default',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'border.default',
          p: 3,
        }}
      >
        {/* Timeline header */}
        <Box
          sx={{
            mb: 3,
            pb: 3,
            borderBottom: '1px solid',
            borderColor: 'border.muted',
          }}
        >
          <Text
            as="h2"
            sx={{
              fontSize: 3,
              fontWeight: 'semibold',
              color: 'fg.default',
              m: 0,
            }}
          >
            Activity Timeline ({sortedItems.length} events)
          </Text>
        </Box>

        <Timeline>
        {sortedItems.map((item, index) => {
          const eventType = getEventType(item);
          const repoName = formatRepoName(item.repository_url);
          const eventDescription = getEventDescription(item);

          return (
            <Timeline.Item key={`${item.id}-${index}`}>
              <Timeline.Badge>{getEventIcon(item)}</Timeline.Badge>

              <Timeline.Body>
                <Box sx={{ mb: 3 }}>
                  {/* Header with user action and timestamp */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Avatar
                      src={item.user.avatar_url}
                      size={20}
                      alt={item.user.login}
                    />
                    <Link
                      href={item.user.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontWeight: 'semibold', fontSize: 1 }}
                    >
                      {item.user.login}
                    </Link>
                    <Text color="fg.muted" sx={{ fontSize: 1 }}>
                      {eventDescription}
                    </Text>
                    <Label
                      size="small"
                      variant={
                        eventType === 'pull_request'
                          ? 'accent'
                          : eventType === 'comment'
                            ? 'secondary'
                            : 'attention'
                      }
                    >
                      #{item.number}
                    </Label>
                    <Text color="fg.muted" sx={{ fontSize: 1 }}>
                      in
                    </Text>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RepoIcon size={12} />
                      <Link
                        href={`https://github.com/${repoName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ fontSize: 1, fontWeight: 'semibold' }}
                      >
                        {repoName}
                      </Link>
                    </Box>
                  </Box>

                  {/* Timestamp */}
                  <Box sx={{ mb: 2 }}>
                    <Text color="fg.muted" sx={{ fontSize: 0 }}>
                      {format(new Date(item.created_at), 'PPP p')} •{' '}
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                      })}
                    </Text>
                  </Box>

                  {/* Title and link */}
                  <Box sx={{ mb: 3 }}>
                    <Link
                      href={item.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        fontSize: 2,
                        fontWeight: 'semibold',
                        color: 'fg.default',
                        textDecoration: 'none',
                        display: 'block',
                        lineHeight: 1.3,
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      {item.title}
                    </Link>
                  </Box>

                  {/* Labels */}
                  {item.labels && item.labels.length > 0 && (
                    <Box
                      sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}
                    >
                      {item.labels.slice(0, 6).map((label, labelIndex) => (
                        <Label
                          key={labelIndex}
                          size="small"
                          sx={{
                            backgroundColor: label.color
                              ? `#${label.color}`
                              : undefined,
                            color: label.color
                              ? getContrastColor(label.color)
                              : undefined,
                          }}
                        >
                          {label.name}
                        </Label>
                      ))}
                      {item.labels.length > 6 && (
                        <Text
                          color="fg.muted"
                          sx={{ fontSize: 0, alignSelf: 'center' }}
                        >
                          +{item.labels.length - 6} more
                        </Text>
                      )}
                    </Box>
                  )}

                  {/* Status information */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Label
                      size="small"
                      variant={
                        item.merged_at
                          ? 'done'
                          : item.state === 'open'
                            ? 'success'
                            : 'secondary'
                      }
                    >
                      {item.merged_at
                        ? 'Merged'
                        : item.state === 'open'
                          ? 'Open'
                          : 'Closed'}
                    </Label>

                    {item.merged_at && (
                      <Text color="fg.muted" sx={{ fontSize: 0 }}>
                        Merged{' '}
                        {formatDistanceToNow(new Date(item.merged_at), {
                          addSuffix: true,
                        })}
                      </Text>
                    )}

                    {item.closed_at && !item.merged_at && (
                      <Text color="fg.muted" sx={{ fontSize: 0 }}>
                        Closed{' '}
                        {formatDistanceToNow(new Date(item.closed_at), {
                          addSuffix: true,
                        })}
                      </Text>
                    )}
                  </Box>
                </Box>
              </Timeline.Body>
            </Timeline.Item>
          );
        })}
        </Timeline>
      </Box>
    </Box>
  );
});

export default TimelineView;
