import { useState, useCallback } from 'react';
import { GitHubItem } from '../types';

interface UseDialogNavigationReturn {
  selectedItemForDialog: GitHubItem | null;
  setSelectedItemForDialog: (item: GitHubItem | null) => void;
  handlePreviousItem: () => void;
  handleNextItem: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * Shared hook for dialog navigation (prev/next) used across all view components.
 */
export function useDialogNavigation(
  items: GitHubItem[],
): UseDialogNavigationReturn {
  const [selectedItemForDialog, setSelectedItemForDialog] =
    useState<GitHubItem | null>(null);

  const currentIndex = selectedItemForDialog
    ? items.findIndex(item => item.id === selectedItemForDialog.id)
    : -1;

  const handlePreviousItem = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedItemForDialog(items[currentIndex - 1]);
    }
  }, [currentIndex, items]);

  const handleNextItem = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < items.length - 1) {
      setSelectedItemForDialog(items[currentIndex + 1]);
    }
  }, [currentIndex, items]);

  return {
    selectedItemForDialog,
    setSelectedItemForDialog,
    handlePreviousItem,
    handleNextItem,
    hasPrevious: currentIndex > 0,
    hasNext: currentIndex >= 0 && currentIndex < items.length - 1,
  };
}
