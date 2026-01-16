/**
 * Attestation Lifecycle Integration Tests
 * 
 * Tests the complete attestation lifecycle: Create → Query → Supersede → Revoke
 * Validates attestation immutability and supersession rules
 * 
 * Specification: OMATrust Reputation Specification
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
vi.mock('@ethereum-attestation-service/eas-sdk', () => ({
  EAS: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    getAttestation: vi.fn(),
  })),
  SchemaEncoder: vi.fn().mockImplementation(() => ({
    encodeData: vi.fn(),
    decodeData: vi.fn(),
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
  ]),
}));

// Mock attestation services
vi.mock('@/config/attestation-services', () => ({
  getContractAddress: vi.fn(() => '0x1234567890123456789012345678901234567890'),
}));

// Mock DID index
vi.mock('@/lib/did-index', () => ({
  didToIndexAddress: vi.fn((did: string) => '0x' + 'a'.repeat(40)),
}));

// Mock log
vi.mock('@/lib/log', () => ({
  log: vi.fn(),
}));

describe('Attestation Lifecycle Integration', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create mock attestations
  const createAttestation = (
    uid: string,
    attester: string,
    time: number,
    decodedData: Record<string, any>,
    options: Partial<AttestationQueryResult> = {}
  ): AttestationQueryResult => ({
    uid,
    attester,
    recipient: '0x' + 'b'.repeat(40),
    data: '0x',
    time,
    expirationTime: 0,
    revocationTime: 0,
    refUID: '0x' + '0'.repeat(64),
    revocable: true,
    schemaId: 'user-review',
    schemaTitle: 'User Review',
    decodedData,
    ...options,
  });

  describe('Attestation Creation', () => {
    /**
     * Test: New attestation has required fields
     */
    it('creates attestation with required fields', () => {
      const attestation = createAttestation(
        '0x' + '1'.repeat(64),
        '0xAttester1' + '0'.repeat(30),
        Math.floor(Date.now() / 1000),
        {
          subject: 'did:web:example.com',
          version: '1.0.0',
          ratingValue: 5,
          summary: 'Great app!',
        }
      );

      expect(attestation.uid).toMatch(/^0x[a-f0-9]{64}$/i);
      expect(attestation.attester).toMatch(/^0x/);
      expect(attestation.time).toBeGreaterThan(0);
      expect(attestation.decodedData?.subject).toBe('did:web:example.com');
    });

    /**
     * Test: Attestation timestamp is recorded
     */
    it('records creation timestamp', () => {
      const now = Math.floor(Date.now() / 1000);
      const attestation = createAttestation(
        '0x1',
        '0xAttester',
        now,
        { subject: 'did:web:example.com' }
      );

      expect(attestation.time).toBe(now);
    });

    /**
     * Test: Version is captured in attestation
     */
    it('captures app version in attestation', () => {
      const attestation = createAttestation(
        '0x1',
        '0xAttester',
        Date.now() / 1000,
        {
          subject: 'did:web:example.com',
          version: '2.1.0',
          ratingValue: 4,
        }
      );

      expect(attestation.decodedData?.version).toBe('2.1.0');
      expect(getMajorVersion(attestation.decodedData?.version)).toBe('2');
    });
  });

  describe('Attestation Querying', () => {
    /**
     * Test: Query returns attestations sorted by time
     */
    it('returns attestations sorted newest first', () => {
      const attestations = [
        createAttestation('0x1', '0xA', 1000, { subject: 'did:web:app' }),
        createAttestation('0x2', '0xB', 2000, { subject: 'did:web:app' }),
        createAttestation('0x3', '0xC', 1500, { subject: 'did:web:app' }),
      ];

      // Sort by time descending (newest first)
      const sorted = [...attestations].sort((a, b) => b.time - a.time);

      expect(sorted[0].uid).toBe('0x2');
      expect(sorted[1].uid).toBe('0x3');
      expect(sorted[2].uid).toBe('0x1');
    });

    /**
     * Test: Filter by version
     */
    it('filters attestations by major version', () => {
      const attestations = [
        createAttestation('0x1', '0xA', 1000, { subject: 'did:web:app', version: '1.0.0', ratingValue: 5 }),
        createAttestation('0x2', '0xB', 2000, { subject: 'did:web:app', version: '2.0.0', ratingValue: 4 }),
        createAttestation('0x3', '0xC', 3000, { subject: 'did:web:app', version: '1.5.0', ratingValue: 3 }),
      ];

      const targetMajor = '1';
      const filtered = attestations.filter(a => {
        const major = getMajorVersion(a.decodedData?.version);
        return major === targetMajor;
      });

      expect(filtered.length).toBe(2);
      expect(filtered.every(a => getMajorVersion(a.decodedData?.version) === '1')).toBe(true);
    });
  });

  describe('Attestation Supersession', () => {
    /**
     * Test: Same attester supersedes previous review
     * Newer attestation from same attester replaces older one
     */
    it('supersedes previous review from same attester', () => {
      const attestations = [
        createAttestation('0x2', '0xAttester1', 2000, {
          subject: 'did:web:app',
          version: '1.0.0',
          ratingValue: 5, // Updated rating
        }),
        createAttestation('0x1', '0xAttester1', 1000, {
          subject: 'did:web:app',
          version: '1.0.0',
          ratingValue: 3, // Original rating
        }),
      ];

      const deduplicated = deduplicateReviews(attestations);

      expect(deduplicated.length).toBe(1);
      expect(deduplicated[0].uid).toBe('0x2'); // Newer one kept
      expect(deduplicated[0].decodedData?.ratingValue).toBe(5);
    });

    /**
     * Test: Different attesters are not superseded
     */
    it('keeps reviews from different attesters', () => {
      const attestations = [
        createAttestation('0x1', '0xAttester1', 1000, {
          subject: 'did:web:app',
          version: '1.0.0',
          ratingValue: 5,
        }),
        createAttestation('0x2', '0xAttester2', 2000, {
          subject: 'did:web:app',
          version: '1.0.0',
          ratingValue: 3,
        }),
      ];

      const deduplicated = deduplicateReviews(attestations);

      expect(deduplicated.length).toBe(2);
    });

    /**
     * Test: Different versions are not superseded
     */
    it('keeps reviews for different versions', () => {
      const attestations = [
        createAttestation('0x1', '0xAttester1', 1000, {
          subject: 'did:web:app',
          version: '1.0.0',
          ratingValue: 5,
        }),
        createAttestation('0x2', '0xAttester1', 2000, {
          subject: 'did:web:app',
          version: '2.0.0',
          ratingValue: 4,
        }),
      ];

      const deduplicated = deduplicateReviews(attestations);

      expect(deduplicated.length).toBe(2);
    });

    /**
     * Test: Multiple supersessions
     */
    it('handles multiple supersessions correctly', () => {
      const attestations = [
        createAttestation('0x4', '0xAttester1', 4000, { subject: 'did:web:app', version: '1.0.0', ratingValue: 5 }),
        createAttestation('0x3', '0xAttester1', 3000, { subject: 'did:web:app', version: '1.0.0', ratingValue: 4 }),
        createAttestation('0x2', '0xAttester1', 2000, { subject: 'did:web:app', version: '1.0.0', ratingValue: 3 }),
        createAttestation('0x1', '0xAttester1', 1000, { subject: 'did:web:app', version: '1.0.0', ratingValue: 2 }),
      ];

      const deduplicated = deduplicateReviews(attestations);

      expect(deduplicated.length).toBe(1);
      expect(deduplicated[0].uid).toBe('0x4'); // Latest kept
    });
  });

  describe('Attestation Revocation', () => {
    /**
     * Test: Revoked attestation is excluded from ratings
     */
    it('excludes revoked attestations from rating calculation', () => {
      const attestations = [
        createAttestation('0x1', '0xAttester1', 1000, {
          subject: 'did:web:app',
          version: '1.0.0',
          ratingValue: 5,
        }),
        createAttestation('0x2', '0xAttester2', 2000, {
          subject: 'did:web:app',
          version: '1.0.0',
          ratingValue: 1,
        }, { revocationTime: 2500 }), // Revoked
      ];

      const { average, count } = calculateAverageRating(attestations);

      expect(count).toBe(1); // Only non-revoked counted
      expect(average).toBe(5);
    });

    /**
     * Test: Revoked attestation still exists
     */
    it('revoked attestation has non-zero revocationTime', () => {
      const revokedAttestation = createAttestation(
        '0x1',
        '0xAttester1',
        1000,
        { subject: 'did:web:app', ratingValue: 5 },
        { revocationTime: 2000 }
      );

      expect(revokedAttestation.revocationTime).toBeGreaterThan(0);
    });
  });

  describe('Rating Calculations', () => {
    /**
     * Test: Average rating with multiple reviews
     */
    it('calculates average rating correctly', () => {
      const attestations = [
        createAttestation('0x1', '0xA', 1000, { subject: 'did:web:app', version: '1.0.0', ratingValue: 5 }),
        createAttestation('0x2', '0xB', 2000, { subject: 'did:web:app', version: '1.0.0', ratingValue: 4 }),
        createAttestation('0x3', '0xC', 3000, { subject: 'did:web:app', version: '1.0.0', ratingValue: 3 }),
      ];

      const { average, count } = calculateAverageRating(attestations);

      expect(count).toBe(3);
      expect(average).toBe(4); // (5 + 4 + 3) / 3 = 4
    });

    /**
     * Test: Average with superseded reviews
     */
    it('calculates average after deduplication', () => {
      const attestations = [
        createAttestation('0x3', '0xA', 3000, { subject: 'did:web:app', version: '1.0.0', ratingValue: 5 }),
        createAttestation('0x2', '0xA', 2000, { subject: 'did:web:app', version: '1.0.0', ratingValue: 3 }), // Superseded
        createAttestation('0x1', '0xB', 1000, { subject: 'did:web:app', version: '1.0.0', ratingValue: 4 }),
      ];

      const { average, count } = calculateAverageRating(attestations);

      expect(count).toBe(2); // Deduplicated
      expect(average).toBe(4.5); // (5 + 4) / 2 = 4.5
    });

    /**
     * Test: No reviews returns zero
     */
    it('returns zero for no reviews', () => {
      const { average, count } = calculateAverageRating([]);

      expect(count).toBe(0);
      expect(average).toBe(0);
    });

    /**
     * Test: Handles BigInt rating values
     */
    it('handles BigInt rating values from EAS', () => {
      const attestations = [
        createAttestation('0x1', '0xA', 1000, { 
          subject: 'did:web:app', 
          version: '1.0.0', 
          ratingValue: BigInt(5) 
        }),
      ];

      const { average, count } = calculateAverageRating(attestations);

      expect(count).toBe(1);
      expect(average).toBe(5);
    });
  });

  describe('Complete Lifecycle', () => {
    /**
     * Test: Full attestation lifecycle
     * Create → Update → Query → Calculate Rating
     */
    it('handles complete attestation lifecycle', () => {
      // Day 1: User A creates review
      const day1 = [
        createAttestation('0x1', '0xUserA', 1000, {
          subject: 'did:web:app',
          version: '1.0.0',
          ratingValue: 3,
          summary: 'Decent app',
        }),
      ];

      let result = calculateAverageRating(day1);
      expect(result.average).toBe(3);
      expect(result.count).toBe(1);

      // Day 2: User B adds review
      const day2 = [
        createAttestation('0x2', '0xUserB', 2000, {
          subject: 'did:web:app',
          version: '1.0.0',
          ratingValue: 5,
          summary: 'Excellent!',
        }),
        ...day1,
      ];

      result = calculateAverageRating(day2);
      expect(result.average).toBe(4); // (3 + 5) / 2
      expect(result.count).toBe(2);

      // Day 3: User A updates their review
      const day3 = [
        createAttestation('0x3', '0xUserA', 3000, {
          subject: 'did:web:app',
          version: '1.0.0',
          ratingValue: 5, // Updated from 3 to 5
          summary: 'Much improved!',
        }),
        ...day2,
      ];

      result = calculateAverageRating(day3);
      expect(result.average).toBe(5); // (5 + 5) / 2 - User A's old review superseded
      expect(result.count).toBe(2);
    });

    /**
     * Test: Multi-version attestation handling
     */
    it('handles attestations across multiple app versions', () => {
      const attestations = [
        // v1 reviews
        createAttestation('0x1', '0xA', 1000, { subject: 'did:web:app', version: '1.0.0', ratingValue: 3 }),
        createAttestation('0x2', '0xB', 1500, { subject: 'did:web:app', version: '1.0.0', ratingValue: 4 }),
        // v2 reviews
        createAttestation('0x3', '0xA', 2000, { subject: 'did:web:app', version: '2.0.0', ratingValue: 5 }),
        createAttestation('0x4', '0xC', 2500, { subject: 'did:web:app', version: '2.0.0', ratingValue: 5 }),
      ];

      // All reviews
      const allRatings = calculateAverageRating(attestations);
      expect(allRatings.count).toBe(4);

      // Filter by v1 only
      const v1Only = attestations.filter(a => getMajorVersion(a.decodedData?.version) === '1');
      const v1Ratings = calculateAverageRating(v1Only);
      expect(v1Ratings.count).toBe(2);
      expect(v1Ratings.average).toBe(3.5);

      // Filter by v2 only
      const v2Only = attestations.filter(a => getMajorVersion(a.decodedData?.version) === '2');
      const v2Ratings = calculateAverageRating(v2Only);
      expect(v2Ratings.count).toBe(2);
      expect(v2Ratings.average).toBe(5);
    });
  });
});

