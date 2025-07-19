import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DescriptionDialog from '../DescriptionDialog';
import { GitHubItem } from '../../types';

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown-content">{children}</div>
  ),
}));

describe('DescriptionDialog', () => {
  const mockItem: GitHubItem = {
    id: 1,
    title: 'Test Issue',
    body: 'This is a test issue body with **markdown**',
    html_url: 'https://github.com/test/repo/issues/1',
    user: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      html_url: 'https://github.com/testuser',
    },
    repository_url: 'https://api.github.com/repos/test/repo',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    state: 'open',
    labels: [],
    event_id: 'event-1',
  };

  const defaultProps = {
    item: mockItem,
    onClose: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    hasPrevious: false,
    hasNext: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders description view by default', () => {
    render(<DescriptionDialog {...defaultProps} />);

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Raw JSON')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
    expect(screen.getByText('This is a test issue body with **markdown**')).toBeInTheDocument();
  });

  it('switches to JSON view when Raw JSON button is clicked', () => {
    render(<DescriptionDialog {...defaultProps} />);

    const jsonButton = screen.getByText('Raw JSON');
    fireEvent.click(jsonButton);

    expect(screen.getByText('Raw JSON Object:')).toBeInTheDocument();
    expect(screen.getByText(JSON.stringify(mockItem, null, 2))).toBeInTheDocument();
  });

  it('switches back to description view when Description button is clicked', () => {
    render(<DescriptionDialog {...defaultProps} />);

    // First switch to JSON view
    const jsonButton = screen.getByText('Raw JSON');
    fireEvent.click(jsonButton);

    // Then switch back to description view
    const descriptionButton = screen.getByText('Description');
    fireEvent.click(descriptionButton);

    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
    expect(screen.getByText('This is a test issue body with **markdown**')).toBeInTheDocument();
  });

  it('resets to description view when item changes', () => {
    const { rerender } = render(<DescriptionDialog {...defaultProps} />);

    // Switch to JSON view
    const jsonButton = screen.getByText('Raw JSON');
    fireEvent.click(jsonButton);

    // Change the item
    const newItem = { ...mockItem, id: 2, title: 'New Issue' };
    rerender(<DescriptionDialog {...defaultProps} item={newItem} />);

    // Should be back to description view
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
  });

  it('shows navigation buttons in footer', () => {
    render(<DescriptionDialog {...defaultProps} hasPrevious={true} hasNext={true} />);

    expect(screen.getByLabelText('Previous item')).toBeInTheDocument();
    expect(screen.getByLabelText('Next item')).toBeInTheDocument();
  });

  it('disables navigation buttons when appropriate', () => {
    render(<DescriptionDialog {...defaultProps} hasPrevious={false} hasNext={false} />);

    const prevButton = screen.getByLabelText('Previous item');
    const nextButton = screen.getByLabelText('Next item');

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it('handles items without body', () => {
    const itemWithoutBody = { ...mockItem, body: undefined };
    render(<DescriptionDialog {...defaultProps} item={itemWithoutBody} />);

    expect(screen.getByText('No description available.')).toBeInTheDocument();
  });

  it('applies correct styling to JSON view', () => {
    render(<DescriptionDialog {...defaultProps} />);

    const jsonButton = screen.getByText('Raw JSON');
    fireEvent.click(jsonButton);

    const jsonContainer = screen.getByText('Raw JSON Object:').parentElement;
    expect(jsonContainer).toHaveStyle({
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap',
    });
  });
}); 