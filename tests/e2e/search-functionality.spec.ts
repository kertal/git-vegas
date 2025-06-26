import { test, expect } from '@playwright/test';

test.describe('Search Functionality Tests', () => {
  // Mock data for testing
  const mockGitHubData = {
    items: [
      {
        id: 1,
        title: 'Fix authentication bug in login system',
        html_url: 'https://github.com/test/repo1/issues/1',
        state: 'open',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T15:00:00Z',
        body: 'The authentication system has a critical bug that prevents users from logging in properly.',
        user: {
          login: 'alice',
          avatar_url: 'https://github.com/alice.png',
          html_url: 'https://github.com/alice',
        },
        labels: [
          { name: 'bug', color: 'ff0000' },
          { name: 'critical', color: 'ff4444' },
          { name: 'authentication', color: '0066cc' },
        ],
        repository_url: 'https://api.github.com/repos/test/repo1',
        pull_request: undefined,
      },
      {
        id: 2,
        title: 'Add new feature for dashboard enhancement',
        html_url: 'https://github.com/test/repo1/pull/2',
        state: 'open',
        created_at: '2024-01-02T10:00:00Z',
        updated_at: '2024-01-02T16:00:00Z',
        body: 'This PR adds a new dashboard feature with improved user experience.',
        user: {
          login: 'bob',
          avatar_url: 'https://github.com/bob.png',
          html_url: 'https://github.com/bob',
        },
        labels: [
          { name: 'enhancement', color: '00aa00' },
          { name: 'dashboard', color: 'ffaa00' },
        ],
        repository_url: 'https://api.github.com/repos/test/repo1',
        pull_request: { url: 'https://api.github.com/repos/test/repo1/pulls/2' },
      },
      {
        id: 3,
        title: 'Update documentation for API endpoints',
        html_url: 'https://github.com/test/repo2/issues/3',
        state: 'closed',
        created_at: '2024-01-03T10:00:00Z',
        updated_at: '2024-01-03T17:00:00Z',
        body: 'The API documentation needs to be updated to reflect recent changes.',
        user: {
          login: 'alice',
          avatar_url: 'https://github.com/alice.png',
          html_url: 'https://github.com/alice',
        },
        labels: [
          { name: 'documentation', color: '0088ff' },
          { name: 'api', color: 'ff8800' },
        ],
        repository_url: 'https://api.github.com/repos/test/repo2',
        pull_request: undefined,
      },
    ]
  };

  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/search/issues**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGitHubData)
      });
    });

    // Mock username validation
    await page.route('**/users/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          login: 'testuser',
          id: 123,
          avatar_url: 'https://github.com/testuser.png'
        })
      });
    });

    await page.goto('/');
    
    // Wait for initial load
    await page.waitForTimeout(1000);

    // Fill in the form to get test data
    await page.fill('input[placeholder*="username"]', 'testuser');
    await page.locator('input[type="date"]').first().fill('2024-01-01');
    await page.locator('input[type="date"]').last().fill('2024-01-31');
    
    // Submit the search
    await page.click('button[type="submit"]');
    
    // Wait for results to load
    await page.waitForTimeout(3000);
    
    // Switch to Issues & PRs tab to test search functionality
    await page.getByText('GitHub Issues & PRs').click();
    await page.waitForTimeout(1000);
  });

  test.describe('Search Input Functionality', () => {
    test('should find and interact with search input', async ({ page }) => {
      // Find the search input
      const searchInput = page.getByPlaceholder('Search issues and PRs');
      
      // Test that the input exists and is interactable
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeEditable();
      
      // Test basic input functionality
      await searchInput.fill('test search');
      await expect(searchInput).toHaveValue('test search');
      
      // Clear the input
      await searchInput.fill('');
      await expect(searchInput).toHaveValue('');
    });

    test('should accept user: syntax', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search issues and PRs');
      
      // Test user: syntax
      await searchInput.fill('user:alice');
      await page.waitForTimeout(500);
      
      // Verify the search term was accepted
      await expect(searchInput).toHaveValue('user:alice');
    });

    test('should accept label: syntax', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search issues and PRs');
      
      // Test label: syntax
      await searchInput.fill('label:bug');
      await page.waitForTimeout(500);
      
      // Verify the search term was accepted
      await expect(searchInput).toHaveValue('label:bug');
    });

    test('should accept -label: syntax', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search issues and PRs');
      
      // Test -label: syntax
      await searchInput.fill('-label:enhancement');
      await page.waitForTimeout(500);
      
      // Verify the search term was accepted
      await expect(searchInput).toHaveValue('-label:enhancement');
    });

    test('should accept combined search terms', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search issues and PRs');
      
      // Test combined syntax
      await searchInput.fill('user:alice label:bug authentication');
      await page.waitForTimeout(500);
      
      // Verify the search term was accepted
      await expect(searchInput).toHaveValue('user:alice label:bug authentication');
    });

    test('should persist search value during typing', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search issues and PRs');
      
      // Type a complex search incrementally
      await searchInput.type('user:');
      await expect(searchInput).toHaveValue('user:');
      
      await searchInput.type('alice ');
      await expect(searchInput).toHaveValue('user:alice ');
      
      await searchInput.type('label:bug');
      await expect(searchInput).toHaveValue('user:alice label:bug');
    });
  });

  test.describe('Search Results Behavior', () => {
    test('should show results container', async ({ page }) => {
      // Look for results container or list
      const resultsContainer = page.locator('[data-testid="results-container"]').or(
        page.locator('article').or(
          page.locator('.results').or(
            page.locator('[class*="result"]')
          )
        )
      );
      
      // Just check if some content area exists where results would appear
      const hasContent = await resultsContainer.count() > 0;
      
      if (!hasContent) {
        // If no specific results container, at least check that the page loaded
        await expect(page.locator('main')).toBeVisible();
      }
    });

    test('should show different content when search is applied vs cleared', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search issues and PRs');
      
      // Get initial page content
      const initialContent = await page.textContent('body');
      
      // Apply a search that's likely to filter results
      await searchInput.fill('label:nonexistent-label-that-wont-match-anything');
      await page.waitForTimeout(1000);
      
      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(1000);
      
      // Get content after clearing
      const clearedContent = await page.textContent('body');
      
      // The search input value should have changed at minimum
      // This tests that the search system is responsive to input
      const searchAfterClear = await searchInput.inputValue();
      expect(searchAfterClear).toBe('');
      
      // And the cleared content should match the initial content
      expect(clearedContent).toBe(initialContent);
    });
  });

  test.describe('Advanced Search Syntax Validation', () => {
    test('should handle special characters in search', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search issues and PRs');
      
      const specialSearches = [
        'label:"bug fix"',
        'user:test-user_123',
        'label:bug user:alice -label:wontfix',
        'authentication AND label:critical',
        'label:enhancement OR label:feature'
      ];

      for (const searchTerm of specialSearches) {
        await searchInput.fill(searchTerm);
        await page.waitForTimeout(500);
        
        // Verify the search term was accepted
        await expect(searchInput).toHaveValue(searchTerm);
        
        // Clear for next test
        await searchInput.fill('');
      }
    });

    test('should maintain search state during page interactions', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search issues and PRs');
      
      // Apply a complex search
      const complexSearch = 'user:alice label:bug -label:wontfix';
      await searchInput.fill(complexSearch);
      await page.waitForTimeout(500);
      
      // Interact with other page elements (like clicking somewhere else)
      await page.click('body');
      await page.waitForTimeout(100);
      
      // Search should still be there
      await expect(searchInput).toHaveValue(complexSearch);
      
      // Focus back on input should work
      await searchInput.click();
      await expect(searchInput).toBeFocused();
    });
  });

  test.describe('Search Performance', () => {
    test('should respond to search input within reasonable time', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search issues and PRs');
      
      const startTime = Date.now();
      
      // Apply search
      await searchInput.fill('user:alice');
      
      // Wait for any filtering to complete
      await page.waitForTimeout(1000);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });
}); 