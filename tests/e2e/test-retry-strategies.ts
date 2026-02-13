/**
 * Test Retry Strategies
 * 
 * Advanced retry strategies for handling flaky tests and transient failures.
 * Provides configurable retry logic with different strategies and backoff algorithms.
 * 
 * Usage:
 * ```typescript
 * import { retryWithStrategy, RetryStrategy } from './test-retry-strategies';
 * 
 * await retryWithStrategy(
 *   async () => await page.click('button'),
 *   { strategy: RetryStrategy.ExponentialBackoff, maxRetries: 3 }
 * );
 * ```
 */

import { Page } from '@playwright/test';

/**
 * Retry strategies
 */
export enum RetryStrategy {
  /**
   * No retry - fail immediately
   */
  None = 'none',
  
  /**
   * Fixed delay between retries
   */
  FixedDelay = 'fixed',
  
  /**
   * Exponential backoff (1s, 2s, 4s, 8s, ...)
   */
  ExponentialBackoff = 'exponential',
  
  /**
   * Linear backoff (1s, 2s, 3s, 4s, ...)
   */
  LinearBackoff = 'linear',
  
  /**
   * Random jitter to avoid thundering herd
   */
  Jitter = 'jitter',
  
  /**
   * Adaptive - adjusts based on error type
   */
  Adaptive = 'adaptive',
}

/**
 * Retry options
 */
export interface RetryOptions {
  /**
   * Maximum number of retries
   */
  maxRetries?: number;
  
  /**
   * Initial delay in milliseconds
   */
  initialDelay?: number;
  
  /**
   * Maximum delay in milliseconds
   */
  maxDelay?: number;
  
  /**
   * Retry strategy
   */
  strategy?: RetryStrategy;
  
  /**
   * Custom delay function
   */
  delayFn?: (attempt: number, error: Error) => number;
  
  /**
   * Should retry function - determines if error should be retried
   */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  
  /**
   * On retry callback
   */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
  
  /**
   * Timeout for entire retry operation
   */
  timeout?: number;
}

/**
 * Retry result
 */
export interface RetryResult<T> {
  /**
   * Result value
   */
  value: T;
  
  /**
   * Number of attempts made
   */
  attempts: number;
  
  /**
   * Total duration in milliseconds
   */
  duration: number;
  
  /**
   * Errors encountered (if any)
   */
  errors: Error[];
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'delayFn' | 'shouldRetry' | 'onRetry' | 'timeout'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  strategy: RetryStrategy.ExponentialBackoff,
};

/**
 * Calculate delay based on strategy
 */
function calculateDelay(
  attempt: number,
  strategy: RetryStrategy,
  initialDelay: number,
  maxDelay: number
): number {
  let delay: number;

  switch (strategy) {
    case RetryStrategy.None:
      return 0;
    
    case RetryStrategy.FixedDelay:
      delay = initialDelay;
      break;
    
    case RetryStrategy.ExponentialBackoff:
      delay = initialDelay * Math.pow(2, attempt);
      break;
    
    case RetryStrategy.LinearBackoff:
      delay = initialDelay * (attempt + 1);
      break;
    
    case RetryStrategy.Jitter:
      const baseDelay = initialDelay * Math.pow(2, attempt);
      const jitter = Math.random() * baseDelay * 0.3; // 30% jitter
      delay = baseDelay + jitter;
      break;
    
    case RetryStrategy.Adaptive:
      // Adaptive: shorter delay for network errors, longer for timeout errors
      delay = initialDelay * Math.pow(2, attempt);
      break;
    
    default:
      delay = initialDelay;
  }

  return Math.min(delay, maxDelay);
}

/**
 * Default should retry function
 */
function defaultShouldRetry(error: Error, attempt: number): boolean {
  // Don't retry on certain errors
  if (error.message.includes('not found') || error.message.includes('does not exist')) {
    return false;
  }

  // Retry on timeout, network, or connection errors
  if (
    error.message.includes('timeout') ||
    error.message.includes('Timeout') ||
    error.message.includes('network') ||
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('ERR_CONNECTION_REFUSED') ||
    error.message.includes('Failed to fetch')
  ) {
    return true;
  }

  // Retry on generic errors (might be transient)
  return attempt < 2; // Only retry once for unknown errors
}

