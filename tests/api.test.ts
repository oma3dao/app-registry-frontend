// Test for the fetch-metadata API route: checks that the handler returns a response with an image property
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { GET as handler } from '../src/app/api/fetch-metadata/route';
import { vi } from 'vitest';

describe('fetch-metadata API', () => {
  // Mock global fetch to return a successful response
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  // This test checks that the handler returns a response object with the expected image property
  it('returns a response object with image', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://test.com', data: 'mocked', image: 'https://test.com/image.png' }),
      text: async () => 'mocked',
      headers: { get: () => 'application/json' },
    });

    const req = { url: 'https://example.com/api/fetch-metadata?url=https://test.com' } as Request;
    const response = await handler(req);
    expect(response).toBeDefined();
    const json = await response.json();
    expect(json).toHaveProperty('image', 'https://test.com/image.png');
  });

  // Test error handling when fetch fails
  it('handles fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const req = { url: 'https://example.com/api/fetch-metadata?url=https://test.com' } as Request;
    const response = await handler(req);
    const json = await response.json();
    expect(json).toHaveProperty('error');
  });

  // Test missing URL parameter
  it('handles missing URL parameter', async () => {
    const req = { url: 'https://example.com/api/fetch-metadata' } as Request;
    const response = await handler(req);
    const json = await response.json();
    expect(json).toHaveProperty('error');
  });

  // Test invalid URL format
  it('handles invalid URL format', async () => {
    const req = { url: 'https://example.com/api/fetch-metadata?url=invalid-url' } as Request;
    const response = await handler(req);
    const json = await response.json();
    expect(json).toHaveProperty('error');
  });

  // Test response without image property
  it('handles response without image property', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://test.com', data: 'mocked' }),
      text: async () => 'mocked',
      headers: { get: () => 'application/json' },
    });

    const req = { url: 'https://example.com/api/fetch-metadata?url=https://test.com' } as Request;
    const response = await handler(req);
    const json = await response.json();
    expect(json).toHaveProperty('error');
  });
}); 