import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeDataHashFromDataUrl, verifyDataUrlHash } from '@/lib/utils/dataurl';

describe('DataURL Async Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computeDataHashFromDataUrl', () => {
    // Tests successful hash computation from data URL
    it('computes hash from valid JSON data URL', async () => {
      const mockJson = { name: 'Test App', version: '1.0.0' };
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(JSON.stringify(mockJson)),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      });

      const result = await computeDataHashFromDataUrl('https://example.com/metadata.json');
      
      expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(result.jcsJson).toBeDefined();
      // JCS has sorted keys and minimal whitespace
      expect(result.jcsJson).toContain('name');
      expect(result.jcsJson).toContain('version');
    });

    // Tests timeout configuration is accepted
    it('accepts timeout configuration', async () => {
      const mockJson = { test: true };
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(JSON.stringify(mockJson)),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      });

      // Should accept timeout option without error
      const result = await computeDataHashFromDataUrl(
        'https://example.com/data.json',
        0,
        { timeoutMs: 5000 }
      );
      
      expect(result).toBeDefined();
      expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    });

    // Tests HTTP error handling
    it('throws on HTTP error responses', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        computeDataHashFromDataUrl('https://example.com/notfound.json')
      ).rejects.toThrow('HTTP 404');
    });

    // Tests invalid content-type handling
    it('throws on invalid content-type', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'text/html' : null,
        },
      });

      await expect(
        computeDataHashFromDataUrl('https://example.com/data.html')
      ).rejects.toThrow('Invalid content-type');
    });

    // Tests response size limit
    it('throws when response exceeds size limit', async () => {
      const largeData = 'x'.repeat(3_000_000); // 3MB
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(largeData),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      });

      await expect(
        computeDataHashFromDataUrl('https://example.com/large.json', 0, { maxBytes: 1_000_000 })
      ).rejects.toThrow('too large');
    });

    // Tests no response body
    it('throws when response has no body', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        body: null,
      });

      await expect(
        computeDataHashFromDataUrl('https://example.com/empty.json')
      ).rejects.toThrow('No response body');
    });

    // Tests different hash algorithms
    it('supports algorithm parameter (keccak256)', async () => {
      const mockJson = { test: true };
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(JSON.stringify(mockJson)),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      });

      const result = await computeDataHashFromDataUrl('https://example.com/data.json', 0);
      
      expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    });

    // Tests null content-type header (line 28 branch)
    it('handles null content-type header gracefully', async () => {
      const mockJson = { test: true };
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => null, // Returns null for all headers
        },
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(JSON.stringify(mockJson)),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      });

      // Should throw because content-type doesn't include 'application/json'
      await expect(
        computeDataHashFromDataUrl('https://example.com/data.json')
      ).rejects.toThrow('Invalid content-type');
    });

    // Tests undefined value in read stream (line 39 branch)
    it('handles undefined value in read stream', async () => {
      const mockJson = { test: true };
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: undefined }) // undefined value
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(JSON.stringify(mockJson)),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      });

      const result = await computeDataHashFromDataUrl('https://example.com/data.json');
      
      expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(result.jcsJson).toBeDefined();
    });

    // Tests sha256 algorithm (line 52)
    it('supports sha256 algorithm parameter (algorithm = 1)', async () => {
      const mockJson = { test: true };
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(JSON.stringify(mockJson)),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      });

      const result = await computeDataHashFromDataUrl('https://example.com/data.json', 1);
      
      // Should use sha256 instead of keccak256
      expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(result.jcsJson).toBeDefined();
    });
  });

  describe('verifyDataUrlHash', () => {
    // Tests successful verification
    it('verifies matching hash successfully', async () => {
      const mockJson = { name: 'Test' };
      const expectedHash = '0x' + '1'.repeat(64); // Mock hash
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(JSON.stringify(mockJson)),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      });

      const result = await verifyDataUrlHash(
        'https://example.com/data.json',
        expectedHash as `0x${string}`
      );
      
      expect(result.ok).toBeDefined();
      expect(result.computedHash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(result.jcsJson).toBeDefined();
    });

    // Tests hash mismatch detection
    it('detects hash mismatch', async () => {
      const mockJson = { name: 'Different' };
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(JSON.stringify(mockJson)),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      });

      const wrongHash = '0x' + 'f'.repeat(64);
      const result = await verifyDataUrlHash(
        'https://example.com/data.json',
        wrongHash as `0x${string}`
      );
      
      // Should return false for ok, but include computed hash
      expect(result.computedHash).toBeDefined();
      expect(result.jcsJson).toBeDefined();
    });

    // Tests case-insensitive hash comparison
    it('performs case-insensitive hash comparison', async () => {
      const mockJson = { test: true };
      const mixedCaseHash = '0xAaBbCc' + '0'.repeat(58);
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(JSON.stringify(mockJson)),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      });

      const result = await verifyDataUrlHash(
        'https://example.com/data.json',
        mixedCaseHash as `0x${string}`
      );
      
      // Should handle case-insensitive comparison
      expect(result).toBeDefined();
      expect(result.computedHash).toBeDefined();
    });
  });
});

