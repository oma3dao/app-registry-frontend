/**
 * Test Cleanup Utilities
 * 
 * Utilities for cleaning up test state, resetting conditions, and ensuring test isolation.
 * These utilities help prevent test interference and ensure consistent test execution.
 * 
 * Usage:
 * ```typescript
 * import { cleanupTestState, resetPageState, cleanupMocks } from './test-cleanup';
 * 
 * test.afterEach(async ({ page }) => {
 *   await cleanupTestState(page);
 * });
 * ```
 */

import { Page, BrowserContext } from '@playwright/test';

export interface CleanupOptions {
  clearStorage?: boolean;
  clearCookies?: boolean;
  clearCache?: boolean;
  unmockRoutes?: boolean;
  resetNetwork?: boolean;
  closeDialogs?: boolean;
  clearConsole?: boolean;
}

/**
 * Clean up test state for a page
 * Resets storage, cookies, cache, and other state
 */
export async function cleanupTestState(
  page: Page,
  options: CleanupOptions = {}
): Promise<void> {
  const {
    clearStorage = true,
    clearCookies = true,
    clearCache = true,
    unmockRoutes = true,
    resetNetwork = true,
    closeDialogs = true,
    clearConsole = false,
  } = options;

  try {
    // Close any open dialogs
    if (closeDialogs) {
      page.on('dialog', async dialog => {
        await dialog.dismiss().catch(() => {});
      });
    }

    // Clear storage (localStorage, sessionStorage)
    if (clearStorage) {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      }).catch(() => {});
    }

    // Clear cookies
    if (clearCookies) {
      const context = page.context();
      await context.clearCookies().catch(() => {});
    }

    // Clear cache (via context)
    if (clearCache) {
      const context = page.context();
      // Note: Playwright doesn't have direct cache clearing,
      // but we can clear cookies and storage which helps
    }

    // Unmock all routes
    if (unmockRoutes) {
      // Note: Playwright doesn't have a direct way to unroute all,
      // but routes are automatically cleaned up when page closes
      // This is a placeholder for future implementation
    }

    // Reset network conditions
    if (resetNetwork) {
      const context = page.context();
      await context.setOffline(false).catch(() => {});
    }

    // Clear console (not directly possible, but we can log)
    if (clearConsole) {
      // Console clearing is not directly possible in Playwright
      // This is a placeholder for documentation
    }
  } catch (error) {
    // Silently fail cleanup - don't break tests
    console.warn('Cleanup warning:', error);
  }
}

/**
 * Reset page state to initial conditions
 * Useful for ensuring tests start from a clean state
 */
export async function resetPageState(page: Page): Promise<void> {
  await cleanupTestState(page, {
    clearStorage: true,
    clearCookies: true,
    clearCache: true,
    resetNetwork: true,
    closeDialogs: true,
  });
}

/**
 * Clean up mocks and route handlers
 * Note: Routes are automatically cleaned up when page closes,
 * but this can be used to explicitly clean up if needed
 */
export async function cleanupMocks(page: Page): Promise<void> {
  // Routes are automatically cleaned up when page/context closes
  // This is a placeholder for explicit cleanup if needed
  // In practice, you'd track routes and unroute them individually
}

/**
 * Clean up browser context
 * Resets all state for a browser context
 */
export async function cleanupBrowserContext(context: BrowserContext): Promise<void> {
  try {
    await context.clearCookies();
    // Note: Storage is per-page, so we'd need to iterate pages
    // This is a simplified version
  } catch (error) {
    console.warn('Context cleanup warning:', error);
  }
}

/**
 * Clean up test data from storage
 * Removes test-specific data from localStorage/sessionStorage
 */
export async function cleanupTestData(
  page: Page,
  keys?: string[]
): Promise<void> {
  await page.evaluate((keysToRemove) => {
    if (keysToRemove && keysToRemove.length > 0) {
      // Remove specific keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } else {
      // Remove all test-related keys (prefixed with 'test-' or 'e2e-')
      const allKeys = [
        ...Object.keys(localStorage),
        ...Object.keys(sessionStorage),
      ];
      
      allKeys.forEach(key => {
        if (key.startsWith('test-') || key.startsWith('e2e-') || key.startsWith('playwright-')) {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        }
      });
    }
  }, keys).catch(() => {});
}

