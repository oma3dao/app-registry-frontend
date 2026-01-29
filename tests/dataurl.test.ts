import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canonicalizeForHash } from '@/lib/utils/dataurl';

// Note: computeDataHashFromDataUrl and verifyDataUrlHash require fetch and are tested in integration tests
// We'll test the canonicalizeForHash function which is pure

describe('dataurl utilities', () => {
  describe('canonicalizeForHash', () => {
    it('canonicalizes simple object', () => {
      const obj = { name: 'Test', version: '1.0.0' };
      const result = canonicalizeForHash(obj);
      
      expect(result.jcsJson).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('sorts object keys consistently', () => {
      const obj1 = { b: 2, a: 1, c: 3 };
      const obj2 = { c: 3, a: 1, b: 2 };
      
      const result1 = canonicalizeForHash(obj1);
      const result2 = canonicalizeForHash(obj2);
      
      // Same object, different key order should produce same JCS and hash
      expect(result1.jcsJson).toBe(result2.jcsJson);
      expect(result1.hash).toBe(result2.hash);
    });

    it.each([
      { label: 'nested objects', obj: { name: 'Test', nested: { b: 2, a: 1 } } },
      { label: 'arrays', obj: { name: 'Test', items: ['item1', 'item2', 'item3'] } },
      {
        label: 'complex nested structure',
        obj: {
          name: 'Complex App',
          metadata: { version: '2.0.0', features: ['feature1', 'feature2'] },
          platforms: { web: { url: 'https://web.example.com', supported: true }, mobile: { url: 'https://mobile.example.com', supported: false } },
          tags: ['tag1', 'tag2'],
        },
      },
      {
        label: 'metadata-like objects',
        obj: {
          name: 'My App',
          description: 'An awesome app',
          image: 'https://example.com/image.png',
          external_url: 'https://example.com',
          screenshotUrls: ['https://example.com/shot1.png', 'https://example.com/shot2.png'],
          platforms: { windows: 'https://download.example.com/windows', mac: 'https://download.example.com/mac' },
        },
      },
    ])('handles $label', ({ obj }) => {
      const result = canonicalizeForHash(obj);
      expect(result.jcsJson).toBeDefined();
      expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('produces consistent hash for same object', () => {
      const obj = { name: 'Test', version: '1.0.0' };
      
      const result1 = canonicalizeForHash(obj);
      const result2 = canonicalizeForHash(obj);
      
      expect(result1.jcsJson).toBe(result2.jcsJson);
      expect(result1.hash).toBe(result2.hash);
    });

    it('produces different hash for different objects', () => {
      const obj1 = { name: 'Test1' };
      const obj2 = { name: 'Test2' };
      
      const result1 = canonicalizeForHash(obj1);
      const result2 = canonicalizeForHash(obj2);
      
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('handles null values', () => {
      const obj = { name: 'Test', value: null };
      const result = canonicalizeForHash(obj);
      
      expect(result.jcsJson).toContain('null');
      expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('handles boolean values', () => {
      const obj = { name: 'Test', active: true, disabled: false };
      const result = canonicalizeForHash(obj);
      
      expect(result.jcsJson).toContain('true');
      expect(result.jcsJson).toContain('false');
      expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('handles numeric values', () => {
      const obj = { name: 'Test', count: 42, price: 3.14 };
      const result = canonicalizeForHash(obj);
      
      expect(result.jcsJson).toContain('42');
      expect(result.jcsJson).toContain('3.14');
      expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('handles empty object', () => {
      const obj = {};
      const result = canonicalizeForHash(obj);
      expect(result.jcsJson).toBe('{}');
      expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('JCS JSON has no whitespace', () => {
      const obj = { b: 2, a: 1, c: 3 };
      const result = canonicalizeForHash(obj);
      
      // JCS should have no spaces
      expect(result.jcsJson).not.toContain(' ');
      expect(result.jcsJson).not.toContain('\n');
      expect(result.jcsJson).not.toContain('\t');
    });

    it('JCS JSON has sorted keys', () => {
      const obj = { z: 1, a: 2, m: 3 };
      const result = canonicalizeForHash(obj);
      expect(result.jcsJson).toBe('{"a":2,"m":3,"z":1}');
    });
  });
});



// Mock fetch for testing computeDataHashFromDataUrl and verifyDataUrlHash
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('computeDataHashFromDataUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('computes hash from valid JSON response', async () => {
    const { computeDataHashFromDataUrl } = await import('@/lib/utils/dataurl');
    
    const mockJson = { name: 'Test', version: '1.0.0' };
    const mockResponse = {
      ok: true,
      headers: {
        get: (key: string) => key === 'content-type' ? 'application/json' : null,
      },
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(JSON.stringify(mockJson)) })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const result = await computeDataHashFromDataUrl('https://example.com/metadata.json');
    
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.jcsJson).toBeDefined();
  });

  it('throws error for non-OK HTTP response', async () => {
    const { computeDataHashFromDataUrl } = await import('@/lib/utils/dataurl');
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });
    
    await expect(computeDataHashFromDataUrl('https://example.com/notfound.json'))
      .rejects.toThrow('HTTP 404');
  });

  it('throws error for invalid content-type', async () => {
    const { computeDataHashFromDataUrl } = await import('@/lib/utils/dataurl');
    
    const mockResponse = {
      ok: true,
      headers: {
        get: () => 'text/html',
      },
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    await expect(computeDataHashFromDataUrl('https://example.com/page.html'))
      .rejects.toThrow('Invalid content-type');
  });

  it('throws error when content-type header is missing', async () => {
    const { computeDataHashFromDataUrl } = await import('@/lib/utils/dataurl');
    
    const mockResponse = {
      ok: true,
      headers: {
        get: () => null, // Missing content-type header
      },
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    await expect(computeDataHashFromDataUrl('https://example.com/metadata.json'))
      .rejects.toThrow('Invalid content-type');
  });

  it('throws error when response body is missing', async () => {
    const { computeDataHashFromDataUrl } = await import('@/lib/utils/dataurl');
    
    const mockResponse = {
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      body: null,
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    await expect(computeDataHashFromDataUrl('https://example.com/metadata.json'))
      .rejects.toThrow('No response body');
  });

  it('throws error when response is too large', async () => {
    const { computeDataHashFromDataUrl } = await import('@/lib/utils/dataurl');
    
    // Create a large chunk that exceeds the limit
    const largeChunk = new Uint8Array(1000);
    
    const mockResponse = {
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: largeChunk })
            .mockResolvedValueOnce({ done: false, value: largeChunk })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    // Set a very small maxBytes limit
    await expect(computeDataHashFromDataUrl('https://example.com/large.json', 0, { maxBytes: 100 }))
      .rejects.toThrow('Response too large');
  });

  it('uses sha256 algorithm when specified', async () => {
    const { computeDataHashFromDataUrl } = await import('@/lib/utils/dataurl');
    
    const mockJson = { name: 'Test' };
    const mockResponse = {
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(JSON.stringify(mockJson)) })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const result = await computeDataHashFromDataUrl('https://example.com/metadata.json', 1);
    
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('handles empty chunks gracefully', async () => {
    const { computeDataHashFromDataUrl } = await import('@/lib/utils/dataurl');
    
    const mockJson = { name: 'Test' };
    const mockResponse = {
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: undefined }) // Empty chunk
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(JSON.stringify(mockJson)) })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const result = await computeDataHashFromDataUrl('https://example.com/metadata.json');
    
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('accepts timeout configuration', async () => {
    const { computeDataHashFromDataUrl } = await import('@/lib/utils/dataurl');
    
    const mockJson = { test: true };
    const mockResponse = {
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(JSON.stringify(mockJson)) })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const result = await computeDataHashFromDataUrl('https://example.com/data.json', 0, { timeoutMs: 5000 });
    
    expect(result).toBeDefined();
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe('verifyDataUrlHash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('returns ok=true when hash matches', async () => {
    const { verifyDataUrlHash, canonicalizeForHash } = await import('@/lib/utils/dataurl');
    
    const mockJson = { name: 'Test', version: '1.0.0' };
    const { hash: expectedHash } = canonicalizeForHash(mockJson);
    
    const mockResponse = {
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(JSON.stringify(mockJson)) })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const result = await verifyDataUrlHash('https://example.com/metadata.json', expectedHash);
    
    expect(result.ok).toBe(true);
    expect(result.computedHash.toLowerCase()).toBe(expectedHash.toLowerCase());
  });

  it('returns ok=false when hash does not match', async () => {
    const { verifyDataUrlHash } = await import('@/lib/utils/dataurl');
    
    const mockJson = { name: 'Test' };
    const wrongHash = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
    
    const mockResponse = {
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(JSON.stringify(mockJson)) })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const result = await verifyDataUrlHash('https://example.com/metadata.json', wrongHash);
    
    expect(result.ok).toBe(false);
    expect(result.computedHash).not.toBe(wrongHash);
  });

  it('handles case-insensitive hash comparison', async () => {
    const { verifyDataUrlHash, canonicalizeForHash } = await import('@/lib/utils/dataurl');
    
    const mockJson = { name: 'Test' };
    const { hash } = canonicalizeForHash(mockJson);
    const upperCaseHash = hash.toUpperCase() as `0x${string}`;
    
    const mockResponse = {
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(JSON.stringify(mockJson)) })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const result = await verifyDataUrlHash('https://example.com/metadata.json', upperCaseHash);
    
    expect(result.ok).toBe(true);
  });
});
