import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for debounced search functionality
 * 
 * @param initialValue - Initial search value
 * @param onSearchChange - Callback function to call when search value changes (debounced)
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Object containing inputValue, setInputValue, and clearSearch function
 */
export const useDebouncedSearch = (
  initialValue: string,
  onSearchChange: (value: string) => void,
  delay: number = 300
) => {
  // Local state for the input value (updates immediately)
  const [inputValue, setInputValue] = useState(initialValue);

  // Update local input value when initial value changes
  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  // Debounced effect to call onSearchChange
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(inputValue);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [inputValue, onSearchChange, delay]);

  // Function to clear the search
  const clearSearch = useCallback(() => {
    setInputValue('');
  }, []);

  // Function to handle input changes
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  return {
    inputValue,
    setInputValue: handleInputChange,
    clearSearch,
  };
}; 