/**
 * Test Environment Management
 * 
 * Utilities for managing test environments, configuration, and environment-specific behavior.
 * 
 * Usage:
 * ```typescript
 * import { getTestEnvironment, isCI, isLocal } from './test-environment';
 * 
 * const env = getTestEnvironment();
 * if (isCI()) {
 *   // CI-specific test behavior
 * }
 * ```
 */

export type TestEnvironment = 'local' | 'ci' | 'staging' | 'production';

export interface TestEnvironmentConfig {
  environment: TestEnvironment;
  baseUrl: string;
  apiUrl: string;
  timeout: number;
  retries: number;
  workers: number;
  headless: boolean;
  slowMo: number;
  trace: boolean;
  video: boolean;
  screenshot: 'only-on-failure' | 'on' | 'off';
}

/**
 * Get current test environment
 */
export function getTestEnvironment(): TestEnvironment {
  const env = process.env.TEST_ENV || process.env.NODE_ENV || 'local';
  
  if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
    return 'ci';
  }
  
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  
  return 'local';
}

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return getTestEnvironment() === 'ci';
}

/**
 * Check if running locally
 */
export function isLocal(): boolean {
  return getTestEnvironment() === 'local';
}

/**
 * Check if running in staging
 */
export function isStaging(): boolean {
  return getTestEnvironment() === 'staging';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getTestEnvironment() === 'production';
}

/**
 * Get base URL for tests
 */
export function getBaseUrl(): string {
  const env = getTestEnvironment();
  const envUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  switch (env) {
    case 'ci':
      return process.env.CI_BASE_URL || 'http://localhost:3000';
    case 'staging':
      return process.env.STAGING_BASE_URL || 'https://staging.example.com';
    case 'production':
      return process.env.PRODUCTION_BASE_URL || 'https://example.com';
    default:
      return 'http://localhost:3000';
  }
}

/**
 * Get API URL for tests
 */
export function getApiUrl(): string {
  const env = getTestEnvironment();
  const baseUrl = getBaseUrl();
  
  // API URL is typically the same as base URL for Next.js apps
  return baseUrl;
}

/**
 * Get test timeout based on environment
 */
export function getTestTimeout(): number {
  const env = getTestEnvironment();
  
  switch (env) {
    case 'ci':
      return 60000; // 60 seconds in CI
    case 'staging':
    case 'production':
      return 90000; // 90 seconds for remote environments
    default:
      return 30000; // 30 seconds locally
  }
}

/**
 * Get number of retries based on environment
 */
export function getTestRetries(): number {
  const env = getTestEnvironment();
  
  switch (env) {
    case 'ci':
      return 2; // Retry twice in CI
    case 'staging':
    case 'production':
      return 1; // Retry once for remote
    default:
      return 0; // No retries locally
  }
}

/**
 * Get number of workers based on environment
 */
export function getTestWorkers(): number {
  const env = getTestEnvironment();
  const envWorkers = process.env.TEST_WORKERS;
  
  if (envWorkers) {
    return parseInt(envWorkers, 10);
  }
  
  switch (env) {
    case 'ci':
      return 1; // Single worker in CI for stability
    case 'staging':
    case 'production':
      return 2; // 2 workers for remote
    default:
      return 3; // 3 workers locally
  }
}

/**
 * Check if tests should run headless
 */
export function shouldRunHeadless(): boolean {
  const env = getTestEnvironment();
  const headlessEnv = process.env.HEADLESS;
  
  if (headlessEnv !== undefined) {
    return headlessEnv === 'true';
  }
  
  return env !== 'local'; // Headless in CI/staging/production
}

/**
 * Get slow motion delay (for debugging)
 */
export function getSlowMo(): number {
  const env = getTestEnvironment();
  const slowMoEnv = process.env.SLOW_MO;
  
  if (slowMoEnv) {
    return parseInt(slowMoEnv, 10);
  }
  
  return env === 'local' ? 0 : 0; // No slow mo by default
}

/**
 * Check if trace should be enabled
 */
export function shouldEnableTrace(): boolean {
  const env = getTestEnvironment();
  const traceEnv = process.env.TRACE;
  
  if (traceEnv !== undefined) {
    return traceEnv === 'true';
  }
  
  return env === 'ci'; // Enable trace in CI
}

/**
 * Check if video should be recorded
 */
export function shouldRecordVideo(): boolean {
  const env = getTestEnvironment();
  const videoEnv = process.env.VIDEO;
  
  if (videoEnv !== undefined) {
    return videoEnv === 'true';
  }
  
  return env === 'ci'; // Record video in CI
}

/**
 * Get screenshot mode
 */
export function getScreenshotMode(): 'only-on-failure' | 'on' | 'off' {
  const env = getTestEnvironment();
  const screenshotEnv = process.env.SCREENSHOT;
  
  if (screenshotEnv) {
    return screenshotEnv as 'only-on-failure' | 'on' | 'off';
  }
  
  switch (env) {
    case 'ci':
      return 'only-on-failure';
    case 'staging':
    case 'production':
      return 'on';
    default:
      return 'only-on-failure';
  }
}

/**
 * Get complete test environment configuration
 */
export function getTestEnvironmentConfig(): TestEnvironmentConfig {
  return {
    environment: getTestEnvironment(),
    baseUrl: getBaseUrl(),
    apiUrl: getApiUrl(),
    timeout: getTestTimeout(),
    retries: getTestRetries(),
    workers: getTestWorkers(),
    headless: shouldRunHeadless(),
    slowMo: getSlowMo(),
    trace: shouldEnableTrace(),
    video: shouldRecordVideo(),
    screenshot: getScreenshotMode(),
  };
}

/**
 * Log test environment information
 */
export function logTestEnvironment(): void {
  const config = getTestEnvironmentConfig();
  
  console.log('\n📋 Test Environment Configuration:');
  console.log(`  Environment: ${config.environment}`);
  console.log(`  Base URL: ${config.baseUrl}`);
  console.log(`  API URL: ${config.apiUrl}`);
  console.log(`  Timeout: ${config.timeout}ms`);
  console.log(`  Retries: ${config.retries}`);
  console.log(`  Workers: ${config.workers}`);
  console.log(`  Headless: ${config.headless}`);
  console.log(`  Trace: ${config.trace}`);
  console.log(`  Video: ${config.video}`);
  console.log(`  Screenshot: ${config.screenshot}`);
  console.log('');
}

/**
 * Check if feature flag is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
  const env = getTestEnvironment();
  const featureEnv = process.env[`FEATURE_${feature.toUpperCase()}`];
  
  if (featureEnv !== undefined) {
    return featureEnv === 'true';
  }
  
  // Default feature flags by environment
  const defaultFlags: Record<TestEnvironment, Record<string, boolean>> = {
    local: {
      debug: true,
      verbose: true,
    },
    ci: {
      debug: false,
      verbose: false,
    },
    staging: {
      debug: false,
      verbose: true,
    },
    production: {
      debug: false,
      verbose: false,
    },
  };
  
  return defaultFlags[env]?.[feature] || false;
}

/**
 * Get environment-specific test data
 */
export function getEnvironmentTestData(): Record<string, any> {
  const env = getTestEnvironment();
  
  return {
    environment: env,
    baseUrl: getBaseUrl(),
    apiUrl: getApiUrl(),
    timestamp: Date.now(),
    testId: `test-${env}-${Date.now()}`,
  };
}

