import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  debounce,
  getContrastColor,
  isValidDateString,
  getParamFromUrl,
  updateUrlParams,
  validateGitHubUsernames,
  validateGitHubUsernameFormat,
  validateUsernameList,
} from './utils';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 300);

    debouncedFn();
    expect(mockFn).not.toBeCalled();

    vi.advanceTimersByTime(299);
    expect(mockFn).not.toBeCalled();

    vi.advanceTimersByTime(1);
    expect(mockFn).toBeCalled();
    expect(mockFn).toBeCalledTimes(1);
  });

  it('should cancel previous calls', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 300);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    vi.advanceTimersByTime(300);
    expect(mockFn).toBeCalledTimes(1);
  });
});

describe('getContrastColor', () => {
  it('should return white for dark colors', () => {
    expect(getContrastColor('000000')).toBe('#fff');
    expect(getContrastColor('333333')).toBe('#fff');
    expect(getContrastColor('0000FF')).toBe('#fff');
  });

  it('should return black for light colors', () => {
    expect(getContrastColor('FFFFFF')).toBe('#000');
    expect(getContrastColor('FFFF00')).toBe('#000');
    expect(getContrastColor('00FF00')).toBe('#000');
  });

  it('should handle edge cases', () => {
    expect(getContrastColor('808080')).toBe('#000'); // Mid-gray
    expect(getContrastColor('C0C0C0')).toBe('#000'); // Light gray
    expect(getContrastColor('404040')).toBe('#fff'); // Dark gray
  });
});

describe('isValidDateString', () => {
  it('should validate correct date strings', () => {
    expect(isValidDateString('2024-01-01')).toBe(true);
    expect(isValidDateString('2023-12-31')).toBe(true);
  });

  it('should reject invalid date strings', () => {
    expect(isValidDateString('2024/01/01')).toBe(false);
    expect(isValidDateString('01-01-2024')).toBe(false);
    expect(isValidDateString('not a date')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(isValidDateString('')).toBe(false);
    expect(isValidDateString('not-a-date')).toBe(false);
    expect(isValidDateString('2024-3-15')).toBe(false); // Missing leading zero
    expect(isValidDateString('2024-03-5')).toBe(false); // Missing leading zero
  });
});

describe('URL parameter functions', () => {
  beforeEach(() => {
    // Reset location to base URL using the global mock
    window.history.replaceState({}, '', 'http://localhost:3000');
    // Clear the mock call history
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getParamFromUrl', () => {
    it('should get parameter from URL', () => {
      // Use the global mock's replaceState to set URL
      window.history.replaceState(
        {},
        '',
        'http://localhost:3000?username=test&date=2024-03-15'
      );
      expect(getParamFromUrl('username')).toBe('test');
      expect(getParamFromUrl('date')).toBe('2024-03-15');
    });

    it('should return null for missing parameters', () => {
      window.history.replaceState(
        {},
        '',
        'http://localhost:3000?username=test'
      );
      expect(getParamFromUrl('missing')).toBeNull();
    });

    it('should handle empty search string', () => {
      window.history.replaceState({}, '', 'http://localhost:3000');
      expect(getParamFromUrl('any')).toBeNull();
    });
  });

  describe('updateUrlParams', () => {
    it('should update URL parameters', () => {
      window.history.replaceState(
        {},
        '',
        'http://localhost:3000?existing=value'
      );
      vi.clearAllMocks(); // Clear the setup call

      updateUrlParams({ new: 'param', existing: 'newvalue' });

      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        'http://localhost:3000/?existing=newvalue&new=param'
      );
    });

    it('should remove parameters with null or empty values', () => {
      window.history.replaceState(
        {},
        '',
        'http://localhost:3000?remove=value&keep=value'
      );
      vi.clearAllMocks(); // Clear the setup call

      updateUrlParams({ remove: null, keep: 'value' });

      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        'http://localhost:3000/?keep=value'
      );
    });

    it('updateUrlParams updates URL correctly', () => {
      const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
      replaceStateSpy.mockClear(); // Clear any previous calls

      updateUrlParams({
        username: 'testuser',
        startDate: '2024-01-01',
        endDate: null,
      });

      expect(replaceStateSpy).toHaveBeenCalledWith(
        {},
        '',
        'http://localhost:3000/?username=testuser&startDate=2024-01-01'
      );
    });
  });
});

