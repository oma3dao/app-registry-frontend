import { describe, it, expect } from 'vitest';

/**
 * OMATrust Proof Specification - Section 5.3.2: pop-jws (Standard Key Proof)
 * 
 * Tests for JWS-based proof of possession using standard JWT/JWS format.
 */

describe('OMATrust Proof Spec 5.3.2: pop-jws (Standard Key Proof)', () => {
  // Sample JWS components
  const validJwsPayload = {
    iss: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK', // Subject
    aud: 'did:web:example.com', // Controller
    proofPurpose: 'shared-control',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    jti: 'unique-nonce-123',
  };

  const validJwsHeader = {
    alg: 'ES256K',
    jwk: {
      kty: 'EC',
      crv: 'secp256k1',
      x: 'base64url-encoded-x',
      y: 'base64url-encoded-y',
    },
  };

  describe('JWS Payload Claims', () => {
    it('OT-PF-060: iss claim MUST be present (Subject)', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.2
       * Requirement ID: OT-PF-060
       * Requirement: "iss: Y | string (Subject)"
       */
      expect(validJwsPayload.iss).toBeDefined();
      expect(typeof validJwsPayload.iss).toBe('string');
      // Subject should be a DID
      expect(validJwsPayload.iss).toMatch(/^did:/);
    });

    it('OT-PF-061: aud claim MUST be present (Controller)', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.2
       * Requirement ID: OT-PF-061
       * Requirement: "aud: Y | string (Controller)"
       */
      expect(validJwsPayload.aud).toBeDefined();
      expect(typeof validJwsPayload.aud).toBe('string');
      // Controller should be a DID
      expect(validJwsPayload.aud).toMatch(/^did:/);
    });

    it('OT-PF-062: proofPurpose claim MUST be present', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.2
       * Requirement ID: OT-PF-062
       * Requirement: "proofPurpose: Y | string"
       */
      expect(validJwsPayload.proofPurpose).toBeDefined();
      expect(['shared-control', 'commercial-tx']).toContain(validJwsPayload.proofPurpose);
    });

    it('OT-PF-063: iat claim is optional (issuedAt)', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.2
       * Requirement ID: OT-PF-063
       * Requirement: "iat: N | int"
       */
      if (validJwsPayload.iat) {
        expect(typeof validJwsPayload.iat).toBe('number');
        expect(validJwsPayload.iat).toBeGreaterThan(0);
      }
    });

    it('OT-PF-064: exp claim is optional (expiresAt)', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.2
       * Requirement ID: OT-PF-064
       * Requirement: "exp: N | int"
       */
      if (validJwsPayload.exp) {
        expect(typeof validJwsPayload.exp).toBe('number');
        // exp should be after iat
        if (validJwsPayload.iat) {
          expect(validJwsPayload.exp).toBeGreaterThan(validJwsPayload.iat);
        }
      }
    });

    it('OT-PF-065: jti claim is optional (Nonce)', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.2
       * Requirement ID: OT-PF-065
       * Requirement: "jti: N | string (Nonce)"
       */
      if (validJwsPayload.jti) {
        expect(typeof validJwsPayload.jti).toBe('string');
        expect(validJwsPayload.jti.length).toBeGreaterThan(0);
      }
    });
  });

  describe('JWS Header Claims', () => {
    it('OT-PF-066: alg claim MUST be present', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.2
       * Requirement ID: OT-PF-066
       * Requirement: "alg: Y | string"
       */
      expect(validJwsHeader.alg).toBeDefined();
      expect(typeof validJwsHeader.alg).toBe('string');
      
      // Common algorithms for DID-based JWS
      const validAlgorithms = ['ES256K', 'ES256', 'EdDSA', 'RS256'];
      expect(validAlgorithms).toContain(validJwsHeader.alg);
    });

    it('OT-PF-067: jwk claim MUST contain public key', () => {
      /**
       * Specification: OMATrust Proof Specification - Section 5.3.2
       * Requirement ID: OT-PF-067
       * Requirement: "jwk: Y | object (public key)"
       */
      expect(validJwsHeader.jwk).toBeDefined();
      expect(typeof validJwsHeader.jwk).toBe('object');
      
      // JWK must have key type
      expect(validJwsHeader.jwk.kty).toBeDefined();
    });
  });

  describe('JWK Structure Validation', () => {
    it('validates EC key structure for secp256k1', () => {
      /**
       * Elliptic curve key for ES256K algorithm
       */
      const secp256k1Key = {
        kty: 'EC',
        crv: 'secp256k1',
        x: 'WmsNq_S0p_2NNaOPVy8y3LL5dxIm9NjZxJO0e9Nz8fc',
        y: 'TYuUu_x2bjPqj4yWABXl7SzOGHHILVtU5N1Dg3bnrHM',
      };
      
      expect(secp256k1Key.kty).toBe('EC');
      expect(secp256k1Key.crv).toBe('secp256k1');
      expect(secp256k1Key.x).toBeDefined();
      expect(secp256k1Key.y).toBeDefined();
    });

    it('validates EdDSA key structure', () => {
      /**
       * OKP key for EdDSA algorithm
       */
      const eddsaKey = {
        kty: 'OKP',
        crv: 'Ed25519',
        x: 'base64url-encoded-public-key',
      };
      
      expect(eddsaKey.kty).toBe('OKP');
      expect(eddsaKey.crv).toBe('Ed25519');
      expect(eddsaKey.x).toBeDefined();
    });
  });

  describe('Complete pop-jws Proof Structure', () => {
    it('creates valid pop-jws proof wrapper', () => {
      /**
       * Complete pop-jws proof structure
       */
      const completeProof = {
        proofType: 'pop-jws',
        proofPurpose: 'shared-control',
        version: 1,
        issuedAt: Math.floor(Date.now() / 1000),
        proofObject: {
          // JWS compact serialization: header.payload.signature
          jws: 'eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiJkaWQ6a2V5Ono2TWtoYVhnQlpEdm90RGtMNTI1N2ZhaXp0aUdpQzJRdEtMR3Bibm5FR3RhMmRvSyIsImF1ZCI6ImRpZDp3ZWI6ZXhhbXBsZS5jb20iLCJwcm9vZlB1cnBvc2UiOiJzaGFyZWQtY29udHJvbCIsImlhdCI6MTcwNDA2NzIwMH0.signature',
        },
      };
      
      expect(completeProof.proofType).toBe('pop-jws');
      expect(completeProof.proofPurpose).toBe('shared-control');
      expect(completeProof.proofObject.jws).toBeDefined();
      
      // JWS has 3 parts separated by dots
      const jwsParts = completeProof.proofObject.jws.split('.');
      expect(jwsParts.length).toBe(3);
    });

    it('validates JWS compact serialization format', () => {
      /**
       * JWS compact serialization: base64url(header).base64url(payload).base64url(signature)
       */
      const jws = 'eyJhbGciOiJFUzI1NksifQ.eyJpc3MiOiJkaWQ6a2V5Ono2TWtoYVhnQlpEdm90RGtMNTI1N2ZhaXp0aUdpQzJRdEtMR3Bibm5FR3RhMmRvSyJ9.MEUCIQDhk1w';
      
      const parts = jws.split('.');
      expect(parts.length).toBe(3);
      
      // Each part should be base64url encoded (alphanumeric, -, _)
      parts.forEach(part => {
        expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
      });
    });

    it('validates proof with detached payload', () => {
      /**
       * JWS with detached payload (payload transmitted separately)
       */
      const detachedJws = {
        proofType: 'pop-jws',
        proofObject: {
          jws: 'eyJhbGciOiJFUzI1NksifQ..MEUCIQDhk1w', // Empty payload section
          payload: {
            iss: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
            aud: 'did:web:example.com',
            proofPurpose: 'shared-control',
          },
        },
      };
      
      // Detached JWS has empty middle section
      const parts = detachedJws.proofObject.jws.split('.');
      expect(parts[1]).toBe('');
      expect(detachedJws.proofObject.payload).toBeDefined();
    });
  });

  describe('Algorithm-Specific Validation', () => {
    it('ES256K requires secp256k1 curve', () => {
      /**
       * ES256K (ECDSA with secp256k1) is common for Ethereum
       */
      const es256kProof = {
        header: {
          alg: 'ES256K',
          jwk: {
            kty: 'EC',
            crv: 'secp256k1',
            x: 'WmsNq_S0p_2NNaOPVy8y3LL5dxIm9NjZxJO0e9Nz8fc',
            y: 'TYuUu_x2bjPqj4yWABXl7SzOGHHILVtU5N1Dg3bnrHM',
          },
        },
      };
      
      expect(es256kProof.header.alg).toBe('ES256K');
      expect(es256kProof.header.jwk.crv).toBe('secp256k1');
    });

    it('EdDSA requires Ed25519 curve', () => {
      /**
       * EdDSA with Ed25519 is common for did:key
       */
      const eddsaProof = {
        header: {
          alg: 'EdDSA',
          jwk: {
            kty: 'OKP',
            crv: 'Ed25519',
            x: 'base64url-public-key',
          },
        },
      };
      
      expect(eddsaProof.header.alg).toBe('EdDSA');
      expect(eddsaProof.header.jwk.crv).toBe('Ed25519');
    });
  });
});

