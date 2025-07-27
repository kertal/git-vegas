import { Box, Avatar, Link, Text, Checkbox, Token } from '@primer/react';
import { GitHubItem } from '../types';
import ActionButtonsRow from './ActionButtonsRow';
import {
  GitMergeIcon,
  GitPullRequestIcon,
  IssueOpenedIcon,
  RepoIcon,
} from '@primer/octicons-react';

interface ItemRowProps {
  item: GitHubItem;
  githubToken?: string;
  onShowDescription: (item: GitHubItem) => void;
  onCloneItem: (item: GitHubItem) => void;
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
  githubToken,
  onShowDescription,
  onCloneItem,
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
      }}
    >
      {showCheckbox && onSelect && (
        <Checkbox
          checked={selected}
          onChange={() => onSelect(item.event_id || item.id)}
          sx={{ flexShrink: 0 }}
        />
      )}

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
            <GitPullRequestIcon size={16} />
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
        src={item.user.avatar_url}
        alt={`${item.user.login}'s avatar`}
        size={size === 'small' ? 24 : 32}
      />

      <Box sx={{ alignItems: 'center', gap: 1, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Link
            href={item.html_url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ textOverflow: 'ellipsis', overflow: 'hidden' }}
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
      {showTime && (
        <Text sx={{ color: 'fg.muted', minWidth: 80, textAlign: 'right' }}>
          {new Date(item.updated_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            weekday: 'short',
          })}
        </Text>
      )}
      {showRepo && item.repository_url && (
        <>
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
        </>
      )}
      <div>
        <ActionButtonsRow
          item={item}
          githubToken={githubToken}
          onShowDescription={onShowDescription}
          onCloneItem={onCloneItem}
          size={size}
        />
      </div>
    </Box>
  );
};

export default ItemRow;
