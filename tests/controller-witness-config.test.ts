/**
 * Tests for controller-witness allowlist config
 *
 * Validates behavior against the actual allowlists in
 * src/config/controller-witness-config.ts (approved chains, attesters)
 * and the schema-derived witness approval from src/config/schemas.ts.
 *
 * Schema approval is now derived from schemas.ts — any schema with a
 * `witness` config and a non-zero deployedUID is automatically approved.
 * Field mappings (subjectField, controllerField) come from the schema's
 * `witness` block. No manual UID list to maintain.
 */

import { describe, it, expect } from 'vitest';
import {
  APPROVED_WITNESS_CHAINS,
  APPROVED_CONTROLLER_WITNESS_ATTESTERS,
} from '@/config/controller-witness-config';
import { getAllSchemas } from '@/config/schemas';

const HEX_20_BYTES = /^0x[0-9a-fA-F]{40}$/;
const ZERO_UID = '0x0000000000000000000000000000000000000000000000000000000000000000';

describe('controller-witness-config', () => {
  describe('APPROVED_WITNESS_CHAINS', () => {
    it('is a non-empty record', () => {
      expect(typeof APPROVED_WITNESS_CHAINS).toBe('object');
      expect(Array.isArray(APPROVED_WITNESS_CHAINS)).toBe(false);
      expect(Object.keys(APPROVED_WITNESS_CHAINS).length).toBeGreaterThan(0);
    });

    it('has numeric chain IDs as keys', () => {
      for (const key of Object.keys(APPROVED_WITNESS_CHAINS)) {
        const chainId = Number(key);
        expect(Number.isInteger(chainId)).toBe(true);
        expect(chainId).toBeGreaterThan(0);
      }
    });

    it('has 20-byte hex EAS contract addresses as values', () => {
      for (const easContract of Object.values(APPROVED_WITNESS_CHAINS)) {
        expect(typeof easContract).toBe('string');
        expect(HEX_20_BYTES.test(easContract)).toBe(true);
      }
    });
  });

  describe('APPROVED_CONTROLLER_WITNESS_ATTESTERS', () => {
    it('has chain IDs that are numbers', () => {
      for (const key of Object.keys(APPROVED_CONTROLLER_WITNESS_ATTESTERS)) {
        const chainId = Number(key);
        expect(Number.isInteger(chainId)).toBe(true);
      }
    });

    it('each chain has an array of 20-byte hex attester addresses', () => {
      for (const addrs of Object.values(APPROVED_CONTROLLER_WITNESS_ATTESTERS)) {
        expect(Array.isArray(addrs)).toBe(true);
        for (const addr of addrs) {
          expect(typeof addr).toBe('string');
          expect(HEX_20_BYTES.test(addr)).toBe(true);
        }
      }
    });

    it('every approved chain has at least one attester', () => {
      for (const [chainIdStr, addrs] of Object.entries(
        APPROVED_CONTROLLER_WITNESS_ATTESTERS
      )) {
        expect(addrs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('allowlist consistency', () => {
    it('every chain in APPROVED_WITNESS_CHAINS has attesters in APPROVED_CONTROLLER_WITNESS_ATTESTERS', () => {
      for (const chainId of Object.keys(APPROVED_WITNESS_CHAINS).map(Number)) {
        const attesters = APPROVED_CONTROLLER_WITNESS_ATTESTERS[chainId];
        expect(attesters).toBeDefined();
        expect(attesters!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('schema-derived witness approval', () => {
    const allSchemas = getAllSchemas();
    const witnessSchemas = allSchemas.filter((s) => s.witness);

    it('at least one schema has a witness config', () => {
      expect(witnessSchemas.length).toBeGreaterThan(0);
    });

    it('witness schemas have subjectField and controllerField', () => {
      for (const schema of witnessSchemas) {
        expect(schema.witness).toBeDefined();
        expect(typeof schema.witness!.subjectField).toBe('string');
        expect(schema.witness!.subjectField.length).toBeGreaterThan(0);
        expect(typeof schema.witness!.controllerField).toBe('string');
        expect(schema.witness!.controllerField.length).toBeGreaterThan(0);
      }
    });

    it('witness schemas have at least one non-zero deployedUID', () => {
      for (const schema of witnessSchemas) {
        expect(schema.deployedUIDs).toBeDefined();
        const nonZeroUIDs = Object.values(schema.deployedUIDs!).filter(
          (uid) => uid !== ZERO_UID
        );
        expect(nonZeroUIDs.length).toBeGreaterThan(0);
      }
    });

    it('witness schemas have an easSchemaString for decoding', () => {
      for (const schema of witnessSchemas) {
        expect(typeof schema.easSchemaString).toBe('string');
        expect(schema.easSchemaString!.length).toBeGreaterThan(0);
      }
    });

    it('key-binding schema has witness config with keyId as controllerField', () => {
      const kb = allSchemas.find((s) => s.id === 'key-binding');
      expect(kb).toBeDefined();
      expect(kb!.witness).toBeDefined();
      expect(kb!.witness!.subjectField).toBe('subject');
      expect(kb!.witness!.controllerField).toBe('keyId');
    });

    it('linked-identifier schema has witness config with linkedId as controllerField', () => {
      const li = allSchemas.find((s) => s.id === 'linked-identifier');
      expect(li).toBeDefined();
      expect(li!.witness).toBeDefined();
      expect(li!.witness!.subjectField).toBe('subject');
      expect(li!.witness!.controllerField).toBe('linkedId');
    });

    it('controller-witness schema exists but does not have witness config (it IS the witness)', () => {
      const cw = allSchemas.find((s) => s.id === 'controller-witness');
      expect(cw).toBeDefined();
      expect(cw!.witness).toBeUndefined();
    });

    it('each witness schema is deployed on at least one approved witness chain', () => {
      // Schemas may be deployed on chains that aren't yet approved for witnessing
      // (e.g., BSC Testnet). The requirement is that at least one approved chain
      // has a non-zero deployedUID for each witness-enabled schema.
      const approvedChainIds = Object.keys(APPROVED_WITNESS_CHAINS).map(Number);
      for (const schema of witnessSchemas) {
        const hasDeploymentOnApprovedChain = approvedChainIds.some(
          (chainId) =>
            schema.deployedUIDs![chainId] &&
            schema.deployedUIDs![chainId] !== ZERO_UID
        );
        expect(hasDeploymentOnApprovedChain).toBe(true);
      }
    });

    it('witness subjectField references an actual field in the schema', () => {
      for (const schema of witnessSchemas) {
        const fieldNames = schema.fields.map((f: any) => f.name);
        expect(fieldNames).toContain(schema.witness!.subjectField);
      }
    });

    it('witness controllerField references an actual field in the schema', () => {
      for (const schema of witnessSchemas) {
        const fieldNames = schema.fields.map((f: any) => f.name);
        expect(fieldNames).toContain(schema.witness!.controllerField);
      }
    });

    it('witness field references point to string-typed fields', () => {
      for (const schema of witnessSchemas) {
        const subjectField = schema.fields.find(
          (f: any) => f.name === schema.witness!.subjectField
        );
        const controllerField = schema.fields.find(
          (f: any) => f.name === schema.witness!.controllerField
        );
        expect(subjectField).toBeDefined();
        expect(subjectField!.type).toBe('string');
        expect(controllerField).toBeDefined();
        expect(controllerField!.type).toBe('string');
      }
    });

    it('priorUIDs entries (if present) are arrays of 32-byte hex strings', () => {
      const HEX_32_BYTES = /^0x[0-9a-fA-F]{64}$/;
      for (const schema of allSchemas) {
        if (!schema.priorUIDs) continue;
        for (const [chainIdStr, uids] of Object.entries(schema.priorUIDs)) {
          expect(Number.isInteger(Number(chainIdStr))).toBe(true);
          expect(Array.isArray(uids)).toBe(true);
          for (const uid of uids as string[]) {
            expect(HEX_32_BYTES.test(uid)).toBe(true);
          }
        }
      }
    });
  });
});
