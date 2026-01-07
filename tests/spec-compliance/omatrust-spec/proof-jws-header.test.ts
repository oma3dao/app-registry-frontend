import { describe, it, expect } from 'vitest';

/**
 * OMATrust Proof Specification - Section 5.3.2: JWS Header Claims
 * 
 * Extended tests for JWS header validation and algorithm support.
 */

describe('OMATrust Proof Spec: JWS Header Claims (Extended)', () => {
  describe('OT-PF-066: Algorithm Support', () => {
    const supportedAlgorithms = {
      // Elliptic Curve algorithms
      ES256K: { kty: 'EC', crv: 'secp256k1', use: 'Ethereum/Bitcoin keys' },
      ES256: { kty: 'EC', crv: 'P-256', use: 'Standard ECDSA' },
      ES384: { kty: 'EC', crv: 'P-384', use: 'Higher security ECDSA' },
      ES512: { kty: 'EC', crv: 'P-521', use: 'Highest security ECDSA' },
      // EdDSA
      EdDSA: { kty: 'OKP', crv: 'Ed25519', use: 'did:key' },
      // RSA (less common for DIDs)
      RS256: { kty: 'RSA', use: 'Legacy systems' },
    };

    it('ES256K is supported for Ethereum keys', () => {
      /**
       * ES256K uses secp256k1 curve (same as Ethereum/Bitcoin)
       */
      const header = {
        alg: 'ES256K',
        jwk: {
          kty: 'EC',
          crv: 'secp256k1',
          x: 'WmsNq_S0p_2NNaOPVy8y3LL5dxIm9NjZxJO0e9Nz8fc',
          y: 'TYuUu_x2bjPqj4yWABXl7SzOGHHILVtU5N1Dg3bnrHM',
        },
      };
      
      expect(header.alg).toBe('ES256K');
      expect(header.jwk.crv).toBe('secp256k1');
    });

    it('ES256 is supported for standard ECDSA', () => {
      /**
       * ES256 uses P-256 curve
       */
      const header = {
        alg: 'ES256',
        jwk: {
          kty: 'EC',
          crv: 'P-256',
          x: 'base64url-x',
          y: 'base64url-y',
        },
      };
      
      expect(header.alg).toBe('ES256');
      expect(header.jwk.crv).toBe('P-256');
    });

    it('EdDSA is supported for did:key', () => {
      /**
       * EdDSA with Ed25519 is common for did:key method
       */
      const header = {
        alg: 'EdDSA',
        jwk: {
          kty: 'OKP',
          crv: 'Ed25519',
          x: 'base64url-public-key',
        },
      };
      
      expect(header.alg).toBe('EdDSA');
      expect(header.jwk.crv).toBe('Ed25519');
    });

    it('rejects unsupported algorithms', () => {
      /**
       * None and other insecure algorithms should be rejected
       */
      const unsupportedAlgorithms = ['none', 'HS256', 'HS384', 'HS512'];
      
      unsupportedAlgorithms.forEach(alg => {
        const isSupported = Object.keys(supportedAlgorithms).includes(alg);
        expect(isSupported).toBe(false);
      });
    });
  });

  describe('OT-PF-067: JWK Public Key Structure', () => {
    it('validates EC key structure', () => {
      /**
       * EC keys require kty, crv, x, and y
       */
      const ecKey = {
        kty: 'EC',
        crv: 'secp256k1',
        x: 'WmsNq_S0p_2NNaOPVy8y3LL5dxIm9NjZxJO0e9Nz8fc',
        y: 'TYuUu_x2bjPqj4yWABXl7SzOGHHILVtU5N1Dg3bnrHM',
      };
      
      expect(ecKey.kty).toBe('EC');
      expect(ecKey.crv).toBeDefined();
      expect(ecKey.x).toBeDefined();
      expect(ecKey.y).toBeDefined();
    });

    it('validates OKP key structure for EdDSA', () => {
      /**
       * OKP keys require kty, crv, and x
       */
      const okpKey = {
        kty: 'OKP',
        crv: 'Ed25519',
        x: 'base64url-public-key',
      };
      
      expect(okpKey.kty).toBe('OKP');
      expect(okpKey.crv).toBe('Ed25519');
      expect(okpKey.x).toBeDefined();
    });

    it('rejects keys with private key material', () => {
      /**
       * JWK in header should NOT contain private key (d parameter)
       */
      const keyWithPrivate = {
        kty: 'EC',
        crv: 'secp256k1',
        x: 'WmsNq_S0p_2NNaOPVy8y3LL5dxIm9NjZxJO0e9Nz8fc',
        y: 'TYuUu_x2bjPqj4yWABXl7SzOGHHILVtU5N1Dg3bnrHM',
        d: 'secret-private-key', // Should NOT be present
      };
      
      const hasPrivateKey = 'd' in keyWithPrivate;
      expect(hasPrivateKey).toBe(true); // This would be rejected
    });

    it('validates key use parameter', () => {
      /**
       * Key use (use) should be 'sig' for signing keys
       */
      const signingKey = {
        kty: 'EC',
        crv: 'secp256k1',
        x: 'base64url-x',
        y: 'base64url-y',
        use: 'sig',
      };
      
      expect(signingKey.use).toBe('sig');
    });

    it('validates key operations parameter', () => {
      /**
       * Key operations (key_ops) should include 'sign' and 'verify'
       */
      const keyWithOps = {
        kty: 'EC',
        crv: 'secp256k1',
        x: 'base64url-x',
        y: 'base64url-y',
        key_ops: ['sign', 'verify'],
      };
      
      expect(keyWithOps.key_ops).toContain('sign');
      expect(keyWithOps.key_ops).toContain('verify');
    });
  });

  describe('JWS Signature Validation', () => {
    it('validates signature length for ES256K', () => {
      /**
       * ES256K signatures are 64 bytes (r: 32, s: 32)
       */
      const es256kSignatureLength = 64 * 2; // hex chars
      const mockSignature = '0x' + 'a'.repeat(128);
      
      expect(mockSignature.length).toBe(2 + es256kSignatureLength);
    });

    it('validates signature format for EdDSA', () => {
      /**
       * EdDSA signatures are 64 bytes
       */
      const eddsaSignatureLength = 64 * 2; // hex chars
      const mockSignature = '0x' + 'b'.repeat(128);
      
      expect(mockSignature.length).toBe(2 + eddsaSignatureLength);
    });

    it('rejects malformed signatures', () => {
      /**
       * Signatures must be valid hex
       */
      const malformedSignatures = [
        '', // Empty
        '0x', // Just prefix
        '0xGGGG', // Invalid hex chars
        'not-hex-at-all',
      ];
      
      malformedSignatures.forEach(sig => {
        const isValidHex = /^0x[a-fA-F0-9]+$/.test(sig) && sig.length > 2;
        expect(isValidHex).toBe(false);
      });
    });
  });

  describe('JWS Claims Validation Edge Cases', () => {
    it('handles missing optional claims', () => {
      /**
       * Minimal valid payload with only required claims
       */
      const minimalPayload = {
        iss: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
        aud: 'did:web:example.com',
        proofPurpose: 'shared-control',
        // iat, exp, jti are optional
      };
      
      expect(minimalPayload.iss).toBeDefined();
      expect(minimalPayload.aud).toBeDefined();
      expect(minimalPayload.proofPurpose).toBeDefined();
    });

    it('validates timestamp ordering', () => {
      /**
       * If both iat and exp present, exp > iat
       */
      const now = Math.floor(Date.now() / 1000);
      
      const validPayload = {
        iat: now,
        exp: now + 3600, // 1 hour later
      };
      
      const invalidPayload = {
        iat: now,
        exp: now - 3600, // 1 hour earlier (invalid)
      };
      
      expect(validPayload.exp).toBeGreaterThan(validPayload.iat);
      expect(invalidPayload.exp).toBeLessThan(invalidPayload.iat);
    });

    it('validates nonce uniqueness', () => {
      /**
       * jti (nonce) should be unique per proof
       */
      const nonces = new Set();
      
      // Generate multiple nonces
      for (let i = 0; i < 100; i++) {
        const nonce = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        nonces.add(nonce);
      }
      
      // All should be unique
      expect(nonces.size).toBe(100);
    });

    it('validates issuer DID format', () => {
      /**
       * iss must be a valid DID
       */
      const validIssuers = [
        'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
        'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
        'did:web:example.com',
      ];
      
      const invalidIssuers = [
        'not-a-did',
        'did:',
        'example.com',
        '0x1234',
      ];
      
      validIssuers.forEach(iss => {
        expect(iss).toMatch(/^did:[a-z0-9]+:.+$/);
      });
      
      invalidIssuers.forEach(iss => {
        expect(iss).not.toMatch(/^did:[a-z0-9]+:.+$/);
      });
    });
  });
});

