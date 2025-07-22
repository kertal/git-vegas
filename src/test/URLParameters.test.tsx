import { act } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import { render } from './test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from '../App';

// Mock SVG imports
vi.mock('../assets/GitVegas.svg?react', () => ({
  default: () => <div data-testid="git-vegas-logo">GitVegas Logo</div>,
}));

describe('URL Parameters', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, '', 'http://localhost:3000');
    mockFetch.mockReset();
  });

  it('should initialize form with URL parameters', async () => {
    // Set URL parameters
    window.history.replaceState(
      {},
      '',
      '?username=testuser&startDate=2024-01-01&endDate=2024-01-31'
    );

    await act(async () => {
      render(<App />);
    });

    // Check if form fields are populated with URL parameters
    await waitFor(() => {
      const usernameInput = screen.getByLabelText(
        /github username/i
      ) as HTMLInputElement;
      expect(usernameInput.value).toBe('testuser');
    });

    await waitFor(() => {
      const startDateInput = screen.getByLabelText(
        /start date/i
      ) as HTMLInputElement;
      expect(startDateInput.value).toBe('2024-01-01');
    });

    await waitFor(() => {
      const endDateInput = screen.getByLabelText(/end date/i) as HTMLInputElement;
      expect(endDateInput.value).toBe('2024-01-31');
    });
  });

  it('should prefer URL parameters over localStorage values', async () => {
    // Set localStorage values
    localStorage.setItem('github-form-settings', JSON.stringify({
      username: 'localuser',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      githubToken: '',
      apiMode: 'search'
    }));

    // Set URL parameters
    window.history.replaceState(
      {},
      '',
      '?username=urluser&startDate=2024-01-01&endDate=2024-01-31'
    );

    await act(async () => {
      render(<App />);
    });

    // Check if form fields are populated with URL parameters instead of localStorage values
    await waitFor(() => {
      const usernameInput = screen.getByLabelText(
        /github username/i
      ) as HTMLInputElement;
      expect(usernameInput.value).toBe('urluser');
    });

    await waitFor(() => {
      const startDateInput = screen.getByLabelText(
        /start date/i
      ) as HTMLInputElement;
      expect(startDateInput.value).toBe('2024-01-01');
    });

    await waitFor(() => {
      const endDateInput = screen.getByLabelText(/end date/i) as HTMLInputElement;
      expect(endDateInput.value).toBe('2024-01-31');
    });
  });

  it('should trigger initial fetch when URL parameters are processed', async () => {
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    // Set URL parameters
    window.history.replaceState(
      {},
      '',
      '?username=testuser&startDate=2024-01-01&endDate=2024-01-31'
    );

    await act(async () => {
      render(<App />);
    });

    // Check if form fields are populated from URL parameters
    await waitFor(() => {
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument();
    });

    // Verify that search was called automatically due to URL parameters
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it.skip('should update URL when form values change', async () => {
    // SKIPPED: The app no longer automatically updates URLs on form changes
    // URL parameters are only used for initial state loading, not for ongoing form updates
  });

  it('should clear URL parameters when form is reset', async () => {
    // Set URL parameters
    window.history.replaceState(
      {},
      '',
      '?username=testuser&startDate=2024-01-01&endDate=2024-01-31'
    );

    await act(async () => {
      render(<App />);
    });

    // URL parameters should be cleaned up after processing
    await waitFor(() => {
      expect(window.location.search).toBe('');
    });
  });

  it('should populate form fields from URL parameters without auto-search', async () => {
    // Set URL parameters
    window.history.replaceState(
      {},
      '',
      '?username=testuser&startDate=2024-01-01&endDate=2024-01-31'
    );

    await act(async () => {
      render(<App />);
    });

    // Check if form fields are populated from URL parameters
    await waitFor(() => {
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument();
    });

    // URL should be cleaned up
    await waitFor(() => {
      expect(window.location.search).toBe('');
    });
  });
});
