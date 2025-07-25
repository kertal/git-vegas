import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { screen } from '@testing-library/dom';

import { SlotMachineLoader } from './SlotMachineLoader';

describe('SlotMachineLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders with default emojis when no avatars provided', () => {
    render(<SlotMachineLoader isLoading={true} avatarUrls={[]} />);
    const reels = screen.getAllByTestId('reel');
    expect(reels.length).toBeGreaterThan(0);
    expect(reels[0].textContent).toContain('🎰');
  });

  it('renders with provided avatar URLs', () => {
    const avatars = [
      'https://example.com/avatar1.png',
      'https://example.com/avatar2.png',
    ];
    render(<SlotMachineLoader isLoading={true} avatarUrls={avatars} />);
    const images = screen.getAllByRole('presentation');
    expect(images.length).toBeGreaterThan(0);
    expect(images[0]).toHaveAttribute('src', avatars[0]);
  });

  it('starts spinning when loading starts', () => {
    render(<SlotMachineLoader isLoading={true} avatarUrls={[]} />);
    const reels = screen.getAllByTestId('reel');
    reels.forEach((reel: HTMLElement) => {
      expect(reel.style.animation).toMatch(/spin\d+ 1\.5s infinite linear/);
    });
  });

  it('stops spinning when loading ends', async () => {
    const { rerender } = render(
      <SlotMachineLoader isLoading={true} avatarUrls={[]} />
    );
    const reels = screen.getAllByTestId('reel');

    // First verify they're spinning
    reels.forEach((reel: HTMLElement) => {
      expect(reel.style.animation).toMatch(/spin\d+ 1\.5s infinite linear/);
    });

    // Stop loading
    act(() => {
      rerender(<SlotMachineLoader isLoading={false} avatarUrls={[]} />);
    });

    // Wait for all timeouts to complete (3 seconds for the last reel)
    await act(async () => {
      vi.advanceTimersByTime(3100); // Wait a bit longer than 3 seconds
    });

    // Get fresh references to reels after state changes
    const updatedReels = screen.getAllByTestId('reel');
    updatedReels.forEach((reel: HTMLElement) => {
      expect(reel.style.animation).toBe('none');
    });
  });

  it('cleans up timeouts on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const { unmount, rerender } = render(
      <SlotMachineLoader isLoading={true} avatarUrls={[]} />
    );

    // Trigger the timeout creation by stopping loading
    act(() => {
      rerender(<SlotMachineLoader isLoading={false} avatarUrls={[]} />);
    });

    // Then unmount to trigger cleanup
    act(() => {
      unmount();
    });

    // Since we have 3 reels and each has a timeout
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('does not cause infinite re-renders when spinning state changes', () => {
    // Track render count using a ref approach
    let renderCount = 0;
    const WrappedSlotMachine = ({ isLoading, avatarUrls }: { isLoading: boolean; avatarUrls: string[] }) => {
      renderCount++;
      return <SlotMachineLoader isLoading={isLoading} avatarUrls={avatarUrls} />;
    };

    const { rerender } = render(
      <WrappedSlotMachine isLoading={false} avatarUrls={[]} />
    );

    // Reset count after initial render
    renderCount = 0;

    // Start loading - should trigger a reasonable number of renders
    act(() => {
      rerender(<WrappedSlotMachine isLoading={true} avatarUrls={[]} />);
    });

    // Stop loading - should trigger a reasonable number of renders
    act(() => {
      rerender(<WrappedSlotMachine isLoading={false} avatarUrls={[]} />);
    });

    // Advance timers to let any spinning state changes happen
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // The component should not re-render excessively (infinite loop would cause hundreds of renders)
    // We expect a small number of renders (typically 2-4 for these prop changes)
    expect(renderCount).toBeLessThan(10);
    expect(renderCount).toBeGreaterThan(0);

    // Component should still be functional
    const reels = screen.getAllByTestId('reel');
    expect(reels.length).toBe(3);
  });

  it('maintains stable behavior with rapid loading state changes', () => {
    const { rerender } = render(
      <SlotMachineLoader isLoading={false} avatarUrls={[]} />
    );

    // Rapidly toggle loading state - this should not cause infinite loops
    act(() => {
      rerender(<SlotMachineLoader isLoading={true} avatarUrls={[]} />);
      rerender(<SlotMachineLoader isLoading={false} avatarUrls={[]} />);
      rerender(<SlotMachineLoader isLoading={true} avatarUrls={[]} />);
      rerender(<SlotMachineLoader isLoading={false} avatarUrls={[]} />);
    });

    // Component should still be functional
    const reels = screen.getAllByTestId('reel');
    expect(reels.length).toBe(3); // Should have 3 reels
    expect(reels[0]).toBeInTheDocument();
  });
});
