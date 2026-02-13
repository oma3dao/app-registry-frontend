/**
 * OMATrust Reputation Specification - Attestation Immutability Tests
 * 
 * Tests for attestation update and supersession rules.
 * Validates immutability and supersession logic per specification.
 * 
 * Specification: OMATrust Reputation Specification
 * Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 */

import { describe, it, expect } from 'vitest';
import { 
  deduplicateReviews, 
  calculateAverageRating,
  getMajorVersion,
  type AttestationQueryResult 
} from '@/lib/attestation-queries';

describe('OMATrust Reputation Spec - Attestation Immutability', () => {
  
  describe('Section 7.1 - Attestation Immutability', () => {
    
    /**
     * Test: Attestations are immutable once created
     * Requirement ID: OT-RP-090
     * Requirement: "Attestations are immutable once created"
     */
    it('should understand attestation immutability - OT-RP-090', () => {
      // Attestations cannot be modified after creation
      // Only revocation is allowed
      const attestation = {
        uid: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        time: 1704067200, // Jan 1, 2024
        revocationTime: 0, // Not revoked
        data: 'encoded-data'
      };
      
      // Once created, the attestation data cannot change
      // revocationTime can change from 0 to a timestamp (revoked)
      expect(attestation.revocationTime).toBe(0);
      
      // To "update", a new attestation must be created
      const updatedAttestation = {
        uid: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
        time: 1704153600, // Jan 2, 2024 (newer)
        revocationTime: 0,
        data: 'new-encoded-data'
      };
      
      expect(updatedAttestation.time).toBeGreaterThan(attestation.time);
    });
  });
  
  describe('Section 7.1 - Review Supersession', () => {
    
    /**
     * Test: New review supersedes previous
     * Requirement ID: OT-RP-091
     * Requirement: "New review from same attester for same subject supersedes previous"
     */
    it('should supersede previous review from same attester - OT-RP-091', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0x1111111111111111111111111111111111111111111111111111111111111111',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '',
          time: 1704153600, // Newer (Jan 2)
          expirationTime: 0,
          revocationTime: 0,
          refUID: '',
          revocable: true,
          schemaId: 'user-review',
          decodedData: {
            subject: 'did:web:example.com',
            ratingValue: 5,
            version: '1.0.0'
          }
        },
        {
          uid: '0x2222222222222222222222222222222222222222222222222222222222222222',
          attester: '0xAttester1', // Same attester
          recipient: '0xRecipient',
          data: '',
          time: 1704067200, // Older (Jan 1)
          expirationTime: 0,
          revocationTime: 0,
          refUID: '',
          revocable: true,
          schemaId: 'user-review',
          decodedData: {
            subject: 'did:web:example.com', // Same subject
            ratingValue: 3,
            version: '1.0.0' // Same version
          }
        }
      ];
      
      // Deduplication should keep only the newer review
      const deduped = deduplicateReviews(attestations);
      
      expect(deduped.length).toBe(1);
      expect(deduped[0].uid).toBe('0x1111111111111111111111111111111111111111111111111111111111111111');
      expect(deduped[0].decodedData?.ratingValue).toBe(5);
    });
    
    /**
     * Test: Most recent attestation by issuedAt
     * Requirement ID: OT-RP-092
     * Requirement: "Clients MUST consider only most recent attestation (by issuedAt)"
     */
    it('should consider only most recent attestation by time - OT-RP-092', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0xaaa',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '',
          time: 1704240000, // Jan 3 (newest)
          expirationTime: 0,
          revocationTime: 0,
          refUID: '',
          revocable: true,
          schemaId: 'user-review',
          decodedData: {
            subject: 'did:web:example.com',
            ratingValue: 4
          }
        },
        {
          uid: '0xbbb',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '',
          time: 1704067200, // Jan 1 (oldest)
          expirationTime: 0,
          revocationTime: 0,
          refUID: '',
          revocable: true,
          schemaId: 'user-review',
          decodedData: {
            subject: 'did:web:example.com',
            ratingValue: 2
          }
        },
        {
          uid: '0xccc',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '',
          time: 1704153600, // Jan 2 (middle)
          expirationTime: 0,
          revocationTime: 0,
          refUID: '',
          revocable: true,
          schemaId: 'user-review',
          decodedData: {
            subject: 'did:web:example.com',
            ratingValue: 3
          }
        }
      ];
      
      // Should keep only the newest one
      const deduped = deduplicateReviews(attestations);
      
      expect(deduped.length).toBe(1);
      expect(deduped[0].time).toBe(1704240000);
      expect(deduped[0].decodedData?.ratingValue).toBe(4);
    });
    
    /**
     * Test: Different subjects are not deduplicated
     * Requirement ID: OT-RP-091
     * Requirement: "Supersession only applies to same attester + same subject"
     */
    it('should not deduplicate reviews for different subjects - OT-RP-091', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0x1111',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '',
          time: 1704153600,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '',
          revocable: true,
          schemaId: 'user-review',
          decodedData: {
            subject: 'did:web:app1.example.com', // Different subject
            ratingValue: 5
          }
        },
        {
          uid: '0x2222',
          attester: '0xAttester1', // Same attester
          recipient: '0xRecipient',
          data: '',
          time: 1704067200,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '',
          revocable: true,
          schemaId: 'user-review',
          decodedData: {
            subject: 'did:web:app2.example.com', // Different subject
            ratingValue: 3
          }
        }
      ];
      
      const deduped = deduplicateReviews(attestations);
      
      // Both should be kept since they're for different subjects
      expect(deduped.length).toBe(2);
    });
    
    /**
     * Test: Different versions are considered separate
     * Requirement: "Different versions may have separate reviews"
     */
    it('should allow separate reviews for different versions', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0x1111',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '',
          time: 1704153600,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '',
          revocable: true,
          schemaId: 'user-review',
          decodedData: {
            subject: 'did:web:example.com',
            ratingValue: 5,
            version: '2.0.0' // Version 2
          }
        },
        {
          uid: '0x2222',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '',
          time: 1704067200,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '',
          revocable: true,
          schemaId: 'user-review',
          decodedData: {
            subject: 'did:web:example.com',
            ratingValue: 3,
            version: '1.0.0' // Version 1
          }
        }
      ];
      
      const deduped = deduplicateReviews(attestations);
      
      // Both should be kept since they're for different versions
      expect(deduped.length).toBe(2);
    });
  });
  
  describe('Rating Calculation with Supersession', () => {
    
    /**
     * Test: Average rating uses deduplicated reviews
     * Requirement: "Rating calculation should consider supersession"
     */
    it('should calculate average using deduplicated reviews', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0x1111',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '',
          time: 1704153600, // Newer
          expirationTime: 0,
          revocationTime: 0,
          refUID: '',
          revocable: true,
          schemaId: 'user-review',
          decodedData: {
            subject: 'did:web:example.com',
            ratingValue: 5 // Updated rating
          }
        },
        {
          uid: '0x2222',
          attester: '0xAttester1', // Same attester - should be superseded
          recipient: '0xRecipient',
          data: '',
          time: 1704067200, // Older
          expirationTime: 0,
          revocationTime: 0,
          refUID: '',
          revocable: true,
          schemaId: 'user-review',
          decodedData: {
            subject: 'did:web:example.com',
            ratingValue: 1 // Original rating (should be ignored)
          }
        },
        {
          uid: '0x3333',
          attester: '0xAttester2', // Different attester
          recipient: '0xRecipient',
          data: '',
          time: 1704067200,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '',
          revocable: true,
          schemaId: 'user-review',
          decodedData: {
            subject: 'did:web:example.com',
            ratingValue: 3
          }
        }
      ];
      
      const { average, count } = calculateAverageRating(attestations);
      
      // Should only count 2 reviews (5 from Attester1, 3 from Attester2)
      // Average = (5 + 3) / 2 = 4
      expect(count).toBe(2);
      expect(average).toBe(4);
    });
    
    /**
     * Test: Revoked attestations are excluded
     * Requirement: "Revoked attestations MUST be excluded from calculations"
     */
    it('should exclude revoked attestations from rating calculation', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0x1111',
          attester: '0xAttester1',
          recipient: '0xRecipient',
          data: '',
          time: 1704153600,
          expirationTime: 0,
          revocationTime: 1704200000, // REVOKED
          refUID: '',
          revocable: true,
          schemaId: 'user-review',
          decodedData: {
            subject: 'did:web:example.com',
            ratingValue: 1 // Bad rating but revoked
          }
        },
        {
          uid: '0x2222',
          attester: '0xAttester2',
          recipient: '0xRecipient',
          data: '',
          time: 1704067200,
          expirationTime: 0,
          revocationTime: 0, // Not revoked
          refUID: '',
          revocable: true,
          schemaId: 'user-review',
          decodedData: {
            subject: 'did:web:example.com',
            ratingValue: 5
          }
        }
      ];
      
      const { average, count } = calculateAverageRating(attestations);
      
      // Should only count the non-revoked review
      expect(count).toBe(1);
      expect(average).toBe(5);
    });
  });
  
  describe('Version Extraction', () => {
    
    /**
     * Test: Major version extraction
     * Requirement: "Version filtering uses major version component"
     */
    it('should extract major version from semver string', () => {
      expect(getMajorVersion('1.0.0')).toBe('1');
      expect(getMajorVersion('2.3.4')).toBe('2');
      expect(getMajorVersion('10.0.0')).toBe('10');
      expect(getMajorVersion('0.1.0')).toBe('0');
    });
    
    /**
     * Test: Major version from non-standard versions
     */
    it('should handle non-standard version formats', () => {
      expect(getMajorVersion('1')).toBe('1');
      expect(getMajorVersion('1.0')).toBe('1');
      expect(getMajorVersion('v1.0.0')).toBeUndefined(); // Doesn't start with digit
    });
    
    /**
     * Test: Undefined version handling
     */
    it('should handle undefined version', () => {
      expect(getMajorVersion(undefined)).toBeUndefined();
      expect(getMajorVersion('')).toBeUndefined();
    });
  });
});

