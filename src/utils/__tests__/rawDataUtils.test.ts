import { describe, it, expect } from 'vitest';
import { transformEventToItem, processRawEvents } from '../rawDataUtils';
import { GitHubEvent } from '../../types';

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
}); 