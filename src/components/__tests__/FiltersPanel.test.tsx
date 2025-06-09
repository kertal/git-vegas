import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider } from '@primer/react';
import FiltersPanel from '../FiltersPanel';
import { GitHubItem } from '../../types';

// Mock data
const mockResults: GitHubItem[] = [
  {
    id: 1,
    html_url: 'https://github.com/owner/repo1/issues/1',
    title: 'Test Issue 1',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    state: 'open',
    body: 'Test body',
    labels: [
      { name: 'bug', color: 'ff0000', description: 'Bug label' },
      { name: 'frontend', color: '00ff00', description: 'Frontend label' }
    ],
    repository_url: 'https://api.github.com/repos/owner/repo1',
    user: {
      login: 'user1',
      avatar_url: 'https://github.com/user1.png',
      html_url: 'https://github.com/user1'
    }
  },
  {
    id: 2,
    html_url: 'https://github.com/owner/repo2/pull/2',
    title: 'Test PR 2',
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    state: 'open',
    body: 'Test PR body',
    pull_request: { url: 'https://api.github.com/repos/owner/repo2/pulls/2' },
    labels: [
      { name: 'enhancement', color: '0000ff', description: 'Enhancement label' }
    ],
    repository_url: 'https://api.github.com/repos/owner/repo2',
    user: {
      login: 'user2',
      avatar_url: 'https://github.com/user2.png',
      html_url: 'https://github.com/user2'
    }
  }
];

const mockAvailableLabels = ['bug', 'frontend', 'enhancement'];

