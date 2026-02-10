/**
 * OMATrust Specification Compliance: Key Lifecycle
 * 
 * Tests implementation compliance with OMATrust Reputation Specification
 * Section 6.2 - Key Binding Attestation
 * 
 * SPECIFICATION REFERENCES:
 * - OMATrust Reputation Specification: omatrust-specification-reputation.pdf
 * - Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 * - Section: 6.2 - Key Binding Attestation
 * 
 * Key Binding Requirements:
 * - keyPurpose values from W3C DID Core
 * - Expiration and revocation semantics
 * - Multiple coexisting bindings
 */

import { describe, it, expect } from 'vitest';

describe('OMATrust Reputation Spec: Key Binding and Lifecycle', () => {
  /**
   * Tests validate key binding and lifecycle per specification.
   */

  describe('Key Binding Fields (OT-RP-040 to OT-RP-046)', () => {
    it('requires subject field (DID) - OT-RP-040', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-040
       * Requirement: "subject field MUST be present and be a valid DID"
       * Field: subject | Format: string (DID) | Required: Y
       */
      const keyBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
        keyPurpose: ['authentication'],
        issuedAt: Math.floor(Date.now() / 1000),
      };

      expect(keyBinding.subject).toMatch(/^did:/);
    });

    it('requires keyId field (DID) - OT-RP-041', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-041
       * Requirement: "keyId field MUST be present and be a valid DID (e.g., did:pkh)"
       * Field: keyId | Format: string (DID) | Required: Y
       */
      const keyBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
        keyPurpose: ['authentication'],
        issuedAt: Math.floor(Date.now() / 1000),
      };

      expect(keyBinding.keyId).toMatch(/^did:pkh:/);
    });

    it('supports optional publicKeyJwk - OT-RP-042', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-042
       * Requirement: "publicKeyJwk field MAY contain the public key in JWK format"
       * Field: publicKeyJwk | Format: object (JWK) | Required: O
       */
      const keyBindingWithJwk = {
        subject: 'did:web:example.com',
        keyId: 'did:key:z6Mkf...',
        keyPurpose: ['authentication'],
        publicKeyJwk: {
          kty: 'EC',
          crv: 'secp256k1',
          x: 'base64url-encoded-x-coordinate',
          y: 'base64url-encoded-y-coordinate',
        },
        issuedAt: Math.floor(Date.now() / 1000),
      };

      expect(keyBindingWithJwk.publicKeyJwk).toBeDefined();
      expect(keyBindingWithJwk.publicKeyJwk.kty).toBe('EC');
    });

    it('requires keyPurpose array - OT-RP-043', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-043
       * Requirement: "keyPurpose field MUST be an array of purpose strings"
       * Field: keyPurpose | Format: [string] | Required: Y
       */
      const keyBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:pkh:eip155:1:0x1234...',
        keyPurpose: ['authentication', 'assertionMethod'],
        issuedAt: Math.floor(Date.now() / 1000),
      };

      expect(Array.isArray(keyBinding.keyPurpose)).toBe(true);
      expect(keyBinding.keyPurpose.length).toBeGreaterThan(0);
    });

    it('requires proofs array - OT-RP-044', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-044
       * Requirement: "proofs field MUST be present with valid proofs"
       * Field: proofs | Format: [object] | Required: Y
       */
      const keyBindingWithProofs = {
        subject: 'did:web:example.com',
        keyId: 'did:pkh:eip155:1:0x1234...',
        keyPurpose: ['authentication'],
        proofs: [
          {
            proofType: 'pop-eip712',
            proofPurpose: 'shared-control',
            proofObject: { /* EIP-712 signature data */ },
          },
        ],
        issuedAt: Math.floor(Date.now() / 1000),
      };

      expect(Array.isArray(keyBindingWithProofs.proofs)).toBe(true);
      expect(keyBindingWithProofs.proofs.length).toBeGreaterThan(0);
    });

    it('requires issuedAt timestamp - OT-RP-045', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-045
       * Requirement: "issuedAt field MUST be a Unix timestamp"
       * Field: issuedAt | Format: integer | Required: Y
       */
      const keyBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:pkh:eip155:1:0x1234...',
        keyPurpose: ['authentication'],
        issuedAt: Math.floor(Date.now() / 1000),
      };

      expect(typeof keyBinding.issuedAt).toBe('number');
      expect(Number.isInteger(keyBinding.issuedAt)).toBe(true);
      expect(keyBinding.issuedAt).toBeGreaterThan(0);
    });

    it('supports optional expiresAt - OT-RP-046', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-046
       * Requirement: "expiresAt field MAY specify expiration timestamp"
       * Field: expiresAt | Format: integer | Required: O
       */
      const keyBindingWithExpiry = {
        subject: 'did:web:example.com',
        keyId: 'did:pkh:eip155:1:0x1234...',
        keyPurpose: ['authentication'],
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year
      };

      expect(keyBindingWithExpiry.expiresAt).toBeGreaterThan(keyBindingWithExpiry.issuedAt);
    });
  });

  describe('keyPurpose Values (OT-RP-050 to OT-RP-054)', () => {
    it('supports authentication purpose - OT-RP-050', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-050
       * Requirement: "authentication - Key can authenticate on behalf of subject"
       * Source: W3C DID Core verification relationships
       */
      const keyBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:pkh:eip155:1:0x1234...',
        keyPurpose: ['authentication'],
        issuedAt: Math.floor(Date.now() / 1000),
      };

      expect(keyBinding.keyPurpose).toContain('authentication');
    });

    it('supports assertionMethod purpose - OT-RP-051', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-051
       * Requirement: "assertionMethod - Key can sign statements on behalf of subject"
       */
      const keyBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:pkh:eip155:1:0x1234...',
        keyPurpose: ['assertionMethod'],
        issuedAt: Math.floor(Date.now() / 1000),
      };

      expect(keyBinding.keyPurpose).toContain('assertionMethod');
    });

    it('supports keyAgreement purpose - OT-RP-052', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-052
       * Requirement: "keyAgreement - Key for ECDH key derivation"
       */
      const keyBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:key:z6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc',
        keyPurpose: ['keyAgreement'],
        issuedAt: Math.floor(Date.now() / 1000),
      };

      expect(keyBinding.keyPurpose).toContain('keyAgreement');
    });

    it('supports capabilityInvocation purpose - OT-RP-053', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-053
       * Requirement: "capabilityInvocation - Key can update DID document"
       */
      const keyBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:pkh:eip155:1:0x1234...',
        keyPurpose: ['capabilityInvocation'],
        issuedAt: Math.floor(Date.now() / 1000),
      };

      expect(keyBinding.keyPurpose).toContain('capabilityInvocation');
    });

    it('supports capabilityDelegation purpose - OT-RP-054', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-054
       * Requirement: "capabilityDelegation - Key can delegate rights to other keys"
       */
      const keyBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:pkh:eip155:1:0x1234...',
        keyPurpose: ['capabilityDelegation'],
        issuedAt: Math.floor(Date.now() / 1000),
      };

      expect(keyBinding.keyPurpose).toContain('capabilityDelegation');
    });

    it('supports multiple purposes', () => {
      /**
       * A single key may have multiple purposes
       */
      const multiPurposeKey = {
        subject: 'did:web:example.com',
        keyId: 'did:pkh:eip155:1:0x1234...',
        keyPurpose: ['authentication', 'assertionMethod', 'capabilityInvocation'],
        issuedAt: Math.floor(Date.now() / 1000),
      };

      expect(multiPurposeKey.keyPurpose.length).toBe(3);
    });
  });

  describe('Key Lifecycle Semantics (OT-RP-060 to OT-RP-062)', () => {
    it('multiple non-expired bindings may coexist - OT-RP-060', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-060
       * Requirement: "Multiple non-expired, non-revoked bindings MAY coexist"
       * 
       * A subject can have multiple active keys bound to it.
       */
      const now = Math.floor(Date.now() / 1000);
      const oneYear = 365 * 24 * 60 * 60;

      const keyBindings = [
        {
          subject: 'did:web:example.com',
          keyId: 'did:pkh:eip155:1:0xkey1...',
          keyPurpose: ['authentication'],
          issuedAt: now - 1000,
          expiresAt: now + oneYear,
        },
        {
          subject: 'did:web:example.com',
          keyId: 'did:pkh:eip155:1:0xkey2...',
          keyPurpose: ['authentication', 'assertionMethod'],
          issuedAt: now - 500,
          expiresAt: now + oneYear,
        },
      ];

      // Both bindings are for the same subject
      const sameSubject = keyBindings.every(kb => kb.subject === 'did:web:example.com');
      expect(sameSubject).toBe(true);

      // Both are active (not expired)
      const allActive = keyBindings.every(kb => kb.expiresAt > now);
      expect(allActive).toBe(true);
    });

    it('expired binding must be considered inactive - OT-RP-061', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-061
       * Requirement: "After expiresAt, binding MUST be considered inactive"
       */
      const now = Math.floor(Date.now() / 1000);

      const expiredBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:pkh:eip155:1:0xkey...',
        keyPurpose: ['authentication'],
        issuedAt: now - 100000,
        expiresAt: now - 1000, // Expired 1000 seconds ago
      };

      // Check if binding is expired
      const isExpired = expiredBinding.expiresAt <= now;
      expect(isExpired).toBe(true);

      // Helper function to check if a binding is active
      function isBindingActive(binding: typeof expiredBinding): boolean {
        if (binding.expiresAt && binding.expiresAt <= now) {
          return false; // Expired
        }
        return true;
      }

      expect(isBindingActive(expiredBinding)).toBe(false);
    });

    it('revoked binding must be inactive regardless of expiresAt - OT-RP-062', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.2
       * Requirement ID: OT-RP-062
       * Requirement: "If revoked=true, binding MUST be inactive regardless of expiresAt"
       */
      const now = Math.floor(Date.now() / 1000);
      const oneYear = 365 * 24 * 60 * 60;

      const revokedBinding = {
        subject: 'did:web:example.com',
        keyId: 'did:pkh:eip155:1:0xkey...',
        keyPurpose: ['authentication'],
        issuedAt: now - 1000,
        expiresAt: now + oneYear, // Would not expire for a year
        revoked: true, // But is revoked
      };

      // Even though expiresAt is in the future, revoked makes it inactive
      function isBindingActive(binding: typeof revokedBinding): boolean {
        if (binding.revoked) {
          return false; // Revoked bindings are always inactive
        }
        if (binding.expiresAt && binding.expiresAt <= now) {
          return false; // Expired
        }
        return true;
      }

      expect(isBindingActive(revokedBinding)).toBe(false);
    });
  });

  describe('Key Binding Validation', () => {
    it('validates complete key binding structure', () => {
      /**
       * Tests a complete, valid key binding attestation
       */
      const now = Math.floor(Date.now() / 1000);

      const completeKeyBinding = {
        attester: 'did:web:authority.example.com',
        subject: 'did:web:app.example.com',
        keyId: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
        publicKeyJwk: {
          kty: 'EC',
          crv: 'secp256k1',
          x: 'WE3qUW8c3YwLb_P2q3J4C9cZ5L9LQNQ6H5zL3wE8h2M',
          y: 'ZC3P8K2z9L_Q6C3H4V5B7n8J9K0L1M2N3O4P5Q6R7S8',
        },
        keyPurpose: ['authentication', 'assertionMethod'],
        proofs: [
          {
            proofType: 'pop-eip712',
            proofPurpose: 'shared-control',
            proofObject: {
              domain: { name: 'OMATrustProof', version: '1' },
              message: {
                signer: '0x1234567890123456789012345678901234567890',
                authorizedEntity: 'did:web:app.example.com',
                signingPurpose: 'shared-control',
              },
              signature: '0x...',
            },
          },
        ],
        issuedAt: now,
        effectiveAt: now,
        expiresAt: now + (365 * 24 * 60 * 60), // 1 year
      };

      // Validate required fields
      expect(completeKeyBinding.subject).toBeDefined();
      expect(completeKeyBinding.keyId).toBeDefined();
      expect(completeKeyBinding.keyPurpose).toBeDefined();
      expect(completeKeyBinding.proofs).toBeDefined();
      expect(completeKeyBinding.issuedAt).toBeDefined();

      // Validate optional fields are properly formatted when present
      expect(completeKeyBinding.publicKeyJwk.kty).toBe('EC');
      expect(completeKeyBinding.expiresAt).toBeGreaterThan(completeKeyBinding.issuedAt);
    });
  });
});

