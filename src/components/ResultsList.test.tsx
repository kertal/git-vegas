import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '@primer/react';
import ResultsList from './ResultsList';
import { GitHubItem } from '../types';

// Mock data
const mockItems: GitHubItem[] = [
  {
    id: 1,
    title: 'Test Issue 1',
    state: 'open',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    html_url: 'https://github.com/test/repo/issues/1',
    user: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      html_url: 'https://github.com/testuser'
    },
    repository_url: 'https://api.github.com/repos/test/repo',
    labels: []
  },
  {
    id: 2,
    title: 'Test Issue 2',
    state: 'open',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    html_url: 'https://github.com/test/repo/issues/2',
    user: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      html_url: 'https://github.com/testuser'
    },
    repository_url: 'https://api.github.com/repos/test/repo',
    labels: []
  }
];

// Mock context hook
const mockUseResultsContext = () => ({
  results: mockItems,
  filteredResults: mockItems,
  filter: 'all' as const,
  statusFilter: 'all' as const,
  sortOrder: 'updated' as const,
  labelFilter: '',
  excludedLabels: [],
  searchText: '',
  repoFilters: [],
  availableLabels: [],
  setFilter: vi.fn(),
  setStatusFilter: vi.fn(),
  setSortOrder: vi.fn(),
  setLabelFilter: vi.fn(),
  setExcludedLabels: vi.fn(),
  toggleDescriptionVisibility: vi.fn(),
  toggleExpand: vi.fn(),
  copyResultsToClipboard: vi.fn(),
  descriptionVisible: {},
  expanded: {},
  clipboardMessage: null,
  clearAllFilters: vi.fn(),
  isCompactView: false,
  setIsCompactView: vi.fn(),
  selectedItems: new Set<number>(),
  selectAllItems: vi.fn(),
  clearSelection: vi.fn(),
  toggleItemSelection: vi.fn(),
  setRepoFilters: vi.fn()
});

// Mock countItemsMatchingFilter function
const mockCountItemsMatchingFilter = vi.fn().mockReturnValue(0);

// Mock button styles
const mockButtonStyles = {};

// Wrapper component for tests
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    {children}
  </ThemeProvider>
);

