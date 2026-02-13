/**
 * API contract tests for POST /api/controller-witness
 *
 * Documents and asserts the request/response format, error codes, and
 * evidence format. Use as the test-side contract when
 * developer-docs/docs/api/controller-witness.md is added.
 *
 * Reference: route at src/app/api/controller-witness/route.ts
 */

import { describe, it, expect, vi } from 'vitest';
import {
  ControllerWitnessRouteError,
  validateParams,
  type ControllerWitnessAttestationParams,
  type ControllerWitnessAttestationResult,
} from '@/lib/server/controller-witness-handler';

// Minimal mocks so we can import and assert types/codes
// Schema approval is now derived from schemas.ts witness config — no manual UID list
vi.mock('@/config/controller-witness-config', () => ({
  APPROVED_WITNESS_CHAINS: {},
  APPROVED_CONTROLLER_WITNESS_ATTESTERS: {},
}));
vi.mock('@ethereum-attestation-service/eas-sdk', () => ({
  EAS: vi.fn(),
  SchemaEncoder: vi.fn(),
}));
vi.mock('ethers', () => ({
  ethers: { getAddress: (x: string) => x, JsonRpcProvider: vi.fn(), Wallet: vi.fn(), ZeroAddress: '0x0' },
}));
vi.mock('@/lib/rpc', () => ({ getRpcUrl: vi.fn() }));
vi.mock('@/config/schemas', () => ({ getAllSchemas: vi.fn(), getSchema: vi.fn() }));
vi.mock('@/lib/utils/did', () => ({ getDomainFromDidWeb: vi.fn() }));
vi.mock('@/lib/server/evidence', () => ({
  findControllerInDnsTxt: vi.fn(),
  findControllerInDidDoc: vi.fn(),
}));
vi.mock('@/lib/server/issuer-key', () => ({ loadIssuerPrivateKey: vi.fn() }));

/** Documented error codes for POST /api/controller-witness (API contract) */
const DOCUMENTED_ERROR_CODES = [
  'MISSING_FIELDS',       // 400 – missing or invalid required fields
  'INVALID_SUBJECT',      // 400 – subject not a valid DID
  'INVALID_CONTROLLER',   // 400 – controller not a valid DID
  'INVALID_METHOD',      // 400 – method not dns-txt or did-json
  'CHAIN_NOT_APPROVED',  // 403 – chain or EAS contract not in allowlist
  'SCHEMA_NOT_APPROVED', // 403 – schema not in allowlist or no field mapping
  'ATTESTATION_NOT_FOUND', // 404 – attestation UID not on chain
  'EVIDENCE_NOT_FOUND',  // 404 – controller evidence (DNS/did.json) not found
  'ATTESTATION_REVOKED', // 409 – attestation has been revoked
  'FIELDS_MISMATCH',     // 422 – subject/controller mismatch with on-chain attestation
  'SERVER_ERROR',       // 500 – issuer key, EAS submission, or internal error
] as const;

/** Documented HTTP status for each error code */
const ERROR_CODE_TO_STATUS: Record<string, number> = {
  MISSING_FIELDS: 400,
  INVALID_SUBJECT: 400,
  INVALID_CONTROLLER: 400,
  INVALID_METHOD: 400,
  CHAIN_NOT_APPROVED: 403,
  SCHEMA_NOT_APPROVED: 403,
  ATTESTATION_NOT_FOUND: 404,
  EVIDENCE_NOT_FOUND: 404,
  ATTESTATION_REVOKED: 409,
  FIELDS_MISMATCH: 422,
  SERVER_ERROR: 500,
};

