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
  const [isInitialized, setIsInitialized] = useState(false);

  // Effect to handle initialization
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, []);

  // Effect to handle spinning state
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const intervals: number[] = [];
    const timeouts: number[] = [];

    if (isLoading && !spinning.some(s => s)) {
      // Start spinning all reels
      setSpinning([true, true, true]);

      // Set up spinning intervals
      for (let i = 0; i < 3; i++) {
        const interval = window.setInterval(() => {
          setPositions(prev => {
            const next = [...prev];
            next[i] = (next[i] + 1) % allItems.length;
            return next;
          });
        }, 200 + (i * 50)); // Slightly different speeds for each reel
        intervals.push(interval);
      }
    } else if (!isLoading && spinning.some(s => s)) {
      // Stop spinning sequence
      for (let i = 0; i < 3; i++) {
        const timeout = window.setTimeout(() => {
          setSpinning(prev => {
            const next = [...prev];
            next[i] = false;
            return next;
          });
          
          // Set final position for this reel
          setPositions(prev => {
            const next = [...prev];
            next[i] = Math.floor(Math.random() * allItems.length);
            return next;
          });
        }, 400 + (i * 500));
        timeouts.push(timeout);
      }
    }

    // Cleanup
    return () => {
      intervals.forEach(interval => window.clearInterval(interval));
      timeouts.forEach(timeout => window.clearTimeout(timeout));
    };
  }, [isLoading, isInitialized, allItems.length]);

  const SlotReel = ({ position, isSpinning }: { position: number; isSpinning: boolean }) => {
    const currentItem = allItems[position % allItems.length];
    
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
            height: '72px',
            transform: `translateY(-24px)`,
            transition: isSpinning ? 'none' : 'transform 0.5s cubic-bezier(0.4, 2, 0.5, 1)',
            animation: isSpinning ? 'spin 0.4s infinite linear' : 'none'
          }}
          sx={{
            '@keyframes spin': {
              '0%': { transform: 'translateY(0px)' },
              '100%': { transform: 'translateY(-24px)' }
            }
          }}>
          {[currentItem, currentItem, currentItem].map((item, i) => (
            <Box key={i} sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              flexShrink: 0,
              opacity: i === 1 ? 1 : 0,
              transform: !isSpinning && i === 1 ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.5s ease',
              bg: !isSpinning && i === 1 ? 'accent.subtle' : 'transparent',
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
          />
        ))}
      </Box>
    </Box>
  );
}); 