import { describe, it, expect } from 'vitest';
import { countItemsMatchingFilter, FilterType } from './filterUtils';
import { GitHubItem } from '../types';

// Sample test data
const mockGitHubItems: GitHubItem[] = [
  // Open Issue
  {
    id: 1,
    title: 'Fix critical bug in authentication',
    html_url: 'https://github.com/user/repo1/issues/1',
    state: 'open',
    created_at: '2023-12-01T10:00:00Z',
    updated_at: '2023-12-02T15:30:00Z',
    closed_at: undefined,
    body: 'This is a critical bug that needs immediate attention.',
    user: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      html_url: 'https://github.com/testuser'
    },
    repository_url: 'https://api.github.com/repos/user/repo1',
    labels: [
      { name: 'bug', color: 'ff0000', description: 'Something is broken' },
      { name: 'priority-high', color: 'ff9900', description: 'High priority' }
    ],
    pull_request: undefined,
    merged: false
  },
  // Closed Issue
  {
    id: 2,
    title: 'Update documentation for API',
    html_url: 'https://github.com/user/repo1/issues/2',
    state: 'closed',
    created_at: '2023-11-28T09:15:00Z',
    updated_at: '2023-12-01T14:20:00Z',
    closed_at: '2023-12-01T14:20:00Z',
    body: 'Documentation needs to be updated.',
    user: {
      login: 'docwriter',
      avatar_url: 'https://github.com/docwriter.png',
      html_url: 'https://github.com/docwriter'
    },
    repository_url: 'https://api.github.com/repos/user/repo1',
    labels: [
      { name: 'documentation', color: '0075ca', description: 'Documentation' },
      { name: 'good-first-issue', color: '7057ff', description: 'Good for newcomers' }
    ],
    pull_request: undefined,
    merged: false
  },
  // Open Pull Request
  {
    id: 3,
    title: 'Add new feature for data export',
    html_url: 'https://github.com/user/repo2/pull/3',
    state: 'open',
    created_at: '2023-11-30T16:45:00Z',
    updated_at: '2023-12-01T11:00:00Z',
    closed_at: undefined,
    body: 'Implements data export functionality.',
    user: {
      login: 'developer',
      avatar_url: 'https://github.com/developer.png',
      html_url: 'https://github.com/developer'
    },
    repository_url: 'https://api.github.com/repos/user/repo2',
    labels: [
      { name: 'feature', color: '00ff00', description: 'New feature' },
      { name: 'backend', color: 'c2e0c6', description: 'Backend related' }
    ],
    pull_request: {
      merged_at: undefined,
      url: 'https://api.github.com/repos/user/repo2/pulls/3'
    },
    merged: false
  },
  // Merged Pull Request
  {
    id: 4,
    title: 'Fix performance issue in search',
    html_url: 'https://github.com/user/repo2/pull/4',
    state: 'closed',
    created_at: '2023-11-25T12:00:00Z',
    updated_at: '2023-11-26T10:30:00Z',
    closed_at: '2023-11-26T10:30:00Z',
    body: 'Optimizes search performance.',
    user: {
      login: 'optimizer',
      avatar_url: 'https://github.com/optimizer.png',
      html_url: 'https://github.com/optimizer'
    },
    repository_url: 'https://api.github.com/repos/user/repo2',
    labels: [
      { name: 'performance', color: 'fbca04', description: 'Performance improvement' },
      { name: 'bug', color: 'ff0000', description: 'Something is broken' }
    ],
    pull_request: {
      merged_at: '2023-11-26T10:30:00Z',
      url: 'https://api.github.com/repos/user/repo2/pulls/4'
    },
    merged: true
  },
  // Closed Pull Request (not merged)
  {
    id: 5,
    title: 'Experimental feature that was rejected',
    html_url: 'https://github.com/user/repo3/pull/5',
    state: 'closed',
    created_at: '2023-11-20T08:00:00Z',
    updated_at: '2023-11-21T16:00:00Z',
    closed_at: '2023-11-21T16:00:00Z',
    body: 'This experimental feature was not accepted.',
    user: {
      login: 'experimenter',
      avatar_url: 'https://github.com/experimenter.png',
      html_url: 'https://github.com/experimenter'  
    },
    repository_url: 'https://api.github.com/repos/user/repo3',
    labels: [
      { name: 'experimental', color: 'e99695', description: 'Experimental feature' },
      { name: 'wontfix', color: 'ffffff', description: 'Will not be fixed' }
    ],
    pull_request: {
      merged_at: undefined,
      url: 'https://api.github.com/repos/user/repo3/pulls/5'
    },
    merged: false
  },
  // Item with no labels
  {
    id: 6,
    title: 'Simple issue with no labels',
    html_url: 'https://github.com/user/repo3/issues/6',
    state: 'open',
    created_at: '2023-12-03T14:00:00Z',
    updated_at: '2023-12-03T14:00:00Z',
    closed_at: undefined,
    body: 'A simple issue without any labels.',
    user: {
      login: 'simplereporter',
      avatar_url: 'https://github.com/simplereporter.png',
      html_url: 'https://github.com/simplereporter'
    },
    repository_url: 'https://api.github.com/repos/user/repo3',
    labels: [],
    pull_request: undefined,
    merged: false
  }
];

