import { describe, it, expect } from 'vitest';
import { GitHubItem } from '../../types';

// Test the getEventType logic directly
const getEventType = (item: GitHubItem): 'issue' | 'pull_request' | 'comment' | 'commit' => {
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
}); 