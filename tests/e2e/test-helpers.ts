/**
 * Test Utilities for E2E Tests
 * 
 * Common helpers for Playwright E2E tests including:
 * - Error overlay handling
 * - Authentication helpers
 * - Common selectors
 * - Wait utilities
 * 
 * For advanced waiting strategies, see wait-utilities.ts
 * For performance monitoring, see test-performance.ts
 */

import { Page, Locator } from '@playwright/test';

// Re-export wait utilities for convenience
export {
  waitForNetworkIdle,
  waitForElementStable,
  waitForReactReady,
  waitForPageReady,
  waitForElementWithRetry,
  waitForCondition,
  waitForTextContent,
  waitForAllConditions,
  waitForElementCount,
} from './wait-utilities';

// Re-export performance utilities
export {
  performanceMonitor,
  measurePageLoadPerformance,
  measureApiRequestPerformance,
  logPerformanceMetrics,
  type TestPerformanceMetrics,
  type PerformanceThresholds,
  DEFAULT_THRESHOLDS,
} from './test-performance';

// Re-export test data factories
export * from './test-data-factories';

// Re-export mock utilities
export * from './mock-utilities';

// Re-export test environment utilities
export * from './test-environment';

// Re-export test cleanup utilities
export * from './test-cleanup';

// Re-export test isolation utilities
export * from './test-isolation';

// Re-export test debugging utilities
export * from './test-debugging';

// Re-export test fixtures
export * from './test-fixtures';

// Re-export test retry strategies
export * from './test-retry-strategies';

// Re-export test validation utilities
export * from './test-validation';

/**
 * Remove error overlays that might block page interaction
 * Handles Next.js error overlays, dialogs, and runtime errors
 */
export async function removeErrorOverlays(page: Page, retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    await page.evaluate(() => {
      // Remove all dialogs
      const dialogs = document.querySelectorAll('[role="dialog"], [class*="dialog"], [id*="dialog"]');
      dialogs.forEach(dialog => {
        const text = dialog.textContent || '';
        if (text.includes('Error') || text.includes('NEXT_PUBLIC_THIRDWEB_CLIENT_ID') || text.includes('Runtime')) {
          // Try to click any close button first
          const buttons = dialog.querySelectorAll('button');
          buttons.forEach(btn => {
            if (btn.textContent?.toLowerCase().includes('close') || 
                btn.getAttribute('aria-label')?.toLowerCase().includes('close')) {
              (btn as HTMLElement).click();
            }
          });
          // Force remove
          (dialog as HTMLElement).style.display = 'none';
          (dialog as HTMLElement).remove();
        }
      });
      
      // Remove error overlays
      const errorOverlays = document.querySelectorAll('[class*="error"], [id*="error"], [class*="overlay"], [id*="overlay"]');
      errorOverlays.forEach(overlay => {
        const text = overlay.textContent || '';
        if (text.includes('Error') || text.includes('NEXT_PUBLIC_THIRDWEB_CLIENT_ID') || text.includes('Runtime')) {
          (overlay as HTMLElement).style.display = 'none';
          (overlay as HTMLElement).remove();
        }
      });
      
      // Remove Next.js error overlay specifically
      const nextErrorOverlay = document.querySelector('[data-nextjs-dialog]');
      if (nextErrorOverlay) {
        (nextErrorOverlay as HTMLElement).style.display = 'none';
        (nextErrorOverlay as HTMLElement).remove();
      }
      
      // Remove backdrop/overlay divs
      const backdrops = document.querySelectorAll('[class*="backdrop"], [class*="overlay-backdrop"]');
      backdrops.forEach(backdrop => {
        (backdrop as HTMLElement).style.display = 'none';
        (backdrop as HTMLElement).remove();
      });
    });
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

/**
 * Setup page with error handling and navigation
 * Handles dialogs and navigates to a URL
 */
export async function setupPage(page: Page, url: string): Promise<void> {
  // Set up dialog handler
  page.on('dialog', async dialog => {
    await dialog.dismiss();
  });
  
  // Navigate to page
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  // Wait for initial load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Remove error overlays
  await removeErrorOverlays(page);
  
  // Wait for body to be visible
  await page.waitForSelector('body', { state: 'visible', timeout: 10000 });
}

/**
 * Wait for React content to hydrate
 * Looks for common React-rendered elements
 */
export async function waitForReactContent(page: Page, timeout = 10000): Promise<void> {
  try {
    await Promise.race([
      page.waitForSelector('nav', { state: 'attached', timeout }).catch(() => {}),
      page.waitForSelector('main', { state: 'attached', timeout }).catch(() => {}),
      page.waitForSelector('h1', { state: 'attached', timeout }).catch(() => {}),
      page.waitForSelector('[class*="flex"]', { state: 'attached', timeout }).catch(() => {}),
    ]);
  } catch {
    // Continue if nothing appears
  }
  await new Promise(resolve => setTimeout(resolve, 1000));
}

/**
 * Check if user is authenticated
 * Looks for wallet connection indicators or user-specific content
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check for wallet address display (common pattern)
  const hasWalletAddress = await page.locator('text=/0x[a-fA-F0-9]{40}/').first().isVisible({ timeout: 2000 }).catch(() => false);
  
  // Check for dashboard-specific content that requires auth
  const hasDashboardContent = await page.getByText(/My Registered Applications|Register New App/i).first().isVisible({ timeout: 2000 }).catch(() => false);
  
  return hasWalletAddress || hasDashboardContent;
}

/**
 * Wait for element with multiple selector strategies
 * Tries multiple selectors until one is found
 */
export async function waitForElement(
  page: Page,
  selectors: string[],
  options: { timeout?: number; state?: 'attached' | 'visible' } = {}
): Promise<boolean> {
  const { timeout = 5000, state = 'visible' } = options;
  
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout, state });
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

