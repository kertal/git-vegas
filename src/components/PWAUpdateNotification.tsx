import { Box, Button, Text, Flash } from '@primer/react';
import { SyncIcon, XIcon, DownloadIcon } from '@primer/octicons-react';
import { usePWAUpdate } from '../hooks/usePWAUpdate';
import { useState } from 'react';

export function PWAUpdateNotification() {
  const { needRefresh, offlineReady, updateServiceWorker } = usePWAUpdate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showOfflineReady, setShowOfflineReady] = useState(true);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateServiceWorker(true);
    } catch (error) {
      console.error('Failed to update app:', error);
      setIsUpdating(false);
    }
  };

  const handleDismissOffline = () => {
    setShowOfflineReady(false);
  };

  // Show update available notification
  if (needRefresh) {
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 1000,
          maxWidth: '500px',
          margin: '0 auto',
          '@media (min-width: 768px)': {
            left: 'auto',
            right: 16,
            maxWidth: '400px',
          },
        }}
      >
        <Flash variant="success">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              <DownloadIcon size={20} />
              <Box>
                <Text sx={{ fontSize: 1, fontWeight: 'bold', display: 'block' }}>
                  Update Available!
                </Text>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                  A new version of GitVegas is ready
                </Text>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <Button
                variant="primary"
                size="small"
                onClick={handleUpdate}
                disabled={isUpdating}
                leadingVisual={isUpdating ? SyncIcon : undefined}
                sx={{
                  minWidth: 'fit-content',
                  ...(isUpdating && {
                    '& svg': {
                      animation: 'spin 1s linear infinite',
                      '@keyframes spin': {
                        from: { transform: 'rotate(0deg)' },
                        to: { transform: 'rotate(360deg)' },
                      },
                    },
                  }),
                }}
              >
                {isUpdating ? 'Updating...' : 'Update'}
              </Button>
            </Box>
          </Box>
        </Flash>
      </Box>
    );
  }

  // Show offline ready notification (dismissible)
  if (offlineReady && showOfflineReady) {
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 1000,
          maxWidth: '500px',
          margin: '0 auto',
          '@media (min-width: 768px)': {
            left: 'auto',
            right: 16,
            maxWidth: '400px',
          },
        }}
      >
        <Flash variant="success">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bg: 'success.fg',
                  flexShrink: 0,
                }}
              />
              <Box>
                <Text sx={{ fontSize: 1, fontWeight: 'bold', display: 'block' }}>
                  Ready for offline use
                </Text>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                  GitVegas can now work without an internet connection
                </Text>
              </Box>
            </Box>
            
            <Button
              variant="invisible"
              size="small"
              onClick={handleDismissOffline}
              aria-label="Dismiss offline notification"
              leadingVisual={XIcon}
              sx={{
                color: 'fg.muted',
                flexShrink: 0,
                minWidth: 'auto',
                px: 2,
              }}
            />
          </Box>
        </Flash>
      </Box>
    );
  }

  return null;
} 