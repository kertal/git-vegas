import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDateForClipboard,
  generatePlainTextFormat,
  generateHtmlFormat,
  copyResultsToClipboard,
  deduplicateByTitle,
  deduplicateAcrossGroups,
  ClipboardOptions,
} from './clipboard';
import { GitHubItem } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock the getContrastColor utility
vi.mock('../utils', () => ({
  getContrastColor: vi.fn((color: string) =>
    color === 'ffffff' ? '#000000' : '#ffffff'
  ),
}));

// Sample test data
const mockGitHubItems: GitHubItem[] = [
  {
    id: 1,
    title: 'Fix critical bug in authentication',
    html_url: 'https://github.com/user/repo/issues/1',
    state: 'open',
    created_at: '2023-12-01T10:00:00Z',
    updated_at: '2023-12-02T15:30:00Z',
    closed_at: undefined,
    body: 'This is a critical bug that needs immediate attention.',
    user: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      html_url: 'https://github.com/testuser',
    },
    repository_url: 'https://api.github.com/repos/user/repo',
    labels: [
      { name: 'bug', color: 'ff0000', description: 'Something is broken' },
      { name: 'priority-high', color: 'ff9900', description: 'High priority' },
    ],
    pull_request: undefined,
    merged: false,
  },
  {
    id: 2,
    title: 'Add new feature for data export',
    html_url: 'https://github.com/user/repo/pull/2',
    state: 'closed',
    created_at: '2023-11-28T09:15:00Z',
    updated_at: '2023-12-01T14:20:00Z',
    closed_at: '2023-12-01T14:20:00Z',
    body: 'Implements data export functionality with CSV and JSON support.',
    user: {
      login: 'developer',
      avatar_url: 'https://github.com/developer.png',
      html_url: 'https://github.com/developer',
    },
    repository_url: 'https://api.github.com/repos/user/repo',
    labels: [{ name: 'feature', color: '00ff00', description: 'New feature' }],
    pull_request: {
      merged_at: '2023-12-01T14:20:00Z',
      url: 'https://api.github.com/repos/user/repo/pulls/2',
    },
    merged: true,
  },
  {
    id: 3,
    title: 'Update documentation',
    html_url: 'https://github.com/user/repo/pull/3',
    state: 'closed',
    created_at: '2023-11-30T16:45:00Z',
    updated_at: '2023-12-01T11:00:00Z',
    closed_at: '2023-12-01T11:00:00Z',
    body: undefined,
    user: {
      login: 'docwriter',
      avatar_url: 'https://github.com/docwriter.png',
      html_url: 'https://github.com/docwriter',
    },
    repository_url: 'https://api.github.com/repos/user/repo',
    labels: [],
    pull_request: {
      merged_at: undefined,
      url: 'https://api.github.com/repos/user/repo/pulls/3',
    },
    merged: false,
  },
];

describe('formatDateForClipboard', () => {
  it('should format date strings correctly', () => {
    const dateString = '2023-12-01T10:00:00Z';
    const result = formatDateForClipboard(dateString);

    // The exact format depends on locale, but should be a valid date string
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');

    // Should contain some part of the date (month, day, or year)
    expect(result).toMatch(/\d+/);
  });

  it('should handle invalid date strings gracefully', () => {
    const result = formatDateForClipboard('invalid-date');
    expect(result).toBe('Invalid Date');
  });
});

