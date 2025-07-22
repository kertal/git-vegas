import { memo } from 'react';
import { Button } from '@primer/react';
import { CopyIcon, CheckIcon, LinkIcon } from '@primer/octicons-react';

interface BulkCopyButtonsProps {
  selectedItems: Set<string | number>;
  totalItems: number;
  isCopied: (itemId: string | number) => boolean;
  onCopy: (format: 'detailed' | 'compact') => void;
  buttonStyles?: React.CSSProperties;
  showOnlyWhenSelected?: boolean;
}

const BulkCopyButtons = memo(function BulkCopyButtons({
  selectedItems,
  totalItems,
  isCopied,
  onCopy,
  buttonStyles = {},
  showOnlyWhenSelected = false,
}: BulkCopyButtonsProps) {
  // Don't render if showOnlyWhenSelected is true and no items are selected
  if (showOnlyWhenSelected && selectedItems.size === 0) {
    return null;
  }

  const displayCount = selectedItems.size > 0 ? selectedItems.size : totalItems;
  const isContentCopied = isCopied('detailed');
  const isCompactCopied = isCopied('compact');

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Button
        variant="default"
        size="small"
        onClick={() => onCopy('detailed')}
        aria-label={isContentCopied ? "Copied to clipboard" : "Copy content"}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontSize: 0,
          borderColor: 'border.default',
          ...buttonStyles,
        }}
      >
        {isContentCopied ? (
          <CheckIcon size={14} />
        ) : (
          <CopyIcon size={14} />
        )}
        Copy content ({displayCount})
      </Button>

      <Button
        variant="default"
        size="small"
        onClick={() => onCopy('compact')}
        aria-label={isCompactCopied ? "Copied to clipboard" : "Copy compact"}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontSize: 0,
          borderColor: 'border.default',
          ...buttonStyles,
        }}
      >
        {isCompactCopied ? (
          <CheckIcon size={14} />
        ) : (
          <LinkIcon size={14} />
        )}
        Copy compact ({displayCount})
      </Button>
    </div>
  );
});

export default BulkCopyButtons; 