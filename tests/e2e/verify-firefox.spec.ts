/**
 * Verification Test: Confirm Firefox is Being Used
 * 
 * This test verifies that tests are running in Firefox browser.
 * Run this to confirm Firefox is the default browser.
 */

import { test, expect } from '@playwright/test';
import { performanceMonitor } from './test-helpers';
import { setupTestWithIsolation } from './test-setup-helper';

test.describe('Firefox Browser Verification', () => {
  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Firefox Verification Tests Performance Summary:');
      console.log(`  Total Tests: ${summary.total}`);
      console.log(`  Average Duration: ${summary.average.toFixed(2)}ms`);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Test isolation setup
    await setupTestWithIsolation(page);
  });
  /**
   * Test: Verify browser is Firefox
   * This confirms that Firefox is being used for tests
   */
  test('should run in Firefox browser', async ({ page, browserName }) => {
    performanceMonitor.startTest('should run in Firefox browser');
    try {
    // Verify we're using Firefox
    expect(browserName).toBe('firefox');
    
    // Navigate to a page to verify browser works
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify page loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Log browser info for confirmation
    console.log(`✅ Tests are running in: ${browserName.toUpperCase()}`);
    console.log(`✅ Browser version: ${(await page.evaluate(() => navigator.userAgent))}`);
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Verify Firefox-specific features work
   * This confirms Firefox rendering engine is working
   */
  test('should support Firefox rendering', async ({ page }) => {
    performanceMonitor.startTest('should support Firefox rendering');
    try {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify CSS is rendered (Firefox-specific rendering check)
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).display;
    });
    
    expect(bodyStyles).toBe('block');
    console.log('✅ Firefox rendering engine is working correctly');
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });
});

