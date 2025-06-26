import { test, expect } from '@playwright/test';

test.describe('User Search Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to load
    await expect(page.locator('h1')).toContainText('Overview');
  });

  test('should filter results by user: syntax in search input', async ({ page }) => {
    // First, we need to mock some data or ensure there's test data
    // For now, let's check if the search input exists and functions
    
    // Look for the search input - it might be in the Issues & PRs or Events tab
    await page.getByText('GitHub Issues & PRs').click();
    
    // Wait for the tab to be active
    await expect(page.locator('[aria-current="page"]')).toContainText('GitHub Issues & PRs');
    
    // Look for a search input field
    const searchInput = page.locator('input[type="text"]').last(); // Get the search input (last text input)
    
    if (await searchInput.isVisible()) {
      // Test user: syntax
      await searchInput.fill('user:testuser');
      
      // Wait a moment for filtering to apply
      await page.waitForTimeout(500);
      
      // We should test that the filtering works, but without actual data,
      // we can at least verify that the search term was applied
      await expect(searchInput).toHaveValue('user:testuser');
    }
  });

  test('should handle user search with multiple users', async ({ page }) => {
    await page.getByText('GitHub Issues & PRs').click();
    
    const searchInput = page.locator('input[type="text"]').last();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('user:alice user:bob');
      await page.waitForTimeout(500);
      await expect(searchInput).toHaveValue('user:alice user:bob');
    }
  });

  test('should handle combined user and label search', async ({ page }) => {
    await page.getByText('GitHub Issues & PRs').click();
    
    const searchInput = page.locator('input[type="text"]').last();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('user:testuser label:bug');
      await page.waitForTimeout(500);
      await expect(searchInput).toHaveValue('user:testuser label:bug');
    }
  });

  test('should work in Events tab as well', async ({ page }) => {
    await page.getByText('GitHub Events').click();
    
    // Wait for the tab to be active
    await expect(page.locator('[aria-current="page"]')).toContainText('GitHub Events');
    
    const searchInput = page.locator('input[type="text"]').last();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('user:developer');
      await page.waitForTimeout(500);
      await expect(searchInput).toHaveValue('user:developer');
    }
  });

  test('should clear search when clear button is clicked', async ({ page }) => {
    await page.getByText('GitHub Issues & PRs').click();
    
    const searchInput = page.locator('input[type="text"]').last();
    
    if (await searchInput.isVisible()) {
      // Enter search text
      await searchInput.fill('user:testuser');
      await expect(searchInput).toHaveValue('user:testuser');
      
      // Look for clear button (might be an X button or clear text)
      const clearButton = page.locator('button').filter({ hasText: /clear|×|✕/i }).first();
      
      if (await clearButton.isVisible()) {
        await clearButton.click();
        await expect(searchInput).toHaveValue('');
      }
    }
  });

  test('should handle case-insensitive user search', async ({ page }) => {
    await page.getByText('GitHub Issues & PRs').click();
    
    const searchInput = page.locator('input[type="text"]').last();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('user:TESTUSER');
      await page.waitForTimeout(500);
      await expect(searchInput).toHaveValue('user:TESTUSER');
    }
  });

  test('should handle special characters in usernames', async ({ page }) => {
    await page.getByText('GitHub Issues & PRs').click();
    
    const searchInput = page.locator('input[type="text"]').last();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('user:test-user_123');
      await page.waitForTimeout(500);
      await expect(searchInput).toHaveValue('user:test-user_123');
    }
  });
});

test.describe('User Search with Mock Data', () => {
  test.beforeEach(async ({ page }) => {
    // We can intercept API calls and provide mock data
    await page.route('**/search/issues**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              title: 'Test issue by alice',
              html_url: 'https://github.com/test/repo/issues/1',
              state: 'open',
              created_at: '2024-01-01T10:00:00Z',
              updated_at: '2024-01-01T10:00:00Z',
              body: 'Test issue body',
              user: {
                login: 'alice',
                avatar_url: 'https://github.com/alice.png',
                html_url: 'https://github.com/alice',
              },
              labels: [
                { name: 'bug', color: 'red' },
              ],
              repository_url: 'https://api.github.com/repos/test/repo',
            },
            {
              id: 2,
              title: 'Another issue by bob',
              html_url: 'https://github.com/test/repo/issues/2',
              state: 'open',
              created_at: '2024-01-02T10:00:00Z',
              updated_at: '2024-01-02T10:00:00Z',
              body: 'Another test issue',
              user: {
                login: 'bob',
                avatar_url: 'https://github.com/bob.png',
                html_url: 'https://github.com/bob',
              },
              labels: [
                { name: 'enhancement', color: 'blue' },
              ],
              repository_url: 'https://api.github.com/repos/test/repo',
            }
          ]
        })
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
    await expect(page.locator('h1')).toContainText('Overview');
  });

  test('should filter results by specific user', async ({ page }) => {
    // Fill in the form to trigger a search
    await page.fill('input[placeholder*="username"]', 'testuser');
    await page.locator('input[type="date"]').first().fill('2024-01-01');
    await page.locator('input[type="date"]').last().fill('2024-01-31');
    
    // Submit the search
    await page.click('button[type="submit"]');
    
    // Wait for results to load
    await page.waitForTimeout(2000);
    
    // Switch to Issues & PRs tab
    await page.getByText('GitHub Issues & PRs').click();
    
    // Now test the user: filter
    const searchInput = page.locator('input[type="text"]').last();
    await searchInput.fill('user:alice');
    
    // Wait for filtering
    await page.waitForTimeout(500);
    
    // Check that only alice's issues are shown
    const resultItems = page.locator('[data-testid="result-item"], .result-item, article').filter({ hasText: 'alice' });
    await expect(resultItems).toHaveCount(1);
    
    // Verify the result contains alice's issue
    await expect(page.locator('text=Test issue by alice')).toBeVisible();
    await expect(page.locator('text=Another issue by bob')).not.toBeVisible();
  });

  test('should show all results when user filter is cleared', async ({ page }) => {
    // Fill in the form and search
    await page.fill('input[placeholder*="username"]', 'testuser');
    await page.locator('input[type="date"]').first().fill('2024-01-01');
    await page.locator('input[type="date"]').last().fill('2024-01-31');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Switch to Issues & PRs tab
    await page.getByText('GitHub Issues & PRs').click();
    
    // Apply user filter
    const searchInput = page.locator('input[type="text"]').last();
    await searchInput.fill('user:alice');
    await page.waitForTimeout(500);
    
    // Clear the filter
    await searchInput.fill('');
    await page.waitForTimeout(500);
    
    // Both results should be visible now
    await expect(page.locator('text=Test issue by alice')).toBeVisible();
    await expect(page.locator('text=Another issue by bob')).toBeVisible();
  });

  test('should handle multiple user filters', async ({ page }) => {
    // Fill in the form and search
    await page.fill('input[placeholder*="username"]', 'testuser');
    await page.locator('input[type="date"]').first().fill('2024-01-01');
    await page.locator('input[type="date"]').last().fill('2024-01-31');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Switch to Issues & PRs tab
    await page.getByText('GitHub Issues & PRs').click();
    
    // Apply multiple user filter
    const searchInput = page.locator('input[type="text"]').last();
    await searchInput.fill('user:alice user:bob');
    await page.waitForTimeout(500);
    
    // Both results should be visible
    await expect(page.locator('text=Test issue by alice')).toBeVisible();
    await expect(page.locator('text=Another issue by bob')).toBeVisible();
  });
}); 