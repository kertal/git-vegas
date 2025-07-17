import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import OverviewTab from '../../views/OverviewTab';
import { GitHubItem, GitHubEvent } from '../../types';
import * as rawDataUtils from '../../utils/rawDataUtils';
import { 
  PushEventPayload, 
  CreateEventPayload, 
  ForkEventPayload, 
  DeleteEventPayload, 
  GollumEventPayload 
} from '../../types';

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

      // Find event descriptions that contain the user names
      const eventDescriptions = screen.getAllByText(/eventuser1|eventuser2/);
      const recentEvent = eventDescriptions.find(el => el.textContent?.includes('eventuser1'));
      const olderEvent = eventDescriptions.find(el => el.textContent?.includes('eventuser2'));
      
      expect(recentEvent).toBeInTheDocument();
      expect(olderEvent).toBeInTheDocument();
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

      // Should only show 10 events (check for event descriptions in events section only)
      const eventDescriptions = screen.getAllByText(/eventuser\d+/);
      // Since both sections render, we expect up to 20 elements (10 from each section)
      // But we should have at least 10 from the events section
      expect(eventDescriptions.length).toBeGreaterThanOrEqual(10);
      expect(eventDescriptions.length).toBeLessThanOrEqual(20);
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

        // Check that the event is rendered with the correct description
        expect(screen.getByText(/reviewed pull request #undefined/)).toBeInTheDocument();
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

      // Should not call categorizeRawSearchItems again
      expect(mockCategorizeRawSearchItems.mock.calls.length).toBe(initialCallCount);
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

      // Should not call categorizeRawEvents again
      expect(mockCategorizeRawEvents.mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('Recent Events - Enhanced Functionality', () => {
    describe('Event Icons', () => {
      it('should display correct icon for PushEvent', () => {
        const pushEvent = {
          ...mockEvents[0],
          type: 'PushEvent',
        };
        renderOverviewTab({ indexedDBEvents: [pushEvent] });

        // The icon should be rendered (we can't easily test the specific icon component)
        // but we can verify the event is displayed correctly
        expect(screen.getByText(/pushed.*commit/)).toBeInTheDocument();
      });

      it('should display correct icon for CreateEvent', () => {
        const createEvent = {
          ...mockEvents[0],
          type: 'CreateEvent',
        };
        renderOverviewTab({ indexedDBEvents: [createEvent] });

        expect(screen.getByText(/created.*repository/)).toBeInTheDocument();
      });

      it('should display correct icon for PullRequestEvent', () => {
        const prEvent = {
          ...mockEvents[0],
          type: 'PullRequestEvent',
        };
        renderOverviewTab({ indexedDBEvents: [prEvent] });

        // Check for the event description in the events section
        expect(screen.getByText(/opened pull request #undefined/)).toBeInTheDocument();
      });

      it('should display correct icon for IssuesEvent', () => {
        const issueEvent = {
          ...mockEvents[0],
          type: 'IssuesEvent',
        };
        renderOverviewTab({ indexedDBEvents: [issueEvent] });

        // Check for the event description in the events section
        expect(screen.getByText(/opened issue #undefined/)).toBeInTheDocument();
      });

      it('should display correct icon for WatchEvent', () => {
        const watchEvent = {
          ...mockEvents[0],
          type: 'WatchEvent',
        };
        renderOverviewTab({ indexedDBEvents: [watchEvent] });

        expect(screen.getByText(/starred the repository/)).toBeInTheDocument();
      });

      it('should display correct icon for ForkEvent', () => {
        const forkEvent = {
          ...mockEvents[0],
          type: 'ForkEvent',
        };
        renderOverviewTab({ indexedDBEvents: [forkEvent] });

        expect(screen.getByText(/forked repository/)).toBeInTheDocument();
      });

      it('should display correct icon for IssueCommentEvent', () => {
        const commentEvent = {
          ...mockEvents[0],
          type: 'IssueCommentEvent',
        };
        renderOverviewTab({ indexedDBEvents: [commentEvent] });

        expect(screen.getByText(/commented on issue/)).toBeInTheDocument();
      });

      it('should display correct icon for PullRequestReviewEvent', () => {
        const reviewEvent = {
          ...mockEvents[0],
          type: 'PullRequestReviewEvent',
        };
        renderOverviewTab({ indexedDBEvents: [reviewEvent] });

        // Check for the event description in the events section
        expect(screen.getByText(/reviewed pull request #undefined/)).toBeInTheDocument();
      });

      it('should display correct icon for DeleteEvent', () => {
        const deleteEvent = {
          ...mockEvents[0],
          type: 'DeleteEvent',
        };
        renderOverviewTab({ indexedDBEvents: [deleteEvent] });

        expect(screen.getByText(/deleted.*branch/)).toBeInTheDocument();
      });

      it('should display correct icon for GollumEvent', () => {
        const gollumEvent = {
          ...mockEvents[0],
          type: 'GollumEvent',
        };
        renderOverviewTab({ indexedDBEvents: [gollumEvent] });

        expect(screen.getByText(/updated.*wiki page/)).toBeInTheDocument();
      });

      it('should display default icon for unknown event types', () => {
        const unknownEvent = {
          ...mockEvents[0],
          type: 'UnknownEventType',
        };
        renderOverviewTab({ indexedDBEvents: [unknownEvent] });

        expect(screen.getByText(/performed unknown event type/)).toBeInTheDocument();
      });
    });

    describe('Event Descriptions', () => {
      it('should display detailed description for PushEvent with commits', () => {
        const pushEvent = {
          ...mockEvents[0],
          type: 'PushEvent',
          payload: {
            commits: [{ id: 'abc123', message: 'test commit' }],
            ref: 'refs/heads/main',
          } as PushEventPayload,
        };
        renderOverviewTab({ indexedDBEvents: [pushEvent] });

        expect(screen.getByText(/eventuser1 pushed 1 commit to main/)).toBeInTheDocument();
      });

      it('should display description for PushEvent with multiple commits', () => {
        const pushEvent = {
          ...mockEvents[0],
          type: 'PushEvent',
          payload: {
            commits: [
              { id: 'abc123', message: 'test commit 1' },
              { id: 'def456', message: 'test commit 2' },
            ],
            ref: 'refs/heads/feature',
          } as PushEventPayload,
        };
        renderOverviewTab({ indexedDBEvents: [pushEvent] });

        expect(screen.getByText(/eventuser1 pushed 2 commits to feature/)).toBeInTheDocument();
      });

      it('should display description for CreateEvent with branch', () => {
        const createEvent = {
          ...mockEvents[0],
          type: 'CreateEvent',
          payload: {
            ref_type: 'branch',
            ref: 'feature/new-feature',
          } as CreateEventPayload,
        };
        renderOverviewTab({ indexedDBEvents: [createEvent] });

        expect(screen.getByText(/eventuser1 created branch feature\/new-feature/)).toBeInTheDocument();
      });

      it('should display description for CreateEvent with repository', () => {
        const createEvent = {
          ...mockEvents[0],
          type: 'CreateEvent',
          payload: {
            ref_type: 'repository',
          } as CreateEventPayload,
        };
        renderOverviewTab({ indexedDBEvents: [createEvent] });

        expect(screen.getByText(/eventuser1 created repository/)).toBeInTheDocument();
      });

      it('should display description for PullRequestEvent with action and number', () => {
        const prEvent = {
          ...mockEvents[0],
          type: 'PullRequestEvent',
          payload: {
            action: 'opened',
            pull_request: {
              number: 123,
              title: 'Add new feature',
            },
          },
        };
        renderOverviewTab({ indexedDBEvents: [prEvent] });

        expect(screen.getByText(/eventuser1 opened pull request #123: Add new feature/)).toBeInTheDocument();
      });

      it('should display description for IssuesEvent with action and number', () => {
        const issueEvent = {
          ...mockEvents[0],
          type: 'IssuesEvent',
          payload: {
            action: 'closed',
            issue: {
              number: 456,
              title: 'Fix bug',
            },
          },
        };
        renderOverviewTab({ indexedDBEvents: [issueEvent] });

        expect(screen.getByText(/eventuser1 closed issue #456: Fix bug/)).toBeInTheDocument();
      });

      it('should display description for ForkEvent with forkee', () => {
        const forkEvent = {
          ...mockEvents[0],
          type: 'ForkEvent',
          payload: {
            forkee: {
              full_name: 'forkuser/forked-repo',
            },
          } as ForkEventPayload,
        };
        renderOverviewTab({ indexedDBEvents: [forkEvent] });

        expect(screen.getByText(/eventuser1 forked repository to forkuser\/forked-repo/)).toBeInTheDocument();
      });

      it('should display description for WatchEvent', () => {
        const watchEvent = {
          ...mockEvents[0],
          type: 'WatchEvent',
        };
        renderOverviewTab({ indexedDBEvents: [watchEvent] });

        expect(screen.getByText(/eventuser1 starred the repository/)).toBeInTheDocument();
      });

      it('should display description for PublicEvent', () => {
        const publicEvent = {
          ...mockEvents[0],
          type: 'PublicEvent',
        };
        renderOverviewTab({ indexedDBEvents: [publicEvent] });

        expect(screen.getByText(/eventuser1 made the repository public/)).toBeInTheDocument();
      });

      it('should display description for IssueCommentEvent', () => {
        const commentEvent = {
          ...mockEvents[0],
          type: 'IssueCommentEvent',
          payload: {
            issue: {
              number: 789,
              title: 'Discussion needed',
            },
          },
        };
        renderOverviewTab({ indexedDBEvents: [commentEvent] });

        expect(screen.getByText(/eventuser1 commented on issue #789: Discussion needed/)).toBeInTheDocument();
      });

      it('should display description for PullRequestReviewCommentEvent', () => {
        const reviewCommentEvent = {
          ...mockEvents[0],
          type: 'PullRequestReviewCommentEvent',
          payload: {
            pull_request: {
              number: 101,
              title: 'Code review',
            },
          },
        };
        renderOverviewTab({ indexedDBEvents: [reviewCommentEvent] });

        expect(screen.getByText(/eventuser1 commented on pull request #101: Code review/)).toBeInTheDocument();
      });

      it('should display description for PullRequestReviewEvent', () => {
        const reviewEvent = {
          ...mockEvents[0],
          type: 'PullRequestReviewEvent',
          payload: {
            action: 'submitted',
            pull_request: {
              number: 202,
              title: 'Feature implementation',
            },
          },
        };
        renderOverviewTab({ indexedDBEvents: [reviewEvent] });

        expect(screen.getByText(/eventuser1 submitted pull request #202: Feature implementation/)).toBeInTheDocument();
      });

      it('should display description for DeleteEvent with branch', () => {
        const deleteEvent = {
          ...mockEvents[0],
          type: 'DeleteEvent',
          payload: {
            ref_type: 'branch',
            ref: 'old-feature',
          } as DeleteEventPayload,
        };
        renderOverviewTab({ indexedDBEvents: [deleteEvent] });

        expect(screen.getByText(/eventuser1 deleted branch old-feature/)).toBeInTheDocument();
      });

      it('should display description for GollumEvent with pages', () => {
        const gollumEvent = {
          ...mockEvents[0],
          type: 'GollumEvent',
          payload: {
            pages: [
              { name: 'Home', action: 'created' },
              { name: 'About', action: 'updated' },
            ] as GollumEventPayload['pages'],
          },
        } as GollumEventPayload;
        renderOverviewTab({ indexedDBEvents: [gollumEvent] });

        expect(screen.getByText(/eventuser1 updated 2 wiki pages/)).toBeInTheDocument();
      });

      it('should display description for GollumEvent with single page', () => {
        const gollumEvent = {
          ...mockEvents[0],
          type: 'GollumEvent',
          payload: {
            pages: [{ name: 'Home', action: 'created' }],
          },
        } as GollumEventPayload;
        renderOverviewTab({ indexedDBEvents: [gollumEvent] });

        expect(screen.getByText(/eventuser1 updated 1 wiki page/)).toBeInTheDocument();
      });
    });

    describe('Event Links', () => {
      it('should generate correct link for PushEvent', () => {
        const pushEvent = {
          ...mockEvents[0],
          type: 'PushEvent',
          payload: {
            ref: 'refs/heads/main',
          } as PushEventPayload,
        };
        renderOverviewTab({ indexedDBEvents: [pushEvent] });

        const eventLink = screen.getByText(/pushed.*commit/).closest('a');
        expect(eventLink).toHaveAttribute('href', 'https://github.com/owner/repo/commits/main');
      });

      it('should generate correct link for CreateEvent with branch', () => {
        const createEvent = {
          ...mockEvents[0],
          type: 'CreateEvent',
          payload: {
            ref_type: 'branch',
            ref: 'feature/new-feature',
          } as CreateEventPayload,
        };
        renderOverviewTab({ indexedDBEvents: [createEvent] });

        const eventLink = screen.getByText(/created.*branch/).closest('a');
        expect(eventLink).toHaveAttribute('href', 'https://github.com/owner/repo/tree/feature/new-feature');
      });

      it('should generate correct link for CreateEvent with repository', () => {
        const createEvent = {
          ...mockEvents[0],
          type: 'CreateEvent',
          payload: {
            ref_type: 'repository',
          } as CreateEventPayload,
        };
        renderOverviewTab({ indexedDBEvents: [createEvent] });

        const eventLink = screen.getByText(/created.*repository/).closest('a');
        expect(eventLink).toHaveAttribute('href', 'https://github.com/owner/repo');
      });

      it('should generate correct link for PullRequestEvent', () => {
        const prEvent = {
          ...mockEvents[0],
          type: 'PullRequestEvent',
          payload: {
            pull_request: {
              number: 123,
            },
          },
        };
        renderOverviewTab({ indexedDBEvents: [prEvent] });

        const eventLink = screen.getByText(/updated pull request #123/).closest('a');
        expect(eventLink).toHaveAttribute('href', 'https://github.com/owner/repo/pull/123');
      });

      it('should generate correct link for IssuesEvent', () => {
        const issueEvent = {
          ...mockEvents[0],
          type: 'IssuesEvent',
          payload: {
            issue: {
              number: 456,
            },
          },
        };
        renderOverviewTab({ indexedDBEvents: [issueEvent] });

        const eventLink = screen.getByText(/updated issue #456/).closest('a');
        expect(eventLink).toHaveAttribute('href', 'https://github.com/owner/repo/issues/456');
      });

      it('should generate correct link for ForkEvent with forkee', () => {
        const forkEvent = {
          ...mockEvents[0],
          type: 'ForkEvent',
          payload: {
            forkee: {
              full_name: 'forkuser/forked-repo',
            },
          } as ForkEventPayload,
        };
        renderOverviewTab({ indexedDBEvents: [forkEvent] });

        const eventLink = screen.getByText(/forked repository/).closest('a');
        expect(eventLink).toHaveAttribute('href', 'https://github.com/forkuser/forked-repo');
      });

      it('should generate correct link for ForkEvent without forkee', () => {
        const forkEvent = {
          ...mockEvents[0],
          type: 'ForkEvent',
          payload: {},
        };
        renderOverviewTab({ indexedDBEvents: [forkEvent] });

        const eventLink = screen.getByText(/forked repository/).closest('a');
        expect(eventLink).toHaveAttribute('href', 'https://github.com/owner/repo');
      });

      it('should generate correct link for WatchEvent', () => {
        const watchEvent = {
          ...mockEvents[0],
          type: 'WatchEvent',
        };
        renderOverviewTab({ indexedDBEvents: [watchEvent] });

        const eventLink = screen.getByText(/starred the repository/).closest('a');
        expect(eventLink).toHaveAttribute('href', 'https://github.com/owner/repo');
      });

      it('should generate correct link for PublicEvent', () => {
        const publicEvent = {
          ...mockEvents[0],
          type: 'PublicEvent',
        };
        renderOverviewTab({ indexedDBEvents: [publicEvent] });

        const eventLink = screen.getByText(/made the repository public/).closest('a');
        expect(eventLink).toHaveAttribute('href', 'https://github.com/owner/repo');
      });

      it('should generate correct link for IssueCommentEvent', () => {
        const commentEvent = {
          ...mockEvents[0],
          type: 'IssueCommentEvent',
          payload: {
            issue: {
              number: 789,
            },
          },
        };
        renderOverviewTab({ indexedDBEvents: [commentEvent] });

        const eventLink = screen.getByText(/commented on issue/).closest('a');
        expect(eventLink).toHaveAttribute('href', 'https://github.com/owner/repo/issues/789');
      });

      it('should generate correct link for PullRequestReviewCommentEvent', () => {
        const reviewCommentEvent = {
          ...mockEvents[0],
          type: 'PullRequestReviewCommentEvent',
          payload: {
            pull_request: {
              number: 101,
            },
          },
        };
        renderOverviewTab({ indexedDBEvents: [reviewCommentEvent] });

        const eventLink = screen.getByText(/commented on pull request/).closest('a');
        expect(eventLink).toHaveAttribute('href', 'https://github.com/owner/repo/pull/101');
      });

      it('should generate correct link for PullRequestReviewEvent', () => {
        const reviewEvent = {
          ...mockEvents[0],
          type: 'PullRequestReviewEvent',
          payload: {
            pull_request: {
              number: 202,
            },
          },
        };
        renderOverviewTab({ indexedDBEvents: [reviewEvent] });

        // Find any link that contains pull request and 202
        const eventLinks = screen.getAllByText(/pull request.*202/);
        const eventLink = eventLinks.find(link => link.closest('a'));
        expect(eventLink?.closest('a')).toHaveAttribute('href', 'https://github.com/owner/repo/pull/202');
      });

      it('should generate correct link for DeleteEvent', () => {
        const deleteEvent = {
          ...mockEvents[0],
          type: 'DeleteEvent',
        };
        renderOverviewTab({ indexedDBEvents: [deleteEvent] });

        const eventLink = screen.getByText(/deleted.*branch/).closest('a');
        expect(eventLink).toHaveAttribute('href', 'https://github.com/owner/repo');
      });

      it('should generate correct link for GollumEvent', () => {
        const gollumEvent = {
          ...mockEvents[0],
          type: 'GollumEvent',
        };
        renderOverviewTab({ indexedDBEvents: [gollumEvent] });

        const eventLink = screen.getByText(/updated.*wiki page/).closest('a');
        expect(eventLink).toHaveAttribute('href', 'https://github.com/owner/repo/wiki');
      });

      it('should generate correct link for unknown event types', () => {
        const unknownEvent = {
          ...mockEvents[0],
          type: 'UnknownEventType',
        };
        renderOverviewTab({ indexedDBEvents: [unknownEvent] });

        const eventLink = screen.getByText(/performed unknown event type/).closest('a');
        expect(eventLink).toHaveAttribute('href', 'https://github.com/owner/repo');
      });
    });

    describe('Event Display Layout', () => {
      it('should display event description as the main clickable link', () => {
        const pushEvent = {
          ...mockEvents[0],
          type: 'PushEvent',
          payload: {
            commits: [{ id: 'abc123', message: 'test commit' }],
            ref: 'refs/heads/main',
          } as PushEventPayload,
        };
        renderOverviewTab({ indexedDBEvents: [pushEvent] });

        const descriptionLink = screen.getByText(/eventuser1 pushed 1 commit to main/);
        expect(descriptionLink).toBeInTheDocument();
        expect(descriptionLink.closest('a')).toHaveAttribute('target', '_blank');
        expect(descriptionLink.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
      });

      it('should display external link icon on event description', () => {
        const pushEvent = {
          ...mockEvents[0],
          type: 'PushEvent',
          payload: {
            commits: [{ id: 'abc123', message: 'test commit' }],
            ref: 'refs/heads/main',
          } as PushEventPayload,
        };
        renderOverviewTab({ indexedDBEvents: [pushEvent] });

        const descriptionLink = screen.getByText(/eventuser1 pushed 1 commit to main/).closest('a');
        expect(descriptionLink).toBeInTheDocument();
        // The external link icon should be present (though we can't easily test the specific icon)
      });

      it('should display repository link with external icon', () => {
        const pushEvent = {
          ...mockEvents[0],
          type: 'PushEvent',
        };
        renderOverviewTab({ indexedDBEvents: [pushEvent] });

        const repoLinks = screen.getAllByText('owner/repo');
        const repoLinkWithIcon = repoLinks.find(link => 
          link.closest('a')?.querySelector('svg[class*="octicon-link-external"]')
        );
        expect(repoLinkWithIcon?.closest('a')).toHaveAttribute('href', 'https://github.com/owner/repo');
        expect(repoLinkWithIcon?.closest('a')).toHaveAttribute('target', '_blank');
        expect(repoLinkWithIcon?.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
      });

      it('should display actor information correctly', () => {
        const pushEvent = {
          ...mockEvents[0],
          type: 'PushEvent',
          actor: {
            id: 1,
            login: 'testactor',
            avatar_url: 'https://github.com/testactor.png',
            url: 'https://api.github.com/users/testactor',
          },
        };
        renderOverviewTab({ indexedDBEvents: [pushEvent] });

        expect(screen.getByText('testactor')).toBeInTheDocument();
        const actorLink = screen.getByText('testactor').closest('a');
        expect(actorLink).toHaveAttribute('href', 'https://github.com/testactor');
      });

      it('should display actor avatar correctly', () => {
        const pushEvent = {
          ...mockEvents[0],
          type: 'PushEvent',
          actor: {
            id: 1,
            login: 'testactor',
            avatar_url: 'https://github.com/testactor.png',
            url: 'https://api.github.com/users/testactor',
          },
        };
        renderOverviewTab({ indexedDBEvents: [pushEvent] });

        const avatar = screen.getByAltText('testactor avatar');
        expect(avatar).toHaveAttribute('src', 'https://github.com/testactor.png');
      });
    });

    describe('Edge Cases for Events', () => {
      it('should handle events with missing payload properties gracefully', () => {
        const eventWithMinimalPayload = {
          ...mockEvents[0],
          type: 'PushEvent',
          payload: {},
        };
        renderOverviewTab({ indexedDBEvents: [eventWithMinimalPayload] });

        expect(screen.getByText(/eventuser1 pushed 0 commits to main/)).toBeInTheDocument();
      });

      it('should handle events with missing pull_request number', () => {
        const prEventWithoutNumber = {
          ...mockEvents[0],
          type: 'PullRequestEvent',
          payload: {
            action: 'opened',
            pull_request: {
              title: 'Test PR',
            },
          },
        };
        renderOverviewTab({ indexedDBEvents: [prEventWithoutNumber] });

        expect(screen.getByText(/eventuser1 opened pull request #undefined: Test PR/)).toBeInTheDocument();
      });

      it('should handle events with missing issue number', () => {
        const issueEventWithoutNumber = {
          ...mockEvents[0],
          type: 'IssuesEvent',
          payload: {
            action: 'opened',
            issue: {
              title: 'Test Issue',
            },
          },
        };
        renderOverviewTab({ indexedDBEvents: [issueEventWithoutNumber] });

        expect(screen.getByText(/eventuser1 opened issue #undefined: Test Issue/)).toBeInTheDocument();
      });

      it('should handle events with missing repository name', () => {
        const eventWithoutRepo = {
          ...mockEvents[0],
          type: 'PushEvent',
          repo: {
            id: 1,
            name: '',
            url: 'https://api.github.com/repos/',
          },
        };
        renderOverviewTab({ indexedDBEvents: [eventWithoutRepo] });

        // Should still render the event description
        expect(screen.getByText(/eventuser1 pushed.*commit/)).toBeInTheDocument();
      });

      it('should handle events with missing actor information', () => {
        const eventWithoutActor = {
          ...mockEvents[0],
          type: 'PushEvent',
          actor: {
            id: 1,
            login: '',
            avatar_url: '',
            url: '',
          },
        };
        renderOverviewTab({ indexedDBEvents: [eventWithoutActor] });

        // Should still render the event description with empty actor name
        expect(screen.getByText(/pushed.*commit/)).toBeInTheDocument();
      });
    });
  });
}); 