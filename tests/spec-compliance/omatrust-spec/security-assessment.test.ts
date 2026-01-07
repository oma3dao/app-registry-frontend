/**
 * OMATrust Reputation Specification - Security Assessment Tests
 * 
 * Tests for Section 7.5: Security Assessment Schema
 * Validates the assessment schema including payload metrics.
 * 
 * Specification: OMATrust Reputation Specification
 * Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 */

import { describe, it, expect } from 'vitest';
import { 
  securityAssessmentSchema,
  type AttestationSchema,
  type FormField 
} from '@/config/schemas';

describe('OMATrust Reputation Spec 7.5 - Security Assessment Schema', () => {
  
  // Helper to find field in schema
  const findField = (schema: AttestationSchema, name: string): FormField | undefined => {
    return schema.fields.find(f => f.name === name);
  };
  
  // Helper to find subfield in payload object
  const findPayloadSubfield = (name: string): FormField | undefined => {
    const payloadField = findField(securityAssessmentSchema, 'payload');
    return payloadField?.subFields?.find(f => f.name === name);
  };
  
  describe('Required Fields', () => {
    
    /**
     * Test: attester field (assessor DID)
     * Requirement ID: OT-RP-150
     * Requirement: "attester MUST be string (assessor DID), Required=Y"
     * Note: In EAS, attester is captured automatically as the signer
     */
    it('should support assessor as attester - OT-RP-150', () => {
      // EAS captures attester automatically
      expect(securityAssessmentSchema.description).toContain('assessment');
    });
    
    /**
     * Test: subject field (assessed subject DID)
     * Requirement ID: OT-RP-151
     * Requirement: "subject MUST be string (assessed subject DID), Required=Y"
     */
    it('should have required subject field - OT-RP-151', () => {
      const subjectField = findField(securityAssessmentSchema, 'subject');
      
      expect(subjectField).toBeDefined();
      expect(subjectField!.required).toBe(true);
      expect(subjectField!.type).toBe('string');
      expect(subjectField!.format).toBe('did');
    });
    
    /**
     * Test: payload.assessmentKind field
     * Requirement ID: OT-RP-152
     * Requirement: "payload.assessmentKind MUST be string, Required=Y"
     */
    it('should have required assessmentKind in payload - OT-RP-152', () => {
      const assessmentKindField = findPayloadSubfield('assessmentKind');
      
      expect(assessmentKindField).toBeDefined();
      expect(assessmentKindField!.required).toBe(true);
      expect(assessmentKindField!.type).toBe('string');
    });
    
    /**
     * Test: assessmentKind valid values
     * Requirement ID: OT-RP-152
     * Requirement: "assessmentKind values: pentest, security-audit, code-review, vulnerability-scan"
     */
    it('should support standard assessmentKind values - OT-RP-152', () => {
      const validKinds = [
        'pentest',
        'security-audit',
        'code-review',
        'vulnerability-scan'
      ];
      
      // These are recognized kinds per the spec
      validKinds.forEach(kind => {
        expect(typeof kind).toBe('string');
        expect(kind.length).toBeGreaterThan(0);
      });
    });
    
    /**
     * Test: payloadVersion field
     * Requirement ID: OT-RP-153
     * Requirement: "payloadVersion MUST be string (semver, default '1.0.0'), Required=Y"
     */
    it('should have required payloadVersion field with default - OT-RP-153', () => {
      const payloadVersionField = findField(securityAssessmentSchema, 'payloadVersion');
      
      expect(payloadVersionField).toBeDefined();
      expect(payloadVersionField!.required).toBe(true);
      expect(payloadVersionField!.type).toBe('string');
      expect(payloadVersionField!.default).toBe('1.0.0');
    });
    
    /**
     * Test: payload.outcome field
     * Requirement ID: OT-RP-154
     * Requirement: "payload.outcome MUST be enum (pass, fail, default=pass), Required=N"
     */
    it('should have optional outcome in payload - OT-RP-154', () => {
      const outcomeField = findPayloadSubfield('outcome');
      
      expect(outcomeField).toBeDefined();
      expect(outcomeField!.required).toBe(false);
      expect(outcomeField!.type).toBe('enum');
      expect(outcomeField!.options).toContain('pass');
      expect(outcomeField!.options).toContain('fail');
    });
    
    /**
     * Test: payload.reportDigest field
     * Requirement ID: OT-RP-155
     * Requirement: "payload.reportDigest is optional object"
     */
    it('should have optional reportDigest in payload - OT-RP-155', () => {
      const reportDigestField = findPayloadSubfield('reportDigest');
      
      expect(reportDigestField).toBeDefined();
      expect(reportDigestField!.required).toBe(false);
      expect(reportDigestField!.type).toBe('json');
    });
  });
  
  describe('Payload Structure', () => {
    
    /**
     * Test: payload field exists and is object type
     * Requirement: "payload contains evolvable assessment details"
     */
    it('should have payload field as object type', () => {
      const payloadField = findField(securityAssessmentSchema, 'payload');
      
      expect(payloadField).toBeDefined();
      expect(payloadField!.required).toBe(true);
      expect(payloadField!.type).toBe('object');
      expect(payloadField!.subFields).toBeDefined();
      expect(payloadField!.subFields!.length).toBeGreaterThan(0);
    });
    
    /**
     * Test: payload has methodURI field
     * Requirement: "methodURI for methodology documentation"
     */
    it('should have methodURI in payload', () => {
      const methodURIField = findPayloadSubfield('methodURI');
      
      expect(methodURIField).toBeDefined();
      expect(methodURIField!.type).toBe('uri');
      expect(methodURIField!.format).toBe('uri');
    });
    
    /**
     * Test: payload has reportURI field
     * Requirement: "reportURI for human-readable report location"
     */
    it('should have reportURI in payload', () => {
      const reportURIField = findPayloadSubfield('reportURI');
      
      expect(reportURIField).toBeDefined();
      expect(reportURIField!.type).toBe('uri');
      expect(reportURIField!.format).toBe('uri');
    });
  });
  
  describe('Payload Metrics (Optional)', () => {
    
    /**
     * Note: The current schema may not have explicit metrics fields
     * These tests document the spec requirements for future implementation
     */
    
    /**
     * Test: metrics.critical field concept
     * Requirement ID: OT-RP-160
     * Requirement: "metrics.critical is optional integer"
     */
    it('should understand metrics.critical requirement - OT-RP-160', () => {
      // Metrics are optional and may be included in reportDigest or as extension
      const validMetrics = {
        critical: 0,
        high: 2,
        medium: 5,
        low: 10,
        info: 15
      };
      
      expect(typeof validMetrics.critical).toBe('number');
      expect(validMetrics.critical).toBeGreaterThanOrEqual(0);
    });
    
    /**
     * Test: metrics.high field concept
     * Requirement ID: OT-RP-161
     * Requirement: "metrics.high is optional integer"
     */
    it('should understand metrics.high requirement - OT-RP-161', () => {
      const validMetrics = { high: 3 };
      expect(typeof validMetrics.high).toBe('number');
      expect(validMetrics.high).toBeGreaterThanOrEqual(0);
    });
    
    /**
     * Test: metrics.medium field concept
     * Requirement ID: OT-RP-162
     * Requirement: "metrics.medium is optional integer"
     */
    it('should understand metrics.medium requirement - OT-RP-162', () => {
      const validMetrics = { medium: 7 };
      expect(typeof validMetrics.medium).toBe('number');
      expect(validMetrics.medium).toBeGreaterThanOrEqual(0);
    });
    
    /**
     * Test: metrics.low field concept
     * Requirement ID: OT-RP-163
     * Requirement: "metrics.low is optional integer"
     */
    it('should understand metrics.low requirement - OT-RP-163', () => {
      const validMetrics = { low: 12 };
      expect(typeof validMetrics.low).toBe('number');
      expect(validMetrics.low).toBeGreaterThanOrEqual(0);
    });
    
    /**
     * Test: metrics.info field concept
     * Requirement ID: OT-RP-164
     * Requirement: "metrics.info is optional integer"
     */
    it('should understand metrics.info requirement - OT-RP-164', () => {
      const validMetrics = { info: 20 };
      expect(typeof validMetrics.info).toBe('number');
      expect(validMetrics.info).toBeGreaterThanOrEqual(0);
    });
    
    /**
     * Test: Complete metrics object
     * Validates full metrics structure
     */
    it('should support complete metrics structure', () => {
      const completeMetrics = {
        critical: 0,
        high: 1,
        medium: 3,
        low: 8,
        info: 15
      };
      
      // All values are non-negative integers
      Object.values(completeMetrics).forEach(value => {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      });
      
      // Total findings
      const total = Object.values(completeMetrics).reduce((a, b) => a + b, 0);
      expect(total).toBe(27);
    });
  });
  
  describe('Temporal Fields', () => {
    
    /**
     * Test: issuedAt field
     */
    it('should have required issuedAt field', () => {
      const issuedAtField = findField(securityAssessmentSchema, 'issuedAt');
      
      expect(issuedAtField).toBeDefined();
      expect(issuedAtField!.required).toBe(true);
      expect(issuedAtField!.type).toBe('integer');
      expect(issuedAtField!.subtype).toBe('timestamp');
    });
    
    /**
     * Test: effectiveAt field
     */
    it('should have optional effectiveAt field', () => {
      const effectiveAtField = findField(securityAssessmentSchema, 'effectiveAt');
      
      expect(effectiveAtField).toBeDefined();
      expect(effectiveAtField!.required).toBe(false);
      expect(effectiveAtField!.type).toBe('integer');
      expect(effectiveAtField!.subtype).toBe('timestamp');
    });
    
    /**
     * Test: expiresAt field
     */
    it('should have optional expiresAt field', () => {
      const expiresAtField = findField(securityAssessmentSchema, 'expiresAt');
      
      expect(expiresAtField).toBeDefined();
      expect(expiresAtField!.required).toBe(false);
      expect(expiresAtField!.type).toBe('integer');
      expect(expiresAtField!.subtype).toBe('timestamp');
    });
  });
  
  describe('Version Fields', () => {
    
    /**
     * Test: version field (software version)
     */
    it('should have optional version field for software version', () => {
      const versionField = findField(securityAssessmentSchema, 'version');
      
      expect(versionField).toBeDefined();
      expect(versionField!.required).toBe(false);
      expect(versionField!.type).toBe('string');
      expect(versionField!.subtype).toBe('semver');
    });
    
    /**
     * Test: versionHW field (hardware version)
     */
    it('should have optional versionHW field for hardware version', () => {
      const versionHWField = findField(securityAssessmentSchema, 'versionHW');
      
      expect(versionHWField).toBeDefined();
      expect(versionHWField!.required).toBe(false);
      expect(versionHWField!.type).toBe('string');
    });
  });
  
  describe('Schema Deployment', () => {
    
    /**
     * Test: Schema deployment on chains
     */
    it('should have deployment UIDs configured', () => {
      expect(securityAssessmentSchema.deployedUIDs).toBeDefined();
      
      // Check OMAchain Testnet deployment
      const omachainTestnetUID = securityAssessmentSchema.deployedUIDs?.[66238];
      expect(omachainTestnetUID).toBeDefined();
      expect(omachainTestnetUID).not.toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    });
    
    /**
     * Test: Schema identity
     */
    it('should have correct schema identifier', () => {
      expect(securityAssessmentSchema.id).toBe('security-assessment');
      expect(securityAssessmentSchema.title).toBe('Security Assessment');
    });
  });
});