/**
 * Scroll element into view if needed
 * Helper to ensure element is visible before interaction
 */
export async function scrollIntoViewIfNeeded(page: Page, selector: string): Promise<void> {
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, selector);
}

/**
 * Get console errors (excluding known non-critical errors)
 * Filters out 404s, favicon errors, etc.
 */
export async function getConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out known non-critical errors
      if (!text.includes('404') && 
          !text.includes('favicon') && 
          !text.includes('Failed to load resource')) {
        errors.push(text);
      }
    }
  });
  
  return errors;
}

/**
 * Check if a button is a wallet connect button
 * Wallet connect buttons may be disabled initially during auto-connect
 */
export async function isWalletConnectButton(locator: Locator): Promise<boolean> {
  try {
    const classAttr = await locator.getAttribute('class');
    if (classAttr?.includes('tw-connect-wallet')) return true;
    
    // Check parent elements for connect wallet classes
    const parent = locator.locator('..');
    const parentClass = await parent.getAttribute('class').catch(() => '');
    if (parentClass?.includes('tw-connect') || parentClass?.includes('connect-wallet')) return true;
    
    // Check button text/content
    const buttonText = await locator.textContent().catch(() => '');
    if (/sign in|connect|get started|wallet/i.test(buttonText || '')) return true;
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Measure page load time to interactive content
 * More reliable than networkidle for modern web apps
 */
export async function measurePageLoadTime(
  page: Page,
  url: string,
  keySelectors: string[] = ['h1', 'nav']
): Promise<number> {
  const startTime = Date.now();
  
  // Use domcontentloaded for initial navigation
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  // Wait for key interactive content
  for (const selector of keySelectors) {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
    } catch {
      // Continue if selector not found
    }
  }
  
  return Date.now() - startTime;
}

/**
 * Wait for modal/dialog to appear
 * Useful for testing modal-based flows
 */
export async function waitForModal(
  page: Page,
  timeout = 10000
): Promise<ReturnType<Page['locator']>> {
  const modal = page.locator('[role="dialog"]').first();
  await modal.waitFor({ state: 'visible', timeout });
  return modal;
}

/**
 * Close modal/dialog by clicking close button or pressing Escape
 */
export async function closeModal(page: Page): Promise<void> {
  // Try to find and click close button
  const closeButton = page.getByRole('button', { name: /close/i }).or(
    page.locator('button[aria-label*="close" i]')
  ).first();
  
  const hasCloseButton = await closeButton.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (hasCloseButton) {
    await closeButton.click();
    await new Promise(resolve => setTimeout(resolve, 300));
  } else {
    // Fallback: press Escape key
    await page.keyboard.press('Escape');
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Verify modal is closed
  const modal = page.locator('[role="dialog"]').first();
  await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
}

/**
 * Wait for element to be visible with multiple selector strategies
 * Tries each selector until one is found
 */
export async function waitForElementVisible(
  page: Page,
  selectors: string[],
  timeout = 10000
): Promise<ReturnType<Page['locator']> | null> {
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      await element.waitFor({ state: 'visible', timeout });
      return element;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Setup page with consistent error handling
 * Combines navigation, error overlay removal, and React content waiting
 * Includes retry logic for handling server load issues
 */
export async function setupTestPage(
  page: Page,
  url: string,
  options: {
    waitForReact?: boolean;
    removeOverlays?: boolean;
    timeout?: number;
    navigationTimeout?: number;
    retries?: number;
  } = {}
): Promise<void> {
  const {
    waitForReact = true,
    removeOverlays = true,
    timeout = 10000,
    navigationTimeout = 30000,
    retries = 1,
  } = options;

  // Set up dialog handler
  page.on('dialog', async dialog => {
    await dialog.dismiss();
  });

  // Navigate with retry logic for server load issues
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navigationTimeout });
      break; // Success
    } catch (e) {
      if (i < retries - 1) {
        console.warn(`Navigation failed (attempt ${i + 1}/${retries}): ${e.message}. Retrying...`);
        // Check if page is still valid before waiting
        try {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        } catch (waitError) {
          // Page might be closed, re-throw original error
          throw e;
        }
      } else {
        throw e; // Re-throw if all retries fail
      }
    }
  }

  // Wait for body to be visible
  await page.waitForSelector('body', { state: 'visible', timeout });

  // Remove error overlays
  if (removeOverlays) {
    await removeErrorOverlays(page);
  }

  // Wait for React content
  if (waitForReact) {
    await waitForReactContent(page, timeout);
  }
}

