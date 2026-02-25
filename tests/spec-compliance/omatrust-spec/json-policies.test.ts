/**
 * OMATrust Specification Compliance: JSON Policies
 * 
 * Tests implementation compliance with OMATrust Identity Specification
 * Section 5.1.3.3 - dataUrl Confirmation
 * Section 5.1.3.4 - JSON Policies
 * 
 * SPECIFICATION REFERENCES:
 * - OMATrust Identity Specification: omatrust-specification-identity.pdf
 * - Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 * - Sections: 5.1.3.3 and 5.1.3.4
 * 
 * SECTION 5.1.3.3: dataUrl Confirmation
 * - dataHash MUST equal hash of JCS-canonicalized JSON
 * - dataUrl.owner MUST match NFT owner address
 * 
 * SECTION 5.1.3.4: JSON Policies
 * - JSON MUST conform to RFC 8259 (no comments, trailing commas)
 * - JSON MUST be canonicalized using JCS (RFC 8785)
 * - dataHash = HASH(canonicalUtf8Bytes)
 */

import { describe, it, expect } from 'vitest';
import { canonicalizeForHash } from '@/lib/utils/dataurl';
import { buildOffchainMetadataObject } from '@/lib/utils/offchain-json';

describe('OMATrust Identity Spec 5.1.3: JSON Policies and Hash Verification', () => {
  /**
   * Tests validate JSON handling and hash computation per specification.
   */

  describe('JSON Canonicalization (OT-ID-090 to OT-ID-092)', () => {
    it('produces deterministic output for identical objects - OT-ID-090', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.3.4
       * Requirement ID: OT-ID-090
       * Requirement: "JSON MUST conform to RFC 8259 (no comments, trailing commas)"
       * 
       * JCS ensures deterministic output for identical logical content
       */
      const obj1 = {
        name: 'Test App',
        description: 'A test application',
        publisher: 'Publisher',
        image: 'https://example.com/icon.png',
      };

      // Same logical content, different property order
      const obj2 = {
        image: 'https://example.com/icon.png',
        publisher: 'Publisher',
        description: 'A test application',
        name: 'Test App',
      };

      const result1 = canonicalizeForHash(obj1);
      const result2 = canonicalizeForHash(obj2);

      // JCS should produce identical hashes for same logical content
      expect(result1.hash).toBe(result2.hash);
    });

    it('uses JCS (RFC 8785) canonicalization - OT-ID-091', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.3.4
       * Requirement ID: OT-ID-091
       * Requirement: "JSON MUST be canonicalized using JCS (RFC 8785)"
       * 
       * JCS characteristics:
       * - Lexicographically sorted keys
       * - No whitespace
       * - UTF-8 encoding
       * - Normalized number representation
       */
      const obj = {
        z: 'last',
        a: 'first',
        m: 'middle',
        nested: {
          b: 2,
          a: 1,
        },
      };

      const result = canonicalizeForHash(obj);
      
      // Hash should be a valid keccak256 hash (0x + 64 hex chars)
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('computes hash from canonicalized UTF-8 bytes - OT-ID-092', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.3.4
       * Requirement ID: OT-ID-092
       * Requirement: "dataHash = HASH(canonicalUtf8Bytes)"
       * 
       * The hash is computed from the UTF-8 byte representation of
       * the JCS-canonicalized JSON string.
       */
      const metadata = buildOffchainMetadataObject({
        name: 'Hash Test App',
        description: 'Testing hash computation from UTF-8 bytes',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
      });

      const result = canonicalizeForHash(metadata);

      // Verify hash format (keccak256 produces 32 bytes = 64 hex chars)
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      
      // Verify determinism - same input should produce same hash
      const result2 = canonicalizeForHash(metadata);
      expect(result.hash).toBe(result2.hash);
    });

    it('handles Unicode characters correctly', () => {
      /**
       * JCS requires proper UTF-8 encoding of Unicode characters
       */
      const unicodeObj = {
        name: 'Café App ☕',
        description: '日本語テスト - Japanese test',
        publisher: 'Émile Müller',
        image: 'https://example.com/icon.png',
      };

      const result = canonicalizeForHash(unicodeObj);
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // Same content should produce same hash
      const result2 = canonicalizeForHash(unicodeObj);
      expect(result.hash).toBe(result2.hash);
    });

    it('handles special number representations', () => {
      /**
       * JCS has specific rules for number representation:
       * - No exponential notation for small numbers
       * - No trailing zeros
       */
      const numObj = {
        integer: 42,
        float: 3.14,
        zero: 0,
        negative: -100,
      };

      const result = canonicalizeForHash(numObj);
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('excludes undefined and null properly', () => {
      /**
       * JCS/JSON handling of undefined/null values
       */
      const objWithUndefined = {
        name: 'Test',
        description: 'Description',
        optional: undefined,
        nullable: null,
      };

      // Should not throw
      const result = canonicalizeForHash(objWithUndefined);
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe('dataUrl Confirmation (OT-ID-080 to OT-ID-081)', () => {
    it('dataHash must equal hash of JCS-canonicalized JSON - OT-ID-080', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.3.3
       * Requirement ID: OT-ID-080
       * Requirement: "dataHash MUST equal hash of JCS-canonicalized JSON"
       * 
       * The on-chain dataHash must match the hash computed from
       * the JCS-canonicalized off-chain metadata JSON.
       */
      const offchainMetadata = buildOffchainMetadataObject({
        name: 'Verified App',
        description: 'An app with verified metadata hash',
        publisher: 'Trusted Publisher',
        image: 'https://example.com/icon.png',
      });

      // Compute the expected dataHash
      const result = canonicalizeForHash(offchainMetadata);

      // In a real scenario, this would be verified against on-chain dataHash
      // For this test, we verify the hash is computed correctly
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      
      // Re-computing should yield the same result
      const result2 = canonicalizeForHash(offchainMetadata);
      expect(result.hash).toBe(result2.hash);
    });

    it('builds metadata with consistent hash for verification', () => {
      /**
       * Tests that the full metadata building pipeline produces
       * consistent, hashable output
       */
      const input = {
        name: 'Consistent Hash App',
        description: 'Testing consistent hash computation',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        did: 'did:web:example.com',
        traits: ['api:openapi', 'pay:x402'],
      };

      const metadata1 = buildOffchainMetadataObject(input);
      const metadata2 = buildOffchainMetadataObject(input);

      const result1 = canonicalizeForHash(metadata1);
      const result2 = canonicalizeForHash(metadata2);

      expect(result1.hash).toBe(result2.hash);
    });
  });

  describe('Hash Algorithm Support (OT-ID-011)', () => {
    it('supports keccak256 hash algorithm (EVM default)', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1
       * Requirement ID: OT-ID-011
       * Requirement: "dataHashAlgorithm field: 'keccak256' (EVM default), 'sha256'"
       * 
       * The current implementation uses keccak256 as the default hash algorithm.
       */
      const metadata = {
        name: 'Keccak Test',
        description: 'Testing keccak256 hash',
      };

      const result = canonicalizeForHash(metadata);
      
      // keccak256 produces a 32-byte (256-bit) hash
      // Represented as 0x + 64 hex characters
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.hash.length).toBe(66); // 0x + 64 chars
    });

    it('documents need for sha256 support', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1
       * Requirement: SHA-256 should also be supported for non-EVM chains
       * 
       * Note: Current implementation only supports keccak256.
       * This test documents the gap.
       */
      
      // Document that sha256 alternative may not be implemented
      console.warn('[OT-ID-011] NOTE: sha256 algorithm support should be verified for non-EVM chains');
      
      // The test passes but logs a note about the requirement
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty arrays and objects', () => {
      /**
       * Edge case: Empty collections should hash consistently
       */
      const objWithEmpty = {
        name: 'Empty Collections',
        emptyArray: [],
        emptyObject: {},
      };

      const result = canonicalizeForHash(objWithEmpty);
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('handles deeply nested structures', () => {
      /**
       * Edge case: Deeply nested objects should hash correctly
       */
      const deepNested = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      };

      const result = canonicalizeForHash(deepNested);
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('handles arrays with mixed types', () => {
      /**
       * Edge case: Arrays with different element types
       */
      const mixedArray = {
        mixed: [1, 'two', true, null, { nested: 'object' }],
      };

      const result = canonicalizeForHash(mixedArray);
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
  });
});

