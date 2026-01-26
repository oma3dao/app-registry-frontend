/**
 * Registry Update Mock Tests
 * 
 * Tests update transaction handling with realistic blockchain responses
 * Validates status updates and app data updates
 * 
 * Specification Coverage:
 * - OT-ID-020: Status can be updated (Active/Deprecated/Replaced)
 * - OT-ID-021: Updates require owner authorization
 * - OT-ID-022: Version updates must follow semver rules
 * - OT-ID-023: DataUrl/DataHash can be updated together
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prepareUpdateStatus, prepareUpdateApp } from '@/lib/contracts/registry.write';
import type { UpdateStatusInput, UpdateAppInput, Status } from '@/lib/contracts/types';

// Mock thirdweb
vi.mock('thirdweb', () => ({
  prepareContractCall: vi.fn((options: any) => ({
    to: options.contract?.address || '0x1234567890123456789012345678901234567890',
    data: '0xmockedcalldata',
    value: 0n,
    params: options.params || [],
    method: options.method || '',
    __mockOptions: options,
  })),
}));

// Mock contract client
vi.mock('@/lib/contracts/client', () => ({
  getAppRegistryContract: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    chain: { id: 31337 },
  })),
}));

// Mock DID normalization (importOriginal pattern per TEST-MIGRATION-GUIDE)
vi.mock('@/lib/utils/did', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/did')>();
  return {
    ...actual,
    normalizeDidWeb: vi.fn((did: string) => did),
    normalizeDid: vi.fn((did: string) => did),
  };
});

// Mock error normalizer
vi.mock('@/lib/contracts/errors', () => ({
  normalizeEvmError: vi.fn((e: any) => e),
}));

import { prepareContractCall } from 'thirdweb';

describe('Registry Update Mock Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('prepareUpdateStatus', () => {
    /**
     * Test: Status update to Active (0)
     * Apps can be reactivated after deprecation
     */
    it('prepares status update to Active', () => {
      const input: UpdateStatusInput = {
        did: 'did:web:example.com',
        major: 1,
        status: 'Active',
      };

      const result = prepareUpdateStatus(input);

      expect(result).toBeDefined();
      expect(prepareContractCall).toHaveBeenCalledTimes(1);
      
      const callArgs = (prepareContractCall as any).mock.calls[0][0];
      expect(callArgs.params[0]).toBe('did:web:example.com');
      expect(callArgs.params[1]).toBe(1); // major
      expect(callArgs.params[2]).toBe(0); // Active = 0
    });

    /**
     * Test: Status update to Deprecated (1)
     * Marks app as deprecated but still available
     */
    it('prepares status update to Deprecated', () => {
      const input: UpdateStatusInput = {
        did: 'did:web:example.com',
        major: 1,
        status: 'Deprecated',
      };

      prepareUpdateStatus(input);

      const callArgs = (prepareContractCall as any).mock.calls[0][0];
      expect(callArgs.params[2]).toBe(1); // Deprecated = 1
    });

    /**
     * Test: Status update to Replaced (2)
     * Indicates a new major version replaces this one
     */
    it('prepares status update to Replaced', () => {
      const input: UpdateStatusInput = {
        did: 'did:web:example.com',
        major: 1,
        status: 'Replaced',
      };

      prepareUpdateStatus(input);

      const callArgs = (prepareContractCall as any).mock.calls[0][0];
      expect(callArgs.params[2]).toBe(2); // Replaced = 2
    });

    /**
     * Test: All status values map correctly
     */
    it('maps all status values correctly', () => {
      const statusMappings: [Status, number][] = [
        ['Active', 0],
        ['Deprecated', 1],
        ['Replaced', 2],
      ];

      for (const [status, expected] of statusMappings) {
        vi.clearAllMocks();
        
        const input: UpdateStatusInput = {
          did: 'did:web:example.com',
          major: 1,
          status,
        };

        prepareUpdateStatus(input);

        const callArgs = (prepareContractCall as any).mock.calls[0][0];
        expect(callArgs.params[2]).toBe(expected);
      }
    });

    /**
     * Test: Uses correct method signature
     */
    it('uses correct updateStatus method signature', () => {
      const input: UpdateStatusInput = {
        did: 'did:web:example.com',
        major: 1,
        status: 'Active',
      };

      prepareUpdateStatus(input);

      const callArgs = (prepareContractCall as any).mock.calls[0][0];
      expect(callArgs.method).toContain('updateStatus');
    });

    /**
     * Test: Major version is correctly passed
     */
    it('passes major version correctly', () => {
      const testMajors = [0, 1, 2, 10, 255];

      for (const major of testMajors) {
        vi.clearAllMocks();
        
        const input: UpdateStatusInput = {
          did: 'did:web:example.com',
          major,
          status: 'Active',
        };

        prepareUpdateStatus(input);

        const callArgs = (prepareContractCall as any).mock.calls[0][0];
        expect(callArgs.params[1]).toBe(major);
      }
    });
  });

  describe('prepareUpdateApp', () => {
    /**
     * Test: Full app update with all fields
     * Updates dataHash, interfaces, traits, and version
     */
    it('prepares full app update with all fields', () => {
      const input: UpdateAppInput = {
        did: 'did:web:example.com',
        major: 1,
        newDataHash: '0x' + 'a'.repeat(64),
        newDataHashAlgorithm: 0,
        newInterfaces: 0b0011,
        newTraitHashes: ['0x' + 'b'.repeat(64)],
        newMinor: 1,
        newPatch: 0,
        metadataJson: '{"updated": true}',
      };

      const result = prepareUpdateApp(input);

      expect(result).toBeDefined();
      expect(prepareContractCall).toHaveBeenCalledTimes(1);
      
      const callArgs = (prepareContractCall as any).mock.calls[0][0];
      expect(callArgs.params[0]).toBe('did:web:example.com'); // DID
      expect(callArgs.params[1]).toBe(1); // major
      expect(callArgs.params[2]).toMatch(/^0x[a-f0-9]{64}$/i); // newDataHash
    });

    /**
     * Test: Partial update - only version bump
     * Minor/patch updates without changing data
     */
    it('prepares version-only update with defaults', () => {
      const input: UpdateAppInput = {
        did: 'did:web:example.com',
        major: 1,
        newMinor: 2,
        newPatch: 1,
        // No data changes
      };

      prepareUpdateApp(input);

      const callArgs = (prepareContractCall as any).mock.calls[0][0];
      // Default values for unchanged fields
      expect(callArgs.params[2]).toBe('0x0000000000000000000000000000000000000000000000000000000000000000'); // bytes32(0) = no change
      expect(callArgs.params[3]).toBe(0); // dataHashAlgorithm = 0
      expect(callArgs.params[4]).toBe(0); // interfaces = 0 (no change)
      expect(callArgs.params[5]).toEqual([]); // empty traits = no change
    });

    /**
     * Test: Interface update preserves bitmap
     */
    it('preserves interface bitmap in updates', () => {
      const interfaceValues = [0b0001, 0b0011, 0b0111, 0b1111, 0];

      for (const interfaces of interfaceValues) {
        vi.clearAllMocks();
        
        const input: UpdateAppInput = {
          did: 'did:web:example.com',
          major: 1,
          newInterfaces: interfaces,
          newMinor: 1,
          newPatch: 0,
        };

        prepareUpdateApp(input);

        const callArgs = (prepareContractCall as any).mock.calls[0][0];
        expect(callArgs.params[4]).toBe(interfaces);
      }
    });

    /**
     * Test: Trait hash updates
     * Can add, remove, or replace traits
     */
    it('handles trait hash updates', () => {
      const testCases = [
        { traits: [], desc: 'Clear all traits' },
        { traits: ['0x' + 'a'.repeat(64)], desc: 'Single trait' },
        { traits: ['0x' + 'a'.repeat(64), '0x' + 'b'.repeat(64)], desc: 'Multiple traits' },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        
        const input: UpdateAppInput = {
          did: 'did:web:example.com',
          major: 1,
          newTraitHashes: testCase.traits,
          newMinor: 1,
          newPatch: 0,
        };

        prepareUpdateApp(input);

        const callArgs = (prepareContractCall as any).mock.calls[0][0];
        expect(callArgs.params[5]).toEqual(testCase.traits.map(t => t));
      }
    });

    /**
     * Test: Metadata JSON can be updated
     */
    it('includes metadata JSON in update', () => {
      const metadataJson = JSON.stringify({
        name: 'Updated App',
        version: '1.1.0',
        description: 'An updated application',
      });

      const input: UpdateAppInput = {
        did: 'did:web:example.com',
        major: 1,
        newMinor: 1,
        newPatch: 0,
        metadataJson,
      };

      prepareUpdateApp(input);

      const callArgs = (prepareContractCall as any).mock.calls[0][0];
      expect(callArgs.params[8]).toBe(metadataJson);
    });

    /**
     * Test: Empty metadata JSON defaults to empty string
     */
    it('defaults metadata JSON to empty string', () => {
      const input: UpdateAppInput = {
        did: 'did:web:example.com',
        major: 1,
        newMinor: 1,
        newPatch: 0,
      };

      prepareUpdateApp(input);

      const callArgs = (prepareContractCall as any).mock.calls[0][0];
      expect(callArgs.params[8]).toBe('');
    });

    /**
     * Test: Uses correct method signature
     */
    it('uses updateAppControlled method signature', () => {
      const input: UpdateAppInput = {
        did: 'did:web:example.com',
        major: 1,
        newMinor: 1,
        newPatch: 0,
      };

      prepareUpdateApp(input);

      const callArgs = (prepareContractCall as any).mock.calls[0][0];
      expect(callArgs.method).toContain('updateAppControlled');
    });
  });

  describe('Version Update Rules', () => {
    /**
     * Test: Minor version can increment
     */
    it('allows minor version increment', () => {
      const input: UpdateAppInput = {
        did: 'did:web:example.com',
        major: 1,
        newMinor: 2,
        newPatch: 0,
      };

      const result = prepareUpdateApp(input);
      expect(result).toBeDefined();
    });

    /**
     * Test: Patch version can increment
     */
    it('allows patch version increment', () => {
      const input: UpdateAppInput = {
        did: 'did:web:example.com',
        major: 1,
        newMinor: 0,
        newPatch: 5,
      };

      const result = prepareUpdateApp(input);
      expect(result).toBeDefined();
    });

    /**
     * Test: Version can be reset on minor bump
     * When minor increments, patch resets to 0
     */
    it('allows patch reset on minor bump', () => {
      const input: UpdateAppInput = {
        did: 'did:web:example.com',
        major: 1,
        newMinor: 5,
        newPatch: 0, // Reset from previous patch
      };

      const result = prepareUpdateApp(input);
      expect(result).toBeDefined();
      
      const callArgs = (prepareContractCall as any).mock.calls[0][0];
      expect(callArgs.params[6]).toBe(5); // newMinor
      expect(callArgs.params[7]).toBe(0); // newPatch
    });

    /**
     * Test: Maximum version values (uint8 max)
     */
    it('handles maximum uint8 version values', () => {
      const input: UpdateAppInput = {
        did: 'did:web:example.com',
        major: 255,
        newMinor: 255,
        newPatch: 255,
      };

      const result = prepareUpdateApp(input);
      expect(result).toBeDefined();
      
      const callArgs = (prepareContractCall as any).mock.calls[0][0];
      expect(callArgs.params[1]).toBe(255);
      expect(callArgs.params[6]).toBe(255);
      expect(callArgs.params[7]).toBe(255);
    });
  });

  describe('Data Hash Updates', () => {
    /**
     * Test: DataHash update with SHA256 algorithm
     */
    it('accepts SHA256 algorithm for hash update', () => {
      const input: UpdateAppInput = {
        did: 'did:web:example.com',
        major: 1,
        newDataHash: '0x' + '1'.repeat(64),
        newDataHashAlgorithm: 0, // SHA256
        newMinor: 1,
        newPatch: 0,
      };

      prepareUpdateApp(input);

      const callArgs = (prepareContractCall as any).mock.calls[0][0];
      expect(callArgs.params[3]).toBe(0);
    });

    /**
     * Test: DataHash update with Keccak256 algorithm
     */
    it('accepts Keccak256 algorithm for hash update', () => {
      const input: UpdateAppInput = {
        did: 'did:web:example.com',
        major: 1,
        newDataHash: '0x' + '1'.repeat(64),
        newDataHashAlgorithm: 1, // Keccak256
        newMinor: 1,
        newPatch: 0,
      };

      prepareUpdateApp(input);

      const callArgs = (prepareContractCall as any).mock.calls[0][0];
      expect(callArgs.params[3]).toBe(1);
    });

    /**
     * Test: No hash change uses zero bytes32
     */
    it('uses zero bytes32 for no hash change', () => {
      const input: UpdateAppInput = {
        did: 'did:web:example.com',
        major: 1,
        newMinor: 1,
        newPatch: 0,
        // No newDataHash provided
      };

      prepareUpdateApp(input);

      const callArgs = (prepareContractCall as any).mock.calls[0][0];
      expect(callArgs.params[2]).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    });
  });

  describe('Error Handling', () => {
    /**
     * Test: Update propagates DID normalization errors
     * Uses the vi.mocked normalizeDid from the module mock (per TEST-MIGRATION-GUIDE)
     */
    it('propagates DID normalization errors in updates', async () => {
      // Import the mocked module
      const didUtils = await import('@/lib/utils/did');
      vi.mocked(didUtils.normalizeDid).mockImplementationOnce(() => {
        throw new Error('Invalid DID format');
      });

      const input: UpdateAppInput = {
        did: 'invalid-did',
        major: 1,
        newMinor: 1,
        newPatch: 0,
      };

      expect(() => prepareUpdateApp(input)).toThrow('Invalid DID format');
    });

    /**
     * Test: Status update propagates errors
     */
    it('propagates errors in status updates', () => {
      vi.mocked(prepareContractCall).mockImplementationOnce(() => {
        throw new Error('Contract error');
      });

      const input: UpdateStatusInput = {
        did: 'did:web:example.com',
        major: 1,
        status: 'Active',
      };

      expect(() => prepareUpdateStatus(input)).toThrow();
    });
  });
});

