import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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
    const avatars = ['https://example.com/avatar1.png', 'https://example.com/avatar2.png'];
    render(<SlotMachineLoader isLoading={true} avatarUrls={avatars} />);
    const images = screen.getAllByRole('presentation');
    expect(images.length).toBeGreaterThan(0);
    expect(images[0]).toHaveAttribute('src', avatars[0]);
  });

  it('starts spinning when loading starts', () => {
    render(<SlotMachineLoader isLoading={true} avatarUrls={[]} />);
    const reels = screen.getAllByTestId('reel');
    reels.forEach(reel => {
      expect(reel.style.animation).toMatch(/spin\d+ 1\.5s infinite linear/);
    });
  });

  it('stops spinning when loading ends', async () => {
    const { rerender } = render(<SlotMachineLoader isLoading={true} avatarUrls={[]} />);
    const reels = screen.getAllByTestId('reel');
    
    // First verify they're spinning
    reels.forEach(reel => {
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
    updatedReels.forEach(reel => {
      expect(reel.style.animation).toBe('none');
    });
  });

  it('cleans up timeouts on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const { unmount, rerender } = render(<SlotMachineLoader isLoading={true} avatarUrls={[]} />);
    
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
}); 