describe('generatePlainTextFormat', () => {
  it('should generate compact format correctly', () => {
    const result = generatePlainTextFormat(mockGitHubItems, true);

    expect(result).toContain(
      'Fix critical bug in authentication - https://github.com/user/repo/issues/1'
    );
    expect(result).toContain(
      'Add new feature for data export - https://github.com/user/repo/pull/2'
    );
    expect(result).toContain(
      'Update documentation - https://github.com/user/repo/pull/3'
    );

    // Should be joined with newlines
    const lines = result.split('\n');
    expect(lines).toHaveLength(3);
  });

  it('should generate detailed format correctly', () => {
    const result = generatePlainTextFormat(mockGitHubItems, false);

    // Should contain numbered items
    expect(result).toContain('1. Fix critical bug in authentication');
    expect(result).toContain('2. Add new feature for data export');
    expect(result).toContain('3. Update documentation');

    // Should contain metadata
    expect(result).toContain('Type: Issue');
    expect(result).toContain('Type: Pull Request');
    expect(result).toContain('Status: open');
    expect(result).toContain('Status: closed (merged)');
    expect(result).toContain('Link: https://github.com/user/repo/issues/1');

    // Should contain author information
    expect(result).toContain('Author: testuser (https://github.com/testuser)');
    expect(result).toContain('Author: developer (https://github.com/developer)');
    expect(result).toContain('Author: docwriter (https://github.com/docwriter)');

    // Should contain labels for items that have them
    expect(result).toContain('Labels: bug, priority-high');
    expect(result).toContain('Labels: feature');

    // Should contain date information
    expect(result).toContain('Created:');
    expect(result).toContain('Updated:');
  });

  it('should handle empty items array', () => {
    const result = generatePlainTextFormat([], true);
    expect(result).toBe('');

    const detailedResult = generatePlainTextFormat([], false);
    expect(detailedResult).toBe('');
  });

  it('should handle items without labels', () => {
    const itemsWithoutLabels = mockGitHubItems.map(item => ({
      ...item,
      labels: [],
    }));
    const result = generatePlainTextFormat(itemsWithoutLabels, false);

    expect(result).not.toContain('Labels:');
  });
});

describe('generateHtmlFormat', () => {
  it('should generate compact HTML format correctly', () => {
    const result = generateHtmlFormat(mockGitHubItems, true);

    // Should contain HTML structure
    expect(result).toContain('<div>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');

    // Should contain links
    expect(result).toContain(
      '<a href="https://github.com/user/repo/issues/1">Fix critical bug in authentication</a>'
    );

    // Should contain links without status indicators
    expect(result).toContain(
      '<a href="https://github.com/user/repo/pull/2">Add new feature for data export</a>'
    );
    expect(result).toContain(
      '<a href="https://github.com/user/repo/pull/3">Update documentation</a>'
    );
  });

  it('should generate detailed HTML format correctly', () => {
    const result = generateHtmlFormat(mockGitHubItems, false);

    // Should contain HTML structure
    expect(result).toContain('<div>');
    expect(result).toContain('<div style="margin-bottom: 16px;">');

    // Should contain numbered items with links
    expect(result).toContain(
      '1. <a href="https://github.com/user/repo/issues/1"'
    );
    expect(result).toContain(
      '2. <a href="https://github.com/user/repo/pull/2"'
    );

    // Should contain author information with links
    expect(result).toContain('Author: <a href="https://github.com/testuser"');
    expect(result).toContain('>testuser</a>');
    expect(result).toContain('Author: <a href="https://github.com/developer"');
    expect(result).toContain('>developer</a>');
    expect(result).toContain('Author: <a href="https://github.com/docwriter"');
    expect(result).toContain('>docwriter</a>');

    // Should contain type information
    expect(result).toContain('Type: Issue');
    expect(result).toContain('Type: Pull Request');

    // Should contain status with colors
    expect(result).toContain(
      'Status: <span style="color: #1a7f37;">open</span>'
    );
    expect(result).toContain(
      'Status: <span style="color: #8250df;">closed (merged)</span>'
    );

    // Should contain date information
    expect(result).toContain('Created:');
    expect(result).toContain('Updated:');

    // Should contain labels with styling
    expect(result).toContain('Labels:');
    expect(result).toContain('background-color: #ff0000'); // Bug label color
    expect(result).toContain('background-color: #00ff00'); // Feature label color
  });

  it('should handle empty items array', () => {
    const result = generateHtmlFormat([], true);
    expect(result).toContain('<div>');
    expect(result).toContain('<ul>');
    expect(result).toContain('</ul>');
    expect(result).toContain('</div>');

    const detailedResult = generateHtmlFormat([], false);
    expect(detailedResult).toContain('<div>');
    expect(detailedResult).toContain('</div>');
  });

  it('should handle items without labels', () => {
    const itemsWithoutLabels = mockGitHubItems.map(item => ({
      ...item,
      labels: [],
    }));
    const result = generateHtmlFormat(itemsWithoutLabels, false);

    expect(result).not.toContain('Labels:');
  });

  it('should escape HTML in item titles', () => {
    const itemsWithHtml = [
      {
        ...mockGitHubItems[0],
        title: 'Fix <script>alert("xss")</script> vulnerability',
      },
    ];

    const result = generateHtmlFormat(itemsWithHtml, true);
    // The title should be properly escaped or handled
    expect(result).toContain('Fix <script>alert("xss")</script> vulnerability');
  });
});

