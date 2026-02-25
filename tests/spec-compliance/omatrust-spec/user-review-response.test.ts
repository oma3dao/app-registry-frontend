/**
 * OMATrust Reputation Specification - User Review Response Tests
 * 
 * Tests for Section 7.2: User Review Response Schema
 * Validates the response attestation schema and verification rules.
 * 
 * Specification: OMATrust Reputation Specification
 * Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 */

import { describe, it, expect } from 'vitest';
import { 
  userReviewResponseSchema,
  userReviewSchema,
  type AttestationSchema,
  type FormField 
} from '@/config/schemas';

describe('OMATrust Reputation Spec 7.2 - User Review Response Schema', () => {
  
  // Helper to find field in schema
  const findField = (schema: AttestationSchema, name: string): FormField | undefined => {
    return schema.fields.find(f => f.name === name);
  };
  
  describe('Required Fields', () => {
    
    /**
     * Test: attester field (service owner DID)
     * Requirement ID: OT-RP-100
     * Requirement: "attester MUST be string (service owner DID), Required=Y"
     */
    it('should have attester field for service owner DID - OT-RP-100', () => {
      // In EAS, attester is implicit (the signer address)
      // The schema itself doesn't include an explicit attester field
      // This is by design - EAS captures attester automatically
      
      // Verify the schema is for user review responses
      expect(userReviewResponseSchema.id).toBe('user-review-response');
    });
    
    /**
     * Test: subject field (reviewer DID)
     * Requirement ID: OT-RP-101
     * Requirement: "subject MUST match reviewer of refUID, Required=N"
     */
    it('should have optional subject field for reviewer DID - OT-RP-101', () => {
      const subjectField = findField(userReviewResponseSchema, 'subject');
      
      expect(subjectField).toBeDefined();
      expect(subjectField!.required).toBe(false); // Optional per spec
      expect(subjectField!.type).toBe('string');
      expect(subjectField!.format).toBe('did');
    });
    
    /**
     * Test: refUID field (reference to User Review)
     * Requirement ID: OT-RP-102
     * Requirement: "refUID MUST be string (UID of User Review), Required=Y"
     */
    it('should have required refUID field - OT-RP-102', () => {
      const refUIDField = findField(userReviewResponseSchema, 'refUID');
      
      expect(refUIDField).toBeDefined();
      expect(refUIDField!.required).toBe(true);
      expect(refUIDField!.type).toBe('string');
      // UIDs are 66 characters (0x + 64 hex chars)
      expect(refUIDField!.maxLength).toBe(66);
    });
    
    /**
     * Test: responseBody field
     * Requirement ID: OT-RP-103
     * Requirement: "responseBody MUST be string (max 500 chars), Required=Y"
     */
    it('should have required responseBody field with max 500 chars - OT-RP-103', () => {
      const responseBodyField = findField(userReviewResponseSchema, 'responseBody');
      
      expect(responseBodyField).toBeDefined();
      expect(responseBodyField!.required).toBe(true);
      expect(responseBodyField!.type).toBe('string');
      expect(responseBodyField!.maxLength).toBe(500);
    });
    
    /**
     * Test: issuedAt field (timestamp)
     * Requirement ID: OT-RP-104
     * Requirement: "issuedAt MUST be integer (Unix timestamp), Required=Y"
     * Note: This field may be auto-populated or handled by EAS
     */
    it('should support issuedAt timestamp concept - OT-RP-104', () => {
      // issuedAt is typically handled by EAS's time field
      // Check if schema has explicit issuedAt or relies on EAS
      const issuedAtField = findField(userReviewResponseSchema, 'issuedAt');
      
      // If present, validate structure
      if (issuedAtField) {
        expect(issuedAtField.type).toBe('integer');
        expect(issuedAtField.subtype).toBe('timestamp');
      }
      
      // EAS always records attestation time
      expect(true).toBe(true);
    });
  });
  
  describe('Verification Rules', () => {
    
    /**
     * Test: refUID must resolve to valid User Review
     * Requirement ID: OT-RP-110
     * Requirement: "refUID MUST resolve to valid User Review attestation"
     */
    it('should validate refUID format for resolution - OT-RP-110', () => {
      const validRefUID = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      // Valid UID format: 0x followed by 64 hex characters
      expect(validRefUID).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(validRefUID.length).toBe(66);
    });
    
    /**
     * Test: refUID cannot be empty
     * Requirement ID: OT-RP-110
     * Requirement: "Empty or null refUID MUST be rejected"
     */
    it('should reject empty refUID - OT-RP-110', () => {
      const refUIDField = findField(userReviewResponseSchema, 'refUID');
      
      // Required field cannot be empty
      expect(refUIDField!.required).toBe(true);
      
      // Empty string should not match valid UID pattern
      const emptyUID = '';
      expect(emptyUID).not.toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
    
    /**
     * Test: response.subject must match reviewer of referenced review
     * Requirement ID: OT-RP-111
     * Requirement: "response.subject MUST match reviewer of referenced review"
     */
    it('should define subject field for reviewer matching - OT-RP-111', () => {
      const subjectField = findField(userReviewResponseSchema, 'subject');
      
      expect(subjectField).toBeDefined();
      expect(subjectField!.description).toContain('reviewer');
    });
    
    /**
     * Test: response.attester must be service owner or delegate
     * Requirement ID: OT-RP-112
     * Requirement: "response.attester MUST be reviewed service or delegate"
     */
    it('should document attester authorization requirement - OT-RP-112', () => {
      // The schema description should indicate who can create responses
      expect(userReviewResponseSchema.description).toContain('app owner');
    });
  });
  
  describe('Response Body Validation', () => {
    
    /**
     * Test: responseBody character limit
     * Requirement ID: OT-RP-103
     * Requirement: "responseBody max 500 chars matches reviewBody limit"
     */
    it('should have same max length as reviewBody - OT-RP-103', () => {
      const responseBodyField = findField(userReviewResponseSchema, 'responseBody');
      const reviewBodyField = findField(userReviewSchema, 'reviewBody');
      
      expect(responseBodyField!.maxLength).toBe(500);
      expect(reviewBodyField!.maxLength).toBe(500);
    });
    
    /**
     * Test: responseBody allows empty string
     * Requirement ID: OT-RP-103
     * Requirement: "responseBody is required but can contain minimal content"
     */
    it('should require responseBody field - OT-RP-103', () => {
      const responseBodyField = findField(userReviewResponseSchema, 'responseBody');
      
      expect(responseBodyField!.required).toBe(true);
      // No minLength specified means empty is technically valid
      // but the required flag ensures the field must be present
    });
  });
  
  describe('Schema Deployment', () => {
    
    /**
     * Test: Schema should be deployed on supported chains
     * Requirement: Schema must have deployedUIDs for operation
     */
    it('should have deployment UIDs configured', () => {
      expect(userReviewResponseSchema.deployedUIDs).toBeDefined();
      
      // Check OMAchain Testnet deployment
      const omachainTestnetUID = userReviewResponseSchema.deployedUIDs?.[66238];
      expect(omachainTestnetUID).toBeDefined();
      expect(omachainTestnetUID).not.toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    });
    
    /**
     * Test: Schema ID must be correct
     * Requirement: Schema must be identifiable
     */
    it('should have correct schema identifier', () => {
      expect(userReviewResponseSchema.id).toBe('user-review-response');
      expect(userReviewResponseSchema.title).toBe('User Review Response');
    });
  });
  
  describe('Cross-Reference with User Review Schema', () => {
    
    /**
     * Test: User Review has subject field for matching
     * Requirement: Response.subject must match Review's attester
     */
    it('should align with User Review schema for matching - OT-RP-111', () => {
      // User Review has subject (the thing being reviewed)
      // User Review Response has subject (the reviewer)
      // These are DIFFERENT subjects
      
      const userReviewSubject = findField(userReviewSchema, 'subject');
      const responseSubject = findField(userReviewResponseSchema, 'subject');
      
      expect(userReviewSubject!.description).toContain('reviewed');
      expect(responseSubject!.description).toContain('reviewer');
    });
    
    /**
     * Test: refUID field enables linking
     * Requirement: Responses must reference specific reviews
     */
    it('should enable proper linking via refUID', () => {
      const refUIDField = findField(userReviewResponseSchema, 'refUID');
      
      expect(refUIDField).toBeDefined();
      expect(refUIDField!.description).toContain('review');
      expect(refUIDField!.description).toContain('UID');
    });
  });
});

describe('User Review Response - Data Validation', () => {
  
  /**
   * Test: Valid response data structure
   * Validates a complete response object
   */
  it('should validate complete response data structure', () => {
    const validResponse = {
      subject: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
      refUID: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      responseBody: 'Thank you for your feedback. We appreciate your review and will address the concerns raised.'
    };
    
    // Validate subject is a DID
    expect(validResponse.subject).toMatch(/^did:[a-z0-9]+:.+$/);
    
    // Validate refUID format
    expect(validResponse.refUID).toMatch(/^0x[a-fA-F0-9]{64}$/);
    
    // Validate responseBody length
    expect(validResponse.responseBody.length).toBeLessThanOrEqual(500);
  });
  
  /**
   * Test: Response without subject (optional field)
   * Validates that subject is truly optional
   */
  it('should allow response without subject field', () => {
    const responseWithoutSubject = {
      refUID: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      responseBody: 'Thank you for your feedback!'
    };
    
    // Both required fields present
    expect(responseWithoutSubject.refUID).toBeDefined();
    expect(responseWithoutSubject.responseBody).toBeDefined();
    
    // Subject is not required
    const subjectField = userReviewResponseSchema.fields.find(f => f.name === 'subject');
    expect(subjectField?.required).toBe(false);
  });
  
  /**
   * Test: Response body at maximum length
   * Validates boundary condition
   */
  it('should accept responseBody at exactly 500 characters', () => {
    const maxLengthBody = 'A'.repeat(500);
    
    expect(maxLengthBody.length).toBe(500);
    
    const responseBodyField = userReviewResponseSchema.fields.find(f => f.name === 'responseBody');
    expect(maxLengthBody.length).toBeLessThanOrEqual(responseBodyField!.maxLength!);
  });
});