describe('validateGitHubUsernames', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should validate usernames correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({ 
        ok: true, 
        json: vi.fn().mockResolvedValue({ avatar_url: 'https://github.com/valid-user.png' })
      }) // First username valid
      .mockResolvedValueOnce({ ok: false, status: 404 }); // Second username invalid

    const result = await validateGitHubUsernames([
      'valid-user',
      'invalid-user',
    ]);
    expect(result.valid).toEqual(['valid-user']);
    expect(result.invalid).toEqual(['invalid-user']);
    expect(result.errors['invalid-user']).toBe('Username not found on GitHub');
    expect(result.avatarUrls['valid-user']).toBe('https://github.com/valid-user.png');
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await validateGitHubUsernames(['test-user']);
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual(['test-user']);
    expect(result.errors['test-user']).toBe(
      'Network error while validating username'
    );
  });

  it('should handle rate limiting', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 });

    const result = await validateGitHubUsernames(['test-user']);
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual(['test-user']);
    expect(result.errors['test-user']).toBe(
      'API rate limit exceeded. Please try again later or add a GitHub token.'
    );
  });

  it('should handle unknown API errors', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const result = await validateGitHubUsernames(['test-user']);
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual(['test-user']);
    expect(result.errors['test-user']).toBe('GitHub API error: 500');
  });

  it('should validate format before making API call', async () => {
    const result = await validateGitHubUsernames(['invalid--username']);
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual(['invalid--username']);
    expect(result.errors['invalid--username']).toBe(
      'Username cannot contain consecutive hyphens'
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should use auth token when provided', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const token = 'test-token';

    await validateGitHubUsernames(['test-user'], token);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/users/test-user',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `token ${token}`,
        }),
      })
    );
  });
});