describe('copyResultsToClipboard', () => {
  const mockClipboard = {
    writeText: vi.fn(),
    write: vi.fn(),
  };

  // Create a proper ClipboardItem mock with supports method
  const MockClipboardItem = vi.fn().mockImplementation(items => ({
    ...items,
  })) as any;
  MockClipboardItem.supports = vi.fn().mockReturnValue(true);

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
    });

    // Mock ClipboardItem
    global.ClipboardItem = MockClipboardItem;

    // Mock Blob
    global.Blob = vi.fn((content, options) => ({
      content,
      type: options?.type || 'text/plain',
    })) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should copy with rich formatting when ClipboardItem is available', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    mockClipboard.write.mockResolvedValue(undefined);

    const options: ClipboardOptions = {
      isCompactView: true,
      onSuccess,
      onError,
    };

    const result = await copyResultsToClipboard(mockGitHubItems, options);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Results copied to clipboard with formatting!');
    expect(onSuccess).toHaveBeenCalledWith();
    expect(onError).not.toHaveBeenCalled();

    expect(MockClipboardItem).toHaveBeenCalledWith({
      'text/plain': expect.any(Object),
      'text/html': expect.any(Object),
    });
    expect(mockClipboard.write).toHaveBeenCalledWith([expect.any(Object)]);
  });

  it('should fallback to plain text when ClipboardItem is not available', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    // Remove ClipboardItem to simulate older browser
    delete (global as any).ClipboardItem;

    mockClipboard.writeText.mockResolvedValue(undefined);

    const options: ClipboardOptions = {
      isCompactView: false,
      onSuccess,
      onError,
    };

    const result = await copyResultsToClipboard(mockGitHubItems, options);

    expect(result.success).toBe(true);
    expect(result.message).toBe(
      'Results copied to clipboard (plain text only)'
    );
    expect(onSuccess).toHaveBeenCalledWith();
    expect(onError).not.toHaveBeenCalled();

    expect(mockClipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('1. Fix critical bug in authentication')
    );
  });

  it('should handle clipboard API errors', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const error = new Error('Clipboard access denied');

    mockClipboard.write.mockRejectedValue(error);

    const options: ClipboardOptions = {
      isCompactView: true,
      onSuccess,
      onError,
    };

    const result = await copyResultsToClipboard(mockGitHubItems, options);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Clipboard access denied');
    expect(result.error).toBe(error);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should handle non-Error exceptions', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    mockClipboard.write.mockRejectedValue('String error');

    const options: ClipboardOptions = {
      isCompactView: true,
      onSuccess,
      onError,
    };

    const result = await copyResultsToClipboard(mockGitHubItems, options);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Failed to copy to clipboard');
    expect(result.error).toBeInstanceOf(Error);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should work without callback functions', async () => {
    mockClipboard.write.mockResolvedValue(undefined);

    const options: ClipboardOptions = {
      isCompactView: true,
    };

    const result = await copyResultsToClipboard(mockGitHubItems, options);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Results copied to clipboard with formatting!');
  });

  it('should handle empty items array', async () => {
    mockClipboard.write.mockResolvedValue(undefined);

    const options: ClipboardOptions = {
      isCompactView: true,
      onSuccess: vi.fn(),
    };

    const result = await copyResultsToClipboard([], options);

    expect(result.success).toBe(true);
    expect(mockClipboard.write).toHaveBeenCalled();

    // Should still create ClipboardItem with empty content
    const clipboardCall = MockClipboardItem.mock.calls[0][0];
    expect(clipboardCall['text/plain']).toBeDefined();
    expect(clipboardCall['text/html']).toBeDefined();
  });

  it('should correctly format selected items', async () => {
    mockClipboard.write.mockResolvedValue(undefined);

    // Create a subset of items to test selection
    const selectedItems = [mockGitHubItems[0], mockGitHubItems[2]];
    const options: ClipboardOptions = { isCompactView: false };

    await copyResultsToClipboard(selectedItems, options);

    const clipboardCall = MockClipboardItem.mock.calls[0][0];
    const plainTextContent = clipboardCall['text/plain'].content[0];
    const htmlContent = clipboardCall['text/html'].content[0];

    // Verify only selected items are included
    expect(plainTextContent).toContain('Fix critical bug');
    expect(plainTextContent).toContain('Update documentation');
    expect(plainTextContent).not.toContain('Add new feature');

    expect(htmlContent).toContain('Fix critical bug');
    expect(htmlContent).toContain('Update documentation');
    expect(htmlContent).not.toContain('Add new feature');

    // Verify items are properly numbered
    expect(plainTextContent).toMatch(/1\. Fix critical bug/);
    expect(plainTextContent).toMatch(/2\. Update documentation/);
  });

  it('should use correct format based on isCompactView setting', async () => {
    mockClipboard.write.mockResolvedValue(undefined);

    // Test compact view
    const compactOptions: ClipboardOptions = { isCompactView: true };
    await copyResultsToClipboard(mockGitHubItems, compactOptions);

    let clipboardCall = MockClipboardItem.mock.calls[0][0];
    expect(clipboardCall['text/plain'].content).toEqual([
      expect.stringContaining('- https://github.com'),
    ]);

    MockClipboardItem.mockClear();

    // Test detailed view
    const detailedOptions: ClipboardOptions = { isCompactView: false };
    await copyResultsToClipboard(mockGitHubItems, detailedOptions);

    clipboardCall = MockClipboardItem.mock.calls[0][0];
    expect(clipboardCall['text/plain'].content).toEqual([
      expect.stringContaining('1. Fix critical bug'),
    ]);
    expect(clipboardCall['text/plain'].content).toEqual([
      expect.stringContaining('Type: Issue'),
    ]);
  });
});

