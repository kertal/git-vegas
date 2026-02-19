import { GitHubItem, getItemId } from '../types';

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

  if (selectedItems && selectedItems.size > 0) {
    groupedData = groupedData
      .map(({ groupName, items }) => ({
        groupName,
        items: items.filter(item => selectedItems.has(getItemId(item))),
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
    selectedItems.has(getItemId(item))
  ).length;

  if (selectedCount === 0) {
    return { checked: false, indeterminate: false };
  } else if (selectedCount === groupItems.length) {
    return { checked: true, indeterminate: false };
  } else {
    return { checked: false, indeterminate: true };
  }
};
