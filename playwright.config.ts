import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Tests
 * 
 * This configuration supports:
 * - Running tests against your Next.js dev server
 * - Multiple browsers (Chromium, Firefox, WebKit)
 * - Mobile viewports
 * - Visual debugging with traces and screenshots
 * 
 * Usage:
 *   npm run test:e2e          - Run all E2E tests (Firefox by default)
 *   npm run test:e2e:ui       - Run with Playwright UI
 *   npm run test:e2e:headed   - Run in visible browser
 *   npm run test:e2e:debug    - Run in debug mode
 *   npm run test:e2e:firefox  - Run tests only on Firefox
 *   npm run test:e2e:chromium - Run tests only on Chromium (if enabled)
 *   npm run test:e2e:webkit   - Run tests only on WebKit (if enabled)
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Maximum time one test can run
  timeout: 60 * 1000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ...(process.env.CI ? [['github']] : []),
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for your app
    baseURL: 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Action timeout
    actionTimeout: 10000,
  },

  // Configure projects for major browsers
  // Firefox is set as the default browser
  projects: [
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    // Uncomment to run tests on multiple browsers
    // {
    //   name: 'chromium',
    //   use: { ...devices['Desktop Chrome'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile viewports (optional - comment out if not needed)
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Run your local dev server before starting the tests
  // If you have a server running, Playwright will reuse it
  // Otherwise, it will start one automatically
  webServer: process.env.SKIP_WEBSERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Always reuse existing server
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      // Use test client ID for E2E tests if not set
      NEXT_PUBLIC_THIRDWEB_CLIENT_ID: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || 'test-client-id',
    },
  },
});