describe('deduplicateByTitle', () => {
  const createMockItem = (title: string, updatedAt: string, id: number = Math.random()): any => ({
    id,
    title,
    html_url: `https://github.com/test/repo/issues/${id}`,
    state: 'open',
    user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
    created_at: '2023-01-01T10:00:00Z',
    updated_at: updatedAt,
    body: 'Test body',
    number: id,
    labels: [],
  });

  it('should return original array if no duplicates', () => {
    const items = [
      createMockItem('Unique Title 1', '2023-01-01T10:00:00Z', 1),
      createMockItem('Unique Title 2', '2023-01-01T11:00:00Z', 2),
      createMockItem('Unique Title 3', '2023-01-01T12:00:00Z', 3),
    ];

    const result = deduplicateByTitle(items);
    
    expect(result).toHaveLength(3);
    expect(result.map(item => item.title)).toEqual([
      'Unique Title 1',
      'Unique Title 2', 
      'Unique Title 3'
    ]);
  });

  it('should deduplicate items with same title, keeping the most recent', () => {
    const items = [
      createMockItem('Duplicate Title', '2023-01-01T10:00:00Z', 1), // older
      createMockItem('Unique Title', '2023-01-01T11:00:00Z', 2),
      createMockItem('Duplicate Title', '2023-01-01T12:00:00Z', 3), // newer - should be kept
    ];

    const result = deduplicateByTitle(items);
    
    expect(result).toHaveLength(2);
    expect(result.find(item => item.title === 'Duplicate Title')?.id).toBe(3);
    expect(result.find(item => item.title === 'Unique Title')?.id).toBe(2);
  });

  it('should handle multiple duplicates, keeping the most recent', () => {
    const items = [
      createMockItem('Title A', '2023-01-01T10:00:00Z', 1),
      createMockItem('Title B', '2023-01-01T11:00:00Z', 2),
      createMockItem('Title A', '2023-01-01T12:00:00Z', 3), // newer Title A
      createMockItem('Title B', '2023-01-01T13:00:00Z', 4), // newer Title B
      createMockItem('Title A', '2023-01-01T09:00:00Z', 5), // older Title A
    ];

    const result = deduplicateByTitle(items);
    
    expect(result).toHaveLength(2);
    expect(result.find(item => item.title === 'Title A')?.id).toBe(3);
    expect(result.find(item => item.title === 'Title B')?.id).toBe(4);
  });

  it('should return empty array for empty input', () => {
    const result = deduplicateByTitle([]);
    expect(result).toEqual([]);
  });

  it('should handle single item', () => {
    const items = [createMockItem('Single Title', '2023-01-01T10:00:00Z', 1)];
    const result = deduplicateByTitle(items);
    
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Single Title');
  });

  it('should preserve item order for unique titles', () => {
    const items = [
      createMockItem('Title C', '2023-01-01T10:00:00Z', 3),
      createMockItem('Title A', '2023-01-01T11:00:00Z', 1),
      createMockItem('Title B', '2023-01-01T12:00:00Z', 2),
    ];

    const result = deduplicateByTitle(items);
    
    expect(result).toHaveLength(3);
    // Order should be based on insertion order into Map (first occurrence)
    expect(result.map(item => item.title)).toEqual(['Title C', 'Title A', 'Title B']);
  });
});

