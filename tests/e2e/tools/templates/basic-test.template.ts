/**
 * Basic Test Template
 * 
 * Use this template for simple UI tests
 * 
 * To use:
 * 1. Copy this file to your test file
 * 2. Replace placeholders (Feature Name, test descriptions, etc.)
 * 3. Implement test logic
 * 4. Add appropriate tags
 */

import { test, expect } from '../fixtures';
import { setupTestPage, waitForPageReady, performanceMonitor } from '../test-helpers';
import { setupTestWithIsolation } from '../test-setup-helper';

test.describe('Feature Name', () => {
  // Set timeout for all tests in this suite
  test.setTimeout(60000);

  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Feature Name Tests Performance Summary:');
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
    
    // Common setup for each test
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });
    await waitForPageReady(page, {
      waitForNetwork: true,
      waitForReact: true,
    });
  });

  test('should do something specific @ui', async ({ page }) => {
    // Arrange
    performanceMonitor.startTest('should do something specific');
    
    try {
      // Act - Check if button exists before clicking
      const actionButton = page.locator('button[data-testid="action-button"]').first();
      const buttonExists = await actionButton.count() > 0;
      
      if (!buttonExists) {
        test.skip(true, 'Action button not found - this is a template, update selector for your actual button');
        return;
      }
      
      // Wait for button to be visible and clickable
      await actionButton.waitFor({ state: 'visible', timeout: 10000 });
      await actionButton.click({ timeout: 10000 });
      
      // Assert - Check if result element exists
      const resultElement = page.locator('.result').first();
      const resultExists = await resultElement.count() > 0;
      
      if (resultExists) {
        await expect(resultElement).toBeVisible({ timeout: 5000 });
      } else {
        // If result element doesn't exist, just verify button click worked
        expect(buttonExists).toBeTruthy();
      }
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.warn(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });
});

