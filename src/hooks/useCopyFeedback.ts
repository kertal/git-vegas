import { useState, useCallback } from 'react';

/**
 * Custom hook for managing copy button feedback state
 * 
 * @param resetDelay - Delay in milliseconds before resetting to original state (default: 2000ms)
 * @returns Object containing copied state, triggerCopy function, and resetCopy function
 */
export const useCopyFeedback = (resetDelay: number = 2000) => {
  const [copiedItems, setCopiedItems] = useState<Set<string | number>>(new Set());

  // Function to trigger copy feedback for a specific item
  const triggerCopy = useCallback((itemId: string | number) => {
    setCopiedItems(prev => new Set(prev).add(itemId));
    
    // Reset after delay
    setTimeout(() => {
      setCopiedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }, resetDelay);
  }, [resetDelay]);

  // Function to manually reset copy state for a specific item
  const resetCopy = useCallback((itemId: string | number) => {
    setCopiedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  }, []);

  // Function to check if an item is in copied state
  const isCopied = useCallback((itemId: string | number) => {
    return copiedItems.has(itemId);
  }, [copiedItems]);

  return {
    isCopied,
    triggerCopy,
    resetCopy,
  };
}; 