import { memo } from 'react';
import { Box, IconButton } from '@primer/react';
import {
  EyeIcon,
  DuplicateIcon,
} from '@primer/octicons-react';
import { GitHubItem } from '../types';
import CopyToClipboardButton from './CopyToClipboardButton';

interface ActionButtonsRowProps {
  item: GitHubItem;
  githubToken?: string;
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
  onShowDescription,
  onCloneItem,
  size = 'small'
}: ActionButtonsRowProps) {

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
      <CopyToClipboardButton
        item={item}
        size={size}
      />
      {(() => {
        const cloneState = getCloneButtonState(item, githubToken);
        return (
          <IconButton
            icon={DuplicateIcon}
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
    </Box>
  );
});

export default ActionButtonsRow; 