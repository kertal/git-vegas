import { test, expect } from '@playwright/test';

test.describe('GitVegas Search and Filtering', () => {
  // Mock data for testing with various types of items
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
      {
        id: 4,
        title: 'Implement user authentication system',
        html_url: 'https://github.com/test/repo1/pull/4',
        state: 'closed',
        merged_at: '2024-01-15T14:30:00Z',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-15T14:30:00Z',
        body: 'This PR implements a complete user authentication system with JWT tokens.',
        user: {
          login: 'charlie',
          avatar_url: 'https://github.com/charlie.png',
          html_url: 'https://github.com/charlie',
        },
        labels: [
          { name: 'feature', color: '00ff00' },
          { name: 'security', color: 'ff0000' },
        ],
        repository_url: 'https://api.github.com/repos/test/repo1',
        pull_request: { 
          url: 'https://api.github.com/repos/test/repo1/pulls/4',
          merged_at: '2024-01-15T14:30:00Z'
        },
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
    await page.waitForTimeout(1000);
  });

  test.describe('Basic Search Functionality', () => {
    test('should perform basic text search', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Perform search
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.fill('authentication');
      await page.waitForTimeout(500);

      // Should show filtered results (use link role to be more specific)
      await expect(page.getByRole('link', { name: 'Fix authentication bug in login system' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Implement user authentication system' })).toBeVisible();
    });

    test('should clear search and show all results', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Perform search
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.fill('authentication');
      await page.waitForTimeout(500);

      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(500);

      // Should show all results (use link role to be more specific)
      await expect(page.getByRole('link', { name: 'Fix authentication bug in login system' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Add new feature for dashboard enhancement' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Update documentation for API endpoints' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Implement user authentication system' })).toBeVisible();
    });
  });

  test.describe('Advanced Search Syntax', () => {
    test('should filter by label', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Search by label
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.fill('label:bug');
      await page.waitForTimeout(500);

      // Should show only items with bug label
      await expect(page.getByRole('link', { name: 'Fix authentication bug in login system' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Add new feature for dashboard enhancement' })).not.toBeVisible();
    });

    test('should exclude by label', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Exclude by label
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.fill('-label:bug');
      await page.waitForTimeout(500);

      // Should not show items with bug label
      await expect(page.getByRole('link', { name: 'Fix authentication bug in login system' })).not.toBeVisible();
      await expect(page.getByRole('link', { name: 'Add new feature for dashboard enhancement' })).toBeVisible();
    });

    test('should filter by repository', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Search by repository
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.fill('repo:test/repo1');
      await page.waitForTimeout(500);

      // Should show only items from repo1
      await expect(page.getByRole('link', { name: 'Fix authentication bug in login system' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Add new feature for dashboard enhancement' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Update documentation for API endpoints' })).not.toBeVisible();
    });

    test('should exclude by repository', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Exclude by repository
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.fill('-repo:test/repo1');
      await page.waitForTimeout(500);

      // Should not show items from repo1
      await expect(page.getByRole('link', { name: 'Fix authentication bug in login system' })).not.toBeVisible();
      await expect(page.getByRole('link', { name: 'Add new feature for dashboard enhancement' })).not.toBeVisible();
      await expect(page.getByRole('link', { name: 'Update documentation for API endpoints' })).toBeVisible();
    });

    test('should filter by user', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Search by user
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.fill('user:alice');
      await page.waitForTimeout(500);

      // Should show only items by alice
      await expect(page.getByRole('link', { name: 'Fix authentication bug in login system' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Update documentation for API endpoints' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Add new feature for dashboard enhancement' })).not.toBeVisible();
    });
  });

  test.describe('Combined Search Filters', () => {
    test('should combine multiple filters', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Combined search
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.fill('label:bug repo:test/repo1');
      await page.waitForTimeout(500);

      // Should show only bug items from repo1
      await expect(page.getByRole('link', { name: 'Fix authentication bug in login system' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Add new feature for dashboard enhancement' })).not.toBeVisible();
      await expect(page.getByRole('link', { name: 'Update documentation for API endpoints' })).not.toBeVisible();
    });

    test('should handle complex search queries', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Complex search query
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.fill('user:alice label:bug -repo:test/repo2 authentication');
      await page.waitForTimeout(500);

      // Should filter appropriately
      await expect(page.getByRole('link', { name: 'Fix authentication bug in login system' })).toBeVisible();
    });
  });

  test.describe('Search Persistence', () => {
    test('should persist search across tab switches', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Perform search
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.fill('label:bug');
      await page.waitForTimeout(500);

      // Switch tabs
      await page.getByRole('link', { name: 'GitHub Events' }).click();
      await page.waitForTimeout(500);
      await page.getByRole('link', { name: 'Summary' }).click();
      await page.waitForTimeout(500);

      // Search should still be applied
      await expect(searchInput).toHaveValue('label:bug');
    });

    test('should persist search across page reloads', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Perform search
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.fill('authentication');
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForTimeout(1000);

      // Search should be restored
      await expect(searchInput).toHaveValue('authentication');
    });
  });

  test.describe('Search Performance', () => {
    test('should respond quickly to search input', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Measure search response time
      const searchInput = page.getByPlaceholder('Search');
      const startTime = Date.now();
      
      await searchInput.fill('bug');
      await page.waitForTimeout(300); // Wait for debounce
      
      const responseTime = Date.now() - startTime;
      
      // Search should respond within reasonable time (less than 1 second)
      expect(responseTime).toBeLessThan(1000);
    });

    test('should handle rapid search changes', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Rapid search changes
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.fill('bug');
      await page.waitForTimeout(100);
      await searchInput.fill('feature');
      await page.waitForTimeout(100);
      await searchInput.fill('documentation');
      await page.waitForTimeout(500);

      // Should handle rapid changes without errors
      await expect(searchInput).toHaveValue('documentation');
    });
  });

  test.describe('Search Edge Cases', () => {
    test('should handle empty search', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Empty search
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.fill('');
      await page.waitForTimeout(500);

      // Should show all results
      await expect(page.getByRole('link', { name: 'Fix authentication bug in login system' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Add new feature for dashboard enhancement' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Update documentation for API endpoints' })).toBeVisible();
    });

    test('should handle special characters in search', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Special characters
      const searchInput = page.getByPlaceholder('Search');
      const specialSearches = [
        'test@example.com',
        'user-name_123',
        'repo/name',
        'label:bug-fix',
        'user:test@domain.com'
      ];

      for (const search of specialSearches) {
        await searchInput.fill(search);
        await expect(searchInput).toHaveValue(search);
        await page.waitForTimeout(100);
      }
    });

    test('should handle very long search queries', async ({ page }) => {
      // Load data first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForTimeout(2000);

      // Long search query
      const searchInput = page.getByPlaceholder('Search');
      const longQuery = 'label:bug label:critical label:authentication repo:test/repo1 user:alice user:bob -repo:test/repo2 documentation feature enhancement';
      
      await searchInput.fill(longQuery);
      await expect(searchInput).toHaveValue(longQuery);
      await page.waitForTimeout(500);
    });
  });
}); 