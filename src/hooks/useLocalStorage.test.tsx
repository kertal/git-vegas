import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFormSettings } from './useLocalStorage';
import { FormSettings } from '../types';

// Mock window.location and history
const mockLocation = {
  href: 'http://localhost:3000/',
  search: '',
};

const mockHistory = {
  replaceState: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('useFormSettings - URL Parameter Cleanup', () => {
  const defaultFormSettings: FormSettings = {
    username: '',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    githubToken: '',
    apiMode: 'summary',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    mockLocation.href = 'http://localhost:3000/';
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('should clean up URL parameters after processing them', () => {
    // Set URL parameters
    mockLocation.search = '?username=testuser&startDate=2024-02-01&endDate=2024-02-28';
    mockLocation.href = 'http://localhost:3000/?username=testuser&startDate=2024-02-01&endDate=2024-02-28';

    // Render the hook
    const { result } = renderHook(() => useFormSettings('test-key', defaultFormSettings));

    // Check that URL parameters were processed
    expect(result.current[0]).toEqual({
      ...defaultFormSettings,
      username: 'testuser',
      startDate: '2024-02-01',
      endDate: '2024-02-28',
    });

    // Check that URL cleanup was called
    expect(mockHistory.replaceState).toHaveBeenCalledWith(
      {},
      '',
      'http://localhost:3000/'
    );
  });

  it('should clean up URL parameters when only some parameters are present', () => {
    // Set only username parameter
    mockLocation.search = '?username=testuser';
    mockLocation.href = 'http://localhost:3000/?username=testuser';

    // Render the hook
    const { result } = renderHook(() => useFormSettings('test-key', defaultFormSettings));

    // Check that URL parameter was processed
    expect(result.current[0]).toEqual({
      ...defaultFormSettings,
      username: 'testuser',
    });

    // Check that URL cleanup was called
    expect(mockHistory.replaceState).toHaveBeenCalledWith(
      {},
      '',
      'http://localhost:3000/'
    );
  });

  it('should not clean up URL when no form-related parameters are present', () => {
    // Set unrelated URL parameters
    mockLocation.search = '?otherParam=value&anotherParam=123';
    mockLocation.href = 'http://localhost:3000/?otherParam=value&anotherParam=123';

    // Render the hook
    const { result } = renderHook(() => useFormSettings('test-key', defaultFormSettings));

    // Check that form settings remain unchanged
    expect(result.current[0]).toEqual(defaultFormSettings);

    // Check that URL cleanup was NOT called
    expect(mockHistory.replaceState).not.toHaveBeenCalled();
  });

  it('should not clean up URL when no search parameters are present', () => {
    // No URL parameters
    mockLocation.search = '';
    mockLocation.href = 'http://localhost:3000/';

    // Render the hook
    const { result } = renderHook(() => useFormSettings('test-key', defaultFormSettings));

    // Check that form settings remain unchanged
    expect(result.current[0]).toEqual(defaultFormSettings);

    // Check that URL cleanup was NOT called
    expect(mockHistory.replaceState).not.toHaveBeenCalled();
  });

  it('should prioritize URL parameters over localStorage values', () => {
    // Set localStorage values
    const localStorageSettings = {
      ...defaultFormSettings,
      username: 'localuser',
      startDate: '2024-01-15',
      endDate: '2024-01-30',
    };
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localStorageSettings));

    // Set URL parameters that override localStorage
    mockLocation.search = '?username=urluser&startDate=2024-02-01';
    mockLocation.href = 'http://localhost:3000/?username=urluser&startDate=2024-02-01';

    // Render the hook
    const { result } = renderHook(() => useFormSettings('test-key', defaultFormSettings));

    // Check that URL parameters take priority
    expect(result.current[0]).toEqual({
      ...localStorageSettings,
      username: 'urluser', // URL value
      startDate: '2024-02-01', // URL value
      endDate: '2024-01-31', // default value (no URL override for endDate)
    });

    // Check that URL cleanup was called
    expect(mockHistory.replaceState).toHaveBeenCalledWith(
      {},
      '',
      'http://localhost:3000/'
    );
  });

  it('should handle URL encoding correctly', () => {
    // Set URL parameters with special characters
    mockLocation.search = '?username=test%20user&startDate=2024-02-01';
    mockLocation.href = 'http://localhost:3000/?username=test%20user&startDate=2024-02-01';

    // Render the hook
    const { result } = renderHook(() => useFormSettings('test-key', defaultFormSettings));

    // Check that URL parameters were decoded correctly
    expect(result.current[0]).toEqual({
      ...defaultFormSettings,
      username: 'test user', // Decoded from test%20user
      startDate: '2024-02-01',
    });

    // Check that URL cleanup was called
    expect(mockHistory.replaceState).toHaveBeenCalledWith(
      {},
      '',
      'http://localhost:3000/'
    );
  });
});
