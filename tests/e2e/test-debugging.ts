/**
 * Test Debugging Utilities
 * 
 * Enhanced debugging and diagnostic utilities for troubleshooting test failures.
 * These utilities help identify issues quickly and provide comprehensive context.
 * 
 * Usage:
 * ```typescript
 * import { debugPageState, captureTestSnapshot, analyzeTestFailure } from './test-debugging';
 * 
 * test('should do something', async ({ page }) => {
 *   await debugPageState(page, 'before-action');
 *   // ... test code ...
 *   await captureTestSnapshot(page, 'after-action');
 * });
 * ```
 */

import { Page, BrowserContext } from '@playwright/test';
import { getErrorContext, reportError } from './test-helpers';

export interface DebugSnapshot {
  timestamp: string;
  url: string;
  title: string;
  viewport: { width: number; height: number } | null;
  consoleLogs: Array<{ type: string; text: string }>;
  networkRequests: Array<{ url: string; method: string; status: number; duration: number }>;
  pageState: {
    readyState: string;
    hasErrors: boolean;
    errorCount: number;
  };
  screenshot?: string;
  html?: string;
  storage?: {
    localStorage: Record<string, string>;
    sessionStorage: Record<string, string>;
  };
}

export interface FailureAnalysis {
  testName: string;
  error: Error;
  snapshot: DebugSnapshot;
  possibleCauses: string[];
  suggestedFixes: string[];
  relatedTests?: string[];
}

/**
 * Capture a comprehensive debug snapshot of page state
 */
export async function captureDebugSnapshot(
  page: Page,
  label: string = 'snapshot'
): Promise<DebugSnapshot> {
  const timestamp = new Date().toISOString();
  const url = page.url();
  const title = await page.title().catch(() => 'Unknown');
  const viewport = page.viewportSize();

  // Collect console logs
  const consoleLogs: Array<{ type: string; text: string }> = [];
  const consoleListener = (msg: any) => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
    });
  };
  page.on('console', consoleListener);

  // Collect network requests
  const networkRequests: Array<{ url: string; method: string; status: number; duration: number }> = [];
  const requestListener = (request: any) => {
    const response = request.response();
    if (response) {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        status: response.status(),
        duration: response.timing()?.responseEnd - response.timing()?.requestStart || 0,
      });
    }
  };
  page.on('request', requestListener);

  // Get page state
  const pageState = await page.evaluate(() => {
    return {
      readyState: document.readyState,
      hasErrors: window.onerror !== null,
      errorCount: (window as any).__errorCount || 0,
    };
  }).catch(() => ({
    readyState: 'unknown',
    hasErrors: false,
    errorCount: 0,
  }));

  // Capture screenshot
  let screenshot: string | undefined;
  try {
    screenshot = await page.screenshot({ 
      path: `test-results/debug-${label}-${Date.now()}.png`,
      fullPage: true,
    });
  } catch {
    // Screenshot failed, continue
  }

  // Get HTML (limited size)
  const html = await page.content().catch(() => undefined);
  const htmlSnippet = html ? html.substring(0, 5000) : undefined;

  // Get storage
  const storage = await page.evaluate(() => {
    const localStorage: Record<string, string> = {};
    const sessionStorage: Record<string, string> = {};
    
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          localStorage[key] = window.localStorage.getItem(key) || '';
        }
      }
    } catch {
      // Access denied
    }

    try {
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          sessionStorage[key] = window.sessionStorage.getItem(key) || '';
        }
      }
    } catch {
      // Access denied
    }

    return { localStorage, sessionStorage };
  }).catch(() => ({
    localStorage: {},
    sessionStorage: {},
  }));

  // Clean up listeners
  page.off('console', consoleListener);
  page.off('request', requestListener);

  return {
    timestamp,
    url,
    title,
    viewport,
    consoleLogs,
    networkRequests,
    pageState,
    screenshot,
    html: htmlSnippet,
    storage,
  };
}

/**
 * Debug page state and log comprehensive information
 */
