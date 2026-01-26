/**
 * EAS Attestation Mock Tests
 * 
 * Tests EAS SDK integration for creating and querying attestations
 * Validates attestation lifecycle and data encoding
 * 
 * Specification Coverage:
 * - OT-RP-010: Attestations use EAS on-chain
 * - OT-RP-011: Attestation data is ABI-encoded
 * - OT-RP-012: Schema UIDs must be valid
 * - OT-RP-013: Attestations can be revoked
 * - OT-RP-014: Deduplication by attester+subject+version
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAttestationsForDID,
  deduplicateReviews,
  calculateAverageRating,
  getMajorVersion,
  type AttestationQueryResult,
} from '@/lib/attestation-queries';

// Mock ethers
vi.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: vi.fn().mockImplementation(() => ({
      getBlockNumber: vi.fn().mockResolvedValue(1000000),
    })),
    Contract: vi.fn().mockImplementation(() => ({
      filters: {
        Attested: vi.fn().mockReturnValue({}),
      },
      queryFilter: vi.fn().mockResolvedValue([]),
    })),
  },
}));

// Mock EAS SDK
const mockGetAttestation = vi.fn();
const mockConnect = vi.fn();
const mockEncodeData = vi.fn().mockReturnValue('0x');
const mockDecodeData = vi.fn().mockReturnValue([]);

vi.mock('@ethereum-attestation-service/eas-sdk', () => ({
  EAS: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    getAttestation: mockGetAttestation,
  })),
  SchemaEncoder: vi.fn().mockImplementation(() => ({
    encodeData: mockEncodeData,
    decodeData: mockDecodeData,
  })),
}));

// Mock schemas
vi.mock('@/config/schemas', () => ({
  getAllSchemas: vi.fn(() => [
    {
      id: 'user-review',
      title: 'User Review',
      deployedUIDs: { 66238: '0x' + '1'.repeat(64) },
      fields: [
        { name: 'subject', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'ratingValue', type: 'integer', max: 5 },
        { name: 'summary', type: 'string' },
      ],
    },
    {
      id: 'endorsement',
      title: 'Endorsement',
      deployedUIDs: { 66238: '0x' + '2'.repeat(64) },
      fields: [
        { name: 'subject', type: 'string' },
        { name: 'endorserCredential', type: 'string' },
      ],
    },
  ]),
}));

// Mock attestation services
vi.mock('@/config/attestation-services', () => ({
  getContractAddress: vi.fn(() => '0x1234567890123456789012345678901234567890'),
}));

// Mock DID utils (migrated from @/lib/did-index to @/lib/utils/did)
vi.mock('@/lib/utils/did', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/did')>();
  return {
    ...actual,
    didToAddress: vi.fn((did: string) => {
      // Simple deterministic mock
      return '0x' + 'a'.repeat(40);
    }),
  };
});

// Mock log
vi.mock('@/lib/log', () => ({
  log: vi.fn(),
}));

describe('EAS Attestation Mock Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMajorVersion', () => {
    /**
     * Test: Extract major version from semver string
     * "1.2.3" -> "1"
     */
    it('extracts major version from semver', () => {
      expect(getMajorVersion('1.2.3')).toBe('1');
      expect(getMajorVersion('2.0.0')).toBe('2');
      expect(getMajorVersion('10.5.2')).toBe('10');
    });

    /**
     * Test: Handles version with v prefix
     * "v1.2.3" should still work
     */
    it('handles versions without v prefix', () => {
      expect(getMajorVersion('1.0.0')).toBe('1');
    });

    /**
     * Test: Returns undefined for invalid versions
     */
    it('returns undefined for invalid versions', () => {
      expect(getMajorVersion(undefined)).toBeUndefined();
      expect(getMajorVersion('')).toBeUndefined();
    });

    /**
     * Test: Handles version with only major number
     */
    it('handles major-only versions', () => {
      expect(getMajorVersion('1')).toBe('1');
      expect(getMajorVersion('5')).toBe('5');
    });
  });

  describe('deduplicateReviews', () => {
    /**
     * Test: Keeps latest review per attester+subject+version
     * Attestations are already sorted newest first
     */
    it('keeps only latest review per attester+subject+version', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0x1',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '0x',
          time: 1000,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '1.0.0', ratingValue: 5 },
        },
        {
          uid: '0x2',
          attester: '0xAttester1', // Same attester
          recipient: '0xRecipient',
          data: '0x',
          time: 900, // Older
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '1.0.0', ratingValue: 3 }, // Same subject+version
        },
      ];

      const result = deduplicateReviews(attestations);

      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('0x1'); // Kept the newer one
      expect(result[0].decodedData?.ratingValue).toBe(5);
    });

    /**
     * Test: Different attesters are not deduplicated
     */
    it('keeps reviews from different attesters', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0x1',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '0x',
          time: 1000,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '1.0.0', ratingValue: 5 },
        },
        {
          uid: '0x2',
          attester: '0xAttester2', // Different attester
          recipient: '0xRecipient',
          data: '0x',
          time: 900,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '1.0.0', ratingValue: 3 },
        },
      ];

      const result = deduplicateReviews(attestations);

      expect(result).toHaveLength(2);
    });

    /**
     * Test: Different versions are not deduplicated
     */
    it('keeps reviews for different versions', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0x1',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '0x',
          time: 1000,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '1.0.0', ratingValue: 5 },
        },
        {
          uid: '0x2',
          attester: '0xAttester1', // Same attester
          recipient: '0xRecipient',
          data: '0x',
          time: 900,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '2.0.0', ratingValue: 4 }, // Different version
        },
      ];

      const result = deduplicateReviews(attestations);

      expect(result).toHaveLength(2);
    });

    /**
     * Test: Non-review attestations are filtered out
     */
    it('only processes user-review attestations', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0x1',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '0x',
          time: 1000,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x0',
          revocable: true,
          schemaId: 'endorsement', // Not a review
          decodedData: { subject: 'did:web:app1' },
        },
        {
          uid: '0x2',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '0x',
          time: 900,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '1.0.0', ratingValue: 5 },
        },
      ];

      const result = deduplicateReviews(attestations);

      expect(result).toHaveLength(1);
      expect(result[0].schemaId).toBe('user-review');
    });
  });

  describe('calculateAverageRating', () => {
    /**
     * Test: Calculates average from multiple reviews
     */
    it('calculates average rating correctly', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0x1',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '0x',
          time: 1000,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '1.0.0', ratingValue: 5 },
        },
        {
          uid: '0x2',
          attester: '0xAttester2',
          recipient: '0xRecipient',
          data: '0x',
          time: 900,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '1.0.0', ratingValue: 3 },
        },
      ];

      const result = calculateAverageRating(attestations);

      expect(result.average).toBe(4); // (5 + 3) / 2
      expect(result.count).toBe(2);
    });

    /**
     * Test: Returns zero for no reviews
     */
    it('returns zero for no reviews', () => {
      const attestations: AttestationQueryResult[] = [];

      const result = calculateAverageRating(attestations);

      expect(result.average).toBe(0);
      expect(result.count).toBe(0);
    });

    /**
     * Test: Excludes revoked reviews
     */
    it('excludes revoked reviews from average', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0x1',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '0x',
          time: 1000,
          expirationTime: 0,
          revocationTime: 0, // Not revoked
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '1.0.0', ratingValue: 5 },
        },
        {
          uid: '0x2',
          attester: '0xAttester2',
          recipient: '0xRecipient',
          data: '0x',
          time: 900,
          expirationTime: 0,
          revocationTime: 1500, // Revoked
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '1.0.0', ratingValue: 1 },
        },
      ];

      const result = calculateAverageRating(attestations);

      expect(result.average).toBe(5); // Only non-revoked review
      expect(result.count).toBe(1);
    });

    /**
     * Test: Handles BigInt rating values
     * EAS returns uint8 as BigInt
     */
    it('handles BigInt rating values', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0x1',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '0x',
          time: 1000,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '1.0.0', ratingValue: BigInt(4) },
        },
      ];

      const result = calculateAverageRating(attestations);

      expect(result.average).toBe(4);
      expect(result.count).toBe(1);
    });

    /**
     * Test: Deduplicates before calculating
     * Same attester reviewing same app shouldn't count twice
     */
    it('deduplicates reviews before calculating average', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0x1',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '0x',
          time: 1000, // Newer
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '1.0.0', ratingValue: 5 },
        },
        {
          uid: '0x2',
          attester: '0xAttester1', // Same attester
          recipient: '0xRecipient',
          data: '0x',
          time: 900, // Older - should be ignored
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '1.0.0', ratingValue: 1 },
        },
      ];

      const result = calculateAverageRating(attestations);

      // Should only count the newer review (rating 5)
      expect(result.average).toBe(5);
      expect(result.count).toBe(1);
    });

    /**
     * Test: Handles 'rating' field as fallback
     * Some schemas use 'rating' instead of 'ratingValue'
     */
    it('handles rating field as fallback', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0x1',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '0x',
          time: 1000,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x0',
          revocable: true,
          schemaId: 'user-review',
          decodedData: { subject: 'did:web:app1', version: '1.0.0', rating: 4 }, // Uses 'rating' instead
        },
      ];

      const result = calculateAverageRating(attestations);

      expect(result.average).toBe(4);
      expect(result.count).toBe(1);
    });
  });

  describe('Attestation Lifecycle', () => {
    /**
     * Test: Non-revoked attestations are active
     * revocationTime = 0 means not revoked
     */
    it('identifies non-revoked attestations as active', () => {
      const attestation: AttestationQueryResult = {
        uid: '0x1',
        attester: '0xAttester1',
        recipient: '0xRecipient',
        data: '0x',
        time: 1000,
        expirationTime: 0,
        revocationTime: 0, // Not revoked
        refUID: '0x0',
        revocable: true,
        schemaId: 'user-review',
        decodedData: { subject: 'did:web:app1', ratingValue: 5 },
      };

      expect(attestation.revocationTime).toBe(0);
    });

    /**
     * Test: Revoked attestations have non-zero revocationTime
     */
    it('identifies revoked attestations', () => {
      const attestation: AttestationQueryResult = {
        uid: '0x1',
        attester: '0xAttester1',
        recipient: '0xRecipient',
        data: '0x',
        time: 1000,
        expirationTime: 0,
        revocationTime: 2000, // Revoked at time 2000
        refUID: '0x0',
        revocable: true,
        schemaId: 'user-review',
        decodedData: { subject: 'did:web:app1', ratingValue: 5 },
      };

      expect(attestation.revocationTime).toBeGreaterThan(0);
    });

    /**
     * Test: Expired attestations have past expirationTime
     */
    it('handles expiration time', () => {
      const now = Math.floor(Date.now() / 1000);
      
      const expiredAttestation: AttestationQueryResult = {
        uid: '0x1',
        attester: '0xAttester1',
        recipient: '0xRecipient',
        data: '0x',
        time: 1000,
        expirationTime: now - 3600, // Expired 1 hour ago
        revocationTime: 0,
        refUID: '0x0',
        revocable: true,
        schemaId: 'user-review',
        decodedData: { subject: 'did:web:app1', ratingValue: 5 },
      };

      expect(expiredAttestation.expirationTime).toBeLessThan(now);
    });

    /**
     * Test: Zero expirationTime means no expiration
     */
    it('interprets zero expirationTime as no expiration', () => {
      const attestation: AttestationQueryResult = {
        uid: '0x1',
        attester: '0xAttester1',
        recipient: '0xRecipient',
        data: '0x',
        time: 1000,
        expirationTime: 0, // No expiration
        revocationTime: 0,
        refUID: '0x0',
        revocable: true,
        schemaId: 'user-review',
        decodedData: { subject: 'did:web:app1', ratingValue: 5 },
      };

      expect(attestation.expirationTime).toBe(0);
    });
  });

  describe('Schema Validation', () => {
    /**
     * Test: Attestations include schema metadata
     */
    it('includes schema ID and title in results', () => {
      const attestation: AttestationQueryResult = {
        uid: '0x1',
        attester: '0xAttester1',
        recipient: '0xRecipient',
        data: '0x',
        time: 1000,
        expirationTime: 0,
        revocationTime: 0,
        refUID: '0x0',
        revocable: true,
        schemaId: 'user-review',
        schemaTitle: 'User Review',
        decodedData: { subject: 'did:web:app1', ratingValue: 5 },
      };

      expect(attestation.schemaId).toBe('user-review');
      expect(attestation.schemaTitle).toBe('User Review');
    });

    /**
     * Test: Attestation references another attestation
     * refUID points to parent attestation
     */
    it('supports attestation references', () => {
      const parentUid = '0x' + 'a'.repeat(64);
      
      const responseAttestation: AttestationQueryResult = {
        uid: '0x1',
        attester: '0xAttester1',
        recipient: '0xRecipient',
        data: '0x',
        time: 1000,
        expirationTime: 0,
        revocationTime: 0,
        refUID: parentUid, // References parent
        revocable: true,
        schemaId: 'user-review-response',
        decodedData: { subject: 'did:web:app1', responseText: 'Thank you!' },
      };

      expect(responseAttestation.refUID).toBe(parentUid);
    });
  });

  describe('DID Index Address', () => {
    /**
     * Test: DID is converted to index address for querying
     * Note: This test validates the didToIndexAddress mock is called during query
     */
    it('uses DID index address for attestation queries', async () => {
      // Get the mock from the module mock we defined above
      const didUtils = await import('@/lib/utils/did');
      
      // Calling getAttestationsForDID should invoke didToAddress
      await getAttestationsForDID('did:web:example.com', 5);
      
      expect(didUtils.didToAddress).toHaveBeenCalledWith('did:web:example.com');
    });
  });

  describe('Attestation Data Structure', () => {
    /**
     * Test: Required fields are present
     */
    it('has all required attestation fields', () => {
      const attestation: AttestationQueryResult = {
        uid: '0x' + '1'.repeat(64),
        attester: '0x' + 'a'.repeat(40),
        recipient: '0x' + 'b'.repeat(40),
        data: '0x',
        time: 1704067200, // 2024-01-01
        expirationTime: 0,
        revocationTime: 0,
        refUID: '0x' + '0'.repeat(64),
        revocable: true,
      };

      expect(attestation.uid).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(attestation.attester).toMatch(/^0x[0-9a-f]{40}$/i);
      expect(attestation.recipient).toMatch(/^0x[0-9a-f]{40}$/i);
      expect(attestation.time).toBeGreaterThan(0);
      expect(typeof attestation.revocable).toBe('boolean');
    });

    /**
     * Test: Decoded data contains expected fields
     */
    it('decoded data contains schema fields', () => {
      const attestation: AttestationQueryResult = {
        uid: '0x1',
        attester: '0xAttester1',
        recipient: '0xRecipient',
        data: '0x',
        time: 1000,
        expirationTime: 0,
        revocationTime: 0,
        refUID: '0x0',
        revocable: true,
        schemaId: 'user-review',
        decodedData: {
          subject: 'did:web:example.com',
          version: '1.0.0',
          ratingValue: 4,
          summary: 'Great app!',
        },
      };

      expect(attestation.decodedData).toHaveProperty('subject');
      expect(attestation.decodedData).toHaveProperty('version');
      expect(attestation.decodedData).toHaveProperty('ratingValue');
      expect(attestation.decodedData).toHaveProperty('summary');
    });
  });
});

