import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitHubEvent } from '../types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('LocalStorage Events', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('should store and retrieve events from localStorage', () => {
    const mockEvents: GitHubEvent[] = [
      {
        id: '123456789',
        type: 'IssuesEvent',
        actor: {
          id: 1,
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          url: 'https://api.github.com/users/testuser',
        },
        repo: {
          id: 456,
          name: 'test/repo',
          url: 'https://api.github.com/repos/test/repo',
        },
        payload: {
          action: 'opened',
          issue: {
            id: 1,
            number: 123,
            title: 'Test Issue',
            html_url: 'https://github.com/test/repo/issues/123',
            state: 'open',
            body: 'This is a test issue',
            labels: [],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T12:00:00Z',
            user: {
              login: 'testuser',
              avatar_url: 'https://github.com/testuser.png',
              html_url: 'https://github.com/testuser',
            },
          },
        },
        public: true,
        created_at: '2024-01-15T10:00:00Z',
      },
    ];

    // Mock localStorage to return our test data
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      rawEvents: mockEvents,
      rawSearchItems: [],
      metadata: {
        lastFetch: Date.now(),
        usernames: ['testuser'],
        apiMode: 'events',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      },
    }));

    // Simulate reading from localStorage
    const storedData = localStorage.getItem('github-raw-data-storage');
    expect(storedData).toBeDefined();

    if (storedData) {
      const parsedData = JSON.parse(storedData);
      expect(parsedData.rawEvents).toHaveLength(1);
      expect(parsedData.rawEvents[0].type).toBe('IssuesEvent');
      expect(parsedData.metadata.apiMode).toBe('events');
    }
  });

  it('should handle empty localStorage gracefully', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const storedData = localStorage.getItem('github-raw-data-storage');
    expect(storedData).toBeNull();
  });

  it('should handle corrupted localStorage data gracefully', () => {
    // Use real localStorage for this test
    const originalLocalStorage = window.localStorage;
    window.localStorage = globalThis.localStorage;
    try {
      // Store corrupted data
      window.localStorage.setItem('github-raw-data-storage', 'invalid json');
      const storedData = window.localStorage.getItem('github-raw-data-storage');
      expect(storedData).toBe('invalid json');
      // Test that JSON.parse would fail
      expect(() => JSON.parse(storedData!)).toThrow();
    } finally {
      window.localStorage.removeItem('github-raw-data-storage');
      window.localStorage = originalLocalStorage;
    }
  });
}); 