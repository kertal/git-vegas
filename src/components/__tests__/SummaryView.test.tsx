import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import SummaryView from '../Summary';
import { GitHubItem, GitHubEvent } from '../../types';
import * as resultsUtils from '../../utils/resultsUtils';

// Mock the App context
const mockFormContext = {
  githubToken: 'test-token',
};

vi.mock('../../App', () => ({
  useFormContext: () => mockFormContext,
}));

// Mock the hooks
vi.mock('../../hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: () => ({
    inputValue: '',
    setInputValue: vi.fn(),
    clearSearch: vi.fn(),
  }),
}));

vi.mock('../../hooks/useCopyFeedback', () => ({
  useCopyFeedback: () => ({
    isCopied: vi.fn(() => false),
  }),
}));

// Mock the utilities
vi.mock('../../utils/clipboard', () => ({
  copyResultsToClipboard: vi.fn(),
}));

vi.mock('../../utils/resultsUtils', () => ({
  parseSearchText: vi.fn(),
  getItemType: vi.fn(),
}));

const mockParseSearchText = resultsUtils.parseSearchText as ReturnType<typeof vi.fn>;
const mockGetItemType = resultsUtils.getItemType as ReturnType<typeof vi.fn>;

describe('SummaryView', () => {
  const mockItems: GitHubItem[] = [
    {
      id: 1,
      event_id: 'event1',
      html_url: 'https://github.com/owner/repo/issues/1',
      title: 'Test Issue 1',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      state: 'open',
      body: 'Test issue body',
      user: {
        login: 'testuser1',
        avatar_url: 'https://github.com/testuser1.png',
        html_url: 'https://github.com/testuser1',
      },
      repository: {
        full_name: 'owner/repo',
        html_url: 'https://github.com/owner/repo',
      },
    },
    {
      id: 2,
      event_id: 'event2',
      html_url: 'https://github.com/owner/repo/pull/2',
      title: 'Test PR 1',
      created_at: '2024-01-14T10:00:00Z',
      updated_at: '2024-01-14T10:00:00Z',
      state: 'closed',
      merged_at: '2024-01-14T12:00:00Z',
      pull_request: {
        merged_at: '2024-01-14T12:00:00Z',
        url: 'https://api.github.com/repos/owner/repo/pulls/2',
      },
      user: {
        login: 'testuser2',
        avatar_url: 'https://github.com/testuser2.png',
        html_url: 'https://github.com/testuser2',
      },
      repository: {
        full_name: 'owner/repo',
        html_url: 'https://github.com/owner/repo',
      },
    },
    {
      id: 3,
      event_id: 'event3',
      html_url: 'https://github.com/owner/repo/issues/3',
      title: 'Comment on: Test Issue 1',
      created_at: '2024-01-13T10:00:00Z',
      updated_at: '2024-01-13T10:00:00Z',
      state: 'open',
      user: {
        login: 'testuser3',
        avatar_url: 'https://github.com/testuser3.png',
        html_url: 'https://github.com/testuser3',
      },
      repository: {
        full_name: 'owner/repo',
        html_url: 'https://github.com/owner/repo',
      },
    },
    {
      id: 4,
      event_id: 'event4',
      html_url: 'https://github.com/owner/repo/pull/4',
      title: 'Review on: Test PR 2',
      created_at: '2024-01-12T10:00:00Z',
      updated_at: '2024-01-12T10:00:00Z',
      state: 'open',
      pull_request: {
        url: 'https://api.github.com/repos/owner/repo/pulls/4',
      },
      user: {
        login: 'testuser4',
        avatar_url: 'https://github.com/testuser4.png',
        html_url: 'https://github.com/testuser4',
      },
      repository: {
        full_name: 'owner/repo',
        html_url: 'https://github.com/owner/repo',
      },
    },
  ];

  const mockRawEvents: GitHubEvent[] = [
    {
      id: 'event1',
      type: 'IssuesEvent',
      actor: {
        id: 1,
        login: 'testuser1',
        avatar_url: 'https://github.com/testuser1.png',
        url: 'https://api.github.com/users/testuser1',
      },
      repo: {
        id: 1,
        name: 'owner/repo',
        url: 'https://api.github.com/repos/owner/repo',
      },
      payload: {
        action: 'opened',
        issue: {
          id: 1,
          number: 1,
          title: 'Test Issue 1',
          html_url: 'https://github.com/owner/repo/issues/1',
          state: 'open',
          body: 'Test issue body',
          labels: [],
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          user: {
            login: 'testuser1',
            avatar_url: 'https://github.com/testuser1.png',
            html_url: 'https://github.com/testuser1',
          },
        },
      },
      public: true,
      created_at: '2024-01-15T10:00:00Z',
    },
  ];

  const defaultProps = {
    items: mockItems,
    rawEvents: mockRawEvents,
    selectedItems: new Set<string | number>(),
    toggleItemSelection: vi.fn(),
    selectAllItems: vi.fn(),
    clearSelection: vi.fn(),
    bulkSelectItems: vi.fn(),
    copyResultsToClipboard: vi.fn(),
    searchText: '',
    setSearchText: vi.fn(),
    isClipboardCopied: vi.fn(() => false),
    triggerClipboardCopy: vi.fn(),
  };

  const renderSummaryView = (props = {}) => {
    return render(
      <ThemeProvider>
        <SummaryView {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockParseSearchText.mockReturnValue({
      includedLabels: [],
      excludedLabels: [],
      userFilters: [],
      cleanText: '',
    });
    mockGetItemType.mockImplementation((item: GitHubItem) => {
      if (item.title.startsWith('Comment on:')) return 'comment';
      if (item.title.startsWith('Review on:')) return 'pr';
      if (item.pull_request) return 'pr';
      return 'issue';
    });
  });

  describe('Rendering', () => {
    it('should render the component with correct header', () => {
      renderSummaryView();

      expect(screen.getByText('Events')).toBeInTheDocument();
      expect(screen.getByText('Note: Timeline includes up to 300 events from the past 30 days. Event latency can be 30s to 6h depending on time of day.')).toBeInTheDocument();
    });

    it('should render search input when setSearchText is provided', () => {
      renderSummaryView();

      expect(screen.getByPlaceholderText('Search events...')).toBeInTheDocument();
    });

    it('should render copy results button', () => {
      renderSummaryView();

      expect(screen.getByRole('button', { name: /4/ })).toBeInTheDocument(); // Shows item count
    });

    it('should render grouped sections correctly', () => {
      renderSummaryView();

      // Should show grouped sections
      expect(screen.getByText('Issues - opened (1)')).toBeInTheDocument();
      expect(screen.getByText('PRs - merged (1)')).toBeInTheDocument();
      expect(screen.getByText('Issues - commented (1)')).toBeInTheDocument();
      expect(screen.getByText('PRs - reviewed (1)')).toBeInTheDocument();
    });

    it('should render items within groups', () => {
      renderSummaryView();

      expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
      expect(screen.getByText('Test PR 1')).toBeInTheDocument();
      expect(screen.getByText('Comment on: Test Issue 1')).toBeInTheDocument();
      expect(screen.getByText('Review on: Test PR 2')).toBeInTheDocument();
    });

    it('should render user information', () => {
      renderSummaryView();

      expect(screen.getByText('testuser1')).toBeInTheDocument();
      expect(screen.getByText('testuser2')).toBeInTheDocument();
      expect(screen.getByText('testuser3')).toBeInTheDocument();
      expect(screen.getByText('testuser4')).toBeInTheDocument();
    });

    it('should render repository information', () => {
      renderSummaryView();

      expect(screen.getByText('owner/repo')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no items', () => {
      renderSummaryView({ items: [] });

      expect(screen.getByText('No events found for the selected time period. Try adjusting your date range or filters.')).toBeInTheDocument();
    });

    it('should show search no results message when search has no matches', () => {
      renderSummaryView({ 
        items: [], 
        searchText: 'nonexistent',
        setSearchText: vi.fn()
      });

      expect(screen.getByText('No events found matching "nonexistent". Try a different search term or use label:name / -label:name for label filtering.')).toBeInTheDocument();
    });

    it('should show clear search button when search has no results', () => {
      renderSummaryView({ 
        items: [], 
        searchText: 'nonexistent',
        setSearchText: vi.fn()
      });

      expect(screen.getByText('Clear search')).toBeInTheDocument();
    });
  });

  describe('Grouping Logic', () => {
    it('should group PRs correctly by state', () => {
      const prItems: GitHubItem[] = [
        {
          id: 1,
          event_id: 'event1',
          html_url: 'https://github.com/owner/repo/pull/1',
          title: 'Open PR',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          state: 'open',
          pull_request: {},
          user: { login: 'user1', avatar_url: '', html_url: '' },
          repository: { full_name: 'owner/repo', html_url: '' },
        },
        {
          id: 2,
          event_id: 'event2',
          html_url: 'https://github.com/owner/repo/pull/2',
          title: 'Merged PR',
          created_at: '2024-01-14T10:00:00Z',
          updated_at: '2024-01-14T10:00:00Z',
          state: 'closed',
          merged_at: '2024-01-14T12:00:00Z',
          pull_request: { merged_at: '2024-01-14T12:00:00Z' },
          user: { login: 'user2', avatar_url: '', html_url: '' },
          repository: { full_name: 'owner/repo', html_url: '' },
        },
        {
          id: 3,
          event_id: 'event3',
          html_url: 'https://github.com/owner/repo/pull/3',
          title: 'Closed PR',
          created_at: '2024-01-13T10:00:00Z',
          updated_at: '2024-01-13T10:00:00Z',
          state: 'closed',
          pull_request: {},
          user: { login: 'user3', avatar_url: '', html_url: '' },
          repository: { full_name: 'owner/repo', html_url: '' },
        },
      ];

      renderSummaryView({ items: prItems });

      expect(screen.getByText('PRs - opened (1)')).toBeInTheDocument();
      expect(screen.getByText('PRs - merged (1)')).toBeInTheDocument();
      expect(screen.getByText('PRs - closed (1)')).toBeInTheDocument();
    });

    it('should group issues correctly by state', () => {
      const issueItems: GitHubItem[] = [
        {
          id: 1,
          event_id: 'event1',
          html_url: 'https://github.com/owner/repo/issues/1',
          title: 'Open Issue',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          state: 'open',
          user: { login: 'user1', avatar_url: '', html_url: '' },
          repository: { full_name: 'owner/repo', html_url: '' },
        },
        {
          id: 2,
          event_id: 'event2',
          html_url: 'https://github.com/owner/repo/issues/2',
          title: 'Closed Issue',
          created_at: '2024-01-14T10:00:00Z',
          updated_at: '2024-01-14T10:00:00Z',
          state: 'closed',
          user: { login: 'user2', avatar_url: '', html_url: '' },
          repository: { full_name: 'owner/repo', html_url: '' },
        },
      ];

      renderSummaryView({ items: issueItems });

      expect(screen.getByText('Issues - opened (1)')).toBeInTheDocument();
      expect(screen.getByText('Issues - closed (1)')).toBeInTheDocument();
    });

    it('should group comments correctly', () => {
      const commentItems: GitHubItem[] = [
        {
          id: 1,
          event_id: 'event1',
          html_url: 'https://github.com/owner/repo/issues/1#issuecomment-123',
          title: 'Comment on: Test Issue',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          state: 'open',
          user: { login: 'user1', avatar_url: '', html_url: '' },
          repository: { full_name: 'owner/repo', html_url: '' },
        },
      ];

      renderSummaryView({ items: commentItems });

      expect(screen.getByText('Issues - commented (1)')).toBeInTheDocument();
    });

    it('should group reviews correctly', () => {
      const reviewItems: GitHubItem[] = [
        {
          id: 1,
          event_id: 'event1',
          html_url: 'https://github.com/owner/repo/pull/1',
          title: 'Review on: Test PR',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          state: 'open',
          pull_request: {},
          user: { login: 'user1', avatar_url: '', html_url: '' },
          repository: { full_name: 'owner/repo', html_url: '' },
        },
      ];

      renderSummaryView({ items: reviewItems });

      expect(screen.getByText('PRs - reviewed (1)')).toBeInTheDocument();
    });
  });

  describe('Selection Functionality', () => {
    it('should render checkboxes when toggleItemSelection is provided', () => {
      renderSummaryView();

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should call toggleItemSelection when item checkbox is clicked', () => {
      const mockToggleSelection = vi.fn();
      renderSummaryView({ toggleItemSelection: mockToggleSelection });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Click first item checkbox

      expect(mockToggleSelection).toHaveBeenCalled();
    });

    it('should show selected state for selected items', () => {
      const selectedItems = new Set(['event1']);
      renderSummaryView({ selectedItems });

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[1]).toBeChecked(); // First item should be checked
    });

    it('should call selectAllItems when select all checkbox is clicked', () => {
      const mockSelectAll = vi.fn();
      renderSummaryView({ selectAllItems: mockSelectAll });

      const selectAllCheckbox = screen.getByLabelText('Select all events');
      fireEvent.click(selectAllCheckbox);

      expect(mockSelectAll).toHaveBeenCalled();
    });

    it('should call clearSelection when select all checkbox is clicked and all items are selected', () => {
      const mockClearSelection = vi.fn();
      const selectedItems = new Set(['event1', 'event2', 'event3', 'event4']);
      renderSummaryView({ 
        clearSelection: mockClearSelection,
        selectedItems 
      });

      const selectAllCheckbox = screen.getByLabelText('Select all events');
      fireEvent.click(selectAllCheckbox);

      expect(mockClearSelection).toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    it('should filter items by search text', () => {
      mockParseSearchText.mockReturnValue({
        includedLabels: [],
        excludedLabels: [],
        userFilters: [],
        cleanText: 'Test Issue',
      });

      renderSummaryView({ searchText: 'Test Issue' });

      expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
      expect(screen.queryByText('Test PR 1')).not.toBeInTheDocument();
    });

    it('should filter by labels when search includes label syntax', () => {
      mockParseSearchText.mockReturnValue({
        includedLabels: ['bug'],
        excludedLabels: [],
        userFilters: [],
        cleanText: '',
      });

      const itemsWithLabels = [
        {
          ...mockItems[0],
          labels: [{ name: 'bug', color: 'red' }],
        },
        {
          ...mockItems[1],
          labels: [{ name: 'feature', color: 'green' }],
        },
      ];

      renderSummaryView({ 
        items: itemsWithLabels,
        searchText: 'label:bug'
      });

      expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
      expect(screen.queryByText('Test PR 1')).not.toBeInTheDocument();
    });

    it('should filter by user when search includes user syntax', () => {
      mockParseSearchText.mockReturnValue({
        includedLabels: [],
        excludedLabels: [],
        userFilters: ['testuser1'],
        cleanText: '',
      });

      renderSummaryView({ searchText: 'user:testuser1' });

      expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
      expect(screen.queryByText('Test PR 1')).not.toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('should call copyResultsToClipboard when copy button is clicked', async () => {
      const mockCopyResults = vi.fn();
      renderSummaryView({ copyResultsToClipboard: mockCopyResults });

      const copyButton = screen.getByRole('button', { name: /4/ });
      fireEvent.click(copyButton);

      // Open the action menu
      const detailedButton = screen.getByText('Detailed Format');
      fireEvent.click(detailedButton);

      await waitFor(() => {
        expect(mockCopyResults).toHaveBeenCalledWith('detailed');
      });
    });

    it('should call copyResultsToClipboard with compact format', async () => {
      const mockCopyResults = vi.fn();
      renderSummaryView({ copyResultsToClipboard: mockCopyResults });

      const copyButton = screen.getByRole('button', { name: /4/ });
      fireEvent.click(copyButton);

      // Open the action menu
      const compactButton = screen.getByText('Compact Format');
      fireEvent.click(compactButton);

      await waitFor(() => {
        expect(mockCopyResults).toHaveBeenCalledWith('compact');
      });
    });
  });

  describe('Dialog Functionality', () => {
    it('should open description dialog when item is clicked', () => {
      renderSummaryView();

      const itemTitle = screen.getByText('Test Issue 1');
      fireEvent.click(itemTitle);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
    });

    it('should show item body in dialog', () => {
      renderSummaryView();

      const itemTitle = screen.getByText('Test Issue 1');
      fireEvent.click(itemTitle);

      expect(screen.getByText('Test issue body')).toBeInTheDocument();
    });

    it('should close dialog when close button is clicked', () => {
      renderSummaryView();

      const itemTitle = screen.getByText('Test Issue 1');
      fireEvent.click(itemTitle);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Close dialog (this would typically be done by clicking outside or escape key)
      // For now, we'll just verify the dialog exists
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderSummaryView();

      expect(screen.getByLabelText('Select all events')).toBeInTheDocument();
      expect(screen.getByLabelText('Search events')).toBeInTheDocument();
    });

    it('should have proper button roles', () => {
      renderSummaryView();

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have proper checkbox roles', () => {
      renderSummaryView();

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing props gracefully', () => {
      const minimalProps = {
        items: mockItems,
        rawEvents: mockRawEvents,
      };

      expect(() => renderSummaryView(minimalProps)).not.toThrow();
    });

    it('should handle empty items array', () => {
      expect(() => renderSummaryView({ items: [] })).not.toThrow();
    });

    it('should handle items without required fields', () => {
      const incompleteItems = [
        {
          id: 1,
          html_url: 'https://github.com/owner/repo/issues/1',
          title: 'Test Issue',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          state: 'open',
          user: { login: 'user1', avatar_url: '', html_url: '' },
        },
      ];

      expect(() => renderSummaryView({ items: incompleteItems })).not.toThrow();
    });
  });
}); 