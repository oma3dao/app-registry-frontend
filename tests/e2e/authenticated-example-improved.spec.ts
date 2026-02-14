/**
 * Example: Authenticated Tests with Real Wallet Connection
 * 
 * This file demonstrates how to write authenticated E2E tests
 * using the improved authentication helpers.
 * 
 * Note: These tests require a test wallet account to be configured.
 * See AUTHENTICATION_USAGE.md for setup instructions.
 */

import { test, expect } from './fixtures';
import { connectWalletWithEmail, verifyAuthenticatedState } from './auth-helpers';
import { performanceMonitor } from './test-helpers';
import { setupTestWithIsolation } from './test-setup-helper';

test.describe('Authenticated Examples - Real Wallet Connection', () => {
  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Authenticated Examples Tests Performance Summary:');
      console.log(`  Total Tests: ${summary.total}`);
      console.log(`  Average Duration: ${summary.average.toFixed(2)}ms`);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Test isolation setup
    await setupTestWithIsolation(page);
  });
  /**
   * Example: Connect wallet and verify dashboard
   * This test actually connects a wallet during the test
   */
  test('should connect wallet and display dashboard', async ({ page }) => {
    performanceMonitor.startTest('should connect wallet and display dashboard');
    try {
    // Navigate to landing page
    await page.goto('/');
    
    // Verify we're on landing page
    await expect(page.getByText(/OMATrust is Trust/i)).toBeVisible();
    
    // Connect wallet using email (requires test account)
    // Replace with your test email or skip if not configured
    const testEmail = process.env.TEST_WALLET_EMAIL || 'test@example.com';
    const connected = await connectWalletWithEmail(page, testEmail);
    
    if (!connected) {
      test.skip(true, 'Wallet connection failed - configure TEST_WALLET_EMAIL or test account');
      return;
    }
    
    // Verify authentication state
    const isAuth = await verifyAuthenticatedState(page);
    expect(isAuth).toBe(true);
    
    // Verify dashboard content appears
    await expect(page.getByText(/My Registered Applications/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Register New App/i })).toBeVisible();
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Example: Test wizard flow after authentication
   */
  test('should open wizard after wallet connection', async ({ page }) => {
    performanceMonitor.startTest('should open wizard after wallet connection');
    try {
    await page.goto('/');
    
    // Connect wallet
    const testEmail = process.env.TEST_WALLET_EMAIL || 'test@example.com';
    const connected = await connectWalletWithEmail(page, testEmail);
    
    if (!connected) {
      test.skip(true, 'Wallet connection required');
      return;
    }
    
    // Wait for dashboard
    await expect(page.getByText(/My Registered Applications/i)).toBeVisible();
    
    // Open wizard
    const registerButton = page.getByRole('button', { name: /Register New App/i });
    await registerButton.click();
    
    // Verify wizard modal appears
    await expect(page.getByText(/Register New App/i)).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });
});

test.describe('Authenticated Examples - Using Fixtures', () => {
  test.beforeEach(async ({ page }) => {
    // Test isolation setup
    await setupTestWithIsolation(page);
  });

  /**
   * Example: Using authenticated fixtures
   * Note: These will be skipped if authentication mock doesn't work
   */
  test('should use authenticatedDashboard fixture', async ({ authenticatedDashboard }) => {
    performanceMonitor.startTest('should use authenticatedDashboard fixture');
    try {
    // Fixture handles authentication setup
    // If mock doesn't work, test will be skipped automatically
    
    // Verify dashboard content
    await expect(authenticatedDashboard.getByText(/My Registered Applications/i)).toBeVisible();
    await expect(authenticatedDashboard.getByRole('button', { name: /Register New App/i })).toBeVisible();
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });
});

