import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useDismissibleBanner } from '../useDismissibleBanner';

describe('useDismissibleBanner', () => {
  const bannerId = 'test-banner';
  const storageKey = `dismissed-banner-${bannerId}`;

  // Mock localStorage
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Replace localStorage with our mock
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  it('should start with isDismissed as false when no localStorage value exists', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => useDismissibleBanner(bannerId));
    
    expect(result.current.isDismissed).toBe(false);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(storageKey);
  });

  it('should start with isDismissed as true when localStorage has dismissed value', () => {
    mockLocalStorage.getItem.mockReturnValue('true');
    
    const { result } = renderHook(() => useDismissibleBanner(bannerId));
    
    expect(result.current.isDismissed).toBe(true);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(storageKey);
  });

  it('should start with isDismissed as false when localStorage has non-true value', () => {
    mockLocalStorage.getItem.mockReturnValue('false');
    
    const { result } = renderHook(() => useDismissibleBanner(bannerId));
    
    expect(result.current.isDismissed).toBe(false);
  });

  it('should dismiss banner and save to localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => useDismissibleBanner(bannerId));
    
    expect(result.current.isDismissed).toBe(false);
    
    act(() => {
      result.current.dismissBanner();
    });
    
    expect(result.current.isDismissed).toBe(true);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(storageKey, 'true');
  });

  it('should reset banner and remove from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('true');
    
    const { result } = renderHook(() => useDismissibleBanner(bannerId));
    
    expect(result.current.isDismissed).toBe(true);
    
    act(() => {
      result.current.resetBanner();
    });
    
    expect(result.current.isDismissed).toBe(false);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(storageKey);
  });

  it('should use different storage keys for different banner IDs', () => {
    const bannerId1 = 'banner-1';
    const bannerId2 = 'banner-2';
    const storageKey1 = `dismissed-banner-${bannerId1}`;
    const storageKey2 = `dismissed-banner-${bannerId2}`;
    
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === storageKey1) return 'true';
      if (key === storageKey2) return null;
      return null;
    });
    
    const { result: result1 } = renderHook(() => useDismissibleBanner(bannerId1));
    const { result: result2 } = renderHook(() => useDismissibleBanner(bannerId2));
    
    expect(result1.current.isDismissed).toBe(true);
    expect(result2.current.isDismissed).toBe(false);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(storageKey1);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(storageKey2);
  });

  it('should handle localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    const { result } = renderHook(() => useDismissibleBanner(bannerId));
    
    // Should default to false when localStorage fails
    expect(result.current.isDismissed).toBe(false);
  });

  it('should handle setItem errors gracefully', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('localStorage setItem error');
    });
    
    const { result } = renderHook(() => useDismissibleBanner(bannerId));
    
    act(() => {
      result.current.dismissBanner();
    });
    
    // State should still update even if localStorage fails
    expect(result.current.isDismissed).toBe(true);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(storageKey, 'true');
  });

  it('should provide all expected functions', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => useDismissibleBanner(bannerId));
    
    expect(typeof result.current.isDismissed).toBe('boolean');
    expect(typeof result.current.dismissBanner).toBe('function');
    expect(typeof result.current.resetBanner).toBe('function');
  });
}); 