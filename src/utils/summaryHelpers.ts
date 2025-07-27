import { GitHubItem } from '../types';

/**
 * Creates a formatted group data structure for clipboard operations
 */
export const formatGroupedDataForClipboard = (
  actionGroups: Record<string, GitHubItem[]>,
  selectedItems?: Set<string | number>
): Array<{ groupName: string; items: GitHubItem[] }> => {
  let groupedData = Object.entries(actionGroups)
    .filter(([, items]) => items.length > 0)
    .map(([groupName, items]) => ({
      groupName,
      items,
    }));

  // Filter to only selected items if any are selected
  if (selectedItems && selectedItems.size > 0) {
    groupedData = groupedData
      .map(({ groupName, items }) => ({
        groupName,
        items: items.filter(item => selectedItems.has(item.event_id || item.id)),
      }))
      .filter(({ items }) => items.length > 0);
  }

  return groupedData;
};

/**
 * Gets all displayed items from grouped data
 */
export const getAllDisplayedItems = (actionGroups: Record<string, GitHubItem[]>): GitHubItem[] => {
  return Object.values(actionGroups).flat();
};

/**
 * Checks if any groups have items
 */
export const hasAnyItems = (actionGroups: Record<string, GitHubItem[]>): boolean => {
  return Object.values(actionGroups).some(items => items.length > 0);
};

/**
 * Gets total count of all items across groups
 */
export const getTotalItemCount = (actionGroups: Record<string, GitHubItem[]>): number => {
  return Object.values(actionGroups).reduce((total, items) => total + items.length, 0);
};

/**
 * Checks if a section should be collapsed based on stored preferences
 */
export const isSectionCollapsed = (
  sectionName: string, 
  collapsedSections: Set<string>
): boolean => {
  return collapsedSections.has(sectionName);
};

/**
 * Gets the select all state for a specific group
 */
export const getGroupSelectState = (
  groupItems: GitHubItem[],
  selectedItems: Set<string | number>
): { checked: boolean; indeterminate: boolean } => {
  if (groupItems.length === 0) {
    return { checked: false, indeterminate: false };
  }

  const selectedCount = groupItems.filter(item => 
    selectedItems.has(item.event_id || item.id)
  ).length;

  if (selectedCount === 0) {
    return { checked: false, indeterminate: false };
  } else if (selectedCount === groupItems.length) {
    return { checked: true, indeterminate: false };
  } else {
    return { checked: false, indeterminate: true };
  }
}; 