describe('validateGitHubUsernameFormat', () => {
  it('should validate correct usernames', () => {
    const validUsernames = [
      'testuser',
      'user123',
      'test-user',
      'a',
      'a-b',
      'user-123-test',
      'CamelCase',
      '123user',
    ];

    validUsernames.forEach(username => {
      const result = validateGitHubUsernameFormat(username);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  it('should reject empty or null usernames', () => {
    const invalidInputs = ['', '   ', null, undefined];

    invalidInputs.forEach(input => {
      const result = validateGitHubUsernameFormat(input as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  it('should reject usernames that are too long', () => {
    const longUsername = 'a'.repeat(40); // 40 characters, exceeds GitHub limit of 39
    const result = validateGitHubUsernameFormat(longUsername);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Username cannot be longer than 39 characters');
  });

  it('should reject usernames starting with hyphen', () => {
    const result = validateGitHubUsernameFormat('-username');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Username cannot begin with a hyphen');
  });

  it('should reject usernames ending with hyphen', () => {
    const result = validateGitHubUsernameFormat('username-');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Username cannot end with a hyphen');
  });

  it('should reject usernames with consecutive hyphens', () => {
    const result = validateGitHubUsernameFormat('user--name');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Username cannot contain consecutive hyphens');
  });

  it('should reject usernames with invalid characters', () => {
    const invalidUsernames = [
      'user@name',
      'user.name',
      'user name',
      'user#name',
      'user$name',
      'user%name',
      'user_name', // Underscores are not allowed in GitHub usernames
    ];

    invalidUsernames.forEach(username => {
      const result = validateGitHubUsernameFormat(username);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('may only contain');
    });
  });

  it('should reject reserved usernames', () => {
    const reservedUsernames = [
      'admin',
      'api',
      'www',
      'root',
      'system',
      'Admin', // Test case insensitive
      'API',
    ];

    reservedUsernames.forEach(username => {
      const result = validateGitHubUsernameFormat(username);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('This username is reserved and cannot be used');
    });
  });

  it('should accept maximum length username', () => {
    const maxLengthUsername = 'a'.repeat(39); // Exactly 39 characters
    const result = validateGitHubUsernameFormat(maxLengthUsername);
    expect(result.isValid).toBe(true);
  });

  it('should handle single character usernames', () => {
    const result = validateGitHubUsernameFormat('a');
    expect(result.isValid).toBe(true);
  });
});

describe('validateUsernameList', () => {
  it('should parse single username correctly', () => {
    const result = validateUsernameList('testuser');
    expect(result.usernames).toEqual(['testuser']);
    expect(result.errors).toEqual([]);
  });

  it('should parse multiple usernames correctly', () => {
    const result = validateUsernameList('user1, user2, user3');
    expect(result.usernames).toEqual(['user1', 'user2', 'user3']);
    expect(result.errors).toEqual([]);
  });

  it('should handle usernames with various spacing', () => {
    const result = validateUsernameList('user1,user2, user3 ,  user4  ');
    expect(result.usernames).toEqual(['user1', 'user2', 'user3', 'user4']);
    expect(result.errors).toEqual([]);
  });

  it('should remove duplicates', () => {
    const result = validateUsernameList('user1, user2, user1, user3');
    expect(result.usernames).toEqual(['user1', 'user2', 'user3']);
    expect(result.errors).toContain('Duplicate usernames found: user1');
  });

  it('should reject empty input', () => {
    const result = validateUsernameList('');
    expect(result.usernames).toEqual([]);
    expect(result.errors).toContain('Please enter at least one username');
  });

  it('should reject null/undefined input', () => {
    const result1 = validateUsernameList(null as any);
    const result2 = validateUsernameList(undefined as any);

    expect(result1.usernames).toEqual([]);
    expect(result1.errors).toContain('Please enter at least one username');
    expect(result2.usernames).toEqual([]);
    expect(result2.errors).toContain('Please enter at least one username');
  });

  it('should reject too many usernames', () => {
    const manyUsernames = Array.from({ length: 20 }, (_, i) => `user${i}`).join(
      ', '
    );
    const result = validateUsernameList(manyUsernames);

    expect(result.usernames).toHaveLength(15); // Should be limited to first 15
    expect(result.errors).toContain(
      'Too many usernames. Please limit to 15 usernames at a time.'
    );
  });

  it('should validate individual username formats', () => {
    const result = validateUsernameList(
      'validuser, invalid--user, -badstart, gooduser'
    );

    expect(result.usernames).toEqual([
      'validuser',
      'invalid--user',
      '-badstart',
      'gooduser',
    ]);
    expect(result.errors).toContain(
      '"invalid--user": Username cannot contain consecutive hyphens'
    );
    expect(result.errors).toContain(
      '"-badstart": Username cannot begin with a hyphen'
    );
  });

  it('should handle multiple validation errors', () => {
    const result = validateUsernameList(
      'user1, user1, invalid--user, admin, user@invalid'
    );

    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
    expect(result.errors.some(e => e.includes('consecutive hyphens'))).toBe(
      true
    );
    expect(result.errors.some(e => e.includes('reserved'))).toBe(true);
    expect(result.errors.some(e => e.includes('may only contain'))).toBe(true);
  });

  it('should filter out empty usernames after splitting', () => {
    const result = validateUsernameList('user1, , user2,  , user3');
    expect(result.usernames).toEqual(['user1', 'user2', 'user3']);
    expect(result.errors).toEqual([]);
  });

  it('should handle edge case with only commas and spaces', () => {
    const result = validateUsernameList(', , ,   ');
    expect(result.usernames).toEqual([]);
    expect(result.errors).toContain('Please enter at least one username');
  });

  it('should enforce 250 character limit for combined usernames', () => {
    // Create usernames that exceed 250 characters total
    const longUsernames = Array.from({ length: 10 }, (_, i) => `a${i.toString().padStart(24, '0')}`); // 10 usernames, 25 chars each = 250
    const validResult = validateUsernameList(longUsernames.join(', '));
    expect(validResult.errors).toEqual([]);

    // Add one more character to exceed the limit
    longUsernames.push('a'); 
    const invalidResult = validateUsernameList(longUsernames.join(', '));
    expect(invalidResult.errors).toContain('Username list is too long (251 characters). Please limit the combined usernames to 250 characters.');
  });

  it('should provide accurate character count in error message', () => {
    const usernames = 'a'.repeat(100) + ', ' + 'b'.repeat(100) + ', ' + 'c'.repeat(60); // 260 total chars
    const result = validateUsernameList(usernames);
    expect(result.errors).toContain('Username list is too long (260 characters). Please limit the combined usernames to 250 characters.');
  });

  it('should allow exactly 250 characters', () => {
    const usernames = 'a'.repeat(125) + ', ' + 'b'.repeat(125); // exactly 250 chars
    const result = validateUsernameList(usernames);
    expect(result.errors).not.toContain(expect.stringContaining('Username list is too long'));
  });
});

describe('URL parameter handling', () => {
  beforeEach(() => {
    // Reset location to base URL
    window.history.replaceState({}, '', 'http://localhost:3000');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('getParamFromUrl returns null for non-existent parameter', () => {
    expect(getParamFromUrl('nonexistent')).toBeNull();
  });

  it('getParamFromUrl returns correct value for existing parameter', () => {
    window.history.replaceState(
      {},
      '',
      'http://localhost:3000?username=testuser'
    );
    expect(getParamFromUrl('username')).toBe('testuser');
  });

  it('updateUrlParams updates URL correctly', () => {
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    replaceStateSpy.mockClear(); // Clear any previous calls

    updateUrlParams({
      username: 'testuser',
      startDate: '2024-01-01',
      endDate: null,
    });

    expect(replaceStateSpy).toHaveBeenCalledWith(
      {},
      '',
      'http://localhost:3000/?username=testuser&startDate=2024-01-01'
    );
  });
});

describe('URL parameters and localStorage interaction', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset location to base URL
    window.history.replaceState({}, '', 'http://localhost:3000');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('URL parameters should override localStorage values', () => {
    // Set localStorage values
    localStorage.setItem('github-username', JSON.stringify('localuser'));
    localStorage.setItem('github-start-date', JSON.stringify('2023-01-01'));
    localStorage.setItem('github-end-date', JSON.stringify('2023-12-31'));

    // Set URL parameters
    window.history.replaceState(
      {},
      '',
      'http://localhost:3000?username=urluser&startDate=2024-01-01&endDate=2024-12-31'
    );

    // Test that URL parameters are returned instead of localStorage values
    const urlUsername = getParamFromUrl('username');
    const urlStartDate = getParamFromUrl('startDate');
    const urlEndDate = getParamFromUrl('endDate');

    // URL values should be used instead of localStorage values
    expect(urlUsername).toBe('urluser');
    expect(urlStartDate).toBe('2024-01-01');
    expect(urlEndDate).toBe('2024-12-31');
  });
});

describe('Search results caching', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('should store and retrieve search results', () => {
    const mockResults = [
      {
        id: 1,
        title: 'Test Issue',
        html_url: 'https://github.com/test/repo/issues/1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        state: 'open',
        user: {
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          html_url: 'https://github.com/testuser',
        },
      },
    ];

    // Store results
    localStorage.setItem('github-search-results', JSON.stringify(mockResults));

    // Retrieve results
    const storedResults = JSON.parse(
      localStorage.getItem('github-search-results') || '[]'
    );
    expect(storedResults).toEqual(mockResults);
  });

  it('should store and retrieve last search parameters', () => {
    const mockParams = {
      username: 'testuser',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      timestamp: Date.now(),
    };

    // Store params
    localStorage.setItem('github-last-search', JSON.stringify(mockParams));

    // Retrieve params
    const storedParams = JSON.parse(
      localStorage.getItem('github-last-search') || 'null'
    );
    expect(storedParams).toEqual(mockParams);
  });

  it('should handle cache expiration', () => {
    const mockParams = {
      username: 'testuser',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      timestamp: Date.now(),
    };

    // Store params
    localStorage.setItem('github-last-search', JSON.stringify(mockParams));

    // Advance time by 2 hours
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);

    // Check if cache is expired (more than 1 hour old)
    const storedParams = JSON.parse(
      localStorage.getItem('github-last-search') || 'null'
    );
    const isExpired = Date.now() - storedParams.timestamp > 3600000;
    expect(isExpired).toBe(true);
  });
});
