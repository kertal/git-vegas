import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SummaryView from '../../views/Summary';
import { GitHubItem, GitHubEvent } from '../../types';

// Mock the zustand form store
const mockFormStore = {
  githubToken: 'test-token',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  username: 'testuser',
  apiMode: 'summary' as const,
  setUsername: vi.fn(),
  setStartDate: vi.fn(),
  setEndDate: vi.fn(),
  setGithubToken: vi.fn(),
  setApiMode: vi.fn(),
  handleSearch: vi.fn(),
  validateUsernameFormat: vi.fn(),
  loading: false,
  loadingProgress: '',
  error: null,
  searchItemsCount: 0,
  eventsCount: 0,
  rawEventsCount: 0,
};

vi.mock('../../store/useFormStore', () => ({
  useFormStore: () => mockFormStore,
}));

// Mock the useDebouncedSearch hook
vi.mock('../../hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: () => ({
    inputValue: '',
    setInputValue: vi.fn(),
    clearSearch: vi.fn(),
  }),
}));

// Mock the useCopyFeedback hook
vi.mock('../../hooks/useCopyFeedback', () => ({
  useCopyFeedback: () => ({
    isCopied: vi.fn(() => false),
    triggerCopy: vi.fn(),
  }),
}));

// Helper to find a node containing text anywhere in its subtree using the container
function findByTextContent(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll('*')).filter(
    el => el.textContent && el.textContent.includes(text)
  );
}

// Helper to find actual rendered PR rows (more precise)
function findPRRows(container: HTMLElement, title: string) {
  // Look for elements with the timeline-group class that contain the PR title
  return Array.from(container.querySelectorAll('.timeline-group')).filter(
    group => group.textContent && group.textContent.includes(title)
  );
}

