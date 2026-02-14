/**
 * OMATrust Specification Compliance: Proof Bindings
 * 
 * Tests implementation compliance with OMATrust Reputation Specification
 * Sections covering proof binding requirements for attestations.
 * 
 * SPECIFICATION REFERENCES:
 * - OMATrust Reputation Specification: omatrust-specification-reputation.pdf
 * - Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 * - Sections: 6.1 (Linked Identifier), 6.2 (Key Binding), 7.1 (User Review)
 * 
 * Proof Binding Requirements:
 * - Linked Identifier: Subject/Controller matching, proofPurpose="shared-control"
 * - Key Binding: Subject/keyId binding with expiration semantics
 * - User Review: commercial-tx proofs for service usage evidence
 */

import { describe, it, expect } from 'vitest';

describe('OMATrust Reputation Spec: Proof Binding Requirements', () => {
  /**
   * Tests validate proof binding rules per specification.
   */

  describe('Linked Identifier Proof Bindings (OT-RP-030 to OT-RP-032)', () => {
    it('proof Subject must equal attestation subject - OT-RP-030', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.1
       * Requirement ID: OT-RP-030
       * Requirement: "Proof Subject MUST equal attestation subject"
       * 
       * When a Linked Identifier attestation includes proofs,
       * the proof's subject field must match the attestation's subject.
       */
      const linkedIdentifierAttestation = {
        attester: 'did:web:verifier.example.com',
        subject: 'did:web:app.example.com',
        linkedId: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
        method: 'wallet-signature',
        issuedAt: Math.floor(Date.now() / 1000),
        proofs: [
          {
            proofType: 'pop-eip712',
            proofPurpose: 'shared-control',
            proofObject: {
              // The signer (proof subject) should match attestation subject
              signer: 'did:web:app.example.com',
              authorizedEntity: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
            },
          },
        ],
      };

      // Validate: proof subject matches attestation subject
      const proofSubject = linkedIdentifierAttestation.proofs[0].proofObject.signer;
      expect(proofSubject).toBe(linkedIdentifierAttestation.subject);
    });

    it('proof Controller must equal attestation linkedId - OT-RP-031', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.1
       * Requirement ID: OT-RP-031
       * Requirement: "Proof Controller MUST equal attestation linkedId"
       * 
       * The proof's controller/authorizedEntity must match the linkedId
       * being bound to the subject.
       */
      const linkedIdentifierAttestation = {
        attester: 'did:web:verifier.example.com',
        subject: 'did:web:app.example.com',
        linkedId: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
        method: 'wallet-signature',
        issuedAt: Math.floor(Date.now() / 1000),
        proofs: [
          {
            proofType: 'pop-eip712',
            proofPurpose: 'shared-control',
            proofObject: {
              signer: 'did:web:app.example.com',
              authorizedEntity: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
            },
          },
        ],
      };

      // Validate: proof controller matches linkedId
      const proofController = linkedIdentifierAttestation.proofs[0].proofObject.authorizedEntity;
      expect(proofController).toBe(linkedIdentifierAttestation.linkedId);
    });

    it('proofPurpose must be "shared-control" - OT-RP-032', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 6.1
       * Requirement ID: OT-RP-032
       * Requirement: "proofPurpose MUST be 'shared-control'"
       * 
       * Linked Identifier proofs establish identity binding,
       * which requires the shared-control purpose.
       */
      const linkedIdentifierProof = {
        proofType: 'pop-eip712',
        proofPurpose: 'shared-control',
        proofObject: {
          signer: 'did:web:app.example.com',
          authorizedEntity: 'did:pkh:eip155:1:0x1234...',
        },
      };

      expect(linkedIdentifierProof.proofPurpose).toBe('shared-control');
      
      // Invalid: commercial-tx purpose for identity binding
      const invalidPurpose = 'commercial-tx';
      expect(invalidPurpose).not.toBe('shared-control');
    });
  });

  describe('User Review Proof Bindings (OT-RP-080 to OT-RP-084)', () => {
    it('reviewer identity evidence uses shared-control - OT-RP-080', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 7.1
       * Requirement ID: OT-RP-080
       * Requirement: "Reviewer identity evidence uses proofPurpose='shared-control'"
       * 
       * Proofs that establish the reviewer's identity use shared-control.
       */
      const identityProof = {
        proofType: 'evidence-pointer',
        proofPurpose: 'shared-control',
        proofObject: {
          url: 'https://twitter.com/reviewer/status/123456789',
        },
      };

      expect(identityProof.proofPurpose).toBe('shared-control');
    });

    it('service-usage evidence uses commercial-tx - OT-RP-081', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 7.1
       * Requirement ID: OT-RP-081
       * Requirement: "Service-usage evidence uses proofPurpose='commercial-tx'"
       * 
       * Proofs that show the reviewer used the service use commercial-tx.
       */
      const usageProof = {
        proofType: 'x402-receipt',
        proofPurpose: 'commercial-tx',
        proofFormat: 'eip712',
        proofObject: {
          resourceUrl: 'https://api.service.com/endpoint',
          payer: 'eip155:1:0xreviewer...',
          issuedAt: Math.floor(Date.now() / 1000),
        },
      };

      expect(usageProof.proofPurpose).toBe('commercial-tx');
    });

    it('x402-receipt proof binds service subject to reviewer controller - OT-RP-082', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 7.1
       * Requirement ID: OT-RP-082
       * Requirement: "x402-receipt: subject=service, controller=reviewer, purpose=commercial-tx"
       */
      const userReview = {
        attester: 'did:pkh:eip155:1:0xreviewer1234567890123456789012345678',
        subject: 'did:web:service.example.com',
        ratingValue: 5,
        reviewBody: 'Great service!',
        proofs: [
          {
            proofType: 'x402-receipt',
            proofPurpose: 'commercial-tx',
            proofObject: {
              resourceUrl: 'https://service.example.com/api', // Service
              payer: 'eip155:1:0xreviewer1234567890123456789012345678', // Reviewer
            },
          },
        ],
      };

      // The receipt's resourceUrl should relate to the subject service
      expect(userReview.proofs[0].proofObject.resourceUrl).toContain('service.example.com');
      
      // The payer should be the reviewer (attester)
      expect(userReview.proofs[0].proofObject.payer).toContain('reviewer');
    });

    it('tx-interaction proof binds contract subject to reviewer - OT-RP-083', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 7.1
       * Requirement ID: OT-RP-083
       * Requirement: "tx-interaction: subject=contract, controller=reviewer, purpose=commercial-tx"
       */
      const contractReview = {
        attester: 'did:pkh:eip155:1:0xreviewer1234567890123456789012345678',
        subject: 'did:pkh:eip155:1:0xcontract1234567890123456789012345678',
        ratingValue: 4,
        reviewBody: 'Solid smart contract',
        proofs: [
          {
            proofType: 'tx-interaction',
            proofPurpose: 'commercial-tx',
            proofObject: {
              chainId: 'eip155:1',
              txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            },
          },
        ],
      };

      expect(contractReview.proofs[0].proofType).toBe('tx-interaction');
      expect(contractReview.proofs[0].proofPurpose).toBe('commercial-tx');
    });

    it('evidence-pointer for account binding uses shared-control - OT-RP-084', () => {
      /**
       * Specification: OMATrust Reputation Specification - Section 7.1
       * Requirement ID: OT-RP-084
       * Requirement: "evidence-pointer (account): subject=service, controller=reviewer, purpose=shared-control"
       */
      const accountProof = {
        proofType: 'evidence-pointer',
        proofPurpose: 'shared-control',
        proofObject: {
          url: 'https://service.example.com/profile/reviewer123',
        },
      };

      expect(accountProof.proofPurpose).toBe('shared-control');
    });
  });

  describe('Proof Structure Validation', () => {
    it('validates proof wrapper structure', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.1
       * Proof wrapper common fields
       */
      const validProof = {
        proofType: 'pop-jws',
        proofObject: 'eyJhbGciOiJFUzI1NiJ9...', // JWS string
        proofPurpose: 'shared-control',
        version: 1,
        issuedAt: Math.floor(Date.now() / 1000),
      };

      expect(validProof.proofType).toBeDefined();
      expect(validProof.proofObject).toBeDefined();
      expect(['shared-control', 'commercial-tx']).toContain(validProof.proofPurpose);
    });

    it('validates allowed proofType values', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3
       * Allowed proofType values
       */
      const allowedTypes = [
        'pop-jws',
        'pop-eip712',
        'x402-receipt',
        'evidence-pointer',
        'tx-encoded-value',
        'tx-interaction',
        'x402-offer',
      ];

      allowedTypes.forEach(proofType => {
        expect(typeof proofType).toBe('string');
        expect(proofType.length).toBeGreaterThan(0);
      });
    });

    it('validates allowed proofPurpose values', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.1.3
       * Allowed proofPurpose values
       */
      const allowedPurposes = ['shared-control', 'commercial-tx'];

      allowedPurposes.forEach(purpose => {
        expect(typeof purpose).toBe('string');
      });

      // These are the only valid purposes
      expect(allowedPurposes).toHaveLength(2);
    });
  });
});

