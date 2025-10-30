import { describe, it, expect } from 'vitest';
import { transformEventToItem, processRawEvents, categorizeRawSearchItems } from '../rawDataUtils';
import { GitHubEvent, GitHubItem } from '../../types';

describe('rawDataUtils', () => {
  describe('transformEventToItem', () => {
    it('should include original payload in transformed items', () => {
      const mockEvent: GitHubEvent = {
        id: '123',
        type: 'IssuesEvent',
        actor: {
          id: 1,
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          url: 'https://api.github.com/users/testuser',
        },
        repo: {
          id: 1,
          name: 'test/repo',
          url: 'https://api.github.com/repos/test/repo',
        },
        payload: {
          action: 'opened',
          issue: {
            id: 456,
            number: 1,
            title: 'Test Issue',
            html_url: 'https://github.com/test/repo/issues/1',
            state: 'open',
            body: 'Test issue body',
            labels: [],
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            user: {
              login: 'testuser',
              avatar_url: 'https://github.com/testuser.png',
              html_url: 'https://github.com/testuser',
            },
          },
        },
        public: true,
        created_at: '2023-01-01T00:00:00Z',
      };

      const result = transformEventToItem(mockEvent);

      expect(result).toBeTruthy();
      expect(result?.original).toBeDefined();
      expect(result?.original).toEqual(mockEvent.payload);
    });

    it('should include original payload in PushEvent items', () => {
      const mockPushEvent: GitHubEvent = {
        id: '456',
        type: 'PushEvent',
        actor: {
          id: 1,
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          url: 'https://api.github.com/users/testuser',
        },
        repo: {
          id: 1,
          name: 'test/repo',
          url: 'https://api.github.com/repos/test/repo',
        },
        payload: {
          ref: 'refs/heads/main',
          size: 2,
          distinct_size: 2,
          commits: [
            {
              sha: 'abc123',
              message: 'Test commit',
              author: { name: 'Test User', email: 'test@example.com' },
            },
          ],
        } as Record<string, unknown>,
        public: true,
        created_at: '2023-01-01T00:00:00Z',
      };

      const result = transformEventToItem(mockPushEvent);

      expect(result).toBeTruthy();
      expect(result?.original).toBeDefined();
      expect(result?.original).toEqual(mockPushEvent.payload);
    });

    it('should include original payload in CreateEvent items', () => {
      const mockCreateEvent: GitHubEvent = {
        id: '789',
        type: 'CreateEvent',
        actor: {
          id: 1,
          login: 'testuser',
          avatar_url: 'https://github.com/testuser.png',
          url: 'https://api.github.com/users/testuser',
        },
        repo: {
          id: 1,
          name: 'test/repo',
          url: 'https://api.github.com/repos/test/repo',
        },
        payload: {
          ref_type: 'branch',
          ref: 'feature-branch',
          master_branch: 'main',
          description: 'Test branch',
        } as Record<string, unknown>,
        public: true,
        created_at: '2023-01-01T00:00:00Z',
      };

      const result = transformEventToItem(mockCreateEvent);

      expect(result).toBeTruthy();
      expect(result?.original).toBeDefined();
      expect(result?.original).toEqual(mockCreateEvent.payload);
    });

    it('should handle new GitHub API format for PullRequestEvent (without full PR details)', () => {
      const mockPREvent: GitHubEvent = {
        id: '4340559024',
        type: 'PullRequestEvent',
        actor: {
          id: 63072419,
          login: 'testuser',
          avatar_url: 'https://avatars.githubusercontent.com/u/63072419?',
          url: 'https://api.github.com/users/testuser',
        },
        repo: {
          id: 7833168,
          name: 'elastic/kibana',
          url: 'https://api.github.com/repos/elastic/kibana',
        },
        payload: {
          action: 'labeled',
          pull_request: {
            url: 'https://api.github.com/repos/elastic/kibana/pulls/241173',
            id: 2959929265,
            number: 241173,
            title: '',
            html_url: '',
            state: 'open',
            body: '',
            labels: [
              {
                id: 1196522308,
                name: 'release_note:skip',
                color: '016589',
                default: false,
                description: 'Skip the PR/issue when compiling release notes',
              },
            ],
            created_at: '2025-10-29T17:13:21Z',
            updated_at: '2025-10-29T17:13:21Z',
            user: {
              login: 'testuser',
              avatar_url: 'https://avatars.githubusercontent.com/u/63072419?',
              html_url: 'https://github.com/testuser',
            },
          },
        } as any,
        public: true,
        created_at: '2025-10-29T17:13:21Z',
      };

      const result = transformEventToItem(mockPREvent);

      expect(result).toBeTruthy();
      expect(result?.title).toBeDefined();
      expect(result?.title).toBe('Pull Request #241173 labeled');
      expect(result?.html_url).toBe('https://github.com/elastic/kibana/pull/241173');
      expect(result?.number).toBe(241173);
      // Labels come from the pull_request object in the payload
      expect(result?.labels).toEqual((mockPREvent.payload as any).pull_request.labels);
      expect(result?.original).toEqual(mockPREvent.payload);
    });
  });

  describe('processRawEvents', () => {
    it('should preserve original payload in categorized events', () => {
      const mockEvents: GitHubEvent[] = [
        {
          id: '123',
          type: 'IssuesEvent',
          actor: {
            id: 1,
            login: 'testuser',
            avatar_url: 'https://github.com/testuser.png',
            url: 'https://api.github.com/users/testuser',
          },
          repo: {
            id: 1,
            name: 'test/repo',
            url: 'https://api.github.com/repos/test/repo',
          },
          payload: {
            action: 'opened',
            issue: {
              id: 456,
              number: 1,
              title: 'Test Issue',
              html_url: 'https://github.com/test/repo/issues/1',
              state: 'open',
              body: 'Test issue body',
              labels: [],
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z',
              user: {
                login: 'testuser',
                avatar_url: 'https://github.com/testuser.png',
                html_url: 'https://github.com/testuser',
              },
            },
          },
          public: true,
          created_at: '2023-01-01T00:00:00Z',
        },
      ];

      const results = processRawEvents(mockEvents);

      expect(results).toHaveLength(1);
      expect(results[0].original).toBeDefined();
      expect(results[0].original).toEqual(mockEvents[0].payload);
    });
  });

  describe('categorizeRawSearchItems', () => {
    it('should remove duplicate items based on html_url', () => {
      const mockItems: GitHubItem[] = [
        {
          id: 1,
          html_url: 'https://github.com/test/repo/issues/1',
          title: 'Test Issue',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          state: 'open',
          body: 'Original issue',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: {
            full_name: 'test/repo',
            html_url: 'https://github.com/test/repo',
          },
          user: {
            login: 'user1',
            avatar_url: 'https://github.com/user1.png',
            html_url: 'https://github.com/user1',
          },
          number: 1,
        },
        {
          id: 2, // Different ID
          html_url: 'https://github.com/test/repo/issues/1', // Same URL (duplicate)
          title: 'Test Issue',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          state: 'open',
          body: 'Duplicate issue',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: {
            full_name: 'test/repo',
            html_url: 'https://github.com/test/repo',
          },
          user: {
            login: 'user2',
            avatar_url: 'https://github.com/user2.png',
            html_url: 'https://github.com/user2',
          },
          number: 1,
        },
        {
          id: 3,
          html_url: 'https://github.com/test/repo/issues/2', // Different URL (unique)
          title: 'Another Issue',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          state: 'open',
          body: 'Unique issue',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: {
            full_name: 'test/repo',
            html_url: 'https://github.com/test/repo',
          },
          user: {
            login: 'user1',
            avatar_url: 'https://github.com/user1.png',
            html_url: 'https://github.com/user1',
          },
          number: 2,
        },
      ];

      const results = categorizeRawSearchItems(mockItems);

      // Should have 2 items (first duplicate kept, second duplicate removed)
      expect(results).toHaveLength(2);
      expect(results[0].html_url).toBe('https://github.com/test/repo/issues/1');
      expect(results[0].body).toBe('Original issue'); // First occurrence kept
      expect(results[1].html_url).toBe('https://github.com/test/repo/issues/2');
      expect(results[1].body).toBe('Unique issue');
    });

    it('should filter items by date range and remove duplicates', () => {
      const mockItems: GitHubItem[] = [
        {
          id: 1,
          html_url: 'https://github.com/test/repo/issues/1',
          title: 'Old Issue',
          created_at: '2022-12-01T00:00:00Z',
          updated_at: '2022-12-01T00:00:00Z', // Before date range
          state: 'open',
          body: 'Old issue',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: {
            full_name: 'test/repo',
            html_url: 'https://github.com/test/repo',
          },
          user: {
            login: 'user1',
            avatar_url: 'https://github.com/user1.png',
            html_url: 'https://github.com/user1',
          },
          number: 1,
        },
        {
          id: 2,
          html_url: 'https://github.com/test/repo/issues/2',
          title: 'Recent Issue',
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-01-15T00:00:00Z', // Within date range
          state: 'open',
          body: 'Recent issue',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: {
            full_name: 'test/repo',
            html_url: 'https://github.com/test/repo',
          },
          user: {
            login: 'user1',
            avatar_url: 'https://github.com/user1.png',
            html_url: 'https://github.com/user1',
          },
          number: 2,
        },
        {
          id: 3,
          html_url: 'https://github.com/test/repo/issues/2', // Duplicate of recent issue
          title: 'Recent Issue',
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-01-15T00:00:00Z',
          state: 'open',
          body: 'Duplicate recent issue',
          labels: [],
          repository_url: 'https://api.github.com/repos/test/repo',
          repository: {
            full_name: 'test/repo',
            html_url: 'https://github.com/test/repo',
          },
          user: {
            login: 'user2',
            avatar_url: 'https://github.com/user2.png',
            html_url: 'https://github.com/user2',
          },
          number: 2,
        },
      ];

      const results = categorizeRawSearchItems(mockItems, '2023-01-01', '2023-01-31');

      // Should have 1 item (old item filtered out, duplicate removed)
      expect(results).toHaveLength(1);
      expect(results[0].html_url).toBe('https://github.com/test/repo/issues/2');
      expect(results[0].body).toBe('Recent issue'); // First occurrence kept
    });
  });
}); 