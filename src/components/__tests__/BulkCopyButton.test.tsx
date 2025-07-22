import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import BulkCopyButton from '../BulkCopyButton';

// Mock the copy feedback hook
const mockIsCopied = vi.fn();
const mockOnCopy = vi.fn();

const defaultProps = {
  selectedItems: new Set<string | number>(),
  totalItems: 10,
  isCopied: mockIsCopied,
  onCopy: mockOnCopy,
};

const renderBulkCopyButton = (props = {}) => {
  return render(
    <ThemeProvider>
      <BulkCopyButton {...defaultProps} {...props} />
    </ThemeProvider>
  );
};

describe('BulkCopyButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with total items count when no items are selected', () => {
    renderBulkCopyButton();
    
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with selected items count when items are selected', () => {
    renderBulkCopyButton({
      selectedItems: new Set(['1', '2', '3']),
    });
    
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows copy icon when not copied', () => {
    mockIsCopied.mockReturnValue(false);
    renderBulkCopyButton();
    
    // The copy icon should be present (we can't easily test the specific icon)
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows check icon when copied', () => {
    mockIsCopied.mockReturnValue(true);
    renderBulkCopyButton();
    
    // The check icon should be present (we can't easily test the specific icon)
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onCopy with detailed format when detailed option is selected', () => {
    renderBulkCopyButton();
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    const detailedOption = screen.getByText('Detailed Format');
    fireEvent.click(detailedOption);
    
    expect(mockOnCopy).toHaveBeenCalledWith('detailed');
  });

  it('calls onCopy with compact format when compact option is selected', () => {
    renderBulkCopyButton();
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    const compactOption = screen.getByText('Compact Format');
    fireEvent.click(compactOption);
    
    expect(mockOnCopy).toHaveBeenCalledWith('compact');
  });

  it('does not render when showOnlyWhenSelected is true and no items are selected', () => {
    renderBulkCopyButton({
      showOnlyWhenSelected: true,
      selectedItems: new Set(),
    });
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders when showOnlyWhenSelected is true and items are selected', () => {
    renderBulkCopyButton({
      showOnlyWhenSelected: true,
      selectedItems: new Set(['1', '2']),
    });
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('applies custom button styles', () => {
    const customStyles = { backgroundColor: 'red' };
    renderBulkCopyButton({
      buttonStyles: customStyles,
    });
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
}); 