/**
 * Fill form fields with validation
 * Handles common form patterns and waits for fields to be ready
 */
export async function fillFormField(
  page: Page,
  fieldSelector: string | { label?: string; placeholder?: string; name?: string },
  value: string,
  options: { timeout?: number; clear?: boolean } = {}
): Promise<void> {
  const { timeout = 5000, clear = true } = options;
  
  let locator;
  if (typeof fieldSelector === 'string') {
    locator = page.locator(fieldSelector).first();
  } else {
    // Try multiple strategies
    const selectors: string[] = [];
    if (fieldSelector.label) {
      selectors.push(`label:has-text("${fieldSelector.label}") + input`, `label:has-text("${fieldSelector.label}") ~ input`);
    }
    if (fieldSelector.placeholder) {
      selectors.push(`input[placeholder*="${fieldSelector.placeholder}" i]`);
    }
    if (fieldSelector.name) {
      selectors.push(`input[name="${fieldSelector.name}"]`);
    }
    
    locator = await waitForElementVisible(page, selectors, timeout) || page.locator('input').first();
  }
  
  await locator.waitFor({ state: 'visible', timeout });
  await locator.scrollIntoViewIfNeeded();
  
  if (clear) {
    await locator.clear();
  }
  
  await locator.fill(value);
  await new Promise(resolve => setTimeout(resolve, 200)); // Allow for validation/updates
}

/**
 * Fill multiple form fields in sequence
 */
