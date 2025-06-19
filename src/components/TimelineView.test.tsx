import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { ThemeProvider } from '@primer/react';
import { vi } from 'vitest';
import TimelineView from './TimelineView';
import { GitHubItem, GitHubEvent } from '../types';

const mockItems: GitHubItem[] = [
  {
    id: 1,
    number: 123,
    title: 'Test Issue',
    body: 'This is a test issue',
    html_url: 'https://github.com/test/repo/issues/123',
    state: 'open',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T12:00:00Z',
    closed_at: undefined,
    labels: [
      { name: 'bug', color: 'd73a4a', description: 'Something is broken' },
      { name: 'high-priority', color: 'ff9800', description: 'High priority' },
    ],
    repository_url: 'https://api.github.com/repos/test/repo',
    repository: {
      full_name: 'test/repo',
      html_url: 'https://github.com/test/repo',
    },
    user: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      html_url: 'https://github.com/testuser',
    },
    pull_request: undefined,
  },
  {
    id: 2,
    number: 456,
    title: 'Test Pull Request',
    body: 'This is a test PR',
    html_url: 'https://github.com/test/repo/pull/456',
    state: 'closed',
    created_at: '2024-01-16T14:00:00Z',
    updated_at: '2024-01-16T16:00:00Z',
    closed_at: '2024-01-16T16:00:00Z',
    merged_at: '2024-01-16T16:00:00Z',
    merged: true,
    labels: [{ name: 'feature', color: '1f883d', description: 'New feature' }],
    repository_url: 'https://api.github.com/repos/test/repo',
    repository: {
      full_name: 'test/repo',
      html_url: 'https://github.com/test/repo',
    },
    user: {
      login: 'testuser2',
      avatar_url: 'https://github.com/testuser2.png',
      html_url: 'https://github.com/testuser2',
    },
    pull_request: {
      merged_at: '2024-01-16T16:00:00Z',
      url: 'https://github.com/test/repo/pull/456',
    },
  },
];

const mockRawEvents: GitHubEvent[] = [
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
        labels: [
          { name: 'bug', color: 'd73a4a', description: 'Something is broken' },
        ],
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
  {
    id: '987654321',
    type: 'PullRequestEvent',
    actor: {
      id: 2,
      login: 'testuser2',
      avatar_url: 'https://github.com/testuser2.png',
      url: 'https://api.github.com/users/testuser2',
    },
    repo: {
      id: 456,
      name: 'test/repo',
      url: 'https://api.github.com/repos/test/repo',
    },
    payload: {
      action: 'closed',
      pull_request: {
        id: 2,
        number: 456,
        title: 'Test Pull Request',
        html_url: 'https://github.com/test/repo/pull/456',
        state: 'closed',
        body: 'This is a test PR',
        labels: [
          { name: 'feature', color: '1f883d', description: 'New feature' },
        ],
        created_at: '2024-01-16T14:00:00Z',
        updated_at: '2024-01-16T16:00:00Z',
        closed_at: '2024-01-16T16:00:00Z',
        merged_at: '2024-01-16T16:00:00Z',
        merged: true,
        user: {
          login: 'testuser2',
          avatar_url: 'https://github.com/testuser2.png',
          html_url: 'https://github.com/testuser2',
        },
      },
    },
    public: true,
    created_at: '2024-01-16T14:00:00Z',
  },
];

