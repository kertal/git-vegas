import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import OverviewTab from '../OverviewTab';
import { GitHubItem, GitHubEvent } from '../../types';
import * as rawDataUtils from '../../utils/rawDataUtils';

// Mock the App context
const mockSetApiMode = vi.fn();
const mockFormContext = {
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  setApiMode: mockSetApiMode,
};

vi.mock('../../App', () => ({
  useFormContext: () => mockFormContext,
}));

// Mock the rawDataUtils
vi.mock('../../utils/rawDataUtils', () => ({
  categorizeRawSearchItems: vi.fn(),
  categorizeRawEvents: vi.fn(),
}));

const mockCategorizeRawSearchItems = rawDataUtils.categorizeRawSearchItems as ReturnType<typeof vi.fn>;
const mockCategorizeRawEvents = rawDataUtils.categorizeRawEvents as ReturnType<typeof vi.fn>;

describe('OverviewTab', () => {
  const mockSearchItems: GitHubItem[] = [
    {
      id: 1,
      html_url: 'https://github.com/owner/repo/issues/1',
      title: 'Test Issue 1',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      state: 'open',
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
      html_url: 'https://github.com/owner/repo/pull/2',
      title: 'Test PR 1',
      created_at: '2024-01-14T10:00:00Z',
      updated_at: '2024-01-14T10:00:00Z',
      state: 'closed',
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
  ];

  const mockEvents: GitHubEvent[] = [
    {
      id: 'event1',
      type: 'IssuesEvent',
      actor: {
        id: 1,
        login: 'eventuser1',
        avatar_url: 'https://github.com/eventuser1.png',
        url: 'https://api.github.com/users/eventuser1',
      },
      repo: {
        id: 1,
        name: 'owner/repo',
        url: 'https://api.github.com/repos/owner/repo',
      },
      payload: {
        action: 'opened',
      },
      public: true,
      created_at: '2024-01-16T10:00:00Z',
    },
    {
      id: 'event2',
      type: 'PullRequestEvent',
      actor: {
        id: 2,
        login: 'eventuser2',
        avatar_url: 'https://github.com/eventuser2.png',
        url: 'https://api.github.com/users/eventuser2',
      },
      repo: {
        id: 1,
        name: 'owner/repo',
        url: 'https://api.github.com/repos/owner/repo',
      },
      payload: {
        action: 'closed',
      },
      public: true,
      created_at: '2024-01-15T10:00:00Z',
    },
  ];

  const renderOverviewTab = (props = {}) => {
    return render(
      <ThemeProvider>
        <OverviewTab
          indexedDBSearchItems={mockSearchItems}
          indexedDBEvents={mockEvents}
          {...props}
        />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCategorizeRawSearchItems.mockReturnValue(mockSearchItems);
    mockCategorizeRawEvents.mockReturnValue(mockEvents);
  });

  describe('Rendering', () => {
    it('should render the component with both sections', () => {
      renderOverviewTab();

      expect(screen.getByText('Recent Issues & Pull Requests')).toBeInTheDocument();
      expect(screen.getByText('Recent Events')).toBeInTheDocument();
    });

    it('should render View All buttons with correct counts', () => {
      renderOverviewTab();

      const viewAllButtons = screen.getAllByText('View All (2)');
      expect(viewAllButtons).toHaveLength(2); // Should have 2 buttons with same text
      expect(viewAllButtons[0]).toBeInTheDocument(); // Search items count
      expect(viewAllButtons[1]).toBeInTheDocument(); // Events count
    });

    it('should render search items in timeline format', () => {
      renderOverviewTab();

      expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
      expect(screen.getByText('Test PR 1')).toBeInTheDocument();
      expect(screen.getByText('testuser1')).toBeInTheDocument();
      expect(screen.getByText('testuser2')).toBeInTheDocument();
    });

    it('should render events in timeline format', () => {
      renderOverviewTab();

      expect(screen.getByText('eventuser1')).toBeInTheDocument();
      expect(screen.getByText('eventuser2')).toBeInTheDocument();
    });

    it('should display correct item types and states', () => {
      renderOverviewTab();

      expect(screen.getByText('opened issue')).toBeInTheDocument();
      expect(screen.getByText('opened pull request')).toBeInTheDocument();
      expect(screen.getByText('open')).toBeInTheDocument();
      expect(screen.getByText('closed')).toBeInTheDocument();
    });
  });

  describe('Data Processing', () => {
    it('should call categorizeRawSearchItems with correct parameters', () => {
      renderOverviewTab();

      expect(mockCategorizeRawSearchItems).toHaveBeenCalledWith(
        mockSearchItems,
        '2024-01-01',
        '2024-01-31'
      );
    });

    it('should call categorizeRawEvents with correct parameters', () => {
      renderOverviewTab();

      expect(mockCategorizeRawEvents).toHaveBeenCalledWith(
        mockEvents,
        '2024-01-01',
        '2024-01-31'
      );
    });

    it('should sort search items by updated_at/created_at in descending order', () => {
      const unsortedItems = [
        { ...mockSearchItems[1], updated_at: '2024-01-10T10:00:00Z' },
        { ...mockSearchItems[0], updated_at: '2024-01-20T10:00:00Z' },
      ];
      mockCategorizeRawSearchItems.mockReturnValue(unsortedItems);

      renderOverviewTab();

      const timelineItems = screen.getAllByText(/Test (Issue|PR)/);
      expect(timelineItems[0]).toHaveTextContent('Test Issue 1'); // More recent
      expect(timelineItems[1]).toHaveTextContent('Test PR 1'); // Older
    });

    it('should sort events by created_at in descending order', () => {
      const unsortedEvents = [
        { ...mockEvents[1], created_at: '2024-01-10T10:00:00Z' },
        { ...mockEvents[0], created_at: '2024-01-20T10:00:00Z' },
      ];

      renderOverviewTab({ indexedDBEvents: unsortedEvents });

      const eventUsers = screen.getAllByText(/eventuser/);
      expect(eventUsers[0]).toHaveTextContent('eventuser1'); // More recent
      expect(eventUsers[1]).toHaveTextContent('eventuser2'); // Older
    });

    it('should limit search items to 10 entries', () => {
      const manyItems = Array.from({ length: 15 }, (_, i) => ({
        ...mockSearchItems[0],
        id: i + 1,
        title: `Test Item ${i + 1}`,
        updated_at: `2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      }));
      mockCategorizeRawSearchItems.mockReturnValue(manyItems);

      renderOverviewTab();

      // Should only show 10 items
      expect(screen.getAllByText(/Test Item/)).toHaveLength(10);
    });

    it('should limit events to 10 entries', () => {
      const manyEvents = Array.from({ length: 15 }, (_, i) => ({
        ...mockEvents[0],
        id: `event${i + 1}`,
        actor: {
          ...mockEvents[0].actor,
          login: `eventuser${i + 1}`,
        },
        created_at: `2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      }));

      renderOverviewTab({ indexedDBEvents: manyEvents });

      // Should only show 10 events
      expect(screen.getAllByText(/eventuser/)).toHaveLength(10);
    });
  });

  describe('User Interactions', () => {
    it('should call setApiMode with "search" when View All button is clicked for search items', () => {
      renderOverviewTab();

      const viewAllButtons = screen.getAllByText(/View All/);
      fireEvent.click(viewAllButtons[0]); // First button is for search items

      expect(mockSetApiMode).toHaveBeenCalledWith('search');
    });

    it('should call setApiMode with "events" when View All button is clicked for events', () => {
      renderOverviewTab();

      const viewAllButtons = screen.getAllByText(/View All/);
      fireEvent.click(viewAllButtons[1]); // Second button is for events

      expect(mockSetApiMode).toHaveBeenCalledWith('events');
    });

    it('should render external links with correct href attributes', () => {
      renderOverviewTab();

      const issueLink = screen.getByText('Test Issue 1').closest('a');
      expect(issueLink).toHaveAttribute('href', 'https://github.com/owner/repo/issues/1');
      expect(issueLink).toHaveAttribute('target', '_blank');
      expect(issueLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render user links with correct href attributes', () => {
      renderOverviewTab();

      const userLink = screen.getByText('testuser1').closest('a');
      expect(userLink).toHaveAttribute('href', 'https://github.com/testuser1');
      expect(userLink).toHaveAttribute('target', '_blank');
    });

    it('should render repository links with correct href attributes', () => {
      renderOverviewTab();

      const repoLinks = screen.getAllByText('owner/repo');
      expect(repoLinks[0].closest('a')).toHaveAttribute('href', 'https://github.com/owner/repo');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search items gracefully', () => {
      mockCategorizeRawSearchItems.mockReturnValue([]);

      renderOverviewTab();

      expect(screen.getByText('No recent issues or pull requests found in the selected date range.')).toBeInTheDocument();
    });

    it('should handle empty events gracefully', () => {
      renderOverviewTab({ indexedDBEvents: [] });

      expect(screen.getByText('No recent events found in the selected date range.')).toBeInTheDocument();
    });

    it('should handle items without repository information', () => {
      const itemWithoutRepo = {
        ...mockSearchItems[0],
        repository: undefined,
        repository_url: 'https://api.github.com/repos/fallback/repo',
      };
      mockCategorizeRawSearchItems.mockReturnValue([itemWithoutRepo]);

      renderOverviewTab();

      expect(screen.getByText('fallback/repo')).toBeInTheDocument();
    });

    it('should handle items without repository_url fallback', () => {
      const itemWithoutRepoInfo = {
        ...mockSearchItems[0],
        repository: undefined,
        repository_url: undefined,
      };
      mockCategorizeRawSearchItems.mockReturnValue([itemWithoutRepoInfo]);

      renderOverviewTab();

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should use created_at when updated_at is not available', () => {
      const itemWithoutUpdatedAt = {
        ...mockSearchItems[0],
        updated_at: undefined,
        created_at: '2024-01-15T10:00:00Z',
      };
      mockCategorizeRawSearchItems.mockReturnValue([itemWithoutUpdatedAt]);

      renderOverviewTab();

      // Should still render the item
      expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
    });

    it('should handle malformed dates gracefully', () => {
      const itemWithBadDate = {
        ...mockSearchItems[0],
        updated_at: 'invalid-date',
        created_at: '2024-01-15T10:00:00Z',
      };
      mockCategorizeRawSearchItems.mockReturnValue([itemWithBadDate]);

      renderOverviewTab();

      // Should still render the item
      expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
    });
  });

  describe('Helper Functions', () => {
    it('should correctly identify pull requests', () => {
      const prItem = { ...mockSearchItems[0], pull_request: { url: 'test' } };
      mockCategorizeRawSearchItems.mockReturnValue([prItem]);

      renderOverviewTab();

      expect(screen.getByText('opened pull request')).toBeInTheDocument();
    });

    it('should correctly identify issues', () => {
      const issueItem = { ...mockSearchItems[0], pull_request: undefined };
      mockCategorizeRawSearchItems.mockReturnValue([issueItem]);

      renderOverviewTab();

      expect(screen.getByText('opened issue')).toBeInTheDocument();
    });

    it('should format dates correctly', () => {
      renderOverviewTab();

      // Check that dates are formatted (exact format may vary by locale)
      const dateElements = screen.getAllByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
      expect(dateElements.length).toBeGreaterThan(0);
    });

    it('should format event types correctly', () => {
      const eventWithCamelCase = {
        ...mockEvents[0],
        type: 'PullRequestReviewEvent',
      };

      renderOverviewTab({ indexedDBEvents: [eventWithCamelCase] });

      expect(screen.getByText('pull request review event')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for avatars', () => {
      renderOverviewTab();

      const avatar = screen.getByAltText('testuser1 avatar');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://github.com/testuser1.png');
    });

    it('should have proper button roles', () => {
      renderOverviewTab();

      const viewAllButtons = screen.getAllByRole('button');
      expect(viewAllButtons).toHaveLength(3); // Manage Sections + 2 View All buttons
      
      // Find the View All buttons specifically by their complete text content
      const allViewAllButtons = screen.getAllByText(/View All \(\d+\)/);
      expect(allViewAllButtons).toHaveLength(2);
      expect(allViewAllButtons[0]).toBeInTheDocument();
      expect(allViewAllButtons[1]).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      renderOverviewTab();

      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(3); // Overview + 2 section headings
      expect(headings[0]).toHaveTextContent('Overview');
      expect(headings[1]).toHaveTextContent('Recent Issues & Pull Requests');
      expect(headings[2]).toHaveTextContent('Recent Events');
    });
  });

  describe('Performance', () => {
    it('should memoize search items calculation', () => {
      const { rerender } = renderOverviewTab();

      // Get initial call count
      const initialCallCount = mockCategorizeRawSearchItems.mock.calls.length;

      // Re-render with same props
      rerender(
        <ThemeProvider>
          <OverviewTab
            indexedDBSearchItems={mockSearchItems}
            indexedDBEvents={mockEvents}
          />
        </ThemeProvider>
      );

      // Should not call the categorize function again due to memoization
      expect(mockCategorizeRawSearchItems).toHaveBeenCalledTimes(initialCallCount);
    });

    it('should memoize events calculation', () => {
      const { rerender } = renderOverviewTab();

      // Get initial call count
      const initialCallCount = mockCategorizeRawEvents.mock.calls.length;

      // Re-render with same props
      rerender(
        <ThemeProvider>
          <OverviewTab
            indexedDBSearchItems={mockSearchItems}
            indexedDBEvents={mockEvents}
          />
        </ThemeProvider>
      );

      // Should not call the categorize function again due to memoization
      expect(mockCategorizeRawEvents).toHaveBeenCalledTimes(initialCallCount);
    });
  });
}); 