import { renderHook, act } from '@testing-library/react';
import { useDebouncedSearch } from './useDebouncedSearch';

// Mock timers for testing debouncing
jest.useFakeTimers();

describe('useDebouncedSearch', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should initialize with the initial value', () => {
    const onSearchChange = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedSearch('initial', onSearchChange, 300)
    );

    expect(result.current.inputValue).toBe('initial');
  });

  it('should update inputValue immediately when setInputValue is called', () => {
    const onSearchChange = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedSearch('', onSearchChange, 300)
    );

    act(() => {
      result.current.setInputValue('test');
    });

    expect(result.current.inputValue).toBe('test');
  });

  it('should debounce the onSearchChange callback', () => {
    const onSearchChange = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedSearch('', onSearchChange, 300)
    );

    // Change input value multiple times quickly
    act(() => {
      result.current.setInputValue('t');
    });
    act(() => {
      result.current.setInputValue('te');
    });
    act(() => {
      result.current.setInputValue('test');
    });

    // onSearchChange should not be called yet
    expect(onSearchChange).not.toHaveBeenCalled();

    // Fast-forward time by 300ms
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Now onSearchChange should be called with the final value
    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith('test');
  });

  it('should reset the timer when input changes before delay expires', () => {
    const onSearchChange = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedSearch('', onSearchChange, 300)
    );

    // First change
    act(() => {
      result.current.setInputValue('test1');
    });

    // Advance time partially
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Second change before first timer expires
    act(() => {
      result.current.setInputValue('test2');
    });

    // Advance time by another 200ms (total 400ms from first change, but only 200ms from second)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // onSearchChange should not be called yet
    expect(onSearchChange).not.toHaveBeenCalled();

    // Advance by another 100ms to complete the 300ms from second change
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Now onSearchChange should be called with the second value
    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith('test2');
  });

  it('should call onSearchChange immediately on initial render', () => {
    const onSearchChange = jest.fn();
    renderHook(() => useDebouncedSearch('initial', onSearchChange, 300));

    // Fast-forward time by 300ms
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith('initial');
  });

  it('should clear search when clearSearch is called', () => {
    const onSearchChange = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedSearch('test', onSearchChange, 300)
    );

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.inputValue).toBe('');
  });

  it('should update inputValue when initialValue changes', () => {
    const onSearchChange = jest.fn();
    let initialValue = 'initial';
    const { result, rerender } = renderHook(() =>
      useDebouncedSearch(initialValue, onSearchChange, 300)
    );

    expect(result.current.inputValue).toBe('initial');

    // Change initial value
    initialValue = 'changed';
    rerender();

    expect(result.current.inputValue).toBe('changed');
  });

  it('should use custom delay when provided', () => {
    const onSearchChange = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedSearch('', onSearchChange, 500) // 500ms delay
    );

    act(() => {
      result.current.setInputValue('test');
    });

    // Advance by 300ms (default delay) - should not trigger
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(onSearchChange).not.toHaveBeenCalled();

    // Advance by another 200ms (total 500ms) - should trigger
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(onSearchChange).toHaveBeenCalledWith('test');
  });

  it('should handle empty string input correctly', () => {
    const onSearchChange = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedSearch('initial', onSearchChange, 300)
    );

    act(() => {
      result.current.setInputValue('');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('should handle rapid consecutive changes correctly', () => {
    const onSearchChange = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedSearch('', onSearchChange, 300)
    );

    // Simulate rapid typing
    const searchTerms = ['t', 'te', 'tes', 'test', 'testi', 'testin', 'testing'];
    
    searchTerms.forEach((term) => {
      act(() => {
        result.current.setInputValue(term);
      });
      // Advance time by a small amount between each keystroke
      act(() => {
        jest.advanceTimersByTime(50);
      });
    });

    // onSearchChange should not be called yet
    expect(onSearchChange).not.toHaveBeenCalled();

    // Advance time to complete the debounce delay
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should be called once with the final value
    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith('testing');
  });
}); 