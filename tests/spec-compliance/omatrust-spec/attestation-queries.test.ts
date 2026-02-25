/**
 * OMATrust Specification Compliance: Attestation Queries (Proofs Spec)
 * 
 * Tests implementation compliance with OMATrust Proofs Specification
 * for attestation query functions and rating calculations.
 * 
 * SPECIFICATION REFERENCES:
 * - OMATrust Proofs Specification: omatrust-specification-proofs.pdf
 * - Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 * 
 * This test file validates EXTERNAL SPECIFICATIONS, not internal implementation.
 * 
 * KEY REQUIREMENTS:
 * - Query attestations by DID subject
 * - Filter by major version
 * - Deduplicate reviews per attester+subject+version
 * - Exclude revoked attestations from ratings
 */

import { describe, it, expect } from 'vitest';
import {
  getMajorVersion,
  deduplicateReviews,
  calculateAverageRating,
  type AttestationQueryResult,
} from '@/lib/attestation-queries';

describe('OMATrust Proofs Spec: Attestation Query Functions', () => {
  /**
   * Specification: OMATrust Proofs Specification
   * 
   * Tests validate attestation query and deduplication logic.
   */

  describe('Major Version Extraction (OT-PF-091)', () => {
    it('extracts major version from semver string - OT-PF-091', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-091
       * Requirement: "Query SHOULD filter by major version"
       */

      expect(getMajorVersion('1.2.3')).toBe('1');
      expect(getMajorVersion('2.0.0')).toBe('2');
      expect(getMajorVersion('10.5.3')).toBe('10');
      expect(getMajorVersion('0.1.0')).toBe('0');
    });

    it('handles undefined version', () => {
      expect(getMajorVersion(undefined)).toBeUndefined();
    });

    it('handles version with prefix', () => {
      expect(getMajorVersion('v1.2.3')).toBeUndefined();
    });

    it('handles partial versions', () => {
      expect(getMajorVersion('1')).toBe('1');
      expect(getMajorVersion('1.2')).toBe('1');
    });
  });

  describe('Review Deduplication (OT-PF-064, OT-PF-092)', () => {
    it('keeps only latest review per attester+subject+version - OT-PF-064', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-064
       * Requirement: "Latest review per attester+subject+version supersedes previous"
       */

      const reviews: AttestationQueryResult[] = [
        // First (newer) review - should be kept
        createReview({
          uid: 'review-1',
          attester: '0xAttester1',
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          rating: 5,
          time: 1704067200, // Later timestamp
        }),
        // Second (older) review - should be superseded
        createReview({
          uid: 'review-2',
          attester: '0xAttester1',
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          rating: 3,
          time: 1704063600, // Earlier timestamp
        }),
      ];

      const deduplicated = deduplicateReviews(reviews);

      expect(deduplicated.length).toBe(1);
      expect(deduplicated[0].uid).toBe('review-1');
      expect(deduplicated[0].decodedData?.ratingValue).toBe(5);
    });

    it('keeps separate reviews for different versions', () => {
      /**
       * Same attester, same subject, different versions = separate reviews
       */

      const reviews: AttestationQueryResult[] = [
        createReview({
          uid: 'review-v1',
          attester: '0xAttester1',
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          rating: 3,
          time: 1704067200,
        }),
        createReview({
          uid: 'review-v2',
          attester: '0xAttester1',
          subject: 'did:web:app.example.com',
          version: '2.0.0',
          rating: 5,
          time: 1704063600,
        }),
      ];

      const deduplicated = deduplicateReviews(reviews);

      expect(deduplicated.length).toBe(2);
    });

    it('keeps separate reviews for different attesters', () => {
      /**
       * Different attester, same subject, same version = separate reviews
       */

      const reviews: AttestationQueryResult[] = [
        createReview({
          uid: 'review-a1',
          attester: '0xAttester1',
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          rating: 4,
          time: 1704067200,
        }),
        createReview({
          uid: 'review-a2',
          attester: '0xAttester2',
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          rating: 5,
          time: 1704063600,
        }),
      ];

      const deduplicated = deduplicateReviews(reviews);

      expect(deduplicated.length).toBe(2);
    });

    it('handles empty version as distinct key component', () => {
      /**
       * Reviews without version are grouped separately from versioned reviews
       */

      const reviews: AttestationQueryResult[] = [
        createReview({
          uid: 'review-versioned',
          attester: '0xAttester1',
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          rating: 4,
          time: 1704067200,
        }),
        createReview({
          uid: 'review-unversioned',
          attester: '0xAttester1',
          subject: 'did:web:app.example.com',
          version: '',
          rating: 5,
          time: 1704063600,
        }),
      ];

      const deduplicated = deduplicateReviews(reviews);

      expect(deduplicated.length).toBe(2);
    });
  });

  describe('Rating Calculation (OT-PF-093)', () => {
    it('calculates average from non-revoked reviews - OT-PF-093', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-093
       * Requirement: "Average rating MUST exclude revoked attestations"
       */

      const reviews: AttestationQueryResult[] = [
        createReview({
          uid: 'review-1',
          attester: '0xAttester1',
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          rating: 5,
          time: 1704067200,
          revoked: false,
        }),
        createReview({
          uid: 'review-2',
          attester: '0xAttester2',
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          rating: 3,
          time: 1704063600,
          revoked: false,
        }),
      ];

      const result = calculateAverageRating(reviews);

      expect(result.average).toBe(4); // (5 + 3) / 2
      expect(result.count).toBe(2);
    });

    it('excludes revoked attestations from average', () => {
      /**
       * Revoked attestations should not count toward the average
       */

      const reviews: AttestationQueryResult[] = [
        createReview({
          uid: 'review-1',
          attester: '0xAttester1',
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          rating: 5,
          time: 1704067200,
          revoked: false,
        }),
        createReview({
          uid: 'review-revoked',
          attester: '0xAttester2',
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          rating: 1, // Would drag down average
          time: 1704063600,
          revoked: true, // But it's revoked
        }),
      ];

      const result = calculateAverageRating(reviews);

      expect(result.average).toBe(5); // Only the non-revoked review counts
      expect(result.count).toBe(1);
    });

    it('returns zero for empty reviews', () => {
      const result = calculateAverageRating([]);

      expect(result.average).toBe(0);
      expect(result.count).toBe(0);
    });

    it('handles duplicate reviews by deduplicating first', () => {
      /**
       * Duplicate reviews should be deduplicated before calculating average
       */

      const reviews: AttestationQueryResult[] = [
        // Newer review
        createReview({
          uid: 'review-new',
          attester: '0xAttester1',
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          rating: 5,
          time: 1704067200,
          revoked: false,
        }),
        // Older duplicate - should be ignored
        createReview({
          uid: 'review-old',
          attester: '0xAttester1',
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          rating: 1,
          time: 1704000000,
          revoked: false,
        }),
      ];

      const result = calculateAverageRating(reviews);

      // Should only count the latest review (rating 5)
      expect(result.average).toBe(5);
      expect(result.count).toBe(1);
    });

    it('handles bigint rating values', () => {
      /**
       * Rating values may be bigint from blockchain
       */

      const reviews: AttestationQueryResult[] = [
        {
          uid: 'review-1',
          attester: '0xAttester1',
          recipient: '0xRecipient1',
          data: '0x',
          time: 1704067200,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x',
          revocable: true,
          schemaId: 'user-review',
          schemaTitle: 'User Review',
          decodedData: {
            subject: 'did:web:app.example.com',
            version: '1.0.0',
            ratingValue: BigInt(4),
          },
        },
      ];

      const result = calculateAverageRating(reviews);

      expect(result.average).toBe(4);
      expect(result.count).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles reviews with legacy rating field', () => {
      /**
       * Some attestations may use 'rating' instead of 'ratingValue'
       */

      const reviews: AttestationQueryResult[] = [
        {
          uid: 'review-legacy',
          attester: '0xAttester1',
          recipient: '0xRecipient1',
          data: '0x',
          time: 1704067200,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x',
          revocable: true,
          schemaId: 'user-review',
          schemaTitle: 'User Review',
          decodedData: {
            subject: 'did:web:app.example.com',
            version: '1.0.0',
            rating: 4, // Legacy field name
          },
        },
      ];

      const result = calculateAverageRating(reviews);

      expect(result.average).toBe(4);
      expect(result.count).toBe(1);
    });

    it('filters out non-user-review attestations in deduplication', () => {
      /**
       * deduplicateReviews should only process user-review schema
       */

      const attestations: AttestationQueryResult[] = [
        createReview({
          uid: 'review-1',
          attester: '0xAttester1',
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          rating: 5,
          time: 1704067200,
        }),
        // Non-review attestation
        {
          uid: 'endorsement-1',
          attester: '0xAttester1',
          recipient: '0xRecipient1',
          data: '0x',
          time: 1704067200,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x',
          revocable: true,
          schemaId: 'endorsement', // Not a user-review
          schemaTitle: 'Endorsement',
          decodedData: {
            subject: 'did:web:app.example.com',
          },
        },
      ];

      const deduplicated = deduplicateReviews(attestations);

      // Only the review should be in the deduplicated list
      expect(deduplicated.length).toBe(1);
      expect(deduplicated[0].schemaId).toBe('user-review');
    });
  });
});

/**
 * Helper function to create a mock review attestation
 */
function createReview(options: {
  uid: string;
  attester: string;
  subject: string;
  version?: string;
  rating: number;
  time: number;
  revoked?: boolean;
}): AttestationQueryResult {
  return {
    uid: options.uid,
    attester: options.attester,
    recipient: '0xRecipient',
    data: '0x',
    time: options.time,
    expirationTime: 0,
    revocationTime: options.revoked ? 1704067201 : 0,
    refUID: '0x',
    revocable: true,
    schemaId: 'user-review',
    schemaTitle: 'User Review',
    decodedData: {
      subject: options.subject,
      version: options.version || '',
      ratingValue: options.rating,
    },
  };
}

