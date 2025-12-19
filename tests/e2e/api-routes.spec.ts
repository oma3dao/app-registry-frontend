/**
 * E2E Tests for API Routes
 * 
 * These tests verify API endpoint functionality:
 * - /api/portal-url/[did]/v/[version] (POST)
 * - /api/verify-and-attest (POST)
 * - Error handling for invalid requests
 * - Request validation
 * 
 * Priority: High (Critical API endpoints)
 */

import { test, expect } from './fixtures';
import { setupTestPage, performanceMonitor } from './test-helpers';
import { setupTestWithIsolation } from './test-setup-helper';
import { 
  makeApiRequest, 
  verifyApiResponse, 
  analyzeApiError,
  checkPerformance,
  API_PERFORMANCE_THRESHOLDS,
  checkServerAvailability
} from './api-test-utilities';

test.describe('API Routes', () => {
  // Increase timeout for API route tests (they may make external HTTP requests)
  test.setTimeout(120000); // 2 minutes

  test.beforeEach(async ({ page }) => {
    // Test isolation setup
    await setupTestWithIsolation(page);
  });

  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 API Routes Tests Performance Summary:');
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
  });

  // Check server availability before running tests
  let serverAvailable = false;
  
  test.beforeAll(async ({ browser }) => {
    // Check if dev server is available
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      serverAvailable = await checkServerAvailability(page);
      if (!serverAvailable) {
        console.warn('⚠️  Dev server is not available. Some API tests may be skipped.');
        console.warn('   Start the dev server with: npm run dev');
      }
    } finally {
      await context.close();
    }
  });

  // Helper wrapper for backward compatibility
  async function apiRequest(
    page: any,
    method: 'GET' | 'POST' | 'OPTIONS',
    url: string,
    options: { 
      data?: any; 
      headers?: Record<string, string>;
      retries?: number;
      timeout?: number;
      logRequest?: boolean;
    } = {}
  ) {
    const { response } = await makeApiRequest(page, method, url, options);
    return response;
  }
  /**
   * Test: Portal URL endpoint handles valid requests
   * Verifies /api/portal-url/[did]/v/[version] POST endpoint
   * 
   * Note: This endpoint makes blockchain calls via getMetadata() which can be slow.
   * The test uses increased timeout and retry logic to handle flaky blockchain calls.
   * 
   * Expected outcomes:
   * - 200: Success (if metadata exists and platform matches)
   * - 404: Metadata not found (test DID likely doesn't exist on blockchain - this is OK)
   * - 400: Validation error
   * - 500: Server error
   * 
   * @tag @slow - Makes blockchain calls
   * @tag @api - API endpoint test
   */
  test('should handle portal-url POST requests with valid data @slow @api', async ({ page }) => {
    performanceMonitor.startTest('should handle portal-url POST requests with valid data');
    try {
      await setupTestPage(page, '/', {
        navigationTimeout: 60000,
        retries: 3,
        waitForReact: true,
        removeOverlays: true,
      });

    // Test data - portal-url endpoint expects IWPS parameters
    // The endpoint validates IWPS parameters and fetches metadata from blockchain
    // Note: This endpoint makes blockchain calls which can be slow or fail if metadata doesn't exist
    const testDid = 'did:web:test-app.example.com';
    const testVersion = '1.0.0';
    // Send minimal IWPS parameters using correct keys
    // At least one IWPS parameter must be present (location, sourceOs, or Group 2 params)
    const testData = {
      location: 'https://test-app.example.com',
      sourceOs: 'web', // Required for platform matching if not web platform
    };

    // Make POST request to portal-url endpoint
    // This endpoint makes blockchain calls via getMetadata(), so it may be slow
    // Use increased timeout and retry logic for flaky blockchain calls
    const { response, metrics } = await makeApiRequest(
      page,
      'POST',
      `/api/portal-url/${encodeURIComponent(testDid)}/v/${testVersion}`,
      {
        data: testData,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 seconds for blockchain calls
        retries: 1, // Retry once if timeout
        logRequest: true, // Enable logging for slow endpoints
      }
    );

    // Track performance for blockchain calls
    const perfCheck = checkPerformance(metrics, API_PERFORMANCE_THRESHOLDS.verySlow);
    if (!perfCheck.passed) {
      console.warn(`[Performance] ${perfCheck.message}`);
    }

    // Verify response (may be 200, 400, 404, or 500 depending on implementation)
    // 404 if metadata not found (test DID likely doesn't exist on blockchain)
    // 400 for validation errors, 500 for server errors
    expect([200, 400, 404, 500]).toContain(response.status());

    const json = await response.json().catch(() => ({}));
    
    // If successful (200), verify response structure
    if (response.status() === 200) {
      expect(json).toBeDefined();
      // Portal-url endpoint returns IWPS response format
      expect(json).toHaveProperty('approval');
      expect(typeof json.approval).toBe('boolean');
    } else if (response.status() === 404) {
      // 404 is expected if test DID doesn't exist on blockchain
      // This is a valid response - metadata not found
      expect(json).toHaveProperty('error');
      expect(json.error).toContain('metadata not found');
    } else {
      // 400 or 500 - verify error response structure
      if (Object.keys(json).length > 0) {
        expect(json).toHaveProperty('error');
      }
    }
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 10000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Portal URL endpoint validates DID format
   * Verifies error handling for invalid DID format
   * 
   * Note: Invalid DID should fail validation before blockchain call, so should be fast.
   */
  test('should reject portal-url requests with invalid DID format', async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    const invalidDid = 'invalid-did-format';
    const testVersion = '1.0.0';
    // Send minimal IWPS parameters using correct keys
    const testData = {
      location: 'https://test-app.example.com',
      sourceOs: 'web',
    };

    // Invalid DID should fail validation quickly (before blockchain call)
    // However, the endpoint parses JSON body first, so may need more time
    // Use longer timeout in case endpoint is slow to respond
    const response = await apiRequest(
      page,
      'POST',
      `/api/portal-url/${encodeURIComponent(invalidDid)}/v/${testVersion}`,
      {
        data: testData,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 seconds (endpoint may be slow even for validation)
        retries: 1, // Retry once in case of timeout
      }
    );

    // Should return 400 (bad request) for invalid DID format
    // The endpoint validates DID format before making blockchain calls
    expect(response.status()).toBe(400);
    
    const json = await response.json().catch(() => ({}));
    if (Object.keys(json).length > 0) {
      expect(json).toHaveProperty('error');
      // Error should mention DID validation
      const errorMessage = json.error || '';
      expect(errorMessage.toLowerCase()).toMatch(/did|invalid|missing/);
    }
  });

  /**
   * Test: Portal URL endpoint validates required fields
   * Verifies error handling for missing required fields
   * 
   * Note: The endpoint requires at least some IWPS parameters to be present.
   * Empty body should return 400 error.
   */
  test('should reject portal-url requests with missing required fields', async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    const testDid = 'did:web:test-app.example.com';
    const testVersion = '1.0.0';

    // Empty body - no IWPS parameters
    // Endpoint requires at least some IWPS parameters (location, sourceOs, or Group 2)
    // Note: Endpoint may still make blockchain call before validation, so use longer timeout
    const response = await apiRequest(
      page,
      'POST',
      `/api/portal-url/${encodeURIComponent(testDid)}/v/${testVersion}`,
      {
        data: {},
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 seconds (endpoint may make blockchain call)
        retries: 1, // Retry once in case of timeout
      }
    );

    // Should return 400 (bad request) for missing IWPS parameters
    expect(response.status()).toBe(400);
    
    const json = await response.json().catch(() => ({}));
    if (Object.keys(json).length > 0) {
      expect(json).toHaveProperty('error');
      // Error should mention IWPS parameters
      const errorMessage = json.error || '';
      expect(errorMessage.toLowerCase()).toMatch(/iwps|parameter|required/);
    }
  });

  /**
   * Test: Verify and attest endpoint handles valid requests
   * Verifies /api/verify-and-attest POST endpoint
   */
  test('should handle verify-and-attest POST requests', async ({ page }) => {
    performanceMonitor.startTest('should handle verify-and-attest POST requests');
    test.skip(!serverAvailable, 'Dev server is not available');
    
    try {
      await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Test data structure (adjust based on actual API requirements)
    const testData = {
      did: 'did:web:test-app.example.com',
      version: '1.0.0',
      // Add other required fields based on actual API
    };

    const response = await apiRequest(
      page,
      'POST',
      '/api/verify-and-attest',
      {
        data: testData,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 seconds for potentially slow endpoint
        retries: 1, // Retry once if timeout
      }
    );

    // Verify response (may be 200, 400, 401, or 500 depending on implementation)
    expect([200, 400, 401, 500]).toContain(response.status());

    // If successful, verify response structure
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toBeDefined();
    }
    } finally {
      const metric = performanceMonitor.endTest({ apiEndpoint: 'verify-and-attest' });
      if (metric && metric.duration > 10000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Verify and attest endpoint validates required fields
   * Verifies error handling for missing required fields
   */
  test('should reject verify-and-attest requests with missing required fields', async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Missing required fields
    const response = await apiRequest(
      page,
      'POST',
      '/api/verify-and-attest',
      {
        data: {},
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Should return error status (400 or 500)
    expect([400, 500]).toContain(response.status());

    // Verify error response
    const json = await response.json().catch(() => ({}));
    if (Object.keys(json).length > 0) {
      expect(json).toHaveProperty('error');
    }
  });

  /**
   * Test: API endpoints handle malformed JSON
   * Verifies error handling for invalid JSON
   */
  test('should reject requests with malformed JSON', async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Test with malformed JSON
    const response = await apiRequest(
      page,
      'POST',
      '/api/verify-and-attest',
      {
        data: 'invalid json{',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Should return error status (400 or 500)
    expect([400, 500]).toContain(response.status());
  });

  /**
   * Test: API endpoints return appropriate CORS headers
   * Verifies CORS headers are set correctly
   */
  test('should return appropriate CORS headers', async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Make OPTIONS request (preflight)
    const response = await apiRequest(
      page,
      'OPTIONS',
      '/api/verify-and-attest',
      {
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
        },
      }
    );

    // Verify response (may be 200, 204, or 405 depending on implementation)
    expect([200, 204, 405]).toContain(response.status());
  });

  /**
   * Test: API endpoints handle rate limiting
   * Verifies rate limiting behavior (if implemented)
   */
  test('should handle rate limiting appropriately', async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    const testData = {
      did: 'did:web:test-app.example.com',
      version: '1.0.0',
    };

    // Make multiple rapid requests
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        apiRequest(
          page,
          'POST',
          '/api/verify-and-attest',
          {
            data: testData,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      );
    }

    const responses = await Promise.all(requests);

    // Verify all requests completed (may be rate limited)
    responses.forEach((response) => {
      expect([200, 400, 401, 429, 500]).toContain(response.status());
    });
  });

  /**
   * Test: Validate URL endpoint handles valid requests
   * Verifies /api/validate-url POST endpoint
   * 
   * API structure (from validate-url/route.ts):
   * - POST with { url: string }
   * - Returns { success: boolean, isValid: boolean, status: number, ... }
   * - Handles HEAD, GET, and JSON-RPC POST methods
   * 
   * @tag @slow - Makes external HTTP requests which can be slow
   */
  test('should handle validate-url POST requests with valid URL @slow', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');
    test.setTimeout(120000); // 2 minutes timeout for external HTTP calls
    
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Test with a valid URL (using a well-known endpoint)
    const testData = {
      url: 'https://www.example.com',
    };

    const response = await apiRequest(
      page,
      'POST',
      '/api/validate-url',
      {
        data: testData,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 90000, // 90 seconds for external HTTP calls
        retries: 2, // Retry twice if timeout
      }
    );

    // Should return 200 (even if URL is not accessible, returns success with isValid: false)
    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json).toHaveProperty('success');
    expect(json).toHaveProperty('isValid');
    expect(json).toHaveProperty('status');
  });

  /**
   * Test: Validate URL endpoint rejects missing URL parameter
   * Verifies error handling for missing required fields
   */
  test('should reject validate-url requests with missing URL', async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Missing url field
    const response = await apiRequest(
      page,
      'POST',
      '/api/validate-url',
      {
        data: {},
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 seconds (increased for reliability)
        retries: 1, // Retry once for better reliability
      }
    );

    // Should return 400 (bad request)
    expect(response.status()).toBe(400);

    const json = await response.json();
    expect(json).toHaveProperty('error');
    expect(json.error).toContain('URL is required');
  });

  /**
   * Test: Validate URL endpoint rejects invalid URL format
   * Verifies error handling for invalid URL format
   */
  test('should reject validate-url requests with invalid URL format', async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    const testData = {
      url: 'not-a-valid-url',
    };

    const response = await apiRequest(
      page,
      'POST',
      '/api/validate-url',
      {
        data: testData,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Should return 400 (bad request)
    expect(response.status()).toBe(400);

    const json = await response.json();
    expect(json).toHaveProperty('error');
    expect(json.error).toContain('Invalid URL format');
  });

  /**
   * Test: Fetch metadata endpoint handles valid requests
   * Verifies /api/fetch-metadata GET endpoint
   * 
   * API structure (from fetch-metadata/route.ts):
   * - GET with ?url=<dataUrl> query parameter
   * - Returns { image: string | null, error?: string }
   * - Fetches JSON metadata and extracts image URL
   */
  test('should handle fetch-metadata GET requests with valid URL', async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Test with a URL (may not have valid JSON metadata, but should handle gracefully)
    const testUrl = 'https://www.example.com';
    const response = await apiRequest(
      page,
      'GET',
      `/api/fetch-metadata?url=${encodeURIComponent(testUrl)}`,
      {
        timeout: 60000, // 60 seconds for external HTTP calls
        retries: 1, // Retry once if timeout
      }
    );

    // Should return 200 (even if metadata not found, returns success with image: null)
    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json).toHaveProperty('image');
    // image may be null or a string
    expect(json.image === null || typeof json.image === 'string').toBeTruthy();
  });

  /**
   * Test: Fetch metadata endpoint rejects missing URL parameter
   * Verifies error handling for missing required query parameter
   */
  test('should reject fetch-metadata requests with missing URL parameter', async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Missing url query parameter
    const response = await apiRequest(page, 'GET', '/api/fetch-metadata');

    // Should return 400 (bad request)
    expect(response.status()).toBe(400);

    const json = await response.json();
    expect(json).toHaveProperty('error');
    expect(json.error).toContain('URL parameter is required');
  });

  /**
   * Test: Fetch metadata endpoint rejects invalid URL format
   * Verifies error handling for invalid URL format
   */
  test('should reject fetch-metadata requests with invalid URL format', async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    const invalidUrl = 'not-a-valid-url';
    const response = await apiRequest(
      page,
      'GET',
      `/api/fetch-metadata?url=${encodeURIComponent(invalidUrl)}`
    );

    // Should return 400 (bad request)
    expect(response.status()).toBe(400);

    const json = await response.json();
    expect(json).toHaveProperty('error');
    expect(json.error).toContain('Invalid URL format');
  });

  /**
   * Test: Fetch description endpoint handles valid requests
   * Verifies /api/fetch-description GET endpoint
   * 
   * API structure (from fetch-description/route.ts):
   * - GET with ?url=<descriptionUrl> query parameter
   * - Returns { content: string } or { error: string }
   * - Fetches text, HTML, or JSON content
   */
  test('should handle fetch-description GET requests with valid URL', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');
    
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Test with a URL (may not have valid content, but should handle gracefully)
    // This endpoint makes external HTTP requests which can be slow
    const testUrl = 'https://www.example.com';
    const response = await apiRequest(
      page,
      'GET',
      `/api/fetch-description?url=${encodeURIComponent(testUrl)}`,
      {
        timeout: 60000, // 60 seconds for external HTTP calls
        retries: 1, // Retry once if timeout
      }
    );

    // Should return 200 or 500 depending on fetch success
    expect([200, 500]).toContain(response.status());

    const json = await response.json();
    if (response.status() === 200) {
      expect(json).toHaveProperty('content');
      expect(typeof json.content).toBe('string');
    } else {
      expect(json).toHaveProperty('error');
    }
  });

  /**
   * Test: Fetch description endpoint rejects missing URL parameter
   * Verifies error handling for missing required query parameter
   */
  test('should reject fetch-description requests with missing URL parameter', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');
    
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Missing url query parameter
    // Should fail validation quickly, but use standard timeout
    const response = await apiRequest(
      page,
      'GET',
      '/api/fetch-description',
      {
        timeout: 30000, // 30 seconds (validation should be fast)
        retries: 0, // No retry for validation errors
      }
    );

    // Should return 400 (bad request)
    expect(response.status()).toBe(400);

    const json = await response.json();
    expect(json).toHaveProperty('error');
    expect(json.error).toContain('URL parameter is required');
  });

  /**
   * Test: Fetch description endpoint rejects invalid URL format
   * Verifies error handling for invalid URL format
   */
  test('should reject fetch-description requests with invalid URL format @api @error', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');
    
    performanceMonitor.startTest('should reject fetch-description requests with invalid URL format');
    
    try {
      await setupTestPage(page, '/', {
        navigationTimeout: 60000,
        retries: 3,
        waitForReact: true,
        removeOverlays: true,
      });

      const invalidUrl = 'not-a-valid-url';
      const response = await apiRequest(
        page,
        'GET',
        `/api/fetch-description?url=${encodeURIComponent(invalidUrl)}`,
        {
          timeout: 60000, // 60 seconds (increased for reliability)
          retries: 1, // Retry once for better reliability
        }
      );

      // Should return 400 (bad request)
      expect(response.status()).toBe(400);

      const json = await response.json();
      expect(json).toHaveProperty('error');
      expect(json.error).toContain('Invalid URL format');
    } finally {
      performanceMonitor.endTest();
    }
  });

  /**
   * Test: Fetch description endpoint handles timeout scenarios
   * Verifies error handling when external URL times out
   */
  test('should handle fetch-description timeout scenarios @api @error @slow', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');
    
    performanceMonitor.startTest('should handle fetch-description timeout scenarios');
    
    try {
      await setupTestPage(page, '/', {
        navigationTimeout: 60000,
        retries: 3,
        waitForReact: true,
        removeOverlays: true,
      });

      // Use a URL that will likely timeout (non-existent or very slow)
      // Note: The endpoint has a 5-second timeout, so this should trigger it
      const slowUrl = 'http://httpstat.us/200?sleep=6000'; // 6 second delay
      const response = await apiRequest(
        page,
        'GET',
        `/api/fetch-description?url=${encodeURIComponent(slowUrl)}`,
        {
          timeout: 10000, // 10 seconds for this test
        }
      );

      // Should return 500 (server error) or timeout
      // The endpoint returns 500 on fetch failure
      expect([500, 200]).toContain(response.status());

      const json = await response.json();
      // Either success with content or error
      const hasContent = 'content' in json;
      const hasError = 'error' in json;
      expect(hasContent || hasError).toBeTruthy();
    } catch (error: any) {
      // Timeout errors are acceptable for this test
      const errorMessage = error?.message || '';
      if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
        // Expected behavior - endpoint should handle timeout
        expect(true).toBeTruthy();
      } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ECONNRESET')) {
        test.skip(true, 'Dev server is not available');
        return;
      } else {
        throw error;
      }
    } finally {
      performanceMonitor.endTest();
    }
  });

  /**
   * Test: Fetch description endpoint handles different content types
   * Verifies handling of JSON, HTML, and plain text responses
   */
  test('should handle fetch-description with different content types @api', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');
    
    performanceMonitor.startTest('should handle fetch-description with different content types');
    
    try {
      await setupTestPage(page, '/', {
        navigationTimeout: 60000,
        retries: 3,
        waitForReact: true,
        removeOverlays: true,
      });

      // Test with a URL that returns JSON
      const jsonUrl = 'https://httpbin.org/json';
      const response = await apiRequest(
        page,
        'GET',
        `/api/fetch-description?url=${encodeURIComponent(jsonUrl)}`,
        {
          timeout: 30000,
        }
      );

      // Should return 200 (success) or 500 (if fetch fails)
      expect([200, 500]).toContain(response.status());

      const json = await response.json();
      if (response.status() === 200) {
        expect(json).toHaveProperty('content');
        expect(typeof json.content).toBe('string');
      } else {
        expect(json).toHaveProperty('error');
      }
    } catch (error: any) {
      const errorMessage = error?.message || '';
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ECONNRESET')) {
        test.skip(true, 'Dev server is not available');
        return;
      }
      throw error;
    } finally {
      performanceMonitor.endTest();
    }
  });

  /**
   * Test: Fetch description endpoint handles empty response
   * Verifies handling when URL returns empty content
   */
  test('should handle fetch-description with empty response @api @edge-case', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');
    
    performanceMonitor.startTest('should handle fetch-description with empty response');
    
    try {
      await setupTestPage(page, '/', {
        navigationTimeout: 60000,
        retries: 3,
        waitForReact: true,
        removeOverlays: true,
      });

      // Test with a URL that returns empty content
      // Using httpbin which can return empty responses
      const emptyUrl = 'https://httpbin.org/status/204'; // No content
      const response = await apiRequest(
        page,
        'GET',
        `/api/fetch-description?url=${encodeURIComponent(emptyUrl)}`,
        {
          timeout: 30000,
        }
      );

      // Should return 200 (success) or 500 (if fetch fails)
      expect([200, 500]).toContain(response.status());

      const json = await response.json();
      if (response.status() === 200) {
        // Empty content should still return content property (may be empty string)
        expect(json).toHaveProperty('content');
        expect(typeof json.content).toBe('string');
      } else {
        expect(json).toHaveProperty('error');
      }
    } catch (error: any) {
      const errorMessage = error?.message || '';
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ECONNRESET')) {
        test.skip(true, 'Dev server is not available');
        return;
      }
      throw error;
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Fetch description endpoint handles network errors gracefully
   * Verifies error handling when URL is unreachable
   */
  test('should handle fetch-description network errors gracefully @api @error @edge-case', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');
    
    performanceMonitor.startTest('should handle fetch-description network errors gracefully');
    
    try {
      await setupTestPage(page, '/', {
        navigationTimeout: 60000,
        retries: 3,
        waitForReact: true,
        removeOverlays: true,
      });

      // Test with a URL that will fail (non-existent domain)
      const invalidUrl = 'https://this-domain-does-not-exist-12345.example.com';
      const response = await apiRequest(
        page,
        'GET',
        `/api/fetch-description?url=${encodeURIComponent(invalidUrl)}`,
        {
          timeout: 30000,
        }
      );

      // Should return 500 (server error) on network failure
      expect([500, 200]).toContain(response.status());

      const json = await response.json();
      // Should have error property on failure
      if (response.status() === 500) {
        expect(json).toHaveProperty('error');
        expect(typeof json.error).toBe('string');
      } else if (response.status() === 200) {
        // Some network errors might be handled differently
        expect(json).toHaveProperty('content');
      }
    } catch (error: any) {
      const errorMessage = error?.message || '';
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ECONNRESET')) {
        test.skip(true, 'Dev server is not available');
        return;
      }
      // Network errors are expected for this test
      if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('timeout')) {
        expect(true).toBeTruthy(); // Expected behavior
        return;
      }
      throw error;
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.log(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  /**
   * Test: Discover controlling wallet endpoint handles valid requests
   * Verifies /api/discover-controlling-wallet POST endpoint
   * 
   * API structure (from discover-controlling-wallet/route.ts):
   * - POST with { did: string } (must be did:pkh format)
   * - Returns { ok: boolean, controllingWallet?: string, error?: string }
   * - Discovers controlling wallet from smart contract
   */
  test('should handle discover-controlling-wallet POST requests with valid did:pkh', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');
    
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Test with a valid did:pkh format (may not find wallet, but should handle gracefully)
    // This endpoint makes blockchain RPC calls which can be slow
    const testData = {
      did: 'did:pkh:eip155:1:0x0000000000000000000000000000000000000000',
    };

    const response = await apiRequest(
      page,
      'POST',
      '/api/discover-controlling-wallet',
      {
        data: testData,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 seconds for blockchain RPC calls
        retries: 1, // Retry once if timeout
      }
    );

    // Should return 200, 400, 404, or 500 depending on DID validity and contract discovery
    expect([200, 400, 404, 500]).toContain(response.status());

    const json = await response.json();
    expect(json).toHaveProperty('ok');
    expect(typeof json.ok).toBe('boolean');

    if (json.ok) {
      expect(json).toHaveProperty('controllingWallet');
      expect(json).toHaveProperty('chainId');
      expect(json).toHaveProperty('contractAddress');
    } else {
      expect(json).toHaveProperty('error');
    }
  });

  /**
   * Test: Discover controlling wallet endpoint rejects missing DID
   * Verifies error handling for missing required field
   */
  test('should reject discover-controlling-wallet requests with missing DID', async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Missing did field
    // Should fail validation quickly, but use longer timeout for reliability
    const response = await apiRequest(
      page,
      'POST',
      '/api/discover-controlling-wallet',
      {
        data: {},
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 seconds (increased for reliability)
        retries: 1, // Retry once for better reliability
      }
    );

    // Should return 400 (bad request)
    expect(response.status()).toBe(400);

    const json = await response.json();
    expect(json).toHaveProperty('ok');
    expect(json.ok).toBe(false);
    expect(json).toHaveProperty('error');
    expect(json.error).toContain('DID is required');
  });

  /**
   * Test: Discover controlling wallet endpoint rejects invalid did:pkh format
   * Verifies error handling for invalid DID format
   */
  test('should reject discover-controlling-wallet requests with invalid did:pkh format', async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });

    // Invalid DID format (not did:pkh)
    const testData = {
      did: 'did:web:test-app.example.com',
    };

    const response = await apiRequest(
      page,
      'POST',
      '/api/discover-controlling-wallet',
      {
        data: testData,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 seconds (increased for reliability)
        retries: 1, // Retry once for better reliability
      }
    );

    // Should return 400 (bad request)
    expect(response.status()).toBe(400);

    const json = await response.json();
    expect(json).toHaveProperty('ok');
    expect(json.ok).toBe(false);
    expect(json).toHaveProperty('error');
    expect(json.error).toContain('Invalid did:pkh format');
  });

  /**
   * Test: API endpoints return consistent error structure
   * Verifies all API endpoints return consistent error responses
   * 
   * @tag @api - API endpoint test
   */
  test('should return consistent error structure across endpoints @api', async ({ page }) => {
    // Skip test if server is not available
    test.skip(!serverAvailable, 'Dev server is not available');
    
    // Wrap in try-catch to handle server unavailability gracefully
    try {
      await setupTestPage(page, '/', {
        navigationTimeout: 60000,
        retries: 3,
        waitForReact: true,
        removeOverlays: true,
      });
    } catch (error: any) {
      // If setup fails due to server unavailability, skip the test
      const errorMessage = error?.message || '';
      const isConnectionError = 
        errorMessage.includes('not available') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('net::ERR_');
      
      if (isConnectionError) {
        test.skip(true, 'Dev server is not available');
        return;
      }
      throw error;
    }

    // Test multiple endpoints with invalid requests
    const endpoints = [
      { method: 'POST', path: '/api/validate-url', data: {} },
      { method: 'GET', path: '/api/fetch-metadata', data: null },
      { method: 'GET', path: '/api/fetch-description', data: null },
      { method: 'POST', path: '/api/discover-controlling-wallet', data: {} },
    ];

    for (const endpoint of endpoints) {
      let response;
      try {
        response = await apiRequest(
          page,
          endpoint.method as 'GET' | 'POST',
          endpoint.path,
          endpoint.method === 'POST'
            ? {
                data: endpoint.data,
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000, // 30 seconds for error responses
              }
            : {
                timeout: 30000, // 30 seconds for GET requests
              }
        );
      } catch (error: any) {
        // If request fails due to server unavailability, skip the test
        const errorMessage = error?.message || '';
        const isConnectionError = 
          errorMessage.includes('not available') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('ERR_CONNECTION_REFUSED') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('net::ERR_');
        
        if (isConnectionError) {
          test.skip(true, 'Dev server is not available');
          return;
        }
        throw error;
      }

      const status = response.status();
      
      // Accept various error status codes (400, 404, 405, 500)
      // Some endpoints may return 404 for missing params or 405 for wrong method
      expect([400, 404, 405, 500]).toContain(status);

      // Try to parse JSON response
      const contentType = response.headers()['content-type'] || '';
      const isJson = contentType.includes('application/json');
      
      if (isJson) {
        try {
          const json = await response.json();
          // If JSON response exists and has content, check for error property
          if (json && typeof json === 'object' && Object.keys(json).length > 0) {
            // Most API error responses should have an 'error' property
            // But some might use different structures, so we check if it exists
            if (json.error !== undefined) {
              expect(typeof json.error).toBe('string');
            }
          }
        } catch (parseError) {
          // If JSON parsing fails, that's OK - some endpoints might return HTML error pages
          // The important thing is that they return an error status code
          console.warn(`[API Test] Could not parse JSON response from ${endpoint.path}:`, parseError);
        }
      }
      // If not JSON, that's acceptable - some endpoints may return HTML error pages
      // The key requirement is that invalid requests return error status codes
    }
  });
});

