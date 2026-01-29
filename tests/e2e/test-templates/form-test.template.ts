/**
 * Form Test Template
 * 
 * Use this template for form testing
 * 
 * To use:
 * 1. Copy this file to your test file
 * 2. Replace placeholders (form fields, test descriptions, etc.)
 * 3. Implement test logic
 * 4. Add appropriate tags
 */

import { test, expect } from '../fixtures';
import { setupTestPage, waitForPageReady, waitForElementStable, performanceMonitor } from '../test-helpers';
import { setupTestWithIsolation } from '../test-setup-helper';

test.describe('Form Name', () => {
  test.setTimeout(60000);

  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Form Name Tests Performance Summary:');
      console.log(`  Total Tests: ${summary.total}`);
      console.log(`  Average Duration: ${summary.average.toFixed(2)}ms`);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Test isolation setup
    await setupTestWithIsolation(page);
    await setupTestPage(page, '/form', {
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

  test('should submit form successfully @ui', async ({ page }) => {
    performanceMonitor.startTest('should submit form successfully');
    
    try {
      // Check if form fields exist (this is a template - adjust selectors for your actual form)
      const field1 = page.locator('[name="field1"]').first();
      const field1Exists = await field1.count() > 0;
      
      if (!field1Exists) {
        test.skip(true, 'Form fields not found - this is a template, update selectors for your actual form');
        return;
      }
      
      // Fill form fields
      await field1.fill('value1');
      const field2 = page.locator('[name="field2"]').first();
      if (await field2.count() > 0) {
        await field2.fill('value2');
      }
      
      // Wait for form to be ready
      const form = page.locator('form').first();
      await waitForElementStable(form, { stabilityDuration: 300 });
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for submission to complete
      await waitForPageReady(page, { waitForNetwork: true });
      
      // Verify success
      await expect(page.locator('.success-message')).toBeVisible();
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  test('should show validation errors @ui @error', async ({ page }) => {
    performanceMonitor.startTest('should show validation errors');
    
    try {
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Wait for validation errors
      await waitForElementStable(page.locator('.error-message'), {
        stabilityDuration: 300,
      });
      
      // Verify errors
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('required');
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  test('should validate individual fields @ui', async ({ page }) => {
    performanceMonitor.startTest('should validate individual fields');
    
    try {
      // Fill invalid data
      await page.fill('[name="email"]', 'invalid-email');
      
      // Trigger validation (blur or submit)
      await page.blur('[name="email"]');
      
      // Wait for error message
      await waitForElementStable(page.locator('.field-error'), {
        stabilityDuration: 300,
      });
      
      // Verify field-specific error
      await expect(page.locator('.field-error')).toBeVisible();
      await expect(page.locator('.field-error')).toContainText('invalid');
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });
});

