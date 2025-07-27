import {
  filterItemsByAdvancedSearch,
  sortItemsByUpdatedDate,
  parseCommaSeparatedUsernames,
  isItemAuthoredBySearchedUsers
} from '../viewFiltering';
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
  body: 'Test body content',
  labels: [],
  ...overrides,
});

describe('viewFiltering utilities', () => {
  describe('filterItemsByAdvancedSearch', () => {
    const mockItems = [
      createMockItem({ 
        id: 1, 
        title: 'Bug fix for login',
        user: { login: 'alice', avatar_url: '', html_url: '' },
        labels: [{ name: 'bug', color: 'red' }, { name: 'frontend', color: 'blue' }]
      }),
      createMockItem({ 
        id: 2, 
        title: 'Feature request',
        user: { login: 'bob', avatar_url: '', html_url: '' },
        labels: [{ name: 'enhancement', color: 'green' }]
      }),
      createMockItem({ 
        id: 3, 
        title: 'Documentation update',
        user: { login: 'charlie', avatar_url: '', html_url: '' },
        labels: [{ name: 'documentation', color: 'yellow' }]
      }),
    ];

    it('should return all items when search text is empty', () => {
      const result = filterItemsByAdvancedSearch(mockItems, '');
      expect(result).toEqual(mockItems);
    });

    it('should filter by text in title', () => {
      const result = filterItemsByAdvancedSearch(mockItems, 'bug');
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('Bug');
    });

    it('should filter by username', () => {
      const result = filterItemsByAdvancedSearch(mockItems, 'user:alice');
      expect(result).toHaveLength(1);
      expect(result[0].user.login).toBe('alice');
    });

    it('should filter by included labels', () => {
      const result = filterItemsByAdvancedSearch(mockItems, 'label:bug');
      expect(result).toHaveLength(1);
      expect(result[0].labels?.some(l => l.name === 'bug')).toBe(true);
    });

    it('should filter by excluded labels', () => {
      const result = filterItemsByAdvancedSearch(mockItems, '-label:bug');
      expect(result).toHaveLength(2);
      expect(result.every(item => !item.labels?.some(l => l.name === 'bug'))).toBe(true);
    });

    it('should handle complex search queries', () => {
      const result = filterItemsByAdvancedSearch(mockItems, 'user:alice label:bug fix');
      expect(result).toHaveLength(1);
      expect(result[0].user.login).toBe('alice');
      expect(result[0].title).toContain('fix');
    });
  });

  describe('sortItemsByUpdatedDate', () => {
    it('should sort items by updated date (newest first)', () => {
      const items = [
        createMockItem({ id: 1, updated_at: '2023-01-01T00:00:00Z' }),
        createMockItem({ id: 2, updated_at: '2023-01-03T00:00:00Z' }),
        createMockItem({ id: 3, updated_at: '2023-01-02T00:00:00Z' }),
      ];

      const result = sortItemsByUpdatedDate(items);
      
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(2); // Most recent
      expect(result[1].id).toBe(3); // Middle
      expect(result[2].id).toBe(1); // Oldest
    });

    it('should not mutate the original array', () => {
      const items = [
        createMockItem({ id: 1, updated_at: '2023-01-01T00:00:00Z' }),
        createMockItem({ id: 2, updated_at: '2023-01-02T00:00:00Z' }),
      ];
      const originalOrder = items.map(item => item.id);

      sortItemsByUpdatedDate(items);
      
      expect(items.map(item => item.id)).toEqual(originalOrder);
    });
  });

  describe('parseCommaSeparatedUsernames', () => {
    it('should parse single username', () => {
      const result = parseCommaSeparatedUsernames('alice');
      expect(result).toEqual(['alice']);
    });

    it('should parse multiple usernames', () => {
      const result = parseCommaSeparatedUsernames('alice,bob,charlie');
      expect(result).toEqual(['alice', 'bob', 'charlie']);
    });

    it('should trim whitespace and convert to lowercase', () => {
      const result = parseCommaSeparatedUsernames(' Alice , Bob , Charlie ');
      expect(result).toEqual(['alice', 'bob', 'charlie']);
    });

    it('should handle empty strings', () => {
      const result = parseCommaSeparatedUsernames('');
      expect(result).toEqual(['']);
    });
  });

  describe('isItemAuthoredBySearchedUsers', () => {
    const item = createMockItem({ user: { login: 'Alice', avatar_url: '', html_url: '' } });

    it('should return true when user is in searched usernames', () => {
      const searchedUsers = ['alice', 'bob'];
      const result = isItemAuthoredBySearchedUsers(item, searchedUsers);
      expect(result).toBe(true);
    });

    it('should return false when user is not in searched usernames', () => {
      const searchedUsers = ['bob', 'charlie'];
      const result = isItemAuthoredBySearchedUsers(item, searchedUsers);
      expect(result).toBe(false);
    });

    it('should be case insensitive', () => {
      const searchedUsers = ['ALICE'];
      const result = isItemAuthoredBySearchedUsers(item, searchedUsers);
      expect(result).toBe(true);
    });
  });
}); 