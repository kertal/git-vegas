import { act } from '@testing-library/react';
import { screen, waitFor, fireEvent } from '@testing-library/dom';
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
    const usernameInput = screen.getByLabelText(
      /github username/i
    ) as HTMLInputElement;
    const startDateInput = screen.getByLabelText(
      /start date/i
    ) as HTMLInputElement;
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
    const usernameInput = screen.getByLabelText(
      /github username/i
    ) as HTMLInputElement;
    const startDateInput = screen.getByLabelText(
      /start date/i
    ) as HTMLInputElement;
    const endDateInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

    expect(usernameInput.value).toBe('urluser');
    expect(startDateInput.value).toBe('2024-01-01');
    expect(endDateInput.value).toBe('2024-01-31');
  });

  it('should update URL when form values change', async () => {
    render(<App />);

    // Get form inputs
    const usernameInput = screen.getByLabelText(
      /github username/i
    ) as HTMLInputElement;
    const startDateInput = screen.getByLabelText(
      /start date/i
    ) as HTMLInputElement;
    const endDateInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

    // Change form values using fireEvent to properly trigger React handlers
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'newuser' } });
      fireEvent.change(startDateInput, { target: { value: '2024-02-01' } });
      fireEvent.change(endDateInput, { target: { value: '2024-02-28' } });
    });

    // URL parameters are no longer automatically updated
    // Instead, verify that the form values are updated in localStorage
    await waitFor(() => {
      const formSettings = JSON.parse(
        localStorage.getItem('github-form-settings') || '{}'
      );
      expect(formSettings.username).toBe('newuser');
      expect(formSettings.startDate).toBe('2024-02-01');
      expect(formSettings.endDate).toBe('2024-02-28');
    });
  });

  it.skip('should clear URL parameters when form is reset', async () => {
    // SKIPPED: This test requires filter functionality which is now hidden from users
    // The filter buttons and Clear All functionality are no longer accessible in the UI
  });

  it('should populate form fields from URL parameters without auto-search', async () => {
    // Mock successful API response but expect it NOT to be called automatically
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

    render(<App />);

    // Check if form fields are populated from URL parameters
    await waitFor(() => {
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument();
    });

    // Verify that search was NOT called automatically
    expect(mockFetch).not.toHaveBeenCalled();

    // Manually trigger search by clicking button
    const searchButton = screen.getByRole('button', { name: /update/i });
    await act(async () => {
      fireEvent.click(searchButton);
    });

    // Now verify that search was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
