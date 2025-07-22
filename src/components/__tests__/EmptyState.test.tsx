import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  const mockOnClearSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('No Data Type', () => {
    it('should display "No data available" message', () => {
      render(<EmptyState type="no-data" />);
      expect(screen.getByText('No data available. Enter a username and use the update button to load data.')).toBeInTheDocument();
    });

    it('should display custom message when provided', () => {
      const customMessage = 'Custom no data message';
      render(<EmptyState type="no-data" customMessage={customMessage} />);
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  describe('No Matches Type', () => {
    it('should display "No matches found" with search text', () => {
      render(
        <EmptyState 
          type="no-matches" 
          searchText="test search"
          totalItems={10}
        />
      );
      
      expect(screen.getByText('No matches found')).toBeInTheDocument();
      expect(screen.getByText(/No items found matching "test search"/)).toBeInTheDocument();
    });

    it('should display filter message when no search text but total items', () => {
      render(
        <EmptyState 
          type="no-matches" 
          totalItems={5}
        />
      );
      
      expect(screen.getByText(/Your current filters don't match any of the 5 available items/)).toBeInTheDocument();
    });

    it('should show clear search button when search text and callback provided', () => {
      render(
        <EmptyState 
          type="no-matches" 
          searchText="test"
          totalItems={10}
          showClearSearch={true}
          onClearSearch={mockOnClearSearch}
        />
      );
      
      const clearButton = screen.getByText('Clear Search');
      expect(clearButton).toBeInTheDocument();
      
      fireEvent.click(clearButton);
      expect(mockOnClearSearch).toHaveBeenCalledTimes(1);
    });

    it('should not show clear search button when no search text', () => {
      render(
        <EmptyState 
          type="no-matches" 
          totalItems={10}
          showClearSearch={true}
          onClearSearch={mockOnClearSearch}
        />
      );
      
      expect(screen.queryByText('Clear Search')).not.toBeInTheDocument();
    });
  });

  describe('No Search Results Type', () => {
    it('should display search results message with search text', () => {
      render(
        <EmptyState 
          type="no-search-results" 
          searchText="user:testuser"
        />
      );
      
      expect(screen.getByText(/No data found matching "user:testuser"/)).toBeInTheDocument();
    });

    it('should display time period message when no search text', () => {
      render(<EmptyState type="no-search-results" />);
      
      expect(screen.getByText(/No data found for the selected time period/)).toBeInTheDocument();
    });

    it('should show clear search button when search text and callback provided', () => {
      render(
        <EmptyState 
          type="no-search-results" 
          searchText="test"
          showClearSearch={true}
          onClearSearch={mockOnClearSearch}
        />
      );
      
      const clearButton = screen.getByText('Clear search');
      expect(clearButton).toBeInTheDocument();
      
      fireEvent.click(clearButton);
      expect(mockOnClearSearch).toHaveBeenCalledTimes(1);
    });

    it('should not show clear search button when no search text', () => {
      render(
        <EmptyState 
          type="no-search-results" 
          showClearSearch={true}
          onClearSearch={mockOnClearSearch}
        />
      );
      
      expect(screen.queryByText('Clear search')).not.toBeInTheDocument();
    });
  });

  describe('No Cached Data Type', () => {
    it('should display cached data message', () => {
      render(<EmptyState type="no-cached-data" />);
      
      expect(screen.getByText('No data available. Enter a username and use the update button to load data.')).toBeInTheDocument();
    });
  });

  describe('Children Content', () => {
    it('should render children content', () => {
      render(
        <EmptyState type="no-data">
          <div data-testid="child-content">Additional content</div>
        </EmptyState>
      );
      
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Additional content')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should render with proper structure', () => {
      const { container } = render(<EmptyState type="no-data" />);
      
      const emptyStateBox = container.firstChild as HTMLElement;
      expect(emptyStateBox).toBeInTheDocument();
      expect(emptyStateBox.tagName).toBe('DIV');
    });
  });

  describe('Accessibility', () => {
    it('should have proper button accessibility', () => {
      render(
        <EmptyState 
          type="no-matches" 
          searchText="test"
          totalItems={10}
          showClearSearch={true}
          onClearSearch={mockOnClearSearch}
        />
      );
      
      const clearButton = screen.getByRole('button', { name: 'Clear Search' });
      expect(clearButton).toBeInTheDocument();
    });
  });
}); 