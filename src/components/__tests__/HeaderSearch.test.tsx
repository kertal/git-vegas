import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import HeaderSearch from '../HeaderSearch';

// Mock the debounced search hook
vi.mock('../../hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: vi.fn(),
}));

import { useDebouncedSearch } from '../../hooks/useDebouncedSearch';

const mockUseDebouncedSearch = vi.mocked(useDebouncedSearch);

describe('HeaderSearch', () => {
  const defaultProps = {
    searchText: '',
    onSearchChange: vi.fn(),
    placeholder: 'Search items...',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with placeholder text', () => {
    mockUseDebouncedSearch.mockReturnValue({
      inputValue: '',
      setInputValue: vi.fn(),
      clearSearch: vi.fn(),
    });

    render(
      <ThemeProvider>
        <HeaderSearch {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument();
  });

  it('calls setInputValue when user types', () => {
    const mockSetInputValue = vi.fn();
    mockUseDebouncedSearch.mockReturnValue({
      inputValue: '',
      setInputValue: mockSetInputValue,
      clearSearch: vi.fn(),
    });

    render(
      <ThemeProvider>
        <HeaderSearch {...defaultProps} />
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText('Search items...');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(mockSetInputValue).toHaveBeenCalledWith('test');
  });

  it('calls clearSearch when clear button is clicked', () => {
    const mockClearSearch = vi.fn();
    mockUseDebouncedSearch.mockReturnValue({
      inputValue: 'test',
      setInputValue: vi.fn(),
      clearSearch: mockClearSearch,
    });

    render(
      <ThemeProvider>
        <HeaderSearch {...defaultProps} />
      </ThemeProvider>
    );

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    expect(mockClearSearch).toHaveBeenCalled();
  });

  it('shows clear button when there is input value', () => {
    mockUseDebouncedSearch.mockReturnValue({
      inputValue: 'test',
      setInputValue: vi.fn(),
      clearSearch: vi.fn(),
    });

    render(
      <ThemeProvider>
        <HeaderSearch {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('does not show clear button when input is empty', () => {
    mockUseDebouncedSearch.mockReturnValue({
      inputValue: '',
      setInputValue: vi.fn(),
      clearSearch: vi.fn(),
    });

    render(
      <ThemeProvider>
        <HeaderSearch {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('uses debounced search hook with correct parameters', () => {
    const mockOnSearchChange = vi.fn();
    
    render(
      <ThemeProvider>
        <HeaderSearch 
          searchText="initial"
          onSearchChange={mockOnSearchChange}
          placeholder="Test"
        />
      </ThemeProvider>
    );

    expect(mockUseDebouncedSearch).toHaveBeenCalledWith(
      'initial',
      mockOnSearchChange,
      300
    );
  });
}); 