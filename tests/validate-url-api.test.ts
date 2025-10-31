import { describe, it, expect, vi } from 'vitest';
import { POST } from '../src/app/api/validate-url/route';

// Mock fetch globally
global.fetch = vi.fn();

describe('validate-url API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
}); 