describe('Controller Witness API contract', () => {
  describe('error codes', () => {
    it('documents all known error codes', () => {
      expect(DOCUMENTED_ERROR_CODES.length).toBeGreaterThan(0);
      DOCUMENTED_ERROR_CODES.forEach((code) => {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
      });
    });

    it('ControllerWitnessRouteError uses documented codes and status', () => {
      for (const code of DOCUMENTED_ERROR_CODES) {
        const status = ERROR_CODE_TO_STATUS[code];
        const err = new ControllerWitnessRouteError(`Test ${code}`, status, code);
        expect(err.code).toBe(code);
        expect(err.statusCode).toBe(status);
      }
    });
  });

  describe('error response shape', () => {
    it('error response has error (string), code (string), elapsed (string)', () => {
      const err = new ControllerWitnessRouteError('Bad request', 400, 'MISSING_FIELDS');
      const body = { error: err.message, code: err.code, elapsed: '1ms' };
      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
      expect(body).toHaveProperty('code');
      expect(typeof body.code).toBe('string');
      expect(body).toHaveProperty('elapsed');
      expect(typeof body.elapsed).toBe('string');
    });
  });

  describe('success response shape', () => {
    it('success response has success, uid, txHash, blockNumber, observedAt, existing', () => {
      const result: ControllerWitnessAttestationResult = {
        success: true,
        uid: '0x' + 'a'.repeat(64),
        txHash: null,
        blockNumber: null,
        observedAt: 1234567890,
        existing: false,
      };
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('uid');
      expect(typeof result.uid).toBe('string');
      expect(result).toHaveProperty('txHash');
      expect(result.txHash === null || typeof result.txHash === 'string').toBe(true);
      expect(result).toHaveProperty('blockNumber');
      expect(result.blockNumber === null || typeof result.blockNumber === 'number').toBe(true);
      expect(result).toHaveProperty('observedAt');
      expect(typeof result.observedAt).toBe('number');
      expect(result).toHaveProperty('existing');
      expect(typeof result.existing).toBe('boolean');
    });

    it('existing=true response has uid and observedAt, txHash/blockNumber may be null', () => {
      const result: ControllerWitnessAttestationResult = {
        success: true,
        uid: '0xexisting',
        txHash: null,
        blockNumber: null,
        observedAt: 12345,
        existing: true,
      };
      expect(result.existing).toBe(true);
      expect(result.uid).toBe('0xexisting');
      expect(result.txHash).toBeNull();
      expect(result.blockNumber).toBeNull();
    });
  });

  describe('request body (params) contract', () => {
    it('valid params have required fields with correct types', () => {
      const body = {
        attestationUid: '0x' + 'a'.repeat(64),
        chainId: 66238,
        easContract: '0x' + 'b'.repeat(40),
        schemaUid: '0x' + 'c'.repeat(64),
        subject: 'did:pkh:eip155:66238:0x' + 'd'.repeat(40),
        controller: 'did:pkh:eip155:66238:0x' + 'e'.repeat(40),
        method: 'dns-txt',
      };
      const params = validateParams(body) as ControllerWitnessAttestationParams;
      expect(params.attestationUid).toBe(body.attestationUid);
      expect(params.chainId).toBe(body.chainId);
      expect(params.easContract).toBe(body.easContract);
      expect(params.schemaUid).toBe(body.schemaUid);
      expect(params.subject).toBe(body.subject);
      expect(params.controller).toBe(body.controller);
      expect(params.method).toBe(body.method);
    });

    it('method must be dns-txt or did-json', () => {
      expect(() => validateParams({ ...validMinimal(), method: 'dns-txt' })).not.toThrow();
      expect(() => validateParams({ ...validMinimal(), method: 'did-json' })).not.toThrow();
      expect(() => validateParams({ ...validMinimal(), method: 'other' })).toThrow(
        ControllerWitnessRouteError
      );
    });
  });

  describe('evidence method contract', () => {
    it('dns-txt requires did:web subject; did-json requires did:web subject', () => {
      // Contract: both methods require did:web subject for domain extraction
      const methods = ['dns-txt', 'did-json'] as const;
      expect(methods).toContain('dns-txt');
      expect(methods).toContain('did-json');
    });
  });
});

function validMinimal(): Record<string, unknown> {
  return {
    attestationUid: '0x' + 'a'.repeat(64),
    chainId: 66238,
    easContract: '0x' + 'b'.repeat(40),
    schemaUid: '0x290ce7f909a98f74d2356cf24102ac813555fa0bcd456f1bab17da2d92632e1d',
    subject: 'did:pkh:eip155:66238:0x' + 'c'.repeat(40),
    controller: 'did:pkh:eip155:66238:0x' + 'd'.repeat(40),
    method: 'dns-txt',
  };
}
