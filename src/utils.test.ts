import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  debounce,
  getContrastColor,
  isValidDateString,
  getParamFromUrl,
  updateUrlParams,
  validateGitHubUsernames
} from './utils';

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
  let mockLocation: { [key: string]: any };
  let originalLocation: Location;

  beforeEach(() => {
    mockLocation = {
      href: 'http://localhost:3000',
      search: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
      toString: function() { return this.href; }
    };

    originalLocation = window.location;
    // @ts-ignore: Overriding read-only property for testing
    delete window.location;
    // @ts-ignore: Partial implementation is sufficient for testing
    window.location = mockLocation;

    // Set up a getter for search that returns the query string part of href
    Object.defineProperty(mockLocation, 'search', {
      get: function() {
        const url = new URL(this.href);
        return url.search;
      },
      set: function(value) {
        const url = new URL(this.href);
        url.search = value;
        this.href = url.toString();
      }
    });
  });

  afterEach(() => {
    // @ts-ignore: Restoring original location
    window.location = originalLocation;
    vi.clearAllMocks();
  });

  describe('getParamFromUrl', () => {
    it('should get parameter from URL', () => {
      mockLocation.href = 'http://localhost:3000?username=test&date=2024-03-15';
      expect(getParamFromUrl('username')).toBe('test');
      expect(getParamFromUrl('date')).toBe('2024-03-15');
    });

    it('should return null for missing parameters', () => {
      mockLocation.href = 'http://localhost:3000?username=test';
      expect(getParamFromUrl('missing')).toBeNull();
    });

    it('should handle empty search string', () => {
      mockLocation.href = 'http://localhost:3000';
      expect(getParamFromUrl('any')).toBeNull();
    });
  });

  describe('updateUrlParams', () => {
    const mockReplaceState = vi.fn();
    
    beforeEach(() => {
      window.history.replaceState = mockReplaceState;
      mockLocation.href = 'http://localhost:3000';
    });

    it('should update URL parameters', () => {
      mockLocation.href = 'http://localhost:3000?existing=value';
      updateUrlParams({ new: 'param', existing: 'newvalue' });
      
      expect(mockReplaceState).toHaveBeenCalledWith(
        {},
        '',
        'http://localhost:3000?existing=newvalue&new=param'
      );
    });

    it('should remove parameters with null or empty values', () => {
      mockLocation.href = 'http://localhost:3000?remove=value&keep=value';
      updateUrlParams({ remove: null, keep: 'value' });
      
      expect(mockReplaceState).toHaveBeenCalledWith(
        {},
        '',
        'http://localhost:3000?keep=value'
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
      .mockResolvedValueOnce({ ok: true }) // First username valid
      .mockResolvedValueOnce({ ok: false }); // Second username invalid

    const result = await validateGitHubUsernames(['valid-user', 'invalid-user']);
    expect(result.valid).toEqual(['valid-user']);
    expect(result.invalid).toEqual(['invalid-user']);
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await validateGitHubUsernames(['test-user']);
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual(['test-user']);
  });

  it('should use auth token when provided', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const token = 'test-token';

    await validateGitHubUsernames(['test-user'], token);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/users/test-user',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': `token ${token}`
        })
      })
    );
  });
});

describe('URL parameter handling', () => {
  let mockLocation: { [key: string]: any };
  let originalLocation: Location;

  beforeEach(() => {
    mockLocation = {
      href: 'http://localhost:3000',
      search: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
      toString: function() { return this.href; }
    };

    originalLocation = window.location;
    // @ts-ignore: Overriding read-only property for testing
    delete window.location;
    // @ts-ignore: Partial implementation is sufficient for testing
    window.location = mockLocation;

    // Set up a getter for search that returns the query string part of href
    Object.defineProperty(mockLocation, 'search', {
      get: function() {
        const url = new URL(this.href);
        return url.search;
      },
      set: function(value) {
        const url = new URL(this.href);
        url.search = value;
        this.href = url.toString();
      }
    });
  });

  afterEach(() => {
    window.location = originalLocation;
    localStorage.clear();
  });

  it('getParamFromUrl returns null for non-existent parameter', () => {
    expect(getParamFromUrl('nonexistent')).toBeNull();
  });

  it('getParamFromUrl returns correct value for existing parameter', () => {
    mockLocation.href = 'http://localhost:3000?username=testuser';
    expect(getParamFromUrl('username')).toBe('testuser');
  });

  it('updateUrlParams updates URL correctly', () => {
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    
    updateUrlParams({
      username: 'testuser',
      startDate: '2024-01-01',
      endDate: null
    });

    expect(replaceStateSpy).toHaveBeenCalledWith(
      {},
      '',
      'http://localhost:3000?username=testuser&startDate=2024-01-01'
    );
  });
});

