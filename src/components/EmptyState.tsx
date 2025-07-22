import React from 'react';
import { Box, Text, Button } from '@primer/react';

export interface EmptyStateProps {
  /** The type of empty state to display */
  type: 'no-data' | 'no-matches' | 'no-search-results' | 'no-cached-data';
  /** Optional search text that was used */
  searchText?: string;
  /** Optional total count of available items */
  totalItems?: number;
  /** Whether to show a clear search button */
  showClearSearch?: boolean;
  /** Callback for clearing search */
  onClearSearch?: () => void;
  /** Custom message to override the default */
  customMessage?: string;
  /** Additional content to display below the message */
  children?: React.ReactNode;
}

/**
 * Shared component for displaying empty states across the application
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  searchText,
  totalItems,
  showClearSearch = false,
  onClearSearch,
  customMessage,
  children,
}) => {
  const getMessage = (): string => {
    if (customMessage) {
      return customMessage;
    }

    switch (type) {
      case 'no-data':
        return 'No data available. Enter a username and use the update button to load data.';
      
      case 'no-matches':
        if (searchText) {
          return `No items found matching "${searchText}". Try a different search term, use label:name or -label:name for label filtering, or adjust your filters.`;
        } else {
          return `Your current filters don't match any of the ${totalItems || 0} available items.`;
        }
      
      case 'no-search-results':
        if (searchText) {
          return `No data found matching "${searchText}". Try a different search term or use user:username for user filtering.`;
        } else {
          return 'No data found for the selected time period. Try adjusting your date range or filters.';
        }
      
      default:
        return 'No data available. Enter a username and use the update button to load data.';
    }
  };

  const shouldShowClearSearch = showClearSearch && searchText && onClearSearch;

  return (
    <Box
      sx={{
        p: 4,
        textAlign: 'center',
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 2,
        bg: 'canvas.subtle',
        color: 'fg.muted',
      }}
    >
      {type === 'no-matches' && totalItems !== undefined && totalItems > 0 ? (
        <Box>
          <Text sx={{ fontSize: 2, mb: 2 }}>
            No matches found
          </Text>
          <Text sx={{ fontSize: 1, color: 'fg.muted', mb: 3 }}>
            {getMessage()}
          </Text>
          {shouldShowClearSearch && (
            <Button
              variant="default"
              onClick={onClearSearch}
              size="small"
            >
              Clear Search
            </Button>
          )}
        </Box>
      ) : (
        <Box>
          <Text sx={{ fontSize: 1, mb: shouldShowClearSearch ? 2 : 0 }}>
            {getMessage()}
          </Text>
          {shouldShowClearSearch && (
            <Box
              sx={{
                mt: 2,
                textAlign: 'center',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Button variant="default" size="small" onClick={onClearSearch}>
                Clear search
              </Button>
            </Box>
          )}
        </Box>
      )}
      {children}
    </Box>
  );
};

export default EmptyState; 