import { useCallback, useMemo } from 'react';
import { GitHubItem } from '../types';
import { useLocalStorage } from './useLocalStorage';

interface UseListSelectionReturn {
  selectedItems: Set<string | number>;
  toggleItemSelection: (id: string | number) => void;
  selectAllItems: () => void;
  clearSelection: () => void;
  bulkSelectItems: (itemIds: (string | number)[], shouldSelect: boolean) => void;
  selectAllState: { checked: boolean; indeterminate: boolean };
}

const getItemId = (item: GitHubItem): string | number => item.event_id || item.id;

/**
 * Shared hook for item selection logic used across all view components.
 * Manages selected items state, select-all checkbox state, and bulk operations.
 */
export function useListSelection(
  storageKey: string,
  allSelectableItems: GitHubItem[],
): UseListSelectionReturn {
  const [selectedItems, setSelectedItems] = useLocalStorage<Set<string | number>>(storageKey, new Set());

  const toggleItemSelection = useCallback((id: string | number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAllItems = useCallback(() => {
    setSelectedItems(new Set(allSelectableItems.map(getItemId)));
  }, [allSelectableItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const bulkSelectItems = useCallback((itemIds: (string | number)[], shouldSelect: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (shouldSelect) {
        itemIds.forEach(id => newSet.add(id));
      } else {
        itemIds.forEach(id => newSet.delete(id));
      }
      return newSet;
    });
  }, []);

  const selectAllState = useMemo(() => {
    if (allSelectableItems.length === 0) {
      return { checked: false, indeterminate: false };
    }

    const selectedCount = allSelectableItems.filter(item =>
      selectedItems.has(getItemId(item))
    ).length;

    if (selectedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedCount === allSelectableItems.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  }, [allSelectableItems, selectedItems]);

  return {
    selectedItems,
    toggleItemSelection,
    selectAllItems,
    clearSelection,
    bulkSelectItems,
    selectAllState,
  };
}
