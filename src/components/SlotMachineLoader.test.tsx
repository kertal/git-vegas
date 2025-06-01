import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    const reel = screen.getByTestId('reel');
    expect(reel).toBeInTheDocument();
    expect(reel.textContent).toContain('🎰');
  });

  it('renders with provided avatar URLs', () => {
    const avatars = ['https://example.com/avatar1.png', 'https://example.com/avatar2.png'];
    render(<SlotMachineLoader isLoading={true} avatarUrls={avatars} />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(avatars.length);
    images.forEach((img, i) => {
      expect(img).toHaveAttribute('src', avatars[i]);
    });
  });

  it('starts spinning when loading starts', () => {
    const { rerender } = render(<SlotMachineLoader isLoading={false} avatarUrls={[]} />);
    const reel = screen.getByTestId('reel');
    expect(reel.style.animation).toBe('');

    rerender(<SlotMachineLoader isLoading={true} avatarUrls={[]} />);
    expect(reel.style.animation).toContain('spin');
  });

  it('stops spinning when loading ends', () => {
    const { rerender } = render(<SlotMachineLoader isLoading={true} avatarUrls={[]} />);
    const reel = screen.getByTestId('reel');
    expect(reel.style.animation).toContain('spin');

    rerender(<SlotMachineLoader isLoading={false} avatarUrls={[]} />);
    expect(reel.style.animation).toBe('');
  });

  it('cleans up timeouts on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const { unmount } = render(<SlotMachineLoader isLoading={true} avatarUrls={[]} />);
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
}); 