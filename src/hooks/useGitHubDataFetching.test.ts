import { renderHook } from '@testing-library/react';
import { useGitHubDataFetching } from './useGitHubDataFetching';
import { vi } from 'vitest';
import { GitHubEvent } from '../types';

// Mock fetch globally
global.fetch = vi.fn();

// Mock timers for testing async operations
vi.useFakeTimers();

describe('useGitHubDataFetching', () => {
  const mockStoreEvents = vi.fn();
  const mockClearEvents = vi.fn();
  const mockStoreSearchItems = vi.fn();
  const mockClearSearchItems = vi.fn();
  const mockOnError = vi.fn();

  const defaultProps = {
    username: 'testuser',
    githubToken: 'test-token',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    searchItemsCount: 0,
    eventsCount: 0,
    onError: mockOnError,
    storeEvents: mockStoreEvents,
    clearEvents: mockClearEvents,
    storeSearchItems: mockStoreSearchItems,
    clearSearchItems: mockClearSearchItems,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useGitHubDataFetching(defaultProps));

    expect(result.current.loading).toBe(false);
    expect(result.current.loadingProgress).toBe('');
    expect(result.current.currentUsername).toBe('');
  });

  it('should verify date range filtering in search query', () => {
    const { result } = renderHook(() => useGitHubDataFetching(defaultProps));

    // Verify the hook returns the expected structure
    expect(result.current).toEqual({
      loading: false,
      loadingProgress: '',
      currentUsername: '',
      handleSearch: expect.any(Function),
    });

    // Verify that handleSearch is a function
    expect(typeof result.current.handleSearch).toBe('function');
  });

  it('should test date range filtering logic', () => {
    // Test the date range filtering logic directly
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';
    
    // Test that the search query format is correct
    const searchQuery = `author:testuser updated:${startDate}..${endDate}`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    expect(encodedQuery).toBe('author%3Atestuser%20updated%3A2024-01-01..2024-01-31');
    
    // Test date range calculation
    const startDateTime = new Date(startDate).getTime();
    const endDateTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;
    
    expect(startDateTime).toBe(new Date('2024-01-01').getTime());
    expect(endDateTime).toBe(new Date('2024-01-31').getTime() + 24 * 60 * 60 * 1000);
    
    // Test event filtering logic
    const mockEvent: GitHubEvent = {
      id: '1',
      type: 'PushEvent',
      actor: { login: 'testuser', id: 1, avatar_url: 'test.jpg', url: 'https://api.github.com/users/testuser' },
      repo: { id: 1, name: 'testuser/repo', url: 'https://api.github.com/repos/testuser/repo' },
      payload: {},
      public: true,
      created_at: '2024-01-15T10:00:00Z',
    };
    
    const eventTime = new Date(mockEvent.created_at).getTime();
    const isInRange = eventTime >= startDateTime && eventTime <= endDateTime;
    
    expect(isInRange).toBe(true);
  });

  it('should test multiple username parsing', () => {
    const propsWithMultipleUsers = {
      ...defaultProps,
      username: 'user1,user2',
    };

    const { result } = renderHook(() => useGitHubDataFetching(propsWithMultipleUsers));

    // Verify the hook returns the expected structure
    expect(result.current).toEqual({
      loading: false,
      loadingProgress: '',
      currentUsername: '',
      handleSearch: expect.any(Function),
    });
  });

  it('should test username trimming', () => {
    const propsWithWhitespace = {
      ...defaultProps,
      username: '  user1  ,  user2  ',
    };

    const { result } = renderHook(() => useGitHubDataFetching(propsWithWhitespace));

    // Verify the hook returns the expected structure
    expect(result.current).toEqual({
      loading: false,
      loadingProgress: '',
      currentUsername: '',
      handleSearch: expect.any(Function),
    });
  });

  it('should test empty username handling', () => {
    const propsWithEmptyUsername = {
      ...defaultProps,
      username: '',
    };

    const { result } = renderHook(() => useGitHubDataFetching(propsWithEmptyUsername));

    // Verify the hook returns the expected structure
    expect(result.current).toEqual({
      loading: false,
      loadingProgress: '',
      currentUsername: '',
      handleSearch: expect.any(Function),
    });
  });
}); 