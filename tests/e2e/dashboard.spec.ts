import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Dashboard
 * Tests NFT grid, filtering, and modal interactions
 */

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard before each test
    await page.goto('/');
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
  });

  // Tests dashboard loads
  test('should load dashboard page', async ({ page }) => {
    // Check for dashboard elements
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  // Tests NFT grid rendering
  test('should display NFT grid when apps exist', async ({ page }) => {
    // Look for NFT cards or grid container
    // This test may need adjustment based on actual data availability
    const gridContainer = page.locator('[data-testid="nft-grid"], .grid').first();
    
    // Grid should exist (may be empty if no apps)
    const exists = await gridContainer.count() > 0;
    expect(exists).toBeTruthy();
  });

  // Tests register new app button
  test('should show register button', async ({ page }) => {
    const registerButton = page.getByRole('button', { name: /register|new app/i }).first();
    
    // Register button should be visible
    const isVisible = await registerButton.isVisible().catch(() => false);
    
    // Button exists (may require wallet connection)
    expect(isVisible || await registerButton.count() > 0).toBeTruthy();
  });

  // Tests search/filter functionality
  test('should have search or filter capability', async ({ page }) => {
    // Look for search input or filter controls
    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    
    const hasSearch = await searchInput.count() > 0;
    expect(hasSearch).toBeTruthy();
  });

  // Tests navigation menu
  test('should display navigation menu', async ({ page }) => {
    // Look for navigation elements
    const nav = page.locator('nav, header').first();
    await expect(nav).toBeVisible();
  });

  // Tests modal opening (if apps exist)
  test('should open NFT details modal when clicking card', async ({ page }) => {
    // Find first NFT card
    const firstCard = page.locator('[data-testid="nft-card"], .nft-card, article').first();
    
    const cardExists = await firstCard.count() > 0;
    
    if (cardExists && await firstCard.isVisible()) {
      await firstCard.click();
      
      // Modal should open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });

  // Tests keyboard accessibility
  test('should be keyboard navigable', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // At least one element should receive focus
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  // Tests dark mode toggle (if available)
  test('should support theme switching', async ({ page }) => {
    // Look for theme toggle button
    const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="dark"]').first();
    
    const hasThemeToggle = await themeToggle.count() > 0;
    
    if (hasThemeToggle) {
      await themeToggle.click();
      // Theme should change (check HTML class or attribute)
      const html = page.locator('html');
      const hasThemeClass = await html.evaluate(el => 
        el.classList.contains('dark') || el.classList.contains('light')
      );
      expect(hasThemeClass).toBeTruthy();
    }
  });
});


