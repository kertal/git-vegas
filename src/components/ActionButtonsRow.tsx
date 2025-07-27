import { memo } from 'react';
import { Box, IconButton } from '@primer/react';
import { EyeIcon } from '@primer/octicons-react';
import { GitHubItem } from '../types';
import CopyToClipboardButton from './CopyToClipboardButton';

interface ActionButtonsRowProps {
  item: GitHubItem;
  onShowDescription: (item: GitHubItem) => void;
  size?: 'small' | 'medium';
}



const ActionButtonsRow = memo(function ActionButtonsRow({
  item,
  onShowDescription,
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
    </Box>
  );
});

export default ActionButtonsRow; 