export async function debugPageState(
  page: Page,
  label: string = 'debug'
): Promise<DebugSnapshot> {
  const snapshot = await captureDebugSnapshot(page, label);

  console.log(`\n🔍 Debug Snapshot: ${label}`);
  console.log(`  URL: ${snapshot.url}`);
  console.log(`  Title: ${snapshot.title}`);
  console.log(`  Viewport: ${snapshot.viewport?.width}x${snapshot.viewport?.height}`);
  console.log(`  Ready State: ${snapshot.pageState.readyState}`);
  console.log(`  Console Logs: ${snapshot.consoleLogs.length}`);
  console.log(`  Network Requests: ${snapshot.networkRequests.length}`);
  console.log(`  Storage Items: ${Object.keys(snapshot.storage?.localStorage || {}).length} localStorage, ${Object.keys(snapshot.storage?.sessionStorage || {}).length} sessionStorage`);
  
  if (snapshot.consoleLogs.length > 0) {
    console.log(`\n  Console Logs:`);
    snapshot.consoleLogs.slice(0, 10).forEach((log, i) => {
      console.log(`    ${i + 1}. [${log.type}] ${log.text.substring(0, 100)}`);
    });
  }

  if (snapshot.networkRequests.length > 0) {
    console.log(`\n  Network Requests (last 10):`);
    snapshot.networkRequests.slice(-10).forEach((req, i) => {
      console.log(`    ${i + 1}. ${req.method} ${req.url.substring(0, 80)} - ${req.status} (${req.duration}ms)`);
    });
  }

  console.log('');

  return snapshot;
}

/**
 * Analyze test failure and provide insights
 */
export async function analyzeTestFailure(
  page: Page,
  testName: string,
  error: Error
): Promise<FailureAnalysis> {
  const snapshot = await captureDebugSnapshot(page, 'failure');
  const errorContext = await getErrorContext(page);

  // Analyze possible causes
  const possibleCauses: string[] = [];
  const suggestedFixes: string[] = [];

  // Check for console errors
  if (errorContext.consoleErrors.length > 0) {
    possibleCauses.push('JavaScript errors in console');
    suggestedFixes.push('Check browser console for JavaScript errors');
  }

  // Check for network errors
  if (errorContext.networkErrors.length > 0) {
    possibleCauses.push('Network request failures');
    suggestedFixes.push('Check network tab for failed requests');
    suggestedFixes.push('Verify API endpoints are accessible');
  }

  // Check page state
  if (snapshot.pageState.hasErrors) {
    possibleCauses.push('Page has runtime errors');
    suggestedFixes.push('Check for unhandled exceptions');
  }

  // Check for timeout
  if (error.message.includes('timeout') || error.message.includes('Timeout')) {
    possibleCauses.push('Test timeout');
    suggestedFixes.push('Increase test timeout');
    suggestedFixes.push('Check if page is loading correctly');
    suggestedFixes.push('Verify network conditions');
  }

  // Check for element not found
  if (error.message.includes('locator') || error.message.includes('selector')) {
    possibleCauses.push('Element not found');
    suggestedFixes.push('Verify selector is correct');
    suggestedFixes.push('Check if element is visible');
    suggestedFixes.push('Wait for element to appear');
  }

  // Check for navigation issues
  if (error.message.includes('navigation') || error.message.includes('goto')) {
    possibleCauses.push('Navigation failure');
    suggestedFixes.push('Check if URL is correct');
    suggestedFixes.push('Verify server is running');
    suggestedFixes.push('Check network connectivity');
  }

  return {
    testName,
    error,
    snapshot,
    possibleCauses,
    suggestedFixes,
  };
}

/**
 * Log comprehensive failure analysis
 */
export async function logFailureAnalysis(
  page: Page,
  testName: string,
  error: Error
): Promise<void> {
  const analysis = await analyzeTestFailure(page, testName, error);

  console.error('\n❌ Test Failure Analysis');
  console.error(`  Test: ${analysis.testName}`);
  console.error(`  Error: ${analysis.error.message}`);
  console.error(`  URL: ${analysis.snapshot.url}`);
  console.error(`  Timestamp: ${analysis.snapshot.timestamp}`);

  if (analysis.possibleCauses.length > 0) {
    console.error(`\n  Possible Causes:`);
    analysis.possibleCauses.forEach((cause, i) => {
      console.error(`    ${i + 1}. ${cause}`);
    });
  }

  if (analysis.suggestedFixes.length > 0) {
    console.error(`\n  Suggested Fixes:`);
    analysis.suggestedFixes.forEach((fix, i) => {
      console.error(`    ${i + 1}. ${fix}`);
    });
  }

  if (analysis.snapshot.screenshot) {
    console.error(`\n  Screenshot: ${analysis.snapshot.screenshot}`);
  }

  console.error('');
}

/**
 * Compare two snapshots to identify differences
 */
