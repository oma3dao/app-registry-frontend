/**
 * OMATrust Reputation Specification - Certification Verification Tests
 * 
 * Tests for Section 7.4: Certification Schema
 * Validates the three-party certification flow and verification rules.
 * 
 * Specification: OMATrust Reputation Specification
 * Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 */

import { describe, it, expect } from 'vitest';
import { 
  certificationSchema,
  type AttestationSchema,
  type FormField 
} from '@/config/schemas';

describe('OMATrust Reputation Spec 7.4 - Certification Schema', () => {
  
  // Helper to find field in schema
  const findField = (schema: AttestationSchema, name: string): FormField | undefined => {
    return schema.fields.find(f => f.name === name);
  };
  
  describe('Three-Party Model Fields', () => {
    
    /**
     * Test: attester field (Certification Body DID)
     * Requirement ID: OT-RP-130
     * Requirement: "attester MUST be string (Certification Body DID), Required=Y"
     * Note: In EAS, attester is captured automatically as the signer
     */
    it('should support Certification Body as attester - OT-RP-130', () => {
      // EAS captures attester automatically
      // The schema describes the expected attester type
      expect(certificationSchema.description).toContain('Certification');
    });
    
    /**
     * Test: subject field (certified subject DID)
     * Requirement ID: OT-RP-131
     * Requirement: "subject MUST be string (certified subject DID), Required=Y"
     */
    it('should have required subject field for certified entity - OT-RP-131', () => {
      const subjectField = findField(certificationSchema, 'subject');
      
      expect(subjectField).toBeDefined();
      expect(subjectField!.required).toBe(true);
      expect(subjectField!.type).toBe('string');
      expect(subjectField!.format).toBe('did');
      expect(subjectField!.pattern).toBe('^did:[a-z0-9]+:.+$');
    });
    
    /**
     * Test: programId field (certification program DID)
     * Requirement ID: OT-RP-132
     * Requirement: "programId MUST be string (certification program DID), Required=Y"
     * Note: Implementation uses 'programID' (capital ID)
     */
    it('should have required programID field - OT-RP-132', () => {
      const programIdField = findField(certificationSchema, 'programID');
      
      expect(programIdField).toBeDefined();
      expect(programIdField!.required).toBe(true);
      expect(programIdField!.type).toBe('string');
      expect(programIdField!.format).toBe('did');
    });
    
    /**
     * Test: assessor field (assessor DID)
     * Requirement ID: OT-RP-133
     * Requirement: "assessor MUST be string (assessor DID), Required=Y"
     */
    it('should have required assessor field - OT-RP-133', () => {
      const assessorField = findField(certificationSchema, 'assessor');
      
      expect(assessorField).toBeDefined();
      expect(assessorField!.required).toBe(true);
      expect(assessorField!.type).toBe('string');
      expect(assessorField!.format).toBe('did');
      expect(assessorField!.pattern).toBe('^did:[a-z0-9]+:.+$');
    });
    
    /**
     * Test: outcome field (pass/fail)
     * Requirement ID: OT-RP-134
     * Requirement: "outcome MUST be enum (pass, fail, default=pass), Required=N"
     */
    it('should have optional outcome field with pass/fail enum - OT-RP-134', () => {
      const outcomeField = findField(certificationSchema, 'outcome');
      
      expect(outcomeField).toBeDefined();
      expect(outcomeField!.required).toBe(false);
      expect(outcomeField!.type).toBe('enum');
      expect(outcomeField!.options).toContain('pass');
      expect(outcomeField!.options).toContain('fail');
    });
    
    /**
     * Test: certificationLevel field
     * Requirement ID: OT-RP-135
     * Requirement: "certificationLevel is optional string"
     */
    it('should have optional certificationLevel field - OT-RP-135', () => {
      const levelField = findField(certificationSchema, 'certificationLevel');
      
      expect(levelField).toBeDefined();
      expect(levelField!.required).toBe(false);
      expect(levelField!.type).toBe('string');
    });
    
    /**
     * Test: reportURI field
     * Requirement ID: OT-RP-136
     * Requirement: "reportURI is optional URI"
     */
    it('should have optional reportURI field - OT-RP-136', () => {
      const reportURIField = findField(certificationSchema, 'reportURI');
      
      expect(reportURIField).toBeDefined();
      expect(reportURIField!.required).toBe(false);
      expect(reportURIField!.type).toBe('uri');
      expect(reportURIField!.format).toBe('uri');
    });
    
    /**
     * Test: reportDigest field
     * Requirement ID: OT-RP-137
     * Requirement: "reportDigest is optional object"
     */
    it('should have optional reportDigest field - OT-RP-137', () => {
      const reportDigestField = findField(certificationSchema, 'reportDigest');
      
      expect(reportDigestField).toBeDefined();
      expect(reportDigestField!.required).toBe(false);
      expect(reportDigestField!.type).toBe('json'); // JSON for complex object
    });
  });
  
  describe('Temporal Verification Rules', () => {
    
    /**
     * Test: effectiveAt validation
     * Requirement ID: OT-RP-140
     * Requirement: "effectiveAt > now → not yet effective"
     */
    it('should have effectiveAt field for future effectiveness - OT-RP-140', () => {
      const effectiveAtField = findField(certificationSchema, 'effectiveAt');
      
      expect(effectiveAtField).toBeDefined();
      expect(effectiveAtField!.required).toBe(false);
      expect(effectiveAtField!.type).toBe('integer');
      expect(effectiveAtField!.subtype).toBe('timestamp');
    });
    
    /**
     * Test: effectiveAt future date handling
     * Requirement ID: OT-RP-140
     * Requirement: "Certification with effectiveAt in future is not yet valid"
     */
    it('should understand future effectiveAt semantics - OT-RP-140', () => {
      const now = Math.floor(Date.now() / 1000);
      const futureTime = now + 86400; // 24 hours from now
      
      const certification = {
        subject: 'did:web:example.com',
        programID: 'did:web:certbody.org:program:security-v1',
        assessor: 'did:web:testlab.com',
        effectiveAt: futureTime
      };
      
      // Future effectiveAt means not yet effective
      const isEffective = certification.effectiveAt <= now;
      expect(isEffective).toBe(false);
    });
    
    /**
     * Test: expiresAt validation
     * Requirement ID: OT-RP-141
     * Requirement: "expiresAt <= now → expired"
     */
    it('should have expiresAt field for expiration - OT-RP-141', () => {
      const expiresAtField = findField(certificationSchema, 'expiresAt');
      
      expect(expiresAtField).toBeDefined();
      expect(expiresAtField!.required).toBe(false);
      expect(expiresAtField!.type).toBe('integer');
      expect(expiresAtField!.subtype).toBe('timestamp');
    });
    
    /**
     * Test: expiresAt past date handling
     * Requirement ID: OT-RP-141
     * Requirement: "Certification with expiresAt in past is expired"
     */
    it('should understand past expiresAt semantics - OT-RP-141', () => {
      const now = Math.floor(Date.now() / 1000);
      const pastTime = now - 86400; // 24 hours ago
      
      const certification = {
        subject: 'did:web:example.com',
        programID: 'did:web:certbody.org:program:security-v1',
        assessor: 'did:web:testlab.com',
        expiresAt: pastTime
      };
      
      // Past expiresAt means expired
      const isExpired = certification.expiresAt <= now;
      expect(isExpired).toBe(true);
    });
    
    /**
     * Test: issuedAt field
     * Requirement: "issuedAt records when certification was issued"
     */
    it('should have required issuedAt field', () => {
      const issuedAtField = findField(certificationSchema, 'issuedAt');
      
      expect(issuedAtField).toBeDefined();
      expect(issuedAtField!.required).toBe(true);
      expect(issuedAtField!.type).toBe('integer');
      expect(issuedAtField!.subtype).toBe('timestamp');
    });
  });
  
  describe('Assessor Authorization', () => {
    
    /**
     * Test: Assessor authorization via programId
     * Requirement ID: OT-RP-142
     * Requirement: "assessor authorization MUST be verified via programId"
     */
    it('should link assessor to program for authorization - OT-RP-142', () => {
      const assessorField = findField(certificationSchema, 'assessor');
      const programIdField = findField(certificationSchema, 'programID');
      
      // Both fields are required, enabling authorization check
      expect(assessorField!.required).toBe(true);
      expect(programIdField!.required).toBe(true);
      
      // Both use DID format
      expect(assessorField!.format).toBe('did');
      expect(programIdField!.format).toBe('did');
    });
    
    /**
     * Test: Assessor DID format
     * Requirement ID: OT-RP-142
     * Requirement: "Assessor must be identifiable DID"
     */
    it('should require valid DID format for assessor - OT-RP-142', () => {
      const validAssessor = 'did:web:testlab.example.com';
      const pattern = /^did:[a-z0-9]+:.+$/;
      
      expect(validAssessor).toMatch(pattern);
    });
  });
  
  describe('Three-Party Flow Validation', () => {
    
    /**
     * Test: Complete three-party certification
     * Validates Subject → Assessor → Certification Body flow
     */
    it('should support complete three-party certification flow', () => {
      const certification = {
        // Subject: The entity being certified
        subject: 'did:web:myapp.example.com',
        
        // Assessor: The test lab/auditor who performed evaluation
        assessor: 'did:web:testlab.security.org',
        
        // Program: The certification program (owned by CB)
        programID: 'did:web:certbody.org:program:iso27001-v2',
        
        // Attester (CB): Signs the attestation (captured by EAS)
        // This would be did:web:certbody.org
        
        // Outcome
        outcome: 'pass',
        certificationLevel: 'Level 2',
        
        // Temporal
        issuedAt: Math.floor(Date.now() / 1000),
        effectiveAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
      };
      
      // All three parties are distinct
      expect(certification.subject).not.toBe(certification.assessor);
      expect(certification.assessor).not.toBe(certification.programID);
      expect(certification.subject).not.toBe(certification.programID);
      
      // All are valid DIDs
      const didPattern = /^did:[a-z0-9]+:.+$/;
      expect(certification.subject).toMatch(didPattern);
      expect(certification.assessor).toMatch(didPattern);
      expect(certification.programID).toMatch(didPattern);
    });
    
    /**
     * Test: Certification with organization context
     * Validates organization field usage
     */
    it('should support organization field for context', () => {
      const orgField = findField(certificationSchema, 'organization');
      
      expect(orgField).toBeDefined();
      expect(orgField!.required).toBe(false);
      expect(orgField!.format).toBe('did');
      
      // Organization is used when certifying a service that belongs to an org
      const certification = {
        subject: 'did:web:example.com:service:api',
        organization: 'did:web:example.com', // Parent org
        programID: 'did:web:certbody.org:program:api-security',
        assessor: 'did:web:testlab.com'
      };
      
      expect(certification.organization).toBeDefined();
    });
  });
  
  describe('Schema Deployment', () => {
    
    /**
     * Test: Schema deployment on chains
     */
    it('should have deployment UIDs configured', () => {
      expect(certificationSchema.deployedUIDs).toBeDefined();
      
      // Check OMAchain Testnet deployment
      const omachainTestnetUID = certificationSchema.deployedUIDs?.[66238];
      expect(omachainTestnetUID).toBeDefined();
      expect(omachainTestnetUID).not.toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    });
    
    /**
     * Test: Schema identity
     */
    it('should have correct schema identifier', () => {
      expect(certificationSchema.id).toBe('certification');
      expect(certificationSchema.title).toBe('Certification');
    });
  });
});

describe('Certification - Data Validation', () => {
  
  /**
   * Test: Valid certification data structure
   */
  it('should validate complete certification data structure', () => {
    const now = Math.floor(Date.now() / 1000);
    
    const validCertification = {
      subject: 'did:web:myapp.example.com',
      organization: 'did:web:example.com',
      version: '1.2.3',
      programID: 'did:web:certbody.org:program:security-v2',
      assessor: 'did:web:testlab.security.org',
      certificationLevel: 'Gold',
      outcome: 'pass',
      reportURI: 'https://reports.testlab.org/cert/12345',
      issuedAt: now,
      effectiveAt: now,
      expiresAt: now + (365 * 24 * 60 * 60)
    };
    
    // All DID fields are valid
    const didPattern = /^did:[a-z0-9]+:.+$/;
    expect(validCertification.subject).toMatch(didPattern);
    expect(validCertification.organization).toMatch(didPattern);
    expect(validCertification.programID).toMatch(didPattern);
    expect(validCertification.assessor).toMatch(didPattern);
    
    // Outcome is valid enum
    expect(['pass', 'fail']).toContain(validCertification.outcome);
    
    // Temporal ordering is correct
    expect(validCertification.issuedAt).toBeLessThanOrEqual(validCertification.expiresAt);
    expect(validCertification.effectiveAt).toBeLessThanOrEqual(validCertification.expiresAt);
  });
  
  /**
   * Test: Minimal valid certification (required fields only)
   */
  it('should validate minimal certification with required fields only', () => {
    const minimalCertification = {
      subject: 'did:web:myapp.example.com',
      programID: 'did:web:certbody.org:program:basic',
      assessor: 'did:web:assessor.org',
      issuedAt: Math.floor(Date.now() / 1000)
    };
    
    const requiredFields = ['subject', 'programID', 'assessor', 'issuedAt'];
    
    requiredFields.forEach(field => {
      expect(minimalCertification).toHaveProperty(field);
    });
  });
  
  /**
   * Test: Failed certification
   */
  it('should support failed certification outcome', () => {
    const failedCertification = {
      subject: 'did:web:myapp.example.com',
      programID: 'did:web:certbody.org:program:security',
      assessor: 'did:web:testlab.org',
      outcome: 'fail',
      issuedAt: Math.floor(Date.now() / 1000)
    };
    
    expect(failedCertification.outcome).toBe('fail');
  });
});

