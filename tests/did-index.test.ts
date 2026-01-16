/**
 * Tests for DID Index Address Utilities
 * Tests the OMATrust specification section 5.3.2 implementation
 */

import { describe, it, expect } from 'vitest';
import {
  canonicalizeDID,
  computeDidHash,
  computeDidIndex,
  didToIndexAddress,
  validateDidIndex,
  normalizeDomain,
  isValidDid,
  extractDidMethod,
  extractDidIdentifier,
  normalizeDidWeb,
} from '@/lib/did-index';

describe('DID Index Utilities', () => {
  describe('canonicalizeDID', () => {
    it('canonicalizes did:web with uppercase host', () => {
      expect(canonicalizeDID('did:web:Example.COM')).toBe('did:web:example.com');
    });

    it('canonicalizes did:web with path', () => {
      expect(canonicalizeDID('did:web:Example.COM/path/to/resource')).toBe('did:web:example.com/path/to/resource');
    });

    it('canonicalizes did:pkh with uppercase address', () => {
      expect(canonicalizeDID('did:pkh:eip155:1:0xABCDEF')).toBe('did:pkh:eip155:1:0xabcdef');
    });

    it('throws error for invalid DID format (no did: prefix)', () => {
      expect(() => canonicalizeDID('invalid:web:example.com')).toThrow('Invalid DID format: must start with "did:"');
    });

    it('throws error for DID with insufficient parts', () => {
      expect(() => canonicalizeDID('did:web')).toThrow('Invalid DID format: insufficient parts');
    });

    it('throws error for invalid did:pkh format', () => {
      expect(() => canonicalizeDID('did:pkh:eip155:1')).toThrow('Invalid did:pkh format: must have 5 parts');
    });

    it('handles unknown DID methods by lowercasing', () => {
      expect(canonicalizeDID('did:unknown:IDENTIFIER')).toBe('did:unknown:identifier');
    });
  });

  describe('computeDidHash', () => {
    it('computes hash for did:web', () => {
      const hash = computeDidHash('did:web:example.com');
      expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('produces consistent hash for same DID', () => {
      const hash1 = computeDidHash('did:web:example.com');
      const hash2 = computeDidHash('did:web:example.com');
      expect(hash1).toBe(hash2);
    });

    it('produces same hash for different case DIDs', () => {
      const hash1 = computeDidHash('did:web:Example.COM');
      const hash2 = computeDidHash('did:web:example.com');
      expect(hash1).toBe(hash2);
    });
  });

  describe('computeDidIndex', () => {
    it('computes index address from hash', () => {
      const hash = '0x' + '1234567890abcdef'.repeat(4);
      const address = computeDidIndex(hash);
      expect(address).toMatch(/^0x[0-9a-f]{40}$/);
    });

    it('produces consistent address for same hash', () => {
      const hash = '0x' + 'abcdef1234567890'.repeat(4);
      const addr1 = computeDidIndex(hash);
      const addr2 = computeDidIndex(hash);
      expect(addr1).toBe(addr2);
    });
  });

  describe('didToIndexAddress', () => {
    it('converts DID to index address', () => {
      const address = didToIndexAddress('did:web:example.com');
      expect(address).toMatch(/^0x[0-9a-f]{40}$/);
    });

    it('produces consistent address for same DID', () => {
      const addr1 = didToIndexAddress('did:web:example.com');
      const addr2 = didToIndexAddress('did:web:example.com');
      expect(addr1).toBe(addr2);
    });

    it('produces same address for different case DIDs', () => {
      const addr1 = didToIndexAddress('did:web:Example.COM');
      const addr2 = didToIndexAddress('did:web:example.com');
      expect(addr1).toBe(addr2);
    });
  });

  describe('validateDidIndex', () => {
    it('returns true for valid DID and matching index', () => {
      const did = 'did:web:example.com';
      const indexAddress = didToIndexAddress(did);
      expect(validateDidIndex(did, indexAddress)).toBe(true);
    });

    it('returns true for case-insensitive address comparison', () => {
      const did = 'did:web:example.com';
      const indexAddress = didToIndexAddress(did).toUpperCase();
      expect(validateDidIndex(did, indexAddress)).toBe(true);
    });

    it('returns false for mismatched index', () => {
      const did = 'did:web:example.com';
      const wrongAddress = '0x' + '0'.repeat(40);
      expect(validateDidIndex(did, wrongAddress)).toBe(false);
    });

    it('returns false for invalid DID', () => {
      expect(validateDidIndex('invalid', '0x' + '0'.repeat(40))).toBe(false);
    });
  });

  describe('normalizeDomain', () => {
    it('lowercases domain', () => {
      expect(normalizeDomain('Example.COM')).toBe('example.com');
    });

    it('removes trailing dot', () => {
      expect(normalizeDomain('example.com.')).toBe('example.com');
    });

    it('handles already normalized domain', () => {
      expect(normalizeDomain('example.com')).toBe('example.com');
    });
  });

  describe('isValidDid', () => {
    it('returns true for valid did:web', () => {
      expect(isValidDid('did:web:example.com')).toBe(true);
    });

    it('returns true for valid did:pkh', () => {
      expect(isValidDid('did:pkh:eip155:1:0x123')).toBe(true);
    });

    it('returns false for invalid format', () => {
      expect(isValidDid('not-a-did')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidDid('')).toBe(false);
    });
  });

  describe('extractDidMethod', () => {
    it('extracts method from did:web', () => {
      expect(extractDidMethod('did:web:example.com')).toBe('web');
    });

    it('extracts method from did:pkh', () => {
      expect(extractDidMethod('did:pkh:eip155:1:0x123')).toBe('pkh');
    });

    it('returns null for invalid DID', () => {
      expect(extractDidMethod('not-a-did')).toBeNull();
    });
  });

  describe('extractDidIdentifier', () => {
    it('extracts identifier from did:web', () => {
      expect(extractDidIdentifier('did:web:example.com')).toBe('example.com');
    });

    it('extracts identifier from did:pkh', () => {
      expect(extractDidIdentifier('did:pkh:eip155:1:0x123')).toBe('eip155:1:0x123');
    });

    it('returns null for invalid DID', () => {
      expect(extractDidIdentifier('not-a-did')).toBeNull();
    });
  });

  describe('normalizeDidWeb', () => {
    it('normalizes did:web with uppercase', () => {
      expect(normalizeDidWeb('did:web:Example.COM')).toBe('did:web:example.com');
    });

    it('adds did:web prefix if missing', () => {
      expect(normalizeDidWeb('example.com')).toBe('did:web:example.com');
    });

    it('trims whitespace', () => {
      expect(normalizeDidWeb('  did:web:example.com  ')).toBe('did:web:example.com');
    });

    it('handles already normalized input', () => {
      expect(normalizeDidWeb('did:web:example.com')).toBe('did:web:example.com');
    });
  });
});