describe('ResultsList Selection Tests', () => {
  it('should render checkboxes for each item', () => {
    render(
      <ResultsList
        useResultsContext={mockUseResultsContext}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Check if checkboxes are rendered (one for each item)
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(mockItems.length);
  });

  it('should handle individual item selection', () => {
    const mockContext = mockUseResultsContext();
    const toggleItemSelectionSpy = vi.fn();
    mockContext.toggleItemSelection = toggleItemSelectionSpy;

    render(
      <ResultsList
        useResultsContext={() => ({
          ...mockContext,
          selectedItems: new Set([1]) // Using number ID
        })}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Find the checkbox for the first item
    const checkboxes = screen.getAllByRole('checkbox');
    const firstItemCheckbox = checkboxes[0];

    // Click the checkbox
    fireEvent.click(firstItemCheckbox);

    // Verify toggleItemSelection was called with the correct ID
    expect(toggleItemSelectionSpy).toHaveBeenCalledWith(1);
  });

  it('should show export format options and handle selection', async () => {
    const mockContext = mockUseResultsContext();
    const copyToClipboardSpy = vi.fn();
    mockContext.copyResultsToClipboard = copyToClipboardSpy;

    render(
      <ResultsList
        useResultsContext={() => ({
          ...mockContext,
          selectedItems: new Set([1, 2])
        })}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Find and click the export button
    const exportButton = screen.getByRole('button', { name: /Export to Clipboard/ });
    fireEvent.click(exportButton);

    // Test detailed format
    const detailedOption = screen.getByRole('menuitem', { name: 'Detailed Format' });
    fireEvent.click(detailedOption);
    expect(copyToClipboardSpy).toHaveBeenCalledWith('detailed');

    // Click export button again to show menu
    fireEvent.click(exportButton);

    // Test compact format
    const compactOption = screen.getByRole('menuitem', { name: 'Compact Format' });
    fireEvent.click(compactOption);
    expect(copyToClipboardSpy).toHaveBeenCalledWith('compact');

    // Verify total number of calls
    expect(copyToClipboardSpy).toHaveBeenCalledTimes(2);
  });

  it('should show correct export button text based on selection', () => {
    render(
      <ResultsList
        useResultsContext={() => ({
          ...mockUseResultsContext(),
          selectedItems: new Set([1, 2])
        })}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    const exportButton = screen.getByText('Export to Clipboard (2 selected)');
    expect(exportButton).toBeDefined();
  });

  it('should copy only selected items when selection exists', () => {
    const mockContext = mockUseResultsContext();
    const copyToClipboardSpy = vi.fn();
    mockContext.copyResultsToClipboard = copyToClipboardSpy;

    // Render with only first item selected
    render(
      <ResultsList
        useResultsContext={() => ({
          ...mockContext,
          selectedItems: new Set([1])
        })}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Find and click the export button
    const exportButton = screen.getByRole('button', { name: /Export to Clipboard \(1 selected\)/ });
    fireEvent.click(exportButton);

    // Click detailed format
    const detailedOption = screen.getByRole('menuitem', { name: 'Detailed Format' });
    fireEvent.click(detailedOption);

    // Verify the correct format was requested
    expect(copyToClipboardSpy).toHaveBeenCalledWith('detailed');
  });

  it('should only count and export visible selected items', () => {
    const mockContext = mockUseResultsContext();
    const copyToClipboardSpy = vi.fn();
    mockContext.copyResultsToClipboard = copyToClipboardSpy;

    // Create a filtered list where only one selected item is visible
    const allItems = [...mockItems];
    const filteredItems = [mockItems[0]]; // Only first item is visible
    
    render(
      <ResultsList
        useResultsContext={() => ({
          ...mockContext,
          results: allItems,
          filteredResults: filteredItems,
          selectedItems: new Set([1, 2]) // Both items selected, but only one visible
        })}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Should show only one selected item in the button text
    const exportButton = screen.getByText('Export to Clipboard (1 selected)');
    expect(exportButton).toBeDefined();

    // Click export and choose format
    fireEvent.click(exportButton);
    const detailedOption = screen.getByRole('menuitem', { name: 'Detailed Format' });
    fireEvent.click(detailedOption);

    // Verify the clipboard function was called
    expect(copyToClipboardSpy).toHaveBeenCalledWith('detailed');
  });

  it('should show "all" when no items are selected', () => {
    render(
      <ResultsList
        useResultsContext={() => ({
          ...mockUseResultsContext(),
          selectedItems: new Set() // No items selected
        })}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    const exportButton = screen.getByText('Export to Clipboard (all)');
    expect(exportButton).toBeDefined();
  });

  it('should show "all" when selected items are filtered out', () => {
    const mockContext = mockUseResultsContext();
    const copyToClipboardSpy = vi.fn();
    mockContext.copyResultsToClipboard = copyToClipboardSpy;

    // Create a scenario where selected items are not in filtered results
    const allItems = [...mockItems];
    const filteredItems = [mockItems[0]]; // Only first item is visible
    
    render(
      <ResultsList
        useResultsContext={() => ({
          ...mockContext,
          results: allItems,
          filteredResults: filteredItems,
          selectedItems: new Set([2]) // Selected item is not in filtered results
        })}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Should show "all" since no selected items are visible
    const exportButton = screen.getByText('Export to Clipboard (all)');
    expect(exportButton).toBeDefined();

    // Click export and choose format
    fireEvent.click(exportButton);
    const detailedOption = screen.getByRole('menuitem', { name: 'Detailed Format' });
    fireEvent.click(detailedOption);

    // Verify the clipboard function was called
    expect(copyToClipboardSpy).toHaveBeenCalledWith('detailed');
  });

  it('should show selected count when some selected items are visible', () => {
    render(
      <ResultsList
        useResultsContext={() => ({
          ...mockUseResultsContext(),
          filteredResults: mockItems,
          selectedItems: new Set([1]) // One item selected and visible
        })}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    const exportButton = screen.getByText('Export to Clipboard (1 selected)');
    expect(exportButton).toBeDefined();
  });

  it('should export all visible items when none are selected', () => {
    const mockContext = mockUseResultsContext();
    const copyToClipboardSpy = vi.fn();
    mockContext.copyResultsToClipboard = copyToClipboardSpy;

    // Create a filtered list with only some items visible
    const allItems = [...mockItems];
    const filteredItems = [mockItems[0]]; // Only first item is visible after filtering
    
    render(
      <ResultsList
        useResultsContext={() => ({
          ...mockContext,
          results: allItems,
          filteredResults: filteredItems,
          selectedItems: new Set() // No items selected
        })}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Should show "all" in the button text
    const exportButton = screen.getByText('Export to Clipboard (all)');
    expect(exportButton).toBeDefined();

    // Click export and choose format
    fireEvent.click(exportButton);
    const detailedOption = screen.getByRole('menuitem', { name: 'Detailed Format' });
    fireEvent.click(detailedOption);

    // Verify the clipboard function was called
    expect(copyToClipboardSpy).toHaveBeenCalledWith('detailed');

    // The actual export in App.tsx will use filteredItems, which contains only the visible items
  });
});

describe('ResultsList Filter Collapse Tests', () => {
  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });

  it('should persist filter collapse state in localStorage', () => {
    // Initially no stored value
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    render(
      <ResultsList
        useResultsContext={mockUseResultsContext}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Find and click the hide/show button
    const toggleButton = screen.getByText('Hide');
    fireEvent.click(toggleButton);

    // Verify localStorage was called with the correct key and value
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'github-filters-collapsed',
      'true'
    );
  });

  it('should restore filter collapse state from localStorage', () => {
    // Set initial stored value to collapsed
    (window.localStorage.getItem as jest.Mock).mockReturnValue('true');

    render(
      <ResultsList
        useResultsContext={mockUseResultsContext}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Should show "Show" button since filters are collapsed
    expect(screen.getByText('Show')).toBeDefined();
  });
});

describe('ResultsList Repository Filter Tests', () => {
  const mockItemsWithDifferentRepos = [
    {
      ...mockItems[0],
      repository_url: 'https://api.github.com/repos/test/repo1'
    },
    {
      ...mockItems[1],
      repository_url: 'https://api.github.com/repos/test/repo2'
    }
  ];

  it('should render repository filter section', () => {
    render(
      <ResultsList
        useResultsContext={() => ({
          ...mockUseResultsContext(),
          results: mockItemsWithDifferentRepos,
          filteredResults: mockItemsWithDifferentRepos
        })}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('Repositories')).toBeInTheDocument();
    expect(screen.getByText('test/repo1')).toBeInTheDocument();
    expect(screen.getByText('test/repo2')).toBeInTheDocument();
  });

  it('should handle repository selection', () => {
    const setRepoFiltersSpy = vi.fn();
    const mockContext = {
      ...mockUseResultsContext(),
      results: mockItemsWithDifferentRepos,
      filteredResults: mockItemsWithDifferentRepos,
      repoFilters: [],
      setRepoFilters: setRepoFiltersSpy
    };

    render(
      <ResultsList
        useResultsContext={() => mockContext}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Click the first repo filter button
    const repoButton = screen.getByText('test/repo1');
    fireEvent.click(repoButton);

    // Verify setRepoFilters was called with the correct repo
    expect(setRepoFiltersSpy).toHaveBeenCalledWith(['test/repo1']);
  });

  it('should handle repository deselection', () => {
    const setRepoFiltersSpy = vi.fn();
    const mockContext = {
      ...mockUseResultsContext(),
      results: mockItemsWithDifferentRepos,
      filteredResults: mockItemsWithDifferentRepos,
      repoFilters: ['test/repo1'],
      setRepoFilters: setRepoFiltersSpy
    };

    render(
      <ResultsList
        useResultsContext={() => mockContext}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Click the selected repo filter button
    const repoButton = screen.getByText('test/repo1');
    fireEvent.click(repoButton);

    // Verify setRepoFilters was called to remove the repo
    expect(setRepoFiltersSpy).toHaveBeenCalledWith(expect.arrayContaining([]));
  });

  it('should show correct counts for repositories', () => {
    const mockContext = {
      ...mockUseResultsContext(),
      results: mockItemsWithDifferentRepos,
      filteredResults: [mockItemsWithDifferentRepos[0]], // Only first item in filtered results
      repoFilters: []
    };

    render(
      <ResultsList
        useResultsContext={() => mockContext}
        countItemsMatchingFilter={vi.fn().mockImplementation((items) => items.length)}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    // Should show "1 / 1" for repo1 and "0 / 1" for repo2
    expect(screen.getByText('test/repo1 (1)')).toBeInTheDocument();
    expect(screen.getByText('test/repo2 (0 / 1)')).toBeInTheDocument();
  });

  it('should disable repository buttons with no potential matches', () => {
    const mockContext = {
      ...mockUseResultsContext(),
      results: mockItemsWithDifferentRepos,
      filteredResults: [], // No matches in filtered results
      repoFilters: []
    };

    render(
      <ResultsList
        useResultsContext={() => mockContext}
        countItemsMatchingFilter={vi.fn().mockReturnValue(0)}
        buttonStyles={mockButtonStyles}
      />,
      { wrapper: TestWrapper }
    );

    const repoButtons = screen.getAllByRole('button', { name: /test\/repo\d/i });
    repoButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });
});

describe('ResultsList', () => {
  describe('Repository Filter', () => {
    it('should render repository filter buttons', () => {
      const useResultsContext = () => ({
        ...mockUseResultsContext(),
        repoFilters: []
      });

      render(
        <ResultsList
          useResultsContext={useResultsContext}
          countItemsMatchingFilter={mockCountItemsMatchingFilter}
          buttonStyles={{}}
        />
      );

      // Check if repo filter buttons are rendered
      expect(screen.getByText(/user\/repo1/)).toBeInTheDocument();
      expect(screen.getByText(/user\/repo2/)).toBeInTheDocument();
    });

    it('should handle repository filter selection', () => {
      const setRepoFilters = vi.fn();
      const useResultsContext = () => ({
        ...mockUseResultsContext(),
        repoFilters: [],
        setRepoFilters
      });

      render(
        <ResultsList
          useResultsContext={useResultsContext}
          countItemsMatchingFilter={mockCountItemsMatchingFilter}
          buttonStyles={{}}
        />
      );

      // Click repo1 filter button
      fireEvent.click(screen.getByText(/user\/repo1/));
      expect(setRepoFilters).toHaveBeenCalledWith(expect.any(Function));

      // Simulate the state update
      const updateFunction = setRepoFilters.mock.calls[0][0];
      const newState = updateFunction([]);
      expect(newState).toEqual(['user/repo1']);
    });

    it('should handle repository filter deselection', () => {
      const setRepoFilters = vi.fn();
      const useResultsContext = () => ({
        ...mockUseResultsContext(),
        repoFilters: ['user/repo1'],
        setRepoFilters
      });

      render(
        <ResultsList
          useResultsContext={useResultsContext}
          countItemsMatchingFilter={mockCountItemsMatchingFilter}
          buttonStyles={{}}
        />
      );

      // Click repo1 filter button again to deselect
      fireEvent.click(screen.getByText(/user\/repo1/));
      expect(setRepoFilters).toHaveBeenCalledWith(expect.any(Function));

      // Simulate the state update
      const updateFunction = setRepoFilters.mock.calls[0][0];
      const newState = updateFunction(['user/repo1']);
      expect(newState).toEqual([]);
    });

    it('should handle multiple repository filter selection', () => {
      const setRepoFilters = vi.fn();
      const useResultsContext = () => ({
        ...mockUseResultsContext(),
        repoFilters: ['user/repo1'],
        setRepoFilters
      });

      render(
        <ResultsList
          useResultsContext={useResultsContext}
          countItemsMatchingFilter={mockCountItemsMatchingFilter}
          buttonStyles={{}}
        />
      );

      // Click repo2 filter button to add another repo
      fireEvent.click(screen.getByText(/user\/repo2/));
      expect(setRepoFilters).toHaveBeenCalledWith(expect.any(Function));

      // Simulate the state update
      const updateFunction = setRepoFilters.mock.calls[0][0];
      const newState = updateFunction(['user/repo1']);
      expect(newState).toEqual(['user/repo1', 'user/repo2']);
    });

    it('should show correct counts for repository filters', () => {
      const useResultsContext = () => ({
        ...mockUseResultsContext(),
        repoFilters: []
      });

      mockCountItemsMatchingFilter
        .mockImplementation((items, type, value) => {
          if (value === 'user/repo1') return 1;
          if (value === 'user/repo2') return 2;
          return 0;
        });

      render(
        <ResultsList
          useResultsContext={useResultsContext}
          countItemsMatchingFilter={mockCountItemsMatchingFilter}
          buttonStyles={{}}
        />
      );

      expect(screen.getByText(/user\/repo1 \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/user\/repo2 \(2\)/)).toBeInTheDocument();
    });
  });
}); 