export async function fillFormFields(
  page: Page,
  fields: Array<{ selector: string | { label?: string; placeholder?: string; name?: string }; value: string }>
): Promise<void> {
  for (const field of fields) {
    await fillFormField(page, field.selector, field.value);
  }
}

/**
 * Wait for form validation to complete
 * Checks for error messages or success indicators
 */
export async function waitForFormValidation(
  page: Page,
  options: { timeout?: number; expectErrors?: boolean } = {}
): Promise<{ hasErrors: boolean; errors: string[] }> {
  const { timeout = 3000, expectErrors = false } = options;
  
  await new Promise(resolve => setTimeout(resolve, 500)); // Allow validation to run
  
  const errorSelectors = [
    '[role="alert"]',
    '.error',
    '[class*="error"]',
    'text=/required/i',
    'text=/invalid/i',
  ];
  
  const errors: string[] = [];
  for (const selector of errorSelectors) {
    try {
      const elements = await page.locator(selector).all();
      for (const el of elements) {
        const text = await el.textContent();
        if (text && text.trim()) {
          errors.push(text.trim());
        }
      }
    } catch {
      // Continue
    }
  }
  
  return {
    hasErrors: errors.length > 0,
    errors: [...new Set(errors)], // Remove duplicates
  };
}

/**
 * Check basic accessibility (a11y) requirements
 * Returns violations found on the page
 */
export async function checkAccessibility(
  page: Page,
  options: { timeout?: number } = {}
): Promise<{ violations: Array<{ id: string; description: string }> }> {
  const { timeout = 5000 } = options;
  const violations: Array<{ id: string; description: string }> = [];
  
  // Check for images without alt text
  const imagesWithoutAlt = await page.locator('img:not([alt])').count();
  if (imagesWithoutAlt > 0) {
    violations.push({
      id: 'missing-alt-text',
      description: `${imagesWithoutAlt} image(s) missing alt text`,
    });
  }
  
  // Check for buttons without accessible names
  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const text = await button.textContent();
    const ariaLabel = await button.getAttribute('aria-label');
    const ariaLabelledBy = await button.getAttribute('aria-labelledby');
    
    if (!text?.trim() && !ariaLabel && !ariaLabelledBy) {
      violations.push({
        id: 'button-without-name',
        description: 'Button without accessible name found',
      });
    }
  }
  
  // Check for form inputs without labels
  const inputs = await page.locator('input:not([type="hidden"]), textarea, select').all();
  for (const input of inputs) {
    const id = await input.getAttribute('id');
    const ariaLabel = await input.getAttribute('aria-label');
    const ariaLabelledBy = await input.getAttribute('aria-labelledby');
    const placeholder = await input.getAttribute('placeholder');
    
    if (id) {
      const label = await page.locator(`label[for="${id}"]`).count();
      if (label === 0 && !ariaLabel && !ariaLabelledBy && !placeholder) {
        violations.push({
          id: 'input-without-label',
          description: 'Form input without associated label found',
        });
      }
    }
  }
  
  return { violations };
}

/**
 * Intercept and mock API requests
 * Useful for testing error scenarios or offline behavior
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: { status?: number; body?: any; headers?: Record<string, string> }
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status: response.status || 200,
      body: typeof response.body === 'string' ? response.body : JSON.stringify(response.body),
      headers: {
        'Content-Type': 'application/json',
        ...response.headers,
      },
    });
  });
}

/**
 * Wait for network requests to complete
 * Useful for ensuring all API calls finish before assertions
 */
export async function waitForNetworkIdle(
  page: Page,
  options: { timeout?: number; idleTime?: number } = {}
): Promise<void> {
  const { timeout = 30000, idleTime = 500 } = options;
  
  await page.waitForLoadState('networkidle', { timeout });
  await new Promise(resolve => setTimeout(resolve, idleTime));
}

/**
 * Get all network requests made during test
 * Useful for debugging and verifying API calls
 */
