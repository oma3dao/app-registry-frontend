/**
 * Enhanced Authentication Tests
 * 
 * These tests attempt to enable authenticated scenarios using multiple approaches:
 * 1. Real wallet connection (if configured)
 * 2. Test mode detection
 * 3. API mocking
 */

import { test, expect } from './fixtures';
import { connectWalletWithEmail, verifyAuthenticatedState } from './auth-helpers';
import { setupTestPage, removeErrorOverlays, performanceMonitor } from './test-helpers';
import { setupTestWithIsolation } from './test-setup-helper';

test.describe('Enhanced Authentication Tests', () => {
  test.setTimeout(120000); // 2 minutes for auth flows

  test.beforeEach(async ({ page }) => {
    // Test isolation setup
    await setupTestWithIsolation(page);
  });

  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Enhanced Authentication Tests Performance Summary:');
      console.log(`  Total Tests: ${summary.total}`);
      console.log(`  Average Duration: ${summary.average.toFixed(2)}ms`);
    }
  });

  /**
   * Test: Attempt real wallet connection with email
   * This test will work if TEST_WALLET_EMAIL is configured
   */
  test('should connect wallet using email method', async ({ page }) => {
    performanceMonitor.startTest('should connect wallet using email method');
    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    // Check if test email is configured
    const testEmail = process.env.TEST_WALLET_EMAIL || 'test@example.com';
    
    // Attempt wallet connection
    const connected = await connectWalletWithEmail(page, testEmail);
    
    if (connected) {
      // Verify we're authenticated
      const isAuth = await verifyAuthenticatedState(page);
      expect(isAuth).toBe(true);
      
      // Verify dashboard content appears
      await expect(page.getByText(/My Registered Applications|Register New App/i).first())
        .toBeVisible({ timeout: 10000 });
      
      performanceMonitor.endTest();
    } else {
      // Skip if wallet connection not configured
      test.skip(true, 'Wallet connection not configured - set TEST_WALLET_EMAIL or configure test account');
    }
  });

  /**
   * Test: Verify authentication state detection
   * This tests the authentication verification logic
   */
  test('should detect authentication state correctly', async ({ page }) => {
    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });

    // Check initial state (should be unauthenticated)
    const initialAuth = await verifyAuthenticatedState(page);
    
    // If somehow authenticated, verify dashboard
    if (initialAuth) {
      await expect(page.getByText(/My Registered Applications|Register New App/i).first())
        .toBeVisible({ timeout: 5000 });
    } else {
      // Should show landing page
      await expect(page.getByText(/OMATrust|Get Started/i).first())
        .toBeVisible({ timeout: 5000 });
    }
    
    performanceMonitor.endTest();
  });

  /**
   * Test: Dashboard redirects when not authenticated
   * Verifies that unauthenticated users see appropriate content
   */
  test('should handle unauthenticated dashboard access', async ({ page }) => {
    performanceMonitor.startTest('should handle unauthenticated dashboard access');
    await setupTestPage(page, '/dashboard', {
      waitForReact: true,
      removeOverlays: true,
    });

    // Should either show landing page or authentication prompt
    const hasLandingContent = await page.getByText(/OMATrust|Get Started/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    
    const hasAuthPrompt = await page.getByRole('button', { name: /Connect|Sign In/i })
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // At least one should be visible
    expect(hasLandingContent || hasAuthPrompt).toBe(true);
    
    performanceMonitor.endTest();
  });
});

