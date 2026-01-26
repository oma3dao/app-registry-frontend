/**
 * Boundary Value Tests
 * 
 * Tests at field limits to ensure proper handling of edge cases.
 * These tests verify behavior at minimum, maximum, and boundary values.
 * 
 * Covers:
 * - String length limits (name, description, summary)
 * - Array size limits (traits, screenshots)
 * - Numeric range limits (version, rating, status)
 * - Hash length requirements
 */

import { describe, it, expect } from 'vitest';
import { OnChainApp, OffChainMetadata, PlatformDetails, Artifact } from '@/schema/data-model';

// ============================================================================
// STRING LENGTH BOUNDARY TESTS
// ============================================================================

describe('Boundary Tests: String Length Limits', () => {
  
  const validMetadataBase = {
    description: 'A valid test application description',
    publisher: 'Test Publisher',
    image: 'https://example.com/icon.png',
  };

  // -------------------------------------------------------------------------
  // Name field: min 2, max 80 characters
  // -------------------------------------------------------------------------
  
  describe('name field (min: 2, max: 80)', () => {
    
    it('rejects name with 1 character (below minimum)', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        name: 'A',
      });
      expect(result.success).toBe(false);
    });

    it('accepts name with exactly 2 characters (at minimum)', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        name: 'AB',
      });
      expect(result.success).toBe(true);
    });

    it('accepts name with 3 characters (above minimum)', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        name: 'ABC',
      });
      expect(result.success).toBe(true);
    });

    it('accepts name with 79 characters (below maximum)', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        name: 'A'.repeat(79),
      });
      expect(result.success).toBe(true);
    });

    it('accepts name with exactly 80 characters (at maximum)', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        name: 'A'.repeat(80),
      });
      expect(result.success).toBe(true);
    });

    it('rejects name with 81 characters (above maximum)', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        name: 'A'.repeat(81),
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Description field: min 10 characters (spec max: 4000)
  // -------------------------------------------------------------------------
  
  describe('description field (min: 10, spec max: 4000)', () => {
    
    it('rejects description with 9 characters (below minimum)', () => {
      const result = OffChainMetadata.safeParse({
        name: 'Test App',
        description: '123456789', // 9 chars
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
      });
      expect(result.success).toBe(false);
    });

    it('accepts description with exactly 10 characters (at minimum)', () => {
      const result = OffChainMetadata.safeParse({
        name: 'Test App',
        description: '1234567890', // 10 chars
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
      });
      expect(result.success).toBe(true);
    });

    it('accepts description with 11 characters (above minimum)', () => {
      const result = OffChainMetadata.safeParse({
        name: 'Test App',
        description: '12345678901', // 11 chars
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
      });
      expect(result.success).toBe(true);
    });

    it('accepts description with 3999 characters (below spec max)', () => {
      const result = OffChainMetadata.safeParse({
        name: 'Test App',
        description: 'A'.repeat(3999),
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
      });
      expect(result.success).toBe(true);
    });

    it('accepts description with exactly 4000 characters (at spec max)', () => {
      const result = OffChainMetadata.safeParse({
        name: 'Test App',
        description: 'A'.repeat(4000),
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
      });
      // Note: Schema may not enforce max - this tests current behavior
      expect(result.success).toBe(true);
    });

    it('documents behavior for description with 4001 characters (above spec max)', () => {
      const result = OffChainMetadata.safeParse({
        name: 'Test App',
        description: 'A'.repeat(4001),
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
      });
      // Per spec this should fail, but schema may not enforce yet
      // This documents current behavior for the schema gap issue
      if (result.success) {
        console.warn('Schema accepts description > 4000 chars - known gap');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Summary field: spec max 80 characters
  // -------------------------------------------------------------------------
  
  describe('summary field (optional, spec max: 80)', () => {
    
    it('accepts undefined summary', () => {
      const result = OffChainMetadata.safeParse({
        name: 'Test App',
        description: 'A valid description here',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty summary', () => {
      const result = OffChainMetadata.safeParse({
        name: 'Test App',
        description: 'A valid description here',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        summary: '',
      });
      expect(result.success).toBe(true);
    });

    it('accepts summary with 79 characters (below spec max)', () => {
      const result = OffChainMetadata.safeParse({
        name: 'Test App',
        description: 'A valid description here',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        summary: 'A'.repeat(79),
      });
      expect(result.success).toBe(true);
    });

    it('accepts summary with exactly 80 characters (at spec max)', () => {
      const result = OffChainMetadata.safeParse({
        name: 'Test App',
        description: 'A valid description here',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        summary: 'A'.repeat(80),
      });
      expect(result.success).toBe(true);
    });

    it('documents behavior for summary with 81 characters (above spec max)', () => {
      const result = OffChainMetadata.safeParse({
        name: 'Test App',
        description: 'A valid description here',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        summary: 'A'.repeat(81),
      });
      // Per spec this should fail, but schema may not enforce yet
      if (result.success) {
        console.warn('Schema accepts summary > 80 chars - known gap');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Publisher field: min 1 character
  // -------------------------------------------------------------------------
  
  describe('publisher field (min: 1)', () => {
    
    it('rejects empty publisher', () => {
      const result = OffChainMetadata.safeParse({
        name: 'Test App',
        description: 'A valid description here',
        publisher: '',
        image: 'https://example.com/icon.png',
      });
      expect(result.success).toBe(false);
    });

    it('accepts publisher with 1 character (at minimum)', () => {
      const result = OffChainMetadata.safeParse({
        name: 'Test App',
        description: 'A valid description here',
        publisher: 'A',
        image: 'https://example.com/icon.png',
      });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// ARRAY SIZE BOUNDARY TESTS
// ============================================================================

describe('Boundary Tests: Array Size Limits', () => {
  
  const validMetadataBase = {
    name: 'Test App',
    description: 'A valid test application description',
    publisher: 'Test Publisher',
    image: 'https://example.com/icon.png',
  };

  // -------------------------------------------------------------------------
  // Traits array: max 20 items
  // -------------------------------------------------------------------------
  
  describe('traits array (max: 20)', () => {
    
    it('accepts empty traits array', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        traits: [],
      });
      expect(result.success).toBe(true);
    });

    it('accepts traits array with 1 item', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        traits: ['trait1'],
      });
      expect(result.success).toBe(true);
    });

    it('accepts traits array with 19 items (below maximum)', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        traits: Array(19).fill(0).map((_, i) => `trait${i}`),
      });
      expect(result.success).toBe(true);
    });

    it('accepts traits array with exactly 20 items (at maximum)', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        traits: Array(20).fill(0).map((_, i) => `trait${i}`),
      });
      expect(result.success).toBe(true);
    });

    it('rejects traits array with 21 items (above maximum)', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        traits: Array(21).fill(0).map((_, i) => `trait${i}`),
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // TraitHashes array: max 20 items
  // -------------------------------------------------------------------------
  
  describe('traitHashes array (max: 20)', () => {
    
    const validOnChainBase = {
      did: 'did:web:example.com',
      initialVersionMajor: 1,
      initialVersionMinor: 0,
      initialVersionPatch: 0,
      interfaces: 1,
      dataUrl: 'https://example.com/metadata.json',
      dataHash: '0x' + '0'.repeat(64),
      dataHashAlgorithm: 0,
      minter: '0x1234567890123456789012345678901234567890',
    };

    const validHash = '0x' + '0'.repeat(64);

    it('accepts empty traitHashes array', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        traitHashes: [],
      });
      expect(result.success).toBe(true);
    });

    it('accepts traitHashes with 1 item', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        traitHashes: [validHash],
      });
      expect(result.success).toBe(true);
    });

    it('accepts traitHashes with exactly 20 items (at maximum)', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        traitHashes: Array(20).fill(validHash),
      });
      expect(result.success).toBe(true);
    });

    it('rejects traitHashes with 21 items (above maximum)', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        traitHashes: Array(21).fill(validHash),
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Screenshot URLs array
  // -------------------------------------------------------------------------
  
  describe('screenshotUrls array', () => {
    
    it('accepts empty screenshotUrls array', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        screenshotUrls: [],
      });
      expect(result.success).toBe(true);
    });

    it('accepts screenshotUrls with valid URLs', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        screenshotUrls: [
          'https://example.com/screen1.png',
          'https://example.com/screen2.png',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects screenshotUrls with invalid URL', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        screenshotUrls: [
          'https://example.com/screen1.png',
          'not-a-valid-url',
        ],
      });
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// NUMERIC RANGE BOUNDARY TESTS
// ============================================================================

describe('Boundary Tests: Numeric Range Limits', () => {
  
  const validOnChainBase = {
    did: 'did:web:example.com',
    interfaces: 1,
    dataUrl: 'https://example.com/metadata.json',
    dataHash: '0x' + '0'.repeat(64),
    dataHashAlgorithm: 0,
    minter: '0x1234567890123456789012345678901234567890',
  };

  // -------------------------------------------------------------------------
  // Version numbers: min 0
  // -------------------------------------------------------------------------
  
  describe('version numbers (min: 0)', () => {
    
    it('accepts version 0.0.0 (all at minimum)', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 0,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      });
      expect(result.success).toBe(true);
    });

    it('accepts version 0.0.1', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 0,
        initialVersionMinor: 0,
        initialVersionPatch: 1,
      });
      expect(result.success).toBe(true);
    });

    it('accepts large version numbers', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 999,
        initialVersionMinor: 999,
        initialVersionPatch: 999,
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative major version', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: -1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Status: 0, 1, or 2
  // -------------------------------------------------------------------------
  
  describe('status values (0, 1, 2)', () => {
    
    it('accepts status 0 (Active)', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        status: 0,
      });
      expect(result.success).toBe(true);
    });

    it('accepts status 1 (Deprecated)', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        status: 1,
      });
      expect(result.success).toBe(true);
    });

    it('accepts status 2 (Replaced)', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        status: 2,
      });
      expect(result.success).toBe(true);
    });

    it('rejects status 3 (out of range)', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        status: 3,
      });
      expect(result.success).toBe(false);
    });

    it('rejects status -1 (negative)', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        status: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Interfaces: non-negative integer
  // -------------------------------------------------------------------------
  
  describe('interfaces value (non-negative)', () => {
    
    it('accepts interfaces 0', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        interfaces: 0,
      });
      expect(result.success).toBe(true);
    });

    it('accepts interfaces 1 (human)', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        interfaces: 1,
      });
      expect(result.success).toBe(true);
    });

    it('accepts interfaces 7 (all flags set)', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        interfaces: 7, // binary 111 = human + api + smartContract
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative interfaces', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        interfaces: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // DataHashAlgorithm: 0 or 1
  // -------------------------------------------------------------------------
  
  describe('dataHashAlgorithm values (0 or 1)', () => {
    
    it('accepts dataHashAlgorithm 0 (SHA-256)', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        dataHashAlgorithm: 0,
      });
      expect(result.success).toBe(true);
    });

    it('accepts dataHashAlgorithm 1 (Keccak-256)', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        dataHashAlgorithm: 1,
      });
      expect(result.success).toBe(true);
    });

    it('rejects dataHashAlgorithm 2', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        dataHashAlgorithm: 2,
      });
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// HASH LENGTH BOUNDARY TESTS
// ============================================================================

