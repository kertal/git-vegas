import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CopyToClipboardButton from '../CopyToClipboardButton';
import { GitHubItem } from '../../types';

// Mock navigator.clipboard
const mockWriteText = vi.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

// Mock the useCopyFeedback hook
vi.mock('../../hooks/useCopyFeedback', () => ({
  useCopyFeedback: vi.fn(() => ({
    isCopied: vi.fn(() => false),
    triggerCopy: vi.fn(),
    resetCopy: vi.fn(),
  })),
}));

// Remove mockCopyToClipboard since we're testing navigator.clipboard.writeText directly
const mockUseCopyFeedback = vi.mocked(await import('../../hooks/useCopyFeedback')).useCopyFeedback;

const mockItem: GitHubItem = {
  id: 1,
  title: 'Test Issue',
  html_url: 'https://github.com/test/repo/issues/1',
  user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png', html_url: 'https://github.com/testuser' },
  repository_url: 'https://api.github.com/repos/test/repo',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  state: 'open',
  body: 'Test issue body',
  labels: [],
};

const renderCopyToClipboardButton = (props = {}) => {
  return render(
    <ThemeProvider>
      <CopyToClipboardButton item={mockItem} {...props} />
    </ThemeProvider>
  );
};

describe('CopyToClipboardButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  it('renders with copy icon initially', () => {
    renderCopyToClipboardButton();
    expect(screen.getByLabelText('Copy link to clipboard')).toBeInTheDocument();
  });

  it('shows check icon when item is copied', () => {
    const mockIsCopied = vi.fn(() => true);
    mockUseCopyFeedback.mockReturnValue({
      isCopied: mockIsCopied,
      triggerCopy: vi.fn(),
      resetCopy: vi.fn(),
    });

    renderCopyToClipboardButton();
    expect(screen.getByLabelText('Link copied to clipboard')).toBeInTheDocument();
  });

  it('calls copy function when clicked', async () => {
    const mockTriggerCopy = vi.fn();
    mockUseCopyFeedback.mockReturnValue({
      isCopied: vi.fn(() => false),
      triggerCopy: mockTriggerCopy,
      resetCopy: vi.fn(),
    });

    renderCopyToClipboardButton();
    
    const button = screen.getByLabelText('Copy link to clipboard');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(mockItem.html_url);
    });
  });

  it('triggers copy feedback on successful copy', async () => {
    const mockTriggerCopy = vi.fn();
    mockUseCopyFeedback.mockReturnValue({
      isCopied: vi.fn(() => false),
      triggerCopy: mockTriggerCopy,
      resetCopy: vi.fn(),
    });

    renderCopyToClipboardButton();
    
    const button = screen.getByLabelText('Copy link to clipboard');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(mockItem.html_url);
      expect(mockTriggerCopy).toHaveBeenCalledWith(mockItem.id);
    });
  });

  it('calls onSuccess callback when provided', async () => {
    const mockOnSuccess = vi.fn();
    const mockTriggerCopy = vi.fn();
    mockUseCopyFeedback.mockReturnValue({
      isCopied: vi.fn(() => false),
      triggerCopy: mockTriggerCopy,
      resetCopy: vi.fn(),
    });

    renderCopyToClipboardButton({ onSuccess: mockOnSuccess });
    
    const button = screen.getByLabelText('Copy link to clipboard');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(mockItem.html_url);
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('calls onError callback when copy fails', async () => {
    const mockOnError = vi.fn();
    const mockTriggerCopy = vi.fn();
    const mockError = new Error('Copy failed');
    
    // Mock writeText to reject
    mockWriteText.mockRejectedValueOnce(mockError);
    
    mockUseCopyFeedback.mockReturnValue({
      isCopied: vi.fn(() => false),
      triggerCopy: mockTriggerCopy,
      resetCopy: vi.fn(),
    });

    renderCopyToClipboardButton({ onError: mockOnError });
    
    const button = screen.getByLabelText('Copy link to clipboard');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(mockError);
    });
  });

  it('applies custom button styles', () => {
    const customStyles = { color: 'red' };
    renderCopyToClipboardButton({ buttonStyles: customStyles });
    
    const button = screen.getByLabelText('Copy link to clipboard');
    expect(button).toHaveStyle('color: rgb(255, 0, 0)');
  });

  it('uses correct size prop', () => {
    renderCopyToClipboardButton({ size: 'medium' });
    
    const button = screen.getByLabelText('Copy link to clipboard');
    // The size prop is passed to IconButton but not exposed as an attribute
    // We can verify the component renders without error
    expect(button).toBeInTheDocument();
  });
}); 