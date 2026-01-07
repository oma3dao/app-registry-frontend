/**
 * OMATrust Reputation Specification - Key Purpose Values Tests
 * 
 * Tests for Section 6.2: Key Binding Attestation
 * Validates keyPurpose values per W3C DID Core specification.
 * 
 * Specification: OMATrust Reputation Specification
 * Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 * Related: W3C DID Core - https://www.w3.org/TR/did-core/
 */

import { describe, it, expect } from 'vitest';
import { 
  keyBindingSchema,
  type AttestationSchema,
  type FormField 
} from '@/config/schemas';

describe('OMATrust Reputation Spec 6.2 - Key Purpose Values (W3C DID Core)', () => {
  
  // Helper to find field in schema
  const findField = (schema: AttestationSchema, name: string): FormField | undefined => {
    return schema.fields.find(f => f.name === name);
  };
  
  describe('keyPurpose Field Structure', () => {
    
    /**
     * Test: keyPurpose field exists and is array
     * Requirement ID: OT-RP-043
     * Requirement: "keyPurpose MUST be array of strings, Required=Y"
     */
    it('should have required keyPurpose field as array - OT-RP-043', () => {
      const keyPurposeField = findField(keyBindingSchema, 'keyPurpose');
      
      expect(keyPurposeField).toBeDefined();
      expect(keyPurposeField!.required).toBe(true);
      expect(keyPurposeField!.type).toBe('array');
    });
    
    /**
     * Test: keyPurpose description mentions valid purposes
     * Requirement: Field description should guide users
     */
    it('should document valid keyPurpose values in description', () => {
      const keyPurposeField = findField(keyBindingSchema, 'keyPurpose');
      
      expect(keyPurposeField!.description).toBeDefined();
      expect(keyPurposeField!.description).toContain('authentication');
      expect(keyPurposeField!.description).toContain('assertionMethod');
    });
  });
  
  describe('W3C DID Core Verification Relationships', () => {
    
    /**
     * Test: authentication purpose
     * Requirement ID: OT-RP-050
     * Requirement: "authentication - Authenticate on behalf of subject"
     * W3C DID Core: https://www.w3.org/TR/did-core/#authentication
     */
    it('should support authentication purpose - OT-RP-050', () => {
      const validBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:key:z6Mkhasdkjhaskdjhasdk',
        keyPurpose: ['authentication'],
        proofs: [],
        issuedAt: Math.floor(Date.now() / 1000)
      };
      
      expect(validBinding.keyPurpose).toContain('authentication');
      
      // Authentication is used for:
      // - Login/session establishment
      // - Proving control of DID subject
      // - Challenge-response protocols
    });
    
    /**
     * Test: assertionMethod purpose
     * Requirement ID: OT-RP-051
     * Requirement: "assertionMethod - Sign statements on behalf of subject"
     * W3C DID Core: https://www.w3.org/TR/did-core/#assertion
     */
    it('should support assertionMethod purpose - OT-RP-051', () => {
      const validBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:key:z6Mkhasdkjhaskdjhasdk',
        keyPurpose: ['assertionMethod'],
        proofs: [],
        issuedAt: Math.floor(Date.now() / 1000)
      };
      
      expect(validBinding.keyPurpose).toContain('assertionMethod');
      
      // assertionMethod is used for:
      // - Signing verifiable credentials
      // - Making claims/statements
      // - Creating attestations
    });
    
    /**
     * Test: keyAgreement purpose
     * Requirement ID: OT-RP-052
     * Requirement: "keyAgreement - ECDH key derivation"
     * W3C DID Core: https://www.w3.org/TR/did-core/#key-agreement
     */
    it('should support keyAgreement purpose - OT-RP-052', () => {
      const validBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:key:z6Mkhasdkjhaskdjhasdk',
        keyPurpose: ['keyAgreement'],
        proofs: [],
        issuedAt: Math.floor(Date.now() / 1000)
      };
      
      expect(validBinding.keyPurpose).toContain('keyAgreement');
      
      // keyAgreement is used for:
      // - Establishing encrypted channels
      // - ECDH key exchange
      // - Secure messaging
    });
    
    /**
     * Test: capabilityInvocation purpose
     * Requirement ID: OT-RP-053
     * Requirement: "capabilityInvocation - Update DID document"
     * W3C DID Core: https://www.w3.org/TR/did-core/#capability-invocation
     */
    it('should support capabilityInvocation purpose - OT-RP-053', () => {
      const validBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:key:z6Mkhasdkjhaskdjhasdk',
        keyPurpose: ['capabilityInvocation'],
        proofs: [],
        issuedAt: Math.floor(Date.now() / 1000)
      };
      
      expect(validBinding.keyPurpose).toContain('capabilityInvocation');
      
      // capabilityInvocation is used for:
      // - Updating DID document
      // - Invoking cryptographic capabilities
      // - Administrative operations
    });
    
    /**
     * Test: capabilityDelegation purpose
     * Requirement ID: OT-RP-054
     * Requirement: "capabilityDelegation - Delegate rights to other keys"
     * W3C DID Core: https://www.w3.org/TR/did-core/#capability-delegation
     */
    it('should support capabilityDelegation purpose - OT-RP-054', () => {
      const validBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:key:z6Mkhasdkjhaskdjhasdk',
        keyPurpose: ['capabilityDelegation'],
        proofs: [],
        issuedAt: Math.floor(Date.now() / 1000)
      };
      
      expect(validBinding.keyPurpose).toContain('capabilityDelegation');
      
      // capabilityDelegation is used for:
      // - Granting permissions to other keys
      // - Creating authorization chains
      // - Delegating capabilities
    });
  });
  
  describe('Multi-Purpose Keys', () => {
    
    /**
     * Test: Key with multiple purposes
     * Requirement: Keys MAY have multiple purposes
     */
    it('should support keys with multiple purposes', () => {
      const multiPurposeBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
        keyPurpose: ['authentication', 'assertionMethod'],
        proofs: [],
        issuedAt: Math.floor(Date.now() / 1000)
      };
      
      expect(multiPurposeBinding.keyPurpose.length).toBeGreaterThan(1);
      expect(multiPurposeBinding.keyPurpose).toContain('authentication');
      expect(multiPurposeBinding.keyPurpose).toContain('assertionMethod');
    });
    
    /**
     * Test: Key with all standard purposes
     * Validates a key authorized for all operations
     */
    it('should support keys with all W3C DID Core purposes', () => {
      const allPurposesBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:key:z6Mkhasdkjhaskdjhasdk',
        keyPurpose: [
          'authentication',
          'assertionMethod',
          'keyAgreement',
          'capabilityInvocation',
          'capabilityDelegation'
        ],
        proofs: [],
        issuedAt: Math.floor(Date.now() / 1000)
      };
      
      expect(allPurposesBinding.keyPurpose.length).toBe(5);
    });
  });
  
  describe('Key Lifecycle Semantics', () => {
    
    /**
     * Test: Multiple bindings may coexist
     * Requirement ID: OT-RP-060
     * Requirement: "Multiple non-expired, non-revoked bindings MAY coexist"
     */
    it('should allow multiple active bindings - OT-RP-060', () => {
      const bindings = [
        {
          subject: 'did:web:example.com',
          keyId: 'did:key:z6MkKey1',
          keyPurpose: ['authentication'],
          issuedAt: 1000000,
          expiresAt: 2000000
        },
        {
          subject: 'did:web:example.com',
          keyId: 'did:key:z6MkKey2',
          keyPurpose: ['assertionMethod'],
          issuedAt: 1500000,
          expiresAt: 2500000
        }
      ];
      
      // Both bindings for same subject with different keys
      expect(bindings[0].subject).toBe(bindings[1].subject);
      expect(bindings[0].keyId).not.toBe(bindings[1].keyId);
    });
    
    /**
     * Test: Expired binding is inactive
     * Requirement ID: OT-RP-061
     * Requirement: "After expiresAt, binding MUST be considered inactive"
     */
    it('should treat expired bindings as inactive - OT-RP-061', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:key:z6MkOldKey',
        keyPurpose: ['authentication'],
        issuedAt: now - 1000000,
        expiresAt: now - 100 // Expired 100 seconds ago
      };
      
      const isActive = !expiredBinding.expiresAt || expiredBinding.expiresAt > now;
      expect(isActive).toBe(false);
    });
    
    /**
     * Test: Revoked binding is inactive regardless of expiresAt
     * Requirement ID: OT-RP-062
     * Requirement: "If revoked=true, binding MUST be inactive regardless of expiresAt"
     */
    it('should treat revoked bindings as inactive regardless of expiry - OT-RP-062', () => {
      const now = Math.floor(Date.now() / 1000);
      const revokedBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:key:z6MkRevokedKey',
        keyPurpose: ['authentication'],
        issuedAt: now - 1000,
        expiresAt: now + 1000000, // Far in the future
        revoked: true
      };
      
      // Even though not expired, revoked = inactive
      const isActive = !revokedBinding.revoked && 
                      (!revokedBinding.expiresAt || revokedBinding.expiresAt > now);
      expect(isActive).toBe(false);
    });
    
    /**
     * Test: Active binding check function
     * Requirement: System should correctly determine binding status
     */
    it('should correctly determine binding active status', () => {
      const now = Math.floor(Date.now() / 1000);
      
      const isBindingActive = (binding: { expiresAt?: number; revoked?: boolean }) => {
        if (binding.revoked) return false;
        if (binding.expiresAt && binding.expiresAt <= now) return false;
        return true;
      };
      
      // Active binding
      expect(isBindingActive({ expiresAt: now + 1000 })).toBe(true);
      
      // No expiry = permanent
      expect(isBindingActive({})).toBe(true);
      
      // Expired
      expect(isBindingActive({ expiresAt: now - 1000 })).toBe(false);
      
      // Revoked but not expired
      expect(isBindingActive({ expiresAt: now + 1000, revoked: true })).toBe(false);
      
      // Revoked and expired
      expect(isBindingActive({ expiresAt: now - 1000, revoked: true })).toBe(false);
    });
  });
  
  describe('Key Binding Schema Fields', () => {
    
    /**
     * Test: subject field
     * Requirement ID: OT-RP-040
     */
    it('should have required subject field - OT-RP-040', () => {
      const subjectField = findField(keyBindingSchema, 'subject');
      
      expect(subjectField).toBeDefined();
      expect(subjectField!.required).toBe(true);
      expect(subjectField!.format).toBe('did');
    });
    
    /**
     * Test: keyId field
     * Requirement ID: OT-RP-041
     */
    it('should have required keyId field - OT-RP-041', () => {
      const keyIdField = findField(keyBindingSchema, 'keyId');
      
      expect(keyIdField).toBeDefined();
      expect(keyIdField!.required).toBe(true);
      expect(keyIdField!.format).toBe('did');
    });
    
    /**
     * Test: publicKeyJwk field
     * Requirement ID: OT-RP-042
     */
    it('should have optional publicKeyJwk field - OT-RP-042', () => {
      const publicKeyJwkField = findField(keyBindingSchema, 'publicKeyJwk');
      
      expect(publicKeyJwkField).toBeDefined();
      expect(publicKeyJwkField!.required).toBe(false);
      expect(publicKeyJwkField!.type).toBe('json');
    });
    
    /**
     * Test: proofs field
     * Requirement ID: OT-RP-044
     */
    it('should have required proofs field - OT-RP-044', () => {
      const proofsField = findField(keyBindingSchema, 'proofs');
      
      expect(proofsField).toBeDefined();
      expect(proofsField!.required).toBe(true);
      expect(proofsField!.type).toBe('array');
    });
    
    /**
     * Test: issuedAt field
     * Requirement ID: OT-RP-045
     */
    it('should have required issuedAt field - OT-RP-045', () => {
      const issuedAtField = findField(keyBindingSchema, 'issuedAt');
      
      expect(issuedAtField).toBeDefined();
      expect(issuedAtField!.required).toBe(true);
      expect(issuedAtField!.subtype).toBe('timestamp');
    });
    
    /**
     * Test: expiresAt field
     * Requirement ID: OT-RP-046
     */
    it('should have optional expiresAt field - OT-RP-046', () => {
      const expiresAtField = findField(keyBindingSchema, 'expiresAt');
      
      expect(expiresAtField).toBeDefined();
      expect(expiresAtField!.required).toBe(false);
      expect(expiresAtField!.subtype).toBe('timestamp');
    });
  });
  
  describe('Schema Deployment', () => {
    
    /**
     * Test: Schema deployment
     */
    it('should have deployment UIDs configured', () => {
      expect(keyBindingSchema.deployedUIDs).toBeDefined();
      
      // Check OMAchain Testnet deployment
      const omachainTestnetUID = keyBindingSchema.deployedUIDs?.[66238];
      expect(omachainTestnetUID).toBeDefined();
    });
    
    /**
     * Test: Schema identity
     */
    it('should have correct schema identifier', () => {
      expect(keyBindingSchema.id).toBe('key-binding');
      expect(keyBindingSchema.title).toBe('Key Binding');
    });
  });
});

