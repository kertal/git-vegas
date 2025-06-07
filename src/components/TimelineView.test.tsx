import React from 'react';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { ThemeProvider } from '@primer/react';
import TimelineView from './TimelineView';
import { GitHubItem } from '../types';

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

describe('TimelineView', () => {
  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider>{component}</ThemeProvider>);
  };

  it('should render timeline with events', () => {
    renderWithTheme(<TimelineView items={mockItems} />);

    expect(
      screen.getByText('Activity Timeline (2 events)')
    ).toBeInTheDocument();
    expect(screen.getByText('Test Issue')).toBeInTheDocument();
    expect(screen.getByText('Test Pull Request')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('testuser2')).toBeInTheDocument();
  });

  it('should show different states for issues and PRs', () => {
    renderWithTheme(<TimelineView items={mockItems} />);

    expect(screen.getByText('opened issue')).toBeInTheDocument();
    expect(screen.getByText('merged pull request')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Merged')).toBeInTheDocument();
  });

  it('should display labels', () => {
    renderWithTheme(<TimelineView items={mockItems} />);

    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getByText('high-priority')).toBeInTheDocument();
    expect(screen.getByText('feature')).toBeInTheDocument();
  });

  it('should show repository names', () => {
    renderWithTheme(<TimelineView items={mockItems} />);

    expect(screen.getAllByText('test/repo')).toHaveLength(2);
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
    expect(screen.getByText('test/repo')).toBeInTheDocument();
    expect(screen.getByText('#789')).toBeInTheDocument();
  });
});