export function compareSnapshots(
  before: DebugSnapshot,
  after: DebugSnapshot
): {
  urlChanged: boolean;
  consoleLogsAdded: number;
  networkRequestsAdded: number;
  storageChanged: boolean;
  differences: string[];
} {
  const differences: string[] = [];

  if (before.url !== after.url) {
    differences.push(`URL changed: ${before.url} → ${after.url}`);
  }

  const consoleLogsAdded = after.consoleLogs.length - before.consoleLogs.length;
  if (consoleLogsAdded > 0) {
    differences.push(`${consoleLogsAdded} new console logs`);
  }

  const networkRequestsAdded = after.networkRequests.length - before.networkRequests.length;
  if (networkRequestsAdded > 0) {
    differences.push(`${networkRequestsAdded} new network requests`);
  }

  const storageChanged = 
    JSON.stringify(before.storage) !== JSON.stringify(after.storage);
  if (storageChanged) {
    differences.push('Storage changed');
  }

  return {
    urlChanged: before.url !== after.url,
    consoleLogsAdded,
    networkRequestsAdded,
    storageChanged,
    differences,
  };
}

/**
 * Monitor page for issues during test execution
 */
export class PageMonitor {
  private page: Page;
  private snapshots: DebugSnapshot[] = [];
  private errors: Error[] = [];
  private warnings: string[] = [];

  constructor(page: Page) {
    this.page = page;
    this.setupMonitoring();
  }

  private setupMonitoring(): void {
    // Monitor console errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.errors.push(new Error(msg.text()));
      } else if (msg.type() === 'warning') {
        this.warnings.push(msg.text());
      }
    });

    // Monitor page errors
    this.page.on('pageerror', (error) => {
      this.errors.push(error);
    });

    // Monitor request failures
    this.page.on('response', (response) => {
      if (response.status() >= 400) {
        this.warnings.push(`Request failed: ${response.url()} - ${response.status()}`);
      }
    });
  }

  /**
   * Capture a snapshot
   */
  async captureSnapshot(label: string): Promise<void> {
    const snapshot = await captureDebugSnapshot(this.page, label);
    this.snapshots.push(snapshot);
  }

  /**
   * Get all captured snapshots
   */
  getSnapshots(): DebugSnapshot[] {
    return this.snapshots;
  }

  /**
   * Get all errors
   */
  getErrors(): Error[] {
    return this.errors;
  }

  /**
   * Get all warnings
   */
  getWarnings(): string[] {
    return this.warnings;
  }

  /**
   * Check if there are any issues
   */
  hasIssues(): boolean {
    return this.errors.length > 0 || this.warnings.length > 0;
  }

  /**
   * Get summary
   */
  getSummary(): {
    snapshots: number;
    errors: number;
    warnings: number;
    hasIssues: boolean;
  } {
    return {
      snapshots: this.snapshots.length,
      errors: this.errors.length,
      warnings: this.warnings.length,
      hasIssues: this.hasIssues(),
    };
  }

  /**
   * Log summary
   */
  logSummary(): void {
    const summary = this.getSummary();
    console.log('\n📊 Page Monitor Summary:');
    console.log(`  Snapshots: ${summary.snapshots}`);
    console.log(`  Errors: ${summary.errors}`);
    console.log(`  Warnings: ${summary.warnings}`);
    console.log(`  Has Issues: ${summary.hasIssues ? 'Yes' : 'No'}`);
    console.log('');
  }
}

/**
 * Create a page monitor for a test
 */
export function createPageMonitor(page: Page): PageMonitor {
  return new PageMonitor(page);
}

/**
 * Wait for page to be in a stable state
 * Useful for debugging flaky tests
 */
export async function waitForStableState(
  page: Page,
  options: {
    timeout?: number;
    stabilityDuration?: number;
    checkInterval?: number;
  } = {}
): Promise<void> {
  const {
    timeout = 10000,
    stabilityDuration = 1000,
    checkInterval = 100,
  } = options;

  let lastState: string | null = null;
  let stableSince = Date.now();

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const currentState = await page.evaluate(() => {
      return JSON.stringify({
        readyState: document.readyState,
        activeConnections: (performance as any).getEntriesByType?.('resource').length || 0,
      });
    }).catch(() => null);

    if (currentState === lastState) {
      if (Date.now() - stableSince >= stabilityDuration) {
        return; // State is stable
      }
    } else {
      lastState = currentState;
      stableSince = Date.now();
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new Error('Page did not reach stable state within timeout');
}

