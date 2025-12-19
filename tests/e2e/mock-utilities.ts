/**
 * Mock Utilities for E2E Tests
 * 
 * Enhanced mocking and stubbing utilities for testing various scenarios:
 * - API response mocking
 * - Network condition simulation
 * - Error scenario simulation
 * - External service mocking
 * 
 * Usage:
 * ```typescript
 * import { mockApiResponse, mockNetworkError, mockSlowNetwork } from './mock-utilities';
 * 
 * await mockApiResponse(page, '/api/endpoint', { status: 200, body: { data: 'test' } });
 * ```
 */

import { Page, Route } from '@playwright/test';

export interface MockResponse {
  status?: number;
  body?: any;
  headers?: Record<string, string>;
  delay?: number;
}

export interface MockOptions {
  once?: boolean; // Mock only once, then continue
  times?: number; // Mock specific number of times
  persist?: boolean; // Keep mock active (default: true)
}

/**
 * Mock an API response
 * @param page - Playwright page
 * @param urlPattern - URL pattern to match (string or RegExp)
 * @param response - Mock response data
 * @param options - Mock options
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: MockResponse,
  options: MockOptions = {}
): Promise<void> {
  let callCount = 0;
  const maxCalls = options.times || (options.once ? 1 : Infinity);
  const persist = options.persist !== false;

  await page.route(urlPattern, async (route: Route) => {
    callCount++;
    
    if (callCount > maxCalls) {
      // Continue with original request after max calls
      await route.continue();
      return;
    }

    const delay = response.delay || 0;
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    await route.fulfill({
      status: response.status || 200,
      body: typeof response.body === 'string' 
        ? response.body 
        : JSON.stringify(response.body || {}),
      headers: {
        'Content-Type': 'application/json',
        ...response.headers,
      },
    });

    if (!persist && callCount >= maxCalls) {
      // Unroute after max calls if not persisting
      await page.unroute(urlPattern);
    }
  });
}

/**
 * Mock a network error
 * @param page - Playwright page
 * @param urlPattern - URL pattern to match
 * @param errorType - Type of error to simulate
 */
export async function mockNetworkError(
  page: Page,
  urlPattern: string | RegExp,
  errorType: 'abort' | 'timeout' | 'failed' = 'abort'
): Promise<void> {
  await page.route(urlPattern, async (route: Route) => {
    switch (errorType) {
      case 'abort':
        await route.abort();
        break;
      case 'timeout':
        // Simulate timeout by delaying indefinitely
        await new Promise(() => {}); // Never resolves
        break;
      case 'failed':
        await route.abort('failed');
        break;
    }
  });
}

/**
 * Mock a slow network response
 * @param page - Playwright page
 * @param urlPattern - URL pattern to match
 * @param delay - Delay in milliseconds (default: 2000)
 */
export async function mockSlowNetwork(
  page: Page,
  urlPattern: string | RegExp,
  delay: number = 2000
): Promise<void> {
  await mockApiResponse(
    page,
    urlPattern,
    { status: 200, body: {}, delay },
    { persist: true }
  );
}

/**
 * Mock multiple API responses
 * @param page - Playwright page
 * @param mocks - Array of mock configurations
 */
export async function mockMultipleApiResponses(
  page: Page,
  mocks: Array<{
    pattern: string | RegExp;
    response: MockResponse;
    options?: MockOptions;
  }>
): Promise<void> {
  for (const mock of mocks) {
    await mockApiResponse(page, mock.pattern, mock.response, mock.options);
  }
}

/**
 * Mock API response with conditional logic
 * @param page - Playwright page
 * @param urlPattern - URL pattern to match
 * @param handler - Function that returns response based on request
 */
export async function mockApiResponseConditional(
  page: Page,
  urlPattern: string | RegExp,
  handler: (request: { url: string; method: string; postData?: any }) => MockResponse | Promise<MockResponse>
): Promise<void> {
  await page.route(urlPattern, async (route: Route) => {
    const request = route.request();
    const response = await handler({
      url: request.url(),
      method: request.method(),
      postData: request.postData() ? JSON.parse(request.postData()!) : undefined,
    });

    await route.fulfill({
      status: response.status || 200,
      body: typeof response.body === 'string'
        ? response.body
        : JSON.stringify(response.body || {}),
      headers: {
        'Content-Type': 'application/json',
        ...response.headers,
      },
    });
  });
}

/**
 * Mock API response sequence (different responses for sequential calls)
 * @param page - Playwright page
 * @param urlPattern - URL pattern to match
 * @param responses - Array of responses to return in sequence
 */
