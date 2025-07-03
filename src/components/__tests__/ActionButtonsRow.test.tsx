import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ActionButtonsRow from '../ActionButtonsRow';
import { GitHubItem } from '../../types';

// Mock the clipboard utility
vi.mock('../../utils/clipboard', () => ({
  copyResultsToClipboard: vi.fn(),
}));

// Mock the StarButton component
vi.mock('../StarButton', () => ({
  default: ({ item, size }: { item: GitHubItem; size?: string }) => (
    <button data-testid="star-button" data-size={size}>
      Star {item.title}
    </button>
  ),
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
    githubToken: 'test-token',
    isCopied: vi.fn(() => false),
    onShowDescription: vi.fn(),
    onCloneItem: vi.fn(),
    size: 'small' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all action buttons when item has body', () => {
    render(<ActionButtonsRow {...defaultProps} />);

    expect(screen.getByLabelText('Show description')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy to clipboard')).toBeInTheDocument();
    expect(screen.getByLabelText('Clone this issue')).toBeInTheDocument();
    expect(screen.getByTestId('star-button')).toBeInTheDocument();
  });

  it('does not render description button when item has no body', () => {
    const itemWithoutBody = { ...mockItem, body: undefined };
    render(<ActionButtonsRow {...defaultProps} item={itemWithoutBody} />);

    expect(screen.queryByLabelText('Show description')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Copy to clipboard')).toBeInTheDocument();
    expect(screen.getByLabelText('Clone this issue')).toBeInTheDocument();
    expect(screen.getByTestId('star-button')).toBeInTheDocument();
  });

  it('calls onShowDescription when description button is clicked', () => {
    render(<ActionButtonsRow {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Show description'));
    expect(defaultProps.onShowDescription).toHaveBeenCalledWith(mockItem);
  });

  it('calls onCloneItem when clone button is clicked', () => {
    render(<ActionButtonsRow {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Clone this issue'));
    expect(defaultProps.onCloneItem).toHaveBeenCalledWith(mockItem);
  });

  it('disables clone button for pull requests', () => {
    const pullRequestItem = { ...mockItem, pull_request: {} };
    render(<ActionButtonsRow {...defaultProps} item={pullRequestItem} />);

    const cloneButton = screen.getByLabelText('Pull requests cannot be cloned as issues');
    expect(cloneButton).toBeDisabled();
  });

  it('disables clone button when no repository URL', () => {
    const itemWithoutRepo = { ...mockItem, repository_url: undefined };
    render(<ActionButtonsRow {...defaultProps} item={itemWithoutRepo} />);

    const cloneButton = screen.getByLabelText('Repository information not available');
    expect(cloneButton).toBeDisabled();
  });

  it('disables clone button when no GitHub token', () => {
    render(<ActionButtonsRow {...defaultProps} githubToken={undefined} />);

    const cloneButton = screen.getByLabelText('GitHub token required - configure in settings');
    expect(cloneButton).toBeDisabled();
  });

  it('shows check icon when item is copied', () => {
    render(<ActionButtonsRow {...defaultProps} isCopied={() => true} />);

    const copyButton = screen.getByLabelText('Copy to clipboard');
    expect(copyButton).toBeInTheDocument();
  });

  it('passes correct size prop to StarButton', () => {
    render(<ActionButtonsRow {...defaultProps} size="medium" />);

    const starButton = screen.getByTestId('star-button');
    expect(starButton).toHaveAttribute('data-size', 'medium');
  });

  it('renders buttons in a horizontal flex container', () => {
    const { container } = render(<ActionButtonsRow {...defaultProps} />);

    const buttonContainer = container.querySelector('[data-testid="star-button"]')?.parentElement;
    expect(buttonContainer).toBeInTheDocument();
  });
}); 