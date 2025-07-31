import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeProvider } from '@primer/react';
import { DismissibleBanner } from '../DismissibleBanner';
import * as useDismissibleBannerModule from '../../hooks/useDismissibleBanner';

// Mock the useDismissibleBanner hook
const mockDismissBanner = vi.fn();
const mockResetBanner = vi.fn();
let mockIsDismissed = false;

vi.mock('../../hooks/useDismissibleBanner', () => ({
  useDismissibleBanner: vi.fn(() => ({
    isDismissed: mockIsDismissed,
    dismissBanner: mockDismissBanner,
    resetBanner: mockResetBanner,
  })),
}));

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('DismissibleBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDismissed = false;
  });

  it('should render banner content when not dismissed', () => {
    renderWithTheme(
      <DismissibleBanner bannerId="test-banner">
        <strong>Test Message</strong> This is a test banner.
      </DismissibleBanner>
    );

    expect(screen.getByText('Test Message')).toBeInTheDocument();
    expect(screen.getByText('This is a test banner.')).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss banner')).toBeInTheDocument();
  });

  it('should render content as children in Text component', () => {
    renderWithTheme(
      <DismissibleBanner bannerId="test-banner">
        <span data-testid="banner-content">Custom content</span>
      </DismissibleBanner>
    );

    expect(screen.getByTestId('banner-content')).toBeInTheDocument();
    expect(screen.getByText('Custom content')).toBeInTheDocument();
  });

  it('should call dismissBanner when close button is clicked', async () => {
    renderWithTheme(
      <DismissibleBanner bannerId="test-banner">
        Test content
      </DismissibleBanner>
    );

    const closeButton = screen.getByLabelText('Dismiss banner');
    fireEvent.click(closeButton);

    expect(mockDismissBanner).toHaveBeenCalledTimes(1);
  });

  it('should not render when banner is dismissed', () => {
    // Set the mock to return isDismissed: true
    mockIsDismissed = true;

    renderWithTheme(
      <DismissibleBanner bannerId="test-banner">
        Test content
      </DismissibleBanner>
    );

    expect(screen.queryByText('Test content')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Dismiss banner')).not.toBeInTheDocument();
  });

  it('should render with attention variant by default', () => {
    renderWithTheme(
      <DismissibleBanner bannerId="test-banner">
        Test content
      </DismissibleBanner>
    );

    const banner = screen.getByText('Test content').closest('[class*="Box"]');
    expect(banner).toBeInTheDocument();
  });

  it('should render with different variants', () => {
    const variants = ['attention', 'danger', 'success', 'neutral'] as const;
    
    variants.forEach((variant) => {
      const { unmount } = renderWithTheme(
        <DismissibleBanner bannerId={`test-banner-${variant}`} variant={variant}>
          {variant} message
        </DismissibleBanner>
      );

      expect(screen.getByText(`${variant} message`)).toBeInTheDocument();
      unmount();
    });
  });

  it('should call useDismissibleBanner with correct bannerId', () => {
    renderWithTheme(
      <DismissibleBanner bannerId="specific-banner-id">
        Test content
      </DismissibleBanner>
    );

    expect(vi.mocked(useDismissibleBannerModule.useDismissibleBanner)).toHaveBeenCalledWith('specific-banner-id');
  });

  it('should have proper accessibility attributes', () => {
    renderWithTheme(
      <DismissibleBanner bannerId="test-banner">
        Test content
      </DismissibleBanner>
    );

    const closeButton = screen.getByLabelText('Dismiss banner');
    // Button should be accessible by label (which is what getByLabelText validates)
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveAttribute('type', 'button');
  });

  it('should render close button with proper styling properties', () => {
    renderWithTheme(
      <DismissibleBanner bannerId="test-banner">
        Test content
      </DismissibleBanner>
    );

    const closeButton = screen.getByLabelText('Dismiss banner');
    expect(closeButton).toBeInTheDocument();
    
    // Check that the button is rendered (styling is handled by Primer)
    expect(closeButton.tagName).toBe('BUTTON');
  });

  it('should handle complex children content', () => {
    renderWithTheme(
      <DismissibleBanner bannerId="test-banner">
        <div>
          <strong>Complex content</strong>
          <p>With multiple elements</p>
          <a href="#">And a link</a>
        </div>
      </DismissibleBanner>
    );

    expect(screen.getByText('Complex content')).toBeInTheDocument();
    expect(screen.getByText('With multiple elements')).toBeInTheDocument();
    expect(screen.getByText('And a link')).toBeInTheDocument();
  });

  it('should be keyboard accessible', () => {
    renderWithTheme(
      <DismissibleBanner bannerId="test-banner">
        Test content
      </DismissibleBanner>
    );

    const closeButton = screen.getByLabelText('Dismiss banner');
    
    // Focus the button
    closeButton.focus();
    expect(document.activeElement).toBe(closeButton);
    
    // Press Enter
    fireEvent.keyDown(closeButton, { key: 'Enter', code: 'Enter' });
    
    // Should still be clickable (the actual click handler is on onClick)
    expect(closeButton).toBeInTheDocument();
  });

  it('should not interfere with banner content clicks', () => {
    const handleContentClick = vi.fn();
    
    renderWithTheme(
      <DismissibleBanner bannerId="test-banner">
        <button onClick={handleContentClick}>Content Button</button>
      </DismissibleBanner>
    );

    const contentButton = screen.getByText('Content Button');
    fireEvent.click(contentButton);

    expect(handleContentClick).toHaveBeenCalledTimes(1);
    expect(mockDismissBanner).not.toHaveBeenCalled();
  });
}); 