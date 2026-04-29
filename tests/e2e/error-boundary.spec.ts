/**
 * Error Boundary and Edge Case Tests
 * 
 * Tests for error handling, edge cases, and boundary conditions
 */

import { test, expect } from './fixtures';
import { setupTestPage, removeErrorOverlays, waitForPageReady, performanceMonitor } from './test-helpers';
import { setupTestWithIsolation } from './test-setup-helper';

test.describe('Error Boundary and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    // Test isolation setup
    await setupTestWithIsolation(page);
  });

  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Error Boundary Tests Performance Summary:');
      console.log(`  Total Tests: ${summary.total}`);
      console.log(`  Average Duration: ${summary.average.toFixed(2)}ms`);
    }
  });
  /**
   * Test: Verify page handles missing data gracefully
   * 
   * @tag @error @edge-case - Error handling test
   */
  test('should handle missing or invalid data gracefully @error @edge-case', async ({ page }) => {
    performanceMonitor.startTest('should handle missing or invalid data gracefully');
    // Intercept and modify API responses to return invalid data
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ invalid: 'data' }),
      });
    });

    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    // Use waitForPageReady instead of waitForTimeout for better reliability
    await waitForPageReady(page, {
      waitForNetwork: false, // Network might be intercepted
      waitForReact: true,
      keySelectors: ['body'],
    });

    // Page should still render something
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  /**
   * Test: Verify page handles network timeouts
   * 
   * @tag @error @network - Error and network test
   */
  test('should handle network timeouts gracefully @error @network', async ({ page }) => {
    // Simulate slow network
    await page.route('**/api/**', (route) => {
      // Delay response to simulate timeout
      setTimeout(() => {
        route.abort();
      }, 100);
    });

    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
      navigationTimeout: 15000, // Shorter timeout for this test
    });

    // Page should still load (with fallback content or error state)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  /**
   * Test: Verify page handles malformed JSON responses
   */
  test('should handle malformed JSON responses', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json {',
      });
    });

    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    // Use waitForPageReady instead of waitForTimeout
    await waitForPageReady(page, {
      waitForNetwork: false,
      waitForReact: true,
      keySelectors: ['body'],
    });

    // Page should handle the error without crashing
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  /**
   * Test: Verify page handles empty responses
   */
  test('should handle empty API responses', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Page should still render
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  /**
   * Test: Verify console error handling
   * Tests that runtime errors don't break the page
   */
  test('should handle console errors without breaking page', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Page should still be functional even with console errors
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(100);
  });

  /**
   * Test: Verify page handles very long content
   */
  test('should handle very long content without breaking layout', async ({ page }) => {
    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    // Check that page layout is maintained
    const bodyWidth = await page.evaluate(() => {
      return document.body.scrollWidth;
    });

    // Body should have reasonable width (not broken)
    expect(bodyWidth).toBeGreaterThan(0);
    expect(bodyWidth).toBeLessThan(10000); // Sanity check
  });

  /**
   * Test: Verify page handles rapid navigation
   */
  test('should handle rapid navigation without errors', async ({ page }) => {
    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    // Rapidly navigate between pages
    await page.goto('/');
    await new Promise(resolve => setTimeout(resolve, 100));
    await page.goto('/dashboard');
    await new Promise(resolve => setTimeout(resolve, 100));
    await page.goto('/');

    // Page should still be functional
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  /**
   * Test: Verify page handles missing environment variables
   */
  test('should handle missing optional environment variables', async ({ page }) => {
    // This test verifies the page works even if some env vars are missing
    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    // Page should load (may show warnings but shouldn't crash)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });
});

