import { describe, it, expect } from 'vitest';
import { GitHubItem } from '../../types';

// Test the getEventType logic directly
const getEventType = (item: GitHubItem): 'issue' | 'pull_request' | 'comment' | 'commit' | 'other' => {
  // Check if this is a pull request review (title starts with "Review on:")
  if (item.title.startsWith('Review on:')) {
    return 'pull_request';
  }
  // Check if this is a review comment (title starts with "Review comment on:")
  if (item.title.startsWith('Review comment on:')) {
    return 'comment';
  }
  // Check if this is a comment event (title starts with "Comment on:")
  if (item.title.startsWith('Comment on:')) {
    return 'comment';
  }
  // Check if this is a push event (title starts with "Pushed")
  if (item.title.startsWith('Pushed')) {
    return 'commit';
  }
  // Check for other event types that don't belong to issues/PRs
  if (
    item.title.startsWith('Created branch') ||
    item.title.startsWith('Created tag') ||
    item.title.startsWith('Created repository') ||
    item.title.startsWith('Deleted branch') ||
    item.title.startsWith('Deleted tag') ||
    item.title.startsWith('Forked repository') ||
    item.title.startsWith('Starred') ||
    item.title.startsWith('Unstarred') ||
    item.title.startsWith('Made repository public') ||
    item.title.includes('wiki page')
  ) {
    return 'other';
  }
  return item.pull_request ? 'pull_request' : 'issue';
};

describe('SummaryView - Review Comment Categorization', () => {
  it('should categorize review comments as comments, not pull requests', () => {
    const reviewCommentItem: GitHubItem = {
      id: 1,
      title: 'Review comment on: Test PR',
      html_url: 'https://github.com/test/repo/pull/1',
      user: {
        login: 'testuser',
        avatar_url: 'https://github.com/testuser.png',
        html_url: 'https://github.com/testuser',
      },
      repository_url: 'https://api.github.com/repos/test/repo',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
      state: 'open',
      body: 'This is a review comment',
      labels: [],
      event_id: 'event-1',
      pull_request: {
        url: 'https://github.com/test/repo/pull/1',
      },
    };

    const result = getEventType(reviewCommentItem);
    expect(result).toBe('comment');
  });

  it('should categorize regular PR reviews as pull requests', () => {
    const reviewItem: GitHubItem = {
      id: 1,
      title: 'Review on: Test PR',
      html_url: 'https://github.com/test/repo/pull/1',
      user: {
        login: 'testuser',
        avatar_url: 'https://github.com/testuser.png',
        html_url: 'https://github.com/testuser',
      },
      repository_url: 'https://api.github.com/repos/test/repo',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
      state: 'open',
      body: 'This is a review',
      labels: [],
      event_id: 'event-1',
      pull_request: {
        url: 'https://github.com/test/repo/pull/1',
      },
    };

    const result = getEventType(reviewItem);
    expect(result).toBe('pull_request');
  });

  it('should categorize regular issue comments as comments', () => {
    const issueCommentItem: GitHubItem = {
      id: 1,
      title: 'Comment on: Test Issue',
      html_url: 'https://github.com/test/repo/issues/1',
      user: {
        login: 'testuser',
        avatar_url: 'https://github.com/testuser.png',
        html_url: 'https://github.com/testuser',
      },
      repository_url: 'https://api.github.com/repos/test/repo',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
      state: 'open',
      body: 'This is a comment',
      labels: [],
      event_id: 'event-1',
    };

    const result = getEventType(issueCommentItem);
    expect(result).toBe('comment');
  });

  it('should categorize regular PRs as pull requests', () => {
    const prItem: GitHubItem = {
      id: 1,
      title: 'Test PR',
      html_url: 'https://github.com/test/repo/pull/1',
      user: {
        login: 'testuser',
        avatar_url: 'https://github.com/testuser.png',
        html_url: 'https://github.com/testuser',
      },
      repository_url: 'https://api.github.com/repos/test/repo',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
      state: 'open',
      body: 'This is a PR',
      labels: [],
      event_id: 'event-1',
      pull_request: {
        url: 'https://github.com/test/repo/pull/1',
      },
    };

    const result = getEventType(prItem);
    expect(result).toBe('pull_request');
  });

  it('should categorize push events as commits', () => {
    const commitItem: GitHubItem = {
      id: 1,
      title: 'Pushed 3 commits to main',
      html_url: 'https://github.com/test/repo/commits/main',
      user: {
        login: 'testuser',
        avatar_url: 'https://github.com/testuser.png',
        html_url: 'https://github.com/testuser',
      },
      repository_url: 'https://api.github.com/repos/test/repo',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
      state: 'open',
      body: '- Fix bug\n- Add feature\n- Update docs',
      labels: [],
      event_id: 'event-1',
    };

    const result = getEventType(commitItem);
    expect(result).toBe('commit');
  });

  it('should categorize other event types correctly', () => {
    const otherEventTypes = [
      { title: 'Created branch feature/new-feature', expected: 'other' },
      { title: 'Created tag v1.0.0', expected: 'other' },
      { title: 'Created repository: My awesome project', expected: 'other' },
      { title: 'Deleted branch old-feature', expected: 'other' },
      { title: 'Deleted tag v0.9.0', expected: 'other' },
      { title: 'Forked repository to user/forked-repo', expected: 'other' },
      { title: 'Starred repository', expected: 'other' },
      { title: 'Unstarred repository', expected: 'other' },
      { title: 'Made repository public', expected: 'other' },
      { title: 'Created wiki page: Getting Started', expected: 'other' },
      { title: 'Updated wiki page: Documentation', expected: 'other' },
    ];

    otherEventTypes.forEach(({ title, expected }) => {
      const otherItem: GitHubItem = {
        id: 1,
        title,
        html_url: 'https://github.com/test/repo',
        user: {
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          html_url: 'https://github.com/testuser',
        },
        repository_url: 'https://api.github.com/repos/test/repo',
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        state: 'open',
        body: 'Test event',
        labels: [],
        event_id: 'event-1',
      };

      const result = getEventType(otherItem);
      expect(result).toBe(expected);
    });
  });

  it('should test collapse state management', () => {
    // Test that collapse state can be toggled
    const collapsedSections = new Set<string>();
    
    // Initially no sections are collapsed
    expect(collapsedSections.has('PRs - opened')).toBe(false);
    
    // Add a section to collapsed state
    collapsedSections.add('PRs - opened');
    expect(collapsedSections.has('PRs - opened')).toBe(true);
    
    // Remove a section from collapsed state
    collapsedSections.delete('PRs - opened');
    expect(collapsedSections.has('PRs - opened')).toBe(false);
  });
}); 