
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import App from '../App';
import { parseUrlParams, cleanupUrlParams } from '../utils/urlState';

// Mock the GitHub API calls
vi.mock('../utils/githubSearch', () => ({
  performGitHubSearch: vi.fn().mockResolvedValue([])
}));

// Mock the offline detection
vi.mock('../hooks/useOfflineDetection', () => ({
  useOfflineDetection: () => false
}));

// Mock window.location and history
const mockLocation = {
  href: 'http://localhost:3000/',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: ''
};

const mockHistory = {
  replaceState: vi.fn()
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true
});

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn()
};

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true
});

describe('URL State Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    mockLocation.href = 'http://localhost:3000/';
    mockClipboard.writeText.mockResolvedValue(undefined);
    
    // Clear localStorage
    localStorage.clear();
  });

  const renderApp = () => {
    return render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
  };

  it('should apply URL parameters on app load and clean them up', async () => {
    // Set URL parameters
    mockLocation.search = '?username=urluser&apiMode=events&isCompactView=true&filter=issue&statusFilter=open';
    mockLocation.href = 'http://localhost:3000/?username=urluser&apiMode=events&isCompactView=true&filter=issue&statusFilter=open';
    
    renderApp();
    
    // Wait for the app to load and process URL parameters
    await waitFor(() => {
      // Check that username field is populated from URL
      const usernameInput = screen.getByLabelText(/github username/i);
      expect(usernameInput).toHaveValue('urluser');
    });
    
    // Check that API mode is set from URL
    await waitFor(() => {
      const eventsRadio = screen.getByLabelText(/events api/i);
      expect(eventsRadio).toBeChecked();
    });
    
    // Verify URL cleanup was called after applying URL params
    expect(mockHistory.replaceState).toHaveBeenCalledWith(
      {},
      '',
      'http://localhost:3000/'
    );
  });

  it('should generate and copy shareable URL when share button is clicked', async () => {
    renderApp();
    
    // Set some form values
    const usernameInput = screen.getByLabelText(/github username/i);
    fireEvent.change(usernameInput, { target: { value: 'shareuser' } });
    
    // Switch to events API
    const eventsRadio = screen.getByLabelText(/events api/i);
    fireEvent.click(eventsRadio);
    
    // Wait for state to update
    await waitFor(() => {
      expect(usernameInput).toHaveValue('shareuser');
      expect(eventsRadio).toBeChecked();
    });
    
    // Find and click the share button
    const shareButton = screen.getByRole('button', { name: /share current state/i });
    fireEvent.click(shareButton);
    
    // Verify clipboard was called with a URL containing the state
    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
      const copiedUrl = mockClipboard.writeText.mock.calls[0][0];
      expect(copiedUrl).toContain('username=shareuser');
      expect(copiedUrl).toContain('apiMode=events');
    });
  });

  it('should handle complex state sharing with filters', async () => {
    renderApp();
    
    // Set form values
    const usernameInput = screen.getByLabelText(/github username/i);
    fireEvent.change(usernameInput, { target: { value: 'complexuser' } });
    
    // Set date range
    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);
    fireEvent.change(startDateInput, { target: { value: '2024-02-01' } });
    fireEvent.change(endDateInput, { target: { value: '2024-02-28' } });
    
    // Switch to events API to access filters
    const eventsRadio = screen.getByLabelText(/events api/i);
    fireEvent.click(eventsRadio);
    
    await waitFor(() => {
      expect(eventsRadio).toBeChecked();
    });
    
    // Wait for filters to appear and interact with them
    await waitFor(() => {
      const filtersSection = screen.getByText(/filters/i);
      expect(filtersSection).toBeInTheDocument();
    });
    
    // Try to find and click filter controls
    // Note: This might need adjustment based on actual filter UI structure
    const filterButtons = screen.getAllByRole('button');
    const typeFilterButton = filterButtons.find(button => 
      button.textContent?.includes('Type') || button.textContent?.includes('All')
    );
    
    if (typeFilterButton) {
      fireEvent.click(typeFilterButton);
      
      // Look for issue filter option
      await waitFor(() => {
        const issueOption = screen.queryByText('Issues');
        if (issueOption) {
          fireEvent.click(issueOption);
        }
      });
    }
    
    // Click share button
    const shareButton = screen.getByRole('button', { name: /share current state/i });
    fireEvent.click(shareButton);
    
    // Verify the shared URL contains the complex state
    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
      const copiedUrl = mockClipboard.writeText.mock.calls[0][0];
      expect(copiedUrl).toContain('username=complexuser');
      expect(copiedUrl).toContain('startDate=2024-02-01');
      expect(copiedUrl).toContain('endDate=2024-02-28');
      expect(copiedUrl).toContain('apiMode=events');
    });
  });

  it('should preserve localStorage values when no URL parameters', async () => {
    // Set some localStorage values first
    localStorage.setItem('github-form-settings', JSON.stringify({
      username: 'localuser',
      startDate: '2024-01-15',
      endDate: '2024-01-30',
      githubToken: '',
      apiMode: 'search'
    }));
    
    renderApp();
    
    // Verify localStorage values are used
    await waitFor(() => {
      const usernameInput = screen.getByLabelText(/github username/i);
      expect(usernameInput).toHaveValue('localuser');
    });
    
    const startDateInput = screen.getByLabelText(/start date/i);
    expect(startDateInput).toHaveValue('2024-01-15');
    
    // Verify no URL cleanup was called (no URL params to clean)
    expect(mockHistory.replaceState).not.toHaveBeenCalled();
  });

  it('should override localStorage with URL parameters', async () => {
    // Set localStorage values
    localStorage.setItem('github-form-settings', JSON.stringify({
      username: 'localuser',
      startDate: '2024-01-15',
      endDate: '2024-01-30',
      githubToken: '',
      apiMode: 'search'
    }));
    
    // Set conflicting URL parameters
    mockLocation.search = '?username=urluser&startDate=2024-02-01&apiMode=events';
    mockLocation.href = 'http://localhost:3000/?username=urluser&startDate=2024-02-01&apiMode=events';
    
    renderApp();
    
    // Verify URL parameters override localStorage
    await waitFor(() => {
      const usernameInput = screen.getByLabelText(/github username/i);
      expect(usernameInput).toHaveValue('urluser'); // URL value, not localStorage
    });
    
    const startDateInput = screen.getByLabelText(/start date/i);
    expect(startDateInput).toHaveValue('2024-02-01'); // URL value
    
    const eventsRadio = screen.getByLabelText(/events api/i);
    expect(eventsRadio).toBeChecked(); // URL value
    
    // Verify URL cleanup after applying overrides
    expect(mockHistory.replaceState).toHaveBeenCalledWith(
      {},
      '',
      'http://localhost:3000/'
    );
  });

  it('should handle invalid URL parameters gracefully', async () => {
    // Set invalid URL parameters
    mockLocation.search = '?username=validuser&apiMode=invalid&startDate=bad-date&isCompactView=notboolean';
    mockLocation.href = 'http://localhost:3000/?username=validuser&apiMode=invalid&startDate=bad-date&isCompactView=notboolean';
    
    renderApp();
    
    // Should only apply valid parameters
    await waitFor(() => {
      const usernameInput = screen.getByLabelText(/github username/i);
      expect(usernameInput).toHaveValue('validuser'); // Valid parameter applied
    });
    
    // Invalid parameters should be ignored, defaults should be used
    const searchRadio = screen.getByLabelText(/search api/i);
    expect(searchRadio).toBeChecked(); // Default value, invalid apiMode ignored
    
    // URL should still be cleaned up
    expect(mockHistory.replaceState).toHaveBeenCalledWith(
      {},
      '',
      'http://localhost:3000/'
    );
  });

  it('should show success feedback when sharing', async () => {
    renderApp();
    
    const shareButton = screen.getByRole('button', { name: /share current state/i });
    fireEvent.click(shareButton);
    
    // Hover to see tooltip
    fireEvent.mouseEnter(shareButton);
    
    await waitFor(() => {
      expect(screen.getByText('Link copied to clipboard!')).toBeInTheDocument();
    });
  });

  it('should show error feedback when sharing fails', async () => {
    mockClipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
    
    renderApp();
    
    const shareButton = screen.getByRole('button', { name: /share current state/i });
    fireEvent.click(shareButton);
    
    // Hover to see tooltip
    fireEvent.mouseEnter(shareButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to copy to clipboard')).toBeInTheDocument();
    });
  });

  it('should handle URL encoding correctly', async () => {
    // Set URL with encoded characters
    mockLocation.search = '?username=test%20user&labelFilter=bug%2Bfeature';
    mockLocation.href = 'http://localhost:3000/?username=test%20user&labelFilter=bug%2Bfeature';
    
    renderApp();
    
    // Verify decoded values are applied
    await waitFor(() => {
      const usernameInput = screen.getByLabelText(/github username/i);
      expect(usernameInput).toHaveValue('test user'); // Decoded space
    });
    
    // URL should be cleaned up
    expect(mockHistory.replaceState).toHaveBeenCalledWith(
      {},
      '',
      'http://localhost:3000/'
    );
  });
});

// Unit tests for URL state utilities in isolation
describe('URL State Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    mockLocation.href = 'http://localhost:3000/';
  });

  it('should parse URL parameters correctly', () => {
    mockLocation.search = '?username=testuser&apiMode=events&isCompactView=true&excludedLabels=bug,feature';
    
    const result = parseUrlParams();
    
    expect(result).toEqual({
      username: 'testuser',
      apiMode: 'events',
      isCompactView: true,
      excludedLabels: ['bug', 'feature']
    });
  });

  it('should clean up URL parameters', () => {
    mockLocation.search = '?username=test&apiMode=events';
    mockLocation.href = 'http://localhost:3000/?username=test&apiMode=events';
    
    cleanupUrlParams();
    
    expect(mockHistory.replaceState).toHaveBeenCalledWith(
      {},
      '',
      'http://localhost:3000/'
    );
  });

  it('should not clean up when no parameters exist', () => {
    mockLocation.search = '';
    
    cleanupUrlParams();
    
    expect(mockHistory.replaceState).not.toHaveBeenCalled();
  });
}); 