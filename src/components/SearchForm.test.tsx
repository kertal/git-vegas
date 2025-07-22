import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SearchForm from './SearchForm';

// Mock the debounce function
vi.mock('../utils', () => ({
  debounce: (fn: (...args: unknown[]) => void, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: unknown[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  },
}));

// Mock the useFormContext hook
const mockSetUsername = vi.fn();
const mockSetStartDate = vi.fn();
const mockSetEndDate = vi.fn();
const mockSetApiMode = vi.fn();
const mockHandleSearch = vi.fn();
const mockHandleUsernameBlur = vi.fn();
const mockValidateUsernameFormat = vi.fn();

vi.mock('../App', () => ({
  useFormContext: () => ({
    username: '',
    setUsername: mockSetUsername,
    startDate: '2024-01-01',
    setStartDate: mockSetStartDate,
    endDate: '2024-01-31',
    setEndDate: mockSetEndDate,
    apiMode: 'events' as const,
    setApiMode: mockSetApiMode,
    handleSearch: mockHandleSearch,
    handleUsernameBlur: mockHandleUsernameBlur,
    validateUsernameFormat: mockValidateUsernameFormat,
    loading: false,
    error: null,
    searchItemsCount: 0,
    rawEventsCount: 0,
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SearchForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders username input field', () => {
    render(<SearchForm />);
    expect(screen.getByPlaceholderText(/Enter usernames/)).toBeInTheDocument();
  });

  it('calls setUsername immediately on input change', () => {
    render(<SearchForm />);
    const usernameInput = screen.getByPlaceholderText(/Enter usernames/);
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    expect(mockSetUsername).toHaveBeenCalledWith('testuser');
  });

  it('debounces validation calls', async () => {
    render(<SearchForm />);
    const usernameInput = screen.getByPlaceholderText(/Enter usernames/);
    
    // Type multiple characters quickly
    fireEvent.change(usernameInput, { target: { value: 't' } });
    fireEvent.change(usernameInput, { target: { value: 'te' } });
    fireEvent.change(usernameInput, { target: { value: 'tes' } });
    fireEvent.change(usernameInput, { target: { value: 'test' } });
    fireEvent.change(usernameInput, { target: { value: 'testu' } });
    fireEvent.change(usernameInput, { target: { value: 'testus' } });
    fireEvent.change(usernameInput, { target: { value: 'testuse' } });
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    // Validation should not be called immediately
    expect(mockValidateUsernameFormat).not.toHaveBeenCalled();
    
    // Fast-forward time to trigger debounced validation
    vi.advanceTimersByTime(500);
    
    // Now validation should be called with the final value
    expect(mockValidateUsernameFormat).toHaveBeenCalledTimes(1);
    expect(mockValidateUsernameFormat).toHaveBeenCalledWith('testuser');
  });

  it('debounces localStorage saves', async () => {
    render(<SearchForm />);
    const usernameInput = screen.getByPlaceholderText(/Enter usernames/);
    
    // Type multiple characters quickly
    fireEvent.change(usernameInput, { target: { value: 't' } });
    fireEvent.change(usernameInput, { target: { value: 'te' } });
    fireEvent.change(usernameInput, { target: { value: 'tes' } });
    fireEvent.change(usernameInput, { target: { value: 'test' } });
    fireEvent.change(usernameInput, { target: { value: 'testu' } });
    fireEvent.change(usernameInput, { target: { value: 'testus' } });
    fireEvent.change(usernameInput, { target: { value: 'testuse' } });
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    // localStorage should not be called immediately
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    
    // Fast-forward time to trigger debounced save
    vi.advanceTimersByTime(500);
    
    // Wait for all pending promises and timers
    await vi.runAllTimersAsync();
    
    // Now localStorage should be called with the final value
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('github-username', 'testuser');
  });

  it('calls handleUsernameBlur on blur event', () => {
    render(<SearchForm />);
    const usernameInput = screen.getByPlaceholderText(/Enter usernames/);
    
    fireEvent.blur(usernameInput);
    
    expect(mockHandleUsernameBlur).toHaveBeenCalledTimes(1);
  });

  it('calls handleSearch on form submit', () => {
    render(<SearchForm />);
    const updateButton = screen.getByText('Update');
    const form = updateButton.closest('form');
    
    if (form) {
      fireEvent.submit(form);
      expect(mockHandleSearch).toHaveBeenCalledTimes(1);
    }
  });

  it('does not validate empty usernames', async () => {
    render(<SearchForm />);
    const usernameInput = screen.getByPlaceholderText(/Enter usernames/);
    
    fireEvent.change(usernameInput, { target: { value: '   ' } });
    
    // Fast-forward time to trigger debounced validation
    vi.advanceTimersByTime(500);
    
    // Validation should not be called for empty/whitespace-only input
    expect(mockValidateUsernameFormat).not.toHaveBeenCalled();
  });
}); 