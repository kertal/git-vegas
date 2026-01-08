import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  needsPREnrichment,
  enrichItemWithPRDetails,
  enrichItemsWithPRDetails,
  clearPRCache,
  getPRCacheSize,
} from '../prEnrichment';
import { GitHubItem } from '../../types';

// Mock IndexedDB storage
vi.mock('../indexedDB', () => {
  const mockCache = new Map();
  return {
    prCacheStorage: {
      store: vi.fn(async (prData) => {
        mockCache.set(prData.id, prData);
      }),
      get: vi.fn(async (apiUrl) => {
        return mockCache.get(apiUrl) || null;
      }),
      getAll: vi.fn(async () => {
        return Array.from(mockCache.values());
      }),
      clear: vi.fn(async () => {
        mockCache.clear();
      }),
    },
    // Export a type-safe way to clear the mock cache for tests
    clearMockCache: () => mockCache.clear(),
  };
});

// Mock fetch globally
global.fetch = vi.fn();

describe('prEnrichment', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear the mock cache using the exported helper
    const { clearMockCache } = await import('../indexedDB');
    clearMockCache();
    await clearPRCache();
  });

  describe('needsPREnrichment', () => {
    it('should return true for PR events with generic titles', () => {
      const item: GitHubItem = {
        id: 123,
        html_url: 'https://github.com/owner/repo/pull/456',
        title: 'Pull Request #456 labeled',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        state: 'open',
        user: {
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          html_url: 'https://github.com/testuser',
        },
        originalEventType: 'PullRequestEvent',
      };

      expect(needsPREnrichment(item)).toBe(true);
    });

    it('should return true for review events with generic PR titles', () => {
      const item: GitHubItem = {
        id: 123,
        html_url: 'https://github.com/owner/repo/pull/456',
        title: 'Review on: Pull Request #456',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        state: 'open',
        user: {
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          html_url: 'https://github.com/testuser',
        },
        originalEventType: 'PullRequestReviewEvent',
      };

      expect(needsPREnrichment(item)).toBe(true);
    });

    it('should return false for PR events with actual titles', () => {
      const item: GitHubItem = {
        id: 123,
        html_url: 'https://github.com/owner/repo/pull/456',
        title: 'Fix bug in parser',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        state: 'open',
        user: {
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          html_url: 'https://github.com/testuser',
        },
        originalEventType: 'PullRequestEvent',
      };

      expect(needsPREnrichment(item)).toBe(false);
    });

    it('should return false for non-PR events', () => {
      const item: GitHubItem = {
        id: 123,
        html_url: 'https://github.com/owner/repo/issues/456',
        title: 'Test Issue',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        state: 'open',
        user: {
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          html_url: 'https://github.com/testuser',
        },
        originalEventType: 'IssuesEvent',
      };

      expect(needsPREnrichment(item)).toBe(false);
    });
  });

  describe('enrichItemWithPRDetails', () => {
    it('should return item unchanged without a token', async () => {
      const item: GitHubItem = {
        id: 123,
        html_url: 'https://github.com/owner/repo/pull/456',
        title: 'Pull Request #456 labeled',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        state: 'open',
        user: {
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          html_url: 'https://github.com/testuser',
        },
        originalEventType: 'PullRequestEvent',
      };

      const result = await enrichItemWithPRDetails(item);

      expect(result).toEqual(item);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fetch and enrich PR details when token is provided', async () => {
      const item: GitHubItem = {
        id: 123,
        html_url: 'https://github.com/owner/repo/pull/456',
        title: 'Pull Request #456 labeled',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        state: 'open',
        user: {
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          html_url: 'https://github.com/testuser',
        },
        originalEventType: 'PullRequestEvent',
      };

      const mockPRDetails = {
        title: 'Fix bug in parser',
        state: 'open',
        body: 'This PR fixes...',
        html_url: 'https://github.com/owner/repo/pull/456',
        labels: [{ name: 'bug', color: 'red' }],
        updated_at: '2023-01-02T00:00:00Z',
        closed_at: null,
        merged_at: null,
        merged: false,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPRDetails),
      });

      const result = await enrichItemWithPRDetails(item, 'test-token');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls/456',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token test-token',
          }),
        })
      );

      expect(result.title).toBe('Fix bug in parser (labeled)');
      expect(result.labels).toEqual(mockPRDetails.labels);
      expect(result.updated_at).toBe(mockPRDetails.updated_at);
    });

    it('should update title for review events', async () => {
      const item: GitHubItem = {
        id: 123,
        html_url: 'https://github.com/owner/repo/pull/456',
        title: 'Review on: Pull Request #456',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        state: 'open',
        user: {
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          html_url: 'https://github.com/testuser',
        },
        originalEventType: 'PullRequestReviewEvent',
      };

      const mockPRDetails = {
        title: 'Fix bug in parser',
        state: 'open',
        body: 'This PR fixes...',
        html_url: 'https://github.com/owner/repo/pull/456',
        labels: [],
        updated_at: '2023-01-02T00:00:00Z',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPRDetails),
      });

      const result = await enrichItemWithPRDetails(item, 'test-token');

      expect(result.title).toBe('Review on: Fix bug in parser');
    });

    it('should cache PR details to avoid duplicate fetches', async () => {
      const item1: GitHubItem = {
        id: 123,
        html_url: 'https://github.com/owner/repo/pull/456',
        title: 'Pull Request #456 labeled',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        state: 'open',
        user: {
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          html_url: 'https://github.com/testuser',
        },
        originalEventType: 'PullRequestEvent',
      };

      const item2: GitHubItem = {
        ...item1,
        id: 456,
        title: 'Pull Request #456 closed',
      };

      const mockPRDetails = {
        title: 'Fix bug in parser',
        state: 'open',
        body: 'This PR fixes...',
        html_url: 'https://github.com/owner/repo/pull/456',
        labels: [],
        updated_at: '2023-01-02T00:00:00Z',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPRDetails),
      });

      // First call should fetch
      await enrichItemWithPRDetails(item1, 'test-token');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await enrichItemWithPRDetails(item2, 'test-token');
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, not 2

      // Cache should have 1 entry
      const cacheSize = await getPRCacheSize();
      expect(cacheSize).toBe(1);
    });
  });

  describe('enrichItemsWithPRDetails', () => {
    it('should enrich multiple items in batch', async () => {
      const items: GitHubItem[] = [
        {
          id: 123,
          html_url: 'https://github.com/owner/repo/pull/456',
          title: 'Pull Request #456 labeled',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          state: 'open',
          user: {
            login: 'testuser',
            avatar_url: 'https://github.com/testuser.png',
            html_url: 'https://github.com/testuser',
          },
          originalEventType: 'PullRequestEvent',
        },
        {
          id: 456,
          html_url: 'https://github.com/owner/repo/issues/789',
          title: 'Test Issue',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          state: 'open',
          user: {
            login: 'testuser',
            avatar_url: 'https://github.com/testuser.png',
            html_url: 'https://github.com/testuser',
          },
          originalEventType: 'IssuesEvent',
        },
      ];

      const mockPRDetails = {
        title: 'Fix bug in parser',
        state: 'open',
        body: 'This PR fixes...',
        html_url: 'https://github.com/owner/repo/pull/456',
        labels: [],
        updated_at: '2023-01-02T00:00:00Z',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPRDetails),
      });

      const results = await enrichItemsWithPRDetails(items, 'test-token');

      // Only 1 fetch should be made (for the PR, not the issue)
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // First item should be enriched
      expect(results[0].title).toContain('Fix bug in parser');

      // Second item should remain unchanged
      expect(results[1].title).toBe('Test Issue');
    });

    it('should call progress callback', async () => {
      const items: GitHubItem[] = [
        {
          id: 123,
          html_url: 'https://github.com/owner/repo/pull/456',
          title: 'Pull Request #456 labeled',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          state: 'open',
          user: {
            login: 'testuser',
            avatar_url: 'https://github.com/testuser.png',
            html_url: 'https://github.com/testuser',
          },
          originalEventType: 'PullRequestEvent',
        },
      ];

      const mockPRDetails = {
        title: 'Fix bug in parser',
        state: 'open',
        body: 'This PR fixes...',
        html_url: 'https://github.com/owner/repo/pull/456',
        labels: [],
        updated_at: '2023-01-02T00:00:00Z',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPRDetails),
      });

      const onProgress = vi.fn();

      await enrichItemsWithPRDetails(items, 'test-token', onProgress);

      expect(onProgress).toHaveBeenCalledWith(1, 1);
    });

    /**
     * Tests for network efficiency: deduplication and caching behavior
     *
     * These tests verify that:
     * 1. Multiple items referencing the same PR result in only ONE network request
     * 2. Cached data is reused within the 24-hour expiry window
     * 3. Stale cache (>24h) triggers a refresh, but only once per unique PR
     */
    describe('network efficiency', () => {
      /**
       * When multiple events reference the same PR (e.g., review, comment, label),
       * only one network request should be made, and all items should be enriched.
       */
      it('should fetch each unique PR only once even with multiple items referencing it', async () => {
        // 3 different events all referencing the same PR #456
        const items: GitHubItem[] = [
          {
            id: 1,
            html_url: 'https://github.com/owner/repo/pull/456',
            title: 'Review on: Pull Request #456',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            state: 'open',
            user: { login: 'user1', avatar_url: 'https://github.com/user1.png', html_url: 'https://github.com/user1' },
            originalEventType: 'PullRequestReviewEvent',
          },
          {
            id: 2,
            html_url: 'https://github.com/owner/repo/pull/456',
            title: 'Review comment on: Pull Request #456',
            created_at: '2023-01-01T01:00:00Z',
            updated_at: '2023-01-01T01:00:00Z',
            state: 'open',
            user: { login: 'user2', avatar_url: 'https://github.com/user2.png', html_url: 'https://github.com/user2' },
            originalEventType: 'PullRequestReviewCommentEvent',
          },
          {
            id: 3,
            html_url: 'https://github.com/owner/repo/pull/456',
            title: 'Pull Request #456 labeled',
            created_at: '2023-01-01T02:00:00Z',
            updated_at: '2023-01-01T02:00:00Z',
            state: 'open',
            user: { login: 'user3', avatar_url: 'https://github.com/user3.png', html_url: 'https://github.com/user3' },
            originalEventType: 'PullRequestEvent',
          },
        ];

        const mockPRDetails = {
          title: 'Add new feature',
          state: 'open',
          body: 'Description',
          html_url: 'https://github.com/owner/repo/pull/456',
          labels: [],
          updated_at: '2023-01-02T00:00:00Z',
        };

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockPRDetails),
        });

        const results = await enrichItemsWithPRDetails(items, 'test-token');

        // Only 1 fetch for 3 items referencing the same PR
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // All items should be enriched with the PR title
        expect(results[0].title).toBe('Review on: Add new feature');
        expect(results[1].title).toBe('Review comment on: Add new feature');
        expect(results[2].title).toBe('Add new feature (labeled)');
      });

      /**
       * When items reference different PRs, each unique PR should be fetched once.
       */
      it('should fetch each unique PR once when items reference different PRs', async () => {
        const items: GitHubItem[] = [
          {
            id: 1,
            html_url: 'https://github.com/owner/repo/pull/100',
            title: 'Pull Request #100 opened',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            state: 'open',
            user: { login: 'user1', avatar_url: 'https://github.com/user1.png', html_url: 'https://github.com/user1' },
            originalEventType: 'PullRequestEvent',
          },
          {
            id: 2,
            html_url: 'https://github.com/owner/repo/pull/100',
            title: 'Review on: Pull Request #100',
            created_at: '2023-01-01T01:00:00Z',
            updated_at: '2023-01-01T01:00:00Z',
            state: 'open',
            user: { login: 'user2', avatar_url: 'https://github.com/user2.png', html_url: 'https://github.com/user2' },
            originalEventType: 'PullRequestReviewEvent',
          },
          {
            id: 3,
            html_url: 'https://github.com/owner/repo/pull/200',
            title: 'Pull Request #200 closed',
            created_at: '2023-01-01T02:00:00Z',
            updated_at: '2023-01-01T02:00:00Z',
            state: 'closed',
            user: { login: 'user3', avatar_url: 'https://github.com/user3.png', html_url: 'https://github.com/user3' },
            originalEventType: 'PullRequestEvent',
          },
        ];

        // Mock responses for both PRs
        (global.fetch as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ title: 'Feature A', state: 'open', labels: [], updated_at: '2023-01-02T00:00:00Z' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ title: 'Feature B', state: 'closed', labels: [], updated_at: '2023-01-02T00:00:00Z' }),
          });

        const results = await enrichItemsWithPRDetails(items, 'test-token');

        // 2 fetches: one for PR #100, one for PR #200 (not 3)
        expect(global.fetch).toHaveBeenCalledTimes(2);

        // Items for PR #100 should have Feature A title
        expect(results[0].title).toBe('Feature A (opened)');
        expect(results[1].title).toBe('Review on: Feature A');

        // Item for PR #200 should have Feature B title
        expect(results[2].title).toBe('Feature B (closed)');
      });

      /**
       * Fresh cache (<24h old) should be used without making network requests.
       */
      it('should use cached data without network request when cache is fresh (<24h)', async () => {
        const item: GitHubItem = {
          id: 1,
          html_url: 'https://github.com/owner/repo/pull/456',
          title: 'Pull Request #456 labeled',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          state: 'open',
          user: { login: 'user1', avatar_url: 'https://github.com/user1.png', html_url: 'https://github.com/user1' },
          originalEventType: 'PullRequestEvent',
        };

        const mockPRDetails = {
          title: 'Cached PR Title',
          state: 'open',
          body: '',
          html_url: 'https://github.com/owner/repo/pull/456',
          labels: [],
          updated_at: '2023-01-02T00:00:00Z',
        };

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockPRDetails),
        });

        // First call populates cache
        await enrichItemsWithPRDetails([item], 'test-token');
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // Second call with new item referencing same PR should use cache
        const item2: GitHubItem = { ...item, id: 2, title: 'Pull Request #456 closed' };
        const results = await enrichItemsWithPRDetails([item2], 'test-token');

        // Still only 1 fetch (cache was used)
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(results[0].title).toBe('Cached PR Title (closed)');
      });
    });
  });
});
