/**
 * Final coverage gaps tests to reach 100% test coverage
 * 
 * This file targets the remaining uncovered code paths identified in the coverage report
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

describe('Final Coverage Gaps - 100% Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validate-url route - OPTIONS handler', () => {
    /**
     * Test: Covers OPTIONS function (line 11-13)
     * Tests CORS preflight handling
     */
    it('handles OPTIONS request for CORS preflight', async () => {
      const { OPTIONS } = await import('@/app/api/validate-url/route');
      
      const response = await OPTIONS();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(data).toEqual({});
    });
  });

  describe('validate-url route - Error handling paths', () => {
    /**
     * Test: Covers outer catch block (lines 132-142)
     * Tests server error handling when request.json() fails
     */
    it('handles server error when request parsing fails', async () => {
      const { POST } = await import('@/app/api/validate-url/route');
      
      // Create a request that will fail when calling json()
      const req = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as any;
      
      const response = await POST(req);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Server error processing request');
      expect(data.isValid).toBe(false);
    });

    /**
     * Test: Covers timeout error path (lines 115-130)
     * Tests AbortError handling when request times out
     */
    it('handles timeout error correctly', async () => {
      const { POST } = await import('@/app/api/validate-url/route');
      
      // Mock fetch to simulate timeout (AbortError)
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(
        new DOMException('The operation was aborted', 'AbortError')
      );
      
      const req = new NextRequest('http://localhost/api/validate-url', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
      });
      
      try {
        const response = await POST(req);
        const data = await response.json();
        
        expect(response.status).toBe(200); // Returns 200 with error info
        expect(data.success).toBe(false);
        expect(data.error).toBe('Request timed out');
        expect(data.isValid).toBe(false);
      } finally {
        global.fetch = originalFetch;
      }
    });

    /**
     * Test: Covers non-timeout error path (lines 112-130)
     * Tests non-AbortError exception handling
     */
    it('handles non-timeout fetch errors correctly', async () => {
      const { POST } = await import('@/app/api/validate-url/route');
      
      // Mock fetch to throw a non-AbortError
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const req = new NextRequest('http://localhost/api/validate-url', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
      });
      
      try {
        const response = await POST(req);
        const data = await response.json();
        
        expect(response.status).toBe(200); // Returns 200 with error info
        expect(data.success).toBe(false);
        expect(data.error).toBe('Failed to access URL');
        expect(data.details).toBe('Network error');
        expect(data.isValid).toBe(false);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});

