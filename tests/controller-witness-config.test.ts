/**
 * Tests for controller-witness allowlist config
 *
 * Validates behavior against the actual allowlists in
 * src/config/controller-witness-config.ts (approved chains,
 * schemas, field mappings). Ensures config structure and
 * consistency for controller-witness route.
 */

import { describe, it, expect } from 'vitest';
import {
  APPROVED_WITNESS_CHAINS,
  APPROVED_CONTROLLER_SCHEMA_UIDS,
  SCHEMA_FIELD_MAPPINGS,
  APPROVED_CONTROLLER_WITNESS_ATTESTERS,
  type SchemaFieldMapping,
} from '@/config/controller-witness-config';

const HEX_20_BYTES = /^0x[0-9a-fA-F]{40}$/;
const HEX_32_BYTES = /^0x[0-9a-fA-F]{64}$/;

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

  describe('APPROVED_CONTROLLER_SCHEMA_UIDS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(APPROVED_CONTROLLER_SCHEMA_UIDS)).toBe(true);
      expect(APPROVED_CONTROLLER_SCHEMA_UIDS.length).toBeGreaterThan(0);
    });

    it('contains only 32-byte hex schema UIDs', () => {
      for (const uid of APPROVED_CONTROLLER_SCHEMA_UIDS) {
        expect(typeof uid).toBe('string');
        expect(HEX_32_BYTES.test(uid)).toBe(true);
      }
    });

    it('has no duplicate UIDs', () => {
      const lower = APPROVED_CONTROLLER_SCHEMA_UIDS.map((u) => u.toLowerCase());
      const set = new Set(lower);
      expect(set.size).toBe(APPROVED_CONTROLLER_SCHEMA_UIDS.length);
    });
  });

  describe('SCHEMA_FIELD_MAPPINGS', () => {
    it('has an entry for every approved schema UID', () => {
      for (const schemaUid of APPROVED_CONTROLLER_SCHEMA_UIDS) {
        const mapping =
          SCHEMA_FIELD_MAPPINGS[schemaUid] ??
          SCHEMA_FIELD_MAPPINGS[schemaUid.toLowerCase()];
        expect(mapping).toBeDefined();
        expect(mapping).toHaveProperty('subjectField');
        expect(mapping).toHaveProperty('controllerField');
      }
    });

    it('mappings have non-empty subjectField and controllerField', () => {
      for (const mapping of Object.values(SCHEMA_FIELD_MAPPINGS) as SchemaFieldMapping[]) {
        expect(typeof mapping.subjectField).toBe('string');
        expect(mapping.subjectField.length).toBeGreaterThan(0);
        expect(typeof mapping.controllerField).toBe('string');
        expect(mapping.controllerField.length).toBeGreaterThan(0);
      }
    });

    it('subjectField is "subject" for all current mappings', () => {
      for (const mapping of Object.values(SCHEMA_FIELD_MAPPINGS) as SchemaFieldMapping[]) {
        expect(mapping.subjectField).toBe('subject');
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
});