export async function getNetworkRequests(
  page: Page,
  filter?: { url?: string | RegExp; method?: string }
): Promise<Array<{ url: string; method: string; status?: number }>> {
  const requests: Array<{ url: string; method: string; status?: number }> = [];
  
  page.on('request', (request) => {
    if (!filter || 
        (filter.url && (typeof filter.url === 'string' ? request.url().includes(filter.url) : filter.url.test(request.url()))) ||
        (filter.method && request.method() === filter.method)) {
      requests.push({
        url: request.url(),
        method: request.method(),
      });
    }
  });
  
  page.on('response', (response) => {
    const url = response.url();
    const matchingRequest = requests.find(r => r.url === url);
    if (matchingRequest) {
      matchingRequest.status = response.status();
    }
  });
  
  return requests;
}

/**
 * Take a screenshot with consistent naming
 * Useful for visual regression testing
 * 
 * Note: For visual regression, prefer using Playwright's built-in
 * expect(page).toHaveScreenshot() which handles comparison automatically
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options: { fullPage?: boolean; path?: string } = {}
): Promise<string> {
  const { fullPage = false, path } = options;
  const screenshotPath = path || `test-results/screenshots/${name}-${Date.now()}.png`;
  
  await page.screenshot({
    path: screenshotPath,
    fullPage,
    animations: 'disabled', // Disable animations for consistent screenshots
  });
  
  return screenshotPath;
}

/**
 * Prepare page for visual regression testing
 * Ensures page is stable and ready for screenshot
 */
export async function prepareForScreenshot(page: Page): Promise<void> {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  
  // Wait for any animations to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Ensure page is fully rendered
  await page.evaluate(() => {
    // Wait for any pending renders
    return new Promise(resolve => {
      if (document.readyState === 'complete') {
        setTimeout(resolve, 100);
      } else {
        window.addEventListener('load', () => setTimeout(resolve, 100));
      }
    });
  });
}

/**
 * Take element screenshot for visual regression
 * Useful for testing specific components
 */
export async function takeElementScreenshot(
  page: Page,
  selector: string,
  name: string,
  options: { timeout?: number } = {}
): Promise<string> {
  const { timeout = 10000 } = options;
  
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible', timeout });
  await element.scrollIntoViewIfNeeded();
  await new Promise(resolve => setTimeout(resolve, 500)); // Allow for scroll animation
  
  const screenshotPath = `test-results/screenshots/${name}-${Date.now()}.png`;
  await element.screenshot({
    path: screenshotPath,
    animations: 'disabled',
  });
  
  return screenshotPath;
}

/**
 * Get detailed error context for debugging
 * Collects page state, console errors, network errors, etc.
 */
