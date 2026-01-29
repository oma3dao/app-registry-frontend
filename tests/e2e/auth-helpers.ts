/**
 * Authentication Helpers for E2E Tests
 * 
 * These utilities help set up authenticated test scenarios.
 * 
 * Note: For full integration testing, you may need to use real wallet connections.
 * For faster unit-style E2E tests, you can mock authentication state.
 */

import { Page, BrowserContext } from '@playwright/test';

/**
 * Mock authentication state by setting localStorage/cookies
 * This simulates an authenticated user without requiring actual wallet connection
 */
export async function mockAuthenticatedState(page: Page): Promise<void> {
  // Set localStorage items that Thirdweb might use
  await page.addInitScript(() => {
    // Mock wallet address
    const mockAddress = '0x1234567890123456789012345678901234567890';
    
    // Set common Thirdweb storage keys
    localStorage.setItem('thirdweb:wallet', JSON.stringify({
      address: mockAddress,
      chainId: 31337, // OMAChain testnet or localhost
    }));
    
    // Mock account state
    localStorage.setItem('thirdweb:account', JSON.stringify({
      address: mockAddress,
      isConnected: true,
    }));
  });
}

/**
 * Create an authenticated browser context
 * Use this for tests that require authentication
 */
export async function createAuthenticatedContext(
  baseContext: BrowserContext
): Promise<BrowserContext> {
  // Create a new context with authentication state
  const context = await baseContext.browser()!.newContext({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:3000',
          localStorage: [
            {
              name: 'thirdweb:wallet',
              value: JSON.stringify({
                address: '0x1234567890123456789012345678901234567890',
                chainId: 31337,
              }),
            },
            {
              name: 'thirdweb:account',
              value: JSON.stringify({
                address: '0x1234567890123456789012345678901234567890',
                isConnected: true,
              }),
            },
          ],
        },
      ],
    },
  });
  
  return context;
}

/**
 * Wait for wallet connection UI and simulate connection
 * This attempts to interact with the actual wallet connection flow
 * 
 * Note: For full E2E testing, you may need to:
 * 1. Set up a test wallet account
 * 2. Configure browser extensions (for MetaMask)
 * 3. Use test credentials for in-app wallet
 */
