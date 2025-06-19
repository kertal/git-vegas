import React, { ReactNode } from 'react';
import { Box, SxProp } from '@primer/react';

export interface ResultsContainerProps {
  /** Content to display on the left side of the header */
  headerLeft?: ReactNode;
  /** Content to display on the right side of the header */
  headerRight?: ReactNode;
  /** Main content to display in the container */
  children: ReactNode;
  /** Optional className for additional styling */
  className?: string;
  /** Whether to show a border around the container */
  bordered?: boolean;
  /** Custom styling using Primer's sx prop */
  sx?: SxProp['sx'];
}

/**
 * A reusable container component for results-related content
 * Provides a consistent layout with header and content sections
 * 
 * @example
 * ```tsx
 * // Simple usage with just content
 * <ResultsContainer>
 *   <p>Your content here</p>
 * </ResultsContainer>
 * 
 * // With header sections
 * <ResultsContainer
 *   headerLeft={<Text>Title</Text>}
 *   headerRight={<Button>Action</Button>}
 * >
 *   <div>Main content</div>
 * </ResultsContainer>
 * 
 * // With custom styling
 * <ResultsContainer
 *   headerLeft={<Text>Results Feed</Text>}
 *   headerRight={<Text>{items.length} items</Text>}
 *   sx={{ margin: '16px auto', maxWidth: '800px' }}
 * >
 *   {items.map(item => <ResultItem key={item.id} item={item} />)}
 * </ResultsContainer>
 * ```
 */
export const ResultsContainer: React.FC<ResultsContainerProps> = ({
  headerLeft,
  headerRight,
  children,
  className = '',
  bordered = true,
  sx,
}) => {
  return (
    <Box
      className={className}
      sx={{
        border: bordered ? '1px solid' : 'none',
        borderColor: 'border.default',
        borderRadius: 2,
        bg: 'canvas.default',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {/* Header section - only render if we have header content */}
      {(headerLeft || headerRight) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 3,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'border.muted',
            bg: 'canvas.subtle',
          }}
        >
          {/* Left side of header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {headerLeft}
          </Box>

          {/* Right side of header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {headerRight}
          </Box>
        </Box>
      )}

      {/* Main content section */}
      <Box
        sx={{
          p: headerLeft || headerRight ? 0 : 3, // No padding if we have a header (content should handle its own padding)
        }}
      >
        {children}
      </Box>
    </Box>
  );
}; 