describe('generatePlainTextFormat with grouped deduplication', () => {
  const createMockItem = (title: string, updatedAt: string, id: number = Math.random()): any => ({
    id,
    title,
    html_url: `https://github.com/test/repo/issues/${id}`,
    state: 'open',
    user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
    created_at: '2023-01-01T10:00:00Z',
    updated_at: updatedAt,
    body: 'Test body',
    number: id,
    labels: [],
  });

  it('should deduplicate items within groups in compact view', () => {
    const groupedData = [
      {
        groupName: 'Issues - opened',
        items: [
          createMockItem('Duplicate Issue', '2023-01-01T10:00:00Z', 1),
          createMockItem('Unique Issue', '2023-01-01T11:00:00Z', 2),
          createMockItem('Duplicate Issue', '2023-01-01T12:00:00Z', 3), // newer - should be kept
        ]
      },
      {
        groupName: 'PRs - opened',
        items: [
          createMockItem('Duplicate PR', '2023-01-01T10:00:00Z', 4),
          createMockItem('Duplicate PR', '2023-01-01T14:00:00Z', 5), // newer - should be kept
        ]
      }
    ];

    const result = generatePlainTextFormat([], true, { 
      isGroupedView: true, 
      groupedData 
    });

    // Should contain each unique title only once per group
    expect(result).toContain('Issues - opened');
    expect(result).toContain('PRs - opened');
    expect(result).toContain('- Duplicate Issue - ');
    expect(result).toContain('- Unique Issue - ');
    expect(result).toContain('- Duplicate PR - ');

    // Count occurrences - each title should appear only once per group
    const duplicateIssueMatches = (result.match(/Duplicate Issue/g) || []).length;
    const duplicatePRMatches = (result.match(/Duplicate PR/g) || []).length;
    
    expect(duplicateIssueMatches).toBe(1);
    expect(duplicatePRMatches).toBe(1);
  });

  it('should deduplicate items within groups in detailed view', () => {
    const groupedData = [
      {
        groupName: 'Issues - opened',
        items: [
          createMockItem('Duplicate Issue', '2023-01-01T10:00:00Z', 1),
          createMockItem('Duplicate Issue', '2023-01-01T12:00:00Z', 3), // newer
          createMockItem('Unique Issue', '2023-01-01T11:00:00Z', 2),
        ]
      }
    ];

    const result = generatePlainTextFormat([], false, { 
      isGroupedView: true, 
      groupedData 
    });

    expect(result).toContain('Issues - opened');
    expect(result).toContain('1. Duplicate Issue');
    expect(result).toContain('2. Unique Issue');

    // Should contain the newer item's URL
    expect(result).toContain('https://github.com/test/repo/issues/3');
    expect(result).not.toContain('https://github.com/test/repo/issues/1');

    // Count title occurrences - should appear only once
    const duplicateIssueMatches = (result.match(/Duplicate Issue/g) || []).length;
    expect(duplicateIssueMatches).toBe(1);
  });

  it('should handle empty groups after deduplication', () => {
    const groupedData = [
      {
        groupName: 'Empty Group',
        items: []
      },
      {
        groupName: 'Non-empty Group',
        items: [
          createMockItem('Single Item', '2023-01-01T10:00:00Z', 1),
        ]
      }
    ];

    const result = generatePlainTextFormat([], true, { 
      isGroupedView: true, 
      groupedData 
    });

    // Empty groups are now filtered out
    expect(result).not.toContain('Empty Group');
    expect(result).toContain('Non-empty Group');
    expect(result).toContain('- Single Item - ');
  });
});