export async function getErrorContext(page: Page): Promise<{
  url: string;
  title: string;
  consoleErrors: string[];
  networkErrors: Array<{ url: string; status: number }>;
  pageText: string;
  screenshot?: string;
  viewport?: { width: number; height: number };
  timestamp: string;
}> {
  const url = page.url();
  const title = await page.title();
  const viewport = page.viewportSize();
  
  const consoleErrors: string[] = [];
  const consoleListener = (msg: any) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  };
  page.on('console', consoleListener);
  
  const networkErrors: Array<{ url: string; status: number }> = [];
  const responseListener = (response: any) => {
    if (response.status() >= 400) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
      });
    }
  };
  page.on('response', responseListener);
  
  const pageText = await page.textContent('body') || '';
  
  let screenshot: string | undefined;
  try {
    screenshot = await takeScreenshot(page, 'error-context');
  } catch {
    // Screenshot failed, continue
  }
  
  // Clean up listeners
  page.off('console', consoleListener);
  page.off('response', responseListener);
  
  return {
    url,
    title,
    consoleErrors,
    networkErrors,
    pageText: pageText.substring(0, 1000), // Limit size
    screenshot,
    viewport,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Enhanced error reporting with context
 * Logs comprehensive error information for debugging
 */
export async function reportError(
  page: Page,
  error: Error,
  context?: { testName?: string; step?: string }
): Promise<void> {
  const errorContext = await getErrorContext(page);
  
  console.error('\n=== ERROR REPORT ===');
  if (context?.testName) {
    console.error(`Test: ${context.testName}`);
  }
  if (context?.step) {
    console.error(`Step: ${context.step}`);
  }
  console.error(`Error: ${error.message}`);
  console.error(`URL: ${errorContext.url}`);
  console.error(`Title: ${errorContext.title}`);
  console.error(`Viewport: ${errorContext.viewport?.width}x${errorContext.viewport?.height}`);
  console.error(`Timestamp: ${errorContext.timestamp}`);
  
  if (errorContext.consoleErrors.length > 0) {
    console.error(`\nConsole Errors (${errorContext.consoleErrors.length}):`);
    errorContext.consoleErrors.forEach((err, i) => {
      console.error(`  ${i + 1}. ${err}`);
    });
  }
  
  if (errorContext.networkErrors.length > 0) {
    console.error(`\nNetwork Errors (${errorContext.networkErrors.length}):`);
    errorContext.networkErrors.forEach((err, i) => {
      console.error(`  ${i + 1}. ${err.url} - Status: ${err.status}`);
    });
  }
  
  if (errorContext.screenshot) {
    console.error(`\nScreenshot: ${errorContext.screenshot}`);
  }
  
  console.error('=== END ERROR REPORT ===\n');
}

/**
 * Performance monitoring utility
 * Tracks and reports performance metrics during tests
 */
export class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  private startTimes: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  start(operation: string): void {
    this.startTimes.set(operation, Date.now());
  }

  /**
   * End timing an operation and record the duration
   */
  end(operation: string): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operation}`);
      return 0;
    }
    
    const duration = Date.now() - startTime;
    this.metrics.set(operation, duration);
    this.startTimes.delete(operation);
    return duration;
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): Map<string, number> {
    return new Map(this.metrics);
  }

  /**
   * Get a specific metric
   */
  getMetric(operation: string): number | undefined {
    return this.metrics.get(operation);
  }

  /**
   * Report all metrics
   */
  report(): void {
    console.log('\n=== PERFORMANCE METRICS ===');
    this.metrics.forEach((duration, operation) => {
      console.log(`${operation}: ${duration}ms`);
    });
    console.log('=== END METRICS ===\n');
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

/**
 * Wait for element with optimized polling
 * Uses requestAnimationFrame for better performance
 */
export async function waitForElementOptimized(
  page: Page,
  selector: string,
  options: { timeout?: number; state?: 'attached' | 'visible' | 'hidden' } = {}
): Promise<void> {
  const { timeout = 10000, state = 'visible' } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = page.locator(selector).first();
    const isVisible = await element.isVisible().catch(() => false);
    const isAttached = await element.count() > 0;

    if (state === 'visible' && isVisible) return;
    if (state === 'attached' && isAttached) return;
    if (state === 'hidden' && !isVisible) return;

    // Use requestAnimationFrame for smoother polling
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  }

  throw new Error(`Element ${selector} did not become ${state} within ${timeout}ms`);
}

/**
 * Batch wait for multiple elements
 * More efficient than waiting for each element individually
 */
export async function waitForElements(
  page: Page,
  selectors: string[],
  options: { timeout?: number; all?: boolean } = {}
): Promise<Map<string, boolean>> {
  const { timeout = 10000, all = false } = options;
  const results = new Map<string, boolean>();
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const checks = await Promise.all(
      selectors.map(async (selector) => {
        const element = page.locator(selector).first();
        const isVisible = await element.isVisible().catch(() => false);
        return { selector, isVisible };
      })
    );

    checks.forEach(({ selector, isVisible }) => {
      results.set(selector, isVisible);
    });

    const allFound = all
      ? checks.every(({ isVisible }) => isVisible)
      : checks.some(({ isVisible }) => isVisible);

    if (allFound) {
      return results;
    }

    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between checks
  }

  return results;
}

