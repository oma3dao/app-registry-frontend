/**
 * Tests for DID Address Utilities (EAS attestation indexing)
 * Migrated from @/lib/did-index to @/lib/utils/did per TEST-MIGRATION-GUIDE.
 * Tests OMATrust specification section 5.3.2 implementation.
 */

import { describe, it, expect } from 'vitest';
import {
  computeDidHash,
  computeDidAddress,
  didToAddress,
  validateDidAddress,
  normalizeDomain,
  isValidDid,
  extractDidMethod,
  extractDidIdentifier,
  normalizeDidWeb,
  normalizeDid,
  normalizeDidPkh,
} from '@/lib/utils/did';

describe('DID Address Utilities', () => {
  describe('normalizeDid / normalizeDidWeb / normalizeDidPkh (replaces canonicalizeDID)', () => {
    it('normalizes did:web with uppercase host', () => {
      expect(normalizeDidWeb('did:web:Example.COM')).toBe('did:web:example.com');
      expect(normalizeDid('did:web:Example.COM')).toBe('did:web:example.com');
    });

    it('normalizes did:web with path', () => {
      expect(normalizeDidWeb('did:web:Example.COM/path/to/resource')).toBe('did:web:example.com/path/to/resource');
      expect(normalizeDid('did:web:Example.COM/path/to/resource')).toBe('did:web:example.com/path/to/resource');
    });

    it('normalizes did:pkh with uppercase address', () => {
      expect(normalizeDidPkh('did:pkh:eip155:1:0xABCDEF')).toBe('did:pkh:eip155:1:0xabcdef');
      expect(normalizeDid('did:pkh:eip155:1:0xABCDEF')).toBe('did:pkh:eip155:1:0xabcdef');
    });

    it('normalizeDidWeb throws for non-web DID', () => {
      expect(() => normalizeDidWeb('did:pkh:eip155:1:0xabc')).toThrow(/normalizeDidWeb received non-web DID/);
    });

    it('normalizeDidPkh throws for invalid did:pkh format', () => {
      expect(() => normalizeDidPkh('did:pkh:eip155:1')).toThrow(/Invalid did:pkh format/);
    });

    it('handles unknown DID methods via normalizeDid (returns as-is)', () => {
      expect(normalizeDid('did:unknown:IDENTIFIER')).toBe('did:unknown:IDENTIFIER');
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

  describe('computeDidAddress (replaces computeDidIndex)', () => {
    it('computes index address from hash', () => {
      const hash = '0x' + '1234567890abcdef'.repeat(4);
      const address = computeDidAddress(hash);
      expect(address).toMatch(/^0x[0-9a-f]{40}$/);
    });

    it('produces consistent address for same hash', () => {
      const hash = '0x' + 'abcdef1234567890'.repeat(4);
      const addr1 = computeDidAddress(hash);
      const addr2 = computeDidAddress(hash);
      expect(addr1).toBe(addr2);
    });
  });

  describe('didToAddress (replaces didToIndexAddress)', () => {
    it('converts DID to index address', () => {
      const address = didToAddress('did:web:example.com');
      expect(address).toMatch(/^0x[0-9a-f]{40}$/);
    });

    it('produces consistent address for same DID', () => {
      const addr1 = didToAddress('did:web:example.com');
      const addr2 = didToAddress('did:web:example.com');
      expect(addr1).toBe(addr2);
    });

    it('produces same address for different case DIDs', () => {
      const addr1 = didToAddress('did:web:Example.COM');
      const addr2 = didToAddress('did:web:example.com');
      expect(addr1).toBe(addr2);
    });
  });

  describe('validateDidAddress (replaces validateDidIndex)', () => {
    it('returns true for valid DID and matching index', () => {
      const did = 'did:web:example.com';
      const indexAddress = didToAddress(did);
      expect(validateDidAddress(did, indexAddress)).toBe(true);
    });

    it('returns true for case-insensitive address comparison', () => {
      const did = 'did:web:example.com';
      const indexAddress = didToAddress(did).toUpperCase();
      expect(validateDidAddress(did, indexAddress)).toBe(true);
    });

    it('returns false for mismatched index', () => {
      const did = 'did:web:example.com';
      const wrongAddress = '0x' + '0'.repeat(40);
      expect(validateDidAddress(did, wrongAddress)).toBe(false);
    });

    it('returns false for invalid DID', () => {
      expect(validateDidAddress('invalid', '0x' + '0'.repeat(40))).toBe(false);
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