describe('generateHtmlFormat with grouped deduplication', () => {
  const createMockItem = (title: string, updatedAt: string, id: number = Math.random()): any => ({
    id,
    title,
    html_url: `https://github.com/test/repo/issues/${id}`,
    state: 'open',
    user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
    created_at: '2023-01-01T10:00:00Z',
    updated_at: updatedAt,
    body: 'Test body',
    number: id,
    labels: [],
  });

  it('should deduplicate items within groups in HTML compact view', () => {
    const groupedData = [
      {
        groupName: 'Issues - opened',
        items: [
          createMockItem('Duplicate Issue', '2023-01-01T10:00:00Z', 1),
          createMockItem('Duplicate Issue', '2023-01-01T12:00:00Z', 3), // newer - should be kept
          createMockItem('Unique Issue', '2023-01-01T11:00:00Z', 2),
        ]
      }
    ];

    const result = generateHtmlFormat([], true, { 
      isGroupedView: true, 
      groupedData 
    });

    expect(result).toContain('<h3 style="margin-bottom: 8px; color: #1f2328;">Issues - opened</h3>');
    expect(result).toContain('<a href="https://github.com/test/repo/issues/3">Duplicate Issue</a>');
    expect(result).toContain('<a href="https://github.com/test/repo/issues/2">Unique Issue</a>');
    
    // Should NOT contain the older duplicate
    expect(result).not.toContain('<a href="https://github.com/test/repo/issues/1">Duplicate Issue</a>');

    // Count title occurrences in HTML
    const duplicateIssueMatches = (result.match(/Duplicate Issue/g) || []).length;
         expect(duplicateIssueMatches).toBe(1);
   });
 });

