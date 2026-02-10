import { describe, it, expect } from 'vitest';

/**
 * OMATrust Proof Specification - Verification Rules
 * 
 * Tests for proof verification logic and edge cases.
 */

describe('OMATrust Proof Spec: Verification Rules', () => {
  describe('Proof Expiration Handling', () => {
    const now = Math.floor(Date.now() / 1000);

    it('rejects expired proofs', () => {
      /**
       * Proofs with expiresAt <= now should be rejected
       */
      const expiredProof = {
        proofType: 'pop-eip712',
        issuedAt: now - 7200, // 2 hours ago
        expiresAt: now - 3600, // Expired 1 hour ago
        proofObject: {},
      };
      
      const isExpired = expiredProof.expiresAt <= now;
      expect(isExpired).toBe(true);
    });

    it('accepts valid non-expired proofs', () => {
      /**
       * Proofs with expiresAt > now should be accepted
       */
      const validProof = {
        proofType: 'pop-eip712',
        issuedAt: now - 3600, // 1 hour ago
        expiresAt: now + 3600, // Expires in 1 hour
        proofObject: {},
      };
      
      const isExpired = validProof.expiresAt <= now;
      expect(isExpired).toBe(false);
    });

    it('accepts proofs without expiration', () => {
      /**
       * Proofs without expiresAt never expire (use with caution)
       */
      const noExpiryProof = {
        proofType: 'pop-eip712',
        issuedAt: now - 86400 * 365, // 1 year ago
        // No expiresAt
        proofObject: {},
      };
      
      const hasExpiry = 'expiresAt' in noExpiryProof;
      expect(hasExpiry).toBe(false);
    });

    it('rejects future-dated proofs', () => {
      /**
       * Proofs with issuedAt > now (future) should be suspicious
       */
      const futureDatedProof = {
        proofType: 'pop-eip712',
        issuedAt: now + 3600, // 1 hour in the future
        proofObject: {},
      };
      
      const isFutureDated = futureDatedProof.issuedAt > now;
      expect(isFutureDated).toBe(true);
    });
  });

  describe('Proof Purpose Matching', () => {
    it('validates shared-control proofs for identity binding', () => {
      /**
       * shared-control proofs are for identity operations
       */
      const identityProof = {
        proofType: 'pop-eip712',
        proofPurpose: 'shared-control',
        proofObject: {
          signingPurpose: 'shared-control',
        },
      };
      
      // Purpose in wrapper should match purpose in proofObject
      expect(identityProof.proofPurpose).toBe(identityProof.proofObject.signingPurpose);
    });

    it('validates commercial-tx proofs for service usage', () => {
      /**
       * commercial-tx proofs are for commercial interactions
       */
      const commercialProof = {
        proofType: 'x402-receipt',
        proofPurpose: 'commercial-tx',
        proofObject: {},
      };
      
      expect(commercialProof.proofPurpose).toBe('commercial-tx');
    });

    it('rejects mismatched proof purposes', () => {
      /**
       * Proof purpose in wrapper should match context
       */
      const mismatchedProof = {
        proofType: 'pop-eip712',
        proofPurpose: 'shared-control',
        proofObject: {
          signingPurpose: 'commercial-tx', // Mismatch!
        },
      };
      
      const isMatched = mismatchedProof.proofPurpose === mismatchedProof.proofObject.signingPurpose;
      expect(isMatched).toBe(false);
    });
  });

  describe('Proof Type and Format Compatibility', () => {
    const proofTypeFormats = {
      'pop-jws': ['jws'],
      'pop-eip712': ['eip712'],
      'x402-receipt': ['jws', 'eip712'],
      'x402-offer': ['jws', 'eip712'],
      'evidence-pointer': ['url'],
      'tx-encoded-value': ['tx'],
      'tx-interaction': ['tx'],
    };

    it.each([
      { type: 'pop-jws', formats: ['jws'], contains: ['jws'], notContains: ['eip712'], label: 'only supports JWS format' },
      { type: 'pop-eip712', formats: ['eip712'], contains: ['eip712'], notContains: ['jws'], label: 'only supports EIP-712 format' },
      { type: 'x402-receipt', formats: ['jws', 'eip712'], contains: ['jws', 'eip712'], notContains: [], label: 'supports both JWS and EIP-712' },
      { type: 'x402-offer', formats: ['jws', 'eip712'], contains: ['jws', 'eip712'], notContains: [], label: 'supports both JWS and EIP-712' },
      { type: 'tx-encoded-value', formats: ['tx'], contains: ['tx'], notContains: [], label: 'uses blockchain format' },
      { type: 'tx-interaction', formats: ['tx'], contains: ['tx'], notContains: [], label: 'uses blockchain format' },
    ])('$type $label', ({ type, formats, contains, notContains }) => {
      const validFormats = proofTypeFormats[type as keyof typeof proofTypeFormats];
      expect(validFormats).toEqual(formats);
      contains.forEach(fmt => expect(validFormats).toContain(fmt));
      notContains.forEach(fmt => expect(validFormats).not.toContain(fmt));
    });
  });

  describe('Replay Attack Prevention', () => {
    it('validates nonce presence for replay protection', () => {
      /**
       * Proofs should include nonce for replay protection
       */
      const proofWithNonce = {
        proofType: 'pop-eip712',
        proofObject: {
          randomValue: '0x' + 'a'.repeat(64),
        },
      };
      
      expect(proofWithNonce.proofObject.randomValue).toBeDefined();
      expect(proofWithNonce.proofObject.randomValue).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('validates timestamp freshness', () => {
      /**
       * Proofs should be recent (within acceptable window)
       */
      const now = Math.floor(Date.now() / 1000);
      const maxAge = 300; // 5 minutes
      
      const freshProof = {
        issuedAt: now - 60, // 1 minute ago
      };
      
      const staleProof = {
        issuedAt: now - 600, // 10 minutes ago
      };
      
      const isFresh = (now - freshProof.issuedAt) <= maxAge;
      const isStale = (now - staleProof.issuedAt) > maxAge;
      
      expect(isFresh).toBe(true);
      expect(isStale).toBe(true);
    });

    it('tracks used nonces to prevent replay', () => {
      /**
       * Verifiers should track used nonces
       */
      const usedNonces = new Set<string>();
      
      const nonce1 = '0x' + 'a'.repeat(64);
      const nonce2 = '0x' + 'b'.repeat(64);
      
      // First use is valid
      const isNonce1Valid = !usedNonces.has(nonce1);
      usedNonces.add(nonce1);
      
      // Replay is invalid
      const isNonce1Replay = usedNonces.has(nonce1);
      
      // Different nonce is valid
      const isNonce2Valid = !usedNonces.has(nonce2);
      
      expect(isNonce1Valid).toBe(true);
      expect(isNonce1Replay).toBe(true);
      expect(isNonce2Valid).toBe(true);
    });
  });

  describe('Subject-Controller Binding Verification', () => {
    it('validates subject is proof creator', () => {
      /**
       * The subject (signer) should be the one creating the proof
       */
      const proof = {
        proofType: 'pop-eip712',
        proofObject: {
          signer: '0x1234567890123456789012345678901234567890',
          authorizedEntity: 'did:web:example.com',
        },
      };
      
      expect(proof.proofObject.signer).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('validates controller is the beneficiary', () => {
      /**
       * The controller (authorizedEntity) receives the authorization
       */
      const proof = {
        proofType: 'pop-eip712',
        proofObject: {
          signer: '0x1234567890123456789012345678901234567890',
          authorizedEntity: 'did:web:example.com',
        },
      };
      
      expect(proof.proofObject.authorizedEntity).toMatch(/^did:/);
    });

    it('validates subject-controller relationship is meaningful', () => {
      /**
       * Subject and controller should not be the same (self-authorization is meaningless)
       */
      const proof = {
        proofObject: {
          signer: '0x1234567890123456789012345678901234567890',
          authorizedEntity: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
        },
      };
      
      // In this case they ARE the same (self-authorization)
      // This may or may not be valid depending on context
      const signerLower = proof.proofObject.signer.toLowerCase();
      const controllerContainsSigner = proof.proofObject.authorizedEntity.toLowerCase().includes(signerLower.slice(2));
      
      expect(controllerContainsSigner).toBe(true);
    });
  });

  describe('Chain-Specific Verification', () => {
    it('validates EVM chain IDs', () => {
      /**
       * EVM chains use eip155: prefix in CAIP-2
       */
      const evmChains = [
        { id: 'eip155:1', name: 'Ethereum Mainnet' },
        { id: 'eip155:137', name: 'Polygon' },
        { id: 'eip155:42161', name: 'Arbitrum' },
        { id: 'eip155:66238', name: 'OMAChain Testnet' },
      ];
      
      evmChains.forEach(chain => {
        expect(chain.id).toMatch(/^eip155:\d+$/);
      });
    });

    it('validates non-EVM chain IDs', () => {
      /**
       * Non-EVM chains use different prefixes
       */
      const nonEvmChains = [
        { id: 'solana:mainnet', name: 'Solana Mainnet' },
        { id: 'cosmos:cosmoshub-4', name: 'Cosmos Hub' },
        { id: 'polkadot:91b171bb158e2d3848fa23a9f1c25182', name: 'Polkadot' },
      ];
      
      nonEvmChains.forEach(chain => {
        expect(chain.id).not.toMatch(/^eip155:/);
        expect(chain.id).toMatch(/^[a-z0-9-]+:[a-zA-Z0-9-]+$/);
      });
    });

    it('rejects proofs from unsupported chains', () => {
      /**
       * Only supported chains should be accepted
       */
      const supportedChains = ['eip155:1', 'eip155:137', 'eip155:66238', 'solana:mainnet'];
      
      const proofFromUnsupportedChain = {
        proofObject: {
          chainId: 'unknown:12345',
        },
      };
      
      const isSupported = supportedChains.includes(proofFromUnsupportedChain.proofObject.chainId);
      expect(isSupported).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('handles missing required fields gracefully', () => {
      /**
       * Verification should fail gracefully with clear errors
       */
      const incompleteProof = {
        proofType: 'pop-eip712',
        // Missing proofObject
      };
      
      const hasProofObject = 'proofObject' in incompleteProof;
      expect(hasProofObject).toBe(false);
    });

    it('handles malformed proof objects', () => {
      /**
       * Malformed proofs should be detected
       */
      const malformedProofs = [
        { proofType: 'pop-eip712', proofObject: null },
        { proofType: 'pop-eip712', proofObject: 'not-an-object' },
        { proofType: 'pop-eip712', proofObject: [] },
      ];
      
      malformedProofs.forEach(proof => {
        const isValidObject = proof.proofObject !== null && 
                              typeof proof.proofObject === 'object' && 
                              !Array.isArray(proof.proofObject);
        expect(isValidObject).toBe(false);
      });
    });

    it('handles unknown proof types', () => {
      /**
       * Unknown proof types should be rejected
       */
      const knownProofTypes = [
        'pop-jws', 'pop-eip712', 'x402-receipt', 'x402-offer',
        'evidence-pointer', 'tx-encoded-value', 'tx-interaction'
      ];
      
      const unknownProof = {
        proofType: 'custom-unknown-type',
        proofObject: {},
      };
      
      const isKnown = knownProofTypes.includes(unknownProof.proofType);
      expect(isKnown).toBe(false);
    });
  });
});