describe('URL parameters and localStorage interaction', () => {
  let mockLocation: { [key: string]: any };
  let originalLocation: Location;

  beforeEach(() => {
    mockLocation = {
      href: 'http://localhost:3000',
      search: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
      toString: function() { return this.href; }
    };

    originalLocation = window.location;
    // @ts-ignore: Overriding read-only property for testing
    delete window.location;
    // @ts-ignore: Partial implementation is sufficient for testing
    window.location = mockLocation;

    // Set up a getter for search that returns the query string part of href
    Object.defineProperty(mockLocation, 'search', {
      get: function() {
        const url = new URL(this.href);
        return url.search;
      },
      set: function(value) {
        const url = new URL(this.href);
        url.search = value;
        this.href = url.toString();
      }
    });

    localStorage.clear();
  });

  afterEach(() => {
    window.location = originalLocation;
    localStorage.clear();
  });

  it('URL parameters should override localStorage values', () => {
    // Set up localStorage with some values
    localStorage.setItem('github-username', 'localuser');
    localStorage.setItem('github-start-date', '2023-01-01');
    localStorage.setItem('github-end-date', '2023-12-31');

    // Set up URL parameters
    mockLocation.href = 'http://localhost:3000?username=urluser&startDate=2024-01-01&endDate=2024-12-31';

    // Get values from URL
    const urlUsername = getParamFromUrl('username');
    const urlStartDate = getParamFromUrl('startDate');
    const urlEndDate = getParamFromUrl('endDate');

    // URL values should be used instead of localStorage values
    expect(urlUsername).toBe('urluser');
    expect(urlStartDate).toBe('2024-01-01');
    expect(urlEndDate).toBe('2024-12-31');

    // These values should be different from localStorage
    expect(urlUsername).not.toBe(localStorage.getItem('github-username'));
    expect(urlStartDate).not.toBe(localStorage.getItem('github-start-date'));
    expect(urlEndDate).not.toBe(localStorage.getItem('github-end-date'));
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
          html_url: 'https://github.com/testuser'
        }
      }
    ];

    // Store results
    localStorage.setItem('github-search-results', JSON.stringify(mockResults));

    // Retrieve results
    const storedResults = JSON.parse(localStorage.getItem('github-search-results') || '[]');
    expect(storedResults).toEqual(mockResults);
  });

  it('should store and retrieve last search parameters', () => {
    const mockParams = {
      username: 'testuser',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      timestamp: Date.now()
    };

    // Store params
    localStorage.setItem('github-last-search', JSON.stringify(mockParams));

    // Retrieve params
    const storedParams = JSON.parse(localStorage.getItem('github-last-search') || 'null');
    expect(storedParams).toEqual(mockParams);
  });

  it('should handle cache expiration', () => {
    const mockParams = {
      username: 'testuser',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      timestamp: Date.now()
    };

    // Store params
    localStorage.setItem('github-last-search', JSON.stringify(mockParams));

    // Advance time by 2 hours
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);

    // Check if cache is expired (more than 1 hour old)
    const storedParams = JSON.parse(localStorage.getItem('github-last-search') || 'null');
    const isExpired = Date.now() - storedParams.timestamp > 3600000;
    expect(isExpired).toBe(true);
  });
}); 