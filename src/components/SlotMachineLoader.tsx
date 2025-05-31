import { useState, useEffect, useMemo, memo } from 'react';
import { Box, Avatar, Text } from '@primer/react';
import type { SlotMachineLoaderProps } from '../types';

// Component for the slot machine loader animation
export const SlotMachineLoader = memo(function SlotMachineLoader({ avatarUrls, isLoading }: SlotMachineLoaderProps) {
  // Default emojis as fallback
  const defaultSymbols = ['🎰', '💎', '7️⃣', '🎲', '🎮', '🎪', '🎨', '🎭', '🎪'];
  
  // Ensure we always have items to display
  const allItems = useMemo(() => 
    avatarUrls.length > 0 ? avatarUrls : defaultSymbols
  , [avatarUrls]);

  const [positions, setPositions] = useState([0, 0, 0]);
  const [spinning, setSpinning] = useState([false, false, false]);

  // Effect to handle spinning state
  useEffect(() => {
    const timeoutIds: number[] = [];

    if (isLoading && !spinning.some(s => s)) {
      setSpinning([true, true, true]);
    } else if (!isLoading && spinning.some(s => s)) {
      // Stop spinning sequence with delays
      const stopSpinning = (index: number) => {
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
      };

      // Stop each reel with increasing delays
      timeoutIds.push(window.setTimeout(() => stopSpinning(0), 400));
      timeoutIds.push(window.setTimeout(() => stopSpinning(1), 900));
      timeoutIds.push(window.setTimeout(() => stopSpinning(2), 1400));
    }

    // Cleanup timeouts
    return () => {
      timeoutIds.forEach(id => window.clearTimeout(id));
    };
  }, [isLoading, allItems.length]);

  const SlotReel = ({ position, isSpinning, index }: { position: number; isSpinning: boolean; index: number }) => {
    // Create a sequence of items for the spinning effect
    const itemSequence = useMemo(() => {
      const sequence = [];
      const totalItems = 10; // Show 10 items in the sequence
      
      for (let i = 0; i < totalItems; i++) {
        sequence.push(allItems[(position + i) % allItems.length]);
      }
      
      return sequence;
    }, [position, allItems]);

    // Get the current visible item (middle item when spinning, final item when stopped)
    const visibleItemIndex = isSpinning ? Math.floor(itemSequence.length / 2) : itemSequence.length - 1;

    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: '4px',
        bg: 'canvas.subtle',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <Box 
          data-testid="reel"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '240px', // Height for 10 items
            transform: isSpinning ? 'translateY(0)' : `translateY(-${(itemSequence.length - 1) * 24}px)`,
            transition: isSpinning ? 'none' : 'transform 0.5s cubic-bezier(0.4, 2, 0.5, 1)',
            animation: isSpinning ? `spin${index} 1s infinite linear` : 'none'
          }}
          sx={{
            '@keyframes spin0': {
              '0%': { transform: 'translateY(0px)' },
              '100%': { transform: 'translateY(-240px)' }
            },
            '@keyframes spin1': {
              '0%': { transform: 'translateY(0px)' },
              '100%': { transform: 'translateY(-240px)' }
            },
            '@keyframes spin2': {
              '0%': { transform: 'translateY(0px)' },
              '100%': { transform: 'translateY(-240px)' }
            }
          }}>
          {itemSequence.map((item, i) => (
            <Box key={i} sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              flexShrink: 0,
              opacity: i === visibleItemIndex ? 1 : isSpinning ? 0.3 : 0,
              transform: i === visibleItemIndex && !isSpinning ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.5s ease',
              bg: i === visibleItemIndex && !isSpinning ? 'accent.subtle' : 'transparent',
              borderRadius: '2px'
            }}>
              {item && (
                typeof item === 'string' && item.startsWith('http')
                  ? <Avatar src={item} size={20} /> 
                  : <Text sx={{ fontSize: 2, lineHeight: 1 }}>{item}</Text>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  // Check if all reels have stopped spinning
  const allStopped = !spinning.some(s => s);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1
    }}>
      <Box sx={{
        display: 'flex',
        gap: 1,
        padding: '2px',
        bg: 'canvas.default',
        borderRadius: '6px',
        border: '1px solid',
        borderColor: allStopped ? 'accent.emphasis' : 'border.default',
        boxShadow: allStopped ? 'shadow.medium' : 'shadow.small',
        transition: 'all 0.5s ease'
      }}>
        {positions.map((position, index) => (
          <SlotReel 
            key={index}
            position={position}
            isSpinning={spinning[index]}
            index={index}
          />
        ))}
      </Box>
    </Box>
  );
}); 