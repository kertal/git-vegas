import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { Box, Avatar, Text } from '@primer/react';
import type { SlotMachineLoaderProps } from '../types';

// Memoized SlotReel component to prevent unnecessary re-renders
const SlotReel = memo(function SlotReel({
  position,
  isSpinning,
  index,
  allItems,
  size,
  isManuallySpinning,
}: {
  position: number;
  isSpinning: boolean;
  index: number;
  allItems: string[];
  size: 'small' | 'medium' | 'large' | 'huge';
  isManuallySpinning: boolean;
}) {
  // Create a sequence of items for the spinning effect
  const itemSequence = useMemo(() => {
    const sequence = [];
    const totalItems = 10; // Show 10 items in the sequence

    for (let i = 0; i < totalItems; i++) {
      sequence.push(allItems[(position + i) % allItems.length]);
    }

    return sequence;
  }, [position, allItems]);

  // Memoize size-based dimensions
  const dimensions = useMemo(() => {
    const sizeMultiplier = size === 'huge' ? 4 : size === 'large' ? 2.5 : size === 'medium' ? 1.5 : 1;
    const itemHeight = 24 * sizeMultiplier;
    const itemWidth = 24 * sizeMultiplier;
    const totalHeight = 240 * sizeMultiplier;
    const visibleItemIndex = Math.floor(itemSequence.length / 2);
    const offset = itemHeight * (visibleItemIndex - 0.5); // Center the item by offsetting by half its height

    return {
      itemHeight,
      itemWidth,
      totalHeight,
      visibleItemIndex,
      offset,
      avatarSize: size === 'huge' ? 80 : size === 'large' ? 48 : size === 'medium' ? 32 : 20,
      fontSize: size === 'huge' ? 6 : size === 'large' ? 4 : size === 'medium' ? 3 : 2,
    };
  }, [size, itemSequence.length]);

  // Memoize animation style
  const animationStyle = useMemo(() => ({
    animation: isSpinning
      ? `spin${index} ${isManuallySpinning ? '0.3' : '1.5'}s infinite linear`
      : 'none',
  }), [isSpinning, index, isManuallySpinning]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${dimensions.itemWidth}px`,
        height: `${dimensions.itemHeight}px`,
        borderColor: 'border.default',
        borderRadius: '4px',
        bg: 'canvas.subtle',
        overflow: 'hidden',
        position: 'relative',
        '&:focus': {
          outline: 'none',
          boxShadow: 'none',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 1,
        },
      }}
    >
      <Box
        data-testid="reel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: `${dimensions.totalHeight}px`, // Height for 10 items
          transform: isSpinning
            ? 'translateY(0)'
            : `translateY(-${dimensions.offset}px)`,
          transition: isSpinning
            ? 'none'
            : 'transform 0.5s cubic-bezier(0.4, 2, 0.5, 1)',
          ...animationStyle,
        }}
        sx={{
          '@keyframes spin0': {
            '0%': { transform: 'translateY(0px)' },
            '100%': { transform: `translateY(-${dimensions.totalHeight}px)` },
          },
          '@keyframes spin1': {
            '0%': { transform: 'translateY(0px)' },
            '100%': { transform: `translateY(-${dimensions.totalHeight}px)` },
          },
          '@keyframes spin2': {
            '0%': { transform: 'translateY(0px)' },
            '100%': { transform: `translateY(-${dimensions.totalHeight}px)` },
          },
        }}
      >
        {itemSequence.map((item, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: `${dimensions.itemWidth}px`,
              height: `${dimensions.itemHeight}px`,
              flexShrink: 0,
              transform:
                i === dimensions.visibleItemIndex && !isSpinning
                  ? 'scale(1.1)'
                  : 'scale(1)',
              transition: 'all 0.5s ease',
              borderRadius: '2px',
              position: 'relative',
              zIndex: i === dimensions.visibleItemIndex ? 2 : 0,
            }}
          >
            {item &&
              (typeof item === 'string' && item.startsWith('http') ? (
                <Avatar src={item} size={dimensions.avatarSize} />
              ) : (
                <Text sx={{ fontSize: dimensions.fontSize, lineHeight: 1 }}>{item}</Text>
              ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
});

// Component for the slot machine loader animation
export const SlotMachineLoader = memo(function SlotMachineLoader({
  avatarUrls,
  isLoading,
  isManuallySpinning = false,
  size = 'medium',
}: SlotMachineLoaderProps) {
  // Ensure we always have items to display - memoized for performance
  const allItems = useMemo(() => {
    // Default emojis as fallback
    const defaultSymbols = ['🎰', '💎', '7️⃣', '🎲', '🎮', '🎪', '🎨', '🎭', '🎪'];
    return avatarUrls.length > 0 ? avatarUrls : defaultSymbols;
  }, [avatarUrls]);

  const [positions, setPositions] = useState([0, 0, 0]);
  const [spinning, setSpinning] = useState([false, false, false]);

  // Memoize the stop spinning function to prevent recreating on every render
  const stopSpinning = useCallback((index: number) => {
    setSpinning(prev => {
      const next = [...prev];
      next[index] = false;
      return next;
    });
    setPositions(prev => {
      const next = [...prev];
      next[index] = Math.floor(Math.random() * allItems.length);
      return next;
    });
  }, [allItems.length]);

  // Effect to handle spinning state
  useEffect(() => {
    const timeoutIds: number[] = [];

    if ((isLoading || isManuallySpinning) && !spinning.some(s => s)) {
      setSpinning([true, true, true]);
    } else if (!isLoading && !isManuallySpinning && spinning.some(s => s)) {
      // Stop spinning sequence with delays
      // For manual spin, calculate delays for exactly 3 rotations
      const baseDelay = isManuallySpinning ? 1000 : 600; // 1 second per rotation for manual

      // Stop each reel with increasing delays
      timeoutIds.push(window.setTimeout(() => stopSpinning(0), baseDelay));
      timeoutIds.push(window.setTimeout(() => stopSpinning(1), baseDelay * 2));
      timeoutIds.push(window.setTimeout(() => stopSpinning(2), baseDelay * 3));
    }

    // Cleanup timeouts
    return () => {
      timeoutIds.forEach(id => window.clearTimeout(id));
    };
    // Note: 'spinning' is intentionally omitted from dependencies to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isManuallySpinning, stopSpinning]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          padding: '2px',
          transition: 'all 0.5s ease',
        }}
      >
        {positions.map((position, index) => (
          <SlotReel
            key={index}
            position={position}
            isSpinning={spinning[index]}
            index={index}
            allItems={allItems}
            size={size}
            isManuallySpinning={isManuallySpinning}
          />
        ))}
      </Box>
    </Box>
  );
});
