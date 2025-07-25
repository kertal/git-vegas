import { memo, useCallback } from 'react';
import { IconButton } from '@primer/react';
import {
  LinkIcon,
  CheckIcon,
} from '@primer/octicons-react';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
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
      await navigator.clipboard.writeText(item.html_url);
      triggerCopy(item.event_id || item.id);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to copy link:', error);
      onError?.(error as Error);
    }
  }, [item, triggerCopy, onSuccess, onError]);

  const isItemCopied = isCopied(item.event_id || item.id);

  return (
    <IconButton
      icon={isItemCopied ? CheckIcon : LinkIcon}
      variant="invisible"
      aria-label={isItemCopied ? "Link copied to clipboard" : "Copy link to clipboard"}
      size={size}
      onClick={handleCopy}
      sx={buttonStyles}
      title={isItemCopied ? "Link copied to clipboard" : "Copy link to clipboard"}
    />
  );
});

export default CopyToClipboardButton; 