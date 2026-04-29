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
  
  // Maximum time one test can run (increased for server startup)
  timeout: 120 * 1000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 5000,
    // Configure screenshot comparison for visual regression testing
    toHaveScreenshot: {
      // Threshold for pixel differences (0-1, where 0 is exact match)
      threshold: 0.2,
      // Maximum number of pixels that can differ
      maxDiffPixels: 100,
      // Animation timeout for screenshots
      animations: 'disabled',
    },
    // Configure snapshot comparison
    toMatchSnapshot: {
      threshold: 0.2,
      maxDiffPixels: 100,
    },
  },
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  
  // Optimized worker configuration
  // - CI: Use 1 worker to avoid overwhelming CI resources
  // - Local: Use 3 workers by default, configurable via TEST_WORKERS env var
  // - Can be increased for faster execution if system resources allow
  workers: process.env.CI 
    ? 1 
    : process.env.TEST_WORKERS 
      ? parseInt(process.env.TEST_WORKERS) 
      : 3,
  
  // Optimize test execution
  // Maximum number of test failures in the whole test run
  maxFailures: process.env.CI ? undefined : 10,
  
  // Performance optimizations - Test Sharding for CI/CD
  // Shard tests for parallel execution in CI/CD pipelines
  // Usage in CI:
  //   CI_SHARD=1 CI_SHARD_TOTAL=4 npx playwright test  # Run shard 1 of 4
  //   CI_SHARD=2 CI_SHARD_TOTAL=4 npx playwright test  # Run shard 2 of 4
  //   etc.
  // This allows running tests in parallel across multiple CI runners
  shard: process.env.CI_SHARD ? {
    total: parseInt(process.env.CI_SHARD_TOTAL || '1'),
    current: parseInt(process.env.CI_SHARD || '1'),
  } : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
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
    
    // Navigation timeout (increased for server startup)
    navigationTimeout: 60000,
    
    // Ignore HTTPS errors (useful for local dev)
    ignoreHTTPSErrors: true,
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
    reuseExistingServer: !process.env.CI, // Don't reuse in CI
    timeout: process.env.CI ? 180 * 1000 : 120 * 1000, // Longer timeout in CI
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      // Use test client ID for E2E tests if not set
      NEXT_PUBLIC_THIRDWEB_CLIENT_ID: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || 'test-client-id',
    },
  },
});
