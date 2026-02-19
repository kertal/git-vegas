import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGitHubFormState } from './useGitHubFormState';
import { useFormStore } from '../store/useFormStore';

describe('useGitHubFormState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the store to defaults between tests
    useFormStore.setState({
      username: '',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      githubToken: '',
      apiMode: 'summary',
      searchText: '',
      _hadUrlParams: false,
    });
  });

  it('should call onUrlParamsProcessed when _hadUrlParams is true', () => {
    useFormStore.setState({ _hadUrlParams: true, username: 'testuser' });
    const mockCallback = vi.fn();

    renderHook(() => useGitHubFormState(mockCallback));

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should not call onUrlParamsProcessed when _hadUrlParams is false', () => {
    useFormStore.setState({ _hadUrlParams: false });
    const mockCallback = vi.fn();

    renderHook(() => useGitHubFormState(mockCallback));

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should work without callback parameter', () => {
    useFormStore.setState({ _hadUrlParams: true, username: 'testuser' });

    const { result } = renderHook(() => useGitHubFormState());

    expect(result.current).toHaveProperty('validateUsernameFormat');
    expect(result.current).toHaveProperty('addAvatarsToCache');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('setError');
    expect(result.current).toHaveProperty('cachedAvatarUrls');
  });

  it('should return empty cachedAvatarUrls when no username set', () => {
    const { result } = renderHook(() => useGitHubFormState());
    expect(result.current.cachedAvatarUrls).toEqual([]);
  });

  it('should have null error by default', () => {
    const { result } = renderHook(() => useGitHubFormState());
    expect(result.current.error).toBeNull();
  });
});
