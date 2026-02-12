/**
 * Tests for attestation-services config module
 *
 * Covers EAS_CONFIG, ATTESTATION_SERVICES registry, helper functions,
 * CONTROLLER_WITNESS_CONFIG grace period, and ATTESTATION_QUERY_CONFIG.
 */

import { describe, it, expect } from 'vitest';
import {
  EAS_CONFIG,
  ATTESTATION_SERVICES,
  getAttestationService,
  getServicesForChain,
  getContractAddress,
  getAllServiceIds,
  CONTROLLER_WITNESS_CONFIG,
  ATTESTATION_QUERY_CONFIG,
  type AttestationServiceConfig,
} from '@/config/attestation-services';

const HEX_20_BYTES = /^0x[0-9a-fA-F]{40}$/;
const OMACHAIN_TESTNET_ID = 66238;
const OMACHAIN_MAINNET_ID = 6623;

describe('attestation-services', () => {
  describe('EAS_CONFIG', () => {
    it('has required fields', () => {
      expect(EAS_CONFIG.id).toBe('eas');
      expect(EAS_CONFIG.name).toBe('Ethereum Attestation Service');
      expect(typeof EAS_CONFIG.description).toBe('string');
      expect(EAS_CONFIG.description.length).toBeGreaterThan(0);
      expect(typeof EAS_CONFIG.website).toBe('string');
      expect(typeof EAS_CONFIG.docs).toBe('string');
    });

    it('supports OMAchain testnet and mainnet', () => {
      expect(EAS_CONFIG.supportedChains).toContain(OMACHAIN_TESTNET_ID);
      expect(EAS_CONFIG.supportedChains).toContain(OMACHAIN_MAINNET_ID);
    });

    it('has contract address entries for all supported chains', () => {
      for (const chainId of EAS_CONFIG.supportedChains) {
        const addr = EAS_CONFIG.contracts[chainId];
        expect(addr).toBeDefined();
        expect(typeof addr).toBe('string');
        expect(addr.length).toBeGreaterThan(0);
      }
    });

    it('has a valid 20-byte hex contract address for OMAchain testnet', () => {
      const addr = EAS_CONFIG.contracts[OMACHAIN_TESTNET_ID];
      expect(HEX_20_BYTES.test(addr)).toBe(true);
    });

    it('has a non-empty features list', () => {
      expect(Array.isArray(EAS_CONFIG.features)).toBe(true);
      expect(EAS_CONFIG.features.length).toBeGreaterThan(0);
      for (const feature of EAS_CONFIG.features) {
        expect(typeof feature).toBe('string');
        expect(feature.length).toBeGreaterThan(0);
      }
    });

    it('has estimated gas costs for supported chains', () => {
      expect(EAS_CONFIG.estimatedGasCost).toBeDefined();
      for (const chainId of EAS_CONFIG.supportedChains) {
        expect(typeof EAS_CONFIG.estimatedGasCost![chainId]).toBe('bigint');
        expect(EAS_CONFIG.estimatedGasCost![chainId]).toBeGreaterThan(0n);
      }
    });
  });

  describe('ATTESTATION_SERVICES registry', () => {
    it('contains the EAS service', () => {
      expect(ATTESTATION_SERVICES['eas']).toBeDefined();
      expect(ATTESTATION_SERVICES['eas']).toBe(EAS_CONFIG);
    });

    it('has at least one service', () => {
      expect(Object.keys(ATTESTATION_SERVICES).length).toBeGreaterThan(0);
    });
  });

  describe('getAttestationService', () => {
    it('returns EAS config for "eas" id', () => {
      const service = getAttestationService('eas');
      expect(service).toBeDefined();
      expect(service!.id).toBe('eas');
      expect(service).toBe(EAS_CONFIG);
    });

    it('returns undefined for unknown service id', () => {
      expect(getAttestationService('nonexistent')).toBeUndefined();
      expect(getAttestationService('')).toBeUndefined();
    });
  });

  describe('getServicesForChain', () => {
    it('returns EAS for OMAchain testnet', () => {
      const services = getServicesForChain(OMACHAIN_TESTNET_ID);
      expect(services.length).toBeGreaterThan(0);
      expect(services.some((s) => s.id === 'eas')).toBe(true);
    });

    it('returns EAS for OMAchain mainnet', () => {
      const services = getServicesForChain(OMACHAIN_MAINNET_ID);
      expect(services.length).toBeGreaterThan(0);
      expect(services.some((s) => s.id === 'eas')).toBe(true);
    });

    it('returns empty array for unsupported chain', () => {
      const services = getServicesForChain(99999);
      expect(services).toEqual([]);
    });
  });

  describe('getContractAddress', () => {
    it('returns contract address for EAS on OMAchain testnet', () => {
      const addr = getContractAddress('eas', OMACHAIN_TESTNET_ID);
      expect(addr).toBeDefined();
      expect(HEX_20_BYTES.test(addr!)).toBe(true);
    });

    it('returns a contract address entry for EAS on OMAchain mainnet (may be placeholder)', () => {
      const addr = getContractAddress('eas', OMACHAIN_MAINNET_ID);
      expect(addr).toBeDefined();
      expect(typeof addr).toBe('string');
    });

    it('returns undefined for unknown service id', () => {
      expect(getContractAddress('nonexistent', OMACHAIN_TESTNET_ID)).toBeUndefined();
    });

    it('returns undefined for unsupported chain on valid service', () => {
      expect(getContractAddress('eas', 99999)).toBeUndefined();
    });
  });

  describe('getAllServiceIds', () => {
    it('returns an array containing "eas"', () => {
      const ids = getAllServiceIds();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids).toContain('eas');
    });

    it('returns at least one service id', () => {
      expect(getAllServiceIds().length).toBeGreaterThan(0);
    });
  });

  describe('CONTROLLER_WITNESS_CONFIG', () => {
    it('has graceSchemaIds as a non-empty array', () => {
      expect(Array.isArray(CONTROLLER_WITNESS_CONFIG.graceSchemaIds)).toBe(true);
      expect(CONTROLLER_WITNESS_CONFIG.graceSchemaIds.length).toBeGreaterThan(0);
    });

    it('includes key-binding and linked-identifier in graceSchemaIds', () => {
      expect(CONTROLLER_WITNESS_CONFIG.graceSchemaIds).toContain('key-binding');
      expect(CONTROLLER_WITNESS_CONFIG.graceSchemaIds).toContain('linked-identifier');
    });

    it('has a positive graceSeconds value', () => {
      expect(typeof CONTROLLER_WITNESS_CONFIG.graceSeconds).toBe('number');
      expect(CONTROLLER_WITNESS_CONFIG.graceSeconds).toBeGreaterThan(0);
    });

    it('grace period is reasonable (between 30 seconds and 10 minutes)', () => {
      expect(CONTROLLER_WITNESS_CONFIG.graceSeconds).toBeGreaterThanOrEqual(30);
      expect(CONTROLLER_WITNESS_CONFIG.graceSeconds).toBeLessThanOrEqual(600);
    });
  });

  describe('ATTESTATION_QUERY_CONFIG', () => {
    it('has progressive block ranges in ascending order', () => {
      const ranges = ATTESTATION_QUERY_CONFIG.blockRanges;
      expect(Array.isArray(ranges)).toBe(true);
      expect(ranges.length).toBeGreaterThan(0);

      for (let i = 1; i < ranges.length; i++) {
        expect(ranges[i].blocks).toBeGreaterThan(ranges[i - 1].blocks);
      }
    });

    it('each block range has blocks (number) and label (string)', () => {
      for (const range of ATTESTATION_QUERY_CONFIG.blockRanges) {
        expect(typeof range.blocks).toBe('number');
        expect(range.blocks).toBeGreaterThan(0);
        expect(typeof range.label).toBe('string');
        expect(range.label.length).toBeGreaterThan(0);
      }
    });

    it('has a positive defaultLimit', () => {
      expect(typeof ATTESTATION_QUERY_CONFIG.defaultLimit).toBe('number');
      expect(ATTESTATION_QUERY_CONFIG.defaultLimit).toBeGreaterThan(0);
    });

    it('has a fetchMultiplier >= 1', () => {
      expect(typeof ATTESTATION_QUERY_CONFIG.fetchMultiplier).toBe('number');
      expect(ATTESTATION_QUERY_CONFIG.fetchMultiplier).toBeGreaterThanOrEqual(1);
    });
  });
});
