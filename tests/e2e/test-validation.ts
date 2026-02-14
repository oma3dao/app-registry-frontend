/**
 * Test Validation Utilities
 * 
 * Utilities for validating test setup, page state, and test conditions
 * before and during test execution.
 * 
 * Usage:
 * ```typescript
 * import { validateTestSetup, validatePageState } from './test-validation';
 * 
 * test.beforeEach(async ({ page }) => {
 *   await validateTestSetup(page);
 *   await validatePageState(page);
 * });
 * ```
 */

import { Page } from '@playwright/test';

/**
 * Validation result
 */
export interface ValidationResult {
  /**
   * Whether validation passed
   */
  valid: boolean;
  
  /**
   * Validation errors
   */
  errors: string[];
  
  /**
   * Validation warnings
   */
  warnings: string[];
}

/**
 * Test setup validation options
 */
export interface TestSetupValidationOptions {
  /**
   * Check if dev server is running
   */
  checkServer?: boolean;
  
  /**
   * Check if required environment variables are set
   */
  checkEnv?: boolean;
  
  /**
   * Required environment variables
   */
  requiredEnvVars?: string[];
  
  /**
   * Check if page is accessible
   */
  checkPageAccess?: boolean;
  
  /**
   * Expected page URL
   */
  expectedUrl?: string;
}

/**
 * Page state validation options
 */
export interface PageStateValidationOptions {
  /**
   * Check if page is loaded
   */
  checkLoaded?: boolean;
  
  /**
   * Check for console errors
   */
  checkConsoleErrors?: boolean;
  
  /**
   * Check for network errors
   */
  checkNetworkErrors?: boolean;
  
  /**
   * Check for required elements
   */
  checkRequiredElements?: boolean;
  
  /**
   * Required element selectors
   */
  requiredElements?: string[];
  
  /**
   * Check page title
   */
  checkTitle?: boolean;
  
  /**
   * Expected page title (or pattern)
   */
  expectedTitle?: string | RegExp;
}

/**
 * Validate test setup
 */
export async function validateTestSetup(
  page: Page,
  options: TestSetupValidationOptions = {}
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const {
    checkServer = true,
    checkEnv = true,
    requiredEnvVars = [],
    checkPageAccess = true,
    expectedUrl,
  } = options;

  // Check server
  if (checkServer) {
    try {
      const response = await page.request.get('http://localhost:3000', {
        timeout: 5000,
      });
      if (response.status() >= 400) {
        errors.push(`Server returned status ${response.status()}`);
      }
    } catch (error: any) {
      if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
        errors.push('Dev server is not running. Please start it with `npm run dev`');
      } else {
        warnings.push(`Server check failed: ${error.message}`);
      }
    }
  }

  // Check environment variables
  if (checkEnv && requiredEnvVars.length > 0) {
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        warnings.push(`Environment variable ${envVar} is not set`);
      }
    }
  }

  // Check page access
  if (checkPageAccess) {
    try {
      const url = expectedUrl || 'http://localhost:3000';
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    } catch (error: any) {
      errors.push(`Cannot access page: ${error.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate page state
 */
export async function validatePageState(
  page: Page,
  options: PageStateValidationOptions = {}
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const {
    checkLoaded = true,
    checkConsoleErrors = true,
    checkNetworkErrors = true,
    checkRequiredElements = false,
    requiredElements = [],
    checkTitle = false,
    expectedTitle,
  } = options;

  // Check if page is loaded
  if (checkLoaded) {
    const readyState = await page.evaluate(() => document.readyState).catch(() => null);
    if (readyState !== 'complete' && readyState !== 'interactive') {
      errors.push(`Page is not loaded. Ready state: ${readyState}`);
    }
  }

  // Check console errors
  if (checkConsoleErrors) {
    const consoleErrors: string[] = [];
    const consoleListener = (msg: any) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    };
    page.on('console', consoleListener);

    // Wait a bit to catch errors
    await new Promise(resolve => setTimeout(resolve, 1000));

    page.off('console', consoleListener);

    if (consoleErrors.length > 0) {
      warnings.push(`Found ${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 3).join(', ')}`);
    }
  }

  // Check network errors
  if (checkNetworkErrors) {
    const networkErrors: Array<{ url: string; status: number }> = [];
    const responseListener = (response: any) => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
        });
      }
    };
    page.on('response', responseListener);

    // Wait a bit to catch errors
    await new Promise(resolve => setTimeout(resolve, 1000));

    page.off('response', responseListener);

    if (networkErrors.length > 0) {
      warnings.push(`Found ${networkErrors.length} network error(s)`);
    }
  }

  // Check required elements
  if (checkRequiredElements && requiredElements.length > 0) {
    for (const selector of requiredElements) {
      const element = page.locator(selector);
      const count = await element.count();
      if (count === 0) {
        errors.push(`Required element not found: ${selector}`);
      }
    }
  }

  // Check page title
  if (checkTitle) {
    const title = await page.title().catch(() => '');
    if (expectedTitle) {
      if (typeof expectedTitle === 'string') {
        if (title !== expectedTitle) {
          errors.push(`Page title mismatch. Expected: ${expectedTitle}, Got: ${title}`);
        }
      } else if (expectedTitle instanceof RegExp) {
        if (!expectedTitle.test(title)) {
          errors.push(`Page title does not match pattern. Expected: ${expectedTitle}, Got: ${title}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate test data
 */
export function validateTestData<T>(
  data: T,
  validators: Array<(data: T) => boolean | string>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const validator of validators) {
    const result = validator(data);
    if (typeof result === 'string') {
      errors.push(result);
    } else if (!result) {
      errors.push('Validation failed');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Assert validation result
 */
export function assertValidation(result: ValidationResult, message?: string): void {
  if (!result.valid) {
    const errorMessage = message || 'Validation failed';
    const details = result.errors.join('; ');
    throw new Error(`${errorMessage}: ${details}`);
  }

  if (result.warnings.length > 0) {
    console.warn('Validation warnings:', result.warnings.join('; '));
  }
}

/**
 * Validate and assert test setup
 */
export async function validateAndAssertTestSetup(
  page: Page,
  options: TestSetupValidationOptions = {}
): Promise<void> {
  const result = await validateTestSetup(page, options);
  assertValidation(result, 'Test setup validation failed');
}

/**
 * Validate and assert page state
 */
export async function validateAndAssertPageState(
  page: Page,
  options: PageStateValidationOptions = {}
): Promise<void> {
  const result = await validatePageState(page, options);
  assertValidation(result, 'Page state validation failed');
}

/**
 * Create a validation helper for a specific page
 */
export function createPageValidator(
  options: PageStateValidationOptions
) {
  return async (page: Page): Promise<ValidationResult> => {
    return validatePageState(page, options);
  };
}

/**
 * Common validators
 */
export const validators = {
  /**
   * Validate URL
   */
  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate email
   */
  email: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  /**
   * Validate non-empty string
   */
  nonEmpty: (value: string): boolean => {
    return value.trim().length > 0;
  },

  /**
   * Validate number in range
   */
  numberRange: (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
  },
};

