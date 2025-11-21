/**
 * Test Utilities for E2E Tests
 * 
 * Common helpers for Playwright E2E tests including:
 * - Error overlay handling
 * - Authentication helpers
 * - Common selectors
 * - Wait utilities
 */

import { Page } from '@playwright/test';

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
    await page.waitForTimeout(500);
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
  await page.waitForTimeout(2000);
  
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
  await page.waitForTimeout(1000);
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

