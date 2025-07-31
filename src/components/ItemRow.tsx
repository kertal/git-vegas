import { Box, Avatar, Link, Text, Checkbox, Token } from '@primer/react';
import { GitHubItem } from '../types';
import ActionButtonsRow from './ActionButtonsRow';

// Helper functions to determine display avatar and user
const getDisplayAvatar = (item: GitHubItem): string => {
  // For issues that have an assignee and the user is not the author, show assignee avatar
  if (!item.pull_request && item.assignee && item.assignee.login !== item.user.login) {
    return item.assignee.avatar_url;
  }
  // Otherwise show the author avatar
  return item.user.avatar_url;
};

const getDisplayUser = (item: GitHubItem): string => {
  // For issues that have an assignee and the user is not the author, show assignee name
  if (!item.pull_request && item.assignee && item.assignee.login !== item.user.login) {
    return item.assignee.login;
  }
  // Otherwise show the author name
  return item.user.login;
};
import {
  GitMergeIcon,
  GitPullRequestIcon,
  GitPullRequestDraftIcon,
  IssueOpenedIcon,
  RepoIcon,
} from '@primer/octicons-react';

interface ItemRowProps {
  item: GitHubItem;
  onShowDescription: (item: GitHubItem) => void;
  selected?: boolean;
  onSelect?: (id: string | number) => void;
  showCheckbox?: boolean;
  showRepo?: boolean;
  showUser?: boolean;
  showTime?: boolean;
  size?: 'small' | 'medium';
  groupCount?: number;
}

