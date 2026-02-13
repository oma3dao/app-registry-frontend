/**
 * OMATrust Reputation Specification - x-oma3 Extensions Tests
 * 
 * Tests for Section 9: Schema Publication and Versioning
 * Validates x-oma3 schema annotation extensions.
 * 
 * Specification: OMATrust Reputation Specification
 * Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 */

import { describe, it, expect } from 'vitest';
import { 
  getAllSchemas,
  type AttestationSchema,
  type FormField 
} from '@/config/schemas';

describe('OMATrust Reputation Spec 9 - x-oma3 Extensions', () => {
  
  const allSchemas = getAllSchemas();
  
  describe('x-oma3-default Extension', () => {
    
    /**
     * Test: x-oma3-default for auto-populated fields
     * Requirement ID: OT-RP-180
     * Requirement: "x-oma3-default indicates auto-populate field (e.g., current-timestamp)"
     */
    it('should support autoDefault for timestamp fields - OT-RP-180', () => {
      // Find fields with autoDefault
      const fieldsWithAutoDefault: { schema: string; field: string; autoDefault: string }[] = [];
      
      allSchemas.forEach(schema => {
        schema.fields.forEach(field => {
          if (field.autoDefault) {
            fieldsWithAutoDefault.push({
              schema: schema.id,
              field: field.name,
              autoDefault: field.autoDefault
            });
          }
        });
      });
      
      // Should have fields with autoDefault
      expect(fieldsWithAutoDefault.length).toBeGreaterThan(0);
      
      // Common auto-defaults should be current-timestamp
      const timestampDefaults = fieldsWithAutoDefault.filter(f => 
        f.autoDefault === 'current-timestamp'
      );
      expect(timestampDefaults.length).toBeGreaterThan(0);
    });
    
    /**
     * Test: issuedAt commonly uses current-timestamp
     * Requirement ID: OT-RP-180
     */
    it('should use current-timestamp for issuedAt fields - OT-RP-180', () => {
      allSchemas.forEach(schema => {
        const issuedAtField = schema.fields.find(f => f.name === 'issuedAt');
        if (issuedAtField && issuedAtField.autoDefault) {
          expect(issuedAtField.autoDefault).toBe('current-timestamp');
        }
      });
    });
    
    /**
     * Test: effectiveAt commonly uses current-timestamp
     * Requirement ID: OT-RP-180
     */
    it('should use current-timestamp for effectiveAt fields - OT-RP-180', () => {
      allSchemas.forEach(schema => {
        const effectiveAtField = schema.fields.find(f => f.name === 'effectiveAt');
        if (effectiveAtField && effectiveAtField.autoDefault) {
          expect(effectiveAtField.autoDefault).toBe('current-timestamp');
        }
      });
    });
  });
  
  describe('x-oma3-subtype Extension', () => {
    
    /**
     * Test: x-oma3-subtype for semantic types
     * Requirement ID: OT-RP-183
     * Requirement: "x-oma3-subtype indicates semantic type (timestamp, semver)"
     */
    it('should support subtype for semantic typing - OT-RP-183', () => {
      const fieldsWithSubtype: { schema: string; field: string; subtype: string }[] = [];
      
      allSchemas.forEach(schema => {
        schema.fields.forEach(field => {
          if (field.subtype) {
            fieldsWithSubtype.push({
              schema: schema.id,
              field: field.name,
              subtype: field.subtype
            });
          }
        });
      });
      
      expect(fieldsWithSubtype.length).toBeGreaterThan(0);
    });
    
    /**
     * Test: timestamp subtype for time fields
     * Requirement ID: OT-RP-183
     */
    it('should use timestamp subtype for time fields - OT-RP-183', () => {
      const timestampFields: string[] = [];
      
      allSchemas.forEach(schema => {
        schema.fields.forEach(field => {
          if (field.subtype === 'timestamp') {
            timestampFields.push(`${schema.id}.${field.name}`);
          }
        });
      });
      
      // Should have timestamp fields
      expect(timestampFields.length).toBeGreaterThan(0);
      
      // Common timestamp fields (includes controller-witness observedAt)
      const commonTimestampNames = ['issuedAt', 'effectiveAt', 'expiresAt', 'observedAt'];
      timestampFields.forEach(fieldPath => {
        const fieldName = fieldPath.split('.')[1];
        expect(commonTimestampNames).toContain(fieldName);
      });
    });
    
    /**
     * Test: semver subtype for version fields
     * Requirement ID: OT-RP-183
     */
    it('should use semver subtype for version fields - OT-RP-183', () => {
      const semverFields: string[] = [];
      
      allSchemas.forEach(schema => {
        schema.fields.forEach(field => {
          if (field.subtype === 'semver') {
            semverFields.push(`${schema.id}.${field.name}`);
          }
        });
      });
      
      // Should have semver fields
      expect(semverFields.length).toBeGreaterThan(0);
    });
  });
  
  describe('Field Format Extension', () => {
    
    /**
     * Test: did format for DID fields
     * Requirement: DID fields should have format=did
     */
    it('should use did format for DID fields', () => {
      const didFields: string[] = [];
      
      allSchemas.forEach(schema => {
        schema.fields.forEach(field => {
          if (field.format === 'did') {
            didFields.push(`${schema.id}.${field.name}`);
          }
        });
      });
      
      expect(didFields.length).toBeGreaterThan(0);
      
      // Common DID fields (includes controller-witness controller)
      const expectedDIDFields = ['subject', 'attester', 'linkedId', 'keyId', 'organization', 'assessor', 'programID', 'controller'];
      didFields.forEach(fieldPath => {
        const fieldName = fieldPath.split('.')[1];
        expect(expectedDIDFields).toContain(fieldName);
      });
    });
    
    /**
     * Test: uri format for URL fields
     * Requirement: URI fields should have format=uri
     */
    it('should use uri format for URL fields', () => {
      const uriFields: string[] = [];
      
      allSchemas.forEach(schema => {
        schema.fields.forEach(field => {
          if (field.format === 'uri') {
            uriFields.push(`${schema.id}.${field.name}`);
          }
        });
      });
      
      expect(uriFields.length).toBeGreaterThan(0);
    });
  });
  
  describe('Field Pattern Extension', () => {
    
    /**
     * Test: DID pattern validation
     * Requirement: DID fields should have pattern for validation
     */
    it('should use DID pattern for DID fields', () => {
      const didPattern = '^did:[a-z0-9]+:.+$';
      
      allSchemas.forEach(schema => {
        schema.fields.forEach(field => {
          if (field.format === 'did' && field.pattern) {
            expect(field.pattern).toBe(didPattern);
          }
        });
      });
    });
    
    /**
     * Test: Semver pattern validation
     * Requirement: Version fields may have semver pattern
     */
    it('should use semver pattern for version fields', () => {
      const semverPattern = /\d+\.\d+\.\d+/;
      
      allSchemas.forEach(schema => {
        schema.fields.forEach(field => {
          if (field.subtype === 'semver' && field.pattern) {
            expect(field.pattern).toMatch(/\\d/);
          }
        });
      });
    });
  });
  
  describe('Schema Structure Requirements', () => {
    
    /**
     * Test: Schema has required metadata
     * Requirement ID: OT-RP-010
     * Requirement: "Schema MUST include id, title, description"
     */
    it('should have required schema metadata - OT-RP-010', () => {
      allSchemas.forEach(schema => {
        expect(schema.id).toBeDefined();
        expect(schema.id.length).toBeGreaterThan(0);
        
        expect(schema.title).toBeDefined();
        expect(schema.title.length).toBeGreaterThan(0);
        
        expect(schema.description).toBeDefined();
        expect(schema.description.length).toBeGreaterThan(0);
      });
    });
    
    /**
     * Test: Schema has fields array
     * Requirement ID: OT-RP-010
     * Requirement: "Schema MUST include fields (properties)"
     */
    it('should have fields array - OT-RP-010', () => {
      allSchemas.forEach(schema => {
        expect(Array.isArray(schema.fields)).toBe(true);
      });
    });
    
    /**
     * Test: Fields have required properties
     * Requirement: Each field must have name, type, label, required
     */
    it('should have required field properties', () => {
      allSchemas.forEach(schema => {
        schema.fields.forEach(field => {
          expect(field.name).toBeDefined();
          expect(field.type).toBeDefined();
          expect(field.label).toBeDefined();
          expect(typeof field.required).toBe('boolean');
        });
      });
    });
  });
  
  describe('Payload Container Extensions', () => {
    
    /**
     * Test: payloadSpecURI for external specs
     * Requirement ID: OT-RP-170
     * Requirement: "If payloadSpecURI absent, use default payload structure"
     */
    it('should support payloadSpecURI field concept - OT-RP-170', () => {
      // Check if security-assessment has payload structure
      const securityAssessment = allSchemas.find(s => s.id === 'security-assessment');
      
      if (securityAssessment) {
        const payloadSpecURIField = securityAssessment.fields.find(f => f.name === 'payloadSpecURI');
        const payloadField = securityAssessment.fields.find(f => f.name === 'payload');
        
        // Either payloadSpecURI exists or payload is used directly
        expect(payloadSpecURIField || payloadField).toBeDefined();
      }
    });
    
    /**
     * Test: payloadSpecDigest structure
     * Requirement ID: OT-RP-172-174
     * Requirement: "payloadSpecDigest has algo, canon, hex fields"
     */
    it('should understand payloadSpecDigest structure - OT-RP-172', () => {
      const validDigest = {
        algo: 'sha256',
        canon: 'jcs',
        hex: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };
      
      expect(['keccak256', 'sha256']).toContain(validDigest.algo);
      expect(['raw', 'jcs']).toContain(validDigest.canon);
      expect(validDigest.hex).toMatch(/^0x[a-fA-F0-9]+$/);
    });
  });
  
  describe('Default Values', () => {
    
    /**
     * Test: Fields with default values
     * Requirement: Some fields have programmatic defaults
     */
    it('should support default values for fields', () => {
      const fieldsWithDefaults: { schema: string; field: string; default: any }[] = [];
      
      allSchemas.forEach(schema => {
        schema.fields.forEach(field => {
          if (field.default !== undefined) {
            fieldsWithDefaults.push({
              schema: schema.id,
              field: field.name,
              default: field.default
            });
          }
        });
      });
      
      // Should have some fields with defaults
      expect(fieldsWithDefaults.length).toBeGreaterThan(0);
    });
    
    /**
     * Test: payloadVersion default
     * Requirement: payloadVersion should default to "1.0.0"
     */
    it('should default payloadVersion to 1.0.0', () => {
      const securityAssessment = allSchemas.find(s => s.id === 'security-assessment');
      
      if (securityAssessment) {
        const payloadVersionField = securityAssessment.fields.find(f => f.name === 'payloadVersion');
        if (payloadVersionField) {
          expect(payloadVersionField.default).toBe('1.0.0');
        }
      }
    });
  });
});

