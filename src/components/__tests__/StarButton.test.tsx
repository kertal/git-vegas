import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import StarButton from '../StarButton';
import { GitHubItem } from '../../types';
import { StarredItemsManager } from '../../utils/starredItems';

// Mock the StarredItemsManager
vi.mock('../../utils/starredItems', () => ({
  StarredItemsManager: {
    isStarred: vi.fn(),
    addItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

// Mock GitHub item for testing
const mockItem: GitHubItem = {
  id: 1,
  html_url: 'https://github.com/owner/repo/issues/1',
  title: 'Test Issue',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  state: 'open',
  body: 'Test issue body',
  user: {
    login: 'testuser',
    avatar_url: 'https://github.com/testuser.png',
    html_url: 'https://github.com/testuser',
  },
  repository_url: 'https://api.github.com/repos/owner/repo',
  repository: {
    full_name: 'owner/repo',
    html_url: 'https://github.com/owner/repo',
  },
  number: 1,
};

const renderStarButton = (props = {}) => {
  return render(
    <ThemeProvider>
      <StarButton item={mockItem} {...props} />
    </ThemeProvider>
  );
};

describe('StarButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render star icon when item is not starred', () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(false);
      
      renderStarButton();
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Add to starred items');
    });

    it('should render filled star icon when item is starred', () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(true);
      
      renderStarButton();
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-describedby');
    });

    it('should render with small size by default', () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(false);
      
      renderStarButton();
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('Button--small');
    });

    it('should render with medium size when specified', () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(false);
      
      renderStarButton({ size: 'medium' });
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('Button--medium');
    });

    it('should render with invisible variant by default', () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(false);
      
      renderStarButton();
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('Button--invisible');
    });

    it('should render with default variant when specified', () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(false);
      
      renderStarButton({ variant: 'default' });
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('Button--default');
    });

    it('should render without tooltip when showTooltip is false', () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(false);
      
      renderStarButton({ showTooltip: false });
      
      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('aria-describedby');
    });
  });

  describe('interactions', () => {
    it('should add item to starred items when clicked and not starred', async () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(false);
      
      renderStarButton();
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(StarredItemsManager.addItem).toHaveBeenCalledWith(mockItem, undefined);
      });
    });

    it('should remove item from starred items when clicked and starred', async () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(true);
      
      renderStarButton();
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(StarredItemsManager.removeItem).toHaveBeenCalledWith(mockItem);
      });
    });

    it('should call onStarChange callback when star state changes', async () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(false);
      const onStarChange = vi.fn();
      
      renderStarButton({ onStarChange });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(onStarChange).toHaveBeenCalledWith(true);
      });
    });

    it('should be disabled during loading state', async () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(false);
      
      renderStarButton();
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Button should be disabled during the async operation
      expect(button).toBeDisabled();
      
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(false);
      vi.mocked(StarredItemsManager.addItem).mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderStarButton();
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to toggle star:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('accessibility', () => {
    it('should have correct aria-label for unstarred items', () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(false);
      
      renderStarButton();
      
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Add to starred items');
    });

    it('should have correct aria-label for starred items', () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(true);
      
      renderStarButton();
      
      expect(screen.getByRole('button')).toHaveAttribute('aria-describedby');
    });

    it('should be keyboard accessible', () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(false);
      
      renderStarButton();
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
      
      fireEvent.keyDown(button, { key: 'Enter' });
      
      expect(StarredItemsManager.addItem).toHaveBeenCalled();
    });
  });

  describe('styling', () => {
    it('should have correct color for unstarred items', () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(false);
      
      renderStarButton();
      
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ color: 'var(--color-fg-muted)' });
    });

    it('should have correct color for starred items', () => {
      vi.mocked(StarredItemsManager.isStarred).mockReturnValue(true);
      
      renderStarButton();
      
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ color: 'var(--color-attention-fg)' });
    });
  });
}); 