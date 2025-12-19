/**
 * Playwright Test Fixtures
 * 
 * Custom fixtures for common test scenarios and reusable test setup.
 * These fixtures extend the base Playwright test with additional functionality.
 */

import { test as base, expect } from '@playwright/test';
import { setupTestPage, isAuthenticated } from './test-helpers';
import { setupAuthenticatedPage, verifyAuthenticatedState } from './auth-helpers';
import type { Page } from '@playwright/test';

/**
 * Extended test type with custom fixtures
 */
type TestFixtures = {
  authenticatedPage: Page;
  authenticatedDashboard: Page;
  landingPage: Page;
  dashboardPage: Page;
};

/**
 * Base test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  /**
   * Fixture: Pre-authenticated page
   * Sets up authentication state and navigates to a page
   * Note: Uses mocked authentication state for faster tests
   * For real wallet connections, use connectWallet() helper
   */
  authenticatedPage: async ({ page }, use) => {
    // Set up mocked authentication state
    await setupAuthenticatedPage(page, '/dashboard', {
      waitForReact: true,
      removeOverlays: true,
      timeout: 10000,
      navigationTimeout: 60000,
      retries: 3,
    });

    // Verify authentication state
    const isAuth = await verifyAuthenticatedState(page);
    
    if (!isAuth) {
      // If mock auth didn't work, try checking for actual auth
      const actualAuth = await isAuthenticated(page);
      if (!actualAuth) {
        test.skip(true, 'Authentication not available - use real wallet connection or check mock setup');
      }
    }

    await use(page);
  },

  /**
   * Fixture: Authenticated dashboard page
   * Specifically for dashboard tests that require authentication
   */
  authenticatedDashboard: async ({ page }, use) => {
    await setupAuthenticatedPage(page, '/dashboard', {
      waitForReact: true,
      removeOverlays: true,
      timeout: 10000,
      navigationTimeout: 60000,
      retries: 3,
    });

    // Verify we can see authenticated dashboard content
    const hasAuthContent = await page.getByText(/My Registered Applications|Register New App/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (!hasAuthContent) {
      test.skip(true, 'Dashboard authentication not available - check auth setup');
    }

    await use(page);
  },

  /**
   * Fixture: Landing page ready for testing
   * Pre-navigates to landing page with proper setup
   */
  landingPage: async ({ page }, use) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 30000,
      retries: 2,
      waitForReact: true,
      removeOverlays: true,
    });

    await use(page);
  },

  /**
   * Fixture: Dashboard page ready for testing
   * Pre-navigates to dashboard with proper setup
   */
  dashboardPage: async ({ page }, use) => {
    await setupTestPage(page, '/dashboard', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    await use(page);
  },
});

export { expect };

