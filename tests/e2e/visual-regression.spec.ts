/**
 * Visual Regression Tests
 * 
 * These tests capture screenshots and compare them against baseline images
 * to detect visual regressions in the UI.
 * 
 * Baseline screenshots are stored in `tests/e2e/screenshots/` directory.
 * 
 * To update baselines after intentional UI changes:
 *   npx playwright test --update-snapshots
 * 
 * Run tests: npm run test:e2e
 */

import { test, expect } from '@playwright/test';
import { setupTestPage, waitForPageReady, waitForElementStable, performanceMonitor } from './test-helpers';
import { setupTestWithIsolation } from './test-setup-helper';

test.describe('Visual Regression Tests', () => {
  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Visual Regression Tests Performance Summary:');
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
   * Test: Landing page visual appearance
   * Captures full page screenshot and compares with baseline
   */
  test('landing page should match visual baseline', async ({ page }) => {
    performanceMonitor.startTest('landing page should match visual baseline');
    try {
    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    // Wait for page to be fully loaded and stable
    await waitForPageReady(page, {
      waitForNetwork: true,
      waitForReact: true,
      keySelectors: ['main', 'nav'],
    });

    // Mask rotating text elements to prevent visual regression failures
    const rotatingTextElements = await page.locator('main h1 span, main h1 div').all();

    // Compare screenshot with baseline
    // Allow some tolerance for minor rendering differences (fonts, anti-aliasing, etc.)
    await expect(page).toHaveScreenshot('landing-page.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixels: 3000, // Increased tolerance for rotating text variations
      // Mask rotating text elements to exclude them from comparison
      mask: rotatingTextElements.length > 0 ? rotatingTextElements : undefined,
    });
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Landing page hero section
   * Captures hero section specifically
   */
  test('landing page hero section should match baseline', async ({ page }) => {
    performanceMonitor.startTest('landing page hero section should match baseline');
    try {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Wait for page to be fully loaded
    await waitForPageReady(page, {
      waitForNetwork: true,
      waitForReact: true,
      keySelectors: ['main', 'h1'],
    });

    // Use component-specific selector for hero section
    // Based on landing-page.tsx structure:
    // - Hero section is in div with max-w-5xl containing h1 with "OMATrust is Trust for"
    // - Contains rotating service text in span.animate-fade-in
    // - Structure: main > div.flex.flex-col > div.max-w-5xl > h1
    const h1WithText = page.locator('main h1').filter({ 
      hasText: /OMATrust is Trust for/i 
    }).first();
    
    let targetElement;
    const h1Count = await h1WithText.count();
    
    if (h1Count > 0) {
      // Get the parent container (div with max-w-5xl) that contains the hero content
      // Use locator with parent() to find the max-w-5xl container
      const maxWidthContainer = page.locator('main div.max-w-5xl').filter({ 
        has: h1WithText 
      }).first();
      
      const containerCount = await maxWidthContainer.count();
      if (containerCount > 0) {
        targetElement = maxWidthContainer;
      } else {
        // Fallback: get immediate parent div
        targetElement = h1WithText.locator('..').first();
      }
    } else {
      // Fallback: look for main section with h1
      const heroSection = page.locator('main section:has(h1):not(:has([id*="connect"]))').first();
      const heroCount = await heroSection.count();
      
      if (heroCount > 0) {
        targetElement = heroSection;
      } else {
        // Last fallback: main > div:has(h1)
        targetElement = page.locator('main > div:has(h1)').first();
      }
    }
    
    await targetElement.waitFor({ state: 'visible', timeout: 15000 });
    await targetElement.scrollIntoViewIfNeeded();
    await waitForElementStable(targetElement, { stabilityDuration: 500 });

    // Find rotating text elements and mask them to prevent visual regression failures
    // The rotating text is in the h1 as the second child (after "OMATrust is Trust for")
    const rotatingTextElements = await page.locator('main h1 span, main h1 div').all();
    
    await expect(targetElement).toHaveScreenshot('landing-hero-section.png', {
      animations: 'disabled',
      maxDiffPixels: 1500, // Increased tolerance for rotating text variations
      // Mask rotating text elements to exclude them from comparison
      mask: rotatingTextElements.length > 0 ? rotatingTextElements : undefined,
    });
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Navigation bar visual appearance
   * Captures navigation bar specifically
   */
  test('navigation bar should match baseline', async ({ page }) => {
    performanceMonitor.startTest('navigation bar should match baseline');
    try {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    const nav = page.locator('nav').first();
    await nav.waitFor({ state: 'visible' });
    await waitForElementStable(nav, { stabilityDuration: 300 });

    await expect(nav).toHaveScreenshot('navigation-bar.png', {
      animations: 'disabled',
    });
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Dashboard visual appearance
   * Captures dashboard page (may vary based on auth state)
   */
  test('dashboard should match visual baseline', async ({ page }) => {
    performanceMonitor.startTest('dashboard should match visual baseline');
    try {
    test.setTimeout(90000); // Increase timeout for dashboard
    
    await setupTestPage(page, '/dashboard', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Wait for dashboard content to load
    await waitForPageReady(page, {
      waitForNetwork: true,
      waitForReact: true,
      keySelectors: ['main'],
    });

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    });
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Mobile viewport visual appearance
   * Captures landing page on mobile viewport
   */
  test('landing page mobile viewport should match baseline', async ({ page }) => {
    performanceMonitor.startTest('landing page mobile viewport should match baseline');
    try {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 2,
      waitForReact: true,
      removeOverlays: true,
    });

    await waitForPageReady(page, {
      waitForNetwork: true,
      waitForReact: true,
      keySelectors: ['main'],
    });

    await expect(page).toHaveScreenshot('landing-page-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Tablet viewport visual appearance
   * Captures landing page on tablet viewport
   */
  test('landing page tablet viewport should match baseline', async ({ page }) => {
    performanceMonitor.startTest('landing page tablet viewport should match baseline');
    try {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 2,
      waitForReact: true,
      removeOverlays: true,
    });

    await waitForPageReady(page, {
      waitForNetwork: true,
      waitForReact: true,
      keySelectors: ['main'],
    });

    await expect(page).toHaveScreenshot('landing-page-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Feature sections visual appearance
   * Captures feature sections specifically
   * 
   * Based on component structure:
   * - Feature sections are in a grid with cards
   * - Cards have classes: bg-white dark:bg-slate-800
   * - Contains "Register Services" and "Build Reputation" cards
   */
  test('feature sections should match baseline', async ({ page }) => {
    performanceMonitor.startTest('feature sections should match baseline');
    try {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Wait for page to be fully loaded
    await waitForPageReady(page, {
      waitForNetwork: true,
      waitForReact: true,
      keySelectors: ['main'],
    });
    
    // Find feature sections container - grid with action cards
    // Based on landing-page.tsx: grid grid-cols-1 md:grid-cols-2 gap-6
    const featuresContainer = page.locator('main div.grid').filter({ 
      has: page.locator('h4:has-text("Register Services"), h4:has-text("Build Reputation")')
    }).first();
    
    const containerCount = await featuresContainer.count();
    
    if (containerCount > 0) {
      await featuresContainer.waitFor({ state: 'visible', timeout: 15000 });
      await featuresContainer.scrollIntoViewIfNeeded();
      await waitForElementStable(featuresContainer, { stabilityDuration: 300 });

      await expect(featuresContainer).toHaveScreenshot('feature-sections.png', {
        animations: 'disabled',
        maxDiffPixels: 500, // Allow tolerance for minor rendering differences
      });
    } else {
      // Fallback: look for individual feature cards
      const registerCard = page.locator('div.bg-white, div.dark\\:bg-slate-800').filter({ 
        hasText: /Register Services/i 
      }).first();
      
      const cardCount = await registerCard.count();
      if (cardCount > 0) {
        await registerCard.waitFor({ state: 'visible', timeout: 15000 });
        await registerCard.scrollIntoViewIfNeeded();
        await waitForElementStable(registerCard, { stabilityDuration: 300 });

        await expect(registerCard).toHaveScreenshot('feature-sections.png', {
          animations: 'disabled',
          maxDiffPixels: 500,
        });
      } else {
        // Last fallback: use main content area
        const mainContent = page.locator('main').first();
        await mainContent.waitFor({ state: 'visible', timeout: 15000 });
        await mainContent.scrollIntoViewIfNeeded();
        await waitForElementStable(mainContent, { stabilityDuration: 300 });

        await expect(mainContent).toHaveScreenshot('feature-sections.png', {
          animations: 'disabled',
          maxDiffPixels: 500,
        });
      }
    }
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });
});

