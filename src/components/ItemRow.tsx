import { Box, Avatar, AvatarStack, Link, Text, Checkbox, Token, Label } from '@primer/react';
import {
  GitMergeIcon,
  GitPullRequestIcon,
  GitPullRequestDraftIcon,
  IssueOpenedIcon,
  RepoIcon,
} from '@primer/octicons-react';
import { GitHubItem, getItemId } from '../types';
import ActionButtonsRow from './ActionButtonsRow';
import { getActionVariant } from '../utils/actionUtils';

// Helper to check if item is an issue (not a PR)
const isIssue = (item: GitHubItem): boolean => !item.pull_request;

// Helper to check if issue has a different assignee than the actor
const hasDistinctAssignee = (item: GitHubItem): boolean => {
  return isIssue(item) && !!item.assignee && item.assignee.login !== item.user.login;
};

// Helper to check if item has a distinct reviewer (reviewer !== PR author)
const hasDistinctReviewer = (item: GitHubItem): boolean => {
  return !!item.reviewedBy && item.reviewedBy.login !== item.user.login;
};

interface ItemRowProps {
  item: GitHubItem;
  onShowDescription: (item: GitHubItem) => void;
  selected?: boolean;
  onSelect?: (id: string | number) => void;
  showCheckbox?: boolean;
  showRepo?: boolean;
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
              onChange={() => onSelect(getItemId(item))}
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

          {/* Avatar(s) - show reviewer+author for reviews, actor+assignee for issues, or single avatar */}
          {hasDistinctReviewer(item) ? (
            <AvatarStack disableExpand>
              <Avatar
                src={item.reviewedBy!.avatar_url}
                alt={`${item.reviewedBy!.login}'s avatar (reviewer)`}
                size={size === 'small' ? 24 : 32}
              />
              <Avatar
                src={item.user.avatar_url}
                alt={`${item.user.login}'s avatar (PR author)`}
                size={size === 'small' ? 24 : 32}
              />
            </AvatarStack>
          ) : hasDistinctAssignee(item) ? (
            <AvatarStack disableExpand>
              <Avatar
                src={item.user.avatar_url}
                alt={`${item.user.login}'s avatar (actor)`}
                size={size === 'small' ? 24 : 32}
              />
              <Avatar
                src={item.assignee!.avatar_url}
                alt={`${item.assignee!.login}'s avatar (assignee)`}
                size={size === 'small' ? 24 : 32}
              />
            </AvatarStack>
          ) : (
            <Avatar
              src={item.user.avatar_url}
              alt={`${item.user.login}'s avatar`}
              size={size === 'small' ? 24 : 32}
              sx={{ flexShrink: 0 }}
            />
          )}

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
              {item.action && (
                <Label
                  variant={getActionVariant(item.action)}
                  size="small"
                  sx={{ flexShrink: 0 }}
                >
                  {item.action}
                </Label>
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
              {new Date(item.reviewed_at ?? item.updated_at).toLocaleDateString(undefined, {
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
                onChange={() => onSelect(getItemId(item))}
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

            {/* Avatar(s) - show reviewer+author for reviews, actor+assignee for issues, or single avatar */}
            {hasDistinctReviewer(item) ? (
              <AvatarStack disableExpand>
                <Avatar
                  src={item.reviewedBy!.avatar_url}
                  alt={`${item.reviewedBy!.login}'s avatar (reviewer)`}
                  size={size === 'small' ? 24 : 32}
                />
                <Avatar
                  src={item.user.avatar_url}
                  alt={`${item.user.login}'s avatar (PR author)`}
                  size={size === 'small' ? 24 : 32}
                />
              </AvatarStack>
            ) : hasDistinctAssignee(item) ? (
              <AvatarStack disableExpand>
                <Avatar
                  src={item.user.avatar_url}
                  alt={`${item.user.login}'s avatar (actor)`}
                  size={size === 'small' ? 24 : 32}
                />
                <Avatar
                  src={item.assignee!.avatar_url}
                  alt={`${item.assignee!.login}'s avatar (assignee)`}
                  size={size === 'small' ? 24 : 32}
                />
              </AvatarStack>
            ) : (
              <Avatar
                src={item.user.avatar_url}
                alt={`${item.user.login}'s avatar`}
                size={size === 'small' ? 24 : 32}
              />
            )}

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
                {item.action && (
                  <Label
                    variant={getActionVariant(item.action)}
                    size="small"
                    sx={{ flexShrink: 0 }}
                  >
                    {item.action}
                  </Label>
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
                  {new Date(item.reviewed_at ?? item.updated_at).toLocaleDateString(undefined, {
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
