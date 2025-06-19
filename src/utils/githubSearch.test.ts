import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateSearchParams,
  validateAndCacheUsernames,
  fetchUserItems,
  isCacheValid,
  performGitHubSearch,
  createSearchCacheParams,
  GitHubSearchParams,
  CacheCallbacks,
} from './githubSearch';
import { GitHubItem } from '../types';
import type { UsernameCache } from '../types';

// Mock the dependencies
vi.mock('../utils', () => ({
  validateGitHubUsernames: vi.fn(),
  isValidDateString: vi.fn(),
  validateUsernameList: vi.fn(),
  updateUrlParams: vi.fn(),
}));

vi.mock('./usernameCache', () => ({
  categorizeUsernames: vi.fn(),
  getInvalidUsernames: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import mocked functions for type safety
import {
  validateGitHubUsernames,
  isValidDateString,
  validateUsernameList,
  updateUrlParams,
} from '../utils';
import { categorizeUsernames, getInvalidUsernames } from './usernameCache';

describe('githubSearch utilities', () => {
  const mockCache: UsernameCache = {
    validatedUsernames: new Set(['validuser']),
    invalidUsernames: new Set(['invaliduser']),
  };

  const mockCacheCallbacks: CacheCallbacks = {
    addToValidated: vi.fn(),
    addToInvalid: vi.fn(),
    removeFromValidated: vi.fn(),
  };

  const mockSearchParams: GitHubSearchParams = {
    username: 'testuser',
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    githubToken: 'fake-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(isValidDateString).mockReturnValue(true);
    vi.mocked(validateUsernameList).mockReturnValue({
      usernames: ['testuser'],
      errors: [],
    });
    vi.mocked(getInvalidUsernames).mockReturnValue([]);
    vi.mocked(categorizeUsernames).mockReturnValue({
      needValidation: [],
      alreadyValid: ['testuser'],
      alreadyInvalid: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateSearchParams', () => {
    it('should validate correct parameters', () => {
      const result = validateSearchParams(mockSearchParams);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject empty username', () => {
      const params = { ...mockSearchParams, username: '' };
      const result = validateSearchParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Please enter a GitHub username');
    });

    it('should reject missing dates', () => {
      const params = { ...mockSearchParams, startDate: '', endDate: '' };
      const result = validateSearchParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Please select both start and end dates');
    });

    it('should reject invalid date format', () => {
      vi.mocked(isValidDateString).mockReturnValue(false);

      const result = validateSearchParams(mockSearchParams);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Invalid start date format. Please use YYYY-MM-DD'
      );
      expect(result.errors).toContain(
        'Invalid end date format. Please use YYYY-MM-DD'
      );
    });

    it('should reject start date after end date', () => {
      const params = {
        ...mockSearchParams,
        startDate: '2023-12-31',
        endDate: '2023-01-01',
      };

      const result = validateSearchParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Start date must be before end date');
    });

    it('should handle multiple validation errors', () => {
      vi.mocked(isValidDateString).mockReturnValue(false);

      const params = {
        username: '',
        startDate: 'invalid',
        endDate: 'invalid',
        githubToken: 'token',
      };

      const result = validateSearchParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('validateAndCacheUsernames', () => {
    it('should return valid for already cached usernames', async () => {
      vi.mocked(getInvalidUsernames).mockReturnValue([]);
      vi.mocked(categorizeUsernames).mockReturnValue({
        needValidation: [],
        alreadyValid: ['testuser'],
        alreadyInvalid: [],
      });

      const result = await validateAndCacheUsernames(
        ['testuser'],
        mockCache,
        'token',
        mockCacheCallbacks
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject already invalid usernames', async () => {
      vi.mocked(getInvalidUsernames).mockReturnValue(['invaliduser']);

      const result = await validateAndCacheUsernames(
        ['invaliduser'],
        mockCache,
        'token',
        mockCacheCallbacks
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid GitHub username: invaliduser');
    });

    it('should handle multiple invalid usernames', async () => {
      vi.mocked(getInvalidUsernames).mockReturnValue(['invalid1', 'invalid2']);

      const result = await validateAndCacheUsernames(
        ['invalid1', 'invalid2'],
        mockCache,
        'token',
        mockCacheCallbacks
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain(
        'Invalid GitHub usernames: invalid1, invalid2'
      );
    });

    it('should validate new usernames successfully', async () => {
      vi.mocked(categorizeUsernames).mockReturnValue({
        needValidation: ['newuser'],
        alreadyValid: [],
        alreadyInvalid: [],
      });

      vi.mocked(validateGitHubUsernames).mockResolvedValue({
        valid: ['newuser'],
        invalid: [],
        errors: {},
      });

      const result = await validateAndCacheUsernames(
        ['newuser'],
        mockCache,
        'token',
        mockCacheCallbacks
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(mockCacheCallbacks.addToValidated).toHaveBeenCalledWith([
        'newuser',
      ]);
    });

    it('should handle validation failures', async () => {
      vi.mocked(categorizeUsernames).mockReturnValue({
        needValidation: ['baduser'],
        alreadyValid: [],
        alreadyInvalid: [],
      });

      vi.mocked(validateGitHubUsernames).mockResolvedValue({
        valid: [],
        invalid: ['baduser'],
        errors: { baduser: 'User not found' },
      });

      const result = await validateAndCacheUsernames(
        ['baduser'],
        mockCache,
        'token',
        mockCacheCallbacks
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Validation failed');
      expect(result.errors[0]).toContain('baduser: User not found');
      expect(mockCacheCallbacks.addToInvalid).toHaveBeenCalledWith(['baduser']);
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(categorizeUsernames).mockReturnValue({
        needValidation: ['testuser'],
        alreadyValid: [],
        alreadyInvalid: [],
      });

      vi.mocked(validateGitHubUsernames).mockRejectedValue(
        new Error('API Error')
      );

      const result = await validateAndCacheUsernames(
        ['testuser'],
        mockCache,
        'token',
        mockCacheCallbacks
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Error validating usernames. Please try again.'
      );
    });

    it('should work without cache callbacks', async () => {
      vi.mocked(categorizeUsernames).mockReturnValue({
        needValidation: ['newuser'],
        alreadyValid: [],
        alreadyInvalid: [],
      });

      vi.mocked(validateGitHubUsernames).mockResolvedValue({
        valid: ['newuser'],
        invalid: [],
        errors: {},
      });

      const result = await validateAndCacheUsernames(
        ['newuser'],
        mockCache,
        'token'
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('fetchUserItems', () => {
    const mockItems: GitHubItem[] = [
      {
        id: 1,
        title: 'Test Issue',
        html_url: 'https://github.com/test/repo/issues/1',
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        closed_at: undefined,
        body: 'Test body',
        user: {
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          html_url: 'https://github.com/testuser',
        },
        repository_url: 'https://api.github.com/repos/test/repo',
        labels: [],
        pull_request: undefined,
        merged: false,
      },
    ];

    it('should fetch user items successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: mockItems }),
      });

      const result = await fetchUserItems(
        'testuser',
        '2023-01-01',
        '2023-12-31',
        'token'
      );

      expect(result).toEqual(mockItems);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/search/issues?q=author:testuser+created:2023-01-01..2023-12-31&per_page=100',
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: 'token token',
          },
        }
      );
    });

    it('should work without authentication token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: mockItems }),
      });

      const result = await fetchUserItems(
        'testuser',
        '2023-01-01',
        '2023-12-31'
      );

      expect(result).toEqual(mockItems);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await fetchUserItems(
        'testuser',
        '2023-01-01',
        '2023-12-31'
      );

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(
        fetchUserItems('testuser', '2023-01-01', '2023-12-31', 'token')
      ).rejects.toThrow('GitHub API error: 403 Forbidden');
    });

    it('should handle 404 errors and update cache', async () => {
      const cache: UsernameCache = {
        validatedUsernames: new Set(['testuser']),
        invalidUsernames: new Set<string>(),
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        fetchUserItems(
          'testuser',
          '2023-01-01',
          '2023-12-31',
          'token',
          cache,
          mockCacheCallbacks
        )
      ).rejects.toThrow('GitHub API error: 404 Not Found');

      expect(mockCacheCallbacks.removeFromValidated).toHaveBeenCalledWith(
        'testuser'
      );
      expect(mockCacheCallbacks.addToInvalid).toHaveBeenCalledWith([
        'testuser',
      ]);
    });

    it('should not update cache for 404 if user not in validated cache', async () => {
      const cache: UsernameCache = {
        validatedUsernames: new Set<string>(),
        invalidUsernames: new Set<string>(),
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        fetchUserItems(
          'testuser',
          '2023-01-01',
          '2023-12-31',
          'token',
          cache,
          mockCacheCallbacks
        )
      ).rejects.toThrow('GitHub API error: 404 Not Found');

      expect(mockCacheCallbacks.removeFromValidated).not.toHaveBeenCalled();
      expect(mockCacheCallbacks.addToInvalid).not.toHaveBeenCalled();
    });
  });

  describe('isCacheValid', () => {
    const baseParams = {
      username: 'testuser',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
    };

    it('should return false for null cache', () => {
      const result = isCacheValid(baseParams, null);
      expect(result).toBe(false);
    });

    it('should return true for valid cache within expiry', () => {
      const lastSearch = {
        ...baseParams,
        timestamp: Date.now() - 30000, // 30 seconds ago
      };

      const result = isCacheValid(baseParams, lastSearch);
      expect(result).toBe(true);
    });

    it('should return false for expired cache', () => {
      const lastSearch = {
        ...baseParams,
        timestamp: Date.now() - 4000000, // Over 1 hour ago
      };

      const result = isCacheValid(baseParams, lastSearch);
      expect(result).toBe(false);
    });

    it('should return false for different parameters', () => {
      const lastSearch = {
        username: 'differentuser',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        timestamp: Date.now() - 30000,
      };

      const result = isCacheValid(baseParams, lastSearch);
      expect(result).toBe(false);
    });

    it('should respect custom cache expiry', () => {
      const lastSearch = {
        ...baseParams,
        timestamp: Date.now() - 30000, // 30 seconds ago
      };

      const result = isCacheValid(baseParams, lastSearch, 10000); // 10 second expiry
      expect(result).toBe(false);
    });
  });

  describe('performGitHubSearch', () => {
    const mockProgressCallback = vi.fn();

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });
    });

    it('should perform successful search', async () => {
      const result = await performGitHubSearch(mockSearchParams, mockCache, {
        onProgress: mockProgressCallback,
        cacheCallbacks: mockCacheCallbacks,
      });

      expect(result).toEqual({
        items: [],
        totalCount: 0,
        processedUsernames: ['testuser'],
        rawSearchItems: [],
      });

      expect(mockProgressCallback).toHaveBeenCalledWith(
        'Validating usernames...'
      );
      expect(mockProgressCallback).toHaveBeenCalledWith(
        'Starting search API...'
      );
      expect(mockProgressCallback).toHaveBeenCalledWith(
        'Fetching data for testuser...'
      );
      // URL parameters are no longer automatically updated
      expect(updateUrlParams).not.toHaveBeenCalled();
    });

    it('should handle parameter validation errors', async () => {
      const invalidParams = { ...mockSearchParams, username: '' };

      await expect(
        performGitHubSearch(invalidParams, mockCache)
      ).rejects.toThrow('Please enter a GitHub username');
    });

    it('should handle username format validation errors', async () => {
      vi.mocked(validateUsernameList).mockReturnValue({
        usernames: [],
        errors: ['Invalid username format'],
      });

      await expect(
        performGitHubSearch(mockSearchParams, mockCache)
      ).rejects.toThrow('Invalid username format');
    });

    it('should handle username validation errors', async () => {
      vi.mocked(getInvalidUsernames).mockReturnValue(['invaliduser']);

      await expect(
        performGitHubSearch(mockSearchParams, mockCache)
      ).rejects.toThrow('Invalid GitHub username');
    });

    it('should handle API fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        performGitHubSearch(mockSearchParams, mockCache)
      ).rejects.toThrow('Failed to fetch data for testuser: Network error');
    });

    it('should handle multiple users', async () => {
      vi.mocked(validateUsernameList).mockReturnValue({
        usernames: ['user1', 'user2'],
        errors: [],
      });

      const mockItems1 = [{ id: 1 } as GitHubItem];
      const mockItems2 = [{ id: 2 } as GitHubItem];

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: callCount === 1 ? mockItems1 : mockItems2,
            }),
        });
      });

      const result = await performGitHubSearch(mockSearchParams, mockCache, {
        requestDelay: 0, // Skip delay for faster tests
      });

      expect(result.rawSearchItems).toHaveLength(2);
      expect(result.processedUsernames).toEqual(['user1', 'user2']);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should work without progress callback', async () => {
      const result = await performGitHubSearch(mockSearchParams, mockCache);

      expect(result).toEqual({
        items: [],
        totalCount: 0,
        processedUsernames: ['testuser'],
        rawSearchItems: [],
      });
    });

    it('should work without cache callbacks', async () => {
      const result = await performGitHubSearch(mockSearchParams, mockCache);

      expect(result).toEqual({
        items: [],
        totalCount: 0,
        processedUsernames: ['testuser'],
        rawSearchItems: [],
      });
    });

    it('should handle username context in error messages', async () => {
      vi.mocked(validateUsernameList).mockReturnValue({
        usernames: ['failuser'],
        errors: [],
      });

      mockFetch.mockRejectedValue(new Error('Rate limited'));

      await expect(
        performGitHubSearch(mockSearchParams, mockCache)
      ).rejects.toThrow('Failed to fetch data for failuser: Rate limited');
    });
  });

  describe('createSearchCacheParams', () => {
    it('should create cache params with timestamp', () => {
      const mockTimestamp = 1234567890;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const result = createSearchCacheParams(mockSearchParams);

      expect(result).toEqual({
        username: 'testuser',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        timestamp: mockTimestamp,
      });

      vi.restoreAllMocks();
    });

    it('should include current timestamp', () => {
      const beforeTime = Date.now();
      const result = createSearchCacheParams(mockSearchParams);
      const afterTime = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('GitHub Events API', () => {
    describe('transformEventToItem', () => {
      // Commented out transformEventToItem tests as the function does not exist
      // 711: const result = transformEventToItem(mockEvent);
      // 790: const result = transformEventToItem(mockEvent);
      // 838: const result = transformEventToItem(mockEvent);
    });

    describe('performGitHubSearch with Events API', () => {
      it('should use Events API when apiMode is events', async () => {
        // Clear any previous mock calls
        vi.clearAllMocks();

        // Reset mocks for this specific test
        vi.mocked(getInvalidUsernames).mockReturnValue([]);
        vi.mocked(categorizeUsernames).mockReturnValue({
          needValidation: [],
          alreadyValid: ['testuser'],
          alreadyInvalid: [],
        });

        const mockEvents = [
          {
            id: '123',
            type: 'IssuesEvent',
            actor: {
              id: 1,
              login: 'testuser',
              avatar_url: 'https://avatar.url',
              url: 'https://api.github.com/users/testuser',
            },
            repo: {
              id: 456,
              name: 'testuser/testrepo',
              url: 'https://api.github.com/repos/testuser/testrepo',
            },
            payload: {
              action: 'opened',
              issue: {
                id: 789,
                number: 1,
                title: 'Test Issue',
                html_url: 'https://github.com/testuser/testrepo/issues/1',
                state: 'open',
                body: 'Test issue body',
                labels: [],
                created_at: '2024-01-15T00:00:00Z',
                updated_at: '2024-01-15T01:00:00Z',
                closed_at: undefined,
                user: {
                  login: 'testuser',
                  avatar_url: 'https://avatar.url',
                  html_url: 'https://github.com/testuser',
                },
              },
            },
            public: true,
            created_at: '2024-01-15T00:00:00Z',
          },
        ];

        // Mock fetch to return events on first call, empty on subsequent calls (pagination)
        let callCount = 0;
        mockFetch.mockImplementation(() => {
          callCount++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(callCount === 1 ? mockEvents : []),
          });
        });

        const result = await performGitHubSearch(
          {
            username: 'testuser',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            githubToken: 'token123',
            apiMode: 'events',
          },
          mockCache
        );

        expect(result.rawEvents).toHaveLength(1);
        expect(result.rawEvents?.[0]?.payload?.issue?.title).toBe('Test Issue');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.github.com/users/testuser/events?page=1&per_page=100',
          expect.any(Object)
        );
      });

      it('should handle pagination limit error gracefully', async () => {
        vi.clearAllMocks();

        vi.mocked(getInvalidUsernames).mockReturnValue([]);
        vi.mocked(categorizeUsernames).mockReturnValue({
          needValidation: [],
          alreadyValid: ['testuser'],
          alreadyInvalid: [],
        });

        // Mock fetch to return pagination limit error (422)
        mockFetch.mockResolvedValue({
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
          json: () =>
            Promise.resolve({
              message:
                'In order to keep the API fast for everyone, pagination is limited for this resource.',
              documentation_url: 'https://docs.github.com/v3/#pagination',
              status: '422',
            }),
        });

        const result = await performGitHubSearch(
          {
            username: 'testuser',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            githubToken: 'token123',
            apiMode: 'events',
          },
          mockCache
        );

        // Should return empty results instead of throwing error
        expect(result.items).toHaveLength(0);
        expect(result.processedUsernames).toContain('testuser');
      });
    });
  });
});
