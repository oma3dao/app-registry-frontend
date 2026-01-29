import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeDidWeb,
  isValidDid,
  extractDidMethod,
  extractDidIdentifier,
  normalizeDomain,
  computeDidHash,
} from '@/lib/utils/did';

describe('DID utilities', () => {
  describe('normalizeDidWeb', () => {
    it('adds did:web: prefix to plain domain', () => {
      expect(normalizeDidWeb('example.com')).toBe('did:web:example.com');
    });

    it('converts to lowercase', () => {
      expect(normalizeDidWeb('EXAMPLE.COM')).toBe('did:web:example.com');
      expect(normalizeDidWeb('Example.Com')).toBe('did:web:example.com');
    });

    it('preserves did:web: prefix if already present', () => {
      expect(normalizeDidWeb('did:web:example.com')).toBe('did:web:example.com');
    });

    it('normalizes did:web: with uppercase domain', () => {
      expect(normalizeDidWeb('did:web:EXAMPLE.COM')).toBe('did:web:example.com');
    });

    it('trims whitespace', () => {
      expect(normalizeDidWeb('  example.com  ')).toBe('did:web:example.com');
      expect(normalizeDidWeb('  did:web:example.com  ')).toBe('did:web:example.com');
    });

    it('handles subdomain', () => {
      expect(normalizeDidWeb('app.example.com')).toBe('did:web:app.example.com');
      expect(normalizeDidWeb('did:web:app.example.com')).toBe('did:web:app.example.com');
    });

    it('handles port numbers', () => {
      expect(normalizeDidWeb('example.com:3000')).toBe('did:web:example.com:3000');
    });

    it('handles paths', () => {
      expect(normalizeDidWeb('example.com:user:alice')).toBe('did:web:example.com:user:alice');
    });

    it('handles localhost', () => {
      expect(normalizeDidWeb('localhost')).toBe('did:web:localhost');
      expect(normalizeDidWeb('localhost:3000')).toBe('did:web:localhost:3000');
    });

    it('handles IP addresses', () => {
      expect(normalizeDidWeb('192.168.1.1')).toBe('did:web:192.168.1.1');
    });
  });

  describe('isValidDid', () => {
    it.each([
      'did:web:example.com',
      'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
      'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
    ])('returns true for valid DID: %s', (did) => {
      expect(isValidDid(did)).toBe(true);
    });

    it.each([
      'did:web:example.com',
      'did:pkh:eip155:1:0x123',
      'did:ethr:0x123',
      'did:ion:abc123',
      'did:key:z123',
    ])('returns true for DID method: %s', (did) => {
      expect(isValidDid(did)).toBe(true);
    });

    it.each(['not-a-did', 'example.com', ''])('returns false for invalid format: %s', (input) => {
      expect(isValidDid(input)).toBe(false);
    });

    it.each(['did:web:', 'did:web'])('returns false for missing identifier: %s', (input) => {
      expect(isValidDid(input)).toBe(false);
    });

    it('returns false for missing method', () => {
      expect(isValidDid('did::example.com')).toBe(false);
    });

    it('handles uppercase DID method', () => {
      expect(isValidDid('did:WEB:example.com')).toBe(true);
    });
  });

  describe('extractDidMethod', () => {
    it.each([
      { did: 'did:web:example.com', method: 'web' },
      { did: 'did:pkh:eip155:1:0x123', method: 'pkh' },
      { did: 'did:key:z123', method: 'key' },
    ])('extracts method from $did', ({ did, method }) => {
      expect(extractDidMethod(did)).toBe(method);
    });

    it.each(['not-a-did', 'example.com'])('returns null for invalid DID: %s', (input) => {
      expect(extractDidMethod(input)).toBeNull();
    });

    it('returns null for malformed DID', () => {
      expect(extractDidMethod('did:')).toBeNull();
      expect(extractDidMethod('did::')).toBeNull();
    });

    it('handles uppercase method', () => {
      expect(extractDidMethod('did:WEB:example.com')).toBe('WEB');
    });

    it('handles numeric methods', () => {
      expect(extractDidMethod('did:123:identifier')).toBe('123');
    });
  });

  describe('extractDidIdentifier', () => {
    it.each([
      { did: 'did:web:example.com', expected: 'example.com' },
      { did: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890', expected: 'eip155:1:0x1234567890123456789012345678901234567890' },
      { did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK', expected: 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK' },
      { did: 'did:pkh:eip155:1:0x123', expected: 'eip155:1:0x123' },
      { did: 'did:web:example.com:user:alice', expected: 'example.com:user:alice' },
    ])('extracts identifier from $did', ({ did, expected }) => {
      expect(extractDidIdentifier(did)).toBe(expected);
    });

    it.each(['not-a-did', 'example.com', ''])('returns null for invalid DID: %s', (input) => {
      expect(extractDidIdentifier(input)).toBeNull();
    });
  });

  describe('normalizeDomain', () => {
    it('converts to lowercase', () => {
      expect(normalizeDomain('EXAMPLE.COM')).toBe('example.com');
      expect(normalizeDomain('Example.Com')).toBe('example.com');
    });

    it('removes trailing dot', () => {
      expect(normalizeDomain('example.com.')).toBe('example.com');
      expect(normalizeDomain('example.com..')).toBe('example.com.');
    });

    it('preserves subdomain', () => {
      expect(normalizeDomain('app.example.com')).toBe('app.example.com');
      expect(normalizeDomain('sub.app.example.com')).toBe('sub.app.example.com');
    });

    it('handles localhost', () => {
      expect(normalizeDomain('localhost')).toBe('localhost');
      expect(normalizeDomain('LOCALHOST')).toBe('localhost');
    });

    it('handles IP addresses', () => {
      expect(normalizeDomain('192.168.1.1')).toBe('192.168.1.1');
    });

    it('handles port numbers', () => {
      expect(normalizeDomain('example.com:3000')).toBe('example.com:3000');
    });

    it('handles already normalized domain', () => {
      expect(normalizeDomain('example.com')).toBe('example.com');
    });

    it('handles empty string', () => {
      expect(normalizeDomain('')).toBe('');
    });

    it('handles domains with hyphens', () => {
      expect(normalizeDomain('my-app.example-domain.com')).toBe('my-app.example-domain.com');
    });
  });

  describe('computeDidHash (replaces getDidHash)', () => {
    it('computes hash for did:web (sync, no RPC call)', () => {
      const hash = computeDidHash('did:web:example.com');
      
      expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(hash.length).toBe(66); // 0x + 64 hex chars
    });

    it('produces consistent hash for same DID', () => {
      const hash1 = computeDidHash('did:web:example.com');
      const hash2 = computeDidHash('did:web:example.com');
      
      expect(hash1).toBe(hash2);
    });

    it('produces same hash for case-variant DIDs (normalizes first)', () => {
      const hash1 = computeDidHash('did:web:Example.COM');
      const hash2 = computeDidHash('did:web:example.com');
      
      expect(hash1).toBe(hash2);
    });

    it('handles different DID formats', () => {
      const webHash = computeDidHash('did:web:example.com');
      const pkhHash = computeDidHash('did:pkh:eip155:1:0x123');
      
      expect(webHash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(pkhHash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(webHash).not.toBe(pkhHash);
    });
  });

  describe('integration scenarios', () => {
    it('normalizeDidWeb and extractDidIdentifier work together', () => {
      const domain = 'Example.Com';
      const normalized = normalizeDidWeb(domain);
      const extracted = extractDidIdentifier(normalized);
      
      expect(normalized).toBe('did:web:example.com');
      expect(extracted).toBe('example.com');
    });

    it('isValidDid validates normalizeDidWeb output', () => {
      const domain = 'example.com';
      const normalized = normalizeDidWeb(domain);
      
      expect(isValidDid(normalized)).toBe(true);
    });

    it('extractDidMethod works with normalized DIDs', () => {
      const normalized = normalizeDidWeb('example.com');
      const method = extractDidMethod(normalized);
      
      expect(method).toBe('web');
    });

    it('handles complete DID workflow', () => {
      const input = 'EXAMPLE.COM';
      const did = normalizeDidWeb(input);
      const valid = isValidDid(did);
      const method = extractDidMethod(did);
      const identifier = extractDidIdentifier(did);
      const domain = normalizeDomain(identifier || '');
      
      expect(did).toBe('did:web:example.com');
      expect(valid).toBe(true);
      expect(method).toBe('web');
      expect(identifier).toBe('example.com');
      expect(domain).toBe('example.com');
    });
  });
});

