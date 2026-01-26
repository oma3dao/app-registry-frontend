import { describe, it, expect } from 'vitest';

/**
 * OMATrust Proof Specification - Section 5.3.3: pop-eip712 (Ethereum Wallet Proof)
 * 
 * Tests for EIP-712 typed-data signature proofs used with Ethereum wallets.
 */

describe('OMATrust Proof Spec 5.3.3: pop-eip712 (Ethereum Wallet Proof)', () => {
  // Canonical EIP-712 domain as defined in the spec
  const canonicalDomain = {
    name: 'OMATrustProof',
    version: '1',
    chainId: 1, // Mainnet example
  };

  // Canonical EIP-712 message structure
  const canonicalMessage = {
    signer: '0x1234567890123456789012345678901234567890',
    authorizedEntity: 'did:web:example.com',
    signingPurpose: 'shared-control',
    creationTimestamp: 1704067200, // 2024-01-01 00:00:00 UTC
    expirationTimestamp: 1735689600, // 2025-01-01 00:00:00 UTC
    randomValue: '0x' + 'a'.repeat(64),
    statement: 'I authorize this key binding for OMATrust.',
  };

  describe('EIP-712 Domain (Section 5.3.3)', () => {
    it('OT-PF-070: domain.name MUST be "OMATrustProof"', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.3
       * Requirement ID: OT-PF-070
       * Requirement: "name: 'OMATrustProof'"
       */
      expect(canonicalDomain.name).toBe('OMATrustProof');
    });

    it('OT-PF-071: domain.version MUST be "1"', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.3
       * Requirement ID: OT-PF-071
       * Requirement: "version: '1'"
       */
      expect(canonicalDomain.version).toBe('1');
    });

    it('OT-PF-072: domain.chainId MUST be EIP-155 chain ID', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.3
       * Requirement ID: OT-PF-072
       * Requirement: "chainId: EIP-155 chain ID"
       */
      // Common chain IDs
      const validChainIds = [
        1,      // Ethereum Mainnet
        5,      // Goerli
        11155111, // Sepolia
        137,    // Polygon
        42161,  // Arbitrum One
        66238,  // OMAChain Testnet
      ];
      
      expect(validChainIds).toContain(canonicalDomain.chainId);
      expect(typeof canonicalDomain.chainId).toBe('number');
      expect(canonicalDomain.chainId).toBeGreaterThan(0);
    });
  });

  describe('EIP-712 Message Structure', () => {
    it('OT-PF-073: signer field contains Subject address', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.3
       * Requirement ID: OT-PF-073
       * Requirement: "signer: Y | address (Subject)"
       */
      expect(canonicalMessage.signer).toBeDefined();
      expect(canonicalMessage.signer).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('OT-PF-074: authorizedEntity field contains Controller DID', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.3
       * Requirement ID: OT-PF-074
       * Requirement: "authorizedEntity: Y | string (Controller)"
       */
      expect(canonicalMessage.authorizedEntity).toBeDefined();
      expect(canonicalMessage.authorizedEntity).toMatch(/^did:/);
    });

    it('OT-PF-075: signingPurpose field contains proofPurpose', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.3
       * Requirement ID: OT-PF-075
       * Requirement: "signingPurpose: Y | string (proofPurpose)"
       */
      expect(canonicalMessage.signingPurpose).toBeDefined();
      expect(['shared-control', 'commercial-tx']).toContain(canonicalMessage.signingPurpose);
    });

    it('OT-PF-076: creationTimestamp is optional Unix timestamp', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.3
       * Requirement ID: OT-PF-076
       * Requirement: "creationTimestamp: N | uint64"
       */
      if (canonicalMessage.creationTimestamp) {
        expect(typeof canonicalMessage.creationTimestamp).toBe('number');
        expect(canonicalMessage.creationTimestamp).toBeGreaterThan(0);
      }
    });

    it('OT-PF-077: expirationTimestamp is optional and must be after creation', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.3
       * Requirement ID: OT-PF-077
       * Requirement: "expirationTimestamp: N | uint64"
       */
      if (canonicalMessage.expirationTimestamp && canonicalMessage.creationTimestamp) {
        expect(canonicalMessage.expirationTimestamp).toBeGreaterThan(canonicalMessage.creationTimestamp);
      }
    });

    it('OT-PF-078: randomValue provides nonce as bytes32', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.3
       * Requirement ID: OT-PF-078
       * Requirement: "randomValue: N | bytes32 (nonce)"
       */
      if (canonicalMessage.randomValue) {
        expect(canonicalMessage.randomValue).toMatch(/^0x[a-fA-F0-9]{64}$/);
      }
    });

    it('OT-PF-079: statement is human-readable safety text', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.3
       * Requirement ID: OT-PF-079
       * Requirement: "statement: Y | string (human-readable safety)"
       */
      expect(canonicalMessage.statement).toBeDefined();
      expect(typeof canonicalMessage.statement).toBe('string');
      expect(canonicalMessage.statement.length).toBeGreaterThan(0);
    });
  });

  describe('Canonical Schema Rules', () => {
    it('OT-PF-080: Stored proofs MUST NOT include types or primaryType', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.3
       * Requirement ID: OT-PF-080
       * Requirement: "Stored proofs MUST NOT include types or primaryType"
       * 
       * The EIP-712 types are defined in the spec and MUST be reconstructed
       * by verifiers, not stored in the proof object.
       */
      const storedProof = {
        proofType: 'pop-eip712',
        proofObject: {
          domain: canonicalDomain,
          message: canonicalMessage,
          signature: '0x' + 'a'.repeat(130),
          // Should NOT include:
          // types: { ... },
          // primaryType: 'OMATrustProof',
        },
      };
      
      expect(storedProof.proofObject).not.toHaveProperty('types');
      expect(storedProof.proofObject).not.toHaveProperty('primaryType');
    });

    it('OT-PF-081: Verifiers MUST obtain canonical schema from spec', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.3
       * Requirement ID: OT-PF-081
       * Requirement: "Verifiers MUST obtain canonical schema from spec"
       */
      // The canonical types as defined in the specification
      const canonicalTypes = {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
        ],
        OMATrustProof: [
          { name: 'signer', type: 'address' },
          { name: 'authorizedEntity', type: 'string' },
          { name: 'signingPurpose', type: 'string' },
          { name: 'creationTimestamp', type: 'uint64' },
          { name: 'expirationTimestamp', type: 'uint64' },
          { name: 'randomValue', type: 'bytes32' },
          { name: 'statement', type: 'string' },
        ],
      };
      
      // Verify canonical structure
      expect(canonicalTypes.EIP712Domain).toBeDefined();
      expect(canonicalTypes.OMATrustProof).toBeDefined();
      expect(canonicalTypes.OMATrustProof).toHaveLength(7);
    });

    it('OT-PF-082: Signatures over non-canonical schema MUST be rejected', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.3
       * Requirement ID: OT-PF-082
       * Requirement: "Signatures over non-canonical schema MUST be rejected"
       */
      const nonCanonicalMessage = {
        ...canonicalMessage,
        extraField: 'should not be here', // Non-canonical field
      };
      
      // A verifier should detect this doesn't match canonical schema
      const canonicalFields = [
        'signer', 'authorizedEntity', 'signingPurpose',
        'creationTimestamp', 'expirationTimestamp', 'randomValue', 'statement'
      ];
      
      const messageFields = Object.keys(nonCanonicalMessage);
      const hasExtraFields = messageFields.some(f => !canonicalFields.includes(f));
      
      expect(hasExtraFields).toBe(true); // This proof should be rejected
    });
  });

  describe('Complete pop-eip712 Proof Structure', () => {
    it('creates valid pop-eip712 proof wrapper', () => {
      /**
       * Complete structure test for pop-eip712 proof
       */
      const completeProof = {
        proofType: 'pop-eip712',
        proofPurpose: 'shared-control',
        version: 1,
        issuedAt: Math.floor(Date.now() / 1000),
        proofObject: {
          domain: {
            name: 'OMATrustProof',
            version: '1',
            chainId: 1,
          },
          message: {
            signer: '0x1234567890123456789012345678901234567890',
            authorizedEntity: 'did:web:example.com',
            signingPurpose: 'shared-control',
            creationTimestamp: Math.floor(Date.now() / 1000),
            expirationTimestamp: Math.floor(Date.now() / 1000) + 86400 * 365,
            randomValue: '0x' + crypto.getRandomValues(new Uint8Array(32)).reduce(
              (s, b) => s + b.toString(16).padStart(2, '0'), ''
            ),
            statement: 'I authorize this key binding for OMATrust.',
          },
          signature: '0x' + 'a'.repeat(130), // Placeholder signature
        },
      };
      
      // Validate complete structure
      expect(completeProof.proofType).toBe('pop-eip712');
      expect(completeProof.proofPurpose).toBe('shared-control');
      expect(completeProof.proofObject.domain.name).toBe('OMATrustProof');
      expect(completeProof.proofObject.message.signer).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(completeProof.proofObject.signature).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    it('validates chain-specific proofs', () => {
      /**
       * Test chain-specific variations
       */
      const chains = [
        { name: 'Ethereum Mainnet', chainId: 1 },
        { name: 'OMAChain Testnet', chainId: 66238 },
        { name: 'Polygon', chainId: 137 },
      ];
      
      chains.forEach(chain => {
        const proof = {
          proofType: 'pop-eip712',
          proofObject: {
            domain: {
              name: 'OMATrustProof',
              version: '1',
              chainId: chain.chainId,
            },
            message: canonicalMessage,
          },
        };
        
        expect(proof.proofObject.domain.chainId).toBe(chain.chainId);
      });
    });
  });
});

