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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should delay function execution', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 300);

    debouncedFn();
    expect(mockFn).not.toBeCalled();

    jest.advanceTimersByTime(299);
    expect(mockFn).not.toBeCalled();

    jest.advanceTimersByTime(1);
    expect(mockFn).toBeCalled();
    expect(mockFn).toBeCalledTimes(1);
  });

  it('should cancel previous calls', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 300);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    jest.advanceTimersByTime(300);
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
    expect(isValidDateString('2024-03-15')).toBe(true);
    expect(isValidDateString('2023-12-31')).toBe(true);
    expect(isValidDateString('2024-02-29')).toBe(true); // Leap year
  });

  it('should reject invalid date strings', () => {
    expect(isValidDateString('2024/03/15')).toBe(false); // Wrong format
    expect(isValidDateString('2024-13-01')).toBe(false); // Invalid month
    expect(isValidDateString('2024-00-31')).toBe(false); // Invalid month
    expect(isValidDateString('2024-13-00')).toBe(false); // Invalid day
  });

  it('should handle edge cases', () => {
    expect(isValidDateString('')).toBe(false);
    expect(isValidDateString('not-a-date')).toBe(false);
    expect(isValidDateString('2024-3-15')).toBe(false); // Missing leading zero
    expect(isValidDateString('2024-03-5')).toBe(false); // Missing leading zero
  });
});

describe('URL parameter functions', () => {
  const mockLocation = {
    search: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    href: 'https://example.com',
    toString: () => 'https://example.com'
  };

  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    // @ts-ignore: Overriding read-only property for testing
    delete window.location;
    // @ts-ignore: Partial implementation is sufficient for testing
    window.location = mockLocation;
  });

  afterEach(() => {
    // @ts-ignore: Restoring original location
    window.location = originalLocation;
    jest.clearAllMocks();
  });

  describe('getParamFromUrl', () => {
    it('should get parameter from URL', () => {
      mockLocation.search = '?username=test&date=2024-03-15';
      expect(getParamFromUrl('username')).toBe('test');
      expect(getParamFromUrl('date')).toBe('2024-03-15');
    });

    it('should return null for missing parameters', () => {
      mockLocation.search = '?username=test';
      expect(getParamFromUrl('missing')).toBeNull();
    });

    it('should handle empty search string', () => {
      mockLocation.search = '';
      expect(getParamFromUrl('any')).toBeNull();
    });
  });

  describe('updateUrlParams', () => {
    const mockReplaceState = jest.fn();
    
    beforeEach(() => {
      window.history.replaceState = mockReplaceState;
      mockLocation.href = 'https://example.com';
      mockLocation.search = '';
    });

    it('should update URL parameters', () => {
      mockLocation.search = '?existing=value';
      updateUrlParams({ new: 'param', existing: 'newvalue' });
      
      const url = new URL(mockLocation.href);
      url.searchParams.set('new', 'param');
      url.searchParams.set('existing', 'newvalue');
      
      expect(mockReplaceState).toBeCalledWith(
        {},
        '',
        url.toString()
      );
    });

    it('should remove parameters with null or empty values', () => {
      mockLocation.search = '?remove=value&keep=value';
      updateUrlParams({ remove: null, keep: 'value' });
      
      const url = new URL(mockLocation.href);
      url.searchParams.set('keep', 'value');
      
      expect(mockReplaceState).toBeCalledWith(
        {},
        '',
        url.toString()
      );
    });
  });
});

describe('validateGitHubUsernames', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should validate valid usernames', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({ ok: true })
    );

    const result = await validateGitHubUsernames(['validuser1', 'validuser2']);
    expect(result.valid).toEqual(['validuser1', 'validuser2']);
    expect(result.invalid).toEqual([]);
  });

  it('should identify invalid usernames', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({ ok: false })
    );

    const result = await validateGitHubUsernames(['invaliduser1', 'invaliduser2']);
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual(['invaliduser1', 'invaliduser2']);
  });

  it('should handle mixed valid and invalid usernames', async () => {
    let callCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      callCount++;
      return Promise.resolve({ ok: callCount === 1 }); // First call succeeds, second fails
    });

    const result = await validateGitHubUsernames(['validuser', 'invaliduser']);
    expect(result.valid).toEqual(['validuser']);
    expect(result.invalid).toEqual(['invaliduser']);
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );

    const result = await validateGitHubUsernames(['user1']);
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual(['user1']);
  });

  it('should include token in headers when provided', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({ ok: true })
    );

    await validateGitHubUsernames(['user'], 'test-token');

    expect(global.fetch).toBeCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'token test-token'
        })
      })
    );
  });
}); 