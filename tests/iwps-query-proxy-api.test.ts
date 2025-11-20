import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../src/app/api/iwps-query-proxy/route';
import * as AppConfig from '../src/config/app-config';
import { NextRequest } from 'next/server';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the validation function
vi.mock('../src/lib/validation', () => ({
  validateUrl: vi.fn((url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }),
  MAX_URL_LENGTH: 2048,
  MAX_DID_LENGTH: 256,
  MAX_NAME_LENGTH: 100,
  MAX_VERSION_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TOKEN_LENGTH: 100,
  MAX_EXTERNAL_URL_LENGTH: 2048,
  MAX_IMAGE_URL_LENGTH: 2048,
  MAX_SCREENSHOT_URL_LENGTH: 2048,
  MAX_LAUNCH_URL_LENGTH: 2048,
  MAX_DOWNLOAD_URL_LENGTH: 2048,
  MAX_SUPPORTED_LENGTH: 100,
}));

describe('/api/iwps-query-proxy API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create a mock request
  function createMockRequest(body: any): NextRequest {
    return {
      json: vi.fn().mockResolvedValue(body),
    } as any;
  }

  // Helper to create a mock response
  function createMockResponse(data: any, status: number = 200) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: vi.fn().mockResolvedValue(data),
      text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    } as any;
  }

  it('successfully proxies request to target server', async () => {
    const targetResponse = {
      [AppConfig.IWPS_APPROVAL_KEY]: true,
      [AppConfig.IWPS_DESTINATION_URL_KEY]: 'https://example.com/launch',
      [AppConfig.IWPS_DOWNLOAD_URL_KEY]: 'https://example.com/download',
    };
    const mockResponse = createMockResponse(targetResponse);
    (global.fetch as any).mockResolvedValue(mockResponse);

    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: {
        [AppConfig.IWPS_LOCATION_KEY]: 'test-location',
        [AppConfig.IWPS_SOURCE_OS_KEY]: 'web',
      },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data).toEqual({
      [AppConfig.IWPS_APPROVAL_KEY]: true,
      [AppConfig.IWPS_DESTINATION_URL_KEY]: 'https://example.com/launch',
      [AppConfig.IWPS_DOWNLOAD_URL_KEY]: 'https://example.com/download',
    });

    expect(global.fetch).toHaveBeenCalledWith('https://target-server.com/iwps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody.iwpsParams),
    });
  });

  it('returns 400 when targetIwpsPortalUrl is missing', async () => {
    const requestBody = {
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Missing required field: targetIwpsPortalUrl',
    });
  });

  it('returns 400 when targetIwpsPortalUrl is invalid', async () => {
    const requestBody = {
      targetIwpsPortalUrl: 'invalid-url',
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid targetIwpsPortalUrl format.',
    });
  });

  it('returns 400 when iwpsParams is missing', async () => {
    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Missing or invalid iwpsParams object in request body',
    });
  });

  it('returns 400 when iwpsParams is not an object', async () => {
    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: 'not-an-object',
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Missing or invalid iwpsParams object in request body',
    });
  });

  it('returns 502 when fetch fails with network error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(502);
    expect(data).toEqual({
      success: false,
      error: 'Failed to connect to target server: Network error',
    });
  });

  it('returns 502 when target server returns error status', async () => {
    const mockResponse = createMockResponse({ error: 'Server error' }, 500);
    (global.fetch as any).mockResolvedValue(mockResponse);

    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(502);
    expect(data).toEqual({
      success: false,
      error: 'Target server returned error: 500',
    });
  });

  it('returns 502 when target server returns invalid JSON', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      text: vi.fn().mockResolvedValue('Invalid JSON response'),
    } as any;
    (global.fetch as any).mockResolvedValue(mockResponse);

    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(502);
    expect(data).toEqual({
      success: false,
      error: 'Invalid JSON response from target server',
    });
  });

  it('handles target response with approval false and error message', async () => {
    const targetResponse = {
      [AppConfig.IWPS_APPROVAL_KEY]: false,
      [AppConfig.IWPS_ERROR_KEY]: 'Launch not approved',
    };
    const mockResponse = createMockResponse(targetResponse);
    (global.fetch as any).mockResolvedValue(mockResponse);

    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data).toEqual({
      [AppConfig.IWPS_APPROVAL_KEY]: false,
      [AppConfig.IWPS_ERROR_KEY]: 'Launch not approved',
    });
  });

  it('handles target response with approval false and no error message', async () => {
    const targetResponse = {
      [AppConfig.IWPS_APPROVAL_KEY]: false,
    };
    const mockResponse = createMockResponse(targetResponse);
    (global.fetch as any).mockResolvedValue(mockResponse);

    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data).toEqual({
      [AppConfig.IWPS_APPROVAL_KEY]: false,
      [AppConfig.IWPS_ERROR_KEY]: 'Launch not approved by target server',
    });
  });

  it('handles target response with all IWPS fields', async () => {
    const targetResponse = {
      [AppConfig.IWPS_APPROVAL_KEY]: true,
      [AppConfig.IWPS_LOCATION_KEY]: 'updated-location',
      [AppConfig.IWPS_DESTINATION_URL_KEY]: 'https://example.com/launch',
      [AppConfig.IWPS_DOWNLOAD_URL_KEY]: 'https://example.com/download',
      [AppConfig.IWPS_UPDATED_PORTAL_URL_KEY]: 'https://example.com/portal',
      [AppConfig.IWPS_EXPIRATION_KEY]: 3600,
      [AppConfig.IWPS_ERROR_KEY]: undefined,
    };
    const mockResponse = createMockResponse(targetResponse);
    (global.fetch as any).mockResolvedValue(mockResponse);

    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data).toEqual({
      [AppConfig.IWPS_APPROVAL_KEY]: true,
      [AppConfig.IWPS_LOCATION_KEY]: 'updated-location',
      [AppConfig.IWPS_DESTINATION_URL_KEY]: 'https://example.com/launch',
      [AppConfig.IWPS_DOWNLOAD_URL_KEY]: 'https://example.com/download',
      [AppConfig.IWPS_UPDATED_PORTAL_URL_KEY]: 'https://example.com/portal',
      [AppConfig.IWPS_EXPIRATION_KEY]: 3600,
    });
  });

  it('handles target response with null/undefined values', async () => {
    const targetResponse = {
      [AppConfig.IWPS_APPROVAL_KEY]: true,
      [AppConfig.IWPS_LOCATION_KEY]: null,
      [AppConfig.IWPS_DESTINATION_URL_KEY]: undefined,
      [AppConfig.IWPS_DOWNLOAD_URL_KEY]: 'https://example.com/download',
    };
    const mockResponse = createMockResponse(targetResponse);
    (global.fetch as any).mockResolvedValue(mockResponse);

    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data).toEqual({
      [AppConfig.IWPS_APPROVAL_KEY]: true,
      [AppConfig.IWPS_DOWNLOAD_URL_KEY]: 'https://example.com/download',
    });
  });

  it('returns 400 for invalid JSON body', async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
    } as any;

    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid JSON body received by proxy',
    });
  });

  it('returns 500 for unexpected errors', async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new Error('Unexpected error')),
    } as any;

    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Internal Server Error in proxy',
    });
  });

  /**
   * Test: verifies that text() is called when target server returns error status (covers line 56)
   */
  it('calls text() method when target server returns error status', async () => {
    const mockText = vi.fn().mockResolvedValue('Error response body');
    const mockResponse = {
      ok: false,
      status: 404,
      text: mockText,
      json: vi.fn(),
    } as any;
    (global.fetch as any).mockResolvedValue(mockResponse);

    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(502);
    expect(data.error).toBe('Target server returned error: 404');
    // Verify text() was called to get error body
    expect(mockText).toHaveBeenCalled();
  });

  /**
   * Test: handles fetch error with empty message (covers line 51)
   */
  it('handles fetch error with empty message', async () => {
    const fetchError = { message: '' };
    (global.fetch as any).mockRejectedValue(fetchError);

    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(502);
    expect(data.error).toBe('Failed to connect to target server: Unknown fetch error');
  });

  /**
   * Test: handles fetch error without message property (covers line 51)
   */
  it('handles fetch error without message property', async () => {
    const fetchError = {};
    (global.fetch as any).mockRejectedValue(fetchError);

    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(502);
    expect(data.error).toBe('Failed to connect to target server: Unknown fetch error');
  });

  /**
   * Test: handles different error status codes (covers line 55-58)
   */
  it('handles 400 error status from target server', async () => {
    const mockText = vi.fn().mockResolvedValue('Bad Request');
    const mockResponse = {
      ok: false,
      status: 400,
      text: mockText,
    } as any;
    (global.fetch as any).mockResolvedValue(mockResponse);

    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(502);
    expect(data.error).toBe('Target server returned error: 400');
  });

  /**
   * Test: handles response with only approval field (covers lines 73-90)
   */
  it('handles response with only approval field', async () => {
    const targetResponse = {
      [AppConfig.IWPS_APPROVAL_KEY]: true,
    };
    const mockResponse = createMockResponse(targetResponse);
    (global.fetch as any).mockResolvedValue(mockResponse);

    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data).toEqual({
      [AppConfig.IWPS_APPROVAL_KEY]: true,
    });
    // Should not include undefined fields
    expect(data[AppConfig.IWPS_LOCATION_KEY]).toBeUndefined();
    expect(data[AppConfig.IWPS_ERROR_KEY]).toBeUndefined();
  });

  /**
   * Test: handles response with approval false and custom error message (covers line 79)
   */
  it('handles response with approval false and custom error message', async () => {
    const targetResponse = {
      [AppConfig.IWPS_APPROVAL_KEY]: false,
      [AppConfig.IWPS_ERROR_KEY]: 'Custom error message',
    };
    const mockResponse = createMockResponse(targetResponse);
    (global.fetch as any).mockResolvedValue(mockResponse);

    const requestBody = {
      targetIwpsPortalUrl: 'https://target-server.com/iwps',
      iwpsParams: { [AppConfig.IWPS_LOCATION_KEY]: 'test-location' },
    };

    const request = createMockRequest(requestBody);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data[AppConfig.IWPS_APPROVAL_KEY]).toBe(false);
    expect(data[AppConfig.IWPS_ERROR_KEY]).toBe('Custom error message');
  });
}); 