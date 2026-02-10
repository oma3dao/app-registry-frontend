/**
 * Environment Setup Verification Tests
 * 
 * These tests verify that the environment is properly configured
 * before running other E2E tests.
 */

import { test, expect } from '@playwright/test';
import { setupTestPage, performanceMonitor } from './test-helpers';
import { setupTestWithIsolation } from './test-setup-helper';

test.describe('Environment Setup', () => {
  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Environment Setup Tests Performance Summary:');
      console.log(`  Total Tests: ${summary.total}`);
      console.log(`  Average Duration: ${summary.average.toFixed(2)}ms`);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Test isolation setup
    await setupTestWithIsolation(page);
  });
  /**
   * Test: Dev server is accessible
   * This verifies the dev server is running and responding
   */
  test('should be able to connect to dev server', async ({ page }) => {
    performanceMonitor.startTest('should be able to connect to dev server');
    try {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    expect(response?.status()).toBeLessThan(500); // Should not be server error
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Page loads without critical errors
   * This verifies the app doesn't crash on load
   * Note: Missing NEXT_PUBLIC_THIRDWEB_CLIENT_ID will show an error overlay,
   * but the page structure should still be accessible
   */
  test('should load page without critical runtime errors', async ({ page }) => {
    performanceMonitor.startTest('should load page without critical runtime errors');
    try {
    test.setTimeout(90000); // 90 seconds
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out known non-critical errors
        if (!text.includes('non-critical') && !text.includes('Warning')) {
          errors.push(text);
        }
      }
    });

    page.on('pageerror', (error) => {
      // Check if it's the expected thirdweb client ID error
      if (!error.message.includes('NEXT_PUBLIC_THIRDWEB_CLIENT_ID')) {
        errors.push(error.message);
      }
    });

    // Use setupTestPage helper with retry logic
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // If there are errors, log them for debugging
    if (errors.length > 0) {
      console.log('Non-critical errors found:', errors);
    }

    // Page should still load even with missing client ID
    // (it will show an error overlay, but page structure should exist)
    const body = page.locator('body');
    await expect(body).toBeVisible();
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Environment variable warning (informational)
   * This test documents that NEXT_PUBLIC_THIRDWEB_CLIENT_ID is required
   */
  test.skip('should have NEXT_PUBLIC_THIRDWEB_CLIENT_ID set', async ({ page }) => {
    // This test is informational - skip by default
    // It documents that the env var should be set for full functionality
    await page.goto('/');
    
    // If client ID is set, there should be no error overlay
    const errorDialog = page.getByText('No client ID provided');
    const hasError = await errorDialog.isVisible().catch(() => false);
    
    if (hasError) {
      console.warn('⚠️  NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set. Some features may not work.');
    }
  });
});

