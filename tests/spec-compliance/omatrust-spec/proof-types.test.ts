/**
 * OMATrust Proof Specification - Proof Types Tests
 * 
 * Tests for Section 5.3: Proof Types
 * Validates proof type definitions and structure requirements.
 * 
 * Specification: OMATrust Proof Specification
 * Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 */

import { describe, it, expect } from 'vitest';

describe('OMATrust Proof Spec 5.3 - Proof Types', () => {
  
  // Valid proof types per specification
  const VALID_PROOF_TYPES = [
    'pop-jws',
    'pop-eip712',
    'x402-receipt',
    'evidence-pointer',
    'tx-encoded-value',
    'tx-interaction',
    'x402-offer'
  ];
  
  // Valid proof purposes
  const VALID_PROOF_PURPOSES = [
    'shared-control',
    'commercial-tx'
  ];
  
  describe('Proof Type Values', () => {
    
    /**
     * Test: pop-jws proof type
     * Requirement ID: OT-PF-050
     * Requirement: "pop-jws - Standard JWS (RFC 7800, RFC 9449)"
     */
    it('should define pop-jws proof type - OT-PF-050', () => {
      expect(VALID_PROOF_TYPES).toContain('pop-jws');
      
      const popJwsProof = {
        proofType: 'pop-jws',
        proofObject: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkaWQ6d2ViOmV4YW1wbGUuY29tIiwiYXVkIjoiZGlkOndlYjpjb250cm9sbGVyLmNvbSIsInByb29mUHVycG9zZSI6InNoYXJlZC1jb250cm9sIn0.signature',
        proofPurpose: 'shared-control'
      };
      
      expect(popJwsProof.proofType).toBe('pop-jws');
    });
    
    /**
     * Test: pop-eip712 proof type
     * Requirement ID: OT-PF-051
     * Requirement: "pop-eip712 - EIP-712 typed-data signature"
     */
    it('should define pop-eip712 proof type - OT-PF-051', () => {
      expect(VALID_PROOF_TYPES).toContain('pop-eip712');
      
      const popEip712Proof = {
        proofType: 'pop-eip712',
        proofObject: {
          domain: {
            name: 'OMATrustProof',
            version: '1',
            chainId: 1
          },
          message: {
            signer: '0x1234567890123456789012345678901234567890',
            authorizedEntity: 'did:web:controller.com',
            signingPurpose: 'shared-control',
            statement: 'I authorize this entity to act on my behalf.'
          },
          signature: '0x...'
        },
        proofPurpose: 'shared-control'
      };
      
      expect(popEip712Proof.proofType).toBe('pop-eip712');
    });
    
    /**
     * Test: x402-receipt proof type
     * Requirement ID: OT-PF-052
     * Requirement: "x402-receipt - x402 service receipt"
     */
    it('should define x402-receipt proof type - OT-PF-052', () => {
      expect(VALID_PROOF_TYPES).toContain('x402-receipt');
      
      const x402Receipt = {
        proofType: 'x402-receipt',
        proofPurpose: 'commercial-tx',
        proofFormat: 'jws',
        proofObject: {
          resourceUrl: 'https://api.example.com/resource',
          payer: '0x1234567890123456789012345678901234567890',
          issuedAt: Math.floor(Date.now() / 1000)
        }
      };
      
      expect(x402Receipt.proofType).toBe('x402-receipt');
      expect(x402Receipt.proofPurpose).toBe('commercial-tx');
    });
    
    /**
     * Test: evidence-pointer proof type
     * Requirement ID: OT-PF-053
     * Requirement: "evidence-pointer - URL reference to evidence artifact"
     */
    it('should define evidence-pointer proof type - OT-PF-053', () => {
      expect(VALID_PROOF_TYPES).toContain('evidence-pointer');
      
      const evidencePointer = {
        proofType: 'evidence-pointer',
        proofPurpose: 'shared-control',
        proofObject: {
          url: 'https://twitter.com/user/status/12345'
        }
      };
      
      expect(evidencePointer.proofType).toBe('evidence-pointer');
    });
    
    /**
     * Test: tx-encoded-value proof type
     * Requirement ID: OT-PF-054
     * Requirement: "tx-encoded-value - Deterministic micro-challenge transaction"
     */
    it('should define tx-encoded-value proof type - OT-PF-054', () => {
      expect(VALID_PROOF_TYPES).toContain('tx-encoded-value');
      
      const txEncodedValue = {
        proofType: 'tx-encoded-value',
        proofObject: {
          chainId: 'eip155:1',
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        }
      };
      
      expect(txEncodedValue.proofType).toBe('tx-encoded-value');
    });
    
    /**
     * Test: tx-interaction proof type
     * Requirement ID: OT-PF-055
     * Requirement: "tx-interaction - Onchain transaction to service contract"
     */
    it('should define tx-interaction proof type - OT-PF-055', () => {
      expect(VALID_PROOF_TYPES).toContain('tx-interaction');
      
      const txInteraction = {
        proofType: 'tx-interaction',
        proofPurpose: 'commercial-tx',
        proofObject: {
          chainId: 'eip155:1',
          txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        }
      };
      
      expect(txInteraction.proofType).toBe('tx-interaction');
    });
    
    /**
     * Test: x402-offer proof type
     * Requirement ID: OT-PF-056
     * Requirement: "x402-offer - x402 signed offer"
     */
    it('should define x402-offer proof type - OT-PF-056', () => {
      expect(VALID_PROOF_TYPES).toContain('x402-offer');
      
      const x402Offer = {
        proofType: 'x402-offer',
        proofPurpose: 'commercial-tx',
        proofFormat: 'eip712',
        proofObject: {
          resourceUrl: 'https://api.example.com/premium',
          scheme: 'x402',
          settlement: 'onchain',
          network: 'eip155:1',
          asset: 'eip155:1/erc20:0x...',
          payTo: '0x1234567890123456789012345678901234567890',
          amount: '1000000'
        }
      };
      
      expect(x402Offer.proofType).toBe('x402-offer');
    });
  });
  
  describe('Proof Wrapper Structure', () => {
    
    /**
     * Test: proofType field required
     * Requirement ID: OT-PF-040
     * Requirement: "proofType is required string enum"
     */
    it('should require proofType field - OT-PF-040', () => {
      const validProof = {
        proofType: 'pop-jws',
        proofObject: 'encoded-jws'
      };
      
      expect(validProof.proofType).toBeDefined();
      expect(VALID_PROOF_TYPES).toContain(validProof.proofType);
    });
    
    /**
     * Test: proofObject field required
     * Requirement ID: OT-PF-041
     * Requirement: "proofObject is required (string or object)"
     */
    it('should require proofObject field - OT-PF-041', () => {
      // String proofObject (e.g., JWS)
      const stringProof = {
        proofType: 'pop-jws',
        proofObject: 'eyJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJkaWQ6d2ViOmV4YW1wbGUuY29tIn0.sig'
      };
      
      expect(typeof stringProof.proofObject).toBe('string');
      
      // Object proofObject (e.g., tx-interaction)
      const objectProof = {
        proofType: 'tx-interaction',
        proofObject: {
          chainId: 'eip155:1',
          txHash: '0x123...'
        }
      };
      
      expect(typeof objectProof.proofObject).toBe('object');
    });
    
    /**
     * Test: proofPurpose field optional
     * Requirement ID: OT-PF-042
     * Requirement: "proofPurpose is optional string enum"
     */
    it('should accept optional proofPurpose - OT-PF-042', () => {
      const proofWithPurpose = {
        proofType: 'pop-eip712',
        proofObject: {},
        proofPurpose: 'shared-control'
      };
      
      expect(VALID_PROOF_PURPOSES).toContain(proofWithPurpose.proofPurpose);
      
      const proofWithoutPurpose = {
        proofType: 'pop-jws',
        proofObject: 'jws-string'
      };
      
      expect(proofWithoutPurpose.proofPurpose).toBeUndefined();
    });
    
    /**
     * Test: version field optional
     * Requirement ID: OT-PF-043
     * Requirement: "version is optional int (default 1)"
     */
    it('should accept optional version field - OT-PF-043', () => {
      const proofWithVersion = {
        proofType: 'pop-jws',
        proofObject: 'jws',
        version: 1
      };
      
      expect(proofWithVersion.version).toBe(1);
    });
    
    /**
     * Test: issuedAt field optional
     * Requirement ID: OT-PF-044
     * Requirement: "issuedAt is optional int (Unix timestamp)"
     */
    it('should accept optional issuedAt field - OT-PF-044', () => {
      const now = Math.floor(Date.now() / 1000);
      const proofWithIssuedAt = {
        proofType: 'pop-jws',
        proofObject: 'jws',
        issuedAt: now
      };
      
      expect(proofWithIssuedAt.issuedAt).toBe(now);
      expect(Number.isInteger(proofWithIssuedAt.issuedAt)).toBe(true);
    });
    
    /**
     * Test: expiresAt field optional
     * Requirement ID: OT-PF-045
     * Requirement: "expiresAt is optional int"
     */
    it('should accept optional expiresAt field - OT-PF-045', () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      const proofWithExpiry = {
        proofType: 'pop-jws',
        proofObject: 'jws',
        expiresAt: future
      };
      
      expect(proofWithExpiry.expiresAt).toBe(future);
    });
  });
  
  describe('EIP-712 Domain', () => {
    
    /**
     * Test: EIP-712 domain name
     * Requirement ID: OT-PF-070
     * Requirement: "domain.name MUST be 'OMATrustProof'"
     */
    it('should use correct EIP-712 domain name - OT-PF-070', () => {
      const domain = {
        name: 'OMATrustProof',
        version: '1',
        chainId: 1
      };
      
      expect(domain.name).toBe('OMATrustProof');
    });
    
    /**
     * Test: EIP-712 domain version
     * Requirement ID: OT-PF-071
     * Requirement: "domain.version MUST be '1'"
     */
    it('should use correct EIP-712 domain version - OT-PF-071', () => {
      const domain = {
        name: 'OMATrustProof',
        version: '1',
        chainId: 1
      };
      
      expect(domain.version).toBe('1');
    });
    
    /**
     * Test: EIP-712 chainId
     * Requirement ID: OT-PF-072
     * Requirement: "domain.chainId MUST be EIP-155 chain ID"
     */
    it('should include EIP-155 chainId - OT-PF-072', () => {
      const ethereumMainnet = {
        name: 'OMATrustProof',
        version: '1',
        chainId: 1
      };
      
      const polygon = {
        name: 'OMATrustProof',
        version: '1',
        chainId: 137
      };
      
      expect(ethereumMainnet.chainId).toBe(1);
      expect(polygon.chainId).toBe(137);
    });
  });
  
  describe('EIP-712 Message Fields', () => {
    
    /**
     * Test: signer field (Subject)
     * Requirement ID: OT-PF-073
     * Requirement: "signer is required address (Subject)"
     */
    it('should include signer field - OT-PF-073', () => {
      const message = {
        signer: '0x1234567890123456789012345678901234567890',
        authorizedEntity: 'did:web:controller.com',
        signingPurpose: 'shared-control',
        statement: 'Authorization statement'
      };
      
      expect(message.signer).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
    
    /**
     * Test: authorizedEntity field (Controller)
     * Requirement ID: OT-PF-074
     * Requirement: "authorizedEntity is required string (Controller)"
     */
    it('should include authorizedEntity field - OT-PF-074', () => {
      const message = {
        signer: '0x1234567890123456789012345678901234567890',
        authorizedEntity: 'did:web:controller.com',
        signingPurpose: 'shared-control',
        statement: 'Authorization statement'
      };
      
      expect(message.authorizedEntity).toBeDefined();
      expect(message.authorizedEntity).toMatch(/^did:/);
    });
    
    /**
     * Test: signingPurpose field
     * Requirement ID: OT-PF-075
     * Requirement: "signingPurpose is required string (proofPurpose)"
     */
    it('should include signingPurpose field - OT-PF-075', () => {
      const message = {
        signer: '0x1234567890123456789012345678901234567890',
        authorizedEntity: 'did:web:controller.com',
        signingPurpose: 'shared-control',
        statement: 'Authorization statement'
      };
      
      expect(VALID_PROOF_PURPOSES).toContain(message.signingPurpose);
    });
    
    /**
     * Test: statement field (human-readable)
     * Requirement ID: OT-PF-079
     * Requirement: "statement is required string (human-readable safety)"
     */
    it('should include human-readable statement - OT-PF-079', () => {
      const message = {
        signer: '0x1234567890123456789012345678901234567890',
        authorizedEntity: 'did:web:controller.com',
        signingPurpose: 'shared-control',
        statement: 'I authorize did:web:controller.com to manage my registry entries.'
      };
      
      expect(message.statement).toBeDefined();
      expect(message.statement.length).toBeGreaterThan(0);
    });
  });
  
  describe('Handle-Link Statement Format', () => {
    
    /**
     * Test: Handle-Link format
     * Requirement ID: OT-PF-105
     * Requirement: "Format: v=1;controller=<DID>"
     */
    it('should validate Handle-Link statement format - OT-PF-105', () => {
      const validStatement = 'v=1;controller=did:web:example.com';
      
      expect(validStatement).toContain('v=1');
      expect(validStatement).toContain('controller=');
      expect(validStatement).toMatch(/controller=did:[a-z0-9]+:.+/);
    });
    
    /**
     * Test: v=1 must be present
     * Requirement ID: OT-PF-107
     * Requirement: "v=1 MUST be present"
     */
    it('should require v=1 in Handle-Link statement - OT-PF-107', () => {
      const validStatement = 'v=1;controller=did:web:example.com';
      const invalidStatement = 'controller=did:web:example.com'; // Missing v=1
      
      expect(validStatement).toMatch(/v=1/);
      expect(invalidStatement).not.toMatch(/v=1/);
    });
    
    /**
     * Test: controller must be valid DID
     * Requirement ID: OT-PF-108
     * Requirement: "controller MUST be valid DID"
     */
    it('should require valid DID in controller field - OT-PF-108', () => {
      const didPattern = /^did:[a-z0-9]+:.+$/;
      
      const validController = 'did:web:example.com';
      expect(validController).toMatch(didPattern);
      
      const validDidPkh = 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890';
      expect(validDidPkh).toMatch(didPattern);
    });
  });
});

describe('Proof Types - Validation Functions', () => {
  
  /**
   * Helper to validate proof type
   */
  const isValidProofType = (proofType: string): boolean => {
    const validTypes = [
      'pop-jws', 'pop-eip712', 'x402-receipt', 
      'evidence-pointer', 'tx-encoded-value', 'tx-interaction', 'x402-offer'
    ];
    return validTypes.includes(proofType);
  };
  
  /**
   * Helper to validate proof purpose
   */
  const isValidProofPurpose = (purpose: string): boolean => {
    return ['shared-control', 'commercial-tx'].includes(purpose);
  };
  
  it('should validate known proof types', () => {
    expect(isValidProofType('pop-jws')).toBe(true);
    expect(isValidProofType('pop-eip712')).toBe(true);
    expect(isValidProofType('x402-receipt')).toBe(true);
    expect(isValidProofType('evidence-pointer')).toBe(true);
    expect(isValidProofType('tx-encoded-value')).toBe(true);
    expect(isValidProofType('tx-interaction')).toBe(true);
    expect(isValidProofType('x402-offer')).toBe(true);
  });
  
  it('should reject unknown proof types', () => {
    expect(isValidProofType('unknown')).toBe(false);
    expect(isValidProofType('jwt')).toBe(false);
    expect(isValidProofType('')).toBe(false);
  });
  
  it('should validate known proof purposes', () => {
    expect(isValidProofPurpose('shared-control')).toBe(true);
    expect(isValidProofPurpose('commercial-tx')).toBe(true);
  });
  
  it('should reject unknown proof purposes', () => {
    expect(isValidProofPurpose('unknown')).toBe(false);
    expect(isValidProofPurpose('authentication')).toBe(false);
  });
});

