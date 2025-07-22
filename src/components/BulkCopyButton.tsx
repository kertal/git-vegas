import { memo } from 'react';
import {
  ActionMenu,
  ActionList,
} from '@primer/react';
import {
  CopyIcon,
  CheckIcon,
} from '@primer/octicons-react';

interface BulkCopyButtonProps {
  selectedItems: Set<string | number>;
  totalItems: number;
  isCopied: (itemId: string | number) => boolean;
  onCopy: (format: 'detailed' | 'compact') => void;
  buttonStyles?: React.CSSProperties;
  showOnlyWhenSelected?: boolean;
}

const BulkCopyButton = memo(function BulkCopyButton({
  selectedItems,
  totalItems,
  isCopied,
  onCopy,
  buttonStyles = {},
  showOnlyWhenSelected = false,
}: BulkCopyButtonProps) {
  // Don't render if showOnlyWhenSelected is true and no items are selected
  if (showOnlyWhenSelected && selectedItems.size === 0) {
    return null;
  }

  const displayCount = selectedItems.size > 0 ? selectedItems.size : totalItems;

  return (
    <ActionMenu>
      <ActionMenu.Button
        variant="default"
        size="small"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontSize: 0,
          borderColor: 'border.default',
          ...buttonStyles,
        }}
      >
        {(isCopied('compact') || isCopied('detailed')) ? (
          <CheckIcon size={14} />
        ) : (
          <CopyIcon size={14} />
        )}{' '}
        {displayCount}
      </ActionMenu.Button>

      <ActionMenu.Overlay>
        <ActionList>
          <ActionList.Item onSelect={() => onCopy('detailed')}>
            Detailed Format
          </ActionList.Item>
          <ActionList.Item onSelect={() => onCopy('compact')}>
            Compact Format
          </ActionList.Item>
        </ActionList>
      </ActionMenu.Overlay>
    </ActionMenu>
  );
});

export default BulkCopyButton; 