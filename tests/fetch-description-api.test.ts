import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../src/app/api/fetch-description/route';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the log function
vi.mock('../src/lib/log', () => ({
  log: vi.fn(),
}));

describe('/api/fetch-description API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create a mock request
  function createMockRequest(url: string): Request {
    return new Request(url) as any;
  }

  // Helper to create a mock response
  function createMockResponse(content: string, contentType: string = 'text/plain', status: number = 200) {
    const isJson = contentType.includes('application/json');
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Map([['content-type', contentType]]),
      text: vi.fn().mockResolvedValue(content),
      json: vi.fn().mockResolvedValue(isJson ? JSON.parse(content) : content),
    } as any;
  }

  it('returns description content for valid URL', async () => {
    const mockContent = 'This is a test description';
    const mockResponse = createMockResponse(mockContent);
    (global.fetch as any).mockResolvedValue(mockResponse);

    const request = createMockRequest('http://localhost:3000/api/fetch-description?url=https://example.com/desc');
    const result = await GET(request);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data).toEqual({ content: mockContent });
    expect(global.fetch).toHaveBeenCalledWith('https://example.com/desc', expect.any(Object));
  });

  it('handles JSON content and extracts description field', async () => {
    const jsonContent = JSON.stringify({ description: 'JSON description', other: 'data' });
    const mockResponse = createMockResponse(jsonContent, 'application/json');
    (global.fetch as any).mockResolvedValue(mockResponse);

    const request = createMockRequest('http://localhost:3000/api/fetch-description?url=https://example.com/api/desc');
    const result = await GET(request);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data).toEqual({ content: 'JSON description' });
  });

  it('handles JSON content without description field', async () => {
    const jsonContent = JSON.stringify({ title: 'Test', content: 'Fallback content' });
    const mockResponse = createMockResponse(jsonContent, 'application/json');
    (global.fetch as any).mockResolvedValue(mockResponse);

    const request = createMockRequest('http://localhost:3000/api/fetch-description?url=https://example.com/api/desc');
    const result = await GET(request);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data).toEqual({ content: 'Fallback content' });
  });

  it('handles JSON content with neither description nor content field', async () => {
    const jsonContent = JSON.stringify({ title: 'Test', data: 'some data' });
    const mockResponse = createMockResponse(jsonContent, 'application/json');
    (global.fetch as any).mockResolvedValue(mockResponse);

    const request = createMockRequest('http://localhost:3000/api/fetch-description?url=https://example.com/api/desc');
    const result = await GET(request);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data).toEqual({ content: JSON.stringify({ title: 'Test', data: 'some data' }, null, 2) });
  });

  it.each([
    { label: 'URL parameter missing', url: 'http://localhost:3000/api/fetch-description', error: 'URL parameter is required' },
    { label: 'invalid URL format', url: 'http://localhost:3000/api/fetch-description?url=invalid-url', error: 'Invalid URL format provided' },
  ])('returns 400 when $label', async ({ url, error }) => {
    const request = createMockRequest(url);
    const result = await GET(request);
    const data = await result.json();
    expect(result.status).toBe(400);
    expect(data).toEqual({ error });
  });

  it('returns 500 when fetch fails with network error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const request = createMockRequest('http://localhost:3000/api/fetch-description?url=https://example.com/desc');
    const result = await GET(request);
    const data = await result.json();

    expect(result.status).toBe(500);
    expect(data).toEqual({
      error: 'Failed to fetch description content',
      details: 'Network error'
    });
  });

  it('returns 500 when fetch returns non-ok status', async () => {
    const mockResponse = createMockResponse('Not found', 'text/plain', 404);
    (global.fetch as any).mockResolvedValue(mockResponse);

    const request = createMockRequest('http://localhost:3000/api/fetch-description?url=https://example.com/desc');
    const result = await GET(request);
    const data = await result.json();

    expect(result.status).toBe(500);
    expect(data).toEqual({
      error: 'Failed to fetch description content',
      details: 'HTTP error! status: 404'
    });
  });

  it('handles fetch timeout correctly', async () => {
    (global.fetch as any).mockRejectedValue(new Error('AbortError'));

    const request = createMockRequest('http://localhost:3000/api/fetch-description?url=https://example.com/desc');
    
    const result = await GET(request);
    const data = await result.json();

    expect(result.status).toBe(500);
    expect(data).toEqual({
      error: 'Failed to fetch description content',
      details: 'AbortError'
    });
  });

  it('sets correct headers for fetch request', async () => {
    const mockContent = 'Test content';
    const mockResponse = createMockResponse(mockContent);
    (global.fetch as any).mockResolvedValue(mockResponse);

    const request = createMockRequest('http://localhost:3000/api/fetch-description?url=https://example.com/desc');
    await GET(request);

    expect(global.fetch).toHaveBeenCalledWith('https://example.com/desc', {
      signal: expect.any(AbortSignal),
      headers: {
        'Accept': 'text/plain, text/html, application/json, */*;q=0.8'
      }
    });
  });

  it('handles HTML content type correctly', async () => {
    const htmlContent = '<html><body><p>HTML description</p></body></html>';
    const mockResponse = createMockResponse(htmlContent, 'text/html');
    (global.fetch as any).mockResolvedValue(mockResponse);

    const request = createMockRequest('http://localhost:3000/api/fetch-description?url=https://example.com/desc');
    const result = await GET(request);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data).toEqual({ content: htmlContent });
  });

  it('handles missing content-type header', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Map([]), // No content-type header
      text: vi.fn().mockResolvedValue('Plain text content'),
    } as any;
    (global.fetch as any).mockResolvedValue(mockResponse);

    const request = createMockRequest('http://localhost:3000/api/fetch-description?url=https://example.com/desc');
    const result = await GET(request);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data).toEqual({ content: 'Plain text content' });
  });
}); 