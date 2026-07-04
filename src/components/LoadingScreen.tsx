import { Box, Button } from '@primer/react';
import { LoadingIndicator } from './LoadingIndicator';
import { SlotMachineLoader } from './SlotMachineLoader';

interface LoadingScreenProps {
  avatarUrls: string[];
  loading: boolean;
  isManuallySpinning: boolean;
  isDataLoadingComplete: boolean;
  loadingProgress: string;
  currentUsername: string;
  onManualSpin: () => void;
  onStart: () => void;
}

/**
 * Full-screen initial loading view: the slot-machine loader, a Start button
 * that activates once data has loaded, and progress/status text.
 */
export function LoadingScreen({
  avatarUrls,
  loading,
  isManuallySpinning,
  isDataLoadingComplete,
  loadingProgress,
  currentUsername,
  onManualSpin,
  onStart,
}: LoadingScreenProps) {
  const ready = isDataLoadingComplete && !loading;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 3,
        px: 3,
        '@media (max-width: 767px)': {
          px: 2,
          gap: 2,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          mb: 4,
        }}
      >
        <Box sx={{ fontSize: [30, 100], fontWeight: 'bold', color: 'fg.default', mb: 4 }}>
          GitVegas
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
          <SlotMachineLoader
            avatarUrls={avatarUrls}
            isLoading={loading}
            isManuallySpinning={isManuallySpinning}
            size="huge"
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: ready ? 'pointer' : 'not-allowed',
            transition: 'transform 0.2s ease',
            opacity: ready ? 1 : 0.5,
            mb: 4,
            '&:hover': {
              transform: ready ? 'scale(1.05)' : 'none',
            },
            '&:hover .slot-machine': {
              animation: ready ? 'spin 0.5s ease-in-out' : 'none',
            },
          }}
          onMouseEnter={ready ? onManualSpin : undefined}
        >
          <Button
            size="medium"
            disabled={!ready}
            onClick={onStart}
            sx={{
              fontSize: '16px',
              fontWeight: 'bold',
              px: 4,
              py: 2,
              borderRadius: '8px',
              backgroundColor: ready ? 'white' : '#f0f0f0',
              color: ready ? 'black' : '#666',
              border: `2px solid ${ready ? 'black' : '#ccc'}`,
              transition: 'all 0.2s ease',
              minHeight: '48px',
              cursor: ready ? 'pointer' : 'not-allowed',
              '&:hover': {
                transform: ready ? 'translateY(-1px)' : 'none',
                boxShadow: ready ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              '@media (max-width: 767px)': {
                fontSize: '14px',
                px: 3,
                py: 2,
                minHeight: '44px',
                minWidth: '140px',
              },
            }}
          >
            🕹️ {ready ? 'Start' : 'Loading...'}
          </Button>
        </Box>

        <Box sx={{
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <LoadingIndicator
            loadingProgress={loadingProgress}
            isLoading={loading}
            currentUsername={currentUsername}
          />
          {ready && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                mt: 2,
                animation: 'fadeIn 0.5s ease-in',
                '@keyframes fadeIn': {
                  from: { opacity: 0, transform: 'translateY(10px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <Box sx={{ textAlign: 'center', color: 'success.fg' }}>
                <Box sx={{ fontSize: '18px', fontWeight: 'bold', mb: 1 }}>
                  ✅ Data loaded successfully!
                </Box>
                <Box sx={{ fontSize: '14px', color: 'fg.muted' }}>
                  Your GitHub activity is ready to view
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
