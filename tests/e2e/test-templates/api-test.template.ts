/**
 * API Test Template
 * 
 * Use this template for API endpoint tests
 * 
 * To use:
 * 1. Copy this file to your test file
 * 2. Replace placeholders (API endpoint, test descriptions, etc.)
 * 3. Implement test logic
 * 4. Add appropriate tags
 */

import { test, expect } from '../fixtures';
import { setupTestPage, performanceMonitor } from '../test-helpers';
import { setupTestWithIsolation } from '../test-setup-helper';
import { 
  makeApiRequest, 
  verifyApiResponse, 
  analyzeApiError,
  checkPerformance,
  API_PERFORMANCE_THRESHOLDS,
  checkServerAvailability
} from '../api-test-utilities';

test.describe('API Endpoint Name', () => {
  // Increase timeout for API tests (they may make external HTTP requests)
  test.setTimeout(120000); // 2 minutes

  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 API Endpoint Name Tests Performance Summary:');
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
    serverAvailable = await checkServerAvailability(page);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    // Test isolation setup
    await setupTestWithIsolation(page);
  });

  test('should handle valid API request @api @slow', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');
    
    performanceMonitor.startTest('should handle valid API request');
    
    try {
      await setupTestPage(page, '/');
      
      // Make API request
      const { response, metrics } = await makeApiRequest(
        page,
        'POST', // or 'GET'
        '/api/endpoint',
        {
          data: {
            // Request data
          },
          timeout: 30000,
          retries: 1,
        }
      );
      
      // Verify response
      const { status, json, isValid, errors } = await verifyApiResponse(response, [200], ['data']);
      if (!isValid) {
        throw new Error(`Response validation failed: ${errors.join(', ')}`);
      }
      expect(status).toBe(200);
      expect(json).toHaveProperty('data');
      
      // Check performance
      const perfCheck = checkPerformance(metrics, API_PERFORMANCE_THRESHOLDS.normal);
      if (!perfCheck.passed) {
        console.warn(`[Performance] ${perfCheck.message}`);
      }
    } catch (error: any) {
      // Handle connection errors gracefully
      const errorMessage = error?.message || '';
      const isConnectionError = 
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('not available');
      
      if (isConnectionError) {
        test.skip(true, 'Dev server is not available');
        return;
      }
      throw error;
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > API_PERFORMANCE_THRESHOLDS.verySlow) {
        console.warn(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });

  test('should handle invalid API request @api @error', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');
    
    performanceMonitor.startTest('should handle invalid API request');
    
    try {
      await setupTestPage(page, '/');
      
      // Make invalid API request
      const { response } = await makeApiRequest(
        page,
        'POST',
        '/api/endpoint',
        {
          data: {
            // Invalid data
          },
          timeout: 30000,
        }
      );
      
      // Verify error response - accept 400, 404, 422, or 500 as valid error responses
      const { status, json, isValid, errors } = await verifyApiResponse(response, [400, 404, 422, 500]);
      if (!isValid) {
        // If validation failed, check if it's a connection error
        if (status === 404) {
          // 404 is acceptable for invalid endpoints
          expect(status).toBe(404);
        } else {
          throw new Error(`Response validation failed: ${errors.join(', ')}`);
        }
      } else {
        expect(status).toBeGreaterThanOrEqual(400);
        // Only check for error property if response has content
        if (Object.keys(json).length > 0) {
          expect(json).toHaveProperty('error');
        }
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
});

