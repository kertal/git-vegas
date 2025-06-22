import React, { useState, useCallback } from 'react';
import { IconButton, Tooltip } from '@primer/react';
import { LinkIcon, CheckIcon } from '@primer/octicons-react';
import {
  extractShareableState,
  generateShareableUrl,
  copyToClipboard as copyTextToClipboard,
} from '../utils/urlState';
import { FormSettings, UISettings } from '../types';

interface ShareButtonProps {
  formSettings: FormSettings;
  uiSettings: UISettings;
  searchText?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'invisible';
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  formSettings,
  uiSettings,
  searchText = '',
  size = 'medium',
  variant = 'default',
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    try {
      setError(null);

      // Extract current app state
      const shareableState = extractShareableState(
        formSettings,
        uiSettings,
        searchText
      );

      // Generate shareable URL
      const shareableUrl = generateShareableUrl(shareableState);

      // Copy to clipboard
      const success = await copyTextToClipboard(shareableUrl);

      if (success) {
        setCopied(true);
        // Reset the copied state after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      } else {
        setError('Failed to copy to clipboard');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Error sharing state:', err);
      setError('Failed to generate share link');
      setTimeout(() => setError(null), 3000);
    }
  }, [formSettings, uiSettings, searchText]);

  const tooltipText = error
    ? error
    : copied
      ? 'Link copied to clipboard!'
      : 'Share current state via link';

  return (
    <Tooltip text={tooltipText} direction="s">
      <IconButton
        icon={copied ? CheckIcon : LinkIcon}
        aria-label="Share current state"
        size={size}
        variant={variant}
        onClick={handleShare}
        className={className}
        sx={{
          color: error ? 'danger.fg' : copied ? 'success.fg' : 'fg.muted',
          ':hover': {
            color: error
              ? 'danger.emphasis'
              : copied
                ? 'success.emphasis'
                : 'fg.default',
          },
          transition: 'color 0.2s ease-in-out',
        }}
      />
    </Tooltip>
  );
};

export default ShareButton;