describe('countItemsMatchingFilter', () => {
  describe('type filtering', () => {
    it('should count all items when filter value is "all"', () => {
      const count = countItemsMatchingFilter(mockGitHubItems, 'type', 'all', []);
      expect(count).toBe(6);
    });

    it('should count only pull requests when filter value is "pr"', () => {
      const count = countItemsMatchingFilter(mockGitHubItems, 'type', 'pr', []);
      expect(count).toBe(3); // Items 3, 4, 5 are pull requests
    });

    it('should count only issues when filter value is "issue"', () => {
      const count = countItemsMatchingFilter(mockGitHubItems, 'type', 'issue', []);
      expect(count).toBe(3); // Items 1, 2, 6 are issues
    });

    it('should return 0 for unknown type filter values', () => {
      const count = countItemsMatchingFilter(mockGitHubItems, 'type', 'unknown', []);
      expect(count).toBe(0);
    });
  });

  describe('status filtering', () => {
    it('should count all items when filter value is "all"', () => {
      const count = countItemsMatchingFilter(mockGitHubItems, 'status', 'all', []);
      expect(count).toBe(6);
    });

    it('should count only open items when filter value is "open"', () => {
      const count = countItemsMatchingFilter(mockGitHubItems, 'status', 'open', []);
      expect(count).toBe(3); // Items 1, 3, 6 are open
    });

    it('should count only closed items when filter value is "closed"', () => {
      const count = countItemsMatchingFilter(mockGitHubItems, 'status', 'closed', []);
      expect(count).toBe(2); // Items 2, 5 are closed (not merged)
    });

    it('should count only merged items when filter value is "merged"', () => {
      const count = countItemsMatchingFilter(mockGitHubItems, 'status', 'merged', []);
      expect(count).toBe(1); // Only item 4 is merged
    });

    it('should handle pull requests with merged_at property', () => {
      const mergedItems = mockGitHubItems.filter(item => 
        item.pull_request && (item.pull_request.merged_at || item.merged)
      );
      expect(mergedItems).toHaveLength(1);
      expect(mergedItems[0].id).toBe(4);
    });

    it('should exclude merged pull requests from closed status filter', () => {
      // Item 4 is a closed PR but merged, so should not be counted in closed filter
      const closedCount = countItemsMatchingFilter(mockGitHubItems, 'status', 'closed', []);
      const closedItems = mockGitHubItems.filter(item => {
        if (item.pull_request && (item.pull_request.merged_at || item.merged)) return false;
        return item.state === 'closed';
      });
      expect(closedCount).toBe(closedItems.length);
      expect(closedItems.every(item => !item.merged && !item.pull_request?.merged_at)).toBe(true);
    });
  });

  describe('label filtering', () => {
    it('should count items with specific label', () => {
      const bugCount = countItemsMatchingFilter(mockGitHubItems, 'label', 'bug', []);
      expect(bugCount).toBe(2); // Items 1 and 4 have 'bug' label
    });

    it('should exclude items with excluded labels', () => {
      const bugCount = countItemsMatchingFilter(mockGitHubItems, 'label', 'bug', ['wontfix']);
      expect(bugCount).toBe(2); // Still 2, as neither bug item has 'wontfix' label
    });

    it('should return 0 for non-existent labels', () => {
      const count = countItemsMatchingFilter(mockGitHubItems, 'label', 'nonexistent', []);
      expect(count).toBe(0);
    });

    it('should handle items without labels', () => {
      const count = countItemsMatchingFilter(mockGitHubItems, 'label', 'bug', []);
      // Should not crash on item 6 which has empty labels array
      expect(count).toBe(2);
    });

    it('should properly exclude items with multiple excluded labels', () => {
      const experimentalCount = countItemsMatchingFilter(mockGitHubItems, 'label', 'experimental', []);
      expect(experimentalCount).toBe(1); // Item 5 has experimental label
      
      const experimentalCountExcluded = countItemsMatchingFilter(mockGitHubItems, 'label', 'experimental', ['wontfix']);
      expect(experimentalCountExcluded).toBe(0); // Item 5 also has wontfix label, so excluded
    });

    it('should handle multiple excluded labels', () => {
      const featureCount = countItemsMatchingFilter(mockGitHubItems, 'label', 'feature', ['wontfix', 'experimental']);
      expect(featureCount).toBe(1); // Item 3 has feature label and no excluded labels
    });
  });

  describe('repository filtering', () => {
    it('should count items from specific repository', () => {
      const repo1Count = countItemsMatchingFilter(mockGitHubItems, 'repo', 'user/repo1', []);
      expect(repo1Count).toBe(2); // Items 1 and 2 are from repo1
    });

    it('should count items from another repository', () => {
      const repo2Count = countItemsMatchingFilter(mockGitHubItems, 'repo', 'user/repo2', []);
      expect(repo2Count).toBe(2); // Items 3 and 4 are from repo2
    });

    it('should count items from third repository', () => {
      const repo3Count = countItemsMatchingFilter(mockGitHubItems, 'repo', 'user/repo3', []);
      expect(repo3Count).toBe(2); // Items 5 and 6 are from repo3
    });

    it('should return 0 for non-existent repository', () => {
      const count = countItemsMatchingFilter(mockGitHubItems, 'repo', 'user/nonexistent', []);
      expect(count).toBe(0);
    });

    it('should handle items without repository_url', () => {
      const itemsWithoutRepo = [
        {
          ...mockGitHubItems[0],
          repository_url: undefined
        }
      ] as GitHubItem[];
      
      const count = countItemsMatchingFilter(itemsWithoutRepo, 'repo', 'user/repo1', []);
      expect(count).toBe(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty items array', () => {
      const count = countItemsMatchingFilter([], 'type', 'all', []);
      expect(count).toBe(0);
    });

    it('should handle null/undefined items array', () => {
      const count = countItemsMatchingFilter(null as any, 'type', 'all', []);
      expect(count).toBe(0);
      
      const count2 = countItemsMatchingFilter(undefined as any, 'type', 'all', []);
      expect(count2).toBe(0);
    });

    it('should handle invalid filter types', () => {
      const count = countItemsMatchingFilter(mockGitHubItems, 'invalid' as FilterType, 'all', []);
      expect(count).toBe(0);
    });

    it('should handle empty excluded labels array', () => {
      const count = countItemsMatchingFilter(mockGitHubItems, 'label', 'bug', []);
      expect(count).toBe(2);
    });

    it('should handle items with null/undefined labels', () => {
      const itemsWithNullLabels = [
        {
          ...mockGitHubItems[0],
          labels: undefined
        }
      ] as GitHubItem[];
      
      const count = countItemsMatchingFilter(itemsWithNullLabels, 'label', 'bug', []);
      expect(count).toBe(0);
    });

    it('should handle items with null/undefined pull_request', () => {
      const item = mockGitHubItems[0]; // This is an issue (no pull_request)
      const count = countItemsMatchingFilter([item], 'status', 'merged', []);
      expect(count).toBe(0);
    });

    it('should handle pull requests without merged_at property', () => {
      const openPR = mockGitHubItems[2]; // Open PR without merged_at
      const count = countItemsMatchingFilter([openPR], 'status', 'merged', []);
      expect(count).toBe(0);
    });
  });

  describe('complex filtering scenarios', () => {
    it('should correctly identify merged vs closed pull requests', () => {
      const mergedCount = countItemsMatchingFilter(mockGitHubItems, 'status', 'merged', []);
      const closedCount = countItemsMatchingFilter(mockGitHubItems, 'status', 'closed', []);
      
      expect(mergedCount).toBe(1); // Item 4 is merged
      expect(closedCount).toBe(2); // Items 2 (issue) and 5 (closed PR, not merged)
    });

    it('should handle label filtering with various label combinations', () => {
      // Count items with 'bug' label
      const bugCount = countItemsMatchingFilter(mockGitHubItems, 'label', 'bug', []);
      expect(bugCount).toBe(2);
      
      // Count items with 'feature' label
      const featureCount = countItemsMatchingFilter(mockGitHubItems, 'label', 'feature', []);
      expect(featureCount).toBe(1);
      
      // Count items with 'documentation' label
      const docCount = countItemsMatchingFilter(mockGitHubItems, 'label', 'documentation', []);
      expect(docCount).toBe(1);
    });

    it('should properly handle repository URL transformation', () => {
      // Test that the repository URL transformation works correctly
      const repo1Items = mockGitHubItems.filter(item => 
        item.repository_url?.replace('https://api.github.com/repos/', '') === 'user/repo1'
      );
      expect(repo1Items).toHaveLength(2);
      
      const count = countItemsMatchingFilter(mockGitHubItems, 'repo', 'user/repo1', []);
      expect(count).toBe(repo1Items.length);
    });
  });
}); 