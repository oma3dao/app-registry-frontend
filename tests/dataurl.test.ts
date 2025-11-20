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

    it('handles nested objects', () => {
      const obj = {
        name: 'Test',
        nested: {
          b: 2,
          a: 1,
        },
      };
      
      const result = canonicalizeForHash(obj);
      expect(result.jcsJson).toBeDefined();
      expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('handles arrays', () => {
      const obj = {
        name: 'Test',
        items: ['item1', 'item2', 'item3'],
      };
      
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

    it('handles complex nested structure', () => {
      const obj = {
        name: 'Complex App',
        metadata: {
          version: '2.0.0',
          features: ['feature1', 'feature2'],
        },
        platforms: {
          web: { url: 'https://web.example.com', supported: true },
          mobile: { url: 'https://mobile.example.com', supported: false },
        },
        tags: ['tag1', 'tag2'],
      };
      
      const result = canonicalizeForHash(obj);
      expect(result.jcsJson).toBeDefined();
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
      
      // Keys should be in alphabetical order
      expect(result.jcsJson).toBe('{"a":2,"m":3,"z":1}');
    });

    it('handles metadata-like objects', () => {
      const metadata = {
        name: 'My App',
        description: 'An awesome app',
        image: 'https://example.com/image.png',
        external_url: 'https://example.com',
        screenshotUrls: [
          'https://example.com/shot1.png',
          'https://example.com/shot2.png',
        ],
        platforms: {
          windows: 'https://download.example.com/windows',
          mac: 'https://download.example.com/mac',
        },
      };
      
      const result = canonicalizeForHash(metadata);
      expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(result.jcsJson).toBeDefined();
    });
  });
});

