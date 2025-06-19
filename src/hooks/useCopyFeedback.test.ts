import { renderHook, act } from '@testing-library/react';
import { useCopyFeedback } from './useCopyFeedback';
import { vi } from 'vitest';

// Mock timers for testing feedback reset
vi.useFakeTimers();

describe('useCopyFeedback', () => {
  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should initialize with no copied items', () => {
    const { result } = renderHook(() => useCopyFeedback());

    expect(result.current.isCopied('test-id')).toBe(false);
  });

  it('should mark item as copied when triggerCopy is called', () => {
    const { result } = renderHook(() => useCopyFeedback());

    act(() => {
      result.current.triggerCopy('test-id');
    });

    expect(result.current.isCopied('test-id')).toBe(true);
  });

  it('should reset copied state after delay', () => {
    const { result } = renderHook(() => useCopyFeedback(1000));

    act(() => {
      result.current.triggerCopy('test-id');
    });

    expect(result.current.isCopied('test-id')).toBe(true);

    // Advance time by the reset delay
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isCopied('test-id')).toBe(false);
  });

  it('should handle multiple items independently', () => {
    const { result } = renderHook(() => useCopyFeedback());

    act(() => {
      result.current.triggerCopy('item-1');
      result.current.triggerCopy('item-2');
    });

    expect(result.current.isCopied('item-1')).toBe(true);
    expect(result.current.isCopied('item-2')).toBe(true);
    expect(result.current.isCopied('item-3')).toBe(false);
  });

  it('should allow manual reset of specific item', () => {
    const { result } = renderHook(() => useCopyFeedback());

    act(() => {
      result.current.triggerCopy('test-id');
    });

    expect(result.current.isCopied('test-id')).toBe(true);

    act(() => {
      result.current.resetCopy('test-id');
    });

    expect(result.current.isCopied('test-id')).toBe(false);
  });

  it('should use default delay of 2000ms', () => {
    const { result } = renderHook(() => useCopyFeedback());

    act(() => {
      result.current.triggerCopy('test-id');
    });

    expect(result.current.isCopied('test-id')).toBe(true);

    // Advance time by less than default delay
    act(() => {
      vi.advanceTimersByTime(1999);
    });

    expect(result.current.isCopied('test-id')).toBe(true);

    // Advance time to complete default delay
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.isCopied('test-id')).toBe(false);
  });
}); 