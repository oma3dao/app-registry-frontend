/**
 * Advanced Waiting Utilities for E2E Tests
 * 
 * Provides reliable waiting strategies that replace flaky waitForTimeout calls
 * with condition-based waits that are more stable and faster.
 */

import { Page, Locator } from '@playwright/test';

/**
 * Wait for network to be idle with configurable timeout
 * More reliable than waitForNetworkIdle with better error handling
 */
export async function waitForNetworkIdle(
  page: Page,
  options: { timeout?: number; idleTime?: number } = {}
): Promise<void> {
  const { timeout = 30000, idleTime = 500 } = options;
  
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // If networkidle times out, wait a bit more for any pending requests
    await new Promise(resolve => setTimeout(resolve, idleTime));
  }
}

/**
 * Wait for element to be stable (not moving/changing)
 * Useful for waiting for animations or dynamic content to settle
 */
export async function waitForElementStable(
  locator: Locator,
  options: { timeout?: number; stabilityDuration?: number } = {}
): Promise<void> {
  const { timeout = 10000, stabilityDuration = 500 } = options;
  
  const startTime = Date.now();
  let lastPosition: { x: number; y: number; width: number; height: number } | null = null;
  let stableStart = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const box = await locator.boundingBox();
      
      if (box) {
        const currentPosition = {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        };
        
        if (lastPosition && 
            currentPosition.x === lastPosition.x &&
            currentPosition.y === lastPosition.y &&
            currentPosition.width === lastPosition.width &&
            currentPosition.height === lastPosition.height) {
          // Element is stable
          if (Date.now() - stableStart >= stabilityDuration) {
            return; // Element has been stable long enough
          }
        } else {
          // Element moved, reset stability timer
          stableStart = Date.now();
          lastPosition = currentPosition;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch {
      // Element might not be visible yet, wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Wait for React component to be fully rendered
 * Checks for React hydration markers and component stability
 */
export async function waitForReactReady(
  page: Page,
  options: { timeout?: number; checkSelectors?: string[] } = {}
): Promise<void> {
  const { timeout = 15000, checkSelectors = ['nav', 'main', 'h1'] } = options;
  
  const startTime = Date.now();
  
  // Wait for at least one key selector to appear
  await Promise.race(
    checkSelectors.map(selector =>
      page.waitForSelector(selector, { state: 'attached', timeout }).catch(() => {})
    )
  );
  
  // Wait for React to hydrate (check for data-reactroot or React markers)
  try {
    await page.waitForFunction(
      () => {
        // Check if React has hydrated
        const hasReactRoot = document.querySelector('[data-reactroot]') !== null;
        const hasReactComponent = document.querySelector('[data-react-component]') !== null;
        const hasReactContent = document.querySelector('nav, main, [class*="flex"]') !== null;
        
        return hasReactRoot || hasReactComponent || hasReactContent;
      },
      { timeout: Math.max(5000, timeout - (Date.now() - startTime)) }
    );
  } catch {
    // React might not use these markers, continue anyway
  }
  
  // Wait a small amount for any final rendering
  await new Promise(resolve => setTimeout(resolve, 200));
}

/**
 * Wait for page to be fully interactive
 * Combines multiple wait strategies for maximum reliability
 */
export async function waitForPageReady(
  page: Page,
  options: {
    timeout?: number;
    waitForNetwork?: boolean;
    waitForReact?: boolean;
    keySelectors?: string[];
  } = {}
): Promise<void> {
  const {
    timeout = 30000,
    waitForNetwork = true,
    waitForReact = true,
    keySelectors = ['body'],
  } = options;
  
  const startTime = Date.now();
  const remainingTimeout = () => Math.max(1000, timeout - (Date.now() - startTime));
  
  // Wait for key selectors
  await Promise.race(
    keySelectors.map(selector =>
      page.waitForSelector(selector, { state: 'attached', timeout: remainingTimeout() }).catch(() => {})
    )
  );
  
  // Wait for network if requested
  if (waitForNetwork) {
    try {
      await waitForNetworkIdle(page, { timeout: remainingTimeout() });
    } catch {
      // Network might not be idle, continue anyway
    }
  }
  
  // Wait for React if requested
  if (waitForReact) {
    try {
      await waitForReactReady(page, { timeout: remainingTimeout() });
    } catch {
      // React might not be ready, continue anyway
    }
  }
  
  // Final small wait for any remaining async operations
  await new Promise(resolve => setTimeout(resolve, 300));
}

/**
 * Wait for element to appear with retry logic
 * More reliable than simple waitForSelector with exponential backoff
 */
export async function waitForElementWithRetry(
  page: Page,
  selector: string,
  options: {
    timeout?: number;
    retries?: number;
    state?: 'attached' | 'visible' | 'hidden';
  } = {}
): Promise<Locator> {
  const { timeout = 10000, retries = 3, state = 'visible' } = options;
  
  const locator = page.locator(selector).first();
  const attemptTimeout = Math.floor(timeout / (retries + 1));
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await locator.waitFor({ state, timeout: attemptTimeout });
      return locator;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
    }
  }
  
  throw new Error(`Element ${selector} not found after ${retries + 1} attempts`);
}

/**
 * Wait for condition to be true with polling
 * More flexible than waitForFunction for complex conditions
 */
export async function waitForCondition(
  page: Page,
  condition: () => Promise<boolean> | boolean,
  options: {
    timeout?: number;
    pollingInterval?: number;
    errorMessage?: string;
  } = {}
): Promise<void> {
  const { timeout = 10000, pollingInterval = 200, errorMessage = 'Condition not met' } = options;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) {
        return;
      }
    } catch {
      // Condition might throw, continue polling
    }
    
    await new Promise(resolve => setTimeout(resolve, pollingInterval));
  }
  
  throw new Error(`${errorMessage} (timeout: ${timeout}ms)`);
}

