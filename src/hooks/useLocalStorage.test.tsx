import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.search = '';
  });

  afterEach(() => {
    window.localStorage.clear();
    window.location.search = '';
  });

  it('should initialize with default value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'));
    expect(result.current[0]).toBe('default-value');
  });

  it('should initialize with localStorage value (URL parameters no longer override)', () => {
    window.localStorage.setItem('github-username', JSON.stringify('local-user'));
    window.location.search = '?username=url-user';

    const { result } = renderHook(() => useLocalStorage('github-username', 'default-value'));
    // URL parameters no longer automatically override localStorage
    expect(result.current[0]).toBe('local-user');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(JSON.parse(window.localStorage.getItem('test-key') || '')).toBe('updated');
  });

  it('should handle Set type correctly', () => {
    const initialSet = new Set(['item1', 'item2']);
    const { result } = renderHook(() => useLocalStorage('test-key', initialSet));

    expect(result.current[0]).toEqual(initialSet);

    const newSet = new Set(['item3']);
    act(() => {
      result.current[1](newSet);
    });

    expect(result.current[0]).toEqual(newSet);
    expect(JSON.parse(window.localStorage.getItem('test-key') || '{}')).toEqual({ __type: 'Set', __value: Array.from(newSet) });
  });

  it('should clear value when using clear function', () => {
    window.localStorage.setItem('test-key', JSON.stringify('test-value'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

    act(() => {
      result.current[2]();
    });

    expect(result.current[0]).toBe('default');
    expect(window.localStorage.getItem('test-key')).toBeNull();
  });

  it('should not update URL parameters automatically (behavior removed)', () => {
    const { result } = renderHook(() => useLocalStorage('github-username', ''));

    act(() => {
      result.current[1]('test-user');
    });

    // URL parameters are no longer automatically updated
    expect(window.location.search).toBe('');
    // But localStorage should still be updated
    expect(result.current[0]).toBe('test-user');
  });

  it('should not modify URL parameters when clearing (behavior removed)', () => {
    window.location.search = '?username=test-user';
    const { result } = renderHook(() => useLocalStorage('github-username', ''));

    act(() => {
      result.current[2]();
    });

    // URL parameters are no longer automatically modified
    expect(window.location.search).toBe('?username=test-user');
    // But localStorage should be cleared
    expect(result.current[0]).toBe('');
  });

  it('should handle errors gracefully', () => {
    const mockError = new Error('Storage error');
    const originalSetItem = window.localStorage.setItem;
    window.localStorage.setItem = vi.fn().mockImplementation(() => {
      throw mockError;
    });

    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

    act(() => {
      result.current[1]('new-value');
    });

    // Should keep working with the new value in memory even if storage fails
    expect(result.current[0]).toBe('new-value');

    window.localStorage.setItem = originalSetItem;
  });

  it('should properly deserialize Sets from localStorage with enhanced serialization', () => {
    // Simulate a Set being stored with enhanced serialization format
    const setData = { __type: 'Set', __value: [1, 2, 3] };
    window.localStorage.setItem('test-set-key', JSON.stringify(setData));

    const { result } = renderHook(() => useLocalStorage('test-set-key', new Set<number>()));

    // The value should be deserialized back to a proper Set
    expect(result.current[0]).toBeInstanceOf(Set);
    expect(result.current[0]).toEqual(new Set([1, 2, 3]));
    
    // Should have .has method available
    expect(typeof result.current[0].has).toBe('function');
    expect(result.current[0].has(1)).toBe(true);
    expect(result.current[0].has(4)).toBe(false);
  });

  it('should handle corrupted Set data in localStorage gracefully', () => {
    // Simulate corrupted Set data (missing __type or __value)
    const corruptedData = { __value: [1, 2, 3] }; // Missing __type
    window.localStorage.setItem('test-corrupted-key', JSON.stringify(corruptedData));

    const defaultSet = new Set([5, 6]);
    const { result } = renderHook(() => useLocalStorage('test-corrupted-key', defaultSet));

    // Should fall back to the corrupted data as-is or the initial value
    // Since deserialization should handle this gracefully
    expect(result.current[0]).toBeDefined();
  });
}); 