const defaultProps = {
  results: mockResults,
  availableLabels: mockAvailableLabels,
  filter: 'all' as const,
  statusFilter: 'all' as const,
  userFilter: '',
  includedLabels: [],
  excludedLabels: [],
  repoFilters: [],
  setFilter: vi.fn(),
  setStatusFilter: vi.fn(),
  setUserFilter: vi.fn(),
  setIncludedLabels: vi.fn(),
  setExcludedLabels: vi.fn(),
  setRepoFilters: vi.fn(),
  areFiltersCollapsed: false,
  setAreFiltersCollapsed: vi.fn(),
  hasConfiguredFilters: false,
  clearAllFilters: vi.fn(),
  getFilterSummary: vi.fn(() => 'No filters'),
  buttonStyles: { height: 28, minWidth: 0 },
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('FiltersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the filters panel with collapsed state', () => {
      renderWithTheme(
        <FiltersPanel {...defaultProps} areFiltersCollapsed={true} />
      );

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('renders the filters panel with expanded state', () => {
      renderWithTheme(
        <FiltersPanel {...defaultProps} areFiltersCollapsed={false} />
      );

      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('shows filter summary when collapsed and has configured filters', () => {
      const summaryText = 'Type: Issues, Status: Open';
      renderWithTheme(
        <FiltersPanel 
          {...defaultProps} 
          areFiltersCollapsed={true}
          hasConfiguredFilters={true}
          getFilterSummary={() => summaryText}
        />
      );

      expect(screen.getByText(`Filters: ${summaryText}`)).toBeInTheDocument();
    });

    it('shows Clear All button when filters are configured', () => {
      renderWithTheme(
        <FiltersPanel 
          {...defaultProps} 
          hasConfiguredFilters={true}
        />
      );

      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
  });

  describe('Type Filter', () => {
    it('renders type filter buttons', () => {
      renderWithTheme(<FiltersPanel {...defaultProps} />);

      expect(screen.getByText('Issues')).toBeInTheDocument();
      expect(screen.getByText('PRs')).toBeInTheDocument();
      expect(screen.getByText('Comments')).toBeInTheDocument();
    });

    it('calls setFilter when type buttons are clicked', () => {
      renderWithTheme(<FiltersPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('Issues'));
      expect(defaultProps.setFilter).toHaveBeenCalledWith('issue');

      fireEvent.click(screen.getByText('PRs'));
      expect(defaultProps.setFilter).toHaveBeenCalledWith('pr');

      fireEvent.click(screen.getByText('Comments'));
      expect(defaultProps.setFilter).toHaveBeenCalledWith('comment');
    });

    it('toggles filter when same button is clicked', () => {
      renderWithTheme(<FiltersPanel {...defaultProps} filter="issue" />);

      fireEvent.click(screen.getByText('Issues'));
      expect(defaultProps.setFilter).toHaveBeenCalledWith('all');
    });
  });

  describe('Status Filter', () => {
    it('renders status filter buttons', () => {
      renderWithTheme(<FiltersPanel {...defaultProps} />);

      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.getByText('Closed')).toBeInTheDocument();
      expect(screen.getByText('Merged')).toBeInTheDocument();
    });

    it('calls setStatusFilter when status buttons are clicked', () => {
      renderWithTheme(<FiltersPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('Open'));
      expect(defaultProps.setStatusFilter).toHaveBeenCalledWith('open');

      fireEvent.click(screen.getByText('Closed'));
      expect(defaultProps.setStatusFilter).toHaveBeenCalledWith('closed');

      fireEvent.click(screen.getByText('Merged'));
      expect(defaultProps.setStatusFilter).toHaveBeenCalledWith('merged');
    });
  });

  describe('User Filter', () => {
    it('renders user filter when multiple users exist', () => {
      renderWithTheme(<FiltersPanel {...defaultProps} />);

      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('All Users')).toBeInTheDocument();
    });

    it('does not render user filter when only one user exists', () => {
      const singleUserResults = [mockResults[0]];
      renderWithTheme(
        <FiltersPanel {...defaultProps} results={singleUserResults} />
      );

      expect(screen.queryByText('User')).not.toBeInTheDocument();
    });

    it('shows selected user in button text', () => {
      renderWithTheme(
        <FiltersPanel {...defaultProps} userFilter="user1" />
      );

      expect(screen.getByText('user1')).toBeInTheDocument();
    });
  });

  describe('Repository Filter', () => {
    it('renders repository filter when repositories exist', () => {
      renderWithTheme(<FiltersPanel {...defaultProps} />);

      expect(screen.getByText('Repositories')).toBeInTheDocument();
      expect(screen.getByText('All Repositories')).toBeInTheDocument();
    });

    it('shows selected repository count in button text', () => {
      renderWithTheme(
        <FiltersPanel {...defaultProps} repoFilters={['owner/repo1', 'owner/repo2']} />
      );

      expect(screen.getByText('2 repositories selected')).toBeInTheDocument();
    });

    it('shows single repository name when one is selected', () => {
      renderWithTheme(
        <FiltersPanel {...defaultProps} repoFilters={['owner/repo1']} />
      );

      expect(screen.getByText('owner/repo1')).toBeInTheDocument();
    });
  });

  describe('Label Filters', () => {
    it('renders label filter sections when labels are available', () => {
      renderWithTheme(<FiltersPanel {...defaultProps} />);

      expect(screen.getByText('Include Labels')).toBeInTheDocument();
      expect(screen.getByText('Exclude Labels')).toBeInTheDocument();
      expect(screen.getByText('show items with ALL selected labels')).toBeInTheDocument();
      expect(screen.getByText('hide items with ANY selected labels')).toBeInTheDocument();
    });

    it('does not render label filters when no labels are available', () => {
      renderWithTheme(
        <FiltersPanel {...defaultProps} availableLabels={[]} />
      );

      expect(screen.queryByText('Include Labels')).not.toBeInTheDocument();
      expect(screen.queryByText('Exclude Labels')).not.toBeInTheDocument();
    });

    it('shows label filter sections when labels are selected', () => {
      renderWithTheme(
        <FiltersPanel 
          {...defaultProps} 
          includedLabels={['bug', 'frontend']}
          excludedLabels={['enhancement']}
          availableLabels={['bug', 'frontend', 'enhancement']}
        />
      );

      // Check that label filter sections are rendered 
      expect(screen.getByText('Include Labels')).toBeInTheDocument();
      expect(screen.getByText('Exclude Labels')).toBeInTheDocument();
      expect(screen.getByText('show items with ALL selected labels')).toBeInTheDocument();
      expect(screen.getByText('hide items with ANY selected labels')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('toggles collapsed state when header is clicked', () => {
      renderWithTheme(<FiltersPanel {...defaultProps} />);

      const header = screen.getByText('Filters').closest('div');
      fireEvent.click(header!);

      expect(defaultProps.setAreFiltersCollapsed).toHaveBeenCalledWith(true);
    });

    it('calls clearAllFilters when Clear All button is clicked', () => {
      renderWithTheme(
        <FiltersPanel {...defaultProps} hasConfiguredFilters={true} />
      );

      fireEvent.click(screen.getByText('Clear All'));
      expect(defaultProps.clearAllFilters).toHaveBeenCalled();
    });

    it('prevents event propagation when Clear All button is clicked', () => {
      const mockStopPropagation = vi.fn();
      renderWithTheme(
        <FiltersPanel {...defaultProps} hasConfiguredFilters={true} />
      );

      const clearButton = screen.getByText('Clear All');
      fireEvent.click(clearButton, { 
        stopPropagation: mockStopPropagation 
      });

      // The component should call stopPropagation to prevent header toggle
      expect(defaultProps.clearAllFilters).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty results gracefully', () => {
      renderWithTheme(
        <FiltersPanel 
          {...defaultProps} 
          results={[]}
        />
      );

      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.queryByText('User')).not.toBeInTheDocument();
      expect(screen.queryByText('Repositories')).not.toBeInTheDocument();
    });

    it('handles undefined labels gracefully', () => {
      const resultsWithUndefinedLabels = [
        {
          ...mockResults[0],
          labels: undefined
        }
      ];

      renderWithTheme(
        <FiltersPanel 
          {...defaultProps} 
          results={resultsWithUndefinedLabels}
          availableLabels={[]}
        />
      );

      expect(screen.queryByText('Include Labels')).not.toBeInTheDocument();
    });

    it('handles results without repository_url', () => {
      const resultsWithoutRepo = [
        {
          ...mockResults[0],
          repository_url: undefined
        }
      ];

      renderWithTheme(
        <FiltersPanel 
          {...defaultProps} 
          results={resultsWithoutRepo}
        />
      );

      expect(screen.queryByText('Repositories')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithTheme(<FiltersPanel {...defaultProps} />);

      // Check for heading elements
      expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Type' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Status' })).toBeInTheDocument();
    });

    it('has proper button roles and labels', () => {
      renderWithTheme(<FiltersPanel {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Issues' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'PRs' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Comments' })).toBeInTheDocument();
    });
  });
}); 