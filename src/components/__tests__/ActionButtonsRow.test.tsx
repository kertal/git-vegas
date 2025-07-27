import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ActionButtonsRow from '../ActionButtonsRow';
import { GitHubItem } from '../../types';

// Mock the clipboard utility
vi.mock('../../utils/clipboard', () => ({
  copyResultsToClipboard: vi.fn(),
}));



describe('ActionButtonsRow', () => {
  const mockItem: GitHubItem = {
    id: 1,
    title: 'Test Issue',
    body: 'This is a test issue body',
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
    onShowDescription: vi.fn(),
    size: 'small' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all action buttons when item has body', () => {
    render(<ActionButtonsRow {...defaultProps} />);

    expect(screen.getByLabelText('Show description')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy link to clipboard')).toBeInTheDocument();
  });

  it('does not render description button when item has no body', () => {
    const itemWithoutBody = { ...mockItem, body: undefined };
    render(<ActionButtonsRow {...defaultProps} item={itemWithoutBody} />);

    expect(screen.queryByLabelText('Show description')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Copy link to clipboard')).toBeInTheDocument();
  });

  it('calls onShowDescription when description button is clicked', () => {
    render(<ActionButtonsRow {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Show description'));
    expect(defaultProps.onShowDescription).toHaveBeenCalledWith(mockItem);
  });









  it('renders all buttons correctly', () => {
    render(<ActionButtonsRow {...defaultProps} />);

    // Verify all expected buttons are present
    expect(screen.getByLabelText('Show description')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy link to clipboard')).toBeInTheDocument();
  });
}); 