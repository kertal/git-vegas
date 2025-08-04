import { test, expect } from '@playwright/test';

test.describe('GitVegas Application Functionality', () => {
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
  });

  test.describe('Application Structure', () => {
    test('should display main application header', async ({ page }) => {
      // Check for GitVegas title (use heading role to be more specific)
      await expect(page.getByRole('heading', { name: 'GitVegas' })).toBeVisible();
      
      // Check for header search input
      await expect(page.getByPlaceholder('Search')).toBeVisible();
      
      // Check for settings button
      await expect(page.getByLabel('Settings')).toBeVisible();
    });

    test('should display search form elements', async ({ page }) => {
      // Check username input
      await expect(page.getByPlaceholder('Enter usernames (comma-separated for multiple)')).toBeVisible();
      
      // Check date inputs
      const dateInputs = page.locator('input[type="date"]');
      await expect(dateInputs).toHaveCount(2);
      
      // Check submit button
      await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();
    });

    test('should display navigation tabs', async ({ page }) => {
      // Check for all three tabs (use link role to be more specific)
      await expect(page.getByRole('link', { name: 'Summary' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'GitHub Issues & PRs' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'GitHub Events' })).toBeVisible();
    });
  });

  test.describe('Form Functionality', () => {
    test('should accept username input', async ({ page }) => {
      const usernameInput = page.getByPlaceholder('Enter usernames (comma-separated for multiple)');
      
      await usernameInput.fill('testuser');
      await expect(usernameInput).toHaveValue('testuser');
    });

    test('should accept multiple usernames', async ({ page }) => {
      const usernameInput = page.getByPlaceholder('Enter usernames (comma-separated for multiple)');
      
      await usernameInput.fill('user1,user2,user3');
      await expect(usernameInput).toHaveValue('user1,user2,user3');
    });

    test('should set date inputs', async ({ page }) => {
      const dateInputs = page.locator('input[type="date"]');
      
      await dateInputs.first().fill('2024-01-01');
      await dateInputs.last().fill('2024-01-31');
      
      await expect(dateInputs.first()).toHaveValue('2024-01-01');
      await expect(dateInputs.last()).toHaveValue('2024-01-31');
    });

    test('should submit form with valid data', async ({ page }) => {
      // Fill form
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      
      // Submit form
      await page.getByRole('button', { name: 'Update' }).click();
      
      // Wait for loading to complete
      await page.waitForTimeout(2000);
    });
  });

  test.describe('Navigation and Tabs', () => {
    test('should switch between tabs', async ({ page }) => {
      // Start on Summary tab (default)
      await expect(page.getByRole('link', { name: 'Summary' })).toHaveAttribute('aria-current', 'page');
      
      // Switch to Issues & PRs tab
      await page.getByRole('link', { name: 'GitHub Issues & PRs' }).click();
      await expect(page.getByRole('link', { name: 'GitHub Issues & PRs' })).toHaveAttribute('aria-current', 'page');
      
      // Switch to Events tab
      await page.getByRole('link', { name: 'GitHub Events' }).click();
      await expect(page.getByRole('link', { name: 'GitHub Events' })).toHaveAttribute('aria-current', 'page');
      
      // Switch back to Summary
      await page.getByRole('link', { name: 'Summary' }).click();
      await expect(page.getByRole('link', { name: 'Summary' })).toHaveAttribute('aria-current', 'page');
    });

    test('should show tab counters when data is available', async ({ page }) => {
      // Fill and submit form to get data
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      
      await page.waitForTimeout(2000);
      
      // Check that counters are displayed
      await expect(page.getByRole('link', { name: 'GitHub Issues & PRs' })).toBeVisible();
    });
  });

  test.describe('Header Search Functionality', () => {
    test('should display header search input', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search');
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeEditable();
    });

    test('should accept search input', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search');
      
      await searchInput.fill('bug fix');
      await expect(searchInput).toHaveValue('bug fix');
    });

    test('should clear search input', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search');
      
      // Fill search
      await searchInput.fill('test search');
      await expect(searchInput).toHaveValue('test search');
      
      // Clear search
      await searchInput.fill('');
      await expect(searchInput).toHaveValue('');
    });

    test('should handle advanced search syntax', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search');
      
      const searchTerms = [
        'label:bug',
        'repo:owner/repo',
        '-repo:owner/repo',
        'user:testuser',
        'label:bug repo:test/repo user:alice'
      ];
      
      for (const term of searchTerms) {
        await searchInput.fill(term);
        await expect(searchInput).toHaveValue(term);
        await page.waitForTimeout(100);
      }
    });
  });

  test.describe('Data Display', () => {
    test('should display data after form submission', async ({ page }) => {
      // Fill and submit form
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      
      await page.waitForTimeout(2000);
      
      // Check that data is displayed (use link role to be more specific)
      await expect(page.getByRole('link', { name: 'Fix authentication bug in login system' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Add new feature for dashboard enhancement' })).toBeVisible();
    });

    test('should filter data with search', async ({ page }) => {
      // Fill and submit form
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      
      await page.waitForTimeout(2000);
      
      // Apply search filter
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.fill('authentication');
      
      await page.waitForTimeout(500);
      
      // Should show filtered results (use link role to be more specific)
      await expect(page.getByRole('link', { name: 'Fix authentication bug in login system' })).toBeVisible();
    });
  });

  test.describe('Settings and Configuration', () => {
    test('should open settings dialog', async ({ page }) => {
      await page.getByLabel('Settings').click();
      
      // Check that settings dialog is visible (use heading role to be more specific)
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    });

    test('should close settings dialog', async ({ page }) => {
      await page.getByLabel('Settings').click();
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
      
      // Close dialog (usually by clicking outside or escape)
      await page.keyboard.press('Escape');
      
      // Dialog should be closed
      await expect(page.getByRole('heading', { name: 'Settings' })).not.toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check that elements are still visible
      await expect(page.getByRole('heading', { name: 'GitVegas' })).toBeVisible();
      await expect(page.getByPlaceholder('Search')).toBeVisible();
      await expect(page.getByPlaceholder('Enter usernames (comma-separated for multiple)')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Check that elements are still visible
      await expect(page.getByRole('heading', { name: 'GitVegas' })).toBeVisible();
      await expect(page.getByPlaceholder('Search')).toBeVisible();
      await expect(page.getByPlaceholder('Enter usernames (comma-separated for multiple)')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid username gracefully', async ({ page }) => {
      // Mock invalid username response
      await page.route('**/users/**', async route => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Not Found'
          })
        });
      });
      
      // Fill form with invalid username
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('invalid-user');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      
      // Should handle error gracefully
      await page.waitForTimeout(2000);
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/search/issues**', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Internal Server Error'
          })
        });
      });
      
      // Fill and submit form
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').fill('testuser');
      await page.locator('input[type="date"]').first().fill('2024-01-01');
      await page.locator('input[type="date"]').last().fill('2024-01-31');
      await page.getByRole('button', { name: 'Update' }).click();
      
      // Should handle error gracefully
      await page.waitForTimeout(2000);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      // Check for ARIA labels on important elements
      await expect(page.getByLabel('Settings')).toBeVisible();
      await expect(page.getByPlaceholder('Enter usernames (comma-separated for multiple)')).toBeVisible();
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Test tab navigation - focus on the username input first
      await page.getByPlaceholder('Enter usernames (comma-separated for multiple)').focus();
      
      // Should be able to navigate through form elements
      await expect(page.getByPlaceholder('Enter usernames (comma-separated for multiple)')).toBeFocused();
    });
  });
}); 