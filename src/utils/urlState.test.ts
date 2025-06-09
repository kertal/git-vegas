import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseUrlParam,
  validateUrlParam,
  parseUrlParams,
  generateUrlParams,
  generateShareableUrl,
  cleanupUrlParams,
  copyToClipboard,
  extractShareableState,
  applyUrlOverrides,
  ShareableState,
} from './urlState';
import { FormSettings, UISettings } from '../types';
import { createDefaultFilter, ResultsFilter } from './resultsUtils';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock window.location and related APIs
const mockLocation = {
  href: 'http://localhost:3000/',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
};

const mockHistory = {
  replaceState: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true,
});

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(),
};

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
});

// Mock document.execCommand for fallback
document.execCommand = vi.fn();

describe('urlState utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    mockLocation.href = 'http://localhost:3000/';
    mockClipboard.writeText.mockResolvedValue(undefined);
    (document.execCommand as any).mockReturnValue(true);
  });

  describe('parseUrlParam', () => {
    it('should parse string parameters', () => {
      expect(parseUrlParam('test', 'string')).toBe('test');
      expect(parseUrlParam('', 'string')).toBe('');
      expect(parseUrlParam(null, 'string')).toBeNull();
    });

    it('should parse boolean parameters', () => {
      expect(parseUrlParam('true', 'boolean')).toBe(true);
      expect(parseUrlParam('false', 'boolean')).toBe(false);
      expect(parseUrlParam('invalid', 'boolean')).toBe(false);
      expect(parseUrlParam(null, 'boolean')).toBeNull();
    });

    it('should parse string array parameters', () => {
      expect(parseUrlParam('a,b,c', 'string[]')).toEqual(['a', 'b', 'c']);
      expect(parseUrlParam('single', 'string[]')).toEqual(['single']);
      expect(parseUrlParam('a, b , c', 'string[]')).toEqual(['a', 'b', 'c']); // trims whitespace
      expect(parseUrlParam('', 'string[]')).toEqual([]);
      expect(parseUrlParam(null, 'string[]')).toBeNull();
    });
  });

  describe('validateUrlParam', () => {
    it('should validate enum values', () => {
      expect(validateUrlParam('apiMode', 'search')).toBe(true);
      expect(validateUrlParam('apiMode', 'events')).toBe(true);
      expect(validateUrlParam('apiMode', 'invalid')).toBe(false);

      expect(validateUrlParam('filter', 'all')).toBe(true);
      expect(validateUrlParam('filter', 'issue')).toBe(true);
      expect(validateUrlParam('filter', 'invalid')).toBe(false);
    });

    it('should validate date formats', () => {
      expect(validateUrlParam('startDate', '2024-01-01')).toBe(true);
      expect(validateUrlParam('endDate', '2024-12-31')).toBe(true);
      expect(validateUrlParam('startDate', 'invalid-date')).toBe(false);
      expect(validateUrlParam('startDate', '2024-13-01')).toBe(false); // invalid month
      expect(validateUrlParam('startDate', '24-01-01')).toBe(false); // wrong format
    });

    it('should validate username', () => {
      expect(validateUrlParam('username', 'validuser')).toBe(true);
      expect(validateUrlParam('username', 'user-name')).toBe(true);
      expect(validateUrlParam('username', '')).toBe(false);
      expect(validateUrlParam('username', 'a'.repeat(101))).toBe(false); // too long
    });

    it('should validate arrays', () => {
      expect(validateUrlParam('excludedLabels', ['bug', 'feature'])).toBe(true);
      expect(validateUrlParam('repoFilters', ['repo1', 'repo2'])).toBe(true);
      expect(validateUrlParam('excludedLabels', ['bug', 123])).toBe(false); // non-string in array
    });

    it('should allow null/undefined values', () => {
      expect(validateUrlParam('username', null)).toBe(true);
      expect(validateUrlParam('username', undefined)).toBe(true);
    });
  });

  describe('parseUrlParams', () => {
    it('should parse valid URL parameters', () => {
      mockLocation.search =
        '?username=testuser&apiMode=events&isCompactView=true&excludedLabels=bug,feature';

      const result = parseUrlParams();

      expect(result).toEqual({
        username: 'testuser',
        apiMode: 'events',
        isCompactView: true,
        excludedLabels: ['bug', 'feature'],
      });
    });

    it('should ignore invalid parameters', () => {
      mockLocation.search =
        '?username=testuser&apiMode=invalid&startDate=bad-date';

      const result = parseUrlParams();

      expect(result).toEqual({
        username: 'testuser',
      });
    });

    it('should handle empty search params', () => {
      mockLocation.search = '';

      const result = parseUrlParams();

      expect(result).toEqual({});
    });

    it('should handle URL encoding', () => {
      mockLocation.search = '?username=test%20user';

      const result = parseUrlParams();

      expect(result).toEqual({
        username: 'test user',
      });
    });
  });

  describe('generateUrlParams', () => {
    const defaultState: ShareableState = {
      username: '',
      startDate: (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
      })(),
      endDate: new Date().toISOString().split('T')[0],
      apiMode: 'search',
      isCompactView: false,
      timelineViewMode: 'standard',
      filter: 'all',
      statusFilter: 'all',
      excludedLabels: [],
      repoFilters: [],
      searchText: '',
    };

    it('should only include non-default values', () => {
      const state: ShareableState = {
        ...defaultState,
        username: 'testuser',
        apiMode: 'events',
        isCompactView: true,
      };

      const params = generateUrlParams(state);

      expect(params.get('username')).toBe('testuser');
      expect(params.get('apiMode')).toBe('events');
      expect(params.get('isCompactView')).toBe('true');
      expect(params.get('filter')).toBeNull(); // default value

    });

    it('should handle arrays correctly', () => {
      const state: ShareableState = {
        ...defaultState,
        excludedLabels: ['bug', 'feature'],
        repoFilters: ['repo1', 'repo2'],
      };

      const params = generateUrlParams(state);

      expect(params.get('excludedLabels')).toBe('bug,feature');
      expect(params.get('repoFilters')).toBe('repo1,repo2');
    });

    it('should not include empty arrays', () => {
      const state: ShareableState = {
        ...defaultState,
        excludedLabels: [],
        repoFilters: [],
      };

      const params = generateUrlParams(state);

      expect(params.get('excludedLabels')).toBeNull();
      expect(params.get('repoFilters')).toBeNull();
    });
  });

  describe('generateShareableUrl', () => {
    const defaultState: ShareableState = {
      username: '',
      startDate: (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
      })(),
      endDate: new Date().toISOString().split('T')[0],
      apiMode: 'search',
      isCompactView: false,
      timelineViewMode: 'standard',
      filter: 'all',
      statusFilter: 'all',
      excludedLabels: [],
      repoFilters: [],
      searchText: '',
    };

    it('should generate URL with parameters', () => {
      const state: ShareableState = {
        ...defaultState,
        username: 'testuser',
        apiMode: 'events',
      };

      const url = generateShareableUrl(state);

      expect(url).toBe(
        'http://localhost:3000/?username=testuser&apiMode=events'
      );
    });

    it('should generate clean URL when no parameters', () => {
      const url = generateShareableUrl(defaultState);

      expect(url).toBe('http://localhost:3000/');
    });

    it('should handle URL encoding', () => {
      const state: ShareableState = {
        ...defaultState,
        username: 'test user',
      };

      const url = generateShareableUrl(state);

      // URLSearchParams encodes spaces as + instead of %20
      expect(url).toContain('username=test+user');
    });
  });

  describe('cleanupUrlParams', () => {
    it('should remove search parameters', () => {
      mockLocation.search = '?username=test&apiMode=events';
      mockLocation.href = 'http://localhost:3000/?username=test&apiMode=events';

      cleanupUrlParams();

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        {},
        '',
        'http://localhost:3000/'
      );
    });

    it('should not call replaceState if no parameters', () => {
      mockLocation.search = '';

      cleanupUrlParams();

      expect(mockHistory.replaceState).not.toHaveBeenCalled();
    });
  });

  describe('copyToClipboard', () => {
    it('should use clipboard API when available', async () => {
      const result = await copyToClipboard('test text');

      expect(mockClipboard.writeText).toHaveBeenCalledWith('test text');
      expect(result).toBe(true);
    });

    it('should handle clipboard API errors', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Clipboard error'));

      const result = await copyToClipboard('test text');

      expect(result).toBe(false);
    });

    it('should fallback to execCommand when clipboard API unavailable', async () => {
      // Remove clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });

      // Mock DOM methods
      const mockTextArea = {
        value: '',
        style: {},
        focus: vi.fn(),
        select: vi.fn(),
      };

      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValue(mockTextArea as any);
      const appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation(() => mockTextArea as any);
      const removeChildSpy = vi
        .spyOn(document.body, 'removeChild')
        .mockImplementation(() => mockTextArea as any);

      const result = await copyToClipboard('test text');

      expect(createElementSpy).toHaveBeenCalledWith('textarea');
      expect(mockTextArea.value).toBe('test text');
      expect(mockTextArea.focus).toHaveBeenCalled();
      expect(mockTextArea.select).toHaveBeenCalled();
      expect(document.execCommand).toHaveBeenCalledWith('copy');
      expect(result).toBe(true);

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe('extractShareableState', () => {
    it('should extract state from app objects', () => {
      const formSettings: FormSettings = {
        username: 'testuser',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        githubToken: 'secret',
        apiMode: 'events',
      };

      const uiSettings: UISettings = {
        isCompactView: true,
        timelineViewMode: 'standard',
      };

      const currentFilters: ResultsFilter = {
        filter: 'issue',
        statusFilter: 'open',
        excludedLabels: ['wontfix'],
        repoFilters: ['repo1'],
        searchText: 'search term',
      };

      const result = extractShareableState(
        formSettings,
        uiSettings,
        currentFilters,
        'custom search'
      );

      expect(result).toEqual({
        username: 'testuser',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        apiMode: 'events',
        isCompactView: true,
        filter: 'issue',
        statusFilter: 'open',
        excludedLabels: ['wontfix'],
        repoFilters: ['repo1'],
        searchText: 'custom search',
      });
    });
  });

  describe('applyUrlOverrides', () => {
    it('should apply URL overrides to app state', () => {
      const urlState: Partial<ShareableState> = {
        username: 'urluser',
        apiMode: 'events',
        isCompactView: true,
        filter: 'pr',
        excludedLabels: ['bug'],
      };

      const formSettings: FormSettings = {
        username: 'localuser',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        githubToken: 'token',
        apiMode: 'search',
      };

      const uiSettings: UISettings = {
        isCompactView: false,
        timelineViewMode: 'standard',
      };

      const currentFilters = createDefaultFilter();

      const result = applyUrlOverrides(
        urlState,
        formSettings,
        uiSettings,
        currentFilters
      );

      expect(result.formSettings.username).toBe('urluser');
      expect(result.formSettings.apiMode).toBe('events');
      expect(result.formSettings.startDate).toBe('2024-01-01'); // unchanged

      expect(result.uiSettings.isCompactView).toBe(true);

      expect(result.currentFilters.filter).toBe('pr');
      expect(result.currentFilters.excludedLabels).toEqual(['bug']);
      expect(result.currentFilters.statusFilter).toBe('all'); // unchanged
    });

    it('should not override undefined values', () => {
      const urlState: Partial<ShareableState> = {
        username: 'urluser',
        // other fields undefined
      };

      const formSettings: FormSettings = {
        username: 'localuser',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        githubToken: 'token',
        apiMode: 'search',
      };

      const uiSettings: UISettings = {
        isCompactView: false,
        timelineViewMode: 'standard',
      };

      const currentFilters = createDefaultFilter();

      const result = applyUrlOverrides(
        urlState,
        formSettings,
        uiSettings,
        currentFilters
      );

      expect(result.formSettings.username).toBe('urluser');
      expect(result.formSettings.apiMode).toBe('search'); // unchanged
      expect(result.uiSettings.isCompactView).toBe(false); // unchanged
      expect(result.currentFilters.filter).toBe('all'); // unchanged
    });
  });
});
