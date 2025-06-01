import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', 'http://localhost:3000');
  });

  it('should initialize with default value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('should initialize with URL parameter value over localStorage value', () => {
    // Set up localStorage with a value
    window.localStorage.setItem('github-username', JSON.stringify('local-user'));
    
    // Set up URL parameter
    window.history.replaceState({}, '', 'http://localhost:3000?username=url-user');

    // Wait for state to update
    const { result } = renderHook(() => useLocalStorage('github-username', ''));
    
    // Verify URL parameter is used instead of localStorage value
    expect(result.current[0]).toBe('url-user');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

    act(() => {
      result.current[1]('new value');
    });

    const storedValue = window.localStorage.getItem('test-key');
    expect(storedValue).toBe(JSON.stringify('new value'));
  });

  it('should handle Set type correctly', () => {
    const initialSet = new Set(['item1']);
    const { result } = renderHook(() => useLocalStorage('test-set', initialSet));

    act(() => {
      const newSet = new Set([...result.current[0], 'item2']);
      result.current[1](newSet);
    });

    const storedValue = JSON.parse(window.localStorage.getItem('test-set') || '[]');
    expect(Array.from(storedValue)).toEqual(['item1', 'item2']);
    expect(result.current[0]).toEqual(new Set(['item1', 'item2']));
  });

  it('should clear value when using clear function', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

    act(() => {
      result.current[1]('new value');
    });

    act(() => {
      result.current[2]();
    });

    expect(window.localStorage.getItem('test-key')).toBeNull();
    expect(result.current[0]).toBe('default');
  });

  it('should update URL parameters for mapped keys', () => {
    const { result } = renderHook(() => useLocalStorage('github-username', ''));

    act(() => {
      result.current[1]('test-user');
    });

    expect(window.location.search).toBe('?username=test-user');
  });

  it('should remove URL parameters when clearing mapped keys', () => {
    const { result } = renderHook(() => useLocalStorage('github-username', ''));

    // Set a value first
    act(() => {
      result.current[1]('test-user');
    });

    // Then clear it
    act(() => {
      result.current[2]();
    });

    expect(window.location.search).toBe('');
  });

  it('should handle errors gracefully', () => {
    // Mock localStorage.setItem to throw an error
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem');
    setItemSpy.mockImplementationOnce(() => {
      throw new Error('Storage quota exceeded');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

    act(() => {
      result.current[1]('new value');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error saving to localStorage'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
}); 