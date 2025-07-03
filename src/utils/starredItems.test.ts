import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StarredItemsManager } from './starredItems';
import { GitHubItem } from '../types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

// Mock window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock GitHub items for testing
const mockIssue: GitHubItem = {
  id: 1,
  html_url: 'https://github.com/owner/repo/issues/1',
  title: 'Test Issue',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  state: 'open',
  body: 'Test issue body',
  user: {
    login: 'testuser',
    avatar_url: 'https://github.com/testuser.png',
    html_url: 'https://github.com/testuser',
  },
  repository_url: 'https://api.github.com/repos/owner/repo',
  repository: {
    full_name: 'owner/repo',
    html_url: 'https://github.com/owner/repo',
  },
  number: 1,
};

const mockPullRequest: GitHubItem = {
  id: 2,
  html_url: 'https://github.com/owner/repo/pull/2',
  title: 'Test Pull Request',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  state: 'open',
  body: 'Test PR body',
  user: {
    login: 'testuser',
    avatar_url: 'https://github.com/testuser.png',
    html_url: 'https://github.com/testuser',
  },
  repository_url: 'https://api.github.com/repos/owner/repo',
  repository: {
    full_name: 'owner/repo',
    html_url: 'https://github.com/owner/repo',
  },
  number: 2,
  pull_request: {
    merged_at: undefined,
    url: 'https://github.com/owner/repo/pull/2',
  },
};

const mockComment: GitHubItem = {
  id: 3,
  html_url: 'https://github.com/owner/repo/issues/1#issuecomment-123',
  title: 'Comment on: Test Issue',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  state: 'open',
  body: 'Test comment body',
  user: {
    login: 'testuser',
    avatar_url: 'https://github.com/testuser.png',
    html_url: 'https://github.com/testuser',
  },
  repository_url: 'https://api.github.com/repos/owner/repo',
  repository: {
    full_name: 'owner/repo',
    html_url: 'https://github.com/owner/repo',
  },
  number: 1,
};