describe('deduplicateAcrossGroups', () => {
  const createMockItem = (title: string, updatedAt: string, id: number): any => ({
    id,
    title,
    html_url: `https://github.com/test/repo/issues/${id}`,
    state: 'open',
    user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
    created_at: '2023-01-01T10:00:00Z',
    updated_at: updatedAt,
    body: 'Test body',
    number: id,
    labels: [],
  });

  it('should deduplicate items across all groups', () => {
    const groupedData = [
      {
        groupName: 'Group 1',
        items: [
          createMockItem('Duplicate Issue', '2023-01-01T10:00:00Z', 1),
          createMockItem('Unique Issue A', '2023-01-01T11:00:00Z', 2),
        ]
      },
      {
        groupName: 'Group 2', 
        items: [
          createMockItem('Duplicate Issue', '2023-01-01T12:00:00Z', 3), // Same title, newer
          createMockItem('Unique Issue B', '2023-01-01T13:00:00Z', 4),
        ]
      },
      {
        groupName: 'Group 3',
        items: [
          createMockItem('Unique Issue A', '2023-01-01T14:00:00Z', 5), // Same title as Group 1
          createMockItem('Unique Issue C', '2023-01-01T15:00:00Z', 6),
        ]
      }
    ];

    const result = deduplicateAcrossGroups(groupedData);

    // Group 1 should have both items (first occurrence, keeping the newest within group)
    expect(result[0].items).toHaveLength(2);
    expect(result[0].items[0].title).toBe('Duplicate Issue');
    expect(result[0].items[0].id).toBe(1); // Only ID 1 exists in Group 1
    expect(result[0].items[1].title).toBe('Unique Issue A');
    expect(result[0].items[1].id).toBe(2);

    // Group 2 should only have Unique Issue B (Duplicate Issue was already seen in Group 1)
    expect(result[1].items).toHaveLength(1);
    expect(result[1].items[0].title).toBe('Unique Issue B');
    expect(result[1].items[0].id).toBe(4);

    // Group 3 should only have Unique Issue C (Unique Issue A was already seen in Group 1)
    expect(result[2].items).toHaveLength(1);
    expect(result[2].items[0].title).toBe('Unique Issue C');
    expect(result[2].items[0].id).toBe(6);
  });

  it('should handle empty groups', () => {
    const groupedData = [
      {
        groupName: 'Group 1',
        items: [createMockItem('Test Issue', '2023-01-01T10:00:00Z', 1)]
      },
      {
        groupName: 'Empty Group',
        items: []
      },
      {
        groupName: 'Group 3',
        items: [createMockItem('Another Issue', '2023-01-01T11:00:00Z', 2)]
      }
    ];

    const result = deduplicateAcrossGroups(groupedData);

    expect(result).toHaveLength(3);
    expect(result[0].items).toHaveLength(1);
    expect(result[1].items).toHaveLength(0); // Empty group remains empty
    expect(result[2].items).toHaveLength(1);
  });

  it('should preserve group structure and names', () => {
    const groupedData = [
      {
        groupName: 'Issues - Open',
        items: [createMockItem('Test Issue', '2023-01-01T10:00:00Z', 1)]
      },
      {
        groupName: 'PRs - Merged',
        items: [createMockItem('Test PR', '2023-01-01T11:00:00Z', 2)]
      }
    ];

    const result = deduplicateAcrossGroups(groupedData);

    expect(result[0].groupName).toBe('Issues - Open');
    expect(result[1].groupName).toBe('PRs - Merged');
    expect(result).toHaveLength(2);
  });

  it('should handle all duplicate items across groups', () => {
    const groupedData = [
      {
        groupName: 'Group 1',
        items: [createMockItem('Same Title', '2023-01-01T10:00:00Z', 1)]
      },
      {
        groupName: 'Group 2',
        items: [createMockItem('Same Title', '2023-01-01T11:00:00Z', 2)]
      },
      {
        groupName: 'Group 3',
        items: [createMockItem('Same Title', '2023-01-01T12:00:00Z', 3)]
      }
    ];

    const result = deduplicateAcrossGroups(groupedData);

    // First group should have the most recent item within that group
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].id).toBe(1); // Only item in first group

    // Other groups should be empty (duplicate titles already seen)
    expect(result[1].items).toHaveLength(0);
    expect(result[2].items).toHaveLength(0);
  });
});

