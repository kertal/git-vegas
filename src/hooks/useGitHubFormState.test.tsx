import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGitHubFormState } from './useGitHubFormState';

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

describe('useGitHubFormState - URL Parameter Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    mockLocation.href = 'http://localhost:3000/';
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('should call onUrlParamsProcessed when URL parameters are present', () => {
    // Set URL parameters
    mockLocation.search = '?username=testuser&startDate=2024-02-01&endDate=2024-02-28';
    mockLocation.href = 'http://localhost:3000/?username=testuser&startDate=2024-02-01&endDate=2024-02-28';

    const mockCallback = vi.fn();

    // Render the hook with callback
    renderHook(() => useGitHubFormState(mockCallback));

    // Check that the callback was called
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should not call onUrlParamsProcessed when no URL parameters are present', () => {
    // No URL parameters
    mockLocation.search = '';
    mockLocation.href = 'http://localhost:3000/';

    const mockCallback = vi.fn();

    // Render the hook with callback
    renderHook(() => useGitHubFormState(mockCallback));

    // Check that the callback was NOT called
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should not call onUrlParamsProcessed when only unrelated URL parameters are present', () => {
    // Set unrelated URL parameters
    mockLocation.search = '?otherParam=value&anotherParam=123';
    mockLocation.href = 'http://localhost:3000/?otherParam=value&anotherParam=123';

    const mockCallback = vi.fn();

    // Render the hook with callback
    renderHook(() => useGitHubFormState(mockCallback));

    // Check that the callback was NOT called
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should call onUrlParamsProcessed when only some form parameters are present', () => {
    // Set only username parameter
    mockLocation.search = '?username=testuser';
    mockLocation.href = 'http://localhost:3000/?username=testuser';

    const mockCallback = vi.fn();

    // Render the hook with callback
    renderHook(() => useGitHubFormState(mockCallback));

    // Check that the callback was called
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should work without callback parameter', () => {
    // Set URL parameters
    mockLocation.search = '?username=testuser';
    mockLocation.href = 'http://localhost:3000/?username=testuser';

    // Render the hook without callback (should not throw)
    const { result } = renderHook(() => useGitHubFormState());

    // Check that the hook returns the expected structure
    expect(result.current).toHaveProperty('formSettings');
    expect(result.current).toHaveProperty('setUsername');
    expect(result.current).toHaveProperty('setStartDate');
    expect(result.current).toHaveProperty('setEndDate');
    expect(result.current).toHaveProperty('setGithubToken');
    expect(result.current).toHaveProperty('setApiMode');
    expect(result.current).toHaveProperty('validateUsernameFormat');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('setError');
  });

  it('should clean up URL parameters when they are processed', () => {
    // Set URL parameters
    mockLocation.search = '?username=testuser&startDate=2024-02-01&endDate=2024-02-28';
    mockLocation.href = 'http://localhost:3000/?username=testuser&startDate=2024-02-01&endDate=2024-02-28';

    const mockCallback = vi.fn();

    // Render the hook with callback
    renderHook(() => useGitHubFormState(mockCallback));

    // Check that the callback was called
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Check that URL cleanup was called
    expect(mockHistory.replaceState).toHaveBeenCalledWith(
      {},
      '',
      'http://localhost:3000/'
    );
  });
}); 