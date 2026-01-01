import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIndexedDBStorage } from '../hooks/useIndexedDBStorage';
import { eventsStorage } from '../utils/storage';
import { GitHubEvent } from '../types';

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
};

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock the eventsStorage
vi.mock('../utils/indexedDB', () => ({
  eventsStorage: {
    store: vi.fn(),
    retrieve: vi.fn(),
    clear: vi.fn(),
    getInfo: vi.fn(),
  },
}));

// Mock IndexedDB globally
Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('useIndexedDBStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocks to their default state
    vi.mocked(eventsStorage.retrieve).mockResolvedValue(null);
    vi.mocked(eventsStorage.store).mockResolvedValue();
    vi.mocked(eventsStorage.clear).mockResolvedValue();
    vi.mocked(eventsStorage.getInfo).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty state', async () => {
    const { result } = renderHook(() => useIndexedDBStorage('test-key'));

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.events).toEqual([]);
    expect(result.current.metadata).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load events from storage on mount', async () => {
    const mockEvents: GitHubEvent[] = [
      {
        id: '1',
        type: 'PushEvent',
        actor: { 
          id: 1,
          login: 'testuser', 
          avatar_url: 'test.jpg',
          url: 'https://api.github.com/users/testuser'
        },
        repo: { 
          id: 1,
          name: 'test/repo',
          url: 'https://api.github.com/repos/test/repo'
        },
        created_at: '2023-01-01T00:00:00Z',
        payload: {},
        public: true,
      },
    ];

    const mockMetadata = {
      lastFetch: Date.now(),
      usernames: ['testuser'],
      apiMode: 'events' as const,
    };

    vi.mocked(eventsStorage.retrieve).mockResolvedValue({
      events: mockEvents,
      metadata: mockMetadata,
    });

    const { result } = renderHook(() => useIndexedDBStorage('test-key'));

    // Wait for async operations to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.events).toEqual(mockEvents);
    expect(result.current.metadata).toEqual(mockMetadata);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle storage errors gracefully', async () => {
    const error = new Error('Storage error');
    vi.mocked(eventsStorage.retrieve).mockRejectedValue(error);

    const { result } = renderHook(() => useIndexedDBStorage('test-key'));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.events).toEqual([]);
    expect(result.current.metadata).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Storage error');
  });

  it('should store events successfully', async () => {
    const mockEvents: GitHubEvent[] = [
      {
        id: '1',
        type: 'PushEvent',
        actor: { 
          id: 1,
          login: 'testuser', 
          avatar_url: 'test.jpg',
          url: 'https://api.github.com/users/testuser'
        },
        repo: { 
          id: 1,
          name: 'test/repo',
          url: 'https://api.github.com/repos/test/repo'
        },
        created_at: '2023-01-01T00:00:00Z',
        payload: {},
        public: true,
      },
    ];

    const mockMetadata = {
      lastFetch: Date.now(),
      usernames: ['testuser'],
      apiMode: 'events' as const,
    };

    vi.mocked(eventsStorage.store).mockResolvedValue();

    const { result } = renderHook(() => useIndexedDBStorage('test-key'));

    // Wait for initial load first
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.storeEvents('test-key', mockEvents, mockMetadata);
    });

    expect(eventsStorage.store).toHaveBeenCalledWith('test-key', mockEvents, mockMetadata);
    expect(result.current.events).toEqual(mockEvents);
    expect(result.current.metadata).toEqual(mockMetadata);
    expect(result.current.error).toBeNull();
  });

  it('should handle store errors', async () => {
    const error = new Error('Store error');
    vi.mocked(eventsStorage.store).mockRejectedValue(error);

    const { result } = renderHook(() => useIndexedDBStorage('test-key'));

    // Wait for initial load first
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.storeEvents('test-key', [], {
        lastFetch: Date.now(),
        usernames: [],
        apiMode: 'events',
      });
    });

    expect(result.current.error).toBe('Store error');
  });

  it('should clear events successfully', async () => {
    vi.mocked(eventsStorage.clear).mockResolvedValue();

    const { result } = renderHook(() => useIndexedDBStorage('test-key'));

    // Wait for initial load first
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.clearEvents();
    });

    expect(eventsStorage.clear).toHaveBeenCalled();
    expect(result.current.events).toEqual([]);
    expect(result.current.metadata).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should handle clear errors', async () => {
    const error = new Error('Clear error');
    vi.mocked(eventsStorage.clear).mockRejectedValue(error);

    const { result } = renderHook(() => useIndexedDBStorage('test-key'));

    // Wait for initial load first
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.clearEvents();
    });

    expect(result.current.error).toBe('Clear error');
  });

  it('should refresh events', async () => {
    const mockEvents: GitHubEvent[] = [
      {
        id: '1',
        type: 'PushEvent',
        actor: { 
          id: 1,
          login: 'testuser', 
          avatar_url: 'test.jpg',
          url: 'https://api.github.com/users/testuser'
        },
        repo: { 
          id: 1,
          name: 'test/repo',
          url: 'https://api.github.com/repos/test/repo'
        },
        created_at: '2023-01-01T00:00:00Z',
        payload: {},
        public: true,
      },
    ];

    const mockMetadata = {
      lastFetch: Date.now(),
      usernames: ['testuser'],
      apiMode: 'events' as const,
    };

    vi.mocked(eventsStorage.retrieve).mockResolvedValue({
      events: mockEvents,
      metadata: mockMetadata,
    });

    const { result } = renderHook(() => useIndexedDBStorage('test-key'));

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Clear the mock to verify refresh calls it again
    vi.mocked(eventsStorage.retrieve).mockClear();

    await act(async () => {
      await result.current.refreshEvents();
    });

    expect(eventsStorage.retrieve).toHaveBeenCalledWith('test-key');
  });
}); 