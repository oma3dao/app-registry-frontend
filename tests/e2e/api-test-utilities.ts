/**
 * API Test Utilities
 * 
 * Enhanced utilities for API route testing including:
 * - Performance monitoring
 * - Request/response logging
 * - Response validation helpers
 * - Error analysis
 */

import { Page } from '@playwright/test';

export interface ApiRequestOptions {
  data?: any;
  headers?: Record<string, string>;
  retries?: number;
  timeout?: number;
  logRequest?: boolean;
}

export interface ApiResponseMetrics {
  duration: number;
  attempt: number;
  retries: number;
  status: number;
}

/**
 * Check if dev server is available
 */
export async function checkServerAvailability(page: Page, baseUrl: string = 'http://localhost:3000'): Promise<boolean> {
  try {
    const response = await page.request.get(baseUrl, { timeout: 5000 });
    return response.status() < 500; // Server is available if we get any response < 500
  } catch {
    return false; // Server is not available
  }
}

/**
 * Enhanced API request helper with performance monitoring and server availability checks
 */
export async function makeApiRequest(
  page: Page,
  method: 'GET' | 'POST' | 'OPTIONS',
  url: string,
  options: ApiRequestOptions = {}
): Promise<{ response: any; metrics: ApiResponseMetrics }> {
  const retries = options.retries ?? 1; // Default to 1 retry for better reliability
  const timeout = options.timeout ?? 60000; // Increased default to 60s for slow endpoints
  const logRequest = options.logRequest ?? false;
  
  // Note: Tests should check server availability before calling this function
  // We don't check here to avoid duplicate checks - let requests fail naturally
  // Tests should use test.skip() to skip when server is unavailable
  
  const requestOptions = {
    data: options.data,
    headers: options.headers,
    timeout,
  };

  const startTime = Date.now();
  
  if (logRequest) {
    console.log(`[API Test] ${method} ${url}`);
    console.log(`[API Test] Timeout: ${timeout}ms, Retries: ${retries}`);
    if (options.data) {
      console.log(`[API Test] Request data:`, JSON.stringify(options.data, null, 2));
    }
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let response;
      
      if (method === 'GET') {
        response = await page.request.get(url, requestOptions);
      } else if (method === 'POST') {
        response = await page.request.post(url, requestOptions);
      } else {
        response = await page.request.fetch(url, { method, ...requestOptions });
      }
      
      const duration = Date.now() - startTime;
      const status = response.status();
      
      if (logRequest) {
        console.log(`[API Test] Status: ${status}, Duration: ${duration}ms`);
      }
      
      return {
        response,
        metrics: {
          duration,
          attempt: attempt + 1,
          retries,
          status,
        },
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Check for connection errors
      const isConnectionError = 
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('net::ERR_CONNECTION_REFUSED') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('not available');
      
      if (isConnectionError) {
        throw new Error('Dev server is not available. Please start it with `npm run dev`');
      }
      
      if (error.message?.includes('Timeout') && attempt < retries) {
        const backoff = 1000 * (attempt + 1);
        if (logRequest) {
          console.log(`[API Test] Timeout after ${duration}ms, retrying in ${backoff}ms`);
        }
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      
      // Check for connection reset errors (server restarting, etc.)
      const isConnectionReset = 
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('Target page, context or browser has been closed');
      
      if (isConnectionReset && attempt < retries) {
        const backoff = 2000 * (attempt + 1); // Longer backoff for connection issues
        if (logRequest) {
          console.log(`[API Test] Connection reset, retrying in ${backoff}ms`);
        }
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      
      if (logRequest) {
        console.error(`[API Test] Failed after ${duration}ms:`, error.message);
      }
      
      throw error;
    }
  }
  
  throw new Error('Request failed after retries');
}

/**
 * Verify API response structure
 * Returns validation result instead of using expect directly
 * Tests should use the returned values with their own expect statements
 */
export async function verifyApiResponse(
  response: any,
  expectedStatus?: number | number[],
  expectedFields?: string[]
): Promise<{ status: number; json: any; isValid: boolean; errors: string[] }> {
  const status = response.status();
  const errors: string[] = [];
  let isValid = true;
  
  if (expectedStatus) {
    const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    if (!expected.includes(status)) {
      isValid = false;
      errors.push(`Expected status ${expected.join(' or ')}, got ${status}`);
    }
  }
  
  const json = await response.json().catch(() => ({}));
  
  if (expectedFields && Object.keys(json).length > 0) {
    for (const field of expectedFields) {
      if (!(field in json)) {
        isValid = false;
        errors.push(`Missing expected field: ${field}`);
      }
    }
  }
  
  return { status, json, isValid, errors };
}

/**
 * Analyze API error response
 */
export function analyzeApiError(json: any): {
  hasError: boolean;
  errorMessage?: string;
  errorType?: string;
} {
  if (!json || Object.keys(json).length === 0) {
    return { hasError: false };
  }
  
  const errorMessage = json.error || json.message || '';
  const errorType = json.errorType || (errorMessage ? 'unknown' : undefined);
  
  return {
    hasError: !!errorMessage,
    errorMessage,
    errorType,
  };
}

/**
 * Performance thresholds for API requests
 */
export const API_PERFORMANCE_THRESHOLDS = {
  fast: 1000,      // < 1s - Fast
  normal: 5000,    // < 5s - Normal
  slow: 15000,     // < 15s - Slow
  verySlow: 60000, // < 60s - Very slow (blockchain calls)
};

/**
 * Check if API response meets performance threshold
 */
export function checkPerformance(metrics: ApiResponseMetrics, threshold: number = API_PERFORMANCE_THRESHOLDS.normal): {
  passed: boolean;
  message: string;
} {
  const passed = metrics.duration < threshold;
  const message = `API request took ${metrics.duration}ms (threshold: ${threshold}ms)`;
  
  return { passed, message };
}

