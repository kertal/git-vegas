import { useState, useEffect, useCallback } from 'react';

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