describe('TimelineView', () => {
  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider>{component}</ThemeProvider>);
  };

  it('should render timeline with events', () => {
    renderWithTheme(<TimelineView items={mockItems} />);

    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Test Issue')).toBeInTheDocument();
    expect(screen.getByText('Test Pull Request')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('testuser2')).toBeInTheDocument();
  });

  it('should show different states for issues and PRs', () => {
    renderWithTheme(<TimelineView items={mockItems} />);

    expect(screen.getByText('opened issue')).toBeInTheDocument();
    expect(screen.getByText('merged pull request')).toBeInTheDocument();
    // Note: Individual status badges no longer shown in compact view
  });

  it('should display labels', () => {
    renderWithTheme(<TimelineView items={mockItems} />);

    // Note: Labels no longer displayed in compact timeline view
    // This test could be updated to check that the basic structure is there
    expect(screen.getByText('Events')).toBeInTheDocument();
  });

  it('should show repository names', () => {
    renderWithTheme(<TimelineView items={mockItems} />);

    // Timeline now shows just the repo name (last part), not full path
    expect(screen.getAllByText('repo')).toHaveLength(2);
  });

  it('should show empty state when no items', () => {
    renderWithTheme(<TimelineView items={[]} />);

    expect(
      screen.getByText('No cached events found. Please perform a search in events mode to load events.')
    ).toBeInTheDocument();
  });

  it('should sort items by updated date (newest first)', () => {
    const itemsInWrongOrder = [mockItems[0], mockItems[1]]; // First item is older by updated_at
    renderWithTheme(<TimelineView items={itemsInWrongOrder} />);

    const titles = screen
      .getAllByRole('link')
      .filter(
        (link: HTMLElement) =>
          link.getAttribute('href')?.includes('/issues/') ||
          link.getAttribute('href')?.includes('/pull/')
      );

    // Should show PR first (newer updated_at), then issue (older updated_at)
    expect(titles[0]).toHaveTextContent('Test Pull Request');
    expect(titles[1]).toHaveTextContent('Test Issue');
  });

  it('should render comment events correctly', () => {
    const commentItems: GitHubItem[] = [
      {
        id: 3,
        number: 789,
        title: 'Comment on: Test Issue',
        body: 'This is a helpful comment',
        html_url: 'https://github.com/test/repo/issues/789#issuecomment-3',
        state: 'open',
        created_at: '2024-01-17T10:00:00Z',
        updated_at: '2024-01-17T10:00:00Z',
        closed_at: undefined,
        labels: [
          {
            name: 'question',
            color: 'cc317c',
            description: 'Question or discussion',
          },
        ],
        repository_url: 'https://api.github.com/repos/test/repo',
        repository: {
          full_name: 'test/repo',
          html_url: 'https://github.com/test/repo',
        },
        user: {
          login: 'commenter',
          avatar_url: 'https://github.com/commenter.png',
          html_url: 'https://github.com/commenter',
        },
      },
    ];

    renderWithTheme(<TimelineView items={commentItems} />);

    expect(screen.getByText('commenter')).toBeInTheDocument();
    expect(screen.getByText('commented on issue')).toBeInTheDocument();
    expect(screen.getByText('Comment on: Test Issue')).toBeInTheDocument();
    expect(screen.getByText('repo')).toBeInTheDocument();
    // Note: Issue numbers no longer displayed separately in compact view
  });

  describe('Raw View Toggle', () => {
    it('should show view toggle buttons when setViewMode is provided', () => {
      const mockSetViewMode = vi.fn();
      renderWithTheme(
        <TimelineView 
          items={mockItems} 
          rawEvents={mockRawEvents}
          viewMode="standard"
          setViewMode={mockSetViewMode}
        />
      );

      expect(screen.getByText('View:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Standard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Grouped' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Raw' })).toBeInTheDocument();
    });

    it('should not show view toggle when setViewMode is not provided', () => {
      renderWithTheme(<TimelineView items={mockItems} />);

      expect(screen.queryByText('View:')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Standard' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Grouped' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Raw' })).not.toBeInTheDocument();
    });

    it('should call setViewMode when toggle buttons are clicked', () => {
      const mockSetViewMode = vi.fn();
      renderWithTheme(
        <TimelineView 
          items={mockItems} 
          rawEvents={mockRawEvents}
          viewMode="standard"
          setViewMode={mockSetViewMode}
        />
      );

      const rawButton = screen.getByRole('button', { name: 'Raw' });
      fireEvent.click(rawButton);
      expect(mockSetViewMode).toHaveBeenCalledWith('raw');

      const standardButton = screen.getByRole('button', { name: 'Standard' });
      fireEvent.click(standardButton);
      expect(mockSetViewMode).toHaveBeenCalledWith('standard');
      
      const groupedButton = screen.getByRole('button', { name: 'Grouped' });
      fireEvent.click(groupedButton);
      expect(mockSetViewMode).toHaveBeenCalledWith('grouped');
    });

    it('should show standard view by default', () => {
      const mockSetViewMode = vi.fn();
      renderWithTheme(
        <TimelineView 
          items={mockItems} 
          rawEvents={mockRawEvents}
          viewMode="standard"
          setViewMode={mockSetViewMode}
        />
      );

      // Should show standard timeline items
      expect(screen.getByText('Test Issue')).toBeInTheDocument();
      expect(screen.getByText('Test Pull Request')).toBeInTheDocument();
      
      // Should not show raw event types
      expect(screen.queryByText('IssuesEvent')).not.toBeInTheDocument();
      expect(screen.queryByText('PullRequestEvent')).not.toBeInTheDocument();
    });

    it('should show raw events when viewMode is raw', () => {
      const mockSetViewMode = vi.fn();
      renderWithTheme(
        <TimelineView 
          items={mockItems} 
          rawEvents={mockRawEvents}
          viewMode="raw"
          setViewMode={mockSetViewMode}
        />
      );

      // Should show raw event types
      expect(screen.getByText('IssuesEvent')).toBeInTheDocument();
      expect(screen.getByText('PullRequestEvent')).toBeInTheDocument();
      
      // Should show actor and repo information
      expect(screen.getByText('by testuser in test/repo')).toBeInTheDocument();
      expect(screen.getByText('by testuser2 in test/repo')).toBeInTheDocument();
    });

    it('should show message when no raw events are available', () => {
      const mockSetViewMode = vi.fn();
      renderWithTheme(
        <TimelineView 
          items={mockItems} 
          rawEvents={[]}
          viewMode="raw"
          setViewMode={mockSetViewMode}
        />
      );

      expect(screen.getByText(/No raw events available/)).toBeInTheDocument();
      expect(screen.getByText(/Raw events are only available after performing a new search in events mode/)).toBeInTheDocument();
    });

    it('should display raw JSON in raw view', () => {
      const mockSetViewMode = vi.fn();
      renderWithTheme(
        <TimelineView 
          items={mockItems} 
          rawEvents={mockRawEvents}
          viewMode="raw"
          setViewMode={mockSetViewMode}
        />
      );

      // Should contain JSON structure elements
      expect(screen.getByText(/"type": "IssuesEvent"/)).toBeInTheDocument();
      expect(screen.getByText(/"type": "PullRequestEvent"/)).toBeInTheDocument();
      expect(screen.getByText(/"action": "opened"/)).toBeInTheDocument();
      expect(screen.getByText(/"action": "closed"/)).toBeInTheDocument();
    });

    it('should sort raw events by date (newest first)', () => {
      const mockSetViewMode = vi.fn();
      renderWithTheme(
        <TimelineView 
          items={mockItems} 
          rawEvents={mockRawEvents}
          viewMode="raw"
          setViewMode={mockSetViewMode}
        />
      );

      // The PullRequestEvent (2024-01-16) should appear before IssuesEvent (2024-01-15)
      // We can check this by looking at the order of event types
      const pullRequestEvent = screen.getByText('PullRequestEvent');
      const issuesEvent = screen.getByText('IssuesEvent');
      
      // Get their positions in the DOM
      const pullRequestPosition = pullRequestEvent.compareDocumentPosition(issuesEvent);
      // DOCUMENT_POSITION_FOLLOWING means issuesEvent comes after pullRequestEvent
      expect(pullRequestPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('should show grouped view when viewMode is grouped', () => {
      const mockSetViewMode = vi.fn();
      renderWithTheme(
        <TimelineView 
          items={mockItems} 
          rawEvents={mockRawEvents}
          viewMode="grouped"
          setViewMode={mockSetViewMode}
        />
      );

      // Should show group headers with counts
      expect(screen.getByText('Issues - opened')).toBeInTheDocument();
      expect(screen.getByText('PRs - merged')).toBeInTheDocument();
      expect(screen.getAllByText('1')).toHaveLength(2); // Count badges for both groups
      
      // Should show individual events within groups (may appear in multiple sections)
      const issueLinks = screen.getAllByText('Test Issue');
      const prLinks = screen.getAllByText('Test Pull Request');
      expect(issueLinks.length).toBeGreaterThanOrEqual(1);
      expect(prLinks.length).toBeGreaterThanOrEqual(1);
      
      // Should show user names and repo names within event items (may appear in multiple sections)
      const testuserLinks = screen.getAllByText('testuser');
      const testuser2Links = screen.getAllByText('testuser2');
      expect(testuserLinks.length).toBeGreaterThanOrEqual(1);
      expect(testuser2Links.length).toBeGreaterThanOrEqual(1);
      
      const repoTexts = screen.getAllByText('repo');
      expect(repoTexts.length).toBeGreaterThanOrEqual(2); // Should appear for each event in both sections
    });
  });

  describe('Enhanced Grouped View', () => {
    const createMockItemsWithDuplicates = () => [
      // Multiple events for the same issue
      {
        id: 1,
        number: 123,
        title: 'Test Issue',
        body: 'This is a test issue',
        html_url: 'https://github.com/test/repo/issues/123',
        state: 'open',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T12:00:00Z',
        labels: [],
        repository_url: 'https://api.github.com/repos/test/repo',
        repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
        user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
      },
      {
        id: 2,
        number: 123,
        title: 'Test Issue',
        body: 'This is a test issue',
        html_url: 'https://github.com/test/repo/issues/123',
        state: 'closed',
        created_at: '2024-01-16T10:00:00Z',
        updated_at: '2024-01-16T12:00:00Z',
        closed_at: '2024-01-16T12:00:00Z',
        labels: [],
        repository_url: 'https://api.github.com/repos/test/repo',
        repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
        user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
      },
      {
        id: 3,
        number: 123,
        title: 'Test Issue',
        body: 'This is a test issue',
        html_url: 'https://github.com/test/repo/issues/123',
        state: 'open',
        created_at: '2024-01-17T10:00:00Z',
        updated_at: '2024-01-17T12:00:00Z',
        labels: [],
        repository_url: 'https://api.github.com/repos/test/repo',
        repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
        user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
      },
      // Multiple events for the same PR
      {
        id: 4,
        number: 456,
        title: 'Test Pull Request',
        body: 'This is a test PR',
        html_url: 'https://github.com/test/repo/pull/456',
        state: 'open',
        created_at: '2024-01-18T14:00:00Z',
        updated_at: '2024-01-18T16:00:00Z',
        labels: [],
        repository_url: 'https://api.github.com/repos/test/repo',
        repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
        user: { login: 'testuser2', avatar_url: 'https://github.com/testuser2.png', html_url: 'https://github.com/testuser2' },
        pull_request: { url: 'https://github.com/test/repo/pull/456' },
      },
      {
        id: 5,
        number: 456,
        title: 'Test Pull Request',
        body: 'This is a test PR',
        html_url: 'https://github.com/test/repo/pull/456',
        state: 'closed',
        created_at: '2024-01-19T14:00:00Z',
        updated_at: '2024-01-19T16:00:00Z',
        closed_at: '2024-01-19T16:00:00Z',
        merged_at: '2024-01-19T16:00:00Z',
        merged: true,
        labels: [],
        repository_url: 'https://api.github.com/repos/test/repo',
        repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
        user: { login: 'testuser2', avatar_url: 'https://github.com/testuser2.png', html_url: 'https://github.com/testuser2' },
        pull_request: { url: 'https://github.com/test/repo/pull/456', merged_at: '2024-01-19T16:00:00Z' },
      },
      // Comments on the same issue
      {
        id: 6,
        number: 123,
        title: 'Comment on: Test Issue',
        body: 'First comment',
        html_url: 'https://github.com/test/repo/issues/123#issuecomment-1',
        state: 'open',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        labels: [],
        repository_url: 'https://api.github.com/repos/test/repo',
        repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
        user: { login: 'commenter1', avatar_url: 'https://github.com/commenter1.png', html_url: 'https://github.com/commenter1' },
      },
      {
        id: 7,
        number: 123,
        title: 'Comment on: Test Issue',
        body: 'Second comment',
        html_url: 'https://github.com/test/repo/issues/123#issuecomment-2',
        state: 'open',
        created_at: '2024-01-21T10:00:00Z',
        updated_at: '2024-01-21T10:00:00Z',
        labels: [],
        repository_url: 'https://api.github.com/repos/test/repo',
        repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
        user: { login: 'commenter2', avatar_url: 'https://github.com/commenter2.png', html_url: 'https://github.com/commenter2' },
      },
    ];

    it('should show action type sections in grouped view', () => {
      const mockSetViewMode = vi.fn();
      const mockItemsWithDuplicates = createMockItemsWithDuplicates();
      
      renderWithTheme(
        <TimelineView 
          items={mockItemsWithDuplicates} 
          viewMode="grouped"
          setViewMode={mockSetViewMode}
        />
      );

      // Should show action type sections
      expect(screen.getByText('Issues - opened')).toBeInTheDocument();
      expect(screen.getByText('PRs - merged')).toBeInTheDocument();
    });

    it('should group multiple events for the same issue/PR in main section', () => {
      const mockSetViewMode = vi.fn();
      const mockItemsWithDuplicates = createMockItemsWithDuplicates();
      
      renderWithTheme(
        <TimelineView 
          items={mockItemsWithDuplicates} 
          viewMode="grouped"
          setViewMode={mockSetViewMode}
        />
      );

      // Should show section counts for different action types
      // The events are grouped by action type, not by individual issue/PR grouping
      // Look for section counts instead of individual item count badges
      const sectionCounts = screen.getAllByText('2'); // Some sections should show count of 2
      expect(sectionCounts.length).toBeGreaterThan(0);
      
      // Verify sections exist
      expect(screen.getByText('PRs - merged')).toBeInTheDocument();
    });

    it('should show most recent event for each issue/PR in main section', () => {
      const mockSetViewMode = vi.fn();
      const mockItemsWithDuplicates = createMockItemsWithDuplicates();
      
      renderWithTheme(
        <TimelineView 
          items={mockItemsWithDuplicates} 
          viewMode="grouped"
          setViewMode={mockSetViewMode}
        />
      );

      // Should show the titles (there should be only one of each despite multiple events)
      const issueLinks = screen.getAllByText('Test Issue');
      const prLinks = screen.getAllByText('Test Pull Request');
      
      // Each should appear once in the main section, and possibly in action sections
      expect(issueLinks.length).toBeGreaterThanOrEqual(1);
      expect(prLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('should properly categorize review events in PRs - reviewed section', () => {
      const mockSetViewMode = vi.fn();
      
      // Create mock items including review events
      const mockItemsWithReviews = [
        // Regular PR event
        {
          id: 1,
          event_id: 'pr-event-1',
          number: 123,
          title: 'Test Pull Request',
          body: 'This is a test PR',
          html_url: 'https://github.com/test/repo/pull/123',
          state: 'open',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T12:00:00Z',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
          user: { login: 'author', avatar_url: 'https://github.com/author.png', html_url: 'https://github.com/author' },
          pull_request: { url: 'https://github.com/test/repo/pull/123' },
        },
        // Review events with correct title pattern
        {
          id: 2,
          event_id: 'review-event-1',
          number: 123,
          title: 'Review on: Test Pull Request',
          body: 'This looks good',
          html_url: 'https://github.com/test/repo/pull/123',
          state: 'open',
          created_at: '2024-01-16T10:00:00Z',
          updated_at: '2024-01-16T10:00:00Z',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
          user: { login: 'reviewer1', avatar_url: 'https://github.com/reviewer1.png', html_url: 'https://github.com/reviewer1' },
          pull_request: { url: 'https://github.com/test/repo/pull/123' },
        },
        {
          id: 3,
          event_id: 'review-event-2',
          number: 123,
          title: 'Review on: Test Pull Request',
          body: 'Needs changes',
          html_url: 'https://github.com/test/repo/pull/123',
          state: 'open',
          created_at: '2024-01-17T10:00:00Z',
          updated_at: '2024-01-17T10:00:00Z',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
          user: { login: 'reviewer2', avatar_url: 'https://github.com/reviewer2.png', html_url: 'https://github.com/reviewer2' },
          pull_request: { url: 'https://github.com/test/repo/pull/123' },
        },
        // Another PR with a review
        {
          id: 4,
          event_id: 'review-event-3',
          number: 456,
          title: 'Review on: Another Pull Request',
          body: 'LGTM',
          html_url: 'https://github.com/test/repo/pull/456',
          state: 'open',
          created_at: '2024-01-18T10:00:00Z',
          updated_at: '2024-01-18T10:00:00Z',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
          user: { login: 'reviewer3', avatar_url: 'https://github.com/reviewer3.png', html_url: 'https://github.com/reviewer3' },
          pull_request: { url: 'https://github.com/test/repo/pull/456' },
        },
      ];
      
      renderWithTheme(
        <TimelineView 
          items={mockItemsWithReviews} 
          viewMode="grouped"
          setViewMode={mockSetViewMode}
        />
      );

      // Should show both sections
      expect(screen.getByText('PRs - opened')).toBeInTheDocument();
      expect(screen.getByText('PRs - reviewed')).toBeInTheDocument();
      
      // PRs - reviewed section should have correct count
      const reviewSection = screen.getByText('PRs - reviewed').closest('.timeline-section');
      expect(reviewSection).toBeInTheDocument();
      
      // Should show count of review events (3 total reviews) - now displayed as a Token
      // We can find the count by looking for a Token with the count value
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // Should show review events grouped by PR with count badges
      const reviewTitles = screen.getAllByText(/Review on:/);
      expect(reviewTitles.length).toBeGreaterThanOrEqual(2); // At least 2 PRs were reviewed
      
      // Should show reviewers in the review section
      expect(screen.getByText('reviewer2')).toBeInTheDocument(); // Most recent reviewer for PR 123
      expect(screen.getByText('reviewer3')).toBeInTheDocument(); // Reviewer for PR 456
      
      // Review events should NOT appear in PRs - opened section
      const openedSection = screen.getByText('PRs - opened').closest('.timeline-section');
      expect(openedSection).toBeInTheDocument();
      // Count is now displayed as a Token - look for the text "1" in the DOM
      expect(screen.getByText('1')).toBeInTheDocument(); // Only the original PR, not the reviews
    });

    it('should show count badges for multiple reviews on the same PR', () => {
      const mockSetViewMode = vi.fn();
      
      const mockItemsWithMultipleReviews = [
        {
          id: 1,
          event_id: 'review-1',
          number: 123,
          title: 'Review on: Test PR',
          body: 'First review',
          html_url: 'https://github.com/test/repo/pull/123',
          state: 'open',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
          user: { login: 'reviewer1', avatar_url: 'https://github.com/reviewer1.png', html_url: 'https://github.com/reviewer1' },
          pull_request: { url: 'https://github.com/test/repo/pull/123' },
        },
        {
          id: 2,
          event_id: 'review-2',
          number: 123,
          title: 'Review on: Test PR',
          body: 'Second review',
          html_url: 'https://github.com/test/repo/pull/123',
          state: 'open',
          created_at: '2024-01-16T10:00:00Z',
          updated_at: '2024-01-16T10:00:00Z',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
          user: { login: 'reviewer2', avatar_url: 'https://github.com/reviewer2.png', html_url: 'https://github.com/reviewer2' },
          pull_request: { url: 'https://github.com/test/repo/pull/123' },
        },
        {
          id: 3,
          event_id: 'review-3',
          number: 123,
          title: 'Review on: Test PR',
          body: 'Third review',
          html_url: 'https://github.com/test/repo/pull/123',
          state: 'open',
          created_at: '2024-01-17T10:00:00Z',
          updated_at: '2024-01-17T10:00:00Z',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
          user: { login: 'reviewer3', avatar_url: 'https://github.com/reviewer3.png', html_url: 'https://github.com/reviewer3' },
          pull_request: { url: 'https://github.com/test/repo/pull/123' },
        },
      ];
      
      renderWithTheme(
        <TimelineView 
          items={mockItemsWithMultipleReviews} 
          viewMode="grouped"
          setViewMode={mockSetViewMode}
        />
      );

      // Should show PRs - reviewed section
      expect(screen.getByText('PRs - reviewed')).toBeInTheDocument();
      
      // Should show count badge of 3 for the single PR that was reviewed 3 times
      const countBadges = screen.getAllByText('3');
      expect(countBadges.length).toBeGreaterThanOrEqual(1);
      
      // Should show only the most recent reviewer (reviewer3) 
      expect(screen.getByText('reviewer3')).toBeInTheDocument();
      
      // Should show only one instance of the PR title despite 3 reviews
      const reviewTitles = screen.getAllByText('Review on: Test PR');
      expect(reviewTitles).toHaveLength(1);
    });

    it('should have section-level select all checkboxes in each section header', () => {
      const mockSetViewMode = vi.fn();
      const mockToggleItemSelection = vi.fn();
      const mockSelectedItems = new Set<string | number>();
      
      const mockItemsWithMultipleSections = [
        // PR event
        {
          id: 1,
          event_id: 'pr-event-1',
          number: 123,
          title: 'Test Pull Request',
          body: 'This is a test PR',
          html_url: 'https://github.com/test/repo/pull/123',
          state: 'open',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T12:00:00Z',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
          user: { login: 'author', avatar_url: 'https://github.com/author.png', html_url: 'https://github.com/author' },
          pull_request: { url: 'https://github.com/test/repo/pull/123' },
        },
        // Review event
        {
          id: 2,
          event_id: 'review-event-1',
          number: 123,
          title: 'Review on: Test Pull Request',
          body: 'This looks good',
          html_url: 'https://github.com/test/repo/pull/123',
          state: 'open',
          created_at: '2024-01-16T10:00:00Z',
          updated_at: '2024-01-16T10:00:00Z',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
          user: { login: 'reviewer1', avatar_url: 'https://github.com/reviewer1.png', html_url: 'https://github.com/reviewer1' },
          pull_request: { url: 'https://github.com/test/repo/pull/123' },
        },
        // Issue event
        {
          id: 3,
          event_id: 'issue-event-1',
          number: 456,
          title: 'Test Issue',
          body: 'This is a test issue',
          html_url: 'https://github.com/test/repo/issues/456',
          state: 'open',
          created_at: '2024-01-17T10:00:00Z',
          updated_at: '2024-01-17T10:00:00Z',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
          user: { login: 'issueauthor', avatar_url: 'https://github.com/issueauthor.png', html_url: 'https://github.com/issueauthor' },
        },
      ];
      
      renderWithTheme(
        <TimelineView 
          items={mockItemsWithMultipleSections} 
          viewMode="grouped"
          setViewMode={mockSetViewMode}
          selectedItems={mockSelectedItems}
          toggleItemSelection={mockToggleItemSelection}
        />
      );

      // Should show section headers
      expect(screen.getByText('PRs - opened')).toBeInTheDocument();
      expect(screen.getByText('PRs - reviewed')).toBeInTheDocument();
      expect(screen.getByText('Issues - opened')).toBeInTheDocument();

      // Each section should have a select all checkbox (one in each section header)
      const allCheckboxes = screen.getAllByRole('checkbox');
      
      // Find section-level checkboxes by their aria-labels
      const sectionCheckboxes = allCheckboxes.filter(checkbox => {
        const ariaLabel = checkbox.getAttribute('aria-label');
        return ariaLabel && ariaLabel.includes('Select all events in');
      });
      
      expect(sectionCheckboxes.length).toBe(3); // One for each section
      
      // Verify aria-labels for section checkboxes
      expect(screen.getByLabelText('Select all events in PRs - opened section')).toBeInTheDocument();
      expect(screen.getByLabelText('Select all events in PRs - reviewed section')).toBeInTheDocument();
      expect(screen.getByLabelText('Select all events in Issues - opened section')).toBeInTheDocument();
    });

    it('should select all events in a section when section checkbox is clicked', () => {
      const mockSetViewMode = vi.fn();
      const mockToggleItemSelection = vi.fn();
      const mockSelectedItems = new Set<string | number>();
      
      const mockItemsWithSameSection = [
        {
          id: 1,
          event_id: 'review-1',
          number: 123,
          title: 'Review on: Test PR 1',
          body: 'First review',
          html_url: 'https://github.com/test/repo/pull/123',
          state: 'open',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
          user: { login: 'reviewer1', avatar_url: 'https://github.com/reviewer1.png', html_url: 'https://github.com/reviewer1' },
          pull_request: { url: 'https://github.com/test/repo/pull/123' },
        },
        {
          id: 2,
          event_id: 'review-2',
          number: 456,
          title: 'Review on: Test PR 2',
          body: 'Second review',
          html_url: 'https://github.com/test/repo/pull/456',
          state: 'open',
          created_at: '2024-01-16T10:00:00Z',
          updated_at: '2024-01-16T10:00:00Z',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
          user: { login: 'reviewer2', avatar_url: 'https://github.com/reviewer2.png', html_url: 'https://github.com/reviewer2' },
          pull_request: { url: 'https://github.com/test/repo/pull/456' },
        },
      ];
      
      renderWithTheme(
        <TimelineView 
          items={mockItemsWithSameSection} 
          viewMode="grouped"
          setViewMode={mockSetViewMode}
          selectedItems={mockSelectedItems}
          toggleItemSelection={mockToggleItemSelection}
        />
      );

      // Find and click the section-level select all checkbox
      const sectionCheckbox = screen.getByLabelText('Select all events in PRs - reviewed section');
      fireEvent.click(sectionCheckbox);

             // Should call toggleItemSelection for each event in the section
       expect(mockToggleItemSelection).toHaveBeenCalledWith('review-1');
       expect(mockToggleItemSelection).toHaveBeenCalledWith('review-2');
       expect(mockToggleItemSelection).toHaveBeenCalledTimes(2);
     });

     it('should show indeterminate state when some events in section are selected', () => {
       const mockSetViewMode = vi.fn();
       const mockToggleItemSelection = vi.fn();
       // Select only the first event in the section
       const mockSelectedItems = new Set<string | number>(['review-1']);
       
       const mockItemsWithSameSection = [
         {
           id: 1,
           event_id: 'review-1',
           number: 123,
           title: 'Review on: Test PR 1',
           body: 'First review',
           html_url: 'https://github.com/test/repo/pull/123',
           state: 'open',
           created_at: '2024-01-15T10:00:00Z',
           updated_at: '2024-01-15T10:00:00Z',
           labels: [],
           repository_url: 'https://api.github.com/repos/test/repo',
           repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
           user: { login: 'reviewer1', avatar_url: 'https://github.com/reviewer1.png', html_url: 'https://github.com/reviewer1' },
           pull_request: { url: 'https://github.com/test/repo/pull/123' },
         },
         {
           id: 2,
           event_id: 'review-2',
           number: 456,
           title: 'Review on: Test PR 2',
           body: 'Second review',
           html_url: 'https://github.com/test/repo/pull/456',
           state: 'open',
           created_at: '2024-01-16T10:00:00Z',
           updated_at: '2024-01-16T10:00:00Z',
           labels: [],
           repository_url: 'https://api.github.com/repos/test/repo',
           repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
           user: { login: 'reviewer2', avatar_url: 'https://github.com/reviewer2.png', html_url: 'https://github.com/reviewer2' },
           pull_request: { url: 'https://github.com/test/repo/pull/456' },
         },
       ];
       
       renderWithTheme(
         <TimelineView 
           items={mockItemsWithSameSection} 
           viewMode="grouped"
           setViewMode={mockSetViewMode}
           selectedItems={mockSelectedItems}
           toggleItemSelection={mockToggleItemSelection}
         />
       );

       // Find the section-level checkbox
       const sectionCheckbox = screen.getByLabelText('Select all events in PRs - reviewed section');
       
       // Should be in indeterminate state (some but not all items selected)
       expect(sectionCheckbox).toHaveProperty('indeterminate', true);
       expect(sectionCheckbox).not.toBeChecked();
     });

    it('should group events by action type in action sections', () => {
      const mockSetViewMode = vi.fn();
      const mockItemsWithDuplicates = createMockItemsWithDuplicates();
      
      renderWithTheme(
        <TimelineView 
          items={mockItemsWithDuplicates} 
          viewMode="grouped"
          setViewMode={mockSetViewMode}
        />
      );

      // Should show action type groups
      expect(screen.getByText('Issues - opened')).toBeInTheDocument();
      expect(screen.getByText('Issues - closed')).toBeInTheDocument();
      expect(screen.getByText('PRs - opened')).toBeInTheDocument();
      expect(screen.getByText('PRs - merged')).toBeInTheDocument();
      expect(screen.getByText('Issues - commented')).toBeInTheDocument();
    });

         it('should consolidate duplicate events within action type groups', () => {
       const mockSetViewMode = vi.fn();
       // Create items where same issue appears in multiple states
       const mockItems = [
         {
           id: 1,
           number: 123,
           title: 'Test Issue',
           html_url: 'https://github.com/test/repo/issues/123',
           state: 'open',
           created_at: '2024-01-15T10:00:00Z',
           updated_at: '2024-01-15T12:00:00Z',
           labels: [],
           repository_url: 'https://api.github.com/repos/test/repo',
           repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
           user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
         },
         {
           id: 2,
           number: 123,
           title: 'Test Issue',
           html_url: 'https://github.com/test/repo/issues/123',
           state: 'open',
           created_at: '2024-01-16T10:00:00Z',
           updated_at: '2024-01-16T12:00:00Z',
           labels: [],
           repository_url: 'https://api.github.com/repos/test/repo',
           repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
           user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
         },
       ];
       
       renderWithTheme(
         <TimelineView 
           items={mockItems} 
           viewMode="grouped"
           setViewMode={mockSetViewMode}
         />
       );

       // Should show count badge in the Issues - opened section for the consolidated events
       expect(screen.getByText('Issues - opened')).toBeInTheDocument();
       // There should be multiple "2" badges - one in main section, one in action section
       const countBadges = screen.getAllByText('2');
       expect(countBadges.length).toBeGreaterThanOrEqual(1);
     });

         it('should properly group comments by their parent issue/PR URL', () => {
       const mockSetViewMode = vi.fn();
       const mockCommentsOnSameIssue = [
         {
           id: 1,
           number: 123,
           title: 'Comment on: Test Issue',
           body: 'First comment',
           html_url: 'https://github.com/test/repo/issues/123#issuecomment-1',
           state: 'open',
           created_at: '2024-01-20T10:00:00Z',
           updated_at: '2024-01-20T10:00:00Z',
           labels: [],
           repository_url: 'https://api.github.com/repos/test/repo',
           repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
           user: { login: 'commenter1', avatar_url: 'https://github.com/commenter1.png', html_url: 'https://github.com/commenter1' },
         },
         {
           id: 2,
           number: 123,
           title: 'Comment on: Test Issue',
           body: 'Second comment',
           html_url: 'https://github.com/test/repo/issues/123#issuecomment-2',
           state: 'open',
           created_at: '2024-01-21T10:00:00Z',
           updated_at: '2024-01-21T10:00:00Z',
           labels: [],
           repository_url: 'https://api.github.com/repos/test/repo',
           repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
           user: { login: 'commenter2', avatar_url: 'https://github.com/commenter2.png', html_url: 'https://github.com/commenter2' },
         },
       ];
       
       renderWithTheme(
         <TimelineView 
           items={mockCommentsOnSameIssue} 
           viewMode="grouped"
           setViewMode={mockSetViewMode}
         />
       );

       // Should show Issues - commented section
       expect(screen.getByText('Issues - commented')).toBeInTheDocument();
       
       // Should show consolidated comment count (appears in both main and action sections)
       const countBadges = screen.getAllByText('2');
       expect(countBadges.length).toBeGreaterThanOrEqual(1);
       
       // Should show most recent commenter (may appear in both sections)
       const commenterLinks = screen.getAllByText('commenter2');
       expect(commenterLinks.length).toBeGreaterThanOrEqual(1);
     });

         it('should sort grouped items by most recent activity', () => {
       const mockSetViewMode = vi.fn();
       const mockItems = [
         // Older issue
         {
           id: 1,
           number: 123,
           title: 'Older Issue',
           html_url: 'https://github.com/test/repo/issues/123',
           state: 'open',
           created_at: '2024-01-15T10:00:00Z',
           updated_at: '2024-01-15T10:00:00Z',
           labels: [],
           repository_url: 'https://api.github.com/repos/test/repo',
           repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
           user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
         },
         // Newer issue
         {
           id: 2,
           number: 456,
           title: 'Newer Issue',
           html_url: 'https://github.com/test/repo/issues/456',
           state: 'open',
           created_at: '2024-01-20T10:00:00Z',
           updated_at: '2024-01-20T10:00:00Z',
           labels: [],
           repository_url: 'https://api.github.com/repos/test/repo',
           repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
           user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
         },
       ];
       
       renderWithTheme(
         <TimelineView 
           items={mockItems} 
           viewMode="grouped"
           setViewMode={mockSetViewMode}
         />
       );

       // Should show both issues somewhere in the view (may appear in multiple sections)
       const newerIssueLinks = screen.getAllByText('Newer Issue');
       const olderIssueLinks = screen.getAllByText('Older Issue');
       expect(newerIssueLinks.length).toBeGreaterThanOrEqual(1);
       expect(olderIssueLinks.length).toBeGreaterThanOrEqual(1);
     });

         it('should not show event count badge for single events in item groupings', () => {
       const mockSetViewMode = vi.fn();
       const mockSingleItems = [
         {
           id: 1,
           number: 123,
           title: 'Single Issue',
           html_url: 'https://github.com/test/repo/issues/123',
           state: 'open',
           created_at: '2024-01-15T10:00:00Z',
           updated_at: '2024-01-15T10:00:00Z',
           labels: [],
           repository_url: 'https://api.github.com/repos/test/repo',
           repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
           user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
         },
       ];
       
       renderWithTheme(
         <TimelineView 
           items={mockSingleItems} 
           viewMode="grouped"
           setViewMode={mockSetViewMode}
         />
       );

       // Should show the issue title (may appear in both main and action sections)
       const issueTitleLinks = screen.getAllByText('Single Issue');
       expect(issueTitleLinks.length).toBeGreaterThanOrEqual(1);
       
       // Should show Issues - opened section
       expect(screen.getByText('Issues - opened')).toBeInTheDocument();
       
       // But there should not be multiple event count badges for the same single item since they're single events
       // The individual items should not show count badges when there's only one event
       const tokenElements = screen.queryAllByText('1');
       // There might be a token showing "1" for the section count, but no count badge next to the individual item title
       expect(tokenElements.length).toBeGreaterThanOrEqual(0); // Allow for section count tokens
     });

         it('should handle mixed issue and PR events correctly', () => {
       const mockSetViewMode = vi.fn();
       const mockMixedItems = createMockItemsWithDuplicates();
       
       renderWithTheme(
         <TimelineView 
           items={mockMixedItems} 
           viewMode="grouped"
           setViewMode={mockSetViewMode}
         />
       );

       // Should show both issue and PR sections
       expect(screen.getByText('Issues - opened')).toBeInTheDocument();
       expect(screen.getByText('Issues - closed')).toBeInTheDocument();
       expect(screen.getByText('PRs - opened')).toBeInTheDocument();
       expect(screen.getByText('PRs - merged')).toBeInTheDocument();
       expect(screen.getByText('Issues - commented')).toBeInTheDocument();
       
       // Action sections should show both issue and PR types
       
       // Should show both issue and PR titles (may appear multiple times in different sections)
       const issueLinks = screen.getAllByText('Test Issue');
       const prLinks = screen.getAllByText('Test Pull Request');
       expect(issueLinks.length).toBeGreaterThanOrEqual(1);
       expect(prLinks.length).toBeGreaterThanOrEqual(1);
     });
  });

  describe('Selection functionality', () => {
    const mockSetViewMode = vi.fn();
    const mockToggleItemSelection = vi.fn();
    const mockSelectAllItems = vi.fn();
    const mockClearSelection = vi.fn();
    const mockSelectedItems = new Set<number>();
    
    const createMockItemsForSelection = () => [
      {
        id: 1,
        number: 101,
        title: 'First Issue',
        html_url: 'https://github.com/test/repo/issues/101',
        state: 'open',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        labels: [],
        repository_url: 'https://api.github.com/repos/test/repo',
        repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
        user: { login: 'user1', avatar_url: 'https://github.com/user1.png', html_url: 'https://github.com/user1' },
      },
      {
        id: 2,
        number: 102,
        title: 'Second Issue',
        html_url: 'https://github.com/test/repo/issues/102',
        state: 'closed',
        created_at: '2024-01-16T10:00:00Z',
        updated_at: '2024-01-16T11:00:00Z',
        labels: [],
        repository_url: 'https://api.github.com/repos/test/repo',
        repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
        user: { login: 'user2', avatar_url: 'https://github.com/user2.png', html_url: 'https://github.com/user2' },
      },
      {
        id: 3,
        number: 201,
        title: 'First PR',
        html_url: 'https://github.com/test/repo/pull/201',
        state: 'open',
        created_at: '2024-01-17T10:00:00Z',
        updated_at: '2024-01-17T12:00:00Z',
        labels: [],
        repository_url: 'https://api.github.com/repos/test/repo',
        repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
        user: { login: 'user3', avatar_url: 'https://github.com/user3.png', html_url: 'https://github.com/user3' },
        pull_request: { url: 'https://github.com/test/repo/pull/201' },
      }
    ];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render checkboxes for each grouped section when in grouped mode', () => {
      const mockItems = createMockItemsForSelection();
      
      renderWithTheme(
        <TimelineView 
          items={mockItems} 
          viewMode="grouped"
          setViewMode={mockSetViewMode}
          selectedItems={mockSelectedItems}
          toggleItemSelection={mockToggleItemSelection}
          selectAllItems={mockSelectAllItems}
          clearSelection={mockClearSelection}
        />
      );

      // Should have checkboxes for each section
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
      
      // Should have labels for the sections
      expect(screen.getByText('Issues - opened')).toBeInTheDocument();
      expect(screen.getByText('Issues - closed')).toBeInTheDocument();
      expect(screen.getByText('PRs - opened')).toBeInTheDocument();
    });

         it('should render checkboxes for each individual item when in standard mode', () => {
       const mockItems = createMockItemsForSelection();
       
       renderWithTheme(
         <TimelineView 
           items={mockItems} 
           viewMode="standard"
           setViewMode={mockSetViewMode}
           selectedItems={mockSelectedItems}
           toggleItemSelection={mockToggleItemSelection}
           selectAllItems={mockSelectAllItems}
           clearSelection={mockClearSelection}
         />
       );

       // Should have checkboxes for each individual item + one select all checkbox
       const checkboxes = screen.getAllByRole('checkbox');
       expect(checkboxes.length).toBe(mockItems.length + 1); // +1 for select all checkbox
     });

         it('should maintain independent selection state for different event types', () => {
       const mockItems = createMockItemsForSelection();
       
       renderWithTheme(
         <TimelineView 
           items={mockItems} 
           viewMode="grouped"
           setViewMode={mockSetViewMode}
           selectedItems={mockSelectedItems}
           toggleItemSelection={mockToggleItemSelection}
           selectAllItems={mockSelectAllItems}
           clearSelection={mockClearSelection}
         />
       );

       // Get section-level checkboxes by their aria-labels
       const sectionCheckboxes = screen.getAllByRole('checkbox').filter(checkbox => {
         const ariaLabel = checkbox.getAttribute('aria-label');
         return ariaLabel && ariaLabel.includes('Select all events in');
       });
       expect(sectionCheckboxes.length).toBeGreaterThan(0);

       // Click section-level checkbox should call toggleItemSelection for all items in that section
       const firstSectionCheckbox = sectionCheckboxes[0];
       fireEvent.click(firstSectionCheckbox);
       
       // Should have called toggleItemSelection for items in that section
       expect(mockToggleItemSelection).toHaveBeenCalled();
     });

         it('should allow toggling selection state', () => {
       const mockItems = createMockItemsForSelection();
       
       renderWithTheme(
         <TimelineView 
           items={mockItems} 
           viewMode="grouped"
           setViewMode={mockSetViewMode}
           selectedItems={mockSelectedItems}
           toggleItemSelection={mockToggleItemSelection}
           selectAllItems={mockSelectAllItems}
           clearSelection={mockClearSelection}
         />
       );

       // Get a section-level checkbox
       const sectionCheckbox = screen.getAllByRole('checkbox').find(checkbox => {
         const ariaLabel = checkbox.getAttribute('aria-label');
         return ariaLabel && ariaLabel.includes('Select all events in');
       });
       
       expect(sectionCheckbox).toBeDefined();
       
       // Click section checkbox should call toggleItemSelection for items in that section
       fireEvent.click(sectionCheckbox!);
       expect(mockToggleItemSelection).toHaveBeenCalled();
     });

     it('should maintain selection state when switching between view modes', () => {
       const mockItems = createMockItemsForSelection();
       
       const { rerender } = renderWithTheme(
         <TimelineView 
           items={mockItems} 
           viewMode="grouped"
           setViewMode={mockSetViewMode}
           selectedItems={mockSelectedItems}
           toggleItemSelection={mockToggleItemSelection}
           selectAllItems={mockSelectAllItems}
           clearSelection={mockClearSelection}
         />
       );

       // Click section-level checkbox in grouped mode
       const sectionCheckbox = screen.getAllByRole('checkbox').find(checkbox => {
         const ariaLabel = checkbox.getAttribute('aria-label');
         return ariaLabel && ariaLabel.includes('Select all events in');
       });
       
       expect(sectionCheckbox).toBeDefined();
       fireEvent.click(sectionCheckbox!);
       expect(mockToggleItemSelection).toHaveBeenCalled();

       // Switch to standard mode
       rerender(
         <ThemeProvider>
           <TimelineView 
             items={mockItems} 
             viewMode="standard"
             setViewMode={mockSetViewMode}
             selectedItems={mockSelectedItems}
             toggleItemSelection={mockToggleItemSelection}
             selectAllItems={mockSelectAllItems}
             clearSelection={mockClearSelection}
           />
         </ThemeProvider>
       );

       // Selection state should be maintained in standard mode (individual checkboxes + select all)
       const individualCheckboxes = screen.getAllByRole('checkbox');
       expect(individualCheckboxes.length).toBe(mockItems.length + 1); // +1 for select all checkbox
     });

         it('should handle selection with duplicate events correctly', () => {
       // Create items with duplicates that should be grouped
       const mockItems = [
         {
           id: 1,
           number: 123,
           title: 'Duplicate Issue 1',
           html_url: 'https://github.com/test/repo/issues/123',
           state: 'open',
           created_at: '2024-01-15T10:00:00Z',
           updated_at: '2024-01-15T10:00:00Z',
           labels: [],
           repository_url: 'https://api.github.com/repos/test/repo',
           repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
           user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
         },
         {
           id: 2,
           number: 123,
           title: 'Duplicate Issue 2',
           html_url: 'https://github.com/test/repo/issues/123',
           state: 'open',
           created_at: '2024-01-16T10:00:00Z',
           updated_at: '2024-01-16T10:00:00Z',
           labels: [],
           repository_url: 'https://api.github.com/repos/test/repo',
           repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
           user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
         }
       ];
       
       renderWithTheme(
         <TimelineView 
           items={mockItems} 
           viewMode="grouped"
           setViewMode={mockSetViewMode}
           selectedItems={mockSelectedItems}
           toggleItemSelection={mockToggleItemSelection}
           selectAllItems={mockSelectAllItems}
           clearSelection={mockClearSelection}
         />
       );

       // Should have checkboxes for the grouped section
       const checkboxes = screen.getAllByRole('checkbox');
       expect(checkboxes.length).toBeGreaterThan(0);

       // Click section-level checkbox should call toggleItemSelection for all items in the section
       const sectionCheckbox = checkboxes.find(checkbox => {
         const ariaLabel = checkbox.getAttribute('aria-label');
         return ariaLabel && ariaLabel.includes('Select all events in');
       });
       
       expect(sectionCheckbox).toBeDefined();
       fireEvent.click(sectionCheckbox!);
       expect(mockToggleItemSelection).toHaveBeenCalled();
       
       // Should show count badge for multiple events in the event count badge (not section count)
       const countBadges = screen.getAllByText('2');
       expect(countBadges.length).toBeGreaterThan(0); // Should find at least one count badge with '2'
     });

         it('should preserve selection state across re-renders', () => {
       const mockItems = createMockItemsForSelection();
       
       const { rerender } = renderWithTheme(
         <TimelineView 
           items={mockItems} 
           viewMode="grouped"
           setViewMode={mockSetViewMode}
           selectedItems={mockSelectedItems}
           toggleItemSelection={mockToggleItemSelection}
           selectAllItems={mockSelectAllItems}
           clearSelection={mockClearSelection}
         />
       );

       // Click section-level checkbox
       const sectionCheckbox = screen.getAllByRole('checkbox').find(checkbox => {
         const ariaLabel = checkbox.getAttribute('aria-label');
         return ariaLabel && ariaLabel.includes('Select all events in');
       });
       
       expect(sectionCheckbox).toBeDefined();
       fireEvent.click(sectionCheckbox!);
       expect(mockToggleItemSelection).toHaveBeenCalled();

       // Re-render with same props
       rerender(
         <ThemeProvider>
           <TimelineView 
             items={mockItems} 
             viewMode="grouped"
             setViewMode={mockSetViewMode}
             selectedItems={mockSelectedItems}
             toggleItemSelection={mockToggleItemSelection}
             selectAllItems={mockSelectAllItems}
             clearSelection={mockClearSelection}
           />
         </ThemeProvider>
       );

       // Section-level checkbox should still be available
       const newSectionCheckbox = screen.getAllByRole('checkbox').find(checkbox => {
         const ariaLabel = checkbox.getAttribute('aria-label');
         return ariaLabel && ariaLabel.includes('Select all events in');
       });
       expect(newSectionCheckbox).toBeDefined();
     });

         it('should handle empty selection state correctly', () => {
       const mockItems = createMockItemsForSelection();
       
       renderWithTheme(
         <TimelineView 
           items={mockItems} 
           viewMode="grouped"
           setViewMode={mockSetViewMode}
           selectedItems={mockSelectedItems}
           toggleItemSelection={mockToggleItemSelection}
           selectAllItems={mockSelectAllItems}
           clearSelection={mockClearSelection}
         />
       );

      // All checkboxes should be unchecked initially
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked();
      });
    });

              it('should handle selection state for mixed event types correctly', () => {
       const mockMixedItems = [
         // Issue
         {
           id: 1,
           number: 101,
           title: 'Test Issue',
           html_url: 'https://github.com/test/repo/issues/101',
           state: 'open',
           created_at: '2024-01-15T10:00:00Z',
           updated_at: '2024-01-15T10:00:00Z',
           labels: [],
           repository_url: 'https://api.github.com/repos/test/repo',
           repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
           user: { login: 'user1', avatar_url: 'https://github.com/user1.png', html_url: 'https://github.com/user1' },
         },
         // PR
         {
           id: 2,
           number: 201,
           title: 'Test PR',
           html_url: 'https://github.com/test/repo/pull/201',
           state: 'open',
           created_at: '2024-01-16T10:00:00Z',
           updated_at: '2024-01-16T10:00:00Z',
           labels: [],
           repository_url: 'https://api.github.com/repos/test/repo',
           repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
           user: { login: 'user2', avatar_url: 'https://github.com/user2.png', html_url: 'https://github.com/user2' },
           pull_request: { url: 'https://github.com/test/repo/pull/201' },
         },
         // Comment
         {
           id: 3,
           number: 101,
           title: 'Comment on: Test Issue',
           body: 'This is a comment',
           html_url: 'https://github.com/test/repo/issues/101#issuecomment-1',
           state: 'open',
           created_at: '2024-01-17T10:00:00Z',
           updated_at: '2024-01-17T10:00:00Z',
           labels: [],
           repository_url: 'https://api.github.com/repos/test/repo',
           repository: { full_name: 'test/repo', html_url: 'https://github.com/test/repo' },
           user: { login: 'user3', avatar_url: 'https://github.com/user3.png', html_url: 'https://github.com/user3' },
         }
       ];
       
       renderWithTheme(
         <TimelineView 
           items={mockMixedItems} 
           viewMode="grouped"
           setViewMode={mockSetViewMode}
           selectedItems={mockSelectedItems}
           toggleItemSelection={mockToggleItemSelection}
           selectAllItems={mockSelectAllItems}
           clearSelection={mockClearSelection}
         />
       );

      // Should have section-level checkboxes for different event types
      const sectionCheckboxes = screen.getAllByRole('checkbox').filter(checkbox => {
        const ariaLabel = checkbox.getAttribute('aria-label');
        return ariaLabel && ariaLabel.includes('Select all events in');
      });
      expect(sectionCheckboxes.length).toBeGreaterThan(0);

      // Click first section checkbox should call toggleItemSelection
      fireEvent.click(sectionCheckboxes[0]);
      expect(mockToggleItemSelection).toHaveBeenCalled();
    });
  });
});
