import { renderHook } from '@testing-library/react';
import { useMemo } from 'react';

interface GitHubLabel {
  name: string;
  color?: string;
  description?: string;
}

interface GitHubItem {
  id: number;
  html_url: string;
  title: string;
  pull_request?: {
    merged_at?: string;
    url?: string;
  };
  created_at: string;
  updated_at: string;
  state: string;
  body?: string;
  labels?: GitHubLabel[];
  repository_url?: string;
  repository?: { full_name: string; html_url: string };
  merged?: boolean;
  merged_at?: string;
  closed_at?: string;
  number?: number;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

// Mock data for testing
const mockItems: GitHubItem[] = [
  {
    id: 1,
    html_url: 'https://github.com/test/repo/issues/1',
    title: 'Bug: Something is broken',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    state: 'open',
    user: {
      login: 'user1',
      avatar_url: 'https://github.com/user1.png',
      html_url: 'https://github.com/user1'
    },
    labels: [
      { name: 'bug', color: 'ff0000' },
      { name: 'high-priority', color: 'ff00ff' }
    ],
    repository_url: 'https://api.github.com/repos/test/repo'
  },
  {
    id: 2,
    html_url: 'https://github.com/test/repo/pull/2',
    title: 'Feature: Add new functionality',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
    state: 'open',
    pull_request: {},
    user: {
      login: 'user2',
      avatar_url: 'https://github.com/user2.png',
      html_url: 'https://github.com/user2'
    },
    labels: [
      { name: 'enhancement', color: '00ff00' }
    ],
    repository_url: 'https://api.github.com/repos/test/repo'
  },
  {
    id: 3,
    html_url: 'https://github.com/test/repo/pull/3',
    title: 'Fix: Update dependencies',
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-06T00:00:00Z',
    state: 'closed',
    pull_request: {
      merged_at: '2024-01-06T00:00:00Z'
    },
    merged: true,
    user: {
      login: 'user3',
      avatar_url: 'https://github.com/user3.png',
      html_url: 'https://github.com/user3'
    },
    labels: [
      { name: 'dependencies', color: '0000ff' },
      { name: 'maintenance', color: 'cccccc' }
    ],
    repository_url: 'https://api.github.com/repos/test/repo'
  },
  {
    id: 4,
    html_url: 'https://github.com/test/other-repo/issues/4',
    title: 'Documentation update needed',
    created_at: '2024-01-07T00:00:00Z',
    updated_at: '2024-01-08T00:00:00Z',
    state: 'closed',
    user: {
      login: 'user4',
      avatar_url: 'https://github.com/user4.png',
      html_url: 'https://github.com/user4'
    },
    labels: [
      { name: 'documentation', color: 'yellow' }
    ],
    repository_url: 'https://api.github.com/repos/test/other-repo'
  }
];

// Helper function to simulate the filtering logic
const useFilteredResults = (
  results: GitHubItem[],
  {
    filter,
    statusFilter,
    labelFilter,
    excludedLabels,
    repoFilters,
    searchText,
    sortOrder
  }: {
    filter: 'all' | 'issue' | 'pr';
    statusFilter: 'all' | 'open' | 'closed' | 'merged';
    labelFilter: string;
    excludedLabels: string[];
    repoFilters: string[];
    searchText: string;
    sortOrder: 'updated' | 'created';
  }
) => {
  return useMemo(() => {
    return results.filter(item => {
      // Apply type filter
      if (filter === 'pr' && !item.pull_request) return false;
      if (filter === 'issue' && item.pull_request) return false;

      // Apply status filter
      if (statusFilter === 'merged') {
        if (!item.pull_request) return false;
        return item.pull_request.merged_at || item.merged;
      }
      if (statusFilter !== 'all') {
        if (item.pull_request && (item.pull_request.merged_at || item.merged)) return false;
        return item.state === statusFilter;
      }

      // Apply label filters
      if (labelFilter && !item.labels?.some((label: GitHubLabel) => label.name === labelFilter)) return false;
      if (excludedLabels.length > 0 && item.labels?.some((label: GitHubLabel) => excludedLabels.includes(label.name))) return false;

      // Apply repo filters
      if (repoFilters.length > 0) {
        const itemRepo = item.repository_url?.replace('https://api.github.com/repos/', '');
        if (!itemRepo || !repoFilters.includes(itemRepo)) return false;
      }

      // Apply text search
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(searchLower);
        const bodyMatch = item.body?.toLowerCase().includes(searchLower);
        if (!titleMatch && !bodyMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(sortOrder === 'updated' ? a.updated_at : a.created_at);
      const dateB = new Date(sortOrder === 'updated' ? b.updated_at : b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
  }, [results, filter, statusFilter, labelFilter, excludedLabels, repoFilters, searchText, sortOrder]);
};

describe('Filtering Functionality', () => {
  describe('Type Filtering', () => {
    it('should filter issues correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'issue',
          statusFilter: 'all',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated'
        })
      );
      
      expect(result.current.length).toBe(2);
      expect(result.current.every((item: GitHubItem) => !item.pull_request)).toBe(true);
    });

    it('should filter pull requests correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'pr',
          statusFilter: 'all',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated'
        })
      );
      
      expect(result.current.length).toBe(2);
      expect(result.current.every((item: GitHubItem) => !!item.pull_request)).toBe(true);
    });
  });

  describe('Status Filtering', () => {
    it('should filter open items correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'open',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated'
        })
      );
      
      expect(result.current.length).toBe(2);
      expect(result.current.every((item: GitHubItem) => item.state === 'open')).toBe(true);
    });

    it('should filter merged pull requests correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'merged',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated'
        })
      );
      
      expect(result.current.length).toBe(1);
      expect(result.current[0].merged).toBe(true);
    });
  });

  describe('Label Filtering', () => {
    it('should filter by included label correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'all',
          labelFilter: 'bug',
          excludedLabels: [],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated'
        })
      );
      
      expect(result.current.length).toBe(1);
      expect(result.current[0].labels?.some((label: GitHubLabel) => label.name === 'bug')).toBe(true);
    });

    it('should filter by excluded labels correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'all',
          labelFilter: '',
          excludedLabels: ['bug', 'enhancement'],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated'
        })
      );
      
      expect(result.current.length).toBe(2);
      expect(result.current.every((item: GitHubItem) => 
        !item.labels?.some((label: GitHubLabel) => ['bug', 'enhancement'].includes(label.name))
      )).toBe(true);
    });

    it('should handle combination of included and excluded labels', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'all',
          labelFilter: 'maintenance',
          excludedLabels: ['bug', 'enhancement'],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated'
        })
      );
      
      expect(result.current.length).toBe(1);
      expect(result.current[0].labels?.some((label: GitHubLabel) => label.name === 'maintenance')).toBe(true);
      expect(result.current[0].labels?.some((label: GitHubLabel) => ['bug', 'enhancement'].includes(label.name))).toBe(false);
    });
  });

  describe('Repository Filtering', () => {
    it('should filter by repository correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'all',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: ['test/repo'],
          searchText: '',
          sortOrder: 'updated'
        })
      );
      
      expect(result.current.length).toBe(3);
      expect(result.current.every((item: GitHubItem) => 
        item.repository_url?.includes('test/repo')
      )).toBe(true);
    });
  });

  describe('Text Search', () => {
    it('should filter by text in title correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'all',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: [],
          searchText: 'Feature',
          sortOrder: 'updated'
        })
      );
      
      expect(result.current.length).toBe(1);
      expect(result.current[0].title.includes('Feature')).toBe(true);
    });
  });

  describe('Sort Order', () => {
    it('should sort by updated date correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'all',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: [],
          searchText: '',
          sortOrder: 'updated'
        })
      );
      
      const dates = result.current.map(item => new Date(item.updated_at).getTime());
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });

    it('should sort by created date correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'all',
          statusFilter: 'all',
          labelFilter: '',
          excludedLabels: [],
          repoFilters: [],
          searchText: '',
          sortOrder: 'created'
        })
      );
      
      const dates = result.current.map(item => new Date(item.created_at).getTime());
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });
  });

  describe('Combined Filters', () => {
    it('should handle multiple filters correctly', () => {
      const { result } = renderHook(() =>
        useFilteredResults(mockItems, {
          filter: 'pr',
          statusFilter: 'merged',
          labelFilter: 'dependencies',
          excludedLabels: ['enhancement'],
          repoFilters: ['test/repo'],
          searchText: 'Fix',
          sortOrder: 'updated'
        })
      );
      
      expect(result.current.length).toBe(1);
      const item = result.current[0];
      expect(item.pull_request).toBeTruthy();
      expect(item.merged).toBe(true);
      expect(item.labels?.some((label: GitHubLabel) => label.name === 'dependencies')).toBe(true);
      expect(item.labels?.some((label: GitHubLabel) => label.name === 'enhancement')).toBe(false);
      expect(item.repository_url?.includes('test/repo')).toBe(true);
      expect(item.title.includes('Fix')).toBe(true);
    });
  });
}); 