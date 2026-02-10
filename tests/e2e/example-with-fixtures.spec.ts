/**
 * Example Test Using Custom Fixtures
 * 
 * This file demonstrates how to use the custom fixtures for cleaner test code.
 * It shows the benefits of using fixtures over manual setup in each test.
 * 
 * Run tests: npm run test:e2e
 */

import { test, expect } from './fixtures';
import { performanceMonitor } from './test-helpers';
import { setupTestWithIsolation } from './test-setup-helper';

test.describe('Example: Using Custom Fixtures', () => {
  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Example Fixtures Tests Performance Summary:');
      console.log(`  Total Tests: ${summary.total}`);
      console.log(`  Average Duration: ${summary.average.toFixed(2)}ms`);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Test isolation setup
    await setupTestWithIsolation(page);
  });
  /**
   * Example: Using landingPage fixture
   * The fixture automatically sets up the landing page, so we can jump straight to testing
   */
  test('landing page fixture example', async ({ landingPage }) => {
    performanceMonitor.startTest('landing page fixture example');
    try {
    // landingPage is already navigated to '/' and set up
    // No need for beforeEach or manual setup!
    
    // Use .first() to avoid strict mode violation (multiple h1 elements)
    await expect(landingPage.locator('h1').first()).toBeVisible();
    await expect(landingPage.locator('nav')).toBeVisible();
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Example: Using dashboardPage fixture
   * The fixture handles navigation and setup automatically
   */
  test('dashboard page fixture example', async ({ dashboardPage }) => {
    performanceMonitor.startTest('dashboard page fixture example');
    try {
    // dashboardPage is already navigated to '/dashboard' and set up
    
    // Check if authenticated (fixture handles this)
    const isAuth = await dashboardPage.getByText(/My Registered Applications/i).isVisible().catch(() => false);
    
    if (isAuth) {
      await expect(dashboardPage.getByText(/OMATrust Registry Developer Portal/i)).toBeVisible();
    } else {
      // Not authenticated - may stay on dashboard or redirect
      // Just verify page loaded (either dashboard or landing)
      const url = dashboardPage.url();
      expect(url).toMatch(/localhost:3000/);
    }
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Example: Using authenticatedPage fixture
   * Note: This will skip if authentication is not available
   */
  test('authenticated page fixture example', async ({ authenticatedPage }) => {
    performanceMonitor.startTest('authenticated page fixture example');
    try {
    // authenticatedPage is already authenticated and ready
    // This test will skip if auth is not available
    
    await expect(authenticatedPage.getByText(/My Registered Applications/i)).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /Register New App/i })).toBeVisible();
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });
});