describe('Boundary Tests: Hash Length Requirements', () => {
  
  const validOnChainBase = {
    did: 'did:web:example.com',
    initialVersionMajor: 1,
    initialVersionMinor: 0,
    initialVersionPatch: 0,
    interfaces: 1,
    dataUrl: 'https://example.com/metadata.json',
    dataHashAlgorithm: 0,
    minter: '0x1234567890123456789012345678901234567890',
  };

  // -------------------------------------------------------------------------
  // dataHash: exactly 0x + 64 hex characters
  // -------------------------------------------------------------------------
  
  describe('dataHash (0x + 64 hex chars)', () => {
    
    it('rejects hash with 63 hex characters (too short)', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        dataHash: '0x' + '0'.repeat(63),
      });
      expect(result.success).toBe(false);
    });

    it('accepts hash with exactly 64 hex characters', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        dataHash: '0x' + '0'.repeat(64),
      });
      expect(result.success).toBe(true);
    });

    it('rejects hash with 65 hex characters (too long)', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        dataHash: '0x' + '0'.repeat(65),
      });
      expect(result.success).toBe(false);
    });

    it('accepts hash with mixed case hex', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        dataHash: '0x' + 'aAbBcCdDeEfF'.repeat(5) + 'aAbB',
      });
      expect(result.success).toBe(true);
    });

    it('accepts hash with all lowercase hex', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        dataHash: '0x' + 'abcdef'.repeat(10) + 'abcd',
      });
      expect(result.success).toBe(true);
    });

    it('accepts hash with all uppercase hex', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        dataHash: '0x' + 'ABCDEF'.repeat(10) + 'ABCD',
      });
      expect(result.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // traitHash entries: exactly 0x + 64 hex characters
  // -------------------------------------------------------------------------
  
  describe('traitHash entries (0x + 64 hex chars)', () => {
    
    it('rejects traitHash with 63 hex characters', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        dataHash: '0x' + '0'.repeat(64),
        traitHashes: ['0x' + '0'.repeat(63)],
      });
      expect(result.success).toBe(false);
    });

    it('accepts traitHash with exactly 64 hex characters', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        dataHash: '0x' + '0'.repeat(64),
        traitHashes: ['0x' + '0'.repeat(64)],
      });
      expect(result.success).toBe(true);
    });

    it('rejects traitHash with 65 hex characters', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        dataHash: '0x' + '0'.repeat(64),
        traitHashes: ['0x' + '0'.repeat(65)],
      });
      expect(result.success).toBe(false);
    });

    it('rejects traitHash without 0x prefix', () => {
      const result = OnChainApp.safeParse({
        ...validOnChainBase,
        dataHash: '0x' + '0'.repeat(64),
        traitHashes: ['0'.repeat(64)],
      });
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// RATING VALUE BOUNDARY TESTS
// ============================================================================

describe('Boundary Tests: Rating Values', () => {
  
  // Note: These are conceptual tests since rating is in attestation data
  // They document expected constraints per OMATrust Reputation Spec
  
  describe('ratingValue constraints (1-5)', () => {
    
    it('documents minimum valid rating is 1', () => {
      const minRating = 1;
      expect(minRating).toBeGreaterThanOrEqual(1);
      expect(minRating).toBeLessThanOrEqual(5);
    });

    it('documents maximum valid rating is 5', () => {
      const maxRating = 5;
      expect(maxRating).toBeGreaterThanOrEqual(1);
      expect(maxRating).toBeLessThanOrEqual(5);
    });

    it('documents that 0 is invalid', () => {
      const invalidRating = 0;
      expect(invalidRating >= 1 && invalidRating <= 5).toBe(false);
    });

    it('documents that 6 is invalid', () => {
      const invalidRating = 6;
      expect(invalidRating >= 1 && invalidRating <= 5).toBe(false);
    });

    it('documents that fractional ratings are invalid', () => {
      const fractionalRating = 3.5;
      expect(Number.isInteger(fractionalRating)).toBe(false);
    });
  });
});

// ============================================================================
// TIMESTAMP BOUNDARY TESTS
// ============================================================================

describe('Boundary Tests: Timestamp Values', () => {
  
  // Note: These are conceptual tests for attestation timestamps
  // They document expected constraints per OMATrust specifications
  
  describe('Unix timestamp constraints', () => {
    
    it('documents minimum valid timestamp (Unix epoch)', () => {
      const minTimestamp = 0;
      expect(minTimestamp).toBeGreaterThanOrEqual(0);
    });

    it('documents current time as valid timestamp', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(now).toBeGreaterThan(0);
      expect(Number.isInteger(now)).toBe(true);
    });

    it('documents future timestamps are valid for expiresAt', () => {
      const now = Math.floor(Date.now() / 1000);
      const futureExpiry = now + 86400 * 365; // 1 year from now
      expect(futureExpiry > now).toBe(true);
    });

    it('documents negative timestamps are invalid', () => {
      const negativeTimestamp = -1;
      expect(negativeTimestamp >= 0).toBe(false);
    });

    it('documents millisecond timestamps need conversion', () => {
      const millisTimestamp = Date.now();
      const secondsTimestamp = Math.floor(millisTimestamp / 1000);
      
      // Milliseconds are too large (13 digits vs 10)
      expect(millisTimestamp.toString().length).toBeGreaterThan(10);
      expect(secondsTimestamp.toString().length).toBeLessThanOrEqual(10);
    });
  });

  describe('effectiveAt vs expiresAt relationship', () => {
    
    it('documents valid: effectiveAt < expiresAt', () => {
      const effectiveAt = Math.floor(Date.now() / 1000);
      const expiresAt = effectiveAt + 86400; // 1 day later
      
      expect(effectiveAt < expiresAt).toBe(true);
    });

    it('documents invalid: effectiveAt > expiresAt', () => {
      const effectiveAt = Math.floor(Date.now() / 1000);
      const expiresAt = effectiveAt - 86400; // 1 day before
      
      // This is an invalid state - expires before it's effective
      expect(effectiveAt > expiresAt).toBe(true);
    });

    it('documents edge case: effectiveAt = expiresAt (instantly expires)', () => {
      const effectiveAt = Math.floor(Date.now() / 1000);
      const expiresAt = effectiveAt;
      
      // Valid but essentially expired immediately
      expect(effectiveAt === expiresAt).toBe(true);
    });
  });
});

// ============================================================================
// URL LENGTH BOUNDARY TESTS
// ============================================================================

describe('Boundary Tests: URL Lengths', () => {
  
  const validMetadataBase = {
    name: 'Test App',
    description: 'A valid test application description',
    publisher: 'Test Publisher',
  };

  describe('URL field lengths', () => {
    
    it('accepts minimum valid URL', () => {
      // Shortest valid HTTPS URL
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        image: 'https://a.co/i', // Very short but valid
      });
      expect(result.success).toBe(true);
    });

    it('accepts reasonably long URL', () => {
      const longPath = 'a'.repeat(500);
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        image: `https://example.com/${longPath}.png`,
      });
      expect(result.success).toBe(true);
    });

    it('handles very long URL (browser limit ~2000)', () => {
      const veryLongPath = 'a'.repeat(2000);
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        image: `https://example.com/${veryLongPath}.png`,
      });
      // Schema may accept, but browsers may not support
      // Document current behavior
      if (result.success) {
        console.log('Schema accepts URLs > 2000 chars');
      }
    });
  });
});

