import { describe, it, expect } from 'vitest';
import { isFieldRequired, getByPath } from '@/lib/wizard/field-requirements';
import type { InterfaceFlags } from '@/lib/wizard/types';

describe('Wizard Field Requirements', () => {
  describe('isFieldRequired', () => {
    // Tests required fields for Human interface
    it('requires human-specific fields when human interface is enabled', () => {
      const flags: InterfaceFlags = { human: true, api: false, smartContract: false };

      expect(isFieldRequired('screenshotUrls', flags)).toBe(true);
      expect(isFieldRequired('image', flags)).toBe(true);
      expect(isFieldRequired('description', flags)).toBe(true);
    });

    // Tests Human interface not required when disabled
    it('does not require human fields when human interface is disabled', () => {
      const flags: InterfaceFlags = { human: false, api: true, smartContract: false };

      expect(isFieldRequired('screenshotUrls', flags)).toBe(false);
      expect(isFieldRequired('image', flags)).toBe(false);
    });

    // Tests common required fields
    it('requires common fields for all interfaces', () => {
      const humanFlags: InterfaceFlags = { human: true, api: false, smartContract: false };
      const apiFlags: InterfaceFlags = { human: false, api: true, smartContract: false };
      const contractFlags: InterfaceFlags = { human: false, api: false, smartContract: true };

      // Common fields should be required regardless of interface
      expect(isFieldRequired('name', humanFlags)).toBe(true);
      expect(isFieldRequired('name', apiFlags)).toBe(true);
      expect(isFieldRequired('name', contractFlags)).toBe(true);

      expect(isFieldRequired('did', humanFlags)).toBe(true);
      expect(isFieldRequired('did', apiFlags)).toBe(true);
      expect(isFieldRequired('did', contractFlags)).toBe(true);

      expect(isFieldRequired('version', humanFlags)).toBe(true);
      expect(isFieldRequired('version', apiFlags)).toBe(true);
      expect(isFieldRequired('version', contractFlags)).toBe(true);

      expect(isFieldRequired('dataUrl', humanFlags)).toBe(true);
      expect(isFieldRequired('dataUrl', apiFlags)).toBe(true);
      expect(isFieldRequired('dataUrl', contractFlags)).toBe(true);
    });

    // Tests API-specific required fields
    it('requires API-specific fields when API interface is enabled', () => {
      const flags: InterfaceFlags = { human: false, api: true, smartContract: false };

      expect(isFieldRequired('endpoint.url', flags)).toBe(true);
      expect(isFieldRequired('endpoint', flags)).toBe(true);
    });

    // Tests API fields not required when disabled
    it('does not require API fields when API interface is disabled', () => {
      const flags: InterfaceFlags = { human: true, api: false, smartContract: false };

      expect(isFieldRequired('endpoint.url', flags)).toBe(false);
      expect(isFieldRequired('endpoint', flags)).toBe(false);
    });

    // Tests Smart Contract specific fields
    it('does not require endpoint for Smart Contract interface (endpoint is optional for contracts)', () => {
      const flags: InterfaceFlags = { human: false, api: false, smartContract: true };

      // Per the field requirements, endpoint is only required for API, not for Smart Contracts
      expect(isFieldRequired('endpoint.url', flags)).toBe(false);
      expect(isFieldRequired('endpoint', flags)).toBe(false);
    });

    // Tests optional fields
    it('returns false for optional fields', () => {
      const flags: InterfaceFlags = { human: true, api: false, smartContract: false };

      expect(isFieldRequired('summary', flags)).toBe(false);
      expect(isFieldRequired('legalUrl', flags)).toBe(false);
      expect(isFieldRequired('supportUrl', flags)).toBe(false);
      expect(isFieldRequired('traits', flags)).toBe(false);
      expect(isFieldRequired('fungibleTokenId', flags)).toBe(false);
      expect(isFieldRequired('contractId', flags)).toBe(false);
      expect(isFieldRequired('iwpsPortalUrl', flags)).toBe(false);
      expect(isFieldRequired('external_url', flags)).toBe(false);
    });

    // Tests multiple interfaces enabled
    it('handles multiple interfaces enabled simultaneously', () => {
      const flags: InterfaceFlags = { human: true, api: true, smartContract: true };

      // Should require fields from all enabled interfaces
      expect(isFieldRequired('screenshotUrls', flags)).toBe(true); // Human
      expect(isFieldRequired('endpoint.url', flags)).toBe(true); // API & Smart Contract
      expect(isFieldRequired('image', flags)).toBe(true); // Human
      expect(isFieldRequired('name', flags)).toBe(true); // Common
    });

    // Tests no interfaces enabled
    it('handles no interfaces enabled edge case', () => {
      const flags: InterfaceFlags = { human: false, api: false, smartContract: false };

      // No interface enabled means no requirements met
      expect(isFieldRequired('name', flags)).toBe(false);
      expect(isFieldRequired('did', flags)).toBe(false);
      expect(isFieldRequired('version', flags)).toBe(false);

      // Interface-specific fields should not be required
      expect(isFieldRequired('screenshotUrls', flags)).toBe(false);
      expect(isFieldRequired('endpoint.url', flags)).toBe(false);
    });

    // Tests unknown field paths
    it('returns false for unknown field paths', () => {
      const flags: InterfaceFlags = { human: true, api: false, smartContract: false };

      expect(isFieldRequired('unknown.field.path', flags)).toBe(false);
      expect(isFieldRequired('nonexistent', flags)).toBe(false);
    });

    // Tests nested field paths
    it('handles nested field path checking', () => {
      const flags: InterfaceFlags = { human: true, api: true, smartContract: false };

      expect(isFieldRequired('description', flags)).toBe(true);
      expect(isFieldRequired('image', flags)).toBe(true);
      expect(isFieldRequired('endpoint.url', flags)).toBe(true);
    });

    // Tests image requirement (human only)
    it('requires image only for human interface', () => {
      const humanFlags: InterfaceFlags = { human: true, api: false, smartContract: false };
      const apiFlags: InterfaceFlags = { human: false, api: true, smartContract: false };

      expect(isFieldRequired('image', humanFlags)).toBe(true);
      expect(isFieldRequired('image', apiFlags)).toBe(false);
    });

    // Tests publisher requirement
    it('requires publisher for all interfaces', () => {
      const humanFlags: InterfaceFlags = { human: true, api: false, smartContract: false };
      const apiFlags: InterfaceFlags = { human: false, api: true, smartContract: false };
      const contractFlags: InterfaceFlags = { human: false, api: false, smartContract: true };

      expect(isFieldRequired('publisher', humanFlags)).toBe(true);
      expect(isFieldRequired('publisher', apiFlags)).toBe(true);
      expect(isFieldRequired('publisher', contractFlags)).toBe(true);
    });

    // Tests undefined flags
    it('returns false when flags are undefined', () => {
      expect(isFieldRequired('name', undefined)).toBe(false);
      expect(isFieldRequired('did', undefined)).toBe(false);
    });

    // Tests getByPath helper (if exported)
    it('handles empty path segments', () => {
      const flags: InterfaceFlags = { human: true, api: false, smartContract: false };
      
      // Should handle gracefully
      expect(isFieldRequired('', flags)).toBe(false);
    });
  });

  describe('getByPath', () => {
    // Tests getByPath helper function for nested object access
    it('retrieves nested values using dot notation', () => {
      const obj = {
        level1: {
          level2: {
            value: 'found'
          }
        }
      };

      expect(getByPath(obj, 'level1.level2.value')).toBe('found');
    });

    it('returns undefined for non-existent paths', () => {
      const obj = { a: 1 };

      expect(getByPath(obj, 'a.b.c')).toBeUndefined();
      expect(getByPath(obj, 'nonexistent')).toBeUndefined();
    });

    it('handles empty path', () => {
      const obj = { value: 'test' };

      expect(getByPath(obj, '')).toBeUndefined();
    });

    it('handles null/undefined intermediate values', () => {
      const obj = { a: null };

      expect(getByPath(obj, 'a.b')).toBeUndefined();
    });

    it('retrieves top-level values', () => {
      const obj = { name: 'Test', version: '1.0.0' };

      expect(getByPath(obj, 'name')).toBe('Test');
      expect(getByPath(obj, 'version')).toBe('1.0.0');
    });
  });
});

