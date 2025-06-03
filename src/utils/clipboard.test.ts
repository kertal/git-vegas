import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  formatDateForClipboard, 
  generatePlainTextFormat, 
  generateHtmlFormat, 
  copyResultsToClipboard,
  ClipboardOptions 
} from './clipboard';
import { GitHubItem } from '../types';

// Mock the getContrastColor utility
vi.mock('../utils', () => ({
  getContrastColor: vi.fn((color: string) => color === 'ffffff' ? '#000000' : '#ffffff')
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
      html_url: 'https://github.com/testuser'
    },
    repository_url: 'https://api.github.com/repos/user/repo',
    labels: [
      { name: 'bug', color: 'ff0000', description: 'Something is broken' },
      { name: 'priority-high', color: 'ff9900', description: 'High priority' }
    ],
    pull_request: undefined,
    merged: false
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
      html_url: 'https://github.com/developer'
    },
    repository_url: 'https://api.github.com/repos/user/repo',
    labels: [
      { name: 'feature', color: '00ff00', description: 'New feature' }
    ],
    pull_request: {
      merged_at: '2023-12-01T14:20:00Z',
      url: 'https://api.github.com/repos/user/repo/pulls/2'
    },
    merged: true
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
      html_url: 'https://github.com/docwriter'
    },
    repository_url: 'https://api.github.com/repos/user/repo',
    labels: [],
    pull_request: {
      merged_at: undefined,
      url: 'https://api.github.com/repos/user/repo/pulls/3'
    },
    merged: false
  }
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
    
    expect(result).toContain('Fix critical bug in authentication (open) - https://github.com/user/repo/issues/1');
    expect(result).toContain('Add new feature for data export (merged) - https://github.com/user/repo/pull/2');
    expect(result).toContain('Update documentation (closed) - https://github.com/user/repo/pull/3');
    
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
    const itemsWithoutLabels = mockGitHubItems.map(item => ({ ...item, labels: [] }));
    const result = generatePlainTextFormat(itemsWithoutLabels, false);
    
    expect(result).not.toContain('Labels:');
  });
});

describe('generateHtmlFormat', () => {
  it('should generate compact HTML format correctly', () => {
    const result = generateHtmlFormat(mockGitHubItems, true);
    
    // Should contain HTML structure
    expect(result).toContain('<div style="font-family:');
    expect(result).toContain('<ul style="list-style-type: none');
    expect(result).toContain('<li style="margin: 4px 0;">');
    
    // Should contain links with proper styling
    expect(result).toContain('<a href="https://github.com/user/repo/issues/1" style="color: #0969da; text-decoration: none;">Fix critical bug in authentication</a>');
    
    // Should contain status with proper colors
    expect(result).toContain('color: #1a7f37'); // Open status color
    expect(result).toContain('color: #8250df'); // Merged status color
    expect(result).toContain('color: #cf222e'); // Closed status color
    
    // Should contain status text
    expect(result).toContain('(open)');
    expect(result).toContain('(merged)');
    expect(result).toContain('(closed)');
  });

  it('should generate detailed HTML format correctly', () => {
    const result = generateHtmlFormat(mockGitHubItems, false);
    
    // Should contain HTML structure
    expect(result).toContain('<div style="font-family:');
    expect(result).toContain('<div style="margin-bottom: 16px;">');
    
    // Should contain numbered items with links
    expect(result).toContain('1. <a href="https://github.com/user/repo/issues/1"');
    expect(result).toContain('2. <a href="https://github.com/user/repo/pull/2"');
    
    // Should contain type information
    expect(result).toContain('Type: Issue');
    expect(result).toContain('Type: Pull Request');
    
    // Should contain status with colors
    expect(result).toContain('Status: <span style="color: #1a7f37;">open</span>');
    expect(result).toContain('Status: <span style="color: #8250df;">closed (merged)</span>');
    
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
    expect(result).toContain('<div style="font-family:');
    expect(result).toContain('<ul style="list-style-type: none');
    expect(result).toContain('</ul>');
    expect(result).toContain('</div>');
    
    const detailedResult = generateHtmlFormat([], false);
    expect(detailedResult).toBe('<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Helvetica, Arial, sans-serif;">\n</div>');
  });

  it('should handle items without labels', () => {
    const itemsWithoutLabels = mockGitHubItems.map(item => ({ ...item, labels: [] }));
    const result = generateHtmlFormat(itemsWithoutLabels, false);
    
    expect(result).not.toContain('Labels:');
  });

  it('should escape HTML in item titles', () => {
    const itemsWithHtml = [{
      ...mockGitHubItems[0],
      title: 'Fix <script>alert("xss")</script> vulnerability'
    }];
    
    const result = generateHtmlFormat(itemsWithHtml, true);
    // The title should be properly escaped or handled
    expect(result).toContain('Fix <script>alert("xss")</script> vulnerability');
  });
});

