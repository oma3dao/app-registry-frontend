/**
 * Test Fixtures and Setup Utilities
 * 
 * Comprehensive test fixtures and setup utilities for consistent test initialization,
 * configuration, and teardown across the test suite.
 * 
 * Usage:
 * ```typescript
 * import { test } from './test-fixtures';
 * 
 * test('should do something', async ({ page, testData, apiClient }) => {
 *   // Use fixtures
 * });
 * ```
 */

import { test as base, Page, BrowserContext, APIRequestContext } from '@playwright/test';
import { 
  setupTestPage, 
  waitForPageReady,
  cleanupTestState,
  ensureTestIsolation,
  createTestAppData,
  createTestUrl,
  createTestDID,
  performanceMonitor,
} from './test-helpers';
import { TestPerformanceMonitor } from './test-performance';

/**
 * Test Data Fixture
 * Provides test data factories and utilities
 */
export interface TestDataFixture {
  createAppData: typeof createTestAppData;
  createUrl: typeof createTestUrl;
  createDID: typeof createTestDID;
  testId: string;
}

/**
 * API Client Fixture
 * Provides API testing utilities
 */
export interface ApiClientFixture {
  request: APIRequestContext;
  baseUrl: string;
}

/**
 * Page Setup Fixture
 * Provides page setup and navigation utilities
 */
export interface PageSetupFixture {
  setupPage: (url: string, options?: SetupPageOptions) => Promise<void>;
  navigateTo: (url: string) => Promise<void>;
  waitForReady: () => Promise<void>;
}

/**
 * Test Configuration Fixture
 * Provides test configuration and environment info
 */
export interface TestConfigFixture {
  baseURL: string;
  timeout: number;
  isCI: boolean;
  isLocal: boolean;
}

/**
 * Performance Fixture
 * Provides performance monitoring utilities
 */
export interface PerformanceFixture {
  monitor: TestPerformanceMonitor;
  startTest: (testName: string) => void;
  endTest: (testName: string) => void;
}

/**
 * Setup Page Options
 */
export interface SetupPageOptions {
  waitForReact?: boolean;
  removeOverlays?: boolean;
  timeout?: number;
  navigationTimeout?: number;
  retries?: number;
  waitForNetwork?: boolean;
  keySelectors?: string[];
}

/**
 * Extended Test Fixtures
 */
export interface TestFixtures {
  testData: TestDataFixture;
  apiClient: ApiClientFixture;
  pageSetup: PageSetupFixture;
  testConfig: TestConfigFixture;
  performance: PerformanceFixture;
}

/**
 * Create test data fixture
 */
export const testDataFixture = base.extend<{ testData: TestDataFixture }>({
  testData: async ({ page }, use) => {
    const testId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    await use({
      createAppData: createTestAppData,
      createUrl: createTestUrl,
      createDID: createTestDID,
      testId,
    });
  },
});

/**
 * Create API client fixture
 */
export const apiClientFixture = base.extend<{ apiClient: ApiClientFixture }>({
  apiClient: async ({ request }, use) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    await use({
      request,
      baseUrl,
    });
  },
});

/**
 * Create page setup fixture
 */
export const pageSetupFixture = base.extend<{ pageSetup: PageSetupFixture }>({
  pageSetup: async ({ page }, use) => {
    const setupPage = async (url: string, options: SetupPageOptions = {}) => {
      await setupTestPage(page, url, {
        waitForReact: options.waitForReact ?? true,
        removeOverlays: options.removeOverlays ?? true,
        timeout: options.timeout,
        navigationTimeout: options.navigationTimeout,
        retries: options.retries ?? 1,
      });

      if (options.waitForNetwork || options.keySelectors) {
        await waitForPageReady(page, {
          waitForNetwork: options.waitForNetwork ?? false,
          waitForReact: options.waitForReact ?? true,
          keySelectors: options.keySelectors,
        });
      }
    };

    const navigateTo = async (url: string) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    };

    const waitForReady = async () => {
      await waitForPageReady(page, {
        waitForNetwork: true,
        waitForReact: true,
      });
    };

    await use({
      setupPage,
      navigateTo,
      waitForReady,
    });
  },
});

/**
 * Create test config fixture
 */
export const testConfigFixture = base.extend<{ testConfig: TestConfigFixture }>({
  testConfig: async ({}, use) => {
    await use({
      baseURL: process.env.BASE_URL || 'http://localhost:3000',
      timeout: 120000, // 2 minutes
      isCI: !!process.env.CI,
      isLocal: !process.env.CI,
    });
  },
});

/**
 * Create performance fixture
 */
export const performanceFixture = base.extend<{ performance: PerformanceFixture }>({
  performance: async ({}, use, testInfo) => {
    const testName = testInfo.title;
    
    performanceMonitor.startTest(testName);
    
    await use({
      monitor: performanceMonitor,
      startTest: (name: string) => performanceMonitor.startTest(name),
      endTest: (name: string) => performanceMonitor.endTest(name),
    });

    performanceMonitor.endTest(testName);
  },
});

/**
 * Combined test fixture with all utilities
 * Combine all fixtures into a single extend call
 */
