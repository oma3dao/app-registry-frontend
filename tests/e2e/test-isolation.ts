/**
 * Test Isolation Utilities
 * 
 * Utilities for ensuring test isolation and preventing test interference.
 * These utilities help ensure tests can run independently and in any order.
 * 
 * Usage:
 * ```typescript
 * import { ensureTestIsolation, isolateTest } from './test-isolation';
 * 
 * test.beforeEach(async ({ page }) => {
 *   await ensureTestIsolation(page);
 * });
 * ```
 */

import { Page, BrowserContext } from '@playwright/test';
import { cleanupTestState, resetPageState } from './test-cleanup';

export interface IsolationOptions {
  resetStorage?: boolean;
  resetCookies?: boolean;
  resetAuth?: boolean;
  resetNetwork?: boolean;
  uniqueContext?: boolean;
  clearState?: boolean;
}

/**
 * Ensure test isolation by resetting state
 * Call this at the start of each test to ensure clean state
 */
export async function ensureTestIsolation(
  page: Page,
  options: IsolationOptions = {}
): Promise<void> {
  const {
    resetStorage = true,
    resetCookies = true,
    resetAuth = true,
    resetNetwork = true,
    clearState = true,
  } = options;

  if (clearState) {
    await resetPageState(page);
  }

  // Additional isolation steps
  if (resetStorage) {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    }).catch(() => {});
  }

  if (resetCookies) {
    const context = page.context();
    await context.clearCookies().catch(() => {});
  }

  if (resetAuth) {
    await page.evaluate(() => {
      // Clear auth-related storage
      ['auth-token', 'auth-state', 'wallet-address', 'user-session'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    }).catch(() => {});
  }

  if (resetNetwork) {
    const context = page.context();
    await context.setOffline(false).catch(() => {});
  }
}

/**
 * Isolate a test by creating a unique context
 * Returns a new page with isolated state
 */
export async function isolateTest(
  context: BrowserContext,
  options: IsolationOptions = {}
): Promise<Page> {
  // Create a new page in the context
  const page = await context.newPage();

  // Ensure isolation
  await ensureTestIsolation(page, options);

  return page;
}

/**
 * Create isolated test data
 * Ensures test data doesn't conflict with other tests
 */
export function createIsolatedTestData(prefix: string = 'test'): {
  id: string;
  timestamp: number;
  uniqueId: string;
} {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const uniqueId = `${prefix}-${timestamp}-${random}`;

  return {
    id: uniqueId,
    timestamp,
    uniqueId,
  };
}

/**
 * Ensure unique test identifiers
 * Prevents test data conflicts
 */
export function ensureUniqueTestId(baseId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${baseId}-${timestamp}-${random}`;
}

/**
 * Isolate storage keys
 * Prefixes storage keys to prevent conflicts
 */
export function isolateStorageKey(key: string, testId: string): string {
  return `test-${testId}-${key}`;
}

/**
 * Clean up isolated test data
 * Removes test-specific data after test completion
 */
export async function cleanupIsolatedTestData(
  page: Page,
  testId: string
): Promise<void> {
  await page.evaluate((id) => {
    const prefix = `test-${id}-`;
    const allKeys = [
      ...Object.keys(localStorage),
      ...Object.keys(sessionStorage),
    ];

    allKeys.forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
    });
  }, testId).catch(() => {});
}

/**
 * Ensure test runs in isolation
 * Wrapper function that ensures isolation before and after test
 */
export function withTestIsolation<T extends any[]>(
  testFn: (page: Page, ...args: T) => Promise<void>,
  options: IsolationOptions = {}
) {
  return async (page: Page, ...args: T): Promise<void> => {
    // Setup isolation
    await ensureTestIsolation(page, options);

    try {
      // Run test
      await testFn(page, ...args);
    } finally {
      // Cleanup after test
      await ensureTestIsolation(page, options);
    }
  };
}

/**
 * Create isolated test context
 * Returns a function that creates isolated test contexts
 */
export function createIsolatedTestContext(options: IsolationOptions = {}) {
  return async (context: BrowserContext): Promise<Page> => {
    return await isolateTest(context, options);
  };
}

/**
 * Track test isolation state
 * Monitors whether tests are properly isolated
 */
export class TestIsolationTracker {
  private testStates: Map<string, {
    testId: string;
    timestamp: number;
    isolated: boolean;
  }> = new Map();

  /**
   * Register a test as isolated
   */
  register(testId: string): void {
    this.testStates.set(testId, {
      testId,
      timestamp: Date.now(),
      isolated: true,
    });
  }

  /**
   * Check if test is isolated
   */
  isIsolated(testId: string): boolean {
    return this.testStates.get(testId)?.isolated ?? false;
  }

  /**
   * Clear test state
   */
  clear(testId: string): void {
    this.testStates.delete(testId);
  }

  /**
   * Clear all test states
   */
  clearAll(): void {
    this.testStates.clear();
  }

  /**
   * Get all tracked tests
   */
  getTrackedTests(): string[] {
    return Array.from(this.testStates.keys());
  }
}

/**
 * Global isolation tracker
 */
export const globalIsolationTracker = new TestIsolationTracker();

