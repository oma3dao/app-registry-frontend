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
} from '@/lib/server/controller-witness-handler';
import * as evidence from '@/lib/server/evidence';
import * as schemas from '@/config/schemas';
import * as issuerKey from '@/lib/server/issuer-key';

const APPROVED_EAS = '0x' + 'b'.repeat(40);
const SCHEMA_UID = '0x290ce7f909a98f74d2356cf24102ac813555fa0bcd456f1bab17da2d92632e1d';
// Mock config and heavy dependencies - use literals to avoid hoisting issues
// Schema approval is now derived from schemas.ts witness config — no manual UID list
vi.mock('@/config/controller-witness-config', () => ({
  APPROVED_WITNESS_CHAINS: { 66238: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
  APPROVED_CONTROLLER_WITNESS_ATTESTERS: { 66238: ['0x7D5beD223Bc343F114Aa28961Cc447dbbc9c2330'] },
}));

const mockEasGetAttestation = vi.fn();
const mockEasAttest = vi.fn();
const mockSchemaEncoderDecode = vi.fn();

vi.mock('@ethereum-attestation-service/eas-sdk', () => ({
  EAS: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    getAttestation: mockEasGetAttestation,
    attest: mockEasAttest,
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

    it('throws on null chainId (treated as missing)', () => {
      const body = { ...validBody, chainId: null };
      expect(() => validateParams(body)).toThrow(ControllerWitnessRouteError);
      try {
        validateParams(body);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('MISSING_FIELDS');
        expect((e as any).message).toContain('chainId');
      }
    });

    it('throws on invalid schemaUid format (not 32-byte hex)', () => {
      const body = { ...validBody, schemaUid: '0x' + 'a'.repeat(40) };
      expect(() => validateParams(body)).toThrow(ControllerWitnessRouteError);
      try {
        validateParams(body);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('MISSING_FIELDS');
        expect((e as any).message).toContain('schemaUid');
        expect((e as any).message).toContain('32-byte');
      }
    });

    it('lists all missing fields when multiple are absent', () => {
      const body = { attestationUid: undefined, chainId: undefined, easContract: undefined };
      expect(() => validateParams(body as any)).toThrow(ControllerWitnessRouteError);
      try {
        validateParams(body as any);
      } catch (e) {
        const msg = (e as ControllerWitnessRouteError).message;
        expect(msg).toContain('attestationUid');
        expect(msg).toContain('chainId');
        expect(msg).toContain('easContract');
        expect(msg).toContain('schemaUid');
        expect(msg).toContain('subject');
        expect(msg).toContain('controller');
        expect(msg).toContain('method');
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
          witness: { subjectField: 'subject', controllerField: 'keyId' },
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

    it('throws ATTESTATION_NOT_FOUND when EAS returns zeroed-out uid', async () => {
      const ZERO_UID = '0x' + '0'.repeat(64);
      mockEasGetAttestation.mockResolvedValue({
        uid: ZERO_UID,
        schema: SCHEMA_UID,
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
        expect((e as ControllerWitnessRouteError).code).toBe('ATTESTATION_NOT_FOUND');
        expect((e as ControllerWitnessRouteError).statusCode).toBe(404);
      }
    });

    it('throws ATTESTATION_NOT_FOUND when EAS returns zeroed-out schema', async () => {
      const ZERO_UID = '0x' + '0'.repeat(64);
      mockEasGetAttestation.mockResolvedValue({
        uid: '0x' + 'a'.repeat(64),
        schema: ZERO_UID,
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

    it('throws SCHEMA_NOT_APPROVED when schemaUid has no witness-enabled match', async () => {
      const unknownSchemaUid = '0x' + '1'.repeat(64);

      await expect(
        verifyTargetControllerAttestation(
          '0x' + 'a'.repeat(64),
          66238,
          APPROVED_EAS,
          unknownSchemaUid,
          subject,
          controller
        )
      ).rejects.toThrow(ControllerWitnessRouteError);

      try {
        await verifyTargetControllerAttestation(
          '0x' + 'a'.repeat(64),
          66238,
          APPROVED_EAS,
          unknownSchemaUid,
          subject,
          controller
        );
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('SCHEMA_NOT_APPROVED');
        expect((e as ControllerWitnessRouteError).statusCode).toBe(403);
      }
    });

    it('throws SCHEMA_NOT_APPROVED when schema has no witness config', async () => {
      // Schema exists with matching UID but no witness config
      vi.mocked(schemas.getAllSchemas).mockReturnValue([
        {
          id: 'user-review',
          deployedUIDs: { 66238: SCHEMA_UID },
          easSchemaString: 'string subject,uint8 ratingValue',
        } as any,
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
        expect((e as ControllerWitnessRouteError).code).toBe('SCHEMA_NOT_APPROVED');
      }
    });

    it('approves schema via priorUIDs when deployedUID has changed', async () => {
      // Simulate a redeployed schema — current deployedUID is different,
      // but the requested schemaUid matches a priorUID entry
      const priorSchemaUid = SCHEMA_UID;
      const currentDeployedUid = '0x' + '7'.repeat(64);

      vi.mocked(schemas.getAllSchemas).mockReturnValue([
        {
          id: 'key-binding',
          witness: { subjectField: 'subject', controllerField: 'keyId' },
          deployedUIDs: { 66238: currentDeployedUid },
          priorUIDs: { 66238: [priorSchemaUid] },
          easSchemaString: 'string subject,string keyId',
        } as any,
      ]);

      mockEasGetAttestation.mockResolvedValue({
        uid: '0x' + 'a'.repeat(64),
        schema: priorSchemaUid,
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
          priorSchemaUid,
          subject,
          controller
        )
      ).resolves.toBeUndefined();
    });

    it('throws ATTESTATION_REVOKED when attestation has been revoked', async () => {
      mockEasGetAttestation.mockResolvedValue({
        uid: '0x' + 'a'.repeat(64),
        schema: SCHEMA_UID,
        revocationTime: 1700000000n, // non-zero = revoked
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
        expect((e as ControllerWitnessRouteError).code).toBe('ATTESTATION_REVOKED');
        expect((e as ControllerWitnessRouteError).statusCode).toBe(409);
      }
    });

    it('throws FIELDS_MISMATCH when decoded subject does not match', async () => {
      mockEasGetAttestation.mockResolvedValue({
        uid: '0x' + 'a'.repeat(64),
        schema: SCHEMA_UID,
        revocationTime: 0n,
        data: '0x',
      });
      mockSchemaEncoderDecode.mockReturnValue([
        { name: 'subject', value: 'did:pkh:eip155:66238:0xwrongsubject000000000000000000000000000' },
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
        expect((e as ControllerWitnessRouteError).message).toContain('Subject mismatch');
      }
    });

    it('throws FIELDS_MISMATCH when decoded controller does not match', async () => {
      mockEasGetAttestation.mockResolvedValue({
        uid: '0x' + 'a'.repeat(64),
        schema: SCHEMA_UID,
        revocationTime: 0n,
        data: '0x',
      });
      mockSchemaEncoderDecode.mockReturnValue([
        { name: 'subject', value: subject },
        { name: 'keyId', value: 'did:pkh:eip155:66238:0xwrongcontrol00000000000000000000000000' },
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
        expect((e as ControllerWitnessRouteError).message).toContain('Controller mismatch');
      }
    });

    it('throws SERVER_ERROR when matching schema has no easSchemaString', async () => {
      vi.mocked(schemas.getAllSchemas).mockReturnValue([
        {
          id: 'key-binding',
          witness: { subjectField: 'subject', controllerField: 'keyId' },
          deployedUIDs: { 66238: SCHEMA_UID },
          // no easSchemaString
        } as any,
      ]);

      mockEasGetAttestation.mockResolvedValue({
        uid: '0x' + 'a'.repeat(64),
        schema: SCHEMA_UID,
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
        expect((e as ControllerWitnessRouteError).code).toBe('SERVER_ERROR');
        expect((e as ControllerWitnessRouteError).message).toContain('No EAS schema string');
      }
    });

    it('throws SERVER_ERROR when decodeData throws a non-route error', async () => {
      mockEasGetAttestation.mockResolvedValue({
        uid: '0x' + 'a'.repeat(64),
        schema: SCHEMA_UID,
        revocationTime: 0n,
        data: '0xbaddata',
      });
      mockSchemaEncoderDecode.mockImplementation(() => {
        throw new Error('Invalid data format');
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
        mockSchemaEncoderDecode.mockImplementation(() => {
          throw new Error('Invalid data format');
        });
        await verifyTargetControllerAttestation(
          '0x' + 'a'.repeat(64),
          66238,
          APPROVED_EAS,
          SCHEMA_UID,
          subject,
          controller
        );
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('SERVER_ERROR');
        expect((e as ControllerWitnessRouteError).message).toContain('Failed to decode attestation data');
        expect((e as ControllerWitnessRouteError).message).toContain('Invalid data format');
      }
    });

    it('extracts nested value objects from decoded attestation data', async () => {
      mockEasGetAttestation.mockResolvedValue({
        uid: '0x' + 'a'.repeat(64),
        schema: SCHEMA_UID,
        revocationTime: 0n,
        data: '0x',
      });
      // EAS SDK sometimes returns nested { value: { value: "actual" } } structures
      mockSchemaEncoderDecode.mockReturnValue([
        { name: 'subject', value: { value: subject } },
        { name: 'keyId', value: { value: controller } },
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
          witness: { subjectField: 'subject', controllerField: 'keyId' },
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

    it('throws when controller-witness schema is not deployed on chain', async () => {
      const ZERO_UID = '0x' + '0'.repeat(64);
      const uniqueParams: ControllerWitnessAttestationParams = {
        ...params,
        subject: 'did:web:cw-not-deployed.example.com',
        controller: 'did:pkh:eip155:66238:0x' + '1'.repeat(40),
      };

      mockSchemaEncoderDecode.mockReturnValueOnce([
        { name: 'subject', value: uniqueParams.subject },
        { name: 'keyId', value: uniqueParams.controller },
      ]);
      vi.mocked(evidence.findControllerInDnsTxt).mockResolvedValueOnce({
        found: true,
        matchedController: uniqueParams.controller,
      });
      // Return CW schema with zero deployedUID for this chain
      vi.mocked(schemas.getSchema).mockReturnValueOnce({
        id: 'controller-witness',
        deployedUIDs: { 66238: ZERO_UID },
        easSchemaString: 'string subject,string controller,string method,uint256 observedAt',
      } as any);

      await expect(submitControllerWitnessAttestation(uniqueParams)).rejects.toThrow(
        ControllerWitnessRouteError,
      );

      // Re-mock for the assertion check
      mockSchemaEncoderDecode.mockReturnValueOnce([
        { name: 'subject', value: uniqueParams.subject },
        { name: 'keyId', value: uniqueParams.controller },
      ]);
      vi.mocked(evidence.findControllerInDnsTxt).mockResolvedValueOnce({
        found: true,
        matchedController: uniqueParams.controller,
      });
      vi.mocked(schemas.getSchema).mockReturnValueOnce({
        id: 'controller-witness',
        deployedUIDs: { 66238: ZERO_UID },
        easSchemaString: 'string subject,string controller,string method,uint256 observedAt',
      } as any);

      try {
        await submitControllerWitnessAttestation(uniqueParams);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('SERVER_ERROR');
        expect((e as ControllerWitnessRouteError).message).toContain('schema not deployed');
      }
    });

    it('throws when controller-witness schema has no easSchemaString', async () => {
      const uniqueParams: ControllerWitnessAttestationParams = {
        ...params,
        subject: 'did:web:cw-no-schema-string.example.com',
        controller: 'did:pkh:eip155:66238:0x' + '2'.repeat(40),
      };

      mockSchemaEncoderDecode.mockReturnValueOnce([
        { name: 'subject', value: uniqueParams.subject },
        { name: 'keyId', value: uniqueParams.controller },
      ]);
      vi.mocked(evidence.findControllerInDnsTxt).mockResolvedValueOnce({
        found: true,
        matchedController: uniqueParams.controller,
      });
      // Return CW schema with valid UID but no easSchemaString
      vi.mocked(schemas.getSchema).mockReturnValueOnce({
        id: 'controller-witness',
        deployedUIDs: { 66238: '0x' + 'c'.repeat(64) },
        // no easSchemaString
      } as any);

      await expect(submitControllerWitnessAttestation(uniqueParams)).rejects.toThrow(
        ControllerWitnessRouteError,
      );

      mockSchemaEncoderDecode.mockReturnValueOnce([
        { name: 'subject', value: uniqueParams.subject },
        { name: 'keyId', value: uniqueParams.controller },
      ]);
      vi.mocked(evidence.findControllerInDnsTxt).mockResolvedValueOnce({
        found: true,
        matchedController: uniqueParams.controller,
      });
      vi.mocked(schemas.getSchema).mockReturnValueOnce({
        id: 'controller-witness',
        deployedUIDs: { 66238: '0x' + 'c'.repeat(64) },
      } as any);

      try {
        await submitControllerWitnessAttestation(uniqueParams);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('SERVER_ERROR');
        expect((e as ControllerWitnessRouteError).message).toContain('easSchemaString not found');
      }
    });

    it('throws SERVER_ERROR when EAS attest call fails', async () => {
      const uniqueParams: ControllerWitnessAttestationParams = {
        ...params,
        subject: 'did:web:eas-fail.example.com',
        controller: 'did:pkh:eip155:66238:0x' + '3'.repeat(40),
      };

      mockSchemaEncoderDecode.mockReturnValueOnce([
        { name: 'subject', value: uniqueParams.subject },
        { name: 'keyId', value: uniqueParams.controller },
      ]);
      vi.mocked(evidence.findControllerInDnsTxt).mockResolvedValueOnce({
        found: true,
        matchedController: uniqueParams.controller,
      });
      mockEasAttest.mockRejectedValueOnce(new Error('insufficient funds'));

      await expect(submitControllerWitnessAttestation(uniqueParams)).rejects.toThrow(
        ControllerWitnessRouteError,
      );

      mockSchemaEncoderDecode.mockReturnValueOnce([
        { name: 'subject', value: uniqueParams.subject },
        { name: 'keyId', value: uniqueParams.controller },
      ]);
      vi.mocked(evidence.findControllerInDnsTxt).mockResolvedValueOnce({
        found: true,
        matchedController: uniqueParams.controller,
      });
      mockEasAttest.mockRejectedValueOnce({ reason: 'execution reverted' });

      try {
        await submitControllerWitnessAttestation(uniqueParams);
      } catch (e) {
        expect((e as ControllerWitnessRouteError).code).toBe('SERVER_ERROR');
        expect((e as ControllerWitnessRouteError).message).toContain('EAS attestation submission failed');
      }
    });

    it('completes full success path: gate checks → evidence → EAS submission', async () => {
      const uniqueParams: ControllerWitnessAttestationParams = {
        ...params,
        subject: 'did:web:full-success.example.com',
        controller: 'did:pkh:eip155:66238:0x' + '4'.repeat(40),
      };

      mockSchemaEncoderDecode.mockReturnValueOnce([
        { name: 'subject', value: uniqueParams.subject },
        { name: 'keyId', value: uniqueParams.controller },
      ]);
      vi.mocked(evidence.findControllerInDnsTxt).mockResolvedValueOnce({
        found: true,
        matchedController: uniqueParams.controller,
      });

      const expectedUid = '0x' + 'f'.repeat(64);
      mockEasAttest.mockResolvedValueOnce({
        wait: vi.fn().mockResolvedValue(expectedUid),
        receipt: {
          hash: '0xtxhash123',
          blockNumber: 42,
        },
      });

      const result = await submitControllerWitnessAttestation(uniqueParams);

      expect(result.success).toBe(true);
      expect(result.existing).toBe(false);
      expect(result.uid).toBe(expectedUid);
      expect(result.txHash).toBe('0xtxhash123');
      expect(result.blockNumber).toBe(42);
      expect(typeof result.observedAt).toBe('number');
      expect(result.observedAt).toBeGreaterThan(0);

      // Verify the attestation was cached for duplicate detection
      const cached = await checkExistingControllerWitnessAttestation(
        uniqueParams.subject,
        uniqueParams.controller,
      );
      expect(cached).not.toBeNull();
      expect(cached!.uid).toBe(expectedUid);
    });

    it('success path returns null txHash/blockNumber when receipt is missing', async () => {
      const uniqueParams: ControllerWitnessAttestationParams = {
        ...params,
        subject: 'did:web:no-receipt.example.com',
        controller: 'did:pkh:eip155:66238:0x' + '5'.repeat(40),
      };

      mockSchemaEncoderDecode.mockReturnValueOnce([
        { name: 'subject', value: uniqueParams.subject },
        { name: 'keyId', value: uniqueParams.controller },
      ]);
      vi.mocked(evidence.findControllerInDnsTxt).mockResolvedValueOnce({
        found: true,
        matchedController: uniqueParams.controller,
      });

      const expectedUid = '0x' + 'a'.repeat(62) + 'ff';
      mockEasAttest.mockResolvedValueOnce({
        wait: vi.fn().mockResolvedValue(expectedUid),
        receipt: undefined, // no receipt
      });

      const result = await submitControllerWitnessAttestation(uniqueParams);

      expect(result.success).toBe(true);
      expect(result.existing).toBe(false);
      expect(result.uid).toBe(expectedUid);
      expect(result.txHash).toBeNull();
      expect(result.blockNumber).toBeNull();
    });
  });
});