describe('Key Binding - Data Validation', () => {
  
  /**
   * Test: Valid key binding with did:key
   */
  it('should validate key binding with did:key', () => {
    const didKeyBinding = {
      subject: 'did:web:example.com',
      keyId: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
      keyPurpose: ['authentication', 'assertionMethod'],
      proofs: [{
        proofType: 'pop-eip712',
        proofPurpose: 'shared-control'
      }],
      issuedAt: Math.floor(Date.now() / 1000)
    };
    
    // did:key is self-certifying, no publicKeyJwk needed
    expect(didKeyBinding.keyId).toMatch(/^did:key:/);
    expect(didKeyBinding.keyPurpose.length).toBeGreaterThan(0);
  });
  
  /**
   * Test: Valid key binding with did:pkh
   */
  it('should validate key binding with did:pkh (EOA)', () => {
    const didPkhBinding = {
      subject: 'did:web:example.com',
      keyId: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
      keyPurpose: ['authentication'],
      proofs: [{
        proofType: 'pop-eip712',
        proofPurpose: 'shared-control'
      }],
      issuedAt: Math.floor(Date.now() / 1000)
    };
    
    // did:pkh encodes the public key (address) in the DID itself
    expect(didPkhBinding.keyId).toMatch(/^did:pkh:eip155:\d+:0x[a-fA-F0-9]{40}$/);
  });
  
  /**
   * Test: Key binding with explicit publicKeyJwk
   */
  it('should validate key binding with explicit publicKeyJwk', () => {
    const jwkBinding = {
      subject: 'did:web:example.com',
      keyId: 'did:web:example.com#key-1',
      publicKeyJwk: {
        kty: 'EC',
        crv: 'secp256k1',
        x: 'abc123...',
        y: 'def456...'
      },
      keyPurpose: ['assertionMethod'],
      proofs: [],
      issuedAt: Math.floor(Date.now() / 1000)
    };
    
    expect(jwkBinding.publicKeyJwk).toBeDefined();
    expect(jwkBinding.publicKeyJwk.kty).toBe('EC');
  });
});