export const test = base.extend<{
  testData: TestDataFixture;
  apiClient: ApiClientFixture;
  pageSetup: PageSetupFixture;
  testConfig: TestConfigFixture;
  performance: PerformanceFixture;
}>({
  testData: async ({ page }, use) => {
    const testId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    await use({
      createAppData: createTestAppData,
      createUrl: createTestUrl,
      createDID: createTestDID,
      testId,
    });
  },
  
  apiClient: async ({ request }, use) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    await use({
      request,
      baseUrl,
    });
  },
  
  pageSetup: async ({ page }, use) => {
    const setupPage = async (url: string, options: SetupPageOptions = {}) => {
      await setupTestPage(page, url, {
        waitForReact: options.waitForReact ?? true,
        removeOverlays: options.removeOverlays ?? true,
        timeout: options.timeout,
        navigationTimeout: options.navigationTimeout,
        retries: options.retries ?? 1,
      });

      if (options.waitForNetwork || options.keySelectors) {
        await waitForPageReady(page, {
          waitForNetwork: options.waitForNetwork ?? false,
          waitForReact: options.waitForReact ?? true,
          keySelectors: options.keySelectors,
        });
      }
    };

    const navigateTo = async (url: string) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    };

    const waitForReady = async () => {
      await waitForPageReady(page, {
        waitForNetwork: true,
        waitForReact: true,
      });
    };

    await use({
      setupPage,
      navigateTo,
      waitForReady,
    });
  },
  
  testConfig: async ({}, use) => {
    await use({
      baseURL: process.env.BASE_URL || 'http://localhost:3000',
      timeout: 120000, // 2 minutes
      isCI: !!process.env.CI,
      isLocal: !process.env.CI,
    });
  },
  
  performance: async ({}, use, testInfo) => {
    const testName = testInfo.title;
    
    performanceMonitor.startTest(testName);
    
    await use({
      monitor: performanceMonitor,
      startTest: (name: string) => performanceMonitor.startTest(name),
      endTest: (name: string) => performanceMonitor.endTest(name),
    });

    performanceMonitor.endTest(testName);
  },
});

/**
 * Test Suite Setup Helper
 * Provides common setup for test suites
 */
export interface TestSuiteSetup {
  beforeEach?: (page: Page) => Promise<void>;
  afterEach?: (page: Page) => Promise<void>;
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
}

/**
 * Create test suite setup
 */
export function createTestSuiteSetup(options: {
  setupPage?: (page: Page) => Promise<void>;
  cleanupPage?: (page: Page) => Promise<void>;
  isolateTests?: boolean;
  trackPerformance?: boolean;
} = {}): TestSuiteSetup {
  const {
    setupPage,
    cleanupPage,
    isolateTests = true,
    trackPerformance = true,
  } = options;

  return {
    beforeEach: async (page: Page) => {
      if (isolateTests) {
        await ensureTestIsolation(page, {
          resetStorage: true,
          resetCookies: true,
          resetAuth: true,
        });
      }

      if (setupPage) {
        await setupPage(page);
      }
    },

    afterEach: async (page: Page) => {
      if (cleanupPage) {
        await cleanupPage(page);
      } else {
        await cleanupTestState(page, {
          clearStorage: true,
          clearCookies: true,
          resetNetwork: true,
        });
      }
    },

    afterAll: trackPerformance
      ? () => {
          const summary = performanceMonitor.getSummary();
          if (summary.total > 0) {
            console.log('\n📊 Test Suite Performance Summary:');
            console.log(`  Total Tests: ${summary.total}`);
            console.log(`  Average Duration: ${summary.average.toFixed(2)}ms`);
            console.log(`  Fast (<1s): ${summary.fast}, Normal (1-5s): ${summary.normal}, Slow (5-15s): ${summary.slow}, Very Slow (>15s): ${summary.verySlow}`);
            if (summary.slowestTests.length > 0) {
              console.log('  Slowest Tests:');
              summary.slowestTests.slice(0, 5).forEach((test, i) => {
                console.log(`    ${i + 1}. ${test.testName}: ${test.duration}ms`);
              });
            }
          }
        }
      : undefined,
  };
}

/**
 * Standard test suite setup
 * Use this for most test suites
 */
export const standardTestSuiteSetup = createTestSuiteSetup({
  setupPage: async (page: Page) => {
    await setupTestPage(page, '/', {
      waitForReact: true,
      removeOverlays: true,
    });
    await waitForPageReady(page, {
      waitForNetwork: true,
      waitForReact: true,
    });
  },
  isolateTests: true,
  trackPerformance: true,
});

/**
 * Minimal test suite setup
 * Use this for simple tests that don't need full setup
 */
export const minimalTestSuiteSetup = createTestSuiteSetup({
  isolateTests: true,
  trackPerformance: false,
});

/**
 * API test suite setup
 * Use this for API-focused tests
 */
export const apiTestSuiteSetup = createTestSuiteSetup({
  setupPage: async (page: Page) => {
    // Minimal setup for API tests
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  },
  isolateTests: true,
  trackPerformance: true,
});

/**
 * Apply test suite setup to a test suite
 */
export function applyTestSuiteSetup(
  testSuite: typeof test.describe,
  setup: TestSuiteSetup
): void {
  if (setup.beforeAll) {
    testSuite.beforeAll(setup.beforeAll);
  }

  if (setup.beforeEach) {
    testSuite.beforeEach(async ({ page }) => {
      await setup.beforeEach!(page);
    });
  }

  if (setup.afterEach) {
    testSuite.afterEach(async ({ page }) => {
      await setup.afterEach!(page);
    });
  }

  if (setup.afterAll) {
    testSuite.afterAll(setup.afterAll);
  }
}

/**
 * Test fixture builder
 * Allows creating custom test fixtures
 */
export class TestFixtureBuilder {
  private fixtures: any[] = [];

  /**
   * Add a fixture
   */
  addFixture<T extends Record<string, any>>(fixture: typeof base.extend<T>): this {
    this.fixtures.push(fixture);
    return this;
  }

  /**
   * Build the test with all fixtures
   */
  build(): typeof test {
    let result = base;
    for (const fixture of this.fixtures) {
      result = result.extend(fixture);
    }
    return result as typeof test;
  }
}

/**
 * Create a custom test fixture builder
 */
export function createTestFixtureBuilder(): TestFixtureBuilder {
  return new TestFixtureBuilder();
}

