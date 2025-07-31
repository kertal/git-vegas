import { useState, useEffect } from 'react';

export function useDismissibleBanner(bannerId: string) {
  const storageKey = `dismissed-banner-${bannerId}`;
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    try {
      // Check if banner was previously dismissed
      const dismissed = localStorage.getItem(storageKey) === 'true';
      setIsDismissed(dismissed);
    } catch {
      // If localStorage fails, default to not dismissed
      setIsDismissed(false);
    }
  }, [storageKey]);

  const dismissBanner = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(storageKey, 'true');
    } catch (error) {
      // State is already updated, localStorage failure is not critical
      console.warn('Failed to save dismissed banner state to localStorage:', error);
    }
  };

  const resetBanner = () => {
    setIsDismissed(false);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      // State is already updated, localStorage failure is not critical
      console.warn('Failed to remove dismissed banner state from localStorage:', error);
    }
  };

  return {
    isDismissed,
    dismissBanner,
    resetBanner,
  };
} 