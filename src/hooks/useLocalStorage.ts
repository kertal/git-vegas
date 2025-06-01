import { useState, useEffect, useCallback } from 'react';
import { getParamFromUrl } from '../utils';

// Helper function to check if a value is a Set
const isSet = (value: any): value is Set<any> => value instanceof Set;

// Map localStorage keys to URL parameter names
const localStorageToUrlParamMap: Record<string, string> = {
  'github-username': 'username',
  'github-start-date': 'startDate',
  'github-end-date': 'endDate'
};

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Get initial value from URL parameters first, then localStorage, then initialValue
  const [value, setValue] = useState<T>(() => {
    try {
      // Check URL parameters first
      const urlParam = localStorageToUrlParamMap[key];
      if (urlParam) {
        const urlValue = getParamFromUrl(urlParam);
        if (urlValue !== null) {
          // Don't JSON parse URL parameters
          return urlValue as unknown as T;
        }
      }

      // If no URL parameter, try localStorage
      const item = window.localStorage.getItem(key);
      if (item === null) return initialValue;

      try {
        const parsedItem = JSON.parse(item);
        // If initialValue is a Set, convert the parsed array back to a Set
        if (isSet(initialValue)) {
          return new Set(parsedItem) as T;
        }
        return parsedItem;
      } catch {
        // If JSON parsing fails, return the raw item
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
      // Skip storing if value is the default value
      if (value === initialValue) {
        window.localStorage.removeItem(key);
        return;
      }

      // If value is a Set, convert it to an array for storage
      const valueToStore = isSet(value) ? Array.from(value) : value;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));

      // Update URL parameters if this is a mapped key
      const urlParam = localStorageToUrlParamMap[key];
      if (urlParam) {
        const url = new URL(window.location.href);
        if (value === initialValue || value === '') {
          url.searchParams.delete(urlParam);
        } else {
          url.searchParams.set(urlParam, String(value));
        }
        window.history.replaceState({}, '', url.toString());
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

      // Clear URL parameter if this is a mapped key
      const urlParam = localStorageToUrlParamMap[key];
      if (urlParam) {
        const url = new URL(window.location.href);
        url.searchParams.delete(urlParam);
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error) {
      console.error(`Error clearing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [value, setValue, clear] as const;
} 