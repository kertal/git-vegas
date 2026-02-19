import { useCallback, useMemo } from 'react';
import { GitHubItem, getItemId } from '../types';
import { useLocalStorage } from './useLocalStorage';

interface UseListSelectionReturn {
  selectedItems: Set<string | number>;
  toggleItemSelection: (id: string | number) => void;
  selectAllItems: () => void;
  clearSelection: () => void;
  bulkSelectItems: (itemIds: (string | number)[], shouldSelect: boolean) => void;
  selectAllState: { checked: boolean; indeterminate: boolean };
}

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
  }, [setSelectedItems]);

  const selectAllItems = useCallback(() => {
    setSelectedItems(new Set(allSelectableItems.map(getItemId)));
  }, [allSelectableItems, setSelectedItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, [setSelectedItems]);

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
  }, [setSelectedItems]);

  // Prune selected items that no longer exist in the selectable list
  const validSelectedItems = useMemo(() => {
    if (selectedItems.size === 0) return selectedItems;
    const validIds = new Set(allSelectableItems.map(getItemId));
    const pruned = new Set([...selectedItems].filter(id => validIds.has(id)));
    return pruned.size === selectedItems.size ? selectedItems : pruned;
  }, [allSelectableItems, selectedItems]);

  const selectAllState = useMemo(() => {
    if (allSelectableItems.length === 0) {
      return { checked: false, indeterminate: false };
    }

    const selectedCount = allSelectableItems.filter(item =>
      validSelectedItems.has(getItemId(item))
    ).length;

    if (selectedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedCount === allSelectableItems.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  }, [allSelectableItems, validSelectedItems]);

  return {
    selectedItems: validSelectedItems,
    toggleItemSelection,
    selectAllItems,
    clearSelection,
    bulkSelectItems,
    selectAllState,
  };
}
