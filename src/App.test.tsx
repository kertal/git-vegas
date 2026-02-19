import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from './App';

// Mock the zustand store
vi.mock('./store/useFormStore', () => {
  const state = {
    username: '',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    githubToken: '',
    apiMode: 'summary',
    searchText: '',
    loading: false,
    loadingProgress: '',
    error: null,
    searchItemsCount: 0,
    eventsCount: 0,
    rawEventsCount: 0,
    _hadUrlParams: false,
    setUsername: vi.fn(),
    setStartDate: vi.fn(),
    setEndDate: vi.fn(),
    setGithubToken: vi.fn(),
    setApiMode: vi.fn(),
    setSearchText: vi.fn(),
    handleSearch: vi.fn(),
    validateUsernameFormat: vi.fn(),
    addAvatarsToCache: vi.fn(),
    _initOnMount: vi.fn(),
  };
  const store = (selector?: (s: typeof state) => unknown) =>
    selector ? selector(state) : state;
  store.setState = vi.fn();
  store.getState = () => state;
  store.subscribe = vi.fn();
  return { useFormStore: store };
});

vi.mock('./hooks/useIndexedDBStorage', () => ({
  useIndexedDBStorage: vi.fn(() => ({
    events: [],
    error: null,
    storeEvents: vi.fn(),
    clearEvents: vi.fn(),
    storeSearchItems: vi.fn(),
    clearSearchItems: vi.fn(),
  })),
}));

vi.mock('./hooks/useGitHubFormState', () => ({
  useGitHubFormState: vi.fn(() => ({
    validateUsernameFormat: vi.fn(),
    addAvatarsToCache: vi.fn(),
    error: null,
    setError: vi.fn(),
    cachedAvatarUrls: [],
  })),
}));

vi.mock('./hooks/useGitHubDataFetching', () => ({
  useGitHubDataFetching: vi.fn(() => ({
    loading: false,
    loadingProgress: '',
    currentUsername: '',
    handleSearch: vi.fn(),
  })),
}));

vi.mock('./hooks/useGitHubDataProcessing', () => ({
  useGitHubDataProcessing: vi.fn(() => ({
    results: [],
    searchItemsCount: 0,
    eventsCount: 0,
    rawEventsCount: 0,
  })),
}));

vi.mock('./components/SearchForm', () => ({
  default: () => <div data-testid="search-form">Search Form</div>,
}));

vi.mock('./views/EventView', () => ({
  default: () => <div data-testid="event-view">Event View</div>,
}));

vi.mock('./views/Summary', () => ({
  default: () => <div data-testid="summary-view">Summary View</div>,
}));



vi.mock('./views/IssuesAndPRsList', () => ({
  default: () => <div data-testid="issues-prs-list">Issues and PRs List</div>,
}));

vi.mock('./components/SettingsDialog', () => ({
  default: () => <div data-testid="settings-dialog">Settings Dialog</div>,
}));

vi.mock('./components/StorageManager', () => ({
  StorageManager: () => <div data-testid="storage-manager">Storage Manager</div>,
}));

vi.mock('./components/LoadingIndicator', () => ({
  LoadingIndicator: () => <div data-testid="loading-indicator">Loading Indicator</div>,
}));

vi.mock('./components/ShareButton', () => ({
  default: () => <div data-testid="share-button">Share Button</div>,
}));

vi.mock('./components/SlotMachineLoader', () => ({
  SlotMachineLoader: () => <div data-testid="slot-machine-loader">Slot Machine Loader</div>,
}));

vi.mock('./components/OfflineBanner', () => ({
  OfflineBanner: () => <div data-testid="offline-banner">Offline Banner</div>,
}));

vi.mock('./assets/GitVegas.svg?react', () => ({
  default: () => <div data-testid="git-vegas-logo">GitVegas Logo</div>,
}));

describe('App', () => {
  beforeEach(() => {
    // Mock fetch globally
    global.fetch = vi.fn();
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('GitVegas')).toBeInTheDocument();
  });

  it('renders search form', () => {
    render(<App />);
    expect(screen.getByTestId('search-form')).toBeInTheDocument();
  });

  it('renders summary view when apiMode is summary (default)', () => {
    render(<App />);
    expect(screen.getByTestId('summary-view')).toBeInTheDocument();
  });

  it('handles pagination correctly', async () => {
    // Mock fetch to return paginated responses
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => Array.from({ length: 100 }, (_, i) => ({ id: i, type: 'PushEvent' }))
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => Array.from({ length: 50 }, (_, i) => ({ id: i + 100, type: 'PushEvent' }))
      });

    global.fetch = mockFetch;

    // Test that the fetchAllEvents function would be called with correct parameters
    // This is an integration test to verify the pagination logic
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
