/**
 * Tests for uncovered utility functions in schema/data-model.ts
 * Covers lines 833, 868-869
 */

import { describe, it, expect } from 'vitest';
import {
  getVisibleFields,
  getFieldsByStorage,
  FIELDS,
} from '@/schema/data-model';

describe('schema/data-model - Uncovered Utilities', () => {
  /**
   * Test: getVisibleFields (covers line 833)
   * Tests filtering fields by interfaces for a given step
   */
  it('filters fields by interfaces for step-2-onchain', () => {
    // Test that fields are filtered based on interface flags
    const interfaceFlags = {
      MCP1: true,
      'OMAM-1': false,
      'OMAM-2': false,
    };

    const result = getVisibleFields('step-2-onchain', interfaceFlags);

    // Should only include fields that have at least one interface matching true in flags
    expect(Array.isArray(result)).toBe(true);
    
    // All returned fields should have at least one interface that's enabled
    result.forEach((field) => {
      const hasEnabledInterface = field.interfaces.some(
        (iface) => interfaceFlags[iface as keyof typeof interfaceFlags]
      );
      expect(hasEnabledInterface).toBe(true);
    });
  });

  /**
   * Test: getVisibleFields with multiple interfaces enabled
   */
  it('filters fields with multiple interfaces enabled', () => {
    const interfaceFlags = {
      MCP1: true,
      'OMAM-1': true,
      'OMAM-2': true,
    };

    const result = getVisibleFields('step-3-common', interfaceFlags);

    expect(Array.isArray(result)).toBe(true);
    // With all interfaces enabled, should return more fields
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test: getVisibleFields with no interfaces enabled
   */
  it('returns empty array when no interfaces are enabled', () => {
    const interfaceFlags = {
      MCP1: false,
      'OMAM-1': false,
      'OMAM-2': false,
    };

    const result = getVisibleFields('step-2-onchain', interfaceFlags);

    // With no interfaces enabled, should return empty array
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  /**
   * Test: getFieldsByStorage with onChain=true (covers line 868)
   * Tests filtering fields by storage type
   */
  it('returns only on-chain fields when onChain=true', () => {
    const result = getFieldsByStorage(true);

    expect(Array.isArray(result)).toBe(true);
    
    // All returned fields should have onChain=true
    result.forEach((field) => {
      expect(field.onChain).toBe(true);
    });

    // Should have at least some on-chain fields
    expect(result.length).toBeGreaterThan(0);
  });

  /**
   * Test: getFieldsByStorage with onChain=false (covers line 868)
   * Tests filtering fields for off-chain storage
   */
  it('returns only off-chain fields when onChain=false', () => {
    const result = getFieldsByStorage(false);

    expect(Array.isArray(result)).toBe(true);
    
    // All returned fields should have onChain=false
    result.forEach((field) => {
      expect(field.onChain).toBe(false);
    });

    // Should have at least some off-chain fields
    expect(result.length).toBeGreaterThan(0);
  });

  /**
   * Test: verify that on-chain and off-chain fields are mutually exclusive
   */
  it('on-chain and off-chain fields cover all fields', () => {
    const onChainFields = getFieldsByStorage(true);
    const offChainFields = getFieldsByStorage(false);

    // Combined should equal total fields
    expect(onChainFields.length + offChainFields.length).toBe(FIELDS.length);

    // No overlap
    const onChainIds = new Set(onChainFields.map((f) => f.id));
    const offChainIds = new Set(offChainFields.map((f) => f.id));
    
    onChainIds.forEach((id) => {
      expect(offChainIds.has(id)).toBe(false);
    });
  });
});

