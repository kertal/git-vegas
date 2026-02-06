import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeProvider } from '@primer/react';
import SearchForm from '../SearchForm';

// Mock the form context
const mockHandleSearch = vi.fn();
const mockValidateUsernameFormat = vi.fn();
const mockAddAvatarsToCache = vi.fn();
const mockSetUsername = vi.fn();
const mockSetStartDate = vi.fn();
const mockSetEndDate = vi.fn();
const mockSetApiMode = vi.fn();

// Mock utils
vi.mock('../../utils', () => ({
  validateUsernameList: vi.fn(() => ({ usernames: ['testuser'], errors: [] })),
  validateGitHubUsernames: vi.fn(() => 
    Promise.resolve({ 
      valid: ['testuser'], 
      invalid: [], 
      errors: {}, 
      avatarUrls: {} 
    })
  ),
}));

// Mock the form context
vi.mock('../../App', () => ({
  useFormContext: () => ({
    username: 'testuser',
    setUsername: mockSetUsername,
    startDate: '2024-01-01',
    setStartDate: mockSetStartDate,
    endDate: '2024-01-31',
    setEndDate: mockSetEndDate,
    apiMode: 'summary',
    setApiMode: mockSetApiMode,
    handleSearch: mockHandleSearch,
    validateUsernameFormat: mockValidateUsernameFormat,
    addAvatarsToCache: mockAddAvatarsToCache,
    loading: false,
    error: '',
    searchItemsCount: 0,
    rawEventsCount: 0,
    githubToken: 'test-token',
  }),
}));

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('SearchForm - Race Condition Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow search even when validation is in progress', async () => {
    // Mock a slow validation
    const { validateGitHubUsernames } = await import('../../utils');
    vi.mocked(validateGitHubUsernames).mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ 
          valid: ['testuser'], 
          invalid: [], 
          errors: {}, 
          avatarUrls: {} 
        }), 1000)
      )
    );

    renderWithTheme(<SearchForm />);

    const usernameInput = screen.getByDisplayValue('testuser');
    const updateButton = screen.getByRole('button', { name: /update/i });

    // Trigger blur event to start validation
    fireEvent.blur(usernameInput);
    
    // Button should show validation state but still be clickable
    expect(updateButton).not.toBeDisabled();
    
    // Click update while validation is in progress
    fireEvent.click(updateButton);
    
    // Should show pending search state
    expect(screen.getByText(/validating & queued/i)).toBeInTheDocument();
    
    // Wait for validation to complete and search to execute
    await waitFor(() => {
      expect(mockHandleSearch).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });
  });

  it('should execute search immediately if not validating', () => {
    renderWithTheme(<SearchForm />);

    const updateButton = screen.getByRole('button', { name: /update/i });
    
    // Click update when not validating
    fireEvent.click(updateButton);
    
    // Should execute search immediately
    expect(mockHandleSearch).toHaveBeenCalledTimes(1);
  });

  it('should show correct button states during validation and search', async () => {
    renderWithTheme(<SearchForm />);

    const usernameInput = screen.getByDisplayValue('testuser');
    const updateButton = screen.getByRole('button', { name: /update/i });

    // Initial state
    expect(updateButton).toHaveTextContent('Update');
    expect(updateButton).not.toBeDisabled();

    // Start validation
    fireEvent.blur(usernameInput);
    
    // During validation
    await waitFor(() => {
      expect(screen.getByText(/validating/i)).toBeInTheDocument();
    });

    // Click during validation
    fireEvent.click(updateButton);
    
    // Should show pending state
    expect(screen.getByText(/validating & queued/i)).toBeInTheDocument();
    expect(updateButton).not.toBeDisabled();
  });
}); 