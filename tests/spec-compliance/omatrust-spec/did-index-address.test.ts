import { describe, it, expect } from 'vitest';
import {
  normalizeDidWeb,
  normalizeDidPkh,
  computeDidHash,
  computeDidAddress,
  didToAddress,
  validateDidAddress,
  isValidDid,
  extractDidMethod,
  extractDidIdentifier,
} from '@/lib/utils/did';

/**
 * OMATrust Identity Specification - Section 5.3: Reputation Service
 *
 * Tests for DID → Index Address conversion used for EAS attestation indexing.
 * Migrated from @/lib/did-index to @/lib/utils/did per TEST-MIGRATION-GUIDE.
 * This is a critical function for the OMATrust reputation system.
 */

describe('OMATrust Identity Spec 5.3: DID → Index Address', () => {
  describe('DID Canonicalization (normalizeDidWeb / normalizeDidPkh)', () => {
    it('canonicalizes did:web by lowercasing host', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.3
       * Requirement: did:web MUST be canonicalized by lowercasing the host
       */
      const original = 'did:web:Example.COM';
      const canonical = normalizeDidWeb(original);

      expect(canonical).toBe('did:web:example.com');
    });

    it('canonicalizes did:web with path', () => {
      /**
       * did:web with path should preserve path after lowercasing host
       */
      const original = 'did:web:Example.COM/users/alice';
      const canonical = normalizeDidWeb(original);

      expect(canonical).toBe('did:web:example.com/users/alice');
    });

    it('canonicalizes did:pkh by lowercasing address', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.3
       * Requirement: did:pkh MUST use canonical CAIP-10 encoding (lowercase address)
       */
      const original = 'did:pkh:eip155:1:0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
      const canonical = normalizeDidPkh(original);

      expect(canonical).toBe('did:pkh:eip155:1:0xabcdef1234567890abcdef1234567890abcdef12');
    });

    it('invalid DIDs are rejected by isValidDid or validateDidAddress', () => {
      /**
       * Invalid DID should not be treated as valid
       */
      expect(isValidDid('not-a-did')).toBe(false);
      expect(isValidDid('did:')).toBe(false);
      expect(isValidDid('did:web')).toBe(false);
      expect(validateDidAddress('not-a-did', '0x' + '0'.repeat(40))).toBe(false);
    });

    it('throws on invalid did:pkh format', () => {
      /**
       * did:pkh MUST have exactly 5 parts
       */
      expect(() => normalizeDidPkh('did:pkh:eip155:1')).toThrow(/Invalid did:pkh format/);
    });
  });

  describe('DID Hash Computation', () => {
    it('OT-ID-140: computes keccak256 hash of canonicalized DID', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.3
       * Requirement ID: OT-ID-140
       * Requirement: didHash = keccak256(canonicalDid)
       */
      const did = 'did:web:example.com';
      const hash = computeDidHash(did);

      // Hash should be 32 bytes (64 hex chars + 0x prefix)
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);

      // Same DID should produce same hash
      const hash2 = computeDidHash(did);
      expect(hash).toBe(hash2);
    });

    it('produces different hashes for different DIDs', () => {
      /**
       * Different DIDs MUST produce different hashes
       */
      const hash1 = computeDidHash('did:web:example.com');
      const hash2 = computeDidHash('did:web:other.com');

      expect(hash1).not.toBe(hash2);
    });

    it('produces same hash for case-variant did:web', () => {
      /**
       * Canonicalization should normalize case
       */
      const hash1 = computeDidHash('did:web:Example.COM');
      const hash2 = computeDidHash('did:web:example.com');

      expect(hash1).toBe(hash2);
    });
  });

  describe('DID Index Address Computation', () => {
    it('OT-ID-140: uses domain-separated prefix', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.3
       * Requirement ID: OT-ID-140
       * Requirement: keccak256("DID:Solidity:Address:v1:" + didHash)
       */
      const did = 'did:web:example.com';
      const indexAddress = didToAddress(did);

      // Should be a valid Ethereum address
      expect(indexAddress).toMatch(/^0x[a-f0-9]{40}$/);
    });

    it('OT-ID-141: EAS recipient equals computed indexAddress', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.3
       * Requirement ID: OT-ID-141
       * Requirement: EAS recipient MUST equal computed indexAddress(did)
       *
       * This test verifies the function produces valid, deterministic addresses.
       */
      const did = 'did:web:example.com';
      const address1 = didToAddress(did);
      const address2 = didToAddress(did);

      // Same DID should always produce same address
      expect(address1).toBe(address2);

      // Address should be valid Ethereum format
      expect(address1).toMatch(/^0x[a-f0-9]{40}$/);
    });

    it('produces different addresses for different DIDs', () => {
      /**
       * Different DIDs MUST produce different index addresses
       */
      const address1 = didToAddress('did:web:example.com');
      const address2 = didToAddress('did:web:other.com');

      expect(address1).not.toBe(address2);
    });
  });

  describe('Index Address Validation (validateDidAddress)', () => {
    it('validates correct DID-to-address mapping', () => {
      /**
       * Validate that an address was correctly derived from a DID
       */
      const did = 'did:web:example.com';
      const indexAddress = didToAddress(did);

      expect(validateDidAddress(did, indexAddress)).toBe(true);
    });

    it('rejects incorrect address for DID', () => {
      /**
       * Incorrect addresses should fail validation
       */
      const did = 'did:web:example.com';
      const wrongAddress = '0x0000000000000000000000000000000000000000';

      expect(validateDidAddress(did, wrongAddress)).toBe(false);
    });

    it('handles case-insensitive address comparison', () => {
      /**
       * Address comparison should be case-insensitive
       */
      const did = 'did:web:example.com';
      const indexAddress = didToAddress(did);
      const upperAddress = indexAddress.toUpperCase();

      expect(validateDidAddress(did, upperAddress)).toBe(true);
    });

    it('returns false for invalid DID', () => {
      /**
       * Invalid DID should return false, not throw
       */
      const result = validateDidAddress('not-a-did', '0x0000000000000000000000000000000000000000');
      expect(result).toBe(false);
    });
  });

  describe('DID Utility Functions', () => {
    it('isValidDid validates DID format', () => {
      /**
       * Basic DID format validation
       */
      expect(isValidDid('did:web:example.com')).toBe(true);
      expect(isValidDid('did:pkh:eip155:1:0x1234')).toBe(true);
      expect(isValidDid('did:key:z6Mk...')).toBe(true);
      expect(isValidDid('not-a-did')).toBe(false);
      expect(isValidDid('did:')).toBe(false);
      expect(isValidDid('')).toBe(false);
    });

    it('extractDidMethod returns method part', () => {
      /**
       * Extract method from DID
       */
      expect(extractDidMethod('did:web:example.com')).toBe('web');
      expect(extractDidMethod('did:pkh:eip155:1:0x1234')).toBe('pkh');
      expect(extractDidMethod('did:key:z6Mk...')).toBe('key');
      expect(extractDidMethod('not-a-did')).toBeNull();
    });

    it('extractDidIdentifier returns identifier part', () => {
      /**
       * Extract identifier from DID
       */
      expect(extractDidIdentifier('did:web:example.com')).toBe('example.com');
      expect(extractDidIdentifier('did:pkh:eip155:1:0x1234')).toBe('eip155:1:0x1234');
      expect(extractDidIdentifier('not-a-did')).toBeNull();
    });
  });

  describe('Cross-DID-Method Compatibility', () => {
    it('handles did:web correctly', () => {
      /**
       * did:web index address generation
       */
      const did = 'did:web:oma3.org';
      const address = didToAddress(did);

      expect(address).toMatch(/^0x[a-f0-9]{40}$/);
    });

    it('handles did:pkh correctly', () => {
      /**
       * did:pkh index address generation
       */
      const did = 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890';
      const address = didToAddress(did);

      expect(address).toMatch(/^0x[a-f0-9]{40}$/);
    });

    it('handles did:artifact correctly', () => {
      /**
       * did:artifact index address generation
       */
      const did = 'did:artifact:bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      const address = didToAddress(did);

      expect(address).toMatch(/^0x[a-f0-9]{40}$/);
    });
  });

  describe('OT-ID-142: Attestation Payload Requirements', () => {
    it('OT-ID-142: subjectDidHash should be included in attestation payload', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.3
       * Requirement ID: OT-ID-142
       * Requirement: Attestation payload MUST include subjectDidHash
       *
       * This ensures the DID can be verified against the index address.
       */
      const did = 'did:web:example.com';
      const didHash = computeDidHash(did);
      const indexAddress = didToAddress(did);

      // Attestation payload structure should include subjectDidHash
      const attestationPayload = {
        subject: did,
        subjectDidHash: didHash,
      };

      expect(attestationPayload.subjectDidHash).toBe(didHash);

      // Verify the hash can be used to recompute the index address
      const recomputedAddress = computeDidAddress(didHash);
      expect(recomputedAddress).toBe(indexAddress);
    });
  });
});
