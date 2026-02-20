import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SearchForm from './SearchForm';

// Mock the GitVegasLogo component
vi.mock('../assets/GitVegas.svg?react', () => ({
  default: () => <div data-testid="gitvegas-logo">GitVegas Logo</div>,
}));

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

// Mock the zustand form store
const mockSetUsername = vi.fn();
const mockSetStartDate = vi.fn();
const mockSetEndDate = vi.fn();
const mockSetApiMode = vi.fn();
const mockHandleSearch = vi.fn();
const mockValidateUsernameFormat = vi.fn();
const mockAddAvatarsToCache = vi.fn();

vi.mock('../store/useFormStore', () => ({
  useFormStore: () => ({
    username: '',
    setUsername: mockSetUsername,
    startDate: '2024-01-01',
    setStartDate: mockSetStartDate,
    endDate: '2024-01-31',
    setEndDate: mockSetEndDate,
    apiMode: 'events' as const,
    setApiMode: mockSetApiMode,
    handleSearch: mockHandleSearch,
    validateUsernameFormat: mockValidateUsernameFormat,
    addAvatarsToCache: mockAddAvatarsToCache,
    loading: false,
    loadingProgress: '',
    error: null,
    searchItemsCount: 0,
    eventsCount: 0,
    rawEventsCount: 0,
    githubToken: '',
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

  it.skip('validates on blur instead of while typing', async () => {
    render(<SearchForm />);
    const usernameInput = screen.getByPlaceholderText(/Enter usernames/);
    
    // Type multiple characters quickly
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    // Validation should not be called while typing
    expect(mockValidateUsernameFormat).not.toHaveBeenCalled();
    
    // Trigger blur event
    fireEvent.blur(usernameInput);
    
    // Wait for async validation
    await waitFor(() => {
      expect(mockAddAvatarsToCache).toHaveBeenCalled();
    });
  });

  it.skip('saves to localStorage on blur after successful validation', async () => {
    // Mock GitHub API validation to succeed
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ avatar_url: 'test.jpg' })
    });

    render(<SearchForm />);
    const usernameInput = screen.getByPlaceholderText(/Enter usernames/);
    
    // Type username
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    // localStorage should not be called while typing
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    
    // Trigger blur event
    fireEvent.blur(usernameInput);
    
    // Wait for async validation and localStorage save
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('github-username', 'testuser');
    });
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