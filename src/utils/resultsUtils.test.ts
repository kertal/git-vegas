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
  getItemType,
  ResultsFilter,
  parseSearchText,
} from './resultsUtils';
import type { GitHubItem } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

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
      html_url: 'https://github.com/testuser',
    },
    repository_url: 'https://api.github.com/repos/user/repo1',
    labels: [
      { name: 'bug', color: 'ff0000', description: 'Something is broken' },
      { name: 'priority-high', color: 'ff9900', description: 'High priority' },
    ],
    pull_request: undefined,
    merged: false,
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
      html_url: 'https://github.com/docwriter',
    },
    repository_url: 'https://api.github.com/repos/user/repo1',
    labels: [
      { name: 'documentation', color: '0075ca', description: 'Documentation' },
      {
        name: 'good-first-issue',
        color: '7057ff',
        description: 'Good for newcomers',
      },
    ],
    pull_request: undefined,
    merged: false,
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
      html_url: 'https://github.com/developer',
    },
    repository_url: 'https://api.github.com/repos/user/repo2',
    labels: [
      { name: 'feature', color: '00ff00', description: 'New feature' },
      { name: 'backend', color: 'c2e0c6', description: 'Backend related' },
    ],
    pull_request: {
      merged_at: undefined,
      url: 'https://api.github.com/repos/user/repo2/pulls/3',
    },
    merged: false,
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
      html_url: 'https://github.com/optimizer',
    },
    repository_url: 'https://api.github.com/repos/user/repo2',
    labels: [
      {
        name: 'performance',
        color: 'fbca04',
        description: 'Performance improvement',
      },
      { name: 'bug', color: 'ff0000', description: 'Something is broken' },
    ],
    pull_request: {
      merged_at: '2023-11-26T10:30:00Z',
      url: 'https://api.github.com/repos/user/repo2/pulls/4',
    },
    merged: true,
  },
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
        'priority-high',
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
        { ...mockGitHubItems[1], labels: undefined },
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
            { name: 'Bug', color: '000000', description: 'B label' },
          ],
        },
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

    it('should return only comments when filter is "comment"', () => {
      const commentItem = {
        ...mockGitHubItems[0],
        title: 'Comment on: Test Issue',
        pull_request: undefined,
      };

      const itemsWithComment = [...mockGitHubItems, commentItem];
      const result = filterByType(itemsWithComment, 'comment');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Comment on: Test Issue');
    });
  });

  describe('getItemType', () => {
    it('should identify item types correctly', () => {
      const issueItem = { ...mockGitHubItems[0], pull_request: undefined };
      const prItem = { ...mockGitHubItems[2] }; // Use item 2 which has pull_request
      const commentItem = {
        ...mockGitHubItems[0],
        title: 'Comment on: Test Issue',
        pull_request: undefined,
      };

      expect(getItemType(issueItem)).toBe('issue');
      expect(getItemType(prItem)).toBe('pr');
      expect(getItemType(commentItem)).toBe('comment');
    });

    it('should categorize pull request reviews as pr', () => {
      const reviewItem: GitHubItem = {
        id: 123,
        title: 'Reviewed: Fix bug in authentication',
        html_url: 'https://github.com/test/repo/pull/123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        state: 'open',
        user: {
          login: 'reviewer',
          avatar_url: 'https://github.com/reviewer.png',
          html_url: 'https://github.com/reviewer',
        },
        pull_request: {
          merged_at: undefined,
          url: 'https://github.com/test/repo/pull/123',
        },
      };

      const result = getItemType(reviewItem);
      expect(result).toBe('pr');
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
      const result = filterByLabels(mockGitHubItems, ['bug'], []);
      expect(result).toHaveLength(2);
      expect(
        result.every(item => item.labels?.some(l => l.name === 'bug'))
      ).toBe(true);
    });

    it('should filter by excluded labels', () => {
      const result = filterByLabels(mockGitHubItems, [], ['bug']);
      expect(result).toHaveLength(2);
      expect(
        result.every(item => !item.labels?.some(l => l.name === 'bug'))
      ).toBe(true);
    });

    it('should apply both inclusive and exclusive filters', () => {
      const result = filterByLabels(mockGitHubItems, ['bug'], ['performance']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1); // Has bug but not performance label
    });

    it('should return all items when no filters applied', () => {
      const result = filterByLabels(mockGitHubItems, [], []);
      expect(result).toHaveLength(4);
    });

    it('should handle items without labels', () => {
      const itemsWithoutLabels = [
        { ...mockGitHubItems[0], labels: undefined },
      ] as GitHubItem[];

      const result = filterByLabels(itemsWithoutLabels, ['bug'], []);
      expect(result).toHaveLength(0);
    });

    it('should handle undefined includedLabels parameter', () => {
      const result = filterByLabels(mockGitHubItems, undefined, ['performance']);
      expect(result).toHaveLength(3); // Should exclude items with 'performance' label
      expect(
        result.every(item => !item.labels?.some(l => l.name === 'performance'))
      ).toBe(true);
    });

    it('should handle undefined excludedLabels parameter', () => {
      const result = filterByLabels(mockGitHubItems, ['bug'], undefined);
      expect(result).toHaveLength(2); // Should include only items with 'bug' label
      expect(
        result.every(item => item.labels?.some(l => l.name === 'bug'))
      ).toBe(true);
    });

    it('should handle both undefined parameters', () => {
      const result = filterByLabels(mockGitHubItems, undefined, undefined);
      expect(result).toHaveLength(4); // Should return all items when no filters
    });

    it('should handle filter object with undefined array properties', () => {
      // This simulates the original error scenario
      const filterWithUndefinedArrays = {
        filter: 'all',
        statusFilter: 'all',
        searchText: '',
        // includedLabels, excludedLabels, and repoFilters are undefined
      } as any;

      // This should not throw an error
      expect(() => {
        applyFiltersAndSort(mockGitHubItems, filterWithUndefinedArrays, 'updated');
      }).not.toThrow();

      const result = applyFiltersAndSort(mockGitHubItems, filterWithUndefinedArrays, 'updated');
      expect(result).toHaveLength(4); // Should return all items
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
      expect(
        result.every(item => item.repository_url?.includes('user/repo1'))
      ).toBe(true);
    });

    it('should filter by multiple repositories', () => {
      const result = filterByRepository(mockGitHubItems, [
        'user/repo1',
        'user/repo2',
      ]);
      expect(result).toHaveLength(4);
    });

    it('should handle non-existent repository', () => {
      const result = filterByRepository(mockGitHubItems, ['user/nonexistent']);
      expect(result).toHaveLength(0);
    });

    it('should handle items without repository_url', () => {
      const itemsWithoutRepo = [
        { ...mockGitHubItems[0], repository_url: undefined },
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
        { ...mockGitHubItems[0], body: undefined },
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
        includedLabels: [],
        excludedLabels: [],
        repoFilters: [],
        searchText: '',
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
        includedLabels: [],
        excludedLabels: [],
        repoFilters: [],
        searchText: '',
      };

      const result = applyFiltersAndSort(mockGitHubItems, filters, 'updated');

      expect(result).toHaveLength(2);
      expect(result.every(item => !!item.pull_request)).toBe(true);
    });

    it('should handle complex filtering', () => {
      const filters: ResultsFilter = {
        filter: 'all',
        statusFilter: 'open',
        includedLabels: ['bug'],
        excludedLabels: ['performance'],
        repoFilters: ['user/repo1'],
        searchText: 'critical',
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

    it('should default to updated date sorting when no sortOrder specified', () => {
      const filters: ResultsFilter = {
        filter: 'all',
        statusFilter: 'all',
        includedLabels: [],
        excludedLabels: [],
        repoFilters: [],
        searchText: '',
      };

      const result = applyFiltersAndSort(mockGitHubItems, filters);

      expect(result).toHaveLength(4);
      // Should be sorted by updated date (newest first) - item 3 has most recent updated_at
      expect(result[0].id).toBe(3);
      expect(result[1].id).toBe(1);
      expect(result[2].id).toBe(2);
      expect(result[3].id).toBe(4);
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
      const itemWithoutRepo = {
        ...mockGitHubItems[0],
        repository_url: undefined,
      };
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
        filter: 'pr',
      };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when type filter is active', () => {
      const filters = { ...createDefaultFilter(), filter: 'pr' as const };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when status filter is active', () => {
      const filters = {
        ...createDefaultFilter(),
        statusFilter: 'open' as const,
      };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when label filter is active', () => {
      const filters = { ...createDefaultFilter(), includedLabels: ['bug'] };
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
        includedLabels: [],
        excludedLabels: [],
        repoFilters: [],
        searchText: '',
        userFilter: '',
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
        includedLabels: ['bug'],
        excludedLabels: ['wontfix'],
        repoFilters: ['user/repo1'],
        searchText: 'test query',
      };

      const summary = getFilterSummary(filters);

      expect(summary).toEqual([
        'Type: PRs',
        'Status: open',
        'Include: bug',
        'Excluded labels: wontfix',
        'Search: "test query"',
        'Repos: user/repo1',
      ]);
    });

    it('should handle multiple excluded labels and repos', () => {
      const filters: ResultsFilter = {
        ...createDefaultFilter(),
        excludedLabels: ['wontfix', 'duplicate'],
        repoFilters: ['user/repo1', 'user/repo2'],
      };

      const summary = getFilterSummary(filters);

      expect(summary).toEqual([
        'Excluded labels: wontfix, duplicate',
        'Repos: user/repo1, user/repo2',
      ]);
    });
  });

  describe('Comprehensive filtering scenarios', () => {
    it('should handle complex filter combinations', () => {
      const filters: ResultsFilter = {
        filter: 'pr',
        statusFilter: 'open',
        includedLabels: ['bug'],
        excludedLabels: ['wontfix'],
        repoFilters: [],
        searchText: '',
      };

      const result = applyFiltersAndSort(mockGitHubItems, filters, 'updated');

      // Should return open PRs with bug label but without wontfix label
      expect(result.every(item => !!item.pull_request)).toBe(true);
      expect(result.every(item => item.state === 'open')).toBe(true);
      expect(
        result.every(item => item.labels?.some(l => l.name === 'bug'))
      ).toBe(true);
      expect(
        result.every(item => !item.labels?.some(l => l.name === 'wontfix'))
      ).toBe(true);
    });

    it('should handle multiple repository filters', () => {
      const filters: ResultsFilter = {
        filter: 'all',
        statusFilter: 'all',
        includedLabels: [],
        excludedLabels: [],
        repoFilters: ['octocat/Hello-World', 'octocat/Spoon-Knife'],
        searchText: '',
      };

      const result = applyFiltersAndSort(mockGitHubItems, filters, 'created');

      // Should only return items from specified repositories
      expect(
        result.every(item => {
          const repo = item.repository_url?.replace(
            'https://api.github.com/repos/',
            ''
          );
          return (
            repo &&
            ['octocat/Hello-World', 'octocat/Spoon-Knife'].includes(repo)
          );
        })
      ).toBe(true);
    });
  });

  describe('parseSearchText', () => {
    it('should return empty arrays and text for empty input', () => {
      const result = parseSearchText('');
      expect(result).toEqual({
        includedLabels: [],
        excludedLabels: [],
        cleanText: '',
      });
    });

    it('should return empty arrays and text for whitespace-only input', () => {
      const result = parseSearchText('   ');
      expect(result).toEqual({
        includedLabels: [],
        excludedLabels: [],
        cleanText: '',
      });
    });

    it('should parse single included label', () => {
      const result = parseSearchText('label:bug');
      expect(result).toEqual({
        includedLabels: ['bug'],
        excludedLabels: [],
        cleanText: '',
      });
    });

    it('should parse single excluded label', () => {
      const result = parseSearchText('-label:wontfix');
      expect(result).toEqual({
        includedLabels: [],
        excludedLabels: ['wontfix'],
        cleanText: '',
      });
    });

    it('should parse multiple included labels', () => {
      const result = parseSearchText('label:bug label:critical');
      expect(result).toEqual({
        includedLabels: ['bug', 'critical'],
        excludedLabels: [],
        cleanText: '',
      });
    });

    it('should parse multiple excluded labels', () => {
      const result = parseSearchText('-label:wontfix -label:duplicate');
      expect(result).toEqual({
        includedLabels: [],
        excludedLabels: ['wontfix', 'duplicate'],
        cleanText: '',
      });
    });

    it('should parse mixed included and excluded labels', () => {
      const result = parseSearchText('label:bug -label:wontfix label:critical -label:duplicate');
      expect(result).toEqual({
        includedLabels: ['bug', 'critical'],
        excludedLabels: ['wontfix', 'duplicate'],
        cleanText: '',
      });
    });

    it('should parse labels with regular text', () => {
      const result = parseSearchText('performance issue label:bug -label:wontfix');
      expect(result).toEqual({
        includedLabels: ['bug'],
        excludedLabels: ['wontfix'],
        cleanText: 'performance issue',
      });
    });

    it('should clean up extra whitespace in text', () => {
      const result = parseSearchText('  performance   issue   label:bug   -label:wontfix  ');
      expect(result).toEqual({
        includedLabels: ['bug'],
        excludedLabels: ['wontfix'],
        cleanText: 'performance issue',
      });
    });

    it('should handle labels with underscores and hyphens', () => {
      const result = parseSearchText('label:good_first_issue -label:help-wanted');
      expect(result).toEqual({
        includedLabels: ['good_first_issue'],
        excludedLabels: ['help-wanted'],
        cleanText: '',
      });
    });
  });

  describe('filterByText with label syntax', () => {
    const mockItemsWithLabels: GitHubItem[] = [
      {
        ...mockGitHubItems[0],
        title: 'Bug in authentication',
        body: 'Authentication fails randomly',
        labels: [
          { name: 'bug', color: 'red' },
          { name: 'critical', color: 'orange' },
        ],
      },
      {
        ...mockGitHubItems[1],
        title: 'Feature request: dark mode',
        body: 'Add dark mode support',
        labels: [
          { name: 'enhancement', color: 'blue' },
          { name: 'good-first-issue', color: 'green' },
        ],
      },
      {
        ...mockGitHubItems[2],
        title: 'Documentation update needed',
        body: 'Update API documentation',
        labels: [
          { name: 'documentation', color: 'purple' },
          { name: 'help-wanted', color: 'yellow' },
        ],
      },
      {
        ...mockGitHubItems[0],
        title: 'Performance issue in search',
        body: 'Search is slow with large datasets',
        labels: [
          { name: 'bug', color: 'red' },
          { name: 'performance', color: 'orange' },
          { name: 'wontfix', color: 'gray' },
        ],
      },
    ];

    it('should filter by single included label', () => {
      const result = filterByText(mockItemsWithLabels, 'label:bug');
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Bug in authentication');
      expect(result[1].title).toBe('Performance issue in search');
    });

    it('should filter by single excluded label', () => {
      const result = filterByText(mockItemsWithLabels, '-label:wontfix');
      expect(result).toHaveLength(3);
      expect(result.find(item => item.title === 'Performance issue in search')).toBeUndefined();
    });

    it('should filter by multiple included labels (AND logic)', () => {
      const result = filterByText(mockItemsWithLabels, 'label:bug label:critical');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Bug in authentication');
    });

    it('should filter by multiple excluded labels', () => {
      const result = filterByText(mockItemsWithLabels, '-label:wontfix -label:help-wanted');
      expect(result).toHaveLength(2);
      expect(result.find(item => item.title === 'Performance issue in search')).toBeUndefined();
      expect(result.find(item => item.title === 'Documentation update needed')).toBeUndefined();
    });

    it('should filter by mixed included and excluded labels', () => {
      const result = filterByText(mockItemsWithLabels, 'label:bug -label:wontfix');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Bug in authentication');
    });

    it('should combine label filters with text search', () => {
      const result = filterByText(mockItemsWithLabels, 'authentication label:bug');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Bug in authentication');
    });

    it('should handle case-insensitive label matching', () => {
      const result = filterByText(mockItemsWithLabels, 'label:BUG');
      expect(result).toHaveLength(2);
    });

    it('should return all items when only text search and no matches', () => {
      const result = filterByText(mockItemsWithLabels, 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('should return items that pass label filters even without text match', () => {
      const result = filterByText(mockItemsWithLabels, 'label:enhancement nonexistent');
      expect(result).toHaveLength(0); // No items match both label:enhancement AND contain "nonexistent"
    });

    it('should handle items without labels', () => {
      const itemsWithoutLabels = [
        { ...mockGitHubItems[0], labels: [] },
        { ...mockGitHubItems[1], labels: undefined },
      ];
      const result = filterByText(itemsWithoutLabels, 'label:bug');
      expect(result).toHaveLength(0);
    });

    it('should handle hyphenated and underscored label names', () => {
      const result = filterByText(mockItemsWithLabels, 'label:good-first-issue');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Feature request: dark mode');
    });

    it('should work with regular text search when no label syntax present', () => {
      const result = filterByText(mockItemsWithLabels, 'authentication');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Bug in authentication');
    });
  });
});