export async function mockApiResponseSequence(
  page: Page,
  urlPattern: string | RegExp,
  responses: MockResponse[]
): Promise<void> {
  let callIndex = 0;

  await page.route(urlPattern, async (route: Route) => {
    const response = responses[callIndex] || responses[responses.length - 1];
    callIndex++;

    await route.fulfill({
      status: response.status || 200,
      body: typeof response.body === 'string'
        ? response.body
        : JSON.stringify(response.body || {}),
      headers: {
        'Content-Type': 'application/json',
        ...response.headers,
      },
    });
  });
}

/**
 * Remove all mocks for a pattern
 * @param page - Playwright page
 * @param urlPattern - URL pattern to unmock
 */
export async function unmockApiResponse(
  page: Page,
  urlPattern: string | RegExp
): Promise<void> {
  await page.unroute(urlPattern);
}

/**
 * Remove all mocks
 * @param page - Playwright page
 */
export async function unmockAllApiResponses(page: Page): Promise<void> {
  // Note: Playwright doesn't have a direct way to unroute all,
  // so this is a placeholder for documentation
  // In practice, you'd need to track routes and unroute them individually
  console.warn('unmockAllApiResponses: Track routes individually and unroute them');
}

/**
 * Mock offline network condition
 * @param page - Playwright page
 */
export async function mockOfflineNetwork(page: Page): Promise<void> {
  await page.context().setOffline(true);
}

/**
 * Restore online network condition
 * @param page - Playwright page
 */
export async function restoreOnlineNetwork(page: Page): Promise<void> {
  await page.context().setOffline(false);
}

/**
 * Mock API response with retry logic
 * @param page - Playwright page
 * @param urlPattern - URL pattern to match
 * @param responses - Array of responses (first fails, subsequent succeed)
 */
export async function mockApiResponseWithRetry(
  page: Page,
  urlPattern: string | RegExp,
  responses: MockResponse[]
): Promise<void> {
  let callIndex = 0;

  await page.route(urlPattern, async (route: Route) => {
    const response = responses[callIndex] || responses[responses.length - 1];
    callIndex++;

    if (response.delay) {
      await new Promise(resolve => setTimeout(resolve, response.delay));
    }

    await route.fulfill({
      status: response.status || 200,
      body: typeof response.body === 'string'
        ? response.body
        : JSON.stringify(response.body || {}),
      headers: {
        'Content-Type': 'application/json',
        ...response.headers,
      },
    });
  });
}

/**
 * Mock API response with rate limiting
 * @param page - Playwright page
 * @param urlPattern - URL pattern to match
 * @param options - Rate limiting options
 */
export async function mockApiResponseWithRateLimit(
  page: Page,
  urlPattern: string | RegExp,
  options: {
    maxRequests: number;
    windowMs: number;
    errorResponse?: MockResponse;
  }
): Promise<void> {
  let requestCount = 0;
  let windowStart = Date.now();

  await page.route(urlPattern, async (route: Route) => {
    const now = Date.now();
    
    // Reset window if expired
    if (now - windowStart > options.windowMs) {
      requestCount = 0;
      windowStart = now;
    }

    requestCount++;

    if (requestCount > options.maxRequests) {
      // Rate limit exceeded
      await route.fulfill({
        status: options.errorResponse?.status || 429,
        body: typeof options.errorResponse?.body === 'string'
          ? options.errorResponse.body
          : JSON.stringify(options.errorResponse?.body || { error: 'Rate limit exceeded' }),
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
          ...options.errorResponse?.headers,
        },
      });
      return;
    }

    // Normal response
    await route.continue();
  });
}

/**
 * Create a mock response builder for fluent API
 */
export class MockResponseBuilder {
  private response: MockResponse = {};
  private options: MockOptions = {};

  status(code: number): this {
    this.response.status = code;
    return this;
  }

  body(data: any): this {
    this.response.body = data;
    return this;
  }

  headers(headers: Record<string, string>): this {
    this.response.headers = { ...this.response.headers, ...headers };
    return this;
  }

  delay(ms: number): this {
    this.response.delay = ms;
    return this;
  }

  once(): this {
    this.options.once = true;
    return this;
  }

  times(count: number): this {
    this.options.times = count;
    return this;
  }

  persist(value: boolean): this {
    this.options.persist = value;
    return this;
  }

  async apply(page: Page, urlPattern: string | RegExp): Promise<void> {
    await mockApiResponse(page, urlPattern, this.response, this.options);
  }
}

/**
 * Create a new mock response builder
 */
export function createMockResponse(): MockResponseBuilder {
  return new MockResponseBuilder();
}

