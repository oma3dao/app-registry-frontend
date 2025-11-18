import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, OPTIONS } from '../src/app/api/validate-url/route';

// Mock fetch globally
global.fetch = vi.fn();

describe('validate-url API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Covers OPTIONS function (line 11-13)
   * Tests CORS preflight handling
   */
  it('handles OPTIONS request for CORS preflight', async () => {
    const response = await OPTIONS();
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    expect(data).toEqual({});
  });

  it('returns success for a valid URL', async () => {
    // Mock successful fetch response
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: vi.fn().mockReturnValue('text/html'),
      },
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const request = new Request('http://localhost/api/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.isValid).toBe(true);
    expect(data.hostname).toBe('example.com');
  });

  it('returns error for an invalid URL format', async () => {
    const request = new Request('http://localhost/api/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'invalid-url' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid URL format');
  });

  it('returns error for missing URL parameter', async () => {
    const request = new Request('http://localhost/api/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('URL is required');
  });

  it('handles network errors gracefully', async () => {
    // Mock fetch to throw an error
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const request = new Request('http://localhost/api/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200); // API returns 200 even for errors
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to access URL');
    expect(data.hostname).toBe('example.com');
  });

  it('handles timeout errors', async () => {
    // Mock fetch to throw an AbortError (timeout)
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    (global.fetch as any).mockRejectedValue(abortError);

    const request = new Request('http://localhost/api/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Request timed out');
    expect(data.hostname).toBe('example.com');
  });

  it('handles unexpected error objects gracefully', async () => {
    (global.fetch as any).mockRejectedValue({ message: 'Something weird happened' });

    const request = new Request('http://localhost/api/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to access URL');
    expect(data.hostname).toBe('example.com');
  });

  it('tries POST JSON-RPC request when HEAD and GET fail', async () => {
    // Mock HEAD fails with 405
    const headResponse = {
      ok: false,
      status: 405,
      statusText: 'Method Not Allowed',
      headers: { get: vi.fn() },
    };
    // Mock GET also fails with 404
    const getResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: vi.fn() },
    };
    // Mock POST succeeds
    const postResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: vi.fn() },
    };

    (global.fetch as any)
      .mockResolvedValueOnce(headResponse) // HEAD fails
      .mockResolvedValueOnce(getResponse)  // GET fails
      .mockResolvedValueOnce(postResponse); // POST succeeds

    const request = new Request('http://localhost/api/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://rpc.example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.isValid).toBe(true);
    // Verify POST was called with JSON-RPC body
    expect(global.fetch).toHaveBeenCalledTimes(3);
    const postCall = (global.fetch as any).mock.calls[2];
    expect(postCall[0]).toBe('https://rpc.example.com');
    expect(postCall[1].method).toBe('POST');
    expect(postCall[1].headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(postCall[1].body)).toEqual({
      jsonrpc: '2.0',
      method: 'eth_chainId',
      params: [],
      id: 1
    });
  });

  it('considers 4xx/5xx status codes as valid (endpoint exists)', async () => {
    // Mock a 500 error response
    const errorResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: { get: vi.fn().mockReturnValue('application/json') },
    };
    (global.fetch as any).mockResolvedValue(errorResponse);

    const request = new Request('http://localhost/api/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/api' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.isValid).toBe(true); // 500 means endpoint exists
    expect(data.status).toBe(500);
    expect(data.note).toBe('Endpoint exists but may require specific request format');
  });

  it('considers 400 status code as valid', async () => {
    const badRequestResponse = {
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: { get: vi.fn() },
    };
    (global.fetch as any).mockResolvedValue(badRequestResponse);

    const request = new Request('http://localhost/api/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/api' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.isValid).toBe(true); // 400 means endpoint exists
    expect(data.status).toBe(400);
  });

  it('handles outer catch block for server errors', async () => {
    // Mock request.json() to throw an error
    const request = new Request('http://localhost/api/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json{{', // Invalid JSON
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Server error processing request');
    expect(data.isValid).toBe(false);
  });
}); 