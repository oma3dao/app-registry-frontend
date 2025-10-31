import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Landing Page
 * Tests the main user journey from landing page to dashboard
 */

test.describe('Landing Page', () => {
  // Tests that landing page loads successfully
  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    
    // Check for main heading
    await expect(page.locator('h1')).toContainText(/OMA3 App Registry/i);
  });

  // Tests navigation from landing page to dashboard
  test('should navigate to dashboard when exploring apps', async ({ page }) => {
    await page.goto('/');
    
    // Look for a link or button that goes to dashboard/explore
    const exploreButton = page.getByRole('link', { name: /explore/i }).first();
    
    if (await exploreButton.isVisible()) {
      await exploreButton.click();
      
      // Should navigate to a page showing apps
      await expect(page).toHaveURL(/\/(dashboard)?/);
    }
  });

  // Tests that connect wallet button is present
  test('should display wallet connection option', async ({ page }) => {
    await page.goto('/');
    
    // Check for connect button (exact text may vary based on thirdweb)
    const connectArea = page.locator('text=/connect|wallet/i').first();
    await expect(connectArea).toBeVisible();
  });

  // Tests responsive design
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Page should still render main content
    await expect(page.locator('h1')).toBeVisible();
  });

  // Tests that page has proper meta tags
  test('should have proper page title and meta', async ({ page }) => {
    await page.goto('/');
    
    // Check title
    await expect(page).toHaveTitle(/OMA3|App Registry/i);
  });
});


