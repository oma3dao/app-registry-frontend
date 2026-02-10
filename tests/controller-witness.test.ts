/**
 * Tests for controller-witness attestation business logic
 *
 * Covers validateParams, recordWitnessAttestation, checkExistingControllerWitnessAttestation,
 * verifyControllerEvidence, checkDnsTxtEvidence, checkDidJsonEvidence,
 * verifyTargetControllerAttestation, submitControllerWitnessAttestation
 * per CONTROLLER-WITNESS-SCHEMA.md §4.2.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateParams,
  recordWitnessAttestation,
  checkExistingControllerWitnessAttestation,
  verifyControllerEvidence,
  checkDnsTxtEvidence,
  checkDidJsonEvidence,
  verifyTargetControllerAttestation,
  submitControllerWitnessAttestation,
  ControllerWitnessRouteError,
  type ControllerWitnessAttestationParams,
} from '@/lib/server/controller-witness';
import * as evidence from '@/lib/server/evidence';
import * as schemas from '@/config/schemas';
import * as issuerKey from '@/lib/server/issuer-key';

const APPROVED_EAS = '0x' + 'b'.repeat(40);
const SCHEMA_UID = '0x290ce7f909a98f74d2356cf24102ac813555fa0bcd456f1bab17da2d92632e1d';
// Mock config and heavy dependencies - use literals to avoid hoisting issues
vi.mock('@/config/controller-witness-config', () => ({
  APPROVED_WITNESS_CHAINS: { 66238: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
  APPROVED_CONTROLLER_SCHEMA_UIDS: [
    '0x290ce7f909a98f74d2356cf24102ac813555fa0bcd456f1bab17da2d92632e1d',
  ],
  APPROVED_CONTROLLER_WITNESS_ATTESTERS: { 66238: ['0x7D5beD223Bc343F114Aa28961Cc447dbbc9c2330'] },
  SCHEMA_FIELD_MAPPINGS: {
    '0x290ce7f909a98f74d2356cf24102ac813555fa0bcd456f1bab17da2d92632e1d': {
      subjectField: 'subject',
      controllerField: 'keyId',
    },
  },
}));

const mockEasGetAttestation = vi.fn();
const mockSchemaEncoderDecode = vi.fn();

vi.mock('@ethereum-attestation-service/eas-sdk', () => ({
  EAS: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    getAttestation: mockEasGetAttestation,
  })),
  SchemaEncoder: vi.fn().mockImplementation(() => ({
    decodeData: mockSchemaEncoderDecode,
    encodeData: vi.fn(() => '0xencoded'),
  })),
}));

vi.mock('ethers', () => ({
  ethers: {
    getAddress: (x: string) => x,
    JsonRpcProvider: vi.fn(),
    Wallet: vi.fn(() => ({ address: '0xAttester' })),
    ZeroAddress: '0x0000000000000000000000000000000000000000',
  },
}));

vi.mock('@/lib/rpc', () => ({ getRpcUrl: vi.fn(() => 'http://localhost:8545') }));

vi.mock('@/config/schemas', () => ({
  getAllSchemas: vi.fn(),
  getSchema: vi.fn(),
}));

vi.mock('@/lib/utils/did', () => ({
  getDomainFromDidWeb: vi.fn((did: string) => {
    if (did.startsWith('did:web:')) return did.slice('did:web:'.length).split('/')[0];
    return null;
  }),
}));

vi.mock('@/lib/server/evidence', () => ({
  findControllerInDnsTxt: vi.fn(),
  findControllerInDidDoc: vi.fn(),
}));

vi.mock('@/lib/server/issuer-key', () => ({
  loadIssuerPrivateKey: vi.fn(() => '0x' + '1'.repeat(64) as `0x${string}`),
}));

const validBody: Record<string, unknown> = {
  attestationUid: '0x' + 'a'.repeat(64),
  chainId: 66238,
  easContract: APPROVED_EAS,
  schemaUid: SCHEMA_UID,
  subject: 'did:pkh:eip155:66238:0x' + 'c'.repeat(40),
  controller: 'did:pkh:eip155:66238:0x' + 'd'.repeat(40),
  method: 'dns-txt',
};

describe('controller-witness', () => {
  describe('validateParams', () => {
    it('accepts valid body and returns params', () => {
      const result = validateParams(validBody);
      expect(result).toEqual({
        attestationUid: validBody.attestationUid,
        chainId: validBody.chainId,
        easContract: validBody.easContract,
        schemaUid: validBody.schemaUid,
        subject: validBody.subject,
        controller: validBody.controller,
        method: validBody.method,
      });
    });

    it('accepts did-json as method', () => {
      const body = { ...validBody, method: 'did-json' };
      const result = validateParams(body);
      expect(result.method).toBe('did-json');
    });

    it('throws on missing attestationUid', () => {
      const body = { ...validBody, attestationUid: undefined };
      expect(() => validateParams(body)).toThrow(ControllerWitnessRouteError);
      try {
        validateParams(body);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).statusCode).toBe(400);
        expect((e as ControllerWitnessRouteError).code).toBe('MISSING_FIELDS');
        expect((e as any).message).toContain('attestationUid');
      }
    });

    it('throws on missing chainId', () => {
      const body = { ...validBody, chainId: undefined };
      expect(() => validateParams(body)).toThrow(ControllerWitnessRouteError);
      try {
        validateParams(body);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).statusCode).toBe(400);
        expect((e as any).message).toContain('chainId');
      }
    });

    it('throws on missing subject', () => {
      const body = { ...validBody, subject: undefined };
      expect(() => validateParams(body)).toThrow(ControllerWitnessRouteError);
    });

    it('throws on missing controller', () => {
      const body = { ...validBody, controller: undefined };
      expect(() => validateParams(body)).toThrow(ControllerWitnessRouteError);
    });

    it('throws on missing method', () => {
      const body = { ...validBody, method: undefined };
      expect(() => validateParams(body)).toThrow(ControllerWitnessRouteError);
    });

    it('throws on invalid attestationUid format (not 32-byte hex)', () => {
      const body = { ...validBody, attestationUid: '0x' + 'a'.repeat(40) };
      expect(() => validateParams(body)).toThrow(ControllerWitnessRouteError);
      try {
        validateParams(body);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).message).toContain('attestationUid');
        expect((e as ControllerWitnessRouteError).message).toContain('32-byte');
      }
    });

    it('throws on invalid chainId (non-integer)', () => {
      const body = { ...validBody, chainId: 1.5 };
      expect(() => validateParams(body)).toThrow(ControllerWitnessRouteError);
    });

    it('throws on invalid chainId (zero or negative)', () => {
      expect(() => validateParams({ ...validBody, chainId: 0 })).toThrow(ControllerWitnessRouteError);
      expect(() => validateParams({ ...validBody, chainId: -1 })).toThrow(ControllerWitnessRouteError);
    });

    it('throws on invalid easContract (not 20-byte hex)', () => {
      const body = { ...validBody, easContract: '0x' + 'b'.repeat(64) };
      expect(() => validateParams(body)).toThrow(ControllerWitnessRouteError);
    });

    it('throws on invalid subject (not DID format)', () => {
      const body = { ...validBody, subject: 'not-a-did' };
      expect(() => validateParams(body)).toThrow(ControllerWitnessRouteError);
      try {
        validateParams(body);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('INVALID_SUBJECT');
      }
    });

    it('throws on invalid controller (not DID format)', () => {
      const body = { ...validBody, controller: '0x' + 'd'.repeat(40) };
      expect(() => validateParams(body)).toThrow(ControllerWitnessRouteError);
      try {
        validateParams(body);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('INVALID_CONTROLLER');
      }
    });

    it('throws on invalid method', () => {
      const body = { ...validBody, method: 'invalid-method' };
      expect(() => validateParams(body)).toThrow(ControllerWitnessRouteError);
      try {
        validateParams(body);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('INVALID_METHOD');
        expect((e as any).message).toContain('dns-txt');
        expect((e as any).message).toContain('did-json');
      }
    });
  });

  describe('ControllerWitnessRouteError', () => {
    it('has name and statusCode', () => {
      const err = new ControllerWitnessRouteError('test', 400, 'TEST_CODE');
      expect(err.name).toBe('ControllerWitnessRouteError');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('TEST_CODE');
      expect(err.message).toBe('test');
    });
  });

  describe('recordWitnessAttestation and checkExistingControllerWitnessAttestation', () => {
    const subject = 'did:pkh:eip155:66238:0x' + 'c'.repeat(40);
    const controller = 'did:pkh:eip155:66238:0x' + 'd'.repeat(40);
    const uid = '0x' + 'e'.repeat(64);
    const attester = '0xAttester';
    const observedAt = 1234567890;

    it('records and retrieves witness attestation', async () => {
      recordWitnessAttestation(subject, controller, uid, attester, observedAt);

      const existing = await checkExistingControllerWitnessAttestation(subject, controller);

      expect(existing).not.toBeNull();
      expect(existing!.uid).toBe(uid);
      expect(existing!.attester).toBe(attester);
      expect(existing!.observedAt).toBe(observedAt);
    });

    it('returns null when no attestation recorded', async () => {
      const result = await checkExistingControllerWitnessAttestation(
        'did:pkh:eip155:1:0x' + 'f'.repeat(40),
        'did:pkh:eip155:1:0x' + '0'.repeat(40)
      );

      expect(result).toBeNull();
    });
  });

  describe('verifyControllerEvidence', () => {
    const subject = 'did:web:example.com';
    const controller = 'did:pkh:eip155:66238:0x' + 'a'.repeat(40);

    beforeEach(() => {
      vi.mocked(evidence.findControllerInDnsTxt).mockReset();
      vi.mocked(evidence.findControllerInDidDoc).mockReset();
    });

    it('dispatches to checkDnsTxtEvidence for dns-txt method', async () => {
      vi.mocked(evidence.findControllerInDnsTxt).mockResolvedValue({
        found: true,
        matchedController: controller,
      });

      const result = await verifyControllerEvidence(subject, controller, 'dns-txt');

      expect(result.found).toBe(true);
      expect(evidence.findControllerInDnsTxt).toHaveBeenCalledWith('example.com', controller);
      expect(evidence.findControllerInDidDoc).not.toHaveBeenCalled();
    });

    it('dispatches to checkDidJsonEvidence for did-json method', async () => {
      vi.mocked(evidence.findControllerInDidDoc).mockResolvedValue({
        found: true,
        matchedController: controller,
      });

      const result = await verifyControllerEvidence(subject, controller, 'did-json');

      expect(result.found).toBe(true);
      expect(evidence.findControllerInDidDoc).toHaveBeenCalledWith('example.com', controller);
      expect(evidence.findControllerInDnsTxt).not.toHaveBeenCalled();
    });

    it('throws on unsupported method', async () => {
      await expect(
        verifyControllerEvidence(subject, controller, 'invalid')
      ).rejects.toThrow(ControllerWitnessRouteError);

      try {
        await verifyControllerEvidence(subject, controller, 'invalid');
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('INVALID_METHOD');
      }
    });
  });

  describe('checkDnsTxtEvidence', () => {
    const subject = 'did:web:example.com';
    const controller = 'did:pkh:eip155:66238:0x' + 'a'.repeat(40);

    beforeEach(() => {
      vi.mocked(evidence.findControllerInDnsTxt).mockReset();
    });

    it('returns found when DNS TXT has matching controller', async () => {
      vi.mocked(evidence.findControllerInDnsTxt).mockResolvedValue({
        found: true,
        matchedController: controller,
      });

      const result = await checkDnsTxtEvidence(subject, controller);

      expect(result.found).toBe(true);
      expect(evidence.findControllerInDnsTxt).toHaveBeenCalledWith('example.com', controller);
    });

    it('throws when subject is not did:web', async () => {
      await expect(
        checkDnsTxtEvidence('did:pkh:eip155:1:0x' + 'a'.repeat(40), controller)
      ).rejects.toThrow(ControllerWitnessRouteError);

      try {
        await checkDnsTxtEvidence('did:pkh:eip155:1:0x' + 'a'.repeat(40), controller);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('INVALID_SUBJECT');
        expect((e as ControllerWitnessRouteError).message).toContain('did:web');
      }
    });

    it('throws when evidence not found', async () => {
      vi.mocked(evidence.findControllerInDnsTxt).mockResolvedValue({
        found: false,
        details: 'No TXT records',
      });

      await expect(checkDnsTxtEvidence(subject, controller)).rejects.toThrow(
        ControllerWitnessRouteError
      );

      try {
        await checkDnsTxtEvidence(subject, controller);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('EVIDENCE_NOT_FOUND');
      }
    });
  });

  describe('checkDidJsonEvidence', () => {
    const subject = 'did:web:example.com';
    const controller = 'did:pkh:eip155:66238:0x' + 'a'.repeat(40);

    beforeEach(() => {
      vi.mocked(evidence.findControllerInDidDoc).mockReset();
    });

    it('returns found when did.json has matching controller', async () => {
      vi.mocked(evidence.findControllerInDidDoc).mockResolvedValue({
        found: true,
        matchedController: controller,
      });

      const result = await checkDidJsonEvidence(subject, controller);

      expect(result.found).toBe(true);
      expect(evidence.findControllerInDidDoc).toHaveBeenCalledWith('example.com', controller);
    });

    it('throws when subject is not did:web', async () => {
      await expect(
        checkDidJsonEvidence('did:pkh:eip155:1:0x' + 'a'.repeat(40), controller)
      ).rejects.toThrow(ControllerWitnessRouteError);

      try {
        await checkDidJsonEvidence('did:pkh:eip155:1:0x' + 'a'.repeat(40), controller);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('INVALID_SUBJECT');
      }
    });

    it('throws when evidence not found', async () => {
      vi.mocked(evidence.findControllerInDidDoc).mockResolvedValue({
        found: false,
        details: 'No verificationMethod',
      });

      await expect(checkDidJsonEvidence(subject, controller)).rejects.toThrow(
        ControllerWitnessRouteError
      );

      try {
        await checkDidJsonEvidence(subject, controller);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('EVIDENCE_NOT_FOUND');
      }
    });
  });

  describe('verifyTargetControllerAttestation', () => {
    const subject = 'did:pkh:eip155:66238:0x' + 'c'.repeat(40);
    const controller = 'did:pkh:eip155:66238:0x' + 'd'.repeat(40);

    beforeEach(() => {
      mockEasGetAttestation.mockReset();
      mockSchemaEncoderDecode.mockReset();
      vi.mocked(schemas.getAllSchemas).mockReturnValue([
        {
          id: 'key-binding',
          deployedUIDs: { 66238: SCHEMA_UID },
          easSchemaString: 'string subject,string keyId',
        } as any,
      ]);
    });

    it('throws when chain not approved', async () => {
      await expect(
        verifyTargetControllerAttestation(
          '0x' + 'a'.repeat(64),
          99999,
          APPROVED_EAS,
          SCHEMA_UID,
          subject,
          controller
        )
      ).rejects.toThrow(ControllerWitnessRouteError);

      try {
        await verifyTargetControllerAttestation(
          '0x' + 'a'.repeat(64),
          99999,
          APPROVED_EAS,
          SCHEMA_UID,
          subject,
          controller
        );
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('CHAIN_NOT_APPROVED');
      }
    });

    it('throws when EAS contract not approved', async () => {
      const wrongEas = '0x' + 'f'.repeat(40);

      await expect(
        verifyTargetControllerAttestation(
          '0x' + 'a'.repeat(64),
          66238,
          wrongEas,
          SCHEMA_UID,
          subject,
          controller
        )
      ).rejects.toThrow(ControllerWitnessRouteError);

      try {
        await verifyTargetControllerAttestation(
          '0x' + 'a'.repeat(64),
          66238,
          wrongEas,
          SCHEMA_UID,
          subject,
          controller
        );
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('CHAIN_NOT_APPROVED');
      }
    });

    it('throws when attestation not found on chain', async () => {
      mockEasGetAttestation.mockRejectedValue(new Error('Not found'));

      await expect(
        verifyTargetControllerAttestation(
          '0x' + 'a'.repeat(64),
          66238,
          APPROVED_EAS,
          SCHEMA_UID,
          subject,
          controller
        )
      ).rejects.toThrow(ControllerWitnessRouteError);

      try {
        await verifyTargetControllerAttestation(
          '0x' + 'a'.repeat(64),
          66238,
          APPROVED_EAS,
          SCHEMA_UID,
          subject,
          controller
        );
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('ATTESTATION_NOT_FOUND');
      }
    });

    it('throws when attestation schema does not match', async () => {
      mockEasGetAttestation.mockResolvedValue({
        uid: '0x' + 'a'.repeat(64),
        schema: '0x' + '9'.repeat(64),
        revocationTime: 0n,
        data: '0x',
      });

      await expect(
        verifyTargetControllerAttestation(
          '0x' + 'a'.repeat(64),
          66238,
          APPROVED_EAS,
          SCHEMA_UID,
          subject,
          controller
        )
      ).rejects.toThrow(ControllerWitnessRouteError);

      try {
        await verifyTargetControllerAttestation(
          '0x' + 'a'.repeat(64),
          66238,
          APPROVED_EAS,
          SCHEMA_UID,
          subject,
          controller
        );
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('FIELDS_MISMATCH');
      }
    });

    it('succeeds when attestation is valid and fields match', async () => {
      mockEasGetAttestation.mockResolvedValue({
        uid: '0x' + 'a'.repeat(64),
        schema: SCHEMA_UID,
        revocationTime: 0n,
        data: '0x',
      });
      mockSchemaEncoderDecode.mockReturnValue([
        { name: 'subject', value: subject },
        { name: 'keyId', value: controller },
      ]);

      await expect(
        verifyTargetControllerAttestation(
          '0x' + 'a'.repeat(64),
          66238,
          APPROVED_EAS,
          SCHEMA_UID,
          subject,
          controller
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('submitControllerWitnessAttestation', () => {
    const params: ControllerWitnessAttestationParams = {
      attestationUid: '0x' + 'a'.repeat(64),
      chainId: 66238,
      easContract: APPROVED_EAS,
      schemaUid: SCHEMA_UID,
      subject: 'did:web:example.com',
      controller: 'did:pkh:eip155:66238:0x' + 'd'.repeat(40),
      method: 'dns-txt',
    };

    beforeEach(() => {
      vi.mocked(evidence.findControllerInDnsTxt).mockResolvedValue({
        found: true,
        matchedController: params.controller,
      });
      mockEasGetAttestation.mockResolvedValue({
        uid: params.attestationUid,
        schema: SCHEMA_UID,
        revocationTime: 0n,
        data: '0x',
      });
      mockSchemaEncoderDecode.mockReturnValue([
        { name: 'subject', value: params.subject },
        { name: 'keyId', value: params.controller },
      ]);
      vi.mocked(schemas.getAllSchemas).mockReturnValue([
        {
          id: 'key-binding',
          deployedUIDs: { 66238: SCHEMA_UID },
          easSchemaString: 'string subject,string keyId',
        } as any,
      ]);
      vi.mocked(schemas.getSchema).mockReturnValue({
        id: 'controller-witness',
        deployedUIDs: { 66238: '0x' + 'c'.repeat(64) },
        easSchemaString: 'string subject,string controller,string method,uint256 observedAt',
      } as any);
      vi.mocked(issuerKey.loadIssuerPrivateKey).mockReturnValue(
        '0x' + '1'.repeat(64) as `0x${string}`
      );
    });

    it('returns existing attestation when already recorded', async () => {
      vi.mocked(evidence.findControllerInDnsTxt).mockClear();

      recordWitnessAttestation(
        params.subject,
        params.controller,
        '0xexisting',
        '0xAttester',
        12345
      );

      const result = await submitControllerWitnessAttestation(params);

      expect(result.existing).toBe(true);
      expect(result.uid).toBe('0xexisting');
      expect(result.txHash).toBeNull();
      expect(evidence.findControllerInDnsTxt).not.toHaveBeenCalled();
    });

    it('throws when issuer key not configured', async () => {
      // Use unique subject/controller so we don't hit cache from previous test
      const paramsNoCache: ControllerWitnessAttestationParams = {
        ...params,
        subject: 'did:web:issuer-key-test.example.com',
        controller: 'did:pkh:eip155:66238:0x' + 'e'.repeat(40),
      };

      // Override mocks so attestation verification passes and we reach loadIssuerPrivateKey
      mockSchemaEncoderDecode.mockReturnValueOnce([
        { name: 'subject', value: paramsNoCache.subject },
        { name: 'keyId', value: paramsNoCache.controller },
      ]);
      vi.mocked(evidence.findControllerInDnsTxt).mockResolvedValueOnce({
        found: true,
        matchedController: paramsNoCache.controller,
      });

      vi.mocked(issuerKey.loadIssuerPrivateKey).mockImplementationOnce(() => {
        throw new Error('ISSUER_KEY_NOT_SET');
      });

      await expect(submitControllerWitnessAttestation(paramsNoCache)).rejects.toThrow(
        /Issuer key not configured/
      );
    });
  });
});