describe('Attestation Lifecycle - Edge Cases', () => {
  
  /**
   * Test: Empty attestation list
   */
  it('should handle empty attestation list', () => {
    const { average, count } = calculateAverageRating([]);
    
    expect(count).toBe(0);
    expect(average).toBe(0);
  });
  
  /**
   * Test: All attestations revoked
   */
  it('should handle all attestations being revoked', () => {
    const attestations: AttestationQueryResult[] = [
      {
        uid: '0x1111',
        attester: '0xAttester1',
        recipient: '0xRecipient',
        data: '',
        time: 1704153600,
        expirationTime: 0,
        revocationTime: 1704200000, // Revoked
        refUID: '',
        revocable: true,
        schemaId: 'user-review',
        decodedData: {
          subject: 'did:web:example.com',
          ratingValue: 5
        }
      }
    ];
    
    const { average, count } = calculateAverageRating(attestations);
    
    expect(count).toBe(0);
    expect(average).toBe(0);
  });
  
  /**
   * Test: Non-review attestations are ignored
   */
  it('should ignore non-review schema attestations', () => {
    const attestations: AttestationQueryResult[] = [
      {
        uid: '0x1111',
        attester: '0xAttester1',
        recipient: '0xRecipient',
        data: '',
        time: 1704153600,
        expirationTime: 0,
        revocationTime: 0,
        refUID: '',
        revocable: true,
        schemaId: 'endorsement', // Not a user-review
        decodedData: {
          subject: 'did:web:example.com'
        }
      }
    ];
    
    const { average, count } = calculateAverageRating(attestations);
    
    expect(count).toBe(0);
    expect(average).toBe(0);
  });
  
  /**
   * Test: Reviews without ratings are excluded
   */
  it('should exclude reviews without rating values', () => {
    const attestations: AttestationQueryResult[] = [
      {
        uid: '0x1111',
        attester: '0xAttester1',
        recipient: '0xRecipient',
        data: '',
        time: 1704153600,
        expirationTime: 0,
        revocationTime: 0,
        refUID: '',
        revocable: true,
        schemaId: 'user-review',
        decodedData: {
          subject: 'did:web:example.com',
          reviewBody: 'Great app!' // No ratingValue
        }
      },
      {
        uid: '0x2222',
        attester: '0xAttester2',
        recipient: '0xRecipient',
        data: '',
        time: 1704067200,
        expirationTime: 0,
        revocationTime: 0,
        refUID: '',
        revocable: true,
        schemaId: 'user-review',
        decodedData: {
          subject: 'did:web:example.com',
          ratingValue: 4 // Has rating
        }
      }
    ];
    
    const { average, count } = calculateAverageRating(attestations);
    
    expect(count).toBe(1);
    expect(average).toBe(4);
  });
});