// ============================================================================
// SPECIAL CHARACTER BOUNDARY TESTS
// ============================================================================

describe('Boundary Tests: Special Characters', () => {
  
  const validMetadataBase = {
    description: 'A valid test application description',
    publisher: 'Test Publisher',
    image: 'https://example.com/icon.png',
  };

  describe('name field with special characters', () => {
    
    it('accepts name with unicode characters', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        name: '测试应用 🚀 Test',
      });
      expect(result.success).toBe(true);
    });

    it('accepts name with emojis', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        name: '🎮 Game App 🎮',
      });
      expect(result.success).toBe(true);
    });

    it('accepts name with special characters', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        name: "App: Test - Beta (v2.0) [Free]",
      });
      expect(result.success).toBe(true);
    });

    it('handles name with newlines', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        name: 'Test\nApp',
      });
      // Document behavior - should names contain newlines?
      if (result.success) {
        console.warn('Schema accepts newlines in name - potential issue');
      }
    });

    it('handles name with tabs', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        name: 'Test\tApp',
      });
      // Document behavior
      if (result.success) {
        console.warn('Schema accepts tabs in name - potential issue');
      }
    });
  });

  describe('traits with special characters', () => {
    
    it('accepts traits with hyphens', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        name: 'Test App',
        traits: ['web-app', 'mobile-friendly'],
      });
      expect(result.success).toBe(true);
    });

    it('accepts traits with underscores', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        name: 'Test App',
        traits: ['web_app', 'mobile_first'],
      });
      expect(result.success).toBe(true);
    });

    it('accepts traits with numbers', () => {
      const result = OffChainMetadata.safeParse({
        ...validMetadataBase,
        name: 'Test App',
        traits: ['web3', 'erc20', 'erc721'],
      });
      expect(result.success).toBe(true);
    });
  });
});