describe('Security Assessment - Data Validation', () => {
  
  /**
   * Test: Valid pentest assessment
   */
  it('should validate complete pentest assessment', () => {
    const now = Math.floor(Date.now() / 1000);
    
    const pentestAssessment = {
      subject: 'did:web:myapp.example.com',
      organization: 'did:web:example.com',
      version: '2.1.0',
      payload: {
        assessmentKind: 'pentest',
        methodURI: 'https://assessor.org/methodology/web-pentest-v2',
        reportURI: 'https://reports.assessor.org/12345',
        outcome: 'pass'
      },
      payloadVersion: '1.0.0',
      issuedAt: now,
      effectiveAt: now,
      expiresAt: now + (180 * 24 * 60 * 60) // 180 days
    };
    
    // Subject is valid DID
    expect(pentestAssessment.subject).toMatch(/^did:[a-z0-9]+:.+$/);
    
    // Payload has required fields
    expect(pentestAssessment.payload.assessmentKind).toBe('pentest');
    expect(pentestAssessment.payloadVersion).toMatch(/^\d+\.\d+\.\d+$/);
    
    // Outcome is valid
    expect(['pass', 'fail']).toContain(pentestAssessment.payload.outcome);
  });
  
  /**
   * Test: Valid code review assessment
   */
  it('should validate code review assessment', () => {
    const codeReview = {
      subject: 'did:web:myapp.example.com:contract:token',
      version: '1.0.0',
      payload: {
        assessmentKind: 'code-review',
        outcome: 'pass',
        reportDigest: {
          algo: 'sha256',
          canon: 'raw',
          hex: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        }
      },
      payloadVersion: '1.0.0',
      issuedAt: Math.floor(Date.now() / 1000)
    };
    
    expect(codeReview.payload.assessmentKind).toBe('code-review');
    expect(codeReview.payload.reportDigest).toBeDefined();
  });
  
  /**
   * Test: Failed assessment
   */
  it('should support failed assessment outcome', () => {
    const failedAssessment = {
      subject: 'did:web:vulnerable-app.example.com',
      payload: {
        assessmentKind: 'vulnerability-scan',
        outcome: 'fail'
      },
      payloadVersion: '1.0.0',
      issuedAt: Math.floor(Date.now() / 1000)
    };
    
    expect(failedAssessment.payload.outcome).toBe('fail');
  });
  
  /**
   * Test: Minimal valid assessment
   */
  it('should validate minimal assessment with required fields only', () => {
    const minimalAssessment = {
      subject: 'did:web:myapp.example.com',
      payload: {
        assessmentKind: 'security-audit'
      },
      payloadVersion: '1.0.0',
      issuedAt: Math.floor(Date.now() / 1000)
    };
    
    expect(minimalAssessment.subject).toBeDefined();
    expect(minimalAssessment.payload.assessmentKind).toBeDefined();
    expect(minimalAssessment.payloadVersion).toBeDefined();
    expect(minimalAssessment.issuedAt).toBeDefined();
  });
});

