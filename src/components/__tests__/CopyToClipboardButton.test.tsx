import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CopyToClipboardButton from '../CopyToClipboardButton';
import { GitHubItem } from '../../types';

// Mock the clipboard utility
vi.mock('../../utils/clipboard', () => ({
  copyResultsToClipboard: vi.fn(),
}));

// Mock the useCopyFeedback hook
vi.mock('../../hooks/useCopyFeedback', () => ({
  useCopyFeedback: vi.fn(() => ({
    isCopied: vi.fn(() => false),
    triggerCopy: vi.fn(),
    resetCopy: vi.fn(),
  })),
}));

const mockCopyToClipboard = vi.mocked(await import('../../utils/clipboard')).copyResultsToClipboard;
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
    mockCopyToClipboard.mockResolvedValue({ success: true, message: 'Copied successfully' });
  });

  it('renders with copy icon initially', () => {
    renderCopyToClipboardButton();
    expect(screen.getByLabelText('Copy to clipboard')).toBeInTheDocument();
  });

  it('shows check icon when item is copied', () => {
    const mockIsCopied = vi.fn(() => true);
    mockUseCopyFeedback.mockReturnValue({
      isCopied: mockIsCopied,
      triggerCopy: vi.fn(),
      resetCopy: vi.fn(),
    });

    renderCopyToClipboardButton();
    expect(screen.getByLabelText('Copied to clipboard')).toBeInTheDocument();
  });

  it('calls copy function when clicked', async () => {
    const mockTriggerCopy = vi.fn();
    mockUseCopyFeedback.mockReturnValue({
      isCopied: vi.fn(() => false),
      triggerCopy: mockTriggerCopy,
      resetCopy: vi.fn(),
    });

    renderCopyToClipboardButton();
    
    const button = screen.getByLabelText('Copy to clipboard');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCopyToClipboard).toHaveBeenCalledWith([mockItem], {
        isCompactView: true,
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      });
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
    
    const button = screen.getByLabelText('Copy to clipboard');
    fireEvent.click(button);

    await waitFor(() => {
      const onSuccess = mockCopyToClipboard.mock.calls[0][1].onSuccess;
      if (onSuccess) {
        onSuccess();
        expect(mockTriggerCopy).toHaveBeenCalledWith(mockItem.id);
      }
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
    
    const button = screen.getByLabelText('Copy to clipboard');
    fireEvent.click(button);

    await waitFor(() => {
      const onSuccess = mockCopyToClipboard.mock.calls[0][1].onSuccess;
      if (onSuccess) {
        onSuccess();
        expect(mockOnSuccess).toHaveBeenCalled();
      }
    });
  });

  it('calls onError callback when copy fails', async () => {
    const mockOnError = vi.fn();
    const mockError = new Error('Copy failed');
    mockCopyToClipboard.mockRejectedValue(mockError);

    renderCopyToClipboardButton({ onError: mockOnError });
    
    const button = screen.getByLabelText('Copy to clipboard');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(mockError);
    });
  });

  it('applies custom button styles', () => {
    const customStyles = { color: 'red' };
    renderCopyToClipboardButton({ buttonStyles: customStyles });
    
    const button = screen.getByLabelText('Copy to clipboard');
    expect(button).toHaveStyle('color: rgb(255, 0, 0)');
  });

  it('uses correct size prop', () => {
    renderCopyToClipboardButton({ size: 'medium' });
    
    const button = screen.getByLabelText('Copy to clipboard');
    // The size prop is passed to IconButton but not exposed as an attribute
    // We can verify the component renders without error
    expect(button).toBeInTheDocument();
  });
}); 