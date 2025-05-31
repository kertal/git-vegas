import { render, screen, act } from '@testing-library/react';
import { SlotMachineLoader } from './SlotMachineLoader';

describe('SlotMachineLoader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders with default emojis when no avatars provided', () => {
    render(<SlotMachineLoader avatarUrls={[]} isLoading={false} />);
    const textElements = screen.getAllByTestId('text');
    expect(textElements[0]).toHaveTextContent('🎰');
  });

  it('renders with provided avatar URLs', () => {
    render(
      <SlotMachineLoader 
        avatarUrls={['https://example.com/avatar1.jpg']} 
        isLoading={false} 
      />
    );
    const avatars = screen.getAllByTestId('avatar');
    expect(avatars[0]).toHaveAttribute(
      'src',
      'https://example.com/avatar1.jpg'
    );
  });

  it('starts spinning when loading starts', () => {
    const { container, rerender } = render(
      <SlotMachineLoader avatarUrls={[]} isLoading={false} />
    );

    // First render initializes the component
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Mock setInterval and setTimeout
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    const setTimeoutSpy = jest.spyOn(window, 'setTimeout');

    // Trigger loading
    rerender(<SlotMachineLoader avatarUrls={[]} isLoading={true} />);
    
    // Let the effect run
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Verify intervals are set up
    expect(setIntervalSpy).toHaveBeenCalledTimes(3);
    
    // Verify spinning state is applied
    const reels = container.querySelectorAll('[data-testid="reel"]');
    expect(reels.length).toBe(3);
    
    // Check if any of the reels have a spinning animation style
    const spinningElements = Array.from(reels).filter(reel => {
      const style = (reel as HTMLElement).getAttribute('style') || '';
      return style.includes('animation: spin');
    });
    expect(spinningElements.length).toBe(3);
  });

  it('stops spinning when loading ends', () => {
    const { container, rerender } = render(
      <SlotMachineLoader avatarUrls={[]} isLoading={true} />
    );

    // First render initializes the component
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Mock setInterval and setTimeout
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    const setTimeoutSpy = jest.spyOn(window, 'setTimeout');

    // Stop loading
    rerender(<SlotMachineLoader avatarUrls={[]} isLoading={false} />);

    // Run all pending timers (stop animations)
    act(() => {
      jest.advanceTimersByTime(2000); // Advance past all timeouts
    });

    // Verify timeouts were called
    expect(setTimeoutSpy).toHaveBeenCalledTimes(3);

    // Verify spinning has stopped
    const reels = container.querySelectorAll('[data-testid="reel"]');
    const spinningElements = Array.from(reels).filter(reel => {
      const style = (reel as HTMLElement).getAttribute('style') || '';
      return style.includes('animation: spin');
    });
    expect(spinningElements.length).toBe(0);
  });

  it('cleans up intervals and timeouts on unmount', () => {
    // Mock setInterval and setTimeout
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

    const { unmount } = render(
      <SlotMachineLoader avatarUrls={[]} isLoading={true} />
    );

    // First render initializes the component
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Set up intervals
    expect(setIntervalSpy).toHaveBeenCalledTimes(3);

    // Unmount should clean up
    unmount();

    // Verify cleanup
    expect(clearIntervalSpy).toHaveBeenCalledTimes(3);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(0); // No timeouts to clear during unmount while spinning
  });
}); 