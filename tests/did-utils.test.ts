import { describe, it, expect } from 'vitest';
import {
  normalizeDidWeb,
  isValidDid,
  extractDidMethod,
  extractDidIdentifier,
  normalizeDomain,
  getDidHashSync,
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
    it('returns true for valid did:web', () => {
      expect(isValidDid('did:web:example.com')).toBe(true);
    });

    it('returns true for valid did:pkh', () => {
      expect(isValidDid('did:pkh:eip155:1:0x1234567890123456789012345678901234567890')).toBe(true);
    });

    it('returns true for valid did:key', () => {
      expect(isValidDid('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK')).toBe(true);
    });

    it('returns true for various DID methods', () => {
      const dids = [
        'did:web:example.com',
        'did:pkh:eip155:1:0x123',
        'did:ethr:0x123',
        'did:ion:abc123',
        'did:key:z123',
      ];

      dids.forEach(did => {
        expect(isValidDid(did)).toBe(true);
      });
    });

    it('returns false for invalid format', () => {
      expect(isValidDid('not-a-did')).toBe(false);
      expect(isValidDid('example.com')).toBe(false);
      expect(isValidDid('')).toBe(false);
    });

    it('returns false for missing identifier', () => {
      expect(isValidDid('did:web:')).toBe(false);
      expect(isValidDid('did:web')).toBe(false);
    });

    it('returns false for missing method', () => {
      expect(isValidDid('did::example.com')).toBe(false);
    });

    it('handles uppercase DID method', () => {
      expect(isValidDid('did:WEB:example.com')).toBe(true);
    });
  });

  describe('extractDidMethod', () => {
    it('extracts method from did:web', () => {
      expect(extractDidMethod('did:web:example.com')).toBe('web');
    });

    it('extracts method from did:pkh', () => {
      expect(extractDidMethod('did:pkh:eip155:1:0x123')).toBe('pkh');
    });

    it('extracts method from did:key', () => {
      expect(extractDidMethod('did:key:z123')).toBe('key');
    });

    it('returns null for invalid DID', () => {
      expect(extractDidMethod('not-a-did')).toBeNull();
      expect(extractDidMethod('example.com')).toBeNull();
      expect(extractDidMethod('')).toBeNull();
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
    it('extracts identifier from did:web', () => {
      expect(extractDidIdentifier('did:web:example.com')).toBe('example.com');
    });

    it('extracts identifier from did:pkh', () => {
      const identifier = 'eip155:1:0x1234567890123456789012345678901234567890';
      expect(extractDidIdentifier(`did:pkh:${identifier}`)).toBe(identifier);
    });

    it('extracts identifier from did:key', () => {
      expect(extractDidIdentifier('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK')).toBe('z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK');
    });

    it('returns null for invalid DID', () => {
      expect(extractDidIdentifier('not-a-did')).toBeNull();
      expect(extractDidIdentifier('example.com')).toBeNull();
      expect(extractDidIdentifier('')).toBeNull();
    });

    it('handles identifiers with colons', () => {
      expect(extractDidIdentifier('did:pkh:eip155:1:0x123')).toBe('eip155:1:0x123');
    });

    it('handles complex identifiers', () => {
      expect(extractDidIdentifier('did:web:example.com:user:alice')).toBe('example.com:user:alice');
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

  describe('getDidHashSync', () => {
    it('throws error (not implemented)', () => {
      expect(() => getDidHashSync('did:web:example.com')).toThrow('not implemented');
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

