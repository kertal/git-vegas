import { Box, Avatar, Text } from '@primer/react';

interface LoadingIndicatorProps {
  loadingProgress: string;
  isLoading: boolean;
  currentUsername?: string;
}

export const LoadingIndicator = ({
  loadingProgress,
  isLoading,
  currentUsername,
}: LoadingIndicatorProps) => {
  if (!isLoading || !loadingProgress) {
    return null;
  }

  // Extract username from progress message if not provided
  const extractUsername = (message: string): string | null => {
    // Look for patterns like "Fetching data for username..." or "Found X events for username"
    const usernameMatch = message.match(/for\s+([a-zA-Z0-9_-]+)/);
    return usernameMatch ? usernameMatch[1] : null;
  };

  const username = currentUsername || extractUsername(loadingProgress);
  
  // For messages without a username (like cached data), show a different style
  if (!username) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1,
          bg: 'success.subtle',
          color: 'success.fg',
          borderRadius: 2,
          fontSize: 0,
          fontWeight: 'medium',
          maxWidth: '200px',
          overflow: 'hidden',
        }}
      >
        <Text
          sx={{
            fontSize: 0,
            lineHeight: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {loadingProgress}
        </Text>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        bg: 'attention.subtle',
        color: 'attention.fg',
        borderRadius: 2,
        fontSize: 0,
        fontWeight: 'medium',
        maxWidth: '200px',
        overflow: 'hidden',
      }}
    >
      <Avatar
        src={`https://github.com/${username}.png`}
        size={16}
        sx={{ flexShrink: 0 }}
      />
      <Text
        sx={{
          fontSize: 0,
          lineHeight: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {loadingProgress}
      </Text>
    </Box>
  );
}; 