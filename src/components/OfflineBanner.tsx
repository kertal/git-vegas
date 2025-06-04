import { Box } from '@primer/react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * Small offline indicator that shows when the app is offline
 */
export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <Box sx={{ 
      position: 'fixed', 
      bottom: 16, 
      right: 16, 
      zIndex: 1000,
      fontSize: 24,
      opacity: 0.7,
      '&:hover': {
        opacity: 1
      }
    }}>
      📡❌
    </Box>
  );
}; 