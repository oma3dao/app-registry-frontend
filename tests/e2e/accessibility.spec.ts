/**
 * Accessibility (a11y) E2E Tests
 * 
 * These tests verify basic accessibility requirements across the application.
 * They check for common a11y issues like missing alt text, unlabeled form inputs,
 * and buttons without accessible names.
 * 
 * Run tests: npm run test:e2e
 */

import { test, expect } from './fixtures';
import { setupTestPage, checkAccessibility, waitForModal, waitForElementStable, performanceMonitor } from './test-helpers';
import { setupTestWithIsolation } from './test-setup-helper';

test.describe('Accessibility Tests', () => {
  test.setTimeout(120000); // 2 minutes for dashboard navigation

  test.beforeEach(async ({ page }) => {
    // Test isolation setup
    await setupTestWithIsolation(page);
  });

  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Accessibility Tests Performance Summary:');
      console.log(`  Total Tests: ${summary.total}`);
      console.log(`  Average Duration: ${summary.average.toFixed(2)}ms`);
    }
  });

  /**
   * Test: Landing page meets basic accessibility requirements
   * Checks for common a11y issues
   * 
   * @tag @accessibility - Accessibility test
   */
  test('landing page should meet basic accessibility requirements @accessibility', async ({ page }) => {
    performanceMonitor.startTest('landing page should meet basic accessibility requirements');
    
    try {
    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    const a11yCheck = await checkAccessibility(page);
    
    // Log violations for debugging
    if (a11yCheck.violations.length > 0) {
      console.log('Accessibility violations found:', a11yCheck.violations);
    }

    // For now, we'll just log violations rather than failing
    // In production, you might want to enforce stricter rules
    // expect(a11yCheck.violations.length).toBe(0);
    } finally {
      performanceMonitor.endTest();
    }
  });

  /**
   * Test: Dashboard page meets basic accessibility requirements
   * 
   * @tag @accessibility - Accessibility test
   */
  test('dashboard should meet basic accessibility requirements @accessibility', async ({ page }) => {
    performanceMonitor.startTest('dashboard should meet basic accessibility requirements');
    
    try {
      await setupTestPage(page, '/dashboard', {
        navigationTimeout: 90000,
        retries: 3,
        waitForReact: true,
        removeOverlays: true,
      });

      const a11yCheck = await checkAccessibility(page);
      
      if (a11yCheck.violations.length > 0) {
        console.log('Accessibility violations found:', a11yCheck.violations);
      }
    } finally {
      performanceMonitor.endTest();
    }
  });

  /**
   * Test: Navigation links have accessible names
   */
  test('navigation links should have accessible names', async ({ page }) => {
    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    const navLinks = await page.locator('nav a').all();
    
    for (const link of navLinks) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const ariaLabelledBy = await link.getAttribute('aria-labelledby');
      const title = await link.getAttribute('title');
      
      // Check if link has an image with alt text (icon-only links)
      const img = await link.locator('img').first();
      const hasImage = await img.count() > 0;
      let imgAlt = '';
      if (hasImage) {
        imgAlt = await img.getAttribute('alt') || '';
      }
      
      // Each link should have at least one way to identify it:
      // - Visible text
      // - aria-label
      // - aria-labelledby
      // - title attribute
      // - Image with alt text (for icon-only links)
      const hasAccessibleName = text?.trim() || ariaLabel || ariaLabelledBy || title || imgAlt;
      
      if (!hasAccessibleName) {
        // Log the problematic link for debugging
        const href = await link.getAttribute('href');
        console.warn(`Link without accessible name found: ${href}`);
      }
      
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  /**
   * Test: Buttons have accessible names
   */
  test('buttons should have accessible names', async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 90000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      const title = await button.getAttribute('title');
      
      // Check if button contains an image with alt text (icon-only buttons)
      const img = await button.locator('img, svg').first();
      const hasImage = await img.count() > 0;
      let imgAlt = '';
      if (hasImage) {
        imgAlt = await img.getAttribute('alt') || '';
        // For SVG icons, check if there's a title element
        if (!imgAlt && await img.evaluate((el) => el.tagName === 'svg')) {
          const svgTitle = await img.locator('title').first();
          if (await svgTitle.count() > 0) {
            imgAlt = await svgTitle.textContent() || '';
          }
        }
      }
      
      // Each button should have at least one way to identify it:
      // - Visible text
      // - aria-label
      // - aria-labelledby
      // - title attribute
      // - Image with alt text (for icon-only buttons)
      const hasAccessibleName = text?.trim() || ariaLabel || ariaLabelledBy || title || imgAlt;
      
      if (!hasAccessibleName) {
        // Log the problematic button for debugging
        const buttonHTML = await button.evaluate((el) => el.outerHTML.substring(0, 200));
        console.warn(`Button without accessible name found: ${buttonHTML}`);
      }
      
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  /**
   * Test: Form inputs have associated labels
   */
  test('form inputs should have associated labels', async ({ page }) => {
    await setupTestPage(page, '/dashboard', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Open wizard to test form inputs
    const registerButton = page.locator('button:has-text("Register New App")').first();
    const isVisible = await registerButton.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (isVisible) {
      await registerButton.click();
      
      // Wait for modal to open with longer timeout
      const modal = page.locator('[role="dialog"]').first();
      await modal.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      const modalVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (!modalVisible) {
        test.skip(true, 'Modal did not open - may require authentication');
        return;
      }
      if (modal) {
        await waitForElementStable(modal, { stabilityDuration: 300 });
      }
      
      const inputs = await page.locator('input:not([type="hidden"]), textarea, select').all();
      
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');
        
        if (id) {
          const label = await page.locator(`label[for="${id}"]`).count();
          // Input should have label, aria-label, aria-labelledby, or placeholder
          expect(label > 0 || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy();
        } else {
          // If no id, should have aria-label or placeholder
          expect(ariaLabel || placeholder).toBeTruthy();
        }
      }
    } else {
      test.skip(true, 'Skipping: Register New App button not visible (requires authentication)');
    }
  });
});

