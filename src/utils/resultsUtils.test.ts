import { describe, it, expect } from 'vitest';
import {
  extractAvailableLabels,
  filterByType,
  filterByStatus,
  filterByLabels,
  filterByRepository,
  filterByText,
  sortItems,
  applyFiltersAndSort,
  isMerged,
  getRepositoryName,
  hasActiveFilters,
  createDefaultFilter,
  getFilterSummary,
  ResultsFilter
} from './resultsUtils';
import type { GitHubItem } from '../types';

// Sample test data
const mockGitHubItems: GitHubItem[] = [
  // Open Issue
  {
    id: 1,
    title: 'Fix critical bug in authentication system',
    html_url: 'https://github.com/user/repo1/issues/1',
    state: 'open',
    created_at: '2023-12-01T10:00:00Z',
    updated_at: '2023-12-02T15:30:00Z',
    closed_at: undefined,
    body: 'This is a critical bug that needs immediate attention in the auth module.',
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
    title: 'Update documentation for API endpoints',
    html_url: 'https://github.com/user/repo1/issues/2',
    state: 'closed',
    created_at: '2023-11-28T09:15:00Z',
    updated_at: '2023-12-01T14:20:00Z',
    closed_at: '2023-12-01T14:20:00Z',
    body: 'Documentation needs to be updated for new API.',
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
    title: 'Add new feature for data export functionality',
    html_url: 'https://github.com/user/repo2/pull/3',
    state: 'open',
    created_at: '2023-11-30T16:45:00Z',
    updated_at: '2023-12-03T11:00:00Z',
    closed_at: undefined,
    body: 'Implements comprehensive data export functionality with CSV and JSON support.',
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
    title: 'Fix performance issue in search algorithm',
    html_url: 'https://github.com/user/repo2/pull/4',
    state: 'closed',
    created_at: '2023-11-25T12:00:00Z',
    updated_at: '2023-11-26T10:30:00Z',
    closed_at: '2023-11-26T10:30:00Z',
    body: 'Optimizes search performance by implementing better indexing.',
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
  }
];

