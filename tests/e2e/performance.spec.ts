/**
 * Performance E2E Tests
 * 
 * These tests verify performance characteristics of the application,
 * including page load times, interaction responsiveness, and resource usage.
 * 
 * Run tests: npm run test:e2e
 */

import { test, expect } from '@playwright/test';
import { setupTestPage, measurePageLoadTime, PerformanceMonitor, performanceMonitor } from './test-helpers';
import { setupTestWithIsolation } from './test-setup-helper';

test.describe('Performance Tests', () => {
  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Performance Tests Performance Summary:');
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
   * Test: Landing page loads within performance budget
   * Verifies page load time meets performance requirements
   * 
   * @tag @performance - Performance test
   */
  test('landing page should load within performance budget @performance', async ({ page }) => {
    performanceMonitor.startTest('landing page should load within performance budget');
    const monitor = new PerformanceMonitor();
    
    try {
      monitor.start('page-load');
      await setupTestPage(page, '/', {
        waitForReact: true,
        removeOverlays: true,
      });
      const loadTime = monitor.end('page-load');

      // Performance budget: 5 seconds for initial load
      expect(loadTime).toBeLessThan(5000);
      console.log(`Landing page loaded in ${loadTime}ms`);
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Navigation is responsive
   * Verifies navigation interactions are fast
   * 
   * @tag @performance - Performance test
   */
  test('navigation should be responsive @performance', async ({ page }) => {
    performanceMonitor.startTest('navigation should be responsive');
    try {
    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    const monitor = new PerformanceMonitor();
    
    // Measure navigation link click response
    const docsLink = page.locator('nav a:has-text("Docs")').first();
    await docsLink.waitFor({ state: 'visible' });

    monitor.start('link-click');
    await docsLink.click();
    const clickTime = monitor.end('link-click');

    // Navigation should respond within 1000ms (more realistic for external links)
    expect(clickTime).toBeLessThan(1000);
    console.log(`Navigation link clicked in ${clickTime}ms`);
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Page interactions are smooth
   * Verifies button clicks and interactions are responsive
   */
  test('page interactions should be smooth', async ({ page }) => {
    performanceMonitor.startTest('page interactions should be smooth');
    try {
    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    const monitor = new PerformanceMonitor();
    
    // Measure button interaction
    const getStartedButton = page.locator('#hero-connect button').first();
    await getStartedButton.waitFor({ state: 'visible' });

    monitor.start('button-interaction');
    await getStartedButton.click();
    const interactionTime = monitor.end('button-interaction');

    // Interactions should be responsive (< 1000ms - more realistic for wallet buttons)
    expect(interactionTime).toBeLessThan(1000);
    console.log(`Button interaction completed in ${interactionTime}ms`);
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Dashboard loads efficiently
   * Verifies dashboard page load performance
   */
  test('dashboard should load efficiently', async ({ page }) => {
    performanceMonitor.startTest('dashboard should load efficiently');
    try {
    const monitor = new PerformanceMonitor();
    
    monitor.start('dashboard-load');
    await setupTestPage(page, '/dashboard', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });
    const loadTime = monitor.end('dashboard-load');

    // Dashboard should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
    console.log(`Dashboard loaded in ${loadTime}ms`);
    
    monitor.report();
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: No memory leaks during navigation
   * Verifies memory usage doesn't grow excessively
   */
  test.skip('should not have memory leaks during navigation', async ({ page }) => {
    // This test requires browser performance API access
    // Skipped by default as it requires specific browser capabilities
    
    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    // Navigate multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto('/');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Check memory usage (if available)
    const memory = await page.evaluate(() => {
      return (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
      } : null;
    });

    if (memory) {
      console.log('Memory usage:', memory);
      // Memory should not grow excessively (heuristic check)
      expect(memory.used).toBeLessThan(100 * 1024 * 1024); // 100MB
    }
  });
});

