import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import BulkCopyButtons from '../BulkCopyButtons';

const defaultProps = {
  selectedItems: new Set<string>(),
  totalItems: 5,
  isCopied: vi.fn(() => false),
  onCopy: vi.fn(),
  showOnlyWhenSelected: false,
};

const renderBulkCopyButtons = (props = {}) => {
  return render(<BulkCopyButtons {...defaultProps} {...props} />);
};

describe('BulkCopyButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both copy buttons', () => {
    renderBulkCopyButtons();
    
    expect(screen.getByText('Copy content (5)')).toBeInTheDocument();
    expect(screen.getByText('Copy link (5)')).toBeInTheDocument();
  });

  it('shows selected count when items are selected', () => {
    renderBulkCopyButtons({
      selectedItems: new Set(['1', '2', '3']),
    });
    
    expect(screen.getByText('Copy content (3)')).toBeInTheDocument();
    expect(screen.getByText('Copy link (3)')).toBeInTheDocument();
  });

  it('calls onCopy when content button is clicked', () => {
    const onCopy = vi.fn();
    renderBulkCopyButtons({ onCopy });
    
    fireEvent.click(screen.getByText('Copy content (5)'));
    
    expect(onCopy).toHaveBeenCalledWith('detailed');
  });

  it('calls onCopy when link button is clicked', () => {
    const onCopy = vi.fn();
    renderBulkCopyButtons({ onCopy });
    
    fireEvent.click(screen.getByText('Copy link (5)'));
    
    expect(onCopy).toHaveBeenCalledWith('compact');
  });

  it('shows check icon when content is copied', () => {
    renderBulkCopyButtons({
      isCopied: vi.fn((id) => id === 'detailed'),
    });
    
    const contentButton = screen.getByText('Copy content (5)');
    expect(contentButton).toBeInTheDocument();
    // Check that the button contains a check icon (this would be visible in the DOM)
    expect(contentButton.closest('button')).toHaveAttribute('aria-label', 'Copied to clipboard');
  });

  it('shows check icon when link is copied', () => {
    renderBulkCopyButtons({
      isCopied: vi.fn((id) => id === 'compact'),
    });
    
    const linkButton = screen.getByText('Copy link (5)');
    expect(linkButton).toBeInTheDocument();
    // Check that the button contains a check icon
    expect(linkButton.closest('button')).toHaveAttribute('aria-label', 'Copied to clipboard');
  });

  it('does not render when showOnlyWhenSelected is true and no items are selected', () => {
    renderBulkCopyButtons({
      showOnlyWhenSelected: true,
      selectedItems: new Set(),
    });
    
    expect(screen.queryByText('Copy content')).not.toBeInTheDocument();
    expect(screen.queryByText('Copy link')).not.toBeInTheDocument();
  });

  it('renders when showOnlyWhenSelected is true and items are selected', () => {
    renderBulkCopyButtons({
      showOnlyWhenSelected: true,
      selectedItems: new Set(['1', '2']),
    });
    
    expect(screen.getByText('Copy content (2)')).toBeInTheDocument();
    expect(screen.getByText('Copy link (2)')).toBeInTheDocument();
  });

  it('applies custom button styles', () => {
    const buttonStyles = { color: 'red' };
    renderBulkCopyButtons({ buttonStyles });
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveStyle('color: rgb(255, 0, 0)');
    });
  });
}); 