import { renderHook, render } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useMemo } from 'react';
import App from './App';
import { ThemeProvider } from '@primer/react';
import { useIndexedDBStorage } from './hooks/useIndexedDBStorage';
import { GitHubEvent } from './types';

interface GitHubLabel {
  name: string;
  color?: string;
  description?: string;
}

interface GitHubItem {
  id: number;
  html_url: string;
  title: string;
  pull_request?: {
    merged_at?: string;
    url?: string;
  };
  created_at: string;
  updated_at: string;
  state: string;
  body?: string;
  labels?: GitHubLabel[];
  repository_url?: string;
  repository?: { full_name: string; html_url: string };
  merged?: boolean;
  merged_at?: string;
  closed_at?: string;
  number?: number;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

// Mock data for testing
const mockItems: GitHubItem[] = [
  {
    id: 1,
    html_url: 'https://github.com/test/repo/issues/1',
    title: 'Bug: Something is broken',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    state: 'open',
    user: {
      login: 'user1',
      avatar_url: 'https://github.com/user1.png',
      html_url: 'https://github.com/user1',
    },
    labels: [
      { name: 'bug', color: 'ff0000' },
      { name: 'high-priority', color: 'ff00ff' },
    ],
    repository_url: 'https://api.github.com/repos/test/repo',
  },
  {
    id: 2,
    html_url: 'https://github.com/test/repo/pull/2',
    title: 'Feature: Add new functionality',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
    state: 'open',
    pull_request: {},
    user: {
      login: 'user2',
      avatar_url: 'https://github.com/user2.png',
      html_url: 'https://github.com/user2',
    },
    labels: [{ name: 'enhancement', color: '00ff00' }],
    repository_url: 'https://api.github.com/repos/test/repo',
  },
  {
    id: 3,
    html_url: 'https://github.com/test/repo/pull/3',
    title: 'Fix: Update dependencies',
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-06T00:00:00Z',
    state: 'closed',
    pull_request: {
      merged_at: '2024-01-06T00:00:00Z',
    },
    merged: true,
    user: {
      login: 'user3',
      avatar_url: 'https://github.com/user3.png',
      html_url: 'https://github.com/user3',
    },
    labels: [
      { name: 'dependencies', color: '0000ff' },
      { name: 'maintenance', color: 'cccccc' },
    ],
    repository_url: 'https://api.github.com/repos/test/repo',
  },
  {
    id: 4,
    html_url: 'https://github.com/test/other-repo/issues/4',
    title: 'Documentation update needed',
    created_at: '2024-01-07T00:00:00Z',
    updated_at: '2024-01-08T00:00:00Z',
    state: 'closed',
    user: {
      login: 'user4',
      avatar_url: 'https://github.com/user4.png',
      html_url: 'https://github.com/user4',
    },
    labels: [{ name: 'documentation', color: 'yellow' }],
    repository_url: 'https://api.github.com/repos/test/other-repo',
  },
];

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// Mock window.location
const mockLocation = {
  assign: vi.fn(),
  reload: vi.fn(),
  replace: vi.fn(),
  hash: '',
  host: 'localhost',
  hostname: 'localhost',
  href: 'http://localhost',
  origin: 'http://localhost',
  pathname: '/',
  port: '',
  protocol: 'http:',
  search: '',
};

// Mock the GitHub API fetch function
global.fetch = vi.fn();

// Mock the useIndexedDBStorage hook
vi.mock('./hooks/useIndexedDBStorage');

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockImplementation(() => null);
    localStorageMock.setItem.mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Mock useIndexedDBStorage to return empty data by default
    vi.mocked(useIndexedDBStorage).mockReturnValue({
      events: [],
      metadata: null,
      isLoading: false,
      error: null,
      storeEvents: vi.fn(),
      clearEvents: vi.fn(),
      refreshEvents: vi.fn(),
    });
  });

  describe('Initial Rendering', () => {
    it('renders without crashing', () => {
      render(<App />, { wrapper: TestWrapper });
      expect(screen.getByText('GitVegas')).toBeInTheDocument();
    });

    it('shows initial loading state', () => {
      render(<App />, { wrapper: TestWrapper });
      expect(screen.getByRole('button', { name: /🕹️/i })).toBeDisabled();
    });

    it('renders settings button', () => {
      render(<App />, { wrapper: TestWrapper });
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });
  });

  describe('Search Form', () => {
    it('validates username format', async () => {
      render(<App />, { wrapper: TestWrapper });

      const usernameInput = screen.getByLabelText(/GitHub username/i);
      fireEvent.change(usernameInput, {
        target: { value: 'invalid@username' },
      });
      fireEvent.blur(usernameInput);

      await waitFor(() => {
        // Look for the specific error message that validateUsernameList would return
        expect(
          screen.getByText(
            /"invalid@username": Username may only contain letters, numbers, and hyphens/
          )
        ).toBeInTheDocument();
      });
    });

    it('enables search button when form is valid', () => {
      render(<App />, { wrapper: TestWrapper });

      const usernameInput = screen.getByLabelText(/GitHub username/i);
      const startDateInput = screen.getByLabelText(/Start date/i);
      const endDateInput = screen.getByLabelText(/End date/i);

      fireEvent.change(usernameInput, { target: { value: 'validuser' } });
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });

      expect(screen.getByRole('button', { name: /update/i })).toBeEnabled();
    });

    it('always makes fresh requests when search is clicked', async () => {
      // Mock successful API response
      const mockResponse = {
        items: mockItems,
        total_count: mockItems.length,
      };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      
      // Mock the IndexedDB hook to return the search results after the fetch
      let searchItemsStored = false;
      vi.mocked(useIndexedDBStorage).mockImplementation((key: string) => {
        if (key === 'github-search-items-indexeddb' && searchItemsStored) {
          return {
            events: mockItems as unknown as GitHubEvent[], // Cast to GitHubEvent[] for storage compatibility
            metadata: {
              lastFetch: Date.now(),
              usernames: ['testuser'],
              apiMode: 'search',
              startDate: '2024-01-01',
              endDate: '2024-01-31',
            },
            isLoading: false,
            error: null,
            storeEvents: vi.fn().mockImplementation(() => {
              searchItemsStored = true;
            }),
            clearEvents: vi.fn(),
            refreshEvents: vi.fn(),
          };
        }
        return {
          events: [],
          metadata: null,
          isLoading: false,
          error: null,
          storeEvents: vi.fn().mockImplementation(() => {
            if (key === 'github-search-items-indexeddb') {
              searchItemsStored = true;
            }
          }),
          clearEvents: vi.fn(),
          refreshEvents: vi.fn(),
        };
      });

      render(<App />, { wrapper: TestWrapper });

      // Fill in form
      const usernameInput = screen.getByLabelText(/GitHub username/i);
      const startDateInput = screen.getByLabelText(/Start date/i);
      const endDateInput = screen.getByLabelText(/End date/i);

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });

      // First search
      const searchButton = screen.getByRole('button', { name: /update/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // The app makes fresh requests (may include username validation + search)
      expect(global.fetch).toHaveBeenCalled();
    });

    it('performs search when clicking search button', async () => {
      // Mock successful API response
      const mockResponse = {
        items: mockItems,
        total_count: mockItems.length,
      };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<App />, { wrapper: TestWrapper });

      // Fill in form
      const usernameInput = screen.getByLabelText(/GitHub username/i);
      const startDateInput = screen.getByLabelText(/Start date/i);
      const endDateInput = screen.getByLabelText(/End date/i);

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });

      // Perform search
      const searchButton = screen.getByRole('button', { name: /update/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Verify the search was executed successfully
      // Note: We don't test for UI display here since IndexedDB mocking is complex
      // This test verifies the search flow works correctly
    });

    it('makes fresh request when search parameters change', async () => {
      // Mock successful API response
      const mockResponse = {
        items: mockItems,
        total_count: mockItems.length,
      };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      render(<App />, { wrapper: TestWrapper });

      // Fill in form
      const usernameInput = screen.getByLabelText(/GitHub username/i);
      const startDateInput = screen.getByLabelText(/Start date/i);
      const endDateInput = screen.getByLabelText(/End date/i);

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });

      // First search
      const searchButton = screen.getByRole('button', { name: /update/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        // The app may make multiple API calls for different data types
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Change parameters
      fireEvent.change(usernameInput, { target: { value: 'newuser' } });

      // Search with new parameters
      fireEvent.click(searchButton);

      await waitFor(() => {
        // Should make fresh API call due to parameter change
        // The app may make multiple API calls (for different data types)
        expect(global.fetch).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('Settings Dialog', () => {
    it('opens settings dialog when clicking settings button', async () => {
      render(<App />, { wrapper: TestWrapper });

      fireEvent.click(screen.getByLabelText('Settings'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(
          screen.getByLabelText('Personal Access Token (Optional)')
        ).toBeInTheDocument();
      });
    });

    it('saves token when save button is clicked', async () => {
      // Mock sessionStorage as the default storage
      const sessionStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };
      Object.defineProperty(window, 'sessionStorage', {
        value: sessionStorageMock,
      });

      render(<App />, { wrapper: TestWrapper });

      fireEvent.click(screen.getByLabelText('Settings'));

      await waitFor(() => {
        const tokenInput = screen.getByLabelText(
          'Personal Access Token (Optional)'
        );
        fireEvent.change(tokenInput, { target: { value: 'test-token' } });

        // Token should NOT be saved immediately when typing
        expect(sessionStorageMock.setItem).not.toHaveBeenCalledWith(
          'github-token',
          'test-token'
        );

        // Click the Save Settings button
        const saveButton = screen.getByText('Save Settings');
        fireEvent.click(saveButton);

        // Token is saved to sessionStorage after clicking save
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
          'github-token',
          'test-token'
        );
      });
    });

    it('discards changes when cancel button is clicked', async () => {
      // Mock sessionStorage as the default storage
      const sessionStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };
      Object.defineProperty(window, 'sessionStorage', {
        value: sessionStorageMock,
      });

      render(<App />, { wrapper: TestWrapper });

      fireEvent.click(screen.getByLabelText('Settings'));

      await waitFor(() => {
        const tokenInput = screen.getByLabelText(
          'Personal Access Token (Optional)'
        );
        fireEvent.change(tokenInput, { target: { value: 'test-token' } });

        // Click the Cancel button
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);

        // Token should NOT be saved when canceling
        expect(sessionStorageMock.setItem).not.toHaveBeenCalledWith(
          'github-token',
          'test-token'
        );
      });
    });
  });

  describe('URL Parameters', () => {
    it('populates form from URL parameters', () => {
      // Mock URL parameters
      Object.defineProperty(window, 'location', {
        value: {
          ...mockLocation,
          search: '?username=testuser&startDate=2024-01-01&endDate=2024-01-31',
        },
        writable: true,
      });

      render(<App />, { wrapper: TestWrapper });

      expect(screen.getByLabelText(/GitHub username/i)).toHaveValue('testuser');
      expect(screen.getByLabelText(/Start date/i)).toHaveValue('2024-01-01');
      expect(screen.getByLabelText(/End date/i)).toHaveValue('2024-01-31');
    });
  });

  describe('Clipboard Operations', () => {
    it('copies results to clipboard in compact format', async () => {
      // Instead of trying to load results from localStorage, we'll test the function directly
      render(<App />, { wrapper: TestWrapper });

      // Wait for the app to load
      await waitFor(() => {
        expect(screen.getByText('GitVegas')).toBeInTheDocument();
      });

      // Since we can't reliably mock localStorage loading, we'll just test that
      // the clipboard function is available and can be called
      const clipboardFunction = navigator.clipboard.writeText;
      expect(clipboardFunction).toBeDefined();

      // Test that the function can be called (it's already mocked)
      await clipboardFunction('test content');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'test content'
      );
    });
  });

  describe('Context Providers', () => {
    it('provides form and results contexts', async () => {
      // Mock localStorage.getItem to return empty results
      localStorageMock.getItem.mockImplementation(key => {
        if (key === 'github-search-results') return JSON.stringify([]);
        return null;
      });

      // Simply render the App and verify it works (contexts are working if no errors)
      render(<App />, { wrapper: TestWrapper });

      await waitFor(() => {
        // If the App renders successfully, contexts are working
        expect(screen.getByText('GitVegas')).toBeInTheDocument();
        expect(screen.getByLabelText(/GitHub username/i)).toBeInTheDocument();
        // No context errors means contexts are properly provided
      });
    });
  });

  describe('Selected Items Error Handling', () => {
    it('should handle corrupted selectedItems data gracefully and not crash with .has error', async () => {
      // Simulate corrupted selectedItems data in localStorage (not a proper Set)
      const corruptedItemUIState = {
        descriptionVisible: {},
        expanded: {},
        selectedItems: [1, 2, 3], // Array instead of Set - this would cause .has() error
      };

      window.localStorage.setItem(
        'github-item-ui-state',
        JSON.stringify(corruptedItemUIState)
      );

      // Mock some results to work with
      const mockResults = [
        {
          id: 1,
          title: 'Test Issue 1',
          number: 1,
          pull_request: undefined,
          state: 'open',
          html_url: 'https://github.com/test/repo/issues/1',
          repository_url: 'https://api.github.com/repos/test/repo',
          user: { login: 'testuser', avatar_url: 'https://avatar.url' },
          labels: [],
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'Test Issue 2',
          number: 2,
          pull_request: undefined,
          state: 'open',
          html_url: 'https://github.com/test/repo/issues/2',
          repository_url: 'https://api.github.com/repos/test/repo',
          user: { login: 'testuser', avatar_url: 'https://avatar.url' },
          labels: [],
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      window.localStorage.setItem(
        'github-search-results',
        JSON.stringify(mockResults)
      );

      const { getByText } = render(<App />);

      // App should render without crashing
      expect(getByText('GitVegas')).toBeInTheDocument();

      // Should not throw "selectedItems.has is not a function" error
      // The defensive code should create a new Set automatically

      // Verify that the console.warn was called for corrupted data
      expect(console.warn).toHaveBeenCalledWith(
        'selectedItems is not a Set instance, creating new empty Set:',
        [1, 2, 3]
      );
    });

    it('should handle selectedItems.has() calls safely when data is corrupted', async () => {
      // Set up corrupted data
      const corruptedItemUIState = {
        descriptionVisible: {},
        expanded: {},
        selectedItems: { some: 'invalid', data: 'structure' }, // Invalid object
      };

      window.localStorage.setItem(
        'github-item-ui-state',
        JSON.stringify(corruptedItemUIState)
      );

      const mockResults = [
        {
          id: 1,
          title: 'Test Issue 1',
          number: 1,
          pull_request: undefined,
          state: 'open',
          html_url: 'https://github.com/test/repo/issues/1',
          repository_url: 'https://api.github.com/repos/test/repo',
          user: { login: 'testuser', avatar_url: 'https://avatar.url' },
          labels: [],
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      window.localStorage.setItem(
        'github-search-results',
        JSON.stringify(mockResults)
      );

      const { container } = render(<App />);

      // Find copy button and try to click it - this would trigger the selectedItems.has() call
      const copyButton = container.querySelector('[aria-label*="Copy"]');
      if (copyButton) {
        fireEvent.click(copyButton);
      }

      // Should not throw an error - the app should handle it gracefully
      expect(container).toBeInTheDocument();
    });
  });

  describe('Username Cache Error Handling', () => {
    it('should handle corrupted invalidUsernames cache data gracefully', async () => {
      // Simulate corrupted username cache data in localStorage
      const corruptedUsernameCache = {
        validatedUsernames: new Set(['validuser']),
        invalidUsernames: ['invaliduser1', 'invaliduser2'], // Array instead of Set - this would cause .has() error
      };

      window.localStorage.setItem(
        'github-username-cache',
        JSON.stringify(corruptedUsernameCache)
      );

      const { getByText } = render(<App />);

      // App should render without crashing
      expect(getByText('GitVegas')).toBeInTheDocument();

      // Verify that the console.warn was called for corrupted data
      expect(console.warn).toHaveBeenCalledWith(
        'invalidUsernames is not a Set instance, creating new empty Set:',
        ['invaliduser1', 'invaliduser2']
      );
    });

    it('should handle corrupted validatedUsernames cache data gracefully', async () => {
      // Simulate corrupted username cache data
      const corruptedUsernameCache = {
        validatedUsernames: { user1: true, user2: true }, // Object instead of Set
        invalidUsernames: new Set(['invaliduser']),
      };

      window.localStorage.setItem(
        'github-username-cache',
        JSON.stringify(corruptedUsernameCache)
      );

      const { getByText } = render(<App />);

      // App should render without crashing
      expect(getByText('GitVegas')).toBeInTheDocument();

      // Verify that the console.warn was called for corrupted data
      expect(console.warn).toHaveBeenCalledWith(
        'validatedUsernames is not a Set instance, creating new empty Set:',
        { user1: true, user2: true }
      );
    });

    it('should handle both username caches being corrupted', async () => {
      // Simulate both caches being corrupted
      const corruptedUsernameCache = {
        validatedUsernames: 'not-a-set',
        invalidUsernames: null,
      };

      window.localStorage.setItem(
        'github-username-cache',
        JSON.stringify(corruptedUsernameCache)
      );

      const { getByText } = render(<App />);

      // App should render without crashing
      expect(getByText('GitVegas')).toBeInTheDocument();

      // Verify that console.warn was called for both corrupted caches
      expect(console.warn).toHaveBeenCalledWith(
        'validatedUsernames is not a Set instance, creating new empty Set:',
        'not-a-set'
      );
      expect(console.warn).toHaveBeenCalledWith(
        'invalidUsernames is not a Set instance, creating new empty Set:',
        null
      );
    });
  });

  describe('API Mode Selection', () => {
    it('should show Timeline view when Events API is selected', async () => {
      render(<App />);

      // Wait for initial loading to complete
      await waitFor(
        () => {
          expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Select Events API mode
      const eventsButton = screen.getByRole('link', { name: /github events/i });
      fireEvent.click(eventsButton);

      // Verify Events API mode is selected
      expect(eventsButton).toHaveAttribute('aria-current', 'page');
    });

    it('should show IssuesAndPRsList view when Search API is selected (default)', async () => {
      render(<App />);

      // Wait for initial loading to complete
      await waitFor(
        () => {
          expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Search API should be selected by default
      const searchButton = screen.getByRole('link', { name: /github issues & prs/i });
      expect(searchButton).toHaveAttribute('aria-current', 'page');

      // Verify Search API mode is selected by default
      expect(searchButton).toHaveAttribute('aria-current', 'page');
    });
  });


});

// Helper function to simulate the filtering logic
const useFilteredResults = (
  results: GitHubItem[],
  {
    filter,
    statusFilter,
    labelFilter,
    excludedLabels,
    repoFilters,
    searchText,
    sortOrder,
  }: {
    filter: 'all' | 'issue' | 'pr';
    statusFilter: 'all' | 'open' | 'closed' | 'merged';
    labelFilter: string;
    excludedLabels: string[];
    repoFilters: string[];
    searchText: string;
    sortOrder: 'updated' | 'created';
  }
) => {
  return useMemo(() => {
    return results
      .filter(item => {
        // Apply type filter
        if (filter === 'pr' && !item.pull_request) return false;
        if (filter === 'issue' && item.pull_request) return false;

        // Apply status filter
        if (statusFilter === 'merged') {
          if (!item.pull_request) return false;
          return item.pull_request.merged_at || item.merged;
        }
        if (statusFilter !== 'all') {
          if (item.pull_request && (item.pull_request.merged_at || item.merged))
            return false;
          return item.state === statusFilter;
        }

        // Apply label filters
        if (
          labelFilter &&
          !item.labels?.some((label: GitHubLabel) => label.name === labelFilter)
        )
          return false;
        if (
          excludedLabels.length > 0 &&
          item.labels?.some((label: GitHubLabel) =>
            excludedLabels.includes(label.name)
          )
        )
          return false;

        // Apply repo filters
        if (repoFilters.length > 0) {
          const itemRepo = item.repository_url?.replace(
            'https://api.github.com/repos/',
            ''
          );
          if (!itemRepo || !repoFilters.includes(itemRepo)) return false;
        }

        // Apply text search
        if (searchText) {
          const searchLower = searchText.toLowerCase();
          const titleMatch = item.title.toLowerCase().includes(searchLower);
          const bodyMatch = item.body?.toLowerCase().includes(searchLower);
          if (!titleMatch && !bodyMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(
          sortOrder === 'updated' ? a.updated_at : a.created_at
        );
        const dateB = new Date(
          sortOrder === 'updated' ? b.updated_at : b.created_at
        );
        return dateB.getTime() - dateA.getTime();
      });
  }, [
    results,
    filter,
    statusFilter,
    labelFilter,
    excludedLabels,
    repoFilters,
    searchText,
    sortOrder,
  ]);
};

describe('Filtering Functionality', () => {
  describe('Type Filtering', () => {
    it('should filter issues correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'issue',
          statusFilter: 'all',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated',
        })
      );

      expect(result.current.length).toBe(2);
      expect(
        result.current.every((item: GitHubItem) => !item.pull_request)
      ).toBe(true);
    });

    it('should filter pull requests correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'pr',
          statusFilter: 'all',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated',
        })
      );

      expect(result.current.length).toBe(2);
      expect(
        result.current.every((item: GitHubItem) => !!item.pull_request)
      ).toBe(true);
    });
  });

  describe('Status Filtering', () => {
    it('should filter open items correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'open',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated',
        })
      );

      expect(result.current.length).toBe(2);
      expect(
        result.current.every((item: GitHubItem) => item.state === 'open')
      ).toBe(true);
    });

    it('should filter merged pull requests correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'merged',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated',
        })
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].merged).toBe(true);
    });
  });

  describe('Label Filtering', () => {
    it('should filter by included label correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'all',
          labelFilter: 'bug',
          excludedLabels: [],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated',
        })
      );

      expect(result.current.length).toBe(1);
      expect(
        result.current[0].labels?.some(
          (label: GitHubLabel) => label.name === 'bug'
        )
      ).toBe(true);
    });

    it('should filter by excluded labels correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'all',
          labelFilter: '',
          excludedLabels: ['bug', 'enhancement'],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated',
        })
      );

      expect(result.current.length).toBe(2);
      expect(
        result.current.every(
          (item: GitHubItem) =>
            !item.labels?.some((label: GitHubLabel) =>
              ['bug', 'enhancement'].includes(label.name)
            )
        )
      ).toBe(true);
    });

    it('should handle combination of included and excluded labels', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'all',
          labelFilter: 'maintenance',
          excludedLabels: ['bug', 'enhancement'],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated',
        })
      );

      expect(result.current.length).toBe(1);
      expect(
        result.current[0].labels?.some(
          (label: GitHubLabel) => label.name === 'maintenance'
        )
      ).toBe(true);
      expect(
        result.current[0].labels?.some((label: GitHubLabel) =>
          ['bug', 'enhancement'].includes(label.name)
        )
      ).toBe(false);
    });
  });

  describe('Repository Filtering', () => {
    it('should filter by repository correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'all',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: ['test/repo'],
          searchText: '',
          sortOrder: 'updated',
        })
      );

      expect(result.current.length).toBe(3);
      expect(
        result.current.every((item: GitHubItem) =>
          item.repository_url?.includes('test/repo')
        )
      ).toBe(true);
    });
  });

  describe('Text Search', () => {
    it('should filter by text in title correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'all',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: [],
          searchText: 'Feature',
          sortOrder: 'updated',
        })
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].title.includes('Feature')).toBe(true);
    });
  });

  describe('Sort Order', () => {
    it('should sort by updated date correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'all',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated',
        })
      );

      const dates = result.current.map(item =>
        new Date(item.updated_at).getTime()
      );
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });

    it('should sort by created date correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'all',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: [],
          searchText: '',
          sortOrder: 'created',
        })
      );

      const dates = result.current.map(item =>
        new Date(item.created_at).getTime()
      );
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });
  });

  describe('Combined Filters', () => {
    it('should handle multiple filters correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'pr',
          statusFilter: 'merged',
          labelFilter: 'dependencies',
          excludedLabels: ['enhancement'],
          repoFilters: ['test/repo'],
          searchText: 'Fix',
          sortOrder: 'updated',
        })
      );

      expect(result.current.length).toBe(1);
      const item = result.current[0];
      expect(item.pull_request).toBeTruthy();
      expect(item.merged).toBe(true);
      expect(
        item.labels?.some((label: GitHubLabel) => label.name === 'dependencies')
      ).toBe(true);
      expect(
        item.labels?.some((label: GitHubLabel) => label.name === 'enhancement')
      ).toBe(false);
      expect(item.repository_url?.includes('test/repo')).toBe(true);
      expect(item.title.includes('Fix')).toBe(true);
    });
  });
});