const ItemRow = ({
  item,

  onShowDescription,
  selected = false,
  onSelect,
  showCheckbox = false,
  showRepo = true,
  showTime = true,
  size = 'small',
  groupCount,
}: ItemRowProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'border.default',
        // Mobile responsive adjustments
        '@media (max-width: 767px)': {
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 2,
          py: 3,
        },
      }}
    >
      {/* Desktop: single row layout, Mobile: stacked layout */}
      <>
        {/* Desktop layout - single horizontal row */}
        <Box
          sx={{
            display: 'none',
            '@media (min-width: 768px)': {
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              width: '100%',
            },
          }}
        >
          {showCheckbox && onSelect && (
            <Checkbox
              checked={selected}
              onChange={() => onSelect(item.event_id || item.id)}
              sx={{ flexShrink: 0 }}
            />
          )}

          {/* Type icon */}
          {item.pull_request ? (
            item.pull_request.merged_at || item.merged ? (
              <Box
                as="span"
                aria-label="Merged Pull Request"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'done.fg',
                  gap: 1,
                  flexShrink: 0,
                }}
              >
                <GitMergeIcon size={16} />
              </Box>
            ) : item.state === 'closed' ? (
              <Box
                as="span"
                aria-label="Closed Pull Request"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'closed.fg',
                  gap: 1,
                  flexShrink: 0,
                }}
              >
                <GitPullRequestIcon size={16} />
              </Box>
            ) : (
              <Box
                as="span"
                aria-label={`${item.draft || item.pull_request.draft ? 'Draft ' : ''}Open Pull Request`}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'open.fg',
                  gap: 1,
                  flexShrink: 0,
                }}
              >
                {item.draft || item.pull_request.draft ? (
                  <GitPullRequestDraftIcon size={16} />
                ) : (
                  <GitPullRequestIcon size={16} />
                )}
              </Box>
            )
          ) : (
            <Box
              as="span"
              aria-label={`${item.state === 'closed' ? 'Closed' : 'Open'} Issue`}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                color: item.state === 'closed' ? 'closed.fg' : 'open.fg',
                flexShrink: 0,
              }}
            >
              <IssueOpenedIcon size={16} />
            </Box>
          )}

          <Avatar
            src={getDisplayAvatar(item)}
            alt={`${getDisplayUser(item)}'s avatar`}
            size={size === 'small' ? 24 : 32}
            sx={{ flexShrink: 0 }}
          />

          {/* Main content - takes remaining space */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Link
                href={item.html_url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  textOverflow: 'ellipsis', 
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.title}
              </Link>
              {groupCount && groupCount > 1 && (
                <Token
                  text={groupCount.toString()}
                  size="small"
                  sx={{ flexShrink: 0 }}
                />
              )}
            </Box>
          </Box>

          {/* Time column */}
          {showTime && (
            <Text 
              sx={{ 
                color: 'fg.muted', 
                minWidth: 80, 
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {new Date(item.updated_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                weekday: 'short',
              })}
            </Text>
          )}
          
          {/* Repository column */}
          {showRepo && item.repository_url && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <RepoIcon size={12} />
              <Link
                href={`https://github.com/${item.repository_url.replace('https://api.github.com/repos/', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: 'accent.fg' }}
              >
                {
                  item.repository_url
                    .replace('https://api.github.com/repos/', '')
                    .split('/')[1]
                }
              </Link>
            </Box>
          )}

          {/* Actions column */}
          <Box sx={{ flexShrink: 0 }}>
            <ActionButtonsRow
              item={item}
              onShowDescription={onShowDescription}
              size={size}
            />
          </Box>
        </Box>

        {/* Mobile layout - stacked sections */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            width: '100%',
            '@media (min-width: 768px)': {
              display: 'none',
            },
          }}
        >
          {/* Header section with checkbox, icon, avatar, title */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              width: '100%',
            }}
          >
            {showCheckbox && onSelect && (
              <Checkbox
                checked={selected}
                onChange={() => onSelect(item.event_id || item.id)}
                sx={{ flexShrink: 0 }}
              />
            )}

            {/* Type icon */}
            {item.pull_request ? (
              item.pull_request.merged_at || item.merged ? (
                <Box
                  as="span"
                  aria-label="Merged Pull Request"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: 'done.fg',
                    gap: 1,
                  }}
                >
                  <GitMergeIcon size={16} />
                </Box>
              ) : item.state === 'closed' ? (
                <Box
                  as="span"
                  aria-label="Closed Pull Request"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: 'closed.fg',
                    gap: 1,
                  }}
                >
                  <GitPullRequestIcon size={16} />
                </Box>
              ) : (
                <Box
                  as="span"
                  aria-label={`${item.draft || item.pull_request.draft ? 'Draft ' : ''}Open Pull Request`}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: 'open.fg',
                    gap: 1,
                  }}
                >
                  {item.draft || item.pull_request.draft ? (
                    <GitPullRequestDraftIcon size={16} />
                  ) : (
                    <GitPullRequestIcon size={16} />
                  )}
                </Box>
              )
            ) : (
              <Box
                as="span"
                aria-label={`${item.state === 'closed' ? 'Closed' : 'Open'} Issue`}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: item.state === 'closed' ? 'closed.fg' : 'open.fg',
                }}
              >
                <IssueOpenedIcon size={16} />
              </Box>
            )}

            <Avatar
              src={getDisplayAvatar(item)}
              alt={`${getDisplayUser(item)}'s avatar`}
              size={size === 'small' ? 24 : 32}
            />

            {/* Main content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Link
                  href={item.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    fontSize: '14px',
                    lineHeight: 1.4,
                  }}
                >
                  {item.title}
                </Link>
                {groupCount && groupCount > 1 && (
                  <Token
                    text={groupCount.toString()}
                    size="small"
                    sx={{ flexShrink: 0 }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Metadata section for mobile */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              fontSize: '12px',
              color: 'fg.muted',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {showTime && (
                <Text 
                  sx={{ 
                    color: 'fg.muted', 
                    fontSize: '12px',
                  }}
                >
                  {new Date(item.updated_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </Text>
              )}
              
              {showRepo && item.repository_url && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RepoIcon size={12} />
                  <Link
                    href={`https://github.com/${item.repository_url.replace('https://api.github.com/repos/', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ 
                      color: 'accent.fg',
                      fontSize: '12px',
                    }}
                  >
                    {
                      item.repository_url
                        .replace('https://api.github.com/repos/', '')
                        .split('/')[1]
                    }
                  </Link>
                </Box>
              )}
            </Box>

            {/* Actions for mobile */}
            <ActionButtonsRow
              item={item}
              onShowDescription={onShowDescription}
              size={size}
            />
          </Box>
        </Box>
      </>
    </Box>
  );
};

export default ItemRow;