describe('StarredItemsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('load', () => {
    it('should return default storage when localStorage is empty', () => {
      const result = StarredItemsManager.load();
      
      expect(result).toEqual({
        starredItems: [],
        lastUpdated: expect.any(String),
      });
    });

    it('should load existing storage from localStorage', () => {
      const mockStorage = {
        starredItems: [
          {
            id: 'issue-1',
            type: 'issue' as const,
            item: mockIssue,
            starredAt: '2024-01-01T10:00:00Z',
          },
        ],
        lastUpdated: '2024-01-01T10:00:00Z',
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStorage));
      
      const result = StarredItemsManager.load();
      
      expect(result).toEqual(mockStorage);
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = StarredItemsManager.load();
      
      expect(result).toEqual({
        starredItems: [],
        lastUpdated: expect.any(String),
      });
    });
  });

  describe('save', () => {
    it('should save storage to localStorage', () => {
      const storage = {
        starredItems: [],
        lastUpdated: '2024-01-01T10:00:00Z',
      };
      
      StarredItemsManager.save(storage);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gitvegas_starred_items',
        expect.any(String)
      );
    });

    it('should update lastUpdated timestamp', () => {
      const storage = {
        starredItems: [],
        lastUpdated: '2024-01-01T10:00:00Z',
      };
      
      StarredItemsManager.save(storage);
      
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.lastUpdated).toBeDefined();
      expect(new Date(savedData.lastUpdated).getTime()).toBeGreaterThan(
        new Date('2024-01-01T10:00:00Z').getTime()
      );
    });
  });

  describe('addItem', () => {
    it('should add a new issue to starred items', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        starredItems: [],
        lastUpdated: '2024-01-01T10:00:00Z',
      }));
      
      StarredItemsManager.addItem(mockIssue);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gitvegas_starred_items',
        expect.stringContaining('issue-1')
      );
    });

    it('should add a new pull request to starred items', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        starredItems: [],
        lastUpdated: '2024-01-01T10:00:00Z',
      }));
      
      StarredItemsManager.addItem(mockPullRequest);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gitvegas_starred_items',
        expect.stringContaining('pr-2')
      );
    });

    it('should add a new comment to starred items', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        starredItems: [],
        lastUpdated: '2024-01-01T10:00:00Z',
      }));
      
      StarredItemsManager.addItem(mockComment);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gitvegas_starred_items',
        expect.stringContaining('comment-3')
      );
    });

    it('should update existing item if already starred', () => {
      const existingStorage = {
        starredItems: [
          {
            id: 'issue-1',
            type: 'issue' as const,
            item: { ...mockIssue, title: 'Old Title' },
            starredAt: '2024-01-01T10:00:00Z',
          },
        ],
        lastUpdated: '2024-01-01T10:00:00Z',
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingStorage));
      
      StarredItemsManager.addItem(mockIssue, 'Updated note');
      
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.starredItems).toHaveLength(1);
      expect(savedData.starredItems[0].item.title).toBe('Test Issue');
      expect(savedData.starredItems[0].note).toBe('Updated note');
    });

    it('should add note when provided', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        starredItems: [],
        lastUpdated: '2024-01-01T10:00:00Z',
      }));
      
      StarredItemsManager.addItem(mockIssue, 'Important issue');
      
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.starredItems[0].note).toBe('Important issue');
    });
  });

  describe('removeItem', () => {
    it('should remove an item from starred items', () => {
      const existingStorage = {
        starredItems: [
          {
            id: 'issue-1',
            type: 'issue' as const,
            item: mockIssue,
            starredAt: '2024-01-01T10:00:00Z',
          },
          {
            id: 'pr-2',
            type: 'pr' as const,
            item: mockPullRequest,
            starredAt: '2024-01-01T10:00:00Z',
          },
        ],
        lastUpdated: '2024-01-01T10:00:00Z',
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingStorage));
      
      StarredItemsManager.removeItem(mockIssue);
      
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.starredItems).toHaveLength(1);
      expect(savedData.starredItems[0].id).toBe('pr-2');
    });
  });

  describe('isStarred', () => {
    it('should return true for starred items', () => {
      const existingStorage = {
        starredItems: [
          {
            id: 'issue-1',
            type: 'issue' as const,
            item: mockIssue,
            starredAt: '2024-01-01T10:00:00Z',
          },
        ],
        lastUpdated: '2024-01-01T10:00:00Z',
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingStorage));
      
      expect(StarredItemsManager.isStarred(mockIssue)).toBe(true);
    });

    it('should return false for non-starred items', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        starredItems: [],
        lastUpdated: '2024-01-01T10:00:00Z',
      }));
      
      expect(StarredItemsManager.isStarred(mockIssue)).toBe(false);
    });
  });

  describe('getAllStarredItems', () => {
    it('should return all starred items sorted by starredAt', () => {
      const existingStorage = {
        starredItems: [
          {
            id: 'issue-1',
            type: 'issue' as const,
            item: mockIssue,
            starredAt: '2024-01-01T10:00:00Z',
          },
          {
            id: 'pr-2',
            type: 'pr' as const,
            item: mockPullRequest,
            starredAt: '2024-01-02T10:00:00Z',
          },
        ],
        lastUpdated: '2024-01-01T10:00:00Z',
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingStorage));
      
      const result = StarredItemsManager.getAllStarredItems();
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pr-2'); // More recent
      expect(result[1].id).toBe('issue-1'); // Older
    });
  });

  describe('getStarredItemsByType', () => {
    it('should return only items of specified type', () => {
      const existingStorage = {
        starredItems: [
          {
            id: 'issue-1',
            type: 'issue' as const,
            item: mockIssue,
            starredAt: '2024-01-01T10:00:00Z',
          },
          {
            id: 'pr-2',
            type: 'pr' as const,
            item: mockPullRequest,
            starredAt: '2024-01-02T10:00:00Z',
          },
          {
            id: 'comment-3',
            type: 'comment' as const,
            item: mockComment,
            starredAt: '2024-01-03T10:00:00Z',
          },
        ],
        lastUpdated: '2024-01-01T10:00:00Z',
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingStorage));
      
      const issues = StarredItemsManager.getStarredItemsByType('issue');
      const prs = StarredItemsManager.getStarredItemsByType('pr');
      const comments = StarredItemsManager.getStarredItemsByType('comment');
      
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('issue');
      
      expect(prs).toHaveLength(1);
      expect(prs[0].type).toBe('pr');
      
      expect(comments).toHaveLength(1);
      expect(comments[0].type).toBe('comment');
    });
  });

  describe('updateNote', () => {
    it('should update note for existing starred item', () => {
      const existingStorage = {
        starredItems: [
          {
            id: 'issue-1',
            type: 'issue' as const,
            item: mockIssue,
            starredAt: '2024-01-01T10:00:00Z',
            note: 'Old note',
          },
        ],
        lastUpdated: '2024-01-01T10:00:00Z',
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingStorage));
      
      StarredItemsManager.updateNote(mockIssue, 'New note');
      
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.starredItems[0].note).toBe('New note');
    });

    it('should not update non-existent item', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        starredItems: [],
        lastUpdated: '2024-01-01T10:00:00Z',
      }));
      
      StarredItemsManager.updateNote(mockIssue, 'New note');
      
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should remove starred items from localStorage', () => {
      StarredItemsManager.clearAll();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('gitvegas_starred_items');
    });
  });

  describe('getCounts', () => {
    it('should return correct counts for all types', () => {
      const existingStorage = {
        starredItems: [
          {
            id: 'issue-1',
            type: 'issue' as const,
            item: mockIssue,
            starredAt: '2024-01-01T10:00:00Z',
          },
          {
            id: 'issue-2',
            type: 'issue' as const,
            item: { ...mockIssue, id: 2 },
            starredAt: '2024-01-02T10:00:00Z',
          },
          {
            id: 'pr-3',
            type: 'pr' as const,
            item: mockPullRequest,
            starredAt: '2024-01-03T10:00:00Z',
          },
          {
            id: 'comment-4',
            type: 'comment' as const,
            item: mockComment,
            starredAt: '2024-01-04T10:00:00Z',
          },
        ],
        lastUpdated: '2024-01-01T10:00:00Z',
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingStorage));
      
      const counts = StarredItemsManager.getCounts();
      
      expect(counts).toEqual({
        total: 4,
        issues: 2,
        prs: 1,
        comments: 1,
      });
    });

    it('should return zero counts for empty storage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        starredItems: [],
        lastUpdated: '2024-01-01T10:00:00Z',
      }));
      
      const counts = StarredItemsManager.getCounts();
      
      expect(counts).toEqual({
        total: 0,
        issues: 0,
        prs: 0,
        comments: 0,
      });
    });
  });
}); 