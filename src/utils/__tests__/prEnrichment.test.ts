import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  needsPREnrichment,
  enrichItemWithPRDetails,
  enrichItemsWithPRDetails,
  clearPRCache,
  getPRCacheSize,
} from '../githubData';
import { GitHubItem } from '../../types';

// Mock fetch globally
global.fetch = vi.fn();

describe('prEnrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPRCache();
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
      expect(getPRCacheSize()).toBe(1);
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
  });
});

