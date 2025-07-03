import { memo, useState } from 'react';
import { Button, Tooltip } from '@primer/react';
import { StarIcon, StarFillIcon } from '@primer/octicons-react';
import { GitHubItem } from '../types';
import { StarredItemsManager } from '../utils/starredItems';

interface StarButtonProps {
  item: GitHubItem;
  size?: 'small' | 'medium';
  variant?: 'invisible' | 'default';
  showTooltip?: boolean;
  onStarChange?: (isStarred: boolean) => void;
}

const StarButton = memo(function StarButton({ 
  item, 
  size = 'small', 
  variant = 'invisible',
  showTooltip = true,
  onStarChange 
}: StarButtonProps) {
  const [isStarred, setIsStarred] = useState(() => StarredItemsManager.isStarred(item));
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleStar = async () => {
    setIsLoading(true);
    try {
      if (isStarred) {
        StarredItemsManager.removeItem(item);
        setIsStarred(false);
        onStarChange?.(false);
      } else {
        StarredItemsManager.addItem(item);
        setIsStarred(true);
        onStarChange?.(true);
      }
    } catch (error) {
      console.error('Failed to toggle star:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const button = (
    <Button
      size={size}
      variant={variant}
      onClick={handleToggleStar}
      disabled={isLoading}
      sx={{
        p: size === 'small' ? 1 : 2,
        color: isStarred ? 'attention.fg' : 'fg.muted',
        '&:hover': {
          color: isStarred ? 'attention.fg' : 'fg.default',
          bg: 'neutral.subtle',
        },
      }}
    >
      {isStarred ? (
        <StarFillIcon size={size === 'small' ? 14 : 16} />
      ) : (
        <StarIcon size={size === 'small' ? 14 : 16} />
      )}
    </Button>
  );

  if (!showTooltip) {
    return button;
  }

  return (
    <Tooltip
      text={isStarred ? 'Remove from starred items' : 'Add to starred items'}
      direction="n"
    >
      {button}
    </Tooltip>
  );
});

export default StarButton; 