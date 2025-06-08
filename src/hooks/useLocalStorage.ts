import { useState, useEffect, useCallback } from 'react';
import { getParamFromUrl } from '../utils';
import { FormSettings } from '../types';

// Helper function to check if a value is a Set
// const isSet = (value: any): value is Set<any> => value instanceof Set;

// Enhanced serialization for complex objects containing Sets
const serializeValue = (value: unknown): string => {
  const replacer = (_key: string, val: unknown) => {
    if (val instanceof Set) {
      return { __type: 'Set', __value: Array.from(val) };
    }
    return val;
  };
  return JSON.stringify(value, replacer);
};

// Enhanced deserialization for complex objects containing Sets
const deserializeValue = <T>(jsonString: string): T => {
  const reviver = (_key: string, val: unknown) => {
    if (val && typeof val === 'object' && val !== null && 'length' in val === false && '__type' in val && '__value' in val && (val as { __type: string; __value: unknown }).__type === 'Set') {
      return new Set((val as { __type: string; __value: unknown[] }).__value);
    }
    return val;
  };
  return JSON.parse(jsonString, reviver) as T;
};

// Specialized hook for form settings that handles URL parameter mapping
export function useFormSettings(key: string, initialValue: FormSettings) {
  // Get initial value from URL parameters first, then localStorage, then initialValue
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

      // Then override with URL parameters if they exist
      const urlUsername = getParamFromUrl('username');
      const urlStartDate = getParamFromUrl('startDate');
      const urlEndDate = getParamFromUrl('endDate');

      if (urlUsername !== null) result.username = urlUsername;
      if (urlStartDate !== null) result.startDate = urlStartDate;
      if (urlEndDate !== null) result.endDate = urlEndDate;

      return result;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage whenever value changes
  useEffect(() => {
    try {
      // Skip storing if value equals initial value (deep comparison for objects)
      if (JSON.stringify(value) === JSON.stringify(initialValue)) {
        window.localStorage.removeItem(key);
        return;
      }

      // Store to localStorage using enhanced serialization
      window.localStorage.setItem(key, serializeValue(value));
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

      // Use enhanced serialization
      window.localStorage.setItem(key, serializeValue(value));
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
