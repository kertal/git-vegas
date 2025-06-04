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
  toggleItemSelection: vi.fn()
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