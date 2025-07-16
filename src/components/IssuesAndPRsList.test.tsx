import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import IssuesAndPRsList from './IssuesAndPRsList';
import { GitHubItem } from '../types';

// Mock the hooks and utilities
vi.mock('../hooks/useCopyFeedback', () => ({
  useCopyFeedback: () => ({
    isCopied: vi.fn().mockReturnValue(false),
    triggerCopy: vi.fn(),
  }),
}));

vi.mock('../hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: () => ({
    inputValue: '',
    setInputValue: vi.fn(),
    clearSearch: vi.fn(),
  }),
}));

vi.mock('../utils/clipboard', () => ({
  copyToClipboard: vi.fn(),
}));

vi.mock('../utils/resultsUtils', () => ({
  filterByText: vi.fn((results) => results),
  getItemType: vi.fn(() => 'issue'), // <-- Add this line
}));

// Mock the form context
const mockFormContext = {
  username: 'testuser',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  githubToken: 'test-token',
  apiMode: 'search' as const,
  setUsername: vi.fn(),
  setStartDate: vi.fn(),
  setEndDate: vi.fn(),
  setGithubToken: vi.fn(),
  setApiMode: vi.fn(),
  handleSearch: vi.fn(),
  handleUsernameBlur: vi.fn(),
  validateUsernameFormat: vi.fn(),
  loading: false,
  loadingProgress: '',
  error: null,
  searchItemsCount: 0,
  eventsCount: 0,
  rawEventsCount: 0,
  groupedEventsCount: 0,
};

vi.mock('../App', () => ({
  useFormContext: () => mockFormContext,
}));

// Mock data
const mockItems: GitHubItem[] = [
  {
    id: 1,
    event_id: '1',
    html_url: 'https://github.com/test/repo/issues/1',
    title: 'Test Issue 1',
    body: 'Test issue description 1',
    state: 'open',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    closed_at: undefined,
    user: {
      login: 'testuser1',
      avatar_url: 'https://github.com/testuser1.png',
      html_url: 'https://github.com/testuser1',
    },
    repository_url: 'https://api.github.com/repos/test/repo',
    labels: [],
  },
  {
    id: 2,
    event_id: '2',
    html_url: 'https://github.com/test/repo/issues/2',
    title: 'Test Issue 2',
    body: 'Test issue description 2',
    state: 'closed',
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
    closed_at: '2024-01-17T10:00:00Z',
    user: {
      login: 'testuser2',
      avatar_url: 'https://github.com/testuser2.png',
      html_url: 'https://github.com/testuser2',
    },
    repository_url: 'https://api.github.com/repos/test/repo',
    labels: [],
  },
];

// Mock button styles
const mockButtonStyles = {};

// Wrapper component for tests
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('IssuesAndPRsList', () => {
  it('should render without crashing', () => {
    render(
      <IssuesAndPRsList
        results={mockItems}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Should render the component without errors
    expect(screen.getByText('Issues and PRs')).toBeInTheDocument();
  });

  it('should display the provided results', () => {
    render(
      <IssuesAndPRsList
        results={mockItems}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Should display the issue titles
    expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
    expect(screen.getByText('Test Issue 2')).toBeInTheDocument();
  });

  it('should handle empty results', () => {
    render(
      <IssuesAndPRsList
        results={[]}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Should still render the component
    expect(screen.getByText('Issues and PRs')).toBeInTheDocument();
  });

  it('should render with different button styles', () => {
    const customButtonStyles = { backgroundColor: 'red' };
    
    render(
      <IssuesAndPRsList
        results={mockItems}
        buttonStyles={customButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Should render without errors
    expect(screen.getByText('Issues and PRs')).toBeInTheDocument();
  });
});
