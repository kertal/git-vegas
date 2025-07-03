import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import StarredItemsSection from '../StarredItemsSection';
import { StarredItem } from '../../types';
import { StarredItemsManager } from '../../utils/starredItems';

// Mock the StarredItemsManager
vi.mock('../../utils/starredItems', () => ({
  StarredItemsManager: {
    getAllStarredItems: vi.fn(),
    removeItem: vi.fn(),
    getCounts: vi.fn(),
  },
}));

// Mock GitHub items for testing
const mockIssue = {
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

const mockPullRequest = {
  id: 2,
  html_url: 'https://github.com/owner/repo/pull/2',
  title: 'Test Pull Request',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  state: 'open',
  body: 'Test PR body',
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
  number: 2,
  pull_request: {
    merged_at: undefined,
    url: 'https://github.com/owner/repo/pull/2',
  },
};

const mockComment = {
  id: 3,
  html_url: 'https://github.com/owner/repo/issues/1#issuecomment-123',
  title: 'Comment on: Test Issue',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  state: 'open',
  body: 'Test comment body',
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

const mockStarredItems: StarredItem[] = [
  {
    id: 'issue-1',
    type: 'issue',
    item: mockIssue,
    starredAt: '2024-01-01T10:00:00Z',
    note: 'Important issue',
  },
  {
    id: 'pr-2',
    type: 'pr',
    item: mockPullRequest,
    starredAt: '2024-01-02T10:00:00Z',
  },
  {
    id: 'comment-3',
    type: 'comment',
    item: mockComment,
    starredAt: '2024-01-03T10:00:00Z',
  },
];

const renderStarredItemsSection = (props = {}) => {
  return render(
    <ThemeProvider>
      <StarredItemsSection {...props} />
    </ThemeProvider>
  );
};

describe('StarredItemsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when no starred items exist', () => {
      vi.mocked(StarredItemsManager.getAllStarredItems).mockReturnValue([]);
      vi.mocked(StarredItemsManager.getCounts).mockReturnValue({
        total: 0,
        issues: 0,
        prs: 0,
        comments: 0,
      });
      
      const { container } = renderStarredItemsSection();
      
      expect(container.firstChild).toBeNull();
    });

    it('should render section header with total count', () => {
      vi.mocked(StarredItemsManager.getAllStarredItems).mockReturnValue(mockStarredItems);
      vi.mocked(StarredItemsManager.getCounts).mockReturnValue({
        total: 3,
        issues: 1,
        prs: 1,
        comments: 1,
      });
      
      renderStarredItemsSection();
      
      expect(screen.getByText('Starred Items (3)')).toBeInTheDocument();
    });

    it('should render filter buttons with counts', () => {
      vi.mocked(StarredItemsManager.getAllStarredItems).mockReturnValue(mockStarredItems);
      vi.mocked(StarredItemsManager.getCounts).mockReturnValue({
        total: 3,
        issues: 1,
        prs: 1,
        comments: 1,
      });
      
      renderStarredItemsSection();
      
      expect(screen.getByText('All (3)')).toBeInTheDocument();
      expect(screen.getByText('Issues (1)')).toBeInTheDocument();
      expect(screen.getByText('PRs (1)')).toBeInTheDocument();
      expect(screen.getByText('Comments (1)')).toBeInTheDocument();
    });

    it('should render all starred items by default', () => {
      vi.mocked(StarredItemsManager.getAllStarredItems).mockReturnValue(mockStarredItems);
      vi.mocked(StarredItemsManager.getCounts).mockReturnValue({
        total: 3,
        issues: 1,
        prs: 1,
        comments: 1,
      });
      
      renderStarredItemsSection();
      
      expect(screen.getByText('Test Issue')).toBeInTheDocument();
      expect(screen.getByText('Test Pull Request')).toBeInTheDocument();
      expect(screen.getByText('Comment on: Test Issue')).toBeInTheDocument();
    });

    it('should render item details correctly', () => {
      vi.mocked(StarredItemsManager.getAllStarredItems).mockReturnValue([mockStarredItems[0]]);
      vi.mocked(StarredItemsManager.getCounts).mockReturnValue({
        total: 1,
        issues: 1,
        prs: 0,
        comments: 0,
      });
      
      renderStarredItemsSection();
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('opened issue')).toBeInTheDocument();
      expect(screen.getByText('open')).toBeInTheDocument();
      expect(screen.getByText('Test Issue')).toBeInTheDocument();
      expect(screen.getByText('in owner/repo')).toBeInTheDocument();
    });

    it('should render note when present', () => {
      vi.mocked(StarredItemsManager.getAllStarredItems).mockReturnValue([mockStarredItems[0]]);
      vi.mocked(StarredItemsManager.getCounts).mockReturnValue({
        total: 1,
        issues: 1,
        prs: 0,
        comments: 0,
      });
      
      renderStarredItemsSection();
      
      expect(screen.getByText('Note: Important issue')).toBeInTheDocument();
    });

    it('should render draft label for draft PRs', () => {
      const draftPR = {
        ...mockPullRequest,
        draft: true,
        pull_request: { ...mockPullRequest.pull_request, draft: true },
      };
      
      const draftStarredItem: StarredItem = {
        id: 'pr-2',
        type: 'pr',
        item: draftPR,
        starredAt: '2024-01-02T10:00:00Z',
      };
      
      vi.mocked(StarredItemsManager.getAllStarredItems).mockReturnValue([draftStarredItem]);
      vi.mocked(StarredItemsManager.getCounts).mockReturnValue({
        total: 1,
        issues: 0,
        prs: 1,
        comments: 0,
      });
      
      renderStarredItemsSection();
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      vi.mocked(StarredItemsManager.getAllStarredItems).mockReturnValue(mockStarredItems);
      vi.mocked(StarredItemsManager.getCounts).mockReturnValue({
        total: 3,
        issues: 1,
        prs: 1,
        comments: 1,
      });
    });

    it('should filter to show only issues', () => {
      renderStarredItemsSection();
      
      const issuesButton = screen.getByText('Issues (1)');
      fireEvent.click(issuesButton);
      
      expect(screen.getByText('Test Issue')).toBeInTheDocument();
      expect(screen.queryByText('Test Pull Request')).not.toBeInTheDocument();
      expect(screen.queryByText('Comment on: Test Issue')).not.toBeInTheDocument();
    });

    it('should filter to show only PRs', () => {
      renderStarredItemsSection();
      
      const prsButton = screen.getByText('PRs (1)');
      fireEvent.click(prsButton);
      
      expect(screen.queryByText('Test Issue')).not.toBeInTheDocument();
      expect(screen.getByText('Test Pull Request')).toBeInTheDocument();
      expect(screen.queryByText('Comment on: Test Issue')).not.toBeInTheDocument();
    });

    it('should filter to show only comments', () => {
      renderStarredItemsSection();
      
      const commentsButton = screen.getByText('Comments (1)');
      fireEvent.click(commentsButton);
      
      expect(screen.queryByText('Test Issue')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Pull Request')).not.toBeInTheDocument();
      expect(screen.getByText('Comment on: Test Issue')).toBeInTheDocument();
    });

    it('should show all items when All filter is selected', () => {
      renderStarredItemsSection();
      
      // First filter to issues
      const issuesButton = screen.getByText('Issues (1)');
      fireEvent.click(issuesButton);
      
      // Then go back to all
      const allButton = screen.getByText('All (3)');
      fireEvent.click(allButton);
      
      expect(screen.getByText('Test Issue')).toBeInTheDocument();
      expect(screen.getByText('Test Pull Request')).toBeInTheDocument();
      expect(screen.getByText('Comment on: Test Issue')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    beforeEach(() => {
      vi.mocked(StarredItemsManager.getAllStarredItems).mockReturnValue([mockStarredItems[0]]);
      vi.mocked(StarredItemsManager.getCounts).mockReturnValue({
        total: 1,
        issues: 1,
        prs: 0,
        comments: 0,
      });
    });

    it('should call onRefresh when item is unstarred', async () => {
      const onRefresh = vi.fn();
      
      renderStarredItemsSection({ onRefresh });
      
      const unstarButton = screen.getByRole('button', { name: /remove from starred items/i });
      fireEvent.click(unstarButton);
      
      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled();
      });
    });

    it('should remove item when trash button is clicked', async () => {
      renderStarredItemsSection();
      
      const trashButton = screen.getByRole('button', { name: /trash/i });
      fireEvent.click(trashButton);
      
      await waitFor(() => {
        expect(StarredItemsManager.removeItem).toHaveBeenCalledWith(mockIssue);
      });
    });

    it('should reload items after unstarring', async () => {
      renderStarredItemsSection();
      
      const trashButton = screen.getByRole('button', { name: /trash/i });
      fireEvent.click(trashButton);
      
      await waitFor(() => {
        expect(StarredItemsManager.getAllStarredItems).toHaveBeenCalledTimes(2); // Initial load + reload
      });
    });
  });

  describe('empty states', () => {
    it('should show empty message when no items match filter', () => {
      vi.mocked(StarredItemsManager.getAllStarredItems).mockReturnValue([mockStarredItems[0]]); // Only issue
      vi.mocked(StarredItemsManager.getCounts).mockReturnValue({
        total: 1,
        issues: 1,
        prs: 0,
        comments: 0,
      });
      
      renderStarredItemsSection();
      
      // Filter to PRs (which don't exist)
      const prsButton = screen.getByText('PRs (0)');
      fireEvent.click(prsButton);
      
      expect(screen.getByText('No starred pull requests found.')).toBeInTheDocument();
    });
  });

  describe('links', () => {
    beforeEach(() => {
      vi.mocked(StarredItemsManager.getAllStarredItems).mockReturnValue([mockStarredItems[0]]);
      vi.mocked(StarredItemsManager.getCounts).mockReturnValue({
        total: 1,
        issues: 1,
        prs: 0,
        comments: 0,
      });
    });

    it('should render user link correctly', () => {
      renderStarredItemsSection();
      
      const userLink = screen.getByText('testuser');
      expect(userLink).toHaveAttribute('href', 'https://github.com/testuser');
      expect(userLink).toHaveAttribute('target', '_blank');
    });

    it('should render item link correctly', () => {
      renderStarredItemsSection();
      
      const itemLink = screen.getByText('Test Issue');
      expect(itemLink).toHaveAttribute('href', 'https://github.com/owner/repo/issues/1');
      expect(itemLink).toHaveAttribute('target', '_blank');
    });

    it('should render repository link correctly', () => {
      renderStarredItemsSection();
      
      const repoLink = screen.getByText('owner/repo');
      expect(repoLink).toHaveAttribute('href', 'https://github.com/owner/repo');
      expect(repoLink).toHaveAttribute('target', '_blank');
    });
  });
}); 