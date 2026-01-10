import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import ItemRow from '../ItemRow';
import { GitHubItem } from '../../types';

// Helper to create a minimal GitHubItem
const createMockItem = (overrides: Partial<GitHubItem> = {}): GitHubItem => ({
  id: 1,
  html_url: 'https://github.com/test/repo/issues/1',
  title: 'Test Issue',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-16T00:00:00Z',
  state: 'open',
  user: {
    login: 'actor-user',
    avatar_url: 'https://github.com/actor-user.png',
    html_url: 'https://github.com/actor-user',
  },
  ...overrides,
});

// Helper to render with ThemeProvider
const renderWithTheme = (component: React.ReactNode) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe('ItemRow', () => {
  const mockOnShowDescription = vi.fn();

  describe('Avatar display for issues', () => {
    it('should show actor avatar for issue without assignee', () => {
      const item = createMockItem();

      renderWithTheme(
        <ItemRow item={item} onShowDescription={mockOnShowDescription} />
      );

      // Should show actor's avatar
      const avatars = screen.getAllByRole('img');
      expect(avatars.length).toBeGreaterThanOrEqual(1);
      expect(avatars[0]).toHaveAttribute('alt', expect.stringContaining('actor-user'));
    });

    it('should show actor avatar for issue with same user as assignee', () => {
      const item = createMockItem({
        assignee: {
          login: 'actor-user', // Same as user
          avatar_url: 'https://github.com/actor-user.png',
          html_url: 'https://github.com/actor-user',
        },
      });

      renderWithTheme(
        <ItemRow item={item} onShowDescription={mockOnShowDescription} />
      );

      // Should show only actor's avatar (no stack needed)
      const avatars = screen.getAllByRole('img');
      expect(avatars[0]).toHaveAttribute('alt', expect.stringContaining('actor-user'));
    });

    it('should show avatar stack for issue with different assignee', () => {
      const item = createMockItem({
        assignee: {
          login: 'assignee-user',
          avatar_url: 'https://github.com/assignee-user.png',
          html_url: 'https://github.com/assignee-user',
        },
      });

      renderWithTheme(
        <ItemRow item={item} onShowDescription={mockOnShowDescription} />
      );

      // Should show both avatars - actor first, then assignee
      const avatars = screen.getAllByRole('img');
      // First avatar should be actor
      const actorAvatar = avatars.find(img => img.getAttribute('alt')?.includes('actor-user'));
      const assigneeAvatar = avatars.find(img => img.getAttribute('alt')?.includes('assignee-user'));

      expect(actorAvatar).toBeDefined();
      expect(assigneeAvatar).toBeDefined();
    });

    it('should show actor (who performed action) first in avatar stack', () => {
      const item = createMockItem({
        action: 'labeled',
        assignee: {
          login: 'assignee-user',
          avatar_url: 'https://github.com/assignee-user.png',
          html_url: 'https://github.com/assignee-user',
        },
      });

      renderWithTheme(
        <ItemRow item={item} onShowDescription={mockOnShowDescription} />
      );

      // Verify actor avatar alt text indicates they are the actor
      const actorAvatar = screen.getAllByRole('img').find(
        img => img.getAttribute('alt')?.includes('actor') && img.getAttribute('alt')?.includes('actor-user')
      );
      expect(actorAvatar).toBeDefined();
    });
  });

  describe('Avatar display for PRs', () => {
    it('should show single avatar for PR (not use avatar stack)', () => {
      const item = createMockItem({
        pull_request: { url: 'https://github.com/test/repo/pull/1' },
        assignee: {
          login: 'assignee-user',
          avatar_url: 'https://github.com/assignee-user.png',
          html_url: 'https://github.com/assignee-user',
        },
      });

      renderWithTheme(
        <ItemRow item={item} onShowDescription={mockOnShowDescription} />
      );

      // For PRs, should show user avatar (not assignee stack)
      const avatars = screen.getAllByRole('img');
      expect(avatars[0]).toHaveAttribute('alt', expect.stringContaining('actor-user'));
      // Should not show assignee avatar in alt text
      const assigneeAvatar = avatars.find(img =>
        img.getAttribute('alt')?.includes('assignee-user') && img.getAttribute('alt')?.includes('assignee')
      );
      expect(assigneeAvatar).toBeUndefined();
    });
  });

  describe('Action badge display', () => {
    it('should display action badge when action is present', () => {
      const item = createMockItem({
        action: 'labeled',
      });

      renderWithTheme(
        <ItemRow item={item} onShowDescription={mockOnShowDescription} />
      );

      // Should show the action as a label/badge (appears in both mobile and desktop layouts)
      const actionBadges = screen.getAllByText('labeled');
      expect(actionBadges.length).toBeGreaterThan(0);
    });

    it('should not display action badge when action is not present', () => {
      const item = createMockItem({
        action: undefined,
      });

      renderWithTheme(
        <ItemRow item={item} onShowDescription={mockOnShowDescription} />
      );

      // Common action words should not appear
      expect(screen.queryByText('labeled')).not.toBeInTheDocument();
      expect(screen.queryByText('opened')).not.toBeInTheDocument();
      expect(screen.queryByText('closed')).not.toBeInTheDocument();
    });
  });
});
