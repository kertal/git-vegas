import { screen, waitFor, act } from '@testing-library/react';
import { render } from './test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from '../App';

describe('URL Parameters', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, '', 'http://localhost:3000');
    mockFetch.mockReset();
  });

  it('should initialize form with URL parameters', () => {
    // Set URL parameters
    window.history.replaceState(
      {},
      '',
      '?username=testuser&startDate=2024-01-01&endDate=2024-01-31'
    );

    render(<App />);

    // Check if form fields are populated with URL parameters
    const usernameInput = screen.getByLabelText(/github username/i) as HTMLInputElement;
    const startDateInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
    const endDateInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

    expect(usernameInput.value).toBe('testuser');
    expect(startDateInput.value).toBe('2024-01-01');
    expect(endDateInput.value).toBe('2024-01-31');
  });

  it('should prefer URL parameters over localStorage values', () => {
    // Set localStorage values
    localStorage.setItem('github-username', JSON.stringify('localuser'));
    localStorage.setItem('github-start-date', JSON.stringify('2023-01-01'));
    localStorage.setItem('github-end-date', JSON.stringify('2023-12-31'));

    // Set URL parameters
    window.history.replaceState(
      {},
      '',
      '?username=urluser&startDate=2024-01-01&endDate=2024-01-31'
    );

    render(<App />);

    // Check if form fields are populated with URL parameters instead of localStorage values
    const usernameInput = screen.getByLabelText(/github username/i) as HTMLInputElement;
    const startDateInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
    const endDateInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

    expect(usernameInput.value).toBe('urluser');
    expect(startDateInput.value).toBe('2024-01-01');
    expect(endDateInput.value).toBe('2024-01-31');
  });

  it('should update URL when form values change', async () => {
    render(<App />);

    // Get form inputs
    const usernameInput = screen.getByLabelText(/github username/i) as HTMLInputElement;
    const startDateInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
    const endDateInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

    // Change form values
    await act(async () => {
      usernameInput.value = 'newuser';
      startDateInput.value = '2024-02-01';
      endDateInput.value = '2024-02-28';

      // Trigger change events
      usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
      startDateInput.dispatchEvent(new Event('change', { bubbles: true }));
      endDateInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for URL to update
    await waitFor(() => {
      expect(window.location.search).toContain('username=newuser');
      expect(window.location.search).toContain('startDate=2024-02-01');
      expect(window.location.search).toContain('endDate=2024-02-28');
    });
  });

  it('should handle invalid URL parameters gracefully', () => {
    // Set invalid URL parameters
    window.history.replaceState(
      {},
      '',
      '?username=testuser&startDate=invalid-date&endDate=2024-01-31'
    );

    render(<App />);

    // Check if form shows error message
    expect(screen.getByText(/invalid date format/i)).toBeInTheDocument();
  });

  it('should clear URL parameters when form is reset', async () => {
    // Set initial URL parameters
    window.history.replaceState(
      {},
      '',
      '?username=testuser&startDate=2024-01-01&endDate=2024-01-31'
    );

    render(<App />);

    // Find and click clear button
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await act(async () => {
      clearButton.click();
    });

    // Check if URL parameters are cleared
    expect(window.location.search).toBe('');
  });

  it('should automatically search with URL parameters on load', async () => {
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] })
    });

    // Set URL parameters
    window.history.replaceState(
      {},
      '',
      '?username=testuser&startDate=2024-01-01&endDate=2024-01-31'
    );

    render(<App />);

    // Check if search was triggered
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
}); 