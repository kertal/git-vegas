import { screen, waitFor, act } from '@testing-library/react';
import { render } from './test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from '../App';
import { GitHubItem } from '../types';

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
        html_url: 'https://github.com/testuser'
      }
    }
  ];

  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', 'http://localhost:3000');
    mockFetch.mockReset();
  });

  it('should load cached results on mount if available and not expired', () => {
    // Set up cached results
    const cachedResults = {
      results: mockResults,
      timestamp: Date.now(),
      params: {
        username: 'testuser',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    };
    localStorage.setItem('github-search-results', JSON.stringify(cachedResults));

    render(<App />);
    
    expect(screen.getByText('Test Issue')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fetch new results if cache is expired', async () => {
    // Set up expired cached results
    const cachedResults = {
      results: mockResults,
      timestamp: Date.now() - 3600001, // Just over 1 hour old
      params: {
        username: 'testuser',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    };
    localStorage.setItem('github-search-results', JSON.stringify(cachedResults));

    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: mockResults })
    });

    render(<App />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should fetch new results if URL parameters differ from cache', async () => {
    // Set up cached results with different parameters
    const cachedResults = {
      results: mockResults,
      timestamp: Date.now(),
      params: {
        username: 'testuser',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    };
    localStorage.setItem('github-search-results', JSON.stringify(cachedResults));

    // Set different URL parameters
    window.history.replaceState(
      {},
      '',
      '?username=different&startDate=2024-02-01&endDate=2024-02-28'
    );

    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: mockResults })
    });

    render(<App />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should update cache after successful fetch', async () => {
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: mockResults })
    });

    // Set URL parameters
    window.history.replaceState(
      {},
      '',
      '?username=testuser&startDate=2024-01-01&endDate=2024-01-31'
    );

    render(<App />);

    await waitFor(() => {
      const cachedData = JSON.parse(localStorage.getItem('github-search-results') || '{}');
      expect(cachedData.results).toEqual(mockResults);
    });
  });

  it('should handle cache clearing', async () => {
    // Set up initial cached results
    const cachedResults = {
      results: mockResults,
      timestamp: Date.now(),
      params: {
        username: 'testuser',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    };
    localStorage.setItem('github-search-results', JSON.stringify(cachedResults));

    render(<App />);

    // Find and click the clear button (assuming there's a clear button)
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await act(async () => {
      clearButton.click();
    });

    expect(localStorage.getItem('github-search-results')).toBeNull();
  });

  it('should handle network errors gracefully', async () => {
    // Mock failed API response
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // Set URL parameters
    window.history.replaceState(
      {},
      '',
      '?username=testuser&startDate=2024-01-01&endDate=2024-01-31'
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
}); 