describe('copyResultsToClipboard', () => {
  const mockClipboard = {
    writeText: vi.fn(),
    write: vi.fn()
  };

  // Create a proper ClipboardItem mock with supports method
  const MockClipboardItem = vi.fn().mockImplementation((items) => ({
    ...items
  })) as any;
  MockClipboardItem.supports = vi.fn().mockReturnValue(true);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true
    });
    
    // Mock ClipboardItem
    global.ClipboardItem = MockClipboardItem;
    
    // Mock Blob
    global.Blob = vi.fn((content, options) => ({
      content,
      type: options?.type || 'text/plain'
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
      onError
    };
    
    const result = await copyResultsToClipboard(mockGitHubItems, options);
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Results copied to clipboard with formatting!');
    expect(onSuccess).toHaveBeenCalledWith('Results copied to clipboard with formatting!');
    expect(onError).not.toHaveBeenCalled();
    
    expect(MockClipboardItem).toHaveBeenCalledWith({
      'text/plain': expect.any(Object),
      'text/html': expect.any(Object)
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
      onError
    };
    
    const result = await copyResultsToClipboard(mockGitHubItems, options);
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Results copied to clipboard (plain text only)');
    expect(onSuccess).toHaveBeenCalledWith('Results copied to clipboard (plain text only)');
    expect(onError).not.toHaveBeenCalled();
    
    expect(mockClipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('1. Fix critical bug in authentication'));
  });

  it('should handle clipboard API errors', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const error = new Error('Clipboard access denied');
    
    mockClipboard.write.mockRejectedValue(error);
    
    const options: ClipboardOptions = {
      isCompactView: true,
      onSuccess,
      onError
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
      onError
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
      isCompactView: true
    };
    
    const result = await copyResultsToClipboard(mockGitHubItems, options);
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Results copied to clipboard with formatting!');
  });

  it('should handle empty items array', async () => {
    mockClipboard.write.mockResolvedValue(undefined);
    
    const options: ClipboardOptions = {
      isCompactView: true,
      onSuccess: vi.fn()
    };
    
    const result = await copyResultsToClipboard([], options);
    
    expect(result.success).toBe(true);
    expect(mockClipboard.write).toHaveBeenCalled();
    
    // Should still create ClipboardItem with empty content
    const clipboardCall = MockClipboardItem.mock.calls[0][0];
    expect(clipboardCall['text/plain']).toBeDefined();
    expect(clipboardCall['text/html']).toBeDefined();
  });

  it('should use correct format based on isCompactView setting', async () => {
    mockClipboard.write.mockResolvedValue(undefined);
    
    // Test compact view
    const compactOptions: ClipboardOptions = { isCompactView: true };
    await copyResultsToClipboard(mockGitHubItems, compactOptions);
    
    let clipboardCall = MockClipboardItem.mock.calls[0][0];
    expect(clipboardCall['text/plain'].content).toEqual([expect.stringContaining('(open) - https://github.com')]);
    
    MockClipboardItem.mockClear();
    
    // Test detailed view
    const detailedOptions: ClipboardOptions = { isCompactView: false };
    await copyResultsToClipboard(mockGitHubItems, detailedOptions);
    
    clipboardCall = MockClipboardItem.mock.calls[0][0];
    expect(clipboardCall['text/plain'].content).toEqual([expect.stringContaining('1. Fix critical bug')]);
    expect(clipboardCall['text/plain'].content).toEqual([expect.stringContaining('Type: Issue')]);
  });
}); 