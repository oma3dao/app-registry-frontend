import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/fetch-metadata/route';
import { NextRequest } from 'next/server';

// Mock the log utility
vi.mock('@/lib/log', () => ({
  log: vi.fn(),
}));

describe('GET /api/fetch-metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  it.each([
    { label: 'URL parameter missing', url: 'http://localhost:3000/api/fetch-metadata', error: 'URL parameter is required' },
    { label: 'invalid URL format', url: 'http://localhost:3000/api/fetch-metadata?url=not-a-valid-url', error: 'Invalid URL format provided' },
  ])('returns 400 when $label', async ({ url, error }) => {
    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data).toEqual({ error });
  });

  it('fetches and returns image URL from valid metadata', async () => {
    const mockMetadata = {
      image: 'https://example.com/image.png',
      name: 'Test NFT',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockMetadata,
    });

    const request = new NextRequest('http://localhost:3000/api/fetch-metadata?url=https://example.com/metadata.json');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ image: 'https://example.com/image.png' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/metadata.json',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept': 'application/json, */*;q=0.8',
        }),
      })
    );
  });

  it.each([
    { label: 'image field is missing', metadata: { name: 'Test NFT', description: 'No image here' } },
    { label: 'image is empty string', metadata: { image: '   ', name: 'Test NFT' } },
  ])('returns null image when $label', async ({ metadata }) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => metadata,
    });

    const request = new NextRequest('http://localhost:3000/api/fetch-metadata?url=https://example.com/metadata.json');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ 
      image: null, 
      error: 'Image URL not found in metadata' 
    });
  });

  it('handles fetch timeout', async () => {
    global.fetch = vi.fn().mockImplementation(() => 
      new Promise((_, reject) => {
        const error = new Error('Timeout');
        error.name = 'AbortError';
        setTimeout(() => reject(error), 10);
      })
    );

    const request = new NextRequest('http://localhost:3000/api/fetch-metadata?url=https://slow-server.com/metadata.json');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ 
      image: null, 
      error: 'Request timed out' 
    });
  });

  it('handles HTTP error responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const request = new NextRequest('http://localhost:3000/api/fetch-metadata?url=https://example.com/not-found.json');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('image', null);
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('404');
  });

  it('handles non-JSON content type', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
    });

    const request = new NextRequest('http://localhost:3000/api/fetch-metadata?url=https://example.com/page.html');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('image', null);
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Content-Type');
  });

  it('handles missing content-type header', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({}),
    });

    const request = new NextRequest('http://localhost:3000/api/fetch-metadata?url=https://example.com/metadata.json');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('image', null);
    expect(data).toHaveProperty('error');
  });

  it('handles JSON parsing errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    const request = new NextRequest('http://localhost:3000/api/fetch-metadata?url=https://example.com/bad.json');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('image', null);
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Invalid JSON');
  });

  it('uses fetch timeout of 5 seconds', async () => {
    let capturedSignal: AbortSignal | undefined;
    
    global.fetch = vi.fn().mockImplementation((url, options) => {
      capturedSignal = options?.signal;
      return Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ image: 'test.png' }),
      });
    });

    const request = new NextRequest('http://localhost:3000/api/fetch-metadata?url=https://example.com/metadata.json');
    await GET(request);

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);
  });

  it('handles various valid URL formats', async () => {
    const urls = [
      'https://example.com/metadata.json',
      'https://ipfs.io/ipfs/QmHash/metadata.json',
      'https://arweave.net/tx-hash',
      'https://api.example.com/v1/nft/123/metadata',
    ];

    for (const url of urls) {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ image: 'https://example.com/image.png' }),
      });

      const request = new NextRequest(`http://localhost:3000/api/fetch-metadata?url=${encodeURIComponent(url)}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('image');
    }
  });

  it('properly encodes special characters in URLs', async () => {
    const urlWithSpaces = 'https://example.com/metadata with spaces.json';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ image: 'test.png' }),
    });

    const request = new NextRequest(`http://localhost:3000/api/fetch-metadata?url=${encodeURIComponent(urlWithSpaces)}`);
    const response = await GET(request);

    expect(global.fetch).toHaveBeenCalledWith(
      urlWithSpaces,
      expect.any(Object)
    );
  });
});

