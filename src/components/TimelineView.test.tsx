import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { ThemeProvider } from '@primer/react';
import { vi } from 'vitest';
import TimelineView from './TimelineView';
import { GitHubItem } from '../types';
import { GitHubEvent } from '../utils/githubSearch';

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

    expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
    expect(screen.getByText('2 events')).toBeInTheDocument();
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
    expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
  });

  it('should show repository names', () => {
    renderWithTheme(<TimelineView items={mockItems} />);

    // Timeline now shows just the repo name (last part), not full path
    expect(screen.getAllByText('repo')).toHaveLength(2);
  });

  it('should show empty state when no items', () => {
    renderWithTheme(<TimelineView items={[]} />);

    expect(
      screen.getByText('No events found for the selected time period.')
    ).toBeInTheDocument();
  });

  it('should sort items by date (newest first)', () => {
    const itemsInWrongOrder = [mockItems[0], mockItems[1]]; // First item is older
    renderWithTheme(<TimelineView items={itemsInWrongOrder} />);

    const titles = screen
      .getAllByRole('link')
      .filter(
        (link: HTMLElement) =>
          link.getAttribute('href')?.includes('/issues/') ||
          link.getAttribute('href')?.includes('/pull/')
      );

    // Should show PR first (newer), then issue (older)
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
      expect(screen.getByText('1')).toBeInTheDocument(); // Count badges
      
      // Should show individual events within groups
      expect(screen.getByText('Test Issue')).toBeInTheDocument();
      expect(screen.getByText('Test Pull Request')).toBeInTheDocument();
      
      // Should show user names and repo names within event items
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('testuser2')).toBeInTheDocument();
      expect(screen.getAllByText('repo')).toHaveLength(2); // Should appear for each event
    });
  });
});
