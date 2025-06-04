import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
  selectedItems: new Set<string>(),
  selectAllItems: vi.fn(),
  clearSelection: vi.fn(),
  toggleItemSelection: vi.fn()
});

// Mock countItemsMatchingFilter function
const mockCountItemsMatchingFilter = vi.fn().mockReturnValue(0);

// Mock button styles
const mockButtonStyles = {};

describe('ResultsList Selection Tests', () => {
  it('should render checkboxes for each item', () => {
    render(
      <ResultsList
        useResultsContext={mockUseResultsContext}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />
    );

    // Check if checkboxes are rendered (one for each item)
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(mockItems.length); // No more select all checkbox
  });

  it('should handle individual item selection', () => {
    const mockContext = mockUseResultsContext();
    const toggleItemSelectionSpy = vi.fn();
    mockContext.toggleItemSelection = toggleItemSelectionSpy;

    render(
      <ResultsList
        useResultsContext={() => ({
          ...mockContext,
          selectedItems: new Set(['1']) // Note: using string ID
        })}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />
    );

    // Find the checkbox for the first item
    const checkboxes = screen.getAllByRole('checkbox');
    const firstItemCheckbox = checkboxes[0]; // No more select all checkbox, so first item is at index 0

    // Click the checkbox
    fireEvent.click(firstItemCheckbox);

    // Verify toggleItemSelection was called with the correct ID
    expect(toggleItemSelectionSpy).toHaveBeenCalledWith('1');
  });

  it('should update export button text based on selection', () => {
    render(
      <ResultsList
        useResultsContext={() => ({
          ...mockUseResultsContext(),
          selectedItems: new Set(['1', '2']) // two items selected
        })}
        countItemsMatchingFilter={mockCountItemsMatchingFilter}
        buttonStyles={mockButtonStyles}
      />
    );

    const exportButton = screen.getByText('Export to Clipboard (2 selected)');
    expect(exportButton).toBeDefined();
  });
}); 