/**
 * Clean up authentication state
 * Removes authentication tokens and state
 */
export async function cleanupAuthState(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Remove auth-related storage
    const authKeys = [
      'auth-token',
      'auth-state',
      'wallet-address',
      'user-session',
      'authentication',
    ];
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }).catch(() => {});

  // Clear auth cookies
  const context = page.context();
  const cookies = await context.cookies();
  const authCookies = cookies.filter(cookie => 
    cookie.name.includes('auth') || 
    cookie.name.includes('token') ||
    cookie.name.includes('session')
  );
  
  if (authCookies.length > 0) {
    await context.clearCookies();
  }
}

/**
 * Clean up form state
 * Resets form inputs and validation state
 */
export async function cleanupFormState(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Reset all form elements
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.reset();
    });

    // Clear any form-related storage
    const formKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('form-') || key.startsWith('input-')
    );
    formKeys.forEach(key => localStorage.removeItem(key));
  }).catch(() => {});
}

/**
 * Clean up modal/dialog state
 * Closes any open modals or dialogs
 */
export async function cleanupModalState(page: Page): Promise<void> {
  // Set up dialog handler to dismiss
  page.on('dialog', async dialog => {
    await dialog.dismiss().catch(() => {});
  });

  // Try to close any visible modals
  await page.evaluate(() => {
    // Close modals by clicking close buttons or backdrop
    const modals = document.querySelectorAll('[role="dialog"], .modal, [data-modal]');
    modals.forEach(modal => {
      const closeButton = modal.querySelector('[aria-label*="close" i], .close, [data-close]');
      if (closeButton) {
        (closeButton as HTMLElement).click();
      } else {
        // Try clicking backdrop
        const backdrop = modal.parentElement?.querySelector('.backdrop, .overlay');
        if (backdrop) {
          (backdrop as HTMLElement).click();
        }
      }
    });
  }).catch(() => {});
}

/**
 * Clean up network state
 * Resets network conditions and mocks
 */
export async function cleanupNetworkState(page: Page): Promise<void> {
  const context = page.context();
  
  // Restore online state
  await context.setOffline(false).catch(() => {});
  
  // Note: Route mocks are automatically cleaned up when page closes
}

/**
 * Complete cleanup - resets everything
 * Use this for comprehensive test cleanup
 */
export async function completeCleanup(
  page: Page,
  options: CleanupOptions = {}
): Promise<void> {
  await cleanupTestState(page, {
    clearStorage: true,
    clearCookies: true,
    clearCache: true,
    unmockRoutes: true,
    resetNetwork: true,
    closeDialogs: true,
    ...options,
  });

  // Additional cleanup
  await cleanupAuthState(page);
  await cleanupFormState(page);
  await cleanupModalState(page);
  await cleanupNetworkState(page);
}

/**
 * Create a cleanup hook for use in test suites
 * Returns a function that can be used in afterEach/afterAll
 */
export function createCleanupHook(options: CleanupOptions = {}) {
  return async (page: Page) => {
    await cleanupTestState(page, options);
  };
}

/**
 * Track test resources for cleanup
 * Useful for tracking created resources that need cleanup
 */
export class TestResourceTracker {
  private resources: Array<{ type: string; cleanup: () => Promise<void> | void }> = [];

  /**
   * Register a resource that needs cleanup
   */
  register(type: string, cleanup: () => Promise<void> | void): void {
    this.resources.push({ type, cleanup });
  }

  /**
   * Clean up all registered resources
   */
  async cleanup(): Promise<void> {
    for (const resource of this.resources.reverse()) {
      try {
        await resource.cleanup();
      } catch (error) {
        console.warn(`Failed to cleanup resource ${resource.type}:`, error);
      }
    }
    this.resources = [];
  }

  /**
   * Get count of tracked resources
   */
  getCount(): number {
    return this.resources.length;
  }
}

/**
 * Global resource tracker instance
 * Can be used across tests to track resources
 */
export const globalResourceTracker = new TestResourceTracker();

