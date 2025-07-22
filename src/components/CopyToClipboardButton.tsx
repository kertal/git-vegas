import { memo, useCallback } from 'react';
import { IconButton } from '@primer/react';
import {
  CopyIcon,
  CheckIcon,
} from '@primer/octicons-react';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';
import { GitHubItem } from '../types';

interface CopyToClipboardButtonProps {
  item: GitHubItem;
  size?: 'small' | 'medium';
  buttonStyles?: React.CSSProperties;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const CopyToClipboardButton = memo(function CopyToClipboardButton({
  item,
  size = 'small',
  buttonStyles = {},
  onSuccess,
  onError,
}: CopyToClipboardButtonProps) {
  const { isCopied, triggerCopy } = useCopyFeedback(2000);

  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard([item], {
        isCompactView: true, // Use compact format for single items
        onSuccess: () => {
          triggerCopy(item.event_id || item.id);
          onSuccess?.();
        },
        onError: (error: Error) => {
          console.error('Failed to copy item:', error);
          onError?.(error);
        },
      });
    } catch (error) {
      console.error('Failed to copy item:', error);
      onError?.(error as Error);
    }
  }, [item, triggerCopy, onSuccess, onError]);

  const isItemCopied = isCopied(item.event_id || item.id);

  return (
    <IconButton
      icon={isItemCopied ? CheckIcon : CopyIcon}
      variant="invisible"
      aria-label={isItemCopied ? "Copied to clipboard" : "Copy to clipboard"}
      size={size}
      onClick={handleCopy}
      sx={buttonStyles}
      title={isItemCopied ? "Copied to clipboard" : "Copy to clipboard"}
    />
  );
});

export default CopyToClipboardButton; 