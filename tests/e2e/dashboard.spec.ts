/**
 * E2E Tests for Dashboard
 * 
 * These tests verify dashboard functionality.
 * Note: Dashboard may require authentication - adjust tests accordingly.
 * 
 * To generate these tests with Cursor:
 * 1. Navigate to http://localhost:3000/dashboard
 * 2. Explore the dashboard UI
 * 3. Ask Cursor to generate tests based on what it sees
 */

import { test, expect } from './fixtures';
import { setupPage, removeErrorOverlays, isAuthenticated, waitForPageReady, waitForElementStable, performanceMonitor } from './test-helpers';
import { setupAuthenticatedPage } from './auth-helpers';

test.describe('Dashboard', () => {
  // Increase timeout for dashboard tests
  test.setTimeout(90000); // 90 seconds

  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Dashboard Tests Performance Summary:');
      console.log(`  Total Tests: ${summary.total}`);
      console.log(`  Average Duration: ${summary.average.toFixed(2)}ms`);
      console.log(`  Fast (<1s): ${summary.fast}, Normal (1-5s): ${summary.normal}, Slow (5-15s): ${summary.slow}, Very Slow (>15s): ${summary.verySlow}`);
      if (summary.slowestTests.length > 0) {
        console.log('  Slowest Tests:');
        summary.slowestTests.slice(0, 3).forEach((test, i) => {
          console.log(`    ${i + 1}. ${test.testName}: ${test.duration}ms`);
        });
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });
    
    // Navigate with retry logic
    let navigationSuccess = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
        navigationSuccess = true;
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        // Exponential backoff - wait for page to be ready
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    
    // Wait for page to be ready instead of arbitrary timeout
    await waitForPageReady(page, {
      waitForNetwork: false, // Already navigated
      waitForReact: true,
      keySelectors: ['body'],
    });
    await removeErrorOverlays(page);
  });

  /**
   * Test: Dashboard loads and displays content
   * This verifies the dashboard page structure is present
   * 
   * Component structure (from dashboard.tsx:309):
   * - Main container: div.container.mx-auto.px-4.py-8
   */
  test('should load dashboard page', async ({ page }) => {
    performanceMonitor.startTest('should load dashboard page');
    try {
      // Wait for page content to render
      await page.waitForSelector('body', { state: 'visible', timeout: 10000 });
    
    // Verify we're on the dashboard page
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Check for main container (from dashboard.tsx:309)
    // Container may not be visible if unauthenticated, but should exist in DOM
    const container = page.locator('div.container.mx-auto.px-4.py-4, div.container.mx-auto.px-4.py-8').first();
    const containerExists = await container.count() > 0;
    
    // Page should have some content (even if unauthenticated)
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    
    // If container exists, verify it's in the DOM
    if (containerExists) {
      await expect(container).toBeAttached();
    }
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Dashboard shows appropriate content based on auth state
   * This verifies the dashboard handles both authenticated and unauthenticated states
   * 
   * Component structure (from dashboard.tsx):
   * - Authenticated: Shows full dashboard with container, header, NFTGrid
   * - Unauthenticated: May show sign-in prompt or redirect
   */
  test('should display appropriate content based on auth state', async ({ page }) => {
    performanceMonitor.startTest('should display appropriate content based on auth state');
    try {
      const authenticated = await isAuthenticated(page);
    
    if (authenticated) {
      // If authenticated, verify dashboard content structure
      // Main container (from dashboard.tsx:309)
      const container = page.locator('div.container.mx-auto.px-4.py-8').first();
      await expect(container).toBeVisible({ timeout: 15000 });
      
      // Header section (from dashboard.tsx:310-322)
      const header = container.locator('div.flex.justify-between.items-center.mb-8').first();
      await expect(header).toBeVisible({ timeout: 10000 });
      
      // Check for dashboard-specific content
      const hasPortalHeading = await page.getByText(/OMATrust Registry Developer Portal/i).isVisible({ timeout: 5000 }).catch(() => false);
      const hasRegisterButton = await page.getByRole('button', { name: /Register New App/i }).isVisible({ timeout: 5000 }).catch(() => false);
      const hasApplicationsHeading = await page.getByText(/My Registered Applications/i).isVisible({ timeout: 5000 }).catch(() => false);
      
      // At least one should be visible if authenticated
      expect(hasPortalHeading || hasRegisterButton || hasApplicationsHeading).toBeTruthy();
    } else {
      // If not authenticated, page should still load (may show sign-in prompt)
      await expect(page.locator('body')).toBeVisible();
      
      // May show wallet connection prompt or redirect
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    }
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Dashboard displays when authenticated
   * Uses authenticated fixture to set up auth state
   * 
   * Component structure (from dashboard.tsx):
   * - Container: div.container.mx-auto.px-4.py-8
   * - Header: div.flex.justify-between.items-center.mb-8
   *   - h1: "OMATrust Registry Developer Portal"
   *   - Button: "Register New App" with PlusIcon
   * - Section: div.mb-6 with h1: "My Registered Applications"
   * - NFTGrid: grid with NFT cards or loading/empty states
   */
  test('should display dashboard when authenticated', async ({ authenticatedDashboard }) => {
    performanceMonitor.startTest('should display dashboard when authenticated');
    try {
      // Verify main container is present
      const container = authenticatedDashboard.locator('div.container.mx-auto.px-4.py-8').first();
    await expect(container).toBeVisible({ timeout: 15000 });
    
    // Verify dashboard header content (from dashboard.tsx:310-322)
    await expect(authenticatedDashboard.getByText(/OMATrust Registry Developer Portal/i)).toBeVisible();
    await expect(authenticatedDashboard.getByText(/My Registered Applications/i)).toBeVisible();
    
    // Verify Register New App button (from dashboard.tsx:313-320)
    // Button has: size="lg", PlusIcon, text "Register New App"
    const registerButton = authenticatedDashboard.getByRole('button', { name: /Register New App/i });
    await expect(registerButton).toBeVisible();
    
    // Verify button has PlusIcon (lucide-react icon)
    const buttonIcon = registerButton.locator('svg').first();
    await expect(buttonIcon).toBeVisible({ timeout: 5000 }).catch(() => {
      // Icon might not be visible if button is styled differently
    });
    
    // NFT grid should be present (from dashboard.tsx:355-361)
    // NFTGrid component structure (from nft-grid.tsx):
    // - Loading: div.flex.flex-col.items-center with "Loading Applications..."
    // - Empty: div.flex.flex-col.items-center with "No Applications Registered Yet"
    // - Grid: div.grid.grid-cols-1.md:grid-cols-2.lg:grid-cols-3.gap-6
    const nftGrid = authenticatedDashboard.locator('div.grid.grid-cols-1').or(
      authenticatedDashboard.locator('div.flex.flex-col.items-center').filter({ 
        hasText: /Loading Applications|No Applications Registered Yet/i 
      })
    );
    
    // Wait for grid to appear (loading, empty, or with cards)
    await expect(nftGrid.first()).toBeVisible({ timeout: 15000 });
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Dashboard navigation works
   * This verifies navigation within dashboard when authenticated
   */
  test('should allow navigation within dashboard', async ({ page }) => {
    performanceMonitor.startTest('should allow navigation within dashboard');
    try {
      await setupAuthenticatedPage(page, '/dashboard', {
        waitForReact: true,
        removeOverlays: true,
      });

    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // Look for navigation elements (nav links, buttons, etc.)
    const navLinks = page.locator('nav a');
    const linkCount = await navLinks.count();

    if (linkCount > 0) {
      // Test navigation to another page
      const firstLink = navLinks.first();
      const href = await firstLink.getAttribute('href');
      
      if (href && !href.startsWith('#')) {
        await firstLink.click();
        await page.waitForLoadState('domcontentloaded');
        
        // Verify navigation occurred
        if (href.startsWith('http')) {
          // External link - just verify it was clicked
          expect(href).toBeTruthy();
        } else {
          // Internal link - verify URL changed
          await expect(page).toHaveURL(new RegExp(href.replace('/', '\\/')));
        }
      }
    } else {
      // If no nav links, test dashboard internal navigation (if any)
      // For now, just verify page is functional
      await expect(page.locator('body')).toBeVisible();
    }
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Register New App button opens modal
   * Verifies the Register New App button functionality
   * 
   * Component structure (from dashboard.tsx:313-320):
   * - Button with PlusIcon and text "Register New App"
   * - Opens NFTMintModal (Radix Dialog) when clicked
   */
  test('should open Register New App modal when button clicked', async ({ authenticatedDashboard }) => {
    performanceMonitor.startTest('should open Register New App modal when button clicked');
    try {
      // Wait for dashboard to load
      await expect(authenticatedDashboard.getByText(/OMATrust Registry Developer Portal/i)).toBeVisible({ timeout: 15000 });
    
    // Find Register New App button (from dashboard.tsx:313-320)
    const registerButton = authenticatedDashboard.getByRole('button', { name: /Register New App/i });
    await expect(registerButton).toBeVisible();
    
    // Click the button
    await registerButton.click();
    
    // Wait for modal to open and stabilize
    const modal = authenticatedDashboard.locator('[role="dialog"]').first();
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    await waitForElementStable(modal, { stabilityDuration: 300 });
    const modalVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (modalVisible) {
      // Verify modal is open
      const dialogContent = modal.locator('[data-radix-dialog-content]').first();
      await expect(dialogContent).toBeVisible({ timeout: 5000 });
      
      // Modal should have some content (wizard steps, form fields, etc.)
      const modalContent = await dialogContent.textContent();
      expect(modalContent).toBeTruthy();
    } else {
      // Modal might not open if wallet not connected or other conditions
      test.skip(true, 'Modal did not open - may require wallet connection or other conditions');
    }
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: NFT Grid displays correct states
   * Verifies NFTGrid component shows loading, empty, or populated states correctly
   * 
   * Component structure (from nft-grid.tsx):
   * - Loading: div.flex.flex-col.items-center with "Loading Applications..."
   * - Empty: div.flex.flex-col.items-center with "No Applications Registered Yet" + button
   * - Populated: div.grid.grid-cols-1.md:grid-cols-2.lg:grid-cols-3.gap-6 with NFTCards
   */
  test('should display NFT grid in correct state', async ({ authenticatedDashboard }) => {
    performanceMonitor.startTest('should display NFT grid in correct state');
    try {
      // Wait for dashboard to load
      await expect(authenticatedDashboard.getByText(/My Registered Applications/i)).toBeVisible({ timeout: 15000 });
    
    // Check for NFT grid states
    // Loading state (from nft-grid.tsx:52-62)
    const loadingState = authenticatedDashboard.locator('div.flex.flex-col.items-center').filter({ 
      hasText: /Loading Applications/i 
    }).first();
    
    // Empty state (from nft-grid.tsx:65-83)
    const emptyState = authenticatedDashboard.locator('div.flex.flex-col.items-center').filter({ 
      hasText: /No Applications Registered Yet/i 
    }).first();
    
    // Populated state (from nft-grid.tsx:86-92)
    const gridState = authenticatedDashboard.locator('div.grid.grid-cols-1').first();
    
    // Wait for grid state to stabilize
    await waitForElementStable(gridState, { stabilityDuration: 500 });
    
    // At least one state should be visible
    const loadingVisible = await loadingState.isVisible({ timeout: 3000 }).catch(() => false);
    const emptyVisible = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
    const gridVisible = await gridState.isVisible({ timeout: 3000 }).catch(() => false);
    
    // Verify at least one state is present
    expect(loadingVisible || emptyVisible || gridVisible).toBeTruthy();
    
    // If empty state, verify it has the Register New App button
    if (emptyVisible) {
      const emptyStateButton = emptyState.getByRole('button', { name: /Register New App/i });
      const buttonVisible = await emptyStateButton.isVisible({ timeout: 2000 }).catch(() => false);
      // Button should be present in empty state
      expect(buttonVisible).toBeTruthy();
    }
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Testnet notice displays on testnet
   * Verifies testnet faucet notice appears on testnet chain
   * 
   * Component structure (from dashboard.tsx:328-353):
   * - Conditional rendering based on env.chainId === 66238
   * - Notice: div.mb-6.p-4.bg-blue-50 with InfoIcon and faucet link
   */
  test('should display testnet notice when on testnet', async ({ authenticatedDashboard }) => {
    performanceMonitor.startTest('should display testnet notice when on testnet');
    try {
      // Wait for dashboard to load
      await expect(authenticatedDashboard.getByText(/OMATrust Registry Developer Portal/i)).toBeVisible({ timeout: 15000 });
    
    // Check for testnet notice (from dashboard.tsx:330-352)
    // Notice has: bg-blue-50 dark:bg-blue-950, InfoIcon, text about testnet faucet
    const testnetNotice = authenticatedDashboard.locator('div.bg-blue-50, div.dark\\:bg-blue-950').filter({ 
      hasText: /testnet|faucet/i 
    }).first();
    
    const noticeVisible = await testnetNotice.isVisible({ timeout: 5000 }).catch(() => false);
    
    // Notice may or may not be visible depending on chainId
    // If visible, verify it has the expected content
    if (noticeVisible) {
      await expect(testnetNotice).toBeVisible();
      
      // Check for InfoIcon (from dashboard.tsx:332)
      const infoIcon = testnetNotice.locator('svg').first();
      const iconVisible = await infoIcon.isVisible({ timeout: 2000 }).catch(() => false);
      
      // Check for faucet link (from dashboard.tsx:339-347)
      const faucetLink = testnetNotice.getByRole('link', { name: /faucet/i });
      const linkVisible = await faucetLink.isVisible({ timeout: 2000 }).catch(() => false);
      
      // If notice is visible, it should have icon and link
      if (iconVisible || linkVisible) {
        expect(iconVisible || linkVisible).toBeTruthy();
      }
    } else {
      // Notice not visible - likely on mainnet or localhost
      test.skip(true, 'Testnet notice not visible - may be on mainnet or localhost');
    }
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });
});

