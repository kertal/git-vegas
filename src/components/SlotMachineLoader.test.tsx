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

    // Trigger loading
    rerender(<SlotMachineLoader avatarUrls={[]} isLoading={true} />);
    
    // Let the effect run
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Verify spinning state is applied
    const reels = container.querySelectorAll('[data-testid="reel"]');
    expect(reels.length).toBe(3);
    
    // Check if all reels have spinning animation
    reels.forEach(reel => {
      const style = (reel as HTMLElement).style;
      expect(style.animation).toMatch(/spin\d 1s infinite linear/);
    });
  });

  it('stops spinning when loading ends', () => {
    const { container, rerender } = render(
      <SlotMachineLoader avatarUrls={[]} isLoading={true} />
    );

    // First render initializes the component
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Stop loading
    rerender(<SlotMachineLoader avatarUrls={[]} isLoading={false} />);

    // Run all pending timers (stop animations)
    act(() => {
      jest.advanceTimersByTime(2000); // Advance past all timeouts
    });

    // Verify spinning has stopped
    const reels = container.querySelectorAll('[data-testid="reel"]');
    reels.forEach(reel => {
      const style = (reel as HTMLElement).style;
      expect(style.animation).toBe('none');
    });
  });

  it('cleans up timeouts on unmount', () => {
    const { container, rerender, unmount } = render(
      <SlotMachineLoader avatarUrls={[]} isLoading={true} />
    );

    // First render initializes the component
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Stop loading to trigger timeouts
    rerender(<SlotMachineLoader avatarUrls={[]} isLoading={false} />);

    // Unmount before timeouts complete
    unmount();

    // Verify all timeouts were cleared
    const pendingTimers = jest.getTimerCount();
    expect(pendingTimers).toBe(0);
  });
}); 