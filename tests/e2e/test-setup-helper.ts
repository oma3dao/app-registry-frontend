/**
 * Standardized Test Setup Helper
 * 
 * Provides a consistent way to set up test isolation and performance monitoring
 * across all test files. This ensures best practices are followed automatically.
 * 
 * Usage:
 * ```typescript
 * import { setupTestWithIsolation, setupTestWithPerformance } from './test-setup-helper';
 * 
 * test.beforeEach(async ({ page }) => {
 *   await setupTestWithIsolation(page);
 * });
 * 
 * test('my test', async ({ page }) => {
 *   const monitor = setupTestWithPerformance('my test');
 *   // ... test code ...
 *   monitor.endTest();
 * });
 * ```
 */

import { Page } from '@playwright/test';
import { ensureTestIsolation, IsolationOptions } from './test-isolation';
import { TestPerformanceMonitor, TestPerformanceMetrics } from './test-performance';

/**
 * Setup test with isolation
 * Ensures each test starts with a clean state
 */
export async function setupTestWithIsolation(
  page: Page,
  options: IsolationOptions = {}
): Promise<void> {
  await ensureTestIsolation(page, options);
}

/**
 * Setup test with performance monitoring
 * Returns a monitor instance that tracks test execution time
 */
export function setupTestWithPerformance(testName: string): TestPerformanceMonitor {
  const monitor = new TestPerformanceMonitor();
  monitor.startTest(testName);
  return monitor;
}

/**
 * Setup test with both isolation and performance monitoring
 * Convenience function for complete test setup
 */
export async function setupTestComplete(
  page: Page,
  testName: string,
  isolationOptions: IsolationOptions = {}
): Promise<TestPerformanceMonitor> {
  await setupTestWithIsolation(page, isolationOptions);
  return setupTestWithPerformance(testName);
}

/**
 * Standard test beforeEach setup
 * Use this in test.describe blocks to ensure all tests have isolation
 */
export function standardTestSetup(isolationOptions: IsolationOptions = {}) {
  return async (page: Page) => {
    await setupTestWithIsolation(page, isolationOptions);
  };
}

/**
 * Standard test with performance tracking
 * Wraps a test function with performance monitoring
 */
export function withPerformanceTracking<T extends any[]>(
  testFn: (page: Page, monitor: TestPerformanceMonitor, ...args: T) => Promise<void>
) {
  return async (page: Page, ...args: T): Promise<void> => {
    // Get test name from stack trace (if available)
    const testName = new Error().stack?.split('\n')[2]?.trim() || 'unknown-test';
    const monitor = setupTestWithPerformance(testName);
    
    try {
      await testFn(page, monitor, ...args);
    } finally {
      const metrics = monitor.endTest();
      if (metrics && metrics.category === 'very-slow') {
        console.warn(`⚠️ Slow test detected: ${metrics.testName} took ${metrics.duration}ms`);
      }
    }
  };
}

/**
 * Get performance metrics summary
 * Useful for reporting test performance
 */
export function getPerformanceSummary(monitor: TestPerformanceMonitor): {
  total: number;
  fast: number;
  normal: number;
  slow: number;
  verySlow: number;
  averageDuration: number;
} {
  const metrics = monitor.getMetrics();
  const total = metrics.length;
  const fast = metrics.filter(m => m.category === 'fast').length;
  const normal = metrics.filter(m => m.category === 'normal').length;
  const slow = metrics.filter(m => m.category === 'slow').length;
  const verySlow = metrics.filter(m => m.category === 'very-slow').length;
  const averageDuration = total > 0
    ? metrics.reduce((sum, m) => sum + m.duration, 0) / total
    : 0;

  return {
    total,
    fast,
    normal,
    slow,
    verySlow,
    averageDuration,
  };
}