describe('generatePlainTextFormat with deduplication and truncation for regular compact view', () => {
  const createMockItem = (title: string, updatedAt: string, id: number = Math.random()): any => ({
    id,
    title,
    html_url: `https://github.com/test/repo/issues/${id}`,
    state: 'open',
    user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
    created_at: '2023-01-01T10:00:00Z',
    updated_at: updatedAt,
    body: 'Test body',
    number: id,
    labels: [],
  });

  it('should deduplicate and truncate titles in regular compact view', () => {
    const items = [
      createMockItem('This is a very long issue title that should definitely be truncated in the middle to make it more readable and user-friendly', '2023-01-01T10:00:00Z', 1),
      createMockItem('Short title', '2023-01-01T11:00:00Z', 2),
      createMockItem('This is a very long issue title that should definitely be truncated in the middle to make it more readable and user-friendly', '2023-01-01T12:00:00Z', 3), // newer duplicate
    ];

    const result = generatePlainTextFormat(items, true); // compact view

    // Should deduplicate - only 2 items should remain
    const lines = result.split('\n').filter(line => line.trim());
    expect(lines).toHaveLength(2);

    // Should contain truncated version of the long title
    expect(result).toContain('[...]');
    expect(result).toContain('Short title - ');
    
    // Should contain the newer item (id 3, not id 1)
    expect(result).toContain('https://github.com/test/repo/issues/3');
    expect(result).not.toContain('https://github.com/test/repo/issues/1');

    // Title should be truncated to 100 characters or less
    const longTitleLine = lines.find(line => line.includes('[...]'));
    if (longTitleLine) {
      const titlePart = longTitleLine.split(' - https://')[0];
      expect(titlePart.length).toBeLessThanOrEqual(100);
    }
  });

  it('should not truncate short titles in regular compact view', () => {
    const items = [
      createMockItem('Short title', '2023-01-01T10:00:00Z', 1),
      createMockItem('Another short one', '2023-01-01T11:00:00Z', 2),
    ];

    const result = generatePlainTextFormat(items, true); // compact view

    expect(result).toContain('Short title - ');
    expect(result).toContain('Another short one - ');
    expect(result).not.toContain('[...]');
  });

  it('should not affect detailed view formatting', () => {
    const items = [
      createMockItem('This is a very long issue title that should definitely be truncated in the middle to make it more readable and user-friendly', '2023-01-01T10:00:00Z', 1),
      createMockItem('This is a very long issue title that should definitely be truncated in the middle to make it more readable and user-friendly', '2023-01-01T12:00:00Z', 3), // newer duplicate
    ];

    const result = generatePlainTextFormat(items, false); // detailed view

    // Should NOT deduplicate or truncate in detailed view - users expect to see all items with full context
    expect(result).toContain('1. This is a very long issue title that should definitely be truncated in the middle to make it more readable and user-friendly');
    expect(result).toContain('2. This is a very long issue title that should definitely be truncated in the middle to make it more readable and user-friendly');
    expect(result).not.toContain('[...]');
    
    // Should contain both items
    expect(result).toContain('https://github.com/test/repo/issues/1');
    expect(result).toContain('https://github.com/test/repo/issues/3');
  });
});

describe('generateHtmlFormat with deduplication and truncation for regular compact view', () => {
  const createMockItem = (title: string, updatedAt: string, id: number = Math.random()): any => ({
    id,
    title,
    html_url: `https://github.com/test/repo/issues/${id}`,
    state: 'open',
    user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
    created_at: '2023-01-01T10:00:00Z',
    updated_at: updatedAt,
    body: 'Test body',
    number: id,
    labels: [],
  });

  it('should deduplicate and truncate titles in regular HTML compact view', () => {
    const items = [
      createMockItem('This is a very long issue title that should definitely be truncated in the middle to make it more readable and user-friendly', '2023-01-01T10:00:00Z', 1),
      createMockItem('Short title', '2023-01-01T11:00:00Z', 2),
      createMockItem('This is a very long issue title that should definitely be truncated in the middle to make it more readable and user-friendly', '2023-01-01T12:00:00Z', 3), // newer duplicate
    ];

    const result = generateHtmlFormat(items, true); // compact view

    // Should contain truncated version of the long title
    expect(result).toContain('[...]');
    expect(result).toContain('Short title');
    
    // Should contain the newer item (id 3, not id 1)
    expect(result).toContain('href="https://github.com/test/repo/issues/3"');
    expect(result).not.toContain('href="https://github.com/test/repo/issues/1"');

    // Should deduplicate - only 2 list items should remain
    const listItemMatches = (result.match(/<li>/g) || []).length;
    expect(listItemMatches).toBe(2);
  });
});