/**
 * Wait for text content to appear in element
 * Useful for waiting for dynamic text updates
 */
export async function waitForTextContent(
  locator: Locator,
  options: {
    timeout?: number;
    text?: string | RegExp;
    minLength?: number;
  } = {}
): Promise<string> {
  const { timeout = 10000, text, minLength = 1 } = options;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const content = await locator.textContent();
      
      if (content) {
        const matchesText = text
          ? (typeof text === 'string' ? content.includes(text) : text.test(content))
          : true;
        const matchesLength = content.length >= minLength;
        
        if (matchesText && matchesLength) {
          return content;
        }
      }
    } catch {
      // Element might not be ready, continue
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  throw new Error(
    `Text content not found (timeout: ${timeout}ms, text: ${text}, minLength: ${minLength})`
  );
}

/**
 * Wait for multiple conditions to be true
 * Useful for waiting for multiple elements or states
 */
export async function waitForAllConditions(
  page: Page,
  conditions: Array<() => Promise<boolean> | boolean>,
  options: {
    timeout?: number;
    pollingInterval?: number;
  } = {}
): Promise<void> {
  const { timeout = 10000, pollingInterval = 200 } = options;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const results = await Promise.all(conditions.map(cond => cond()));
      if (results.every(result => result === true)) {
        return;
      }
    } catch {
      // Some conditions might throw, continue polling
    }
    
    await new Promise(resolve => setTimeout(resolve, pollingInterval));
  }
  
  throw new Error(`Not all conditions met (timeout: ${timeout}ms)`);
}

/**
 * Wait for element count to match expected value
 * Useful for waiting for lists or grids to populate
 */
export async function waitForElementCount(
  locator: Locator,
  expectedCount: number,
  options: { timeout?: number; operator?: 'exact' | 'atLeast' | 'atMost' } = {}
): Promise<number> {
  const { timeout = 10000, operator = 'exact' } = options;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const count = await locator.count();
      
      let matches = false;
      if (operator === 'exact') {
        matches = count === expectedCount;
      } else if (operator === 'atLeast') {
        matches = count >= expectedCount;
      } else if (operator === 'atMost') {
        matches = count <= expectedCount;
      }
      
      if (matches) {
        return count;
      }
    } catch {
      // Locator might not be ready, continue
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const finalCount = await locator.count().catch(() => 0);
  throw new Error(
    `Element count mismatch (expected: ${expectedCount} ${operator}, actual: ${finalCount}, timeout: ${timeout}ms)`
  );
}