describe('resultsUtils', () => {
  describe('extractAvailableLabels', () => {
    it('should extract unique labels from GitHub items', () => {
      const labels = extractAvailableLabels(mockGitHubItems);
      
      expect(labels).toEqual([
        'backend',
        'bug',
        'documentation',
        'feature',
        'good-first-issue',
        'performance',
        'priority-high'
      ]);
    });

    it('should return empty array for empty items', () => {
      const labels = extractAvailableLabels([]);
      expect(labels).toEqual([]);
    });

    it('should return empty array for non-array input', () => {
      const labels = extractAvailableLabels(null as any);
      expect(labels).toEqual([]);
    });

    it('should handle items without labels', () => {
      const itemsWithoutLabels = [
        { ...mockGitHubItems[0], labels: [] },
        { ...mockGitHubItems[1], labels: undefined }
      ] as GitHubItem[];
      
      const labels = extractAvailableLabels(itemsWithoutLabels);
      expect(labels).toEqual([]);
    });

    it('should sort labels alphabetically (case-insensitive)', () => {
      const itemsWithMixedCase = [
        {
          ...mockGitHubItems[0],
          labels: [
            { name: 'Zebra', color: '000000', description: 'Z label' },
            { name: 'apple', color: '000000', description: 'A label' },
            { name: 'Bug', color: '000000', description: 'B label' }
          ]
        }
      ] as GitHubItem[];
      
      const labels = extractAvailableLabels(itemsWithMixedCase);
      expect(labels).toEqual(['apple', 'Bug', 'Zebra']);
    });
  });

  describe('filterByType', () => {
    it('should return all items when filter is "all"', () => {
      const result = filterByType(mockGitHubItems, 'all');
      expect(result).toHaveLength(4);
    });

    it('should return only issues when filter is "issue"', () => {
      const result = filterByType(mockGitHubItems, 'issue');
      expect(result).toHaveLength(2);
      expect(result.every(item => !item.pull_request)).toBe(true);
    });

    it('should return only pull requests when filter is "pr"', () => {
      const result = filterByType(mockGitHubItems, 'pr');
      expect(result).toHaveLength(2);
      expect(result.every(item => !!item.pull_request)).toBe(true);
    });
  });

  describe('filterByStatus', () => {
    it('should return all items when statusFilter is "all"', () => {
      const result = filterByStatus(mockGitHubItems, 'all');
      expect(result).toHaveLength(4);
    });

    it('should return only open items when statusFilter is "open"', () => {
      const result = filterByStatus(mockGitHubItems, 'open');
      expect(result).toHaveLength(2);
      expect(result.every(item => item.state === 'open')).toBe(true);
    });

    it('should return only closed (non-merged) items when statusFilter is "closed"', () => {
      const result = filterByStatus(mockGitHubItems, 'closed');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2); // The closed issue
    });

    it('should return only merged items when statusFilter is "merged"', () => {
      const result = filterByStatus(mockGitHubItems, 'merged');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(4); // The merged PR
    });

    it('should exclude merged PRs from closed filter', () => {
      const result = filterByStatus(mockGitHubItems, 'closed');
      const mergedPR = result.find(item => item.id === 4);
      expect(mergedPR).toBeUndefined();
    });
  });

  describe('filterByLabels', () => {
    it('should filter by inclusive label', () => {
      const result = filterByLabels(mockGitHubItems, 'bug', []);
      expect(result).toHaveLength(2);
      expect(result.every(item => item.labels?.some(l => l.name === 'bug'))).toBe(true);
    });

    it('should filter by excluded labels', () => {
      const result = filterByLabels(mockGitHubItems, '', ['bug']);
      expect(result).toHaveLength(2);
      expect(result.every(item => !item.labels?.some(l => l.name === 'bug'))).toBe(true);
    });

    it('should apply both inclusive and exclusive filters', () => {
      const result = filterByLabels(mockGitHubItems, 'bug', ['performance']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1); // Has bug but not performance label
    });

    it('should return all items when no filters applied', () => {
      const result = filterByLabels(mockGitHubItems, '', []);
      expect(result).toHaveLength(4);
    });

    it('should handle items without labels', () => {
      const itemsWithoutLabels = [
        { ...mockGitHubItems[0], labels: undefined }
      ] as GitHubItem[];
      
      const result = filterByLabels(itemsWithoutLabels, 'bug', []);
      expect(result).toHaveLength(0);
    });
  });

  describe('filterByRepository', () => {
    it('should return all items when no repo filters', () => {
      const result = filterByRepository(mockGitHubItems, []);
      expect(result).toHaveLength(4);
    });

    it('should filter by single repository', () => {
      const result = filterByRepository(mockGitHubItems, ['user/repo1']);
      expect(result).toHaveLength(2);
      expect(result.every(item => 
        item.repository_url?.includes('user/repo1')
      )).toBe(true);
    });

    it('should filter by multiple repositories', () => {
      const result = filterByRepository(mockGitHubItems, ['user/repo1', 'user/repo2']);
      expect(result).toHaveLength(4);
    });

    it('should handle non-existent repository', () => {
      const result = filterByRepository(mockGitHubItems, ['user/nonexistent']);
      expect(result).toHaveLength(0);
    });

    it('should handle items without repository_url', () => {
      const itemsWithoutRepo = [
        { ...mockGitHubItems[0], repository_url: undefined }
      ] as GitHubItem[];
      
      const result = filterByRepository(itemsWithoutRepo, ['user/repo1']);
      expect(result).toHaveLength(0);
    });
  });

  describe('filterByText', () => {
    it('should return all items when no search text', () => {
      const result = filterByText(mockGitHubItems, '');
      expect(result).toHaveLength(4);
    });

    it('should filter by title text (case-insensitive)', () => {
      const result = filterByText(mockGitHubItems, 'CRITICAL');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should filter by body text', () => {
      const result = filterByText(mockGitHubItems, 'CSV');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(3);
    });

    it('should match both title and body', () => {
      const result = filterByText(mockGitHubItems, 'api');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('should handle whitespace-only search', () => {
      const result = filterByText(mockGitHubItems, '   ');
      expect(result).toHaveLength(4);
    });

    it('should handle items without body', () => {
      const itemsWithoutBody = [
        { ...mockGitHubItems[0], body: undefined }
      ] as GitHubItem[];
      
      const result = filterByText(itemsWithoutBody, 'critical');
      expect(result).toHaveLength(1); // Should still match title
    });
  });

  describe('sortItems', () => {
    it('should sort by updated date (newest first)', () => {
      const result = sortItems(mockGitHubItems, 'updated');
      
      // Item 3 has the most recent updated_at
      expect(result[0].id).toBe(3);
      expect(result[1].id).toBe(1);
      expect(result[2].id).toBe(2);
      expect(result[3].id).toBe(4);
    });

    it('should sort by created date (newest first)', () => {
      const result = sortItems(mockGitHubItems, 'created');
      
      // Item 1 has the most recent created_at
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
      expect(result[2].id).toBe(2);
      expect(result[3].id).toBe(4);
    });

    it('should not modify original array', () => {
      const original = [...mockGitHubItems];
      const result = sortItems(mockGitHubItems, 'updated');
      
      expect(result).not.toBe(mockGitHubItems);
      expect(mockGitHubItems).toEqual(original);
    });
  });

  describe('applyFiltersAndSort', () => {
    it('should apply all filters and sort by created date', () => {
      const filters: ResultsFilter = {
        filter: 'all',
        statusFilter: 'all',
        labelFilter: '',
        excludedLabels: [],
        repoFilters: [],
        searchText: ''
      };
      
      const result = applyFiltersAndSort(mockGitHubItems, filters, 'created');
      
      expect(result).toHaveLength(4);
      // Should be sorted by created date (newest first)
      expect(new Date(result[0].created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(result[1].created_at).getTime()
      );
    });

    it('should apply filters with PR filter and sort by updated date', () => {
      const filters: ResultsFilter = {
        filter: 'pr',
        statusFilter: 'all',
        labelFilter: '',
        excludedLabels: [],
        repoFilters: [],
        searchText: ''
      };
      
      const result = applyFiltersAndSort(mockGitHubItems, filters, 'updated');
      
      expect(result).toHaveLength(2);
      expect(result.every(item => !!item.pull_request)).toBe(true);
    });

    it('should handle complex filtering', () => {
      const filters: ResultsFilter = {
        filter: 'all',
        statusFilter: 'open',
        labelFilter: 'bug',
        excludedLabels: ['performance'],
        repoFilters: ['user/repo1'],
        searchText: 'critical'
      };

      const result = applyFiltersAndSort(mockGitHubItems, filters, 'updated');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should return empty array for non-array input', () => {
      const filters = createDefaultFilter();
      const result = applyFiltersAndSort(null as any, filters, 'created');
      expect(result).toEqual([]);
    });
  });

  describe('isMerged', () => {
    it('should return true for merged pull request', () => {
      const mergedPR = mockGitHubItems.find(item => item.id === 4)!;
      expect(isMerged(mergedPR)).toBe(true);
    });

    it('should return false for open pull request', () => {
      const openPR = mockGitHubItems.find(item => item.id === 3)!;
      expect(isMerged(openPR)).toBe(false);
    });

    it('should return false for issues', () => {
      const issue = mockGitHubItems.find(item => item.id === 1)!;
      expect(isMerged(issue)).toBe(false);
    });
  });

  describe('getRepositoryName', () => {
    it('should extract repository name from URL', () => {
      const result = getRepositoryName(mockGitHubItems[0]);
      expect(result).toBe('user/repo1');
    });

    it('should return undefined for missing repository_url', () => {
      const itemWithoutRepo = { ...mockGitHubItems[0], repository_url: undefined };
      const result = getRepositoryName(itemWithoutRepo);
      expect(result).toBeUndefined();
    });
  });

  describe('hasActiveFilters', () => {
    it('should return false for default filters', () => {
      const filters = createDefaultFilter();
      expect(hasActiveFilters(filters)).toBe(false);
    });

    it('should return true when filter is not default', () => {
      const filters: ResultsFilter = {
        ...createDefaultFilter(),
        filter: 'pr'
      };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when type filter is active', () => {
      const filters = { ...createDefaultFilter(), filter: 'pr' as const };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when status filter is active', () => {
      const filters = { ...createDefaultFilter(), statusFilter: 'open' as const };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when label filter is active', () => {
      const filters = { ...createDefaultFilter(), labelFilter: 'bug' };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when excluded labels are active', () => {
      const filters = { ...createDefaultFilter(), excludedLabels: ['wontfix'] };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when search text is active', () => {
      const filters = { ...createDefaultFilter(), searchText: 'test' };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when repo filters are active', () => {
      const filters = { ...createDefaultFilter(), repoFilters: ['user/repo1'] };
      expect(hasActiveFilters(filters)).toBe(true);
    });
  });

  describe('createDefaultFilter', () => {
    it('should create default filter without sortOrder', () => {
      const defaultFilter = createDefaultFilter();
      expect(defaultFilter).toEqual({
        filter: 'all',
        statusFilter: 'all',
        labelFilter: '',
        excludedLabels: [],
        repoFilters: [],
        searchText: ''
      });
    });
  });

  describe('getFilterSummary', () => {
    it('should return empty array for default filters', () => {
      const filters = createDefaultFilter();
      const summary = getFilterSummary(filters);
      expect(summary).toEqual([]);
    });

    it('should include all active filters in summary', () => {
      const filters: ResultsFilter = {
        filter: 'pr',
        statusFilter: 'open',
        labelFilter: 'bug',
        excludedLabels: ['wontfix'],
        repoFilters: ['user/repo1'],
        searchText: 'test query'
      };

      const summary = getFilterSummary(filters);
      
      expect(summary).toEqual([
        'Type: PRs',
        'Status: open',
        'Label: bug',
        'Excluded labels: wontfix',
        'Search: "test query"',
        'Repos: user/repo1'
      ]);
    });

    it('should handle multiple excluded labels and repos', () => {
      const filters: ResultsFilter = {
        ...createDefaultFilter(),
        excludedLabels: ['wontfix', 'duplicate'],
        repoFilters: ['user/repo1', 'user/repo2']
      };

      const summary = getFilterSummary(filters);
      
      expect(summary).toEqual([
        'Excluded labels: wontfix, duplicate',
        'Repos: user/repo1, user/repo2'
      ]);
    });
  });

  describe('Comprehensive filtering scenarios', () => {
    it('should handle complex filter combinations', () => {
      const filters: ResultsFilter = {
        filter: 'pr',
        statusFilter: 'open',
        labelFilter: 'bug',
        excludedLabels: ['wontfix'],
        repoFilters: [],
        searchText: ''
      };

      const result = applyFiltersAndSort(mockGitHubItems, filters, 'updated');
      
      // Should return open PRs with bug label but without wontfix label
      expect(result.every(item => !!item.pull_request)).toBe(true);
      expect(result.every(item => item.state === 'open')).toBe(true);
      expect(result.every(item => item.labels?.some(l => l.name === 'bug'))).toBe(true);
      expect(result.every(item => !item.labels?.some(l => l.name === 'wontfix'))).toBe(true);
    });

    it('should handle multiple repository filters', () => {
      const filters: ResultsFilter = {
        filter: 'all',
        statusFilter: 'all',
        labelFilter: '',
        excludedLabels: [],
        repoFilters: ['octocat/Hello-World', 'octocat/Spoon-Knife'],
        searchText: ''
      };

      const result = applyFiltersAndSort(mockGitHubItems, filters, 'created');
      
      // Should only return items from specified repositories
      expect(result.every(item => {
        const repo = item.repository_url?.replace('https://api.github.com/repos/', '');
        return repo && ['octocat/Hello-World', 'octocat/Spoon-Knife'].includes(repo);
      })).toBe(true);
    });
  });
}); 