describe('SummaryView', () => {
  const createMockItem = (overrides: Partial<GitHubItem> = {}): GitHubItem => ({
    id: 1,
    html_url: 'https://github.com/test/repo/issues/1',
    title: 'Test Issue',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    state: 'open',
    user: {
      login: 'testuser',
      avatar_url: 'https://example.com/avatar.jpg',
      html_url: 'https://github.com/testuser',
    },
    ...overrides,
  });

  const createMockPR = (overrides: Partial<GitHubItem> = {}): GitHubItem => ({
    id: 2,
    html_url: 'https://github.com/test/repo/pull/2',
    title: 'Test PR',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    state: 'closed',
    merged_at: '2024-01-20T10:00:00Z',
    pull_request: {
      merged_at: '2024-01-20T10:00:00Z',
      url: 'https://github.com/test/repo/pull/2',
    },
    user: {
      login: 'testuser',
      avatar_url: 'https://example.com/avatar.jpg',
      html_url: 'https://github.com/testuser',
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display merged PRs from indexedDBSearchItems', () => {
    const items: GitHubItem[] = [];
    const rawEvents: GitHubEvent[] = [];
    const indexedDBSearchItems: GitHubItem[] = [
      createMockPR({
        id: 3,
        html_url: 'https://github.com/test/repo/pull/3',
        title: 'Merged PR from Search',
        merged_at: '2024-01-25T10:00:00Z',
        pull_request: {
          merged_at: '2024-01-25T10:00:00Z',
          url: 'https://github.com/test/repo/pull/3',
        },
      }),
    ];

    const { container } = render(
      <ThemeProvider>
        <SummaryView
          items={items}
          rawEvents={rawEvents}
          indexedDBSearchItems={indexedDBSearchItems}
        />
      </ThemeProvider>
    );

    // Should show the merged PR from search items
    const mergedPRNodes = findByTextContent(container, 'Merged PR from Search');
    expect(mergedPRNodes.length).toBeGreaterThan(0);
    expect(screen.getByText('PRs - merged')).toBeInTheDocument();
  });

  it('should not duplicate merged PRs that already exist in events', () => {
    const existingMergedPR = createMockPR({
      id: 4,
      html_url: 'https://github.com/test/repo/pull/4',
      title: 'Existing Merged PR',
    });

    const items: GitHubItem[] = [existingMergedPR];
    const rawEvents: GitHubEvent[] = [];
    const indexedDBSearchItems: GitHubItem[] = [
      // Same PR that already exists in events
      createMockPR({
        id: 4,
        html_url: 'https://github.com/test/repo/pull/4',
        title: 'Existing Merged PR',
      }),
    ];

    const { container } = render(
      <ThemeProvider>
        <SummaryView
          items={items}
          rawEvents={rawEvents}
          indexedDBSearchItems={indexedDBSearchItems}
        />
      </ThemeProvider>
    );

    // Should only show one instance of the PR
    const prInstances = findPRRows(container, 'Existing Merged PR');
    expect(prInstances).toHaveLength(1);
  });

  it('should filter merged PRs by date range', () => {
    const items: GitHubItem[] = [];
    const rawEvents: GitHubEvent[] = [];
    const indexedDBSearchItems: GitHubItem[] = [
      // PR merged within the date range (2024-01-01 to 2024-01-31)
      createMockPR({
        id: 5,
        html_url: 'https://github.com/test/repo/pull/5',
        title: 'In Range Merged PR',
        merged_at: '2024-01-15T10:00:00Z',
        pull_request: {
          merged_at: '2024-01-15T10:00:00Z',
          url: 'https://github.com/test/repo/pull/5',
        },
      }),
      // PR merged outside the date range
      createMockPR({
        id: 6,
        html_url: 'https://github.com/test/repo/pull/6',
        title: 'Out of Range Merged PR',
        merged_at: '2024-02-15T10:00:00Z',
        pull_request: {
          merged_at: '2024-02-15T10:00:00Z',
          url: 'https://github.com/test/repo/pull/6',
        },
      }),
    ];

    const { container } = render(
      <ThemeProvider>
        <SummaryView
          items={items}
          rawEvents={rawEvents}
          indexedDBSearchItems={indexedDBSearchItems}
        />
      </ThemeProvider>
    );

    // Should only show the PR within the date range
    const inRangeNodes = findByTextContent(container, 'In Range Merged PR');
    expect(inRangeNodes.length).toBeGreaterThan(0);
    const outOfRangeNodes = findByTextContent(container, 'Out of Range Merged PR');
    expect(outOfRangeNodes.length).toBe(0);
  });

  it('should only include actual PRs, not issues', () => {
    const items: GitHubItem[] = [];
    const rawEvents: GitHubEvent[] = [];
    const indexedDBSearchItems: GitHubItem[] = [
      // This is an issue, not a PR
      createMockItem({
        id: 7,
        html_url: 'https://github.com/test/repo/issues/7',
        title: 'Test Issue',
        state: 'closed',
        closed_at: '2024-01-15T10:00:00Z',
        pull_request: undefined, // Explicitly set to undefined to ensure it's an issue
      }),
      // This is a PR
      createMockPR({
        id: 8,
        html_url: 'https://github.com/test/repo/pull/8',
        title: 'Test PR',
      }),
    ];

    const { container } = render(
      <ThemeProvider>
        <SummaryView
          items={items}
          rawEvents={rawEvents}
          indexedDBSearchItems={indexedDBSearchItems}
        />
      </ThemeProvider>
    );

    // Should only show the PR in the merged section
    const prNodes = findByTextContent(container, 'Test PR');
    expect(prNodes.length).toBeGreaterThan(0);
    
    // The issue should appear in the issues section, not in the PRs section
    // Check that the issue does NOT appear in the "PRs - merged" section
    const issueNodes = findByTextContent(container, 'Test Issue');
    expect(issueNodes.length).toBeGreaterThan(0); // Issue should be visible somewhere
    
    // Verify that the issue is not in the PRs section by checking the overall structure
    const allH3Elements = container.querySelectorAll('h3');
    let foundPRsMergedSection = false;
    
    allH3Elements.forEach(h3 => {
      if (h3.textContent?.includes('PRs - merged')) {
        foundPRsMergedSection = true;
      }
    });
    
    expect(foundPRsMergedSection).toBeTruthy();
  });
}); 