export async function connectWallet(page: Page, method: 'in-app' | 'metamask' = 'in-app'): Promise<boolean> {
  try {
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
    
    // Look for connect button with multiple strategies
    const connectButton = page.locator(
      'button:has-text("Connect"), button:has-text("Get Started"), button:has-text("Sign In"), [role="button"]:has-text("Connect")'
    ).first();
    
    if (await connectButton.isVisible({ timeout: 10000 })) {
      await connectButton.scrollIntoViewIfNeeded();
      await connectButton.click();
      
      // Wait for wallet selection modal
      await page.waitForSelector('[role="dialog"], [class*="modal"], [class*="dialog"]', { 
        state: 'visible', 
        timeout: 10000 
      });
      
      // For in-app wallet, look for social login options
      if (method === 'in-app') {
        // Try to find email option
        const emailOption = page.locator(
          'button:has-text("Email"), button:has-text("Continue with Email"), button:has-text("email")'
        ).first();
        
        if (await emailOption.isVisible({ timeout: 5000 }).catch(() => false)) {
          await emailOption.click();
          
          // Wait for email input (if it appears)
          const emailInput = page.locator('input[type="email"], input[name="email"]').first();
          if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            // In a real test, fill with test email
            // For now, return false to indicate manual step needed
            console.log('Email input found - fill with test credentials to complete');
            return false;
          }
        }
      }
      
      // For MetaMask, would need browser extension
      if (method === 'metamask') {
        // MetaMask requires browser extension setup
        // See: https://playwright.dev/docs/auth#testing-with-browser-extensions
        console.log('MetaMask connection requires browser extension setup');
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.warn('Wallet connection simulation failed:', error);
    return false;
  }
}

/**
 * Connect wallet using in-app email method with test credentials
 * This is a more complete implementation for automated testing
 */
export async function connectWalletWithEmail(
  page: Page, 
  email: string = 'test@example.com'
): Promise<boolean> {
  try {
    // Click connect button
    const connectButton = page.getByRole('button', { 
      name: /Connect|Get Started|Sign In/i 
    }).first();
    
    await connectButton.waitFor({ state: 'visible', timeout: 10000 });
    await connectButton.click();
    
    // Wait for modal with longer timeout
    await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 15000 });
    
    // Wait a bit for modal content to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Click email option - try multiple selectors with better error handling
    const emailSelectors = [
      () => page.getByRole('button', { name: /Email|Continue with Email/i }).first(),
      () => page.locator('button:has-text("Email")').first(),
      () => page.locator('button:has-text("Continue with Email")').first(),
      () => page.locator('button:has-text("email")').first(), // case insensitive
      () => page.locator('[data-testid*="email" i]').first(),
      () => page.locator('[aria-label*="email" i]').first(),
      () => page.locator('button').filter({ hasText: /email/i }).first(),
    ];
    
    let emailOption = null;
    let lastError = null;
    
    for (const selectorFn of emailSelectors) {
      try {
        const selector = selectorFn();
        await selector.waitFor({ state: 'visible', timeout: 5000 });
        const isVisible = await selector.isVisible();
        if (isVisible) {
          emailOption = selector;
          break;
        }
      } catch (error: any) {
        lastError = error;
        continue;
      }
    }
    
    if (!emailOption) {
      // Log available buttons for debugging
      const allButtons = await page.locator('button').all();
      const buttonTexts = await Promise.all(
        allButtons.map(async (btn) => {
          try {
            return await btn.textContent();
          } catch {
            return null;
          }
        })
      );
      console.warn('Available buttons in modal:', buttonTexts.filter(Boolean));
      throw new Error(`Email option button not found. Last error: ${lastError?.message || 'unknown'}`);
    }
    
    await emailOption.click();
    
    // Fill email
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(email);
    
    // Submit (look for continue/submit button)
    const submitButton = page.getByRole('button', { 
      name: /Continue|Submit|Next|Send/i 
    }).first();
    
    await submitButton.click();
    
    // Wait for authentication to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify we're authenticated
    const isAuth = await verifyAuthenticatedState(page);
    return isAuth;
  } catch (error) {
    console.warn('Email wallet connection failed:', error);
    return false;
  }
}

/**
 * Check if page shows authenticated state
 * More comprehensive than isAuthenticated helper
 */
export async function verifyAuthenticatedState(page: Page): Promise<boolean> {
  // Check multiple indicators of authentication
  const checks = [
    // Wallet address pattern
    page.locator('text=/0x[a-fA-F0-9]{40}/').first().isVisible({ timeout: 2000 }).catch(() => false),
    // Dashboard content
    page.getByText(/My Registered Applications|Register New App/i).first().isVisible({ timeout: 2000 }).catch(() => false),
    // User menu or profile indicator
    page.locator('[aria-label*="account" i], [aria-label*="wallet" i]').first().isVisible({ timeout: 2000 }).catch(() => false),
  ];
  
  const results = await Promise.all(checks);
  return results.some(result => result === true);
}

/**
 * Setup page with authentication state
 * Combines page setup with authentication
 */
export async function setupAuthenticatedPage(
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
  // Set up authentication state first (before navigation)
  await mockAuthenticatedState(page);
  
  // Use setupTestPage for navigation with retry logic
  const { setupTestPage } = await import('./test-helpers');
  await setupTestPage(page, url, {
    waitForReact: options.waitForReact ?? true,
    removeOverlays: options.removeOverlays ?? true,
    timeout: options.timeout ?? 10000,
    navigationTimeout: options.navigationTimeout ?? 60000,
    retries: options.retries ?? 3,
  });
  
  // Verify authentication state
  const isAuth = await verifyAuthenticatedState(page);
  if (!isAuth) {
    console.warn('Warning: Page may not be in authenticated state after setup');
  }
}

/**
 * Test wallet address for use in tests
 */
export const TEST_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';

/**
 * Test account data for mocking
 */
export const TEST_ACCOUNT_DATA = {
  address: TEST_WALLET_ADDRESS,
  chainId: 31337, // OMAChain testnet
  isConnected: true,
};

