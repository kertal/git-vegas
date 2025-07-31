import { Box, Text, IconButton } from '@primer/react';
import { XIcon } from '@primer/octicons-react';
import { useDismissibleBanner } from '../hooks/useDismissibleBanner';

interface DismissibleBannerProps {
  bannerId: string;
  children: React.ReactNode;
  variant?: 'attention' | 'danger' | 'success' | 'neutral';
}

export function DismissibleBanner({ 
  bannerId, 
  children, 
  variant = 'attention' 
}: DismissibleBannerProps) {
  const { isDismissed, dismissBanner } = useDismissibleBanner(bannerId);

  if (isDismissed) {
    return null;
  }

  return (
    <Box 
      sx={{ 
        p: 2, 
        bg: `${variant}.subtle`,
        border: '1px solid',
        borderColor: `${variant}.muted`,
        borderRadius: 2,
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
          {children}
        </Text>
      </Box>
      
      <IconButton
        icon={XIcon}
        aria-label="Dismiss banner"
        size="small"
        variant="invisible"
        onClick={dismissBanner}
        sx={{
          flexShrink: 0,
          color: 'fg.muted',
          '&:hover': {
            color: 'fg.default',
            bg: `${variant}.muted`,
          },
        }}
      />
    </Box>
  );
} 