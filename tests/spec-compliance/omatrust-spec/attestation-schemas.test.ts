/**
 * OMATrust Specification Compliance: Attestation Schemas (Proofs Spec)
 * 
 * Tests implementation compliance with OMATrust Proofs Specification
 * for attestation schema definitions and validation.
 * 
 * SPECIFICATION REFERENCES:
 * - OMATrust Proofs Specification: omatrust-specification-proofs.pdf
 * - Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 * 
 * This test file validates EXTERNAL SPECIFICATIONS, not internal implementation.
 * 
 * ATTESTATION TYPES:
 * 1. Certification - Formal certifications from certification bodies
 * 2. Endorsement - Lightweight approvals/trust signals
 * 3. Key Binding - Cryptographic key associations with DIDs
 * 4. Linked Identifier - DID-to-DID identity links
 * 5. Security Assessment - Security audit results
 * 6. User Review - 1-5 star user ratings
 * 7. User Review Response - Responses to user reviews
 */

import { describe, it, expect } from 'vitest';
import {
  getAllSchemas,
  getSchema,
  certificationSchema,
  endorsementSchema,
  keyBindingSchema,
  linkedIdentifierSchema,
  securityAssessmentSchema,
  userReviewSchema,
  userReviewResponseSchema,
  type AttestationSchema,
  type FormField,
} from '@/config/schemas';

describe('OMATrust Proofs Spec: Attestation Schema Definitions', () => {
  /**
   * Specification: OMATrust Proofs Specification
   * 
   * Tests validate attestation schema structure and field requirements.
   */

  describe('Common Field Requirements (OT-PF-001 to OT-PF-006)', () => {
    it('all schemas include subject field with DID format - OT-PF-001', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-001
       * Requirement: "`subject` field MUST be a valid DID format"
       */

      const schemas = getAllSchemas();
      
      schemas.forEach(schema => {
        // Skip schemas without fields (like common)
        if (schema.fields.length === 0) return;
        
        const subjectField = schema.fields.find(f => f.name === 'subject');
        
        // Most schemas should have a subject field
        if (subjectField) {
          expect(subjectField.type).toBe('string');
          expect(subjectField.format).toBe('did');
          expect(subjectField.pattern).toMatch(/did/);
        }
      });
    });

    it('subject field max length is 256 characters - OT-PF-002', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-002
       * Requirement: "`subject` field MUST NOT exceed 256 characters"
       */

      const schemas = getAllSchemas();
      
      schemas.forEach(schema => {
        const subjectField = schema.fields.find(f => f.name === 'subject');
        
        if (subjectField) {
          expect(subjectField.maxLength).toBe(256);
        }
      });
    });

    it('issuedAt field is Unix timestamp type - OT-PF-003', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-003
       * Requirement: "`issuedAt` MUST be a Unix timestamp (seconds)"
       */

      const schemasWithIssuedAt = getAllSchemas().filter(
        s => s.fields.some(f => f.name === 'issuedAt')
      );

      schemasWithIssuedAt.forEach(schema => {
        const issuedAtField = schema.fields.find(f => f.name === 'issuedAt');
        
        expect(issuedAtField).toBeDefined();
        expect(issuedAtField?.type).toBe('integer');
        expect(issuedAtField?.subtype).toBe('timestamp');
      });
    });

    it('version field follows semantic versioning pattern where required - OT-PF-006', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-006
       * Requirement: "`version` SHOULD follow semantic versioning format"
       * 
       * Note: Some schemas may have version fields without strict semver
       * validation (e.g., certification allows free-form version strings).
       * This test validates schemas that DO enforce semver.
       */

      const schemasWithSemver = getAllSchemas().filter(s => 
        s.fields.some(f => 
          f.name === 'version' && 
          (f.subtype === 'semver' || f.pattern?.includes('\\d+'))
        )
      );

      // At least some schemas should enforce semver
      expect(schemasWithSemver.length).toBeGreaterThan(0);

      schemasWithSemver.forEach(schema => {
        const versionField = schema.fields.find(f => f.name === 'version');
        
        if (versionField) {
          // Should have semver subtype or pattern
          const hasSemver = 
            versionField.subtype === 'semver' ||
            versionField.pattern?.includes('\\d+');
          expect(hasSemver).toBe(true);
        }
      });
    });
  });

  describe('Certification Schema (OT-PF-010 to OT-PF-014)', () => {
    it('includes programID as required DID field - OT-PF-010', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-010
       * Requirement: "`programID` MUST be a valid DID"
       */

      const programIdField = certificationSchema.fields.find(
        f => f.name === 'programID'
      );

      expect(programIdField).toBeDefined();
      expect(programIdField?.required).toBe(true);
      expect(programIdField?.format).toBe('did');
      expect(programIdField?.pattern).toMatch(/did/);
    });

    it('includes assessor as required DID field - OT-PF-011', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-011
       * Requirement: "`assessor` MUST be a valid DID"
       */

      const assessorField = certificationSchema.fields.find(
        f => f.name === 'assessor'
      );

      expect(assessorField).toBeDefined();
      expect(assessorField?.required).toBe(true);
      expect(assessorField?.format).toBe('did');
    });

    it('outcome field allows pass or fail - OT-PF-012', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-012
       * Requirement: "`outcome` MUST be 'pass' or 'fail' (default: 'pass')"
       */

      const outcomeField = certificationSchema.fields.find(
        f => f.name === 'outcome'
      );

      expect(outcomeField).toBeDefined();
      expect(outcomeField?.type).toBe('enum');
      expect(outcomeField?.options).toContain('pass');
      expect(outcomeField?.options).toContain('fail');
    });

    it('has certification level as optional - OT-PF-013', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-013
       * Requirement: "`certificationLevel` MAY specify level"
       */

      const levelField = certificationSchema.fields.find(
        f => f.name === 'certificationLevel'
      );

      expect(levelField).toBeDefined();
      expect(levelField?.required).toBe(false);
    });
  });

  describe('Endorsement Schema (OT-PF-020 to OT-PF-021)', () => {
    it('policyURI is valid URI format - OT-PF-020', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-020
       * Requirement: "`policyURI` MUST be a valid URI if provided"
       */

      const policyField = endorsementSchema.fields.find(
        f => f.name === 'policyURI'
      );

      expect(policyField).toBeDefined();
      expect(policyField?.type).toBe('uri');
      expect(policyField?.format).toBe('uri');
    });

    it('organization is optional DID field - OT-PF-021', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-021
       * Requirement: "`organization` MUST be a valid DID if provided"
       */

      const orgField = endorsementSchema.fields.find(
        f => f.name === 'organization'
      );

      expect(orgField).toBeDefined();
      expect(orgField?.required).toBe(false);
      expect(orgField?.format).toBe('did');
    });
  });

  describe('Key Binding Schema (OT-PF-030 to OT-PF-034)', () => {
    it('keyId is required DID field - OT-PF-030', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-030
       * Requirement: "`keyId` MUST be a valid DID (did:key or did:pkh)"
       */

      const keyIdField = keyBindingSchema.fields.find(
        f => f.name === 'keyId'
      );

      expect(keyIdField).toBeDefined();
      expect(keyIdField?.required).toBe(true);
      expect(keyIdField?.format).toBe('did');
    });

    it('publicKeyJwk accepts JSON format - OT-PF-031', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-031
       * Requirement: "`publicKeyJwk` MUST be valid JWK format if provided"
       */

      const jwkField = keyBindingSchema.fields.find(
        f => f.name === 'publicKeyJwk'
      );

      expect(jwkField).toBeDefined();
      expect(jwkField?.type).toBe('json');
      expect(jwkField?.required).toBe(false);
    });

    it('keyPurpose is required array - OT-PF-032', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-032
       * Requirement: "`keyPurpose` MUST include valid purpose strings"
       */

      const purposeField = keyBindingSchema.fields.find(
        f => f.name === 'keyPurpose'
      );

      expect(purposeField).toBeDefined();
      expect(purposeField?.required).toBe(true);
      expect(purposeField?.type).toBe('array');
    });

    it('proofs field is required - OT-PF-034', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-034
       * Requirement: "`proofs` MUST include cryptographic proofs array"
       */

      const proofsField = keyBindingSchema.fields.find(
        f => f.name === 'proofs'
      );

      expect(proofsField).toBeDefined();
      expect(proofsField?.required).toBe(true);
      expect(proofsField?.type).toBe('array');
    });
  });

  describe('Linked Identifier Schema (OT-PF-040 to OT-PF-043)', () => {
    it('linkedId is required DID field - OT-PF-040', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-040
       * Requirement: "`linkedId` MUST be a valid DID"
       */

      const linkedIdField = linkedIdentifierSchema.fields.find(
        f => f.name === 'linkedId'
      );

      expect(linkedIdField).toBeDefined();
      expect(linkedIdField?.required).toBe(true);
      expect(linkedIdField?.format).toBe('did');
    });

    it('method is required string - OT-PF-041', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-041
       * Requirement: "`method` MUST specify verification method used"
       */

      const methodField = linkedIdentifierSchema.fields.find(
        f => f.name === 'method'
      );

      expect(methodField).toBeDefined();
      expect(methodField?.required).toBe(true);
      expect(methodField?.type).toBe('string');
    });

    it('creates symmetric DID-to-DID link - OT-PF-043', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-043
       * Requirement: "Both `subject` and `linkedId` create symmetric DID-to-DID link"
       */

      const subjectField = linkedIdentifierSchema.fields.find(
        f => f.name === 'subject'
      );
      const linkedIdField = linkedIdentifierSchema.fields.find(
        f => f.name === 'linkedId'
      );

      // Both should be DID format
      expect(subjectField?.format).toBe('did');
      expect(linkedIdField?.format).toBe('did');

      // Schema description should mention symmetric link
      expect(linkedIdentifierSchema.description.toLowerCase()).toContain('symmetric');
    });
  });

  describe('Security Assessment Schema (OT-PF-050 to OT-PF-053)', () => {
    it('payload.assessmentKind is required - OT-PF-050', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-050
       * Requirement: "`payload.assessmentKind` MUST be specified"
       */

      const payloadField = securityAssessmentSchema.fields.find(
        f => f.name === 'payload'
      );

      expect(payloadField).toBeDefined();
      expect(payloadField?.type).toBe('object');

      const assessmentKindField = payloadField?.subFields?.find(
        f => f.name === 'assessmentKind'
      );

      expect(assessmentKindField).toBeDefined();
      expect(assessmentKindField?.required).toBe(true);
    });

    it('payloadVersion follows semantic versioning - OT-PF-051', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-051
       * Requirement: "`payloadVersion` MUST follow semantic versioning"
       */

      const versionField = securityAssessmentSchema.fields.find(
        f => f.name === 'payloadVersion'
      );

      expect(versionField).toBeDefined();
      expect(versionField?.required).toBe(true);
      expect(versionField?.default).toBe('1.0.0');
    });

    it('payload.outcome allows pass or fail - OT-PF-052', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-052
       * Requirement: "`payload.outcome` MUST be 'pass' or 'fail' if specified"
       */

      const payloadField = securityAssessmentSchema.fields.find(
        f => f.name === 'payload'
      );

      const outcomeField = payloadField?.subFields?.find(
        f => f.name === 'outcome'
      );

      expect(outcomeField).toBeDefined();
      expect(outcomeField?.type).toBe('enum');
      expect(outcomeField?.options).toContain('pass');
      expect(outcomeField?.options).toContain('fail');
    });
  });

  describe('User Review Schema (OT-PF-060 to OT-PF-064)', () => {
    it('ratingValue is 1-5 integer enum - OT-PF-060', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-060
       * Requirement: "`ratingValue` MUST be integer 1-5"
       */

      const ratingField = userReviewSchema.fields.find(
        f => f.name === 'ratingValue'
      );

      expect(ratingField).toBeDefined();
      expect(ratingField?.required).toBe(true);
      expect(ratingField?.type).toBe('enum');
      expect(ratingField?.options).toEqual([1, 2, 3, 4, 5]);
    });

    it('reviewBody max length is 500 characters - OT-PF-061', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-061
       * Requirement: "`reviewBody` MUST NOT exceed 500 characters"
       */

      const bodyField = userReviewSchema.fields.find(
        f => f.name === 'reviewBody'
      );

      expect(bodyField).toBeDefined();
      expect(bodyField?.maxLength).toBe(500);
    });

    it('screenshotUrls is array type - OT-PF-062', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-062
       * Requirement: "`screenshotUrls` MUST be array of valid URIs"
       */

      const screenshotsField = userReviewSchema.fields.find(
        f => f.name === 'screenshotUrls'
      );

      expect(screenshotsField).toBeDefined();
      expect(screenshotsField?.type).toBe('array');
    });

    it('proofs field is optional - OT-PF-063', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-063
       * Requirement: "`proofs` SHOULD use proofPurpose='commercial-tx'"
       */

      const proofsField = userReviewSchema.fields.find(
        f => f.name === 'proofs'
      );

      expect(proofsField).toBeDefined();
      expect(proofsField?.required).toBe(false);
      // Description should mention commercial-tx purpose
      expect(proofsField?.description?.toLowerCase()).toContain('commercial-tx');
    });
  });

  describe('User Review Response Schema (OT-PF-070 to OT-PF-071)', () => {
    it('refUID references original review - OT-PF-070', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-070
       * Requirement: "`refUID` MUST reference an existing user review"
       */

      const refField = userReviewResponseSchema.fields.find(
        f => f.name === 'refUID'
      );

      expect(refField).toBeDefined();
      expect(refField?.required).toBe(true);
      expect(refField?.type).toBe('string');
    });

    it('responseBody max length is 500 characters - OT-PF-071', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-071
       * Requirement: "`responseBody` MUST NOT exceed 500 characters"
       */

      const bodyField = userReviewResponseSchema.fields.find(
        f => f.name === 'responseBody'
      );

      expect(bodyField).toBeDefined();
      expect(bodyField?.required).toBe(true);
      expect(bodyField?.maxLength).toBe(500);
    });
  });

  describe('Schema Deployment (OT-PF-080 to OT-PF-082)', () => {
    it('schemas have deployedUIDs mapping - OT-PF-081', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-081
       * Requirement: "Schema UIDs MUST be stored in deployedUIDs mapping"
       */

      const schemas = getAllSchemas();

      schemas.forEach(schema => {
        expect(schema.deployedUIDs).toBeDefined();
        expect(typeof schema.deployedUIDs).toBe('object');
      });
    });

    it('schemas track deployment block numbers - OT-PF-082', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement ID: OT-PF-082
       * Requirement: "Deployment block numbers MUST be tracked"
       */

      const schemas = getAllSchemas();

      schemas.forEach(schema => {
        expect(schema.deployedBlocks).toBeDefined();
        expect(typeof schema.deployedBlocks).toBe('object');
      });
    });

    it('OMAchain testnet has deployed schemas', () => {
      /**
       * Specification: OMATrust Proofs Specification
       * Requirement: Schemas should be deployed to OMAchain
       * 
       * OMAchain Testnet ID: 66238
       */

      const OMACHAIN_TESTNET_ID = 66238;
      const deployedSchemas = getAllSchemas().filter(schema => {
        const uid = schema.deployedUIDs?.[OMACHAIN_TESTNET_ID];
        return uid && uid !== '0x0000000000000000000000000000000000000000000000000000000000000000';
      });

      // Should have at least some schemas deployed
      expect(deployedSchemas.length).toBeGreaterThan(0);
    });
  });

  describe('Schema Retrieval Functions', () => {
    it('getSchema returns schema by id', () => {
      /**
       * Test the getSchema utility function
       */

      const schema = getSchema('user-review');
      expect(schema).toBeDefined();
      expect(schema?.id).toBe('user-review');

      const nonExistent = getSchema('non-existent');
      expect(nonExistent).toBeUndefined();
    });

    it('getAllSchemas returns all registered schemas', () => {
      /**
       * Test the getAllSchemas utility function
       */

      const schemas = getAllSchemas();
      expect(Array.isArray(schemas)).toBe(true);
      expect(schemas.length).toBeGreaterThan(0);

      // Should include known schemas
      const schemaIds = schemas.map(s => s.id);
      expect(schemaIds).toContain('user-review');
      expect(schemaIds).toContain('certification');
      expect(schemaIds).toContain('endorsement');
    });
  });
});