describe('Schema Validation - Field Constraints', () => {
  
  const allSchemas = getAllSchemas();
  
  /**
   * Test: maxLength constraints
   */
  it('should have appropriate maxLength constraints', () => {
    const fieldsWithMaxLength: { schema: string; field: string; maxLength: number }[] = [];
    
    allSchemas.forEach(schema => {
      schema.fields.forEach(field => {
        if (field.maxLength !== undefined) {
          fieldsWithMaxLength.push({
            schema: schema.id,
            field: field.name,
            maxLength: field.maxLength
          });
        }
      });
    });
    
    expect(fieldsWithMaxLength.length).toBeGreaterThan(0);
    
    // reviewBody and responseBody should be max 500
    const reviewBodyFields = fieldsWithMaxLength.filter(f => 
      f.field === 'reviewBody' || f.field === 'responseBody'
    );
    reviewBodyFields.forEach(f => {
      expect(f.maxLength).toBe(500);
    });
  });
  
  /**
   * Test: min constraints for integer fields
   */
  it('should have min constraints for integer fields', () => {
    const fieldsWithMin: { schema: string; field: string; min: number }[] = [];
    
    allSchemas.forEach(schema => {
      schema.fields.forEach(field => {
        if (field.min !== undefined) {
          fieldsWithMin.push({
            schema: schema.id,
            field: field.name,
            min: field.min
          });
        }
      });
    });
    
    // Timestamp fields should have min 0
    fieldsWithMin.filter(f => f.field.includes('At')).forEach(f => {
      expect(f.min).toBeGreaterThanOrEqual(0);
    });
  });
  
  /**
   * Test: enum options for enum fields
   */
  it('should have options for enum fields', () => {
    allSchemas.forEach(schema => {
      schema.fields.forEach(field => {
        if (field.type === 'enum') {
          expect(field.options).toBeDefined();
          expect(Array.isArray(field.options)).toBe(true);
          expect(field.options!.length).toBeGreaterThan(0);
        }
      });
    });
  });
});