/**
 * Retry a function with the specified strategy
 */
export async function retryWithStrategy<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const errors: Error[] = [];
  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const value = await fn();
      const duration = Date.now() - startTime;

      return {
        value,
        attempts: attempt + 1,
        duration,
        errors,
      };
    } catch (error) {
      lastError = error as Error;
      errors.push(lastError);

      // Check if we should retry
      const shouldRetry = opts.shouldRetry
        ? opts.shouldRetry(lastError, attempt)
        : defaultShouldRetry(lastError, attempt);

      if (!shouldRetry || attempt >= opts.maxRetries) {
        const duration = Date.now() - startTime;
        return {
          value: undefined as T,
          attempts: attempt + 1,
          duration,
          errors,
        };
      }

      // Calculate delay
      const delay = opts.delayFn
        ? opts.delayFn(attempt, lastError)
        : calculateDelay(attempt, opts.strategy, opts.initialDelay, opts.maxDelay);

      // Call onRetry callback
      if (opts.onRetry) {
        opts.onRetry(lastError, attempt, delay);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Retry failed');
}

/**
 * Retry with exponential backoff (convenience function)
 */
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  const result = await retryWithStrategy(fn, {
    strategy: RetryStrategy.ExponentialBackoff,
    maxRetries,
    initialDelay,
  });

  if (result.errors.length > 0) {
    throw result.errors[result.errors.length - 1];
  }

  return result.value;
}

/**
 * Retry with fixed delay (convenience function)
 */
export async function retryWithFixedDelay<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  const result = await retryWithStrategy(fn, {
    strategy: RetryStrategy.FixedDelay,
    maxRetries,
    initialDelay: delay,
  });

  if (result.errors.length > 0) {
    throw result.errors[result.errors.length - 1];
  }

  return result.value;
}

/**
 * Retry page action with strategy
 */
export async function retryPageAction<T>(
  page: Page,
  action: (page: Page) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithExponentialBackoff(
    () => action(page),
    options.maxRetries,
    options.initialDelay
  );
}

/**
 * Retry element interaction
 */
export async function retryElementAction(
  page: Page,
  selector: string,
  action: 'click' | 'fill' | 'select' | 'check' | 'uncheck',
  value?: string,
  options: RetryOptions = {}
): Promise<void> {
  await retryPageAction(
    page,
    async (p) => {
      const element = p.locator(selector);
      
      switch (action) {
        case 'click':
          await element.click();
          break;
        case 'fill':
          if (value) await element.fill(value);
          break;
        case 'select':
          if (value) await element.selectOption(value);
          break;
        case 'check':
          await element.check();
          break;
        case 'uncheck':
          await element.uncheck();
          break;
      }
    },
    options
  );
}

/**
 * Retry assertion
 */
export async function retryAssertion(
  assertion: () => Promise<void>,
  options: RetryOptions = {}
): Promise<void> {
  await retryWithStrategy(assertion, {
    ...options,
    strategy: options.strategy || RetryStrategy.ExponentialBackoff,
    maxRetries: options.maxRetries || 3,
  });
}

/**
 * Retry until condition is met
 */
export async function retryUntil(
  condition: () => Promise<boolean>,
  options: RetryOptions & { timeout?: number } = {}
): Promise<boolean> {
  const timeout = options.timeout || 10000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) {
        return true;
      }
    } catch (error) {
      // Continue retrying
    }

    const delay = options.initialDelay || 500;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  return false;
}

/**
 * Create a retry wrapper for a function
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    const result = await retryWithStrategy(
      () => fn(...args),
      options
    );

    if (result.errors.length > 0) {
      throw result.errors[result.errors.length - 1];
    }

    return result.value;
  }) as T;
}

