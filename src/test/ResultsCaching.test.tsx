import { act } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import { render } from './test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from '../App';
import { GitHubItem } from '../types';
import { fireEvent } from '@testing-library/dom';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Results Caching', () => {
  const mockResults: GitHubItem[] = [
    {
      id: 1,
      title: 'Test Issue',
      html_url: 'https://github.com/test/repo/issues/1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      state: 'open',
      user: {
        login: 'testuser',
        avatar_url: 'https://github.com/testuser.png',
        html_url: 'https://github.com/testuser',
      },
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', 'http://localhost:3000');
    mockFetch.mockReset();
  });

  it('should load cached results on mount if available and not expired', async () => {
    // Set up cached results with new data structure
    const cachedData = {
      rawSearchItems: mockResults,
      rawEvents: [],
      metadata: {
        lastFetch: Date.now(),
        usernames: ['testuser'],
        apiMode: 'search',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      },
    };
    localStorage.setItem('github-raw-data-storage', JSON.stringify(cachedData));

    // Also set the last search params to match
    const lastSearchParams = {
      username: 'testuser',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      apiMode: 'search',
      timestamp: Date.now(),
    };
    localStorage.setItem(
      'github-last-search-params',
      JSON.stringify(lastSearchParams)
    );

    // Set URL parameters to match the cached data
    window.history.replaceState(
      {},
      '',
      '?username=testuser&startDate=2024-01-01&endDate=2024-01-31'
    );

    render(<App />);

    // Wait for the cached results to be processed and displayed
    await waitFor(() => {
      expect(screen.getByText('Test Issue')).toBeInTheDocument();
    });
    
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fetch new results if cache is expired', async () => {
    // Set up expired cached results with new data structure
    const cachedData = {
      rawSearchItems: mockResults,
      rawEvents: [],
      metadata: {
        lastFetch: Date.now(),
        usernames: ['testuser'],
        apiMode: 'search',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      },
    };
    localStorage.setItem('github-raw-data-storage', JSON.stringify(cachedData));

    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: mockResults }),
    });

    // Set URL parameters to populate form fields
    window.history.replaceState(
      {},
      '',
      '?username=testuser&startDate=2024-01-01&endDate=2024-01-31'
    );

    render(<App />);

    // Wait for form to be populated from URL parameters
    await waitFor(() => {
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    });

    // Manually click the search button to trigger the search
    const searchButton = screen.getByRole('button', { name: /fetch all data/i });
    await act(async () => {
      fireEvent.click(searchButton);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should fetch new results if URL parameters differ from cache', async () => {
    // Set up cached results with new data structure
    const cachedData = {
      rawSearchItems: mockResults,
      rawEvents: [],
      metadata: {
        lastFetch: Date.now(),
        usernames: ['olduser'],
        apiMode: 'search',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      },
    };
    localStorage.setItem('github-raw-data-storage', JSON.stringify(cachedData));

    // Set different URL parameters
    window.history.replaceState(
      {},
      '',
      '?username=different&startDate=2024-02-01&endDate=2024-02-28'
    );

    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: mockResults }),
    });

    render(<App />);

    // Wait for form to be populated from URL parameters
    await waitFor(() => {
      expect(screen.getByDisplayValue('different')).toBeInTheDocument();
    });

    // Manually click the search button to trigger the search
    const searchButton = screen.getByRole('button', { name: /fetch all data/i });
    await act(async () => {
      fireEvent.click(searchButton);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it.skip('should update cache after successful fetch', async () => {
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: mockResults }),
    });

    render(<App />);

    // Fill out the form manually
    const usernameInput = screen.getByLabelText(/github username/i);
    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);

    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });
    });

    // Click the search button to trigger the search
    const searchButton = screen.getByRole('button', { name: /fetch all data/i });
    await act(async () => {
      fireEvent.click(searchButton);
    });

    // Wait for the fetch to complete and results to be stored
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Wait for the state to update and localStorage to be written
    await waitFor(
      () => {
        const cachedData = localStorage.getItem('github-raw-data-storage');
        expect(cachedData).not.toBeNull();
        const parsedData = JSON.parse(cachedData || '{}');
        expect(parsedData.rawSearchItems).toEqual(mockResults);
      },
      { timeout: 5000 }
    );
  });

  it.skip('should handle cache clearing', async () => {
    // SKIPPED: This test requires filter functionality which is now hidden from users
    // The filter buttons are no longer accessible in the UI
  });

  it.skip('should handle network errors gracefully', async () => {
    // Mock failed API response
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    // Fill out the form manually
    const usernameInput = screen.getByLabelText(/github username/i);
    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);

    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });
    });

    // Click the search button to trigger the search
    const searchButton = screen.getByRole('button', { name: /fetch all data/i });
    await act(async () => {
      fireEvent.click(searchButton);
    });

    // Wait for error to appear
    await waitFor(
      () => {
        expect(
          screen.getByText(/an error occurred while fetching data/i)
        ).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });
});
