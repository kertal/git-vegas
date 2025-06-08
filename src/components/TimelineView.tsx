import { memo } from 'react';
import { Box, Text, Avatar, Link } from '@primer/react';
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
import { formatDistanceToNow } from 'date-fns';

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
      {/* Compact header */}
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
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
          {sortedItems.length} events
        </Text>
      </Box>

      {/* Compact timeline */}
      <Box sx={{ p: 2 }}>
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
      </Box>
    </Box>
  );
});

export default TimelineView;
