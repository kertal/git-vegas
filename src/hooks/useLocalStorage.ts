import { useState, useEffect, useCallback, useRef } from 'react';
import { getParamFromUrl, isValidDateString, validateUsernameList } from '../utils';
import { FormSettings } from '../types';

// Enhanced serialization that handles Set and Map objects
function serializeValue<T>(value: T): string {
  const replacer = (_key: string, val: unknown) => {
    if (val instanceof Set) {
      return { __type: 'Set', __value: Array.from(val) };
    }
    if (val instanceof Map) {
      return { __type: 'Map', __value: Array.from(val.entries()) };
    }
    return val;
  };
  return JSON.stringify(value, replacer);
}

// Enhanced deserialization that reconstructs Set and Map objects
function deserializeValue<T>(value: string): T {
  const reviver = (_key: string, val: unknown) => {
    if (val && typeof val === 'object' && val !== null) {
      const obj = val as { __type?: string; __value?: unknown };
      if (obj.__type === 'Set' && Array.isArray(obj.__value)) {
        return new Set(obj.__value);
      }
      if (obj.__type === 'Map' && Array.isArray(obj.__value)) {
        return new Map(obj.__value as [unknown, unknown][]);
      }
    }
    return val;
  };
  return JSON.parse(value, reviver) as T;
}

// Safe localStorage setter with quota handling
function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Handle quota exceeded errors gracefully
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return false;
    }
    throw error;
  }
}

// Specialized hook for form settings that handles URL parameter mapping
export function useFormSettings(key: string, initialValue: FormSettings, onUrlParamsProcessed?: () => void) {
  const urlParamsProcessedRef = useRef(false);
  
  // Get initial value from localStorage, then initialValue
  const [value, setValue] = useState<FormSettings>(() => {
    try {
      let result = { ...initialValue };

      // First try to get from localStorage
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        try {
          const parsedItem = deserializeValue<FormSettings>(item);
          result = { ...initialValue, ...parsedItem };
        } catch {
          // If deserialization fails, use initial value
        }
      }

      return result;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Process URL parameters and apply them to the form state
  useEffect(() => {
    if (urlParamsProcessedRef.current) return;
    
    const urlUsername = getParamFromUrl('username');
    const urlStartDate = getParamFromUrl('startDate');
    const urlEndDate = getParamFromUrl('endDate');

    if (urlUsername !== null || urlStartDate !== null || urlEndDate !== null) {
      urlParamsProcessedRef.current = true;
      
      // Apply URL parameters to the form state with validation
      const updatedSettings = { ...value };
      
      // Validate and apply username
      if (urlUsername !== null) {
        const usernameValidation = validateUsernameList(urlUsername);
        if (usernameValidation.errors.length === 0 && usernameValidation.usernames.length > 0) {
          // Use the first validated username (since URL params typically contain single usernames)
          updatedSettings.username = usernameValidation.usernames[0];
        } else {
          console.warn('Invalid username in URL parameter:', urlUsername, usernameValidation.errors);
        }
      }
      
      // Validate and apply start date
      if (urlStartDate !== null) {
        if (isValidDateString(urlStartDate)) {
          updatedSettings.startDate = urlStartDate;
        } else {
          console.warn('Invalid start date in URL parameter:', urlStartDate);
        }
      }
      
      // Validate and apply end date
      if (urlEndDate !== null) {
        if (isValidDateString(urlEndDate)) {
          updatedSettings.endDate = urlEndDate;
        } else {
          console.warn('Invalid end date in URL parameter:', urlEndDate);
        }
      }
      
      setValue(updatedSettings);

      // Clean up URL parameters after processing them
      const url = new URL(window.location.href);
      if (url.search) {
        url.search = '';
        window.history.replaceState({}, '', url.toString());
      }
      
      // Clear caches and data in background when loading with URL parameters (shared links)
      // This ensures fresh data for subsequent usage
      // Only do this in production environment, not in tests
      const isTestEnvironment = typeof window !== 'undefined' && 
        (window.navigator?.userAgent?.includes('jsdom') || 
         process.env.NODE_ENV === 'test' ||
         import.meta.env?.MODE === 'test');
         
      if (!isTestEnvironment) {
        // Run cache cleanup in background (don't await to avoid blocking the URL processing)
        (async () => {
          try {
            const { clearCachesKeepToken } = await import('../utils/storage');
            const preservedToken = await clearCachesKeepToken();
            
            // Update the form settings to preserve the token if we have one
            if (preservedToken && preservedToken !== updatedSettings.githubToken) {
              setValue(prev => ({
                ...prev,
                githubToken: preservedToken
              }));
            }
            
            console.log('Background cache cleanup completed for shared link');
          } catch (error) {
            console.error('Background cache cleanup failed:', error);
          }
        })();
      }
      
      // Notify that URL parameters were processed
      onUrlParamsProcessed?.();
    }
  }, [value, onUrlParamsProcessed]); // Include dependencies as required by ESLint

  // Update localStorage whenever value changes
  useEffect(() => {
    try {
      // Skip storing if value equals initial value (deep comparison for objects)
      if (JSON.stringify(value) === JSON.stringify(initialValue)) {
        window.localStorage.removeItem(key);
        return;
      }

      // Store to localStorage using enhanced serialization and safe setter
      const serializedValue = serializeValue(value);
      safeSetItem(key, serializedValue);
    } catch (error) {
      console.error(`Error saving to localStorage key "${key}":`, error);
    }
  }, [key, value, initialValue]);

  // Provide a clear function
  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key);

      // Set value to initialValue after clearing localStorage to avoid re-storing
      setValue(initialValue);
    } catch (error) {
      console.error(`Error clearing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [value, setValue, clear] as const;
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Get initial value from URL parameters first, then localStorage, then initialValue
  const [value, setValue] = useState<T>(() => {
    try {
      // Try localStorage
      const item = window.localStorage.getItem(key);
      if (item === null) return initialValue;

      try {
        return deserializeValue<T>(item);
      } catch {
        // If deserialization fails, return the raw item or initial value
        return item as unknown as T;
      }
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage whenever value changes
  useEffect(() => {
    try {
      // Skip storing if value is the default value (shallow comparison for objects)
      if (value === initialValue) {
        window.localStorage.removeItem(key);
        return;
      }

      // Use enhanced serialization and safe setter
      const serializedValue = serializeValue(value);
      const success = safeSetItem(key, serializedValue);
      
      if (!success) {
        console.warn(`Failed to save data to localStorage key "${key}" due to quota exceeded`);
      }
    } catch (error) {
      console.error(`Error saving to localStorage key "${key}":`, error);
    }
  }, [key, value, initialValue]);

  // Provide a clear function to remove the item from localStorage
  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      // Set value to initialValue but don't store it
      setValue(initialValue);
    } catch (error) {
      console.error(`Error clearing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [value, setValue, clear] as const;
}
