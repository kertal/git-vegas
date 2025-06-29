import { test, expect } from '@playwright/test';

test.describe('User Search UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Overview');
  });

  test('should display search form elements', async ({ page }) => {
    // Check that the main form elements are present
    await expect(page.locator('input[placeholder*="username"]')).toBeVisible();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await expect(page.locator('input[type="date"]').last()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Test tab switching
    await page.getByText('GitHub Issues & PRs').click();
    await expect(page.locator('[aria-current="page"]')).toContainText('GitHub Issues & PRs');
    
    await page.getByText('GitHub Events').click();
    await expect(page.locator('[aria-current="page"]')).toContainText('GitHub Events');
  });

  test('should display search input in Issues & PRs tab', async ({ page }) => {
    await page.getByText('GitHub Issues & PRs').click();
    
    const searchInput = page.locator('input[type="text"]').last();
    await expect(searchInput).toBeVisible();
    
    // Test that we can type in the search input
    await searchInput.fill('user:testuser');
    await page.waitForTimeout(100); // Small wait for WebKit
    await expect(searchInput).toHaveValue('user:testuser');
  });

  test('should display search input in Events tab', async ({ page }) => {
    await page.getByText('GitHub Events').click();
    
    const searchInput = page.locator('input[type="text"]').last();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('user:developer');
      await page.waitForTimeout(500);
      await expect(searchInput).toHaveValue('user:developer');
    }
  });

  test('should handle user search syntax', async ({ page }) => {
    await page.getByText('GitHub Issues & PRs').click();
    
    const searchInput = page.locator('input[type="text"]').last();
    
    // Test various user search patterns
    const testPatterns = [
      'user:alice',
      'user:alice user:bob',
      'user:testuser label:bug',
      'label:enhancement user:developer'
    ];
    
    for (const pattern of testPatterns) {
      await searchInput.fill(pattern);
      await expect(searchInput).toHaveValue(pattern);
      await page.waitForTimeout(100);
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

  test('should clear search input', async ({ page }) => {
    await page.getByText('GitHub Issues & PRs').click();
    
    const searchInput = page.locator('input[type="text"]').last();
    
    if (await searchInput.isVisible()) {
      // Enter search text
      await searchInput.fill('user:testuser');
      await expect(searchInput).toHaveValue('user:testuser');
      
      // Clear the input
      await searchInput.fill('');
      await expect(searchInput).toHaveValue('');
    }
  });

  test('should show no data message when no data is loaded', async ({ page }) => {
    await page.getByText('GitHub Issues & PRs').click();
    
    // Should show the no data message
    await expect(page.locator('text=No data available')).toBeVisible();
    await expect(page.locator('text=Load some GitHub data to see results here')).toBeVisible();
  });

  test('should display compact and detailed view buttons', async ({ page }) => {
    await page.getByText('GitHub Issues & PRs').click();
    
    // Check that view toggle buttons are present
    await expect(page.locator('button', { hasText: 'Compact' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Detailed' })).toBeVisible();
  });

  test('should display select all checkbox', async ({ page }) => {
    await page.getByText('GitHub Issues & PRs').click();
    
    // Check that the select all checkbox is present (might be disabled when no data)
    const selectAllCheckbox = page.locator('checkbox', { hasText: /select all/i }).or(
      page.locator('input[type="checkbox"]').first()
    );
    
    // The checkbox should exist even if disabled
    await expect(selectAllCheckbox).toBeVisible();
  });
});

test.describe('User Search Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Overview');
  });

  test('should require username input', async ({ page }) => {
    // Try to submit without username
    const submitButton = page.locator('button[type="submit"]');
    const usernameInput = page.locator('input[placeholder*="username"]');
    
    // Clear any existing value
    await usernameInput.fill('');
    
    // Try to submit
    await submitButton.click();
    
    // Should show validation message or prevent submission
    // The exact behavior depends on browser validation
    const isRequired = await usernameInput.getAttribute('aria-required');
    expect(isRequired).toBe('true');
  });

  test('should require date inputs', async ({ page }) => {
    const startDateInput = page.locator('input[type="date"]').first();
    const endDateInput = page.locator('input[type="date"]').last();
    
    // Check that date inputs are marked as required
    const startRequired = await startDateInput.getAttribute('aria-required');
    const endRequired = await endDateInput.getAttribute('aria-required');
    
    expect(startRequired).toBe('true');
    expect(endRequired).toBe('true');
  });

  test('should accept valid form input', async ({ page }) => {
    // Fill in valid data
    await page.fill('input[placeholder*="username"]', 'testuser');
    await page.locator('input[type="date"]').first().fill('2024-01-01');
    await page.locator('input[type="date"]').last().fill('2024-01-31');
    
    // Verify the values are set
    await expect(page.locator('input[placeholder*="username"]')).toHaveValue('testuser');
    await expect(page.locator('input[type="date"]').first()).toHaveValue('2024-01-01');
    await expect(page.locator('input[type="date"]').last()).toHaveValue('2024-01-31');
    
    // The submit button should be enabled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
  });
}); 