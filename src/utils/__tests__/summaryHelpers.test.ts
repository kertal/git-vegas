import {
  formatGroupedDataForClipboard,
  getAllDisplayedItems,
  hasAnyItems,
  getTotalItemCount,
  isSectionCollapsed,
  getGroupSelectState
} from '../summary';
import { GitHubItem } from '../../types';

// Mock data helper
const createMockItem = (overrides: Partial<GitHubItem> = {}): GitHubItem => ({
  id: 1,
  title: 'Test Item',
  html_url: 'https://github.com/user/repo/pull/1',
  state: 'open',
  user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
  updated_at: '2023-01-01T00:00:00Z',
  created_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

describe('summaryHelpers', () => {
  describe('formatGroupedDataForClipboard', () => {
    const mockGroups = {
      'PRs - opened': [createMockItem({ id: 1 }), createMockItem({ id: 2 })],
      'Issues - closed': [createMockItem({ id: 3 })],
      'Empty Group': [],
    };

    it('should format grouped data and filter out empty groups', () => {
      const result = formatGroupedDataForClipboard(mockGroups);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        groupName: 'PRs - opened',
        items: mockGroups['PRs - opened']
      });
      expect(result[1]).toEqual({
        groupName: 'Issues - closed',
        items: mockGroups['Issues - closed']
      });
    });

    it('should filter to selected items when provided', () => {
      const selectedItems = new Set([1, 3]);
      const result = formatGroupedDataForClipboard(mockGroups, selectedItems);
      
      expect(result).toHaveLength(2);
      expect(result[0].items).toHaveLength(1);
      expect(result[0].items[0].id).toBe(1);
      expect(result[1].items).toHaveLength(1);
      expect(result[1].items[0].id).toBe(3);
    });

    it('should return empty array when no selected items match', () => {
      const selectedItems = new Set([999]);
      const result = formatGroupedDataForClipboard(mockGroups, selectedItems);
      
      expect(result).toHaveLength(0);
    });

    it('should handle empty groups object', () => {
      const result = formatGroupedDataForClipboard({});
      expect(result).toHaveLength(0);
    });
  });

  describe('getAllDisplayedItems', () => {
    it('should return all items from all groups', () => {
      const mockGroups = {
        'Group 1': [createMockItem({ id: 1 }), createMockItem({ id: 2 })],
        'Group 2': [createMockItem({ id: 3 })],
        'Empty Group': [],
      };

      const result = getAllDisplayedItems(mockGroups);
      
      expect(result).toHaveLength(3);
      expect(result.map(item => item.id)).toEqual([1, 2, 3]);
    });

    it('should return empty array for empty groups', () => {
      const result = getAllDisplayedItems({});
      expect(result).toHaveLength(0);
    });
  });

  describe('hasAnyItems', () => {
    it('should return true when groups have items', () => {
      const mockGroups = {
        'Group 1': [createMockItem()],
        'Group 2': [],
      };

      expect(hasAnyItems(mockGroups)).toBe(true);
    });

    it('should return false when no groups have items', () => {
      const mockGroups = {
        'Group 1': [],
        'Group 2': [],
      };

      expect(hasAnyItems(mockGroups)).toBe(false);
    });

    it('should return false for empty groups object', () => {
      expect(hasAnyItems({})).toBe(false);
    });
  });

  describe('getTotalItemCount', () => {
    it('should return total count across all groups', () => {
      const mockGroups = {
        'Group 1': [createMockItem(), createMockItem()],
        'Group 2': [createMockItem()],
        'Group 3': [],
      };

      expect(getTotalItemCount(mockGroups)).toBe(3);
    });

    it('should return 0 for empty groups', () => {
      expect(getTotalItemCount({})).toBe(0);
    });
  });

  describe('isSectionCollapsed', () => {
    it('should return true if section is in collapsed set', () => {
      const collapsedSections = new Set(['Section 1', 'Section 2']);
      expect(isSectionCollapsed('Section 1', collapsedSections)).toBe(true);
    });

    it('should return false if section is not in collapsed set', () => {
      const collapsedSections = new Set(['Section 1']);
      expect(isSectionCollapsed('Section 2', collapsedSections)).toBe(false);
    });

         it('should return false for empty collapsed set', () => {
       const collapsedSections = new Set<string>();
       expect(isSectionCollapsed('Section 1', collapsedSections)).toBe(false);
     });
  });

  describe('getGroupSelectState', () => {
    const mockItems = [
      createMockItem({ id: 1 }),
      createMockItem({ id: 2 }),
      createMockItem({ id: 3 }),
    ];

    it('should return unchecked state for empty group', () => {
      const result = getGroupSelectState([], new Set());
      expect(result).toEqual({ checked: false, indeterminate: false });
    });

    it('should return unchecked state when no items selected', () => {
      const result = getGroupSelectState(mockItems, new Set());
      expect(result).toEqual({ checked: false, indeterminate: false });
    });

    it('should return checked state when all items selected', () => {
      const selectedItems = new Set([1, 2, 3]);
      const result = getGroupSelectState(mockItems, selectedItems);
      expect(result).toEqual({ checked: true, indeterminate: false });
    });

    it('should return indeterminate state when some items selected', () => {
      const selectedItems = new Set([1, 2]);
      const result = getGroupSelectState(mockItems, selectedItems);
      expect(result).toEqual({ checked: false, indeterminate: true });
    });

    it('should handle items with event_id instead of id', () => {
      const itemsWithEventId = [
        createMockItem({ event_id: 'event-1' }),
        createMockItem({ event_id: 'event-2' }),
      ];
      const selectedItems = new Set(['event-1']);
      
      const result = getGroupSelectState(itemsWithEventId, selectedItems);
      expect(result).toEqual({ checked: false, indeterminate: true });
    });
  });
}); 