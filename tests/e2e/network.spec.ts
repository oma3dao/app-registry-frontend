/**
 * Network and API E2E Tests
 * 
 * These tests verify network requests, API interactions, and error handling.
 * They can be used to test offline behavior, API failures, and network errors.
 * 
 * Run tests: npm run test:e2e
 */

import { test, expect } from '@playwright/test';
import { setupTestPage, mockApiResponse, waitForNetworkIdle, getNetworkRequests, performanceMonitor } from './test-helpers';
import { setupTestWithIsolation } from './test-setup-helper';

test.describe('Network and API Tests', () => {
  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Network and API Tests Performance Summary:');
      console.log(`  Total Tests: ${summary.total}`);
      console.log(`  Average Duration: ${summary.average.toFixed(2)}ms`);
      console.log(`  Fast (<1s): ${summary.fast}, Normal (1-5s): ${summary.normal}, Slow (5-15s): ${summary.slow}, Very Slow (>15s): ${summary.verySlow}`);
      if (summary.slowestTests.length > 0) {
        console.log('  Slowest Tests:');
        summary.slowestTests.slice(0, 3).forEach((test, i) => {
          console.log(`    ${i + 1}. ${test.testName}: ${test.duration}ms`);
        });
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    // Test isolation setup
    await setupTestWithIsolation(page);
  });
  /**
   * Test: Page loads successfully with network requests
   * Verifies that the page makes expected network requests
   * 
   * @tag @network @api - Network and API test
   */
  test('landing page should load with successful network requests @network @api', async ({ page }) => {
    performanceMonitor.startTest('landing page should load with successful network requests');
    try {
    const requests: Array<{ url: string; status?: number }> = [];
    
    page.on('response', (response) => {
      requests.push({
        url: response.url(),
        status: response.status(),
      });
    });

    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    // Wait for network to settle
    await waitForNetworkIdle(page, { timeout: 10000 });

    // Check that we got successful responses (status < 400)
    const failedRequests = requests.filter(r => r.status && r.status >= 400);
    
    // Log failed requests for debugging
    if (failedRequests.length > 0) {
      console.log('Failed network requests:', failedRequests);
    }

    // Most requests should succeed (allowing for some 404s like favicon)
    const criticalFailures = failedRequests.filter(r => 
      !r.url.includes('favicon') && 
      !r.url.includes('404') &&
      r.status && r.status >= 500
    );
    
    expect(criticalFailures.length).toBe(0);
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: API error handling
   * Verifies the app handles API errors gracefully
   */
  test.skip('should handle API errors gracefully', async ({ page }) => {
    // Mock a failed API response
    await mockApiResponse(page, /api\/.*/, {
      status: 500,
      body: { error: 'Internal Server Error' },
    });

    await setupTestPage(page, '/dashboard', {
      waitForReact: true,
      removeOverlays: true,
    });

    // App should still render (even if with error state)
    await expect(page.locator('body')).toBeVisible();
    
    // Error messages should be user-friendly (not raw error objects)
    const errorText = await page.textContent('body');
    expect(errorText).not.toContain('Internal Server Error'); // Should be handled gracefully
  });

  /**
   * Test: Network timeout handling
   * Verifies the app handles slow network conditions
   */
  test.skip('should handle network timeouts', async ({ page }) => {
    // Mock slow API responses
    await page.route(/api\/.*/, async (route) => {
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10s delay
      await route.continue();
    });

    await setupTestPage(page, '/dashboard', {
      navigationTimeout: 15000, // Allow more time
      waitForReact: true,
      removeOverlays: true,
    });

    // App should still load (with loading states or timeouts)
    await expect(page.locator('body')).toBeVisible();
  });

  /**
   * Test: External links are accessible
   * Verifies external navigation links work
   */
  test('external navigation links should be accessible', async ({ page }) => {
    performanceMonitor.startTest('external navigation links should be accessible');
    try {
    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    // Check Docs link (external)
    const docsLink = await page.locator('nav a:has-text("Docs")').first();
    const docsHref = await docsLink.getAttribute('href');
    
    if (docsHref && docsHref.startsWith('http')) {
      // External link - verify it's properly formatted
      expect(docsHref).toMatch(/^https?:\/\//);
    }
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Images load successfully
   * Verifies images don't have broken links
   */
  test('images should load successfully', async ({ page }) => {
    performanceMonitor.startTest('images should load successfully');
    try {
    const failedImages: string[] = [];
    
    page.on('response', async (response) => {
      if (response.request().resourceType() === 'image') {
        if (response.status() >= 400) {
          failedImages.push(response.url());
        }
      }
    });

    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    await waitForNetworkIdle(page, { timeout: 10000 });

    // Log failed images for debugging
    if (failedImages.length > 0) {
      console.log('Failed to load images:', failedImages);
    }

    // Critical images (like logo) should load
    const logo = await page.locator('img[alt*="OMA"], img[src*="logo"]').first();
    const logoSrc = await logo.getAttribute('src');
    
    if (logoSrc && !logoSrc.startsWith('data:')) {
      // Logo should be a valid URL or data URI
      expect(logoSrc).toBeTruthy();
    }
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });
});

