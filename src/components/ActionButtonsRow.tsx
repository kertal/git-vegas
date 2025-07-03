import { memo } from 'react';
import { Box, IconButton } from '@primer/react';
import {
  EyeIcon,
  PasteIcon,
  CheckIcon,
  CopyIcon,
} from '@primer/octicons-react';
import { GitHubItem } from '../types';
import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';
import StarButton from './StarButton';

interface ActionButtonsRowProps {
  item: GitHubItem;
  githubToken?: string;
  isCopied: (itemId: string | number) => boolean;
  onShowDescription: (item: GitHubItem) => void;
  onCloneItem: (item: GitHubItem) => void;
  size?: 'small' | 'medium';
}

// Helper function to get clone button state
const getCloneButtonState = (item: GitHubItem, githubToken?: string) => {
  if (item.pull_request) {
    return {
      disabled: true,
      tooltip: 'Pull requests cannot be cloned as issues'
    };
  }
  
  if (!item.repository_url) {
    return {
      disabled: true,
      tooltip: 'Repository information not available'
    };
  }
  
  if (!githubToken) {
    return {
      disabled: true,
      tooltip: 'GitHub token required - configure in settings'
    };
  }
  
  return {
    disabled: false,
    tooltip: 'Clone this issue'
  };
};

const ActionButtonsRow = memo(function ActionButtonsRow({
  item,
  githubToken,
  isCopied,
  onShowDescription,
  onCloneItem,
  size = 'small'
}: ActionButtonsRowProps) {
  const copySingleItemToClipboard = async (item: GitHubItem) => {
    await copyToClipboard([item], {
      isCompactView: true, // Use compact format for single items
      onSuccess: () => {
        // Success feedback is handled by the parent component
      },
      onError: (error: Error) => {
        console.error('Failed to copy item:', error);
      },
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {item.body && (
        <IconButton
          icon={EyeIcon}
          variant="invisible"
          aria-label="Show description"
          size={size}
          onClick={() => onShowDescription(item)}
        />
      )}
      <IconButton
        icon={isCopied(item.event_id || item.id) ? CheckIcon : PasteIcon}
        variant="invisible"
        aria-label="Copy to clipboard"
        size={size}
        onClick={() => copySingleItemToClipboard(item)}
      />
      {(() => {
        const cloneState = getCloneButtonState(item, githubToken);
        return (
          <IconButton
            icon={CopyIcon}
            variant="invisible"
            aria-label={cloneState.tooltip}
            size={size}
            onClick={() => !cloneState.disabled && onCloneItem(item)}
            disabled={cloneState.disabled}
            title={cloneState.tooltip}
            sx={{
              color: cloneState.disabled ? '#d0d7de' : 'fg.default',
              cursor: cloneState.disabled ? 'not-allowed' : 'pointer',
              opacity: cloneState.disabled ? 0.5 : 1
            }}
          />
        );
      })()}
      <StarButton item={item} size={size} />
    </Box>
  );
});

export default ActionButtonsRow; 