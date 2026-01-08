/**
 * Ownership Transfer Mock Tests
 * 
 * Tests NFT ownership changes and their effects on app registry
 * Validates ERC-721 transfer behavior and owner resolution
 * 
 * Specification Coverage:
 * - OT-ID-030: App ownership via ERC-721 token
 * - OT-ID-031: Ownership can be transferred
 * - OT-ID-032: Only owner can update app
 * - OT-ID-033: Minter != Owner after transfer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAppByDid,
  getAppsByOwner,
  getAppsByMinter,
} from '@/lib/contracts/registry.read';
import type { AppSummary } from '@/lib/contracts/types';

// Mock thirdweb
vi.mock('thirdweb', () => ({
  readContract: vi.fn(),
}));

// Mock contract client
vi.mock('@/lib/contracts/client', () => ({
  getAppRegistryContract: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    chain: { id: 31337 },
  })),
}));

// Mock DID utils
vi.mock('@/lib/utils/did', () => ({
  normalizeDidWeb: vi.fn((did: string) => did),
  getDidHash: vi.fn(async (did: string) => `0x${Buffer.from(did).toString('hex').padEnd(64, '0')}`),
}));

// Mock error normalizer
vi.mock('@/lib/contracts/errors', () => ({
  normalizeEvmError: vi.fn((e: any) => e),
}));

// Mock version utils
vi.mock('@/lib/utils/version', () => ({
  getCurrentVersion: vi.fn((history: any[]) => {
    if (!history || history.length === 0) return { major: 1, minor: 0, patch: 0 };
    const latest = history[history.length - 1];
    return { major: latest.major || 1, minor: latest.minor || 0, patch: latest.patch || 0 };
  }),
}));

import { readContract } from 'thirdweb';

describe('Ownership Transfer Mock Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('App Ownership Tracking', () => {
    /**
     * Test: App has both minter and currentOwner fields
     * Minter = original creator, currentOwner = current NFT holder
     */
    it('tracks both minter and currentOwner', async () => {
      const minterAddress = '0x' + 'a'.repeat(40);
      const currentOwnerAddress = '0x' + 'b'.repeat(40); // Different after transfer
      
      const mockAppData = {
        did: 'did:web:example.com',
        minter: minterAddress,
        currentOwner: currentOwnerAddress,
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + '1'.repeat(64),
        dataUrl: 'https://example.com/metadata.json',
        versionHistory: [{ major: 1, minor: 0, patch: 0 }],
        traitHashes: [],
      };

      // Mock latestMajor call
      vi.mocked(readContract).mockResolvedValueOnce(1);
      // Mock getApp call
      vi.mocked(readContract).mockResolvedValueOnce(mockAppData);

      const result = await getAppByDid('did:web:example.com');

      expect(result).toBeDefined();
      expect(result?.minter).toBe(minterAddress);
      expect(result?.currentOwner).toBe(currentOwnerAddress);
      // Minter != currentOwner after transfer
      expect(result?.minter).not.toBe(result?.currentOwner);
    });

    /**
     * Test: Minter and owner are same initially
     * Before any transfer, minter = owner
     */
    it('has same minter and owner before transfer', async () => {
      const ownerAddress = '0x' + 'a'.repeat(40);
      
      const mockAppData = {
        did: 'did:web:example.com',
        minter: ownerAddress,
        currentOwner: ownerAddress, // Same as minter
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + '1'.repeat(64),
        dataUrl: 'https://example.com/metadata.json',
        versionHistory: [{ major: 1, minor: 0, patch: 0 }],
        traitHashes: [],
      };

      vi.mocked(readContract).mockResolvedValueOnce(1);
      vi.mocked(readContract).mockResolvedValueOnce(mockAppData);

      const result = await getAppByDid('did:web:example.com');

      expect(result?.minter).toBe(result?.currentOwner);
    });
  });

  describe('Query by Owner', () => {
    /**
     * Test: getAppsByOwner returns apps for current owner
     * After transfer, apps appear for new owner
     */
    it('returns apps for current owner after transfer', async () => {
      const newOwner = '0x' + 'b'.repeat(40);
      
      const mockApps = [
        {
          did: 'did:web:transferred-app.com',
          minter: '0x' + 'a'.repeat(40), // Original minter
          currentOwner: newOwner,
          interfaces: 1,
          versionMajor: 1,
          status: 0,
          dataHashAlgorithm: 0,
          dataHash: '0x' + '1'.repeat(64),
          dataUrl: 'https://example.com/metadata.json',
          versionHistory: [],
          traitHashes: [],
        },
      ];

      vi.mocked(readContract).mockResolvedValueOnce([mockApps]);

      const result = await getAppsByOwner(newOwner);

      expect(result).toHaveLength(1);
      expect(result[0].did).toBe('did:web:transferred-app.com');
    });

    /**
     * Test: Old owner no longer has apps after transfer
     */
    it('old owner has no apps after transfer', async () => {
      const oldOwner = '0x' + 'a'.repeat(40);
      
      // Contract returns empty array for old owner
      vi.mocked(readContract).mockResolvedValueOnce([[]]);

      const result = await getAppsByOwner(oldOwner);

      expect(result).toHaveLength(0);
    });

    /**
     * Test: getAppsByMinter is deprecated alias
     * Should still work for backward compatibility
     */
    it('getAppsByMinter is alias for getAppsByOwner', async () => {
      const owner = '0x' + 'a'.repeat(40);
      
      vi.mocked(readContract).mockResolvedValueOnce([[]]);
      vi.mocked(readContract).mockResolvedValueOnce([[]]);

      const byOwner = await getAppsByOwner(owner);
      const byMinter = await getAppsByMinter(owner);

      // Both should call the same underlying function
      expect(byOwner).toEqual(byMinter);
    });

    /**
     * Test: Pagination works for owner queries
     */
    it('supports pagination in getAppsByOwner', async () => {
      const owner = '0x' + 'a'.repeat(40);
      const startIndex = 10;
      
      vi.mocked(readContract).mockResolvedValueOnce([[]]);

      await getAppsByOwner(owner, startIndex);

      expect(readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          params: [owner, BigInt(startIndex)],
        })
      );
    });
  });

  describe('Ownership Validation', () => {
    /**
     * Test: App status reflects ownership state
     * Only owner can change status
     */
    it('tracks app status correctly', async () => {
      const statuses = [
        { value: 0, name: 'Active' },
        { value: 1, name: 'Deprecated' },
        { value: 2, name: 'Replaced' },
      ];

      for (const status of statuses) {
        vi.clearAllMocks();
        
        const mockAppData = {
          did: 'did:web:example.com',
          minter: '0x' + 'a'.repeat(40),
          currentOwner: '0x' + 'a'.repeat(40),
          interfaces: 1,
          versionMajor: 1,
          status: status.value,
          dataHashAlgorithm: 0,
          dataHash: '0x' + '1'.repeat(64),
          dataUrl: 'https://example.com/metadata.json',
          versionHistory: [],
          traitHashes: [],
        };

        vi.mocked(readContract).mockResolvedValueOnce(1);
        vi.mocked(readContract).mockResolvedValueOnce(mockAppData);

        const result = await getAppByDid('did:web:example.com');

        expect(result?.status).toBe(status.name);
      }
    });

    /**
     * Test: Version history is preserved across ownership changes
     */
    it('preserves version history across ownership', async () => {
      const versionHistory = [
        { major: 1, minor: 0, patch: 0 },
        { major: 1, minor: 1, patch: 0 },
        { major: 1, minor: 1, patch: 1 },
      ];
      
      const mockAppData = {
        did: 'did:web:example.com',
        minter: '0x' + 'a'.repeat(40),
        currentOwner: '0x' + 'b'.repeat(40), // New owner
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + '1'.repeat(64),
        dataUrl: 'https://example.com/metadata.json',
        versionHistory,
        traitHashes: [],
      };

      vi.mocked(readContract).mockResolvedValueOnce(1);
      vi.mocked(readContract).mockResolvedValueOnce(mockAppData);

      const result = await getAppByDid('did:web:example.com');

      expect(result?.versionHistory).toHaveLength(3);
      expect(result?.versionHistory).toEqual(versionHistory);
    });
  });

  describe('Multiple Major Versions', () => {
    /**
     * Test: Different major versions can have different owners
     * Each tokenId (DID + major) is a separate NFT
     */
    it('supports different owners per major version', async () => {
      const ownerV1 = '0x' + 'a'.repeat(40);
      const ownerV2 = '0x' + 'b'.repeat(40);
      
      const mockAppDataV1 = {
        did: 'did:web:example.com',
        minter: ownerV1,
        currentOwner: ownerV1,
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + '1'.repeat(64),
        dataUrl: 'https://example.com/v1/metadata.json',
        versionHistory: [{ major: 1, minor: 0, patch: 0 }],
        traitHashes: [],
      };

      const mockAppDataV2 = {
        did: 'did:web:example.com',
        minter: ownerV1, // Same minter
        currentOwner: ownerV2, // Different owner (transferred)
        interfaces: 1,
        versionMajor: 2,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + '2'.repeat(64),
        dataUrl: 'https://example.com/v2/metadata.json',
        versionHistory: [{ major: 2, minor: 0, patch: 0 }],
        traitHashes: [],
      };

      // Query V1
      vi.mocked(readContract).mockResolvedValueOnce(mockAppDataV1);
      const resultV1 = await getAppByDid('did:web:example.com', 1);

      // Query V2
      vi.mocked(readContract).mockResolvedValueOnce(mockAppDataV2);
      const resultV2 = await getAppByDid('did:web:example.com', 2);

      expect(resultV1?.currentOwner).toBe(ownerV1);
      expect(resultV2?.currentOwner).toBe(ownerV2);
      expect(resultV1?.currentOwner).not.toBe(resultV2?.currentOwner);
    });

    /**
     * Test: getLatestMajor returns highest major version
     */
    it('tracks latest major version', async () => {
      const mockLatestMajor = 3;
      
      vi.mocked(readContract).mockResolvedValueOnce(mockLatestMajor);

      const { getLatestMajor } = await import('@/lib/contracts/registry.read');
      const result = await getLatestMajor('did:web:example.com');

      expect(result).toBe(3);
    });
  });

  describe('Trait Ownership', () => {
    /**
     * Test: Trait hashes are preserved after transfer
     * Traits are properties of the app, not the owner
     */
    it('preserves trait hashes after ownership transfer', async () => {
      const traitHashes = [
        '0x' + 'a'.repeat(64),
        '0x' + 'b'.repeat(64),
      ];
      
      const mockAppData = {
        did: 'did:web:example.com',
        minter: '0x' + 'a'.repeat(40),
        currentOwner: '0x' + 'b'.repeat(40), // New owner
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + '1'.repeat(64),
        dataUrl: 'https://example.com/metadata.json',
        versionHistory: [],
        traitHashes,
      };

      vi.mocked(readContract).mockResolvedValueOnce(1);
      vi.mocked(readContract).mockResolvedValueOnce(mockAppData);

      const result = await getAppByDid('did:web:example.com');

      expect(result?.traitHashes).toHaveLength(2);
      expect(result?.traitHashes).toEqual(traitHashes);
    });
  });

  describe('Error Handling', () => {
    /**
     * Test: Returns null for non-existent app
     */
    it('returns null when app not found', async () => {
      vi.mocked(readContract).mockResolvedValueOnce(0); // No major version

      const result = await getAppByDid('did:web:nonexistent.com');

      expect(result).toBeNull();
    });

    /**
     * Test: Returns empty array for owner with no apps
     */
    it('returns empty array for owner with no apps', async () => {
      const owner = '0x' + 'c'.repeat(40);
      
      vi.mocked(readContract).mockResolvedValueOnce([[]]);

      const result = await getAppsByOwner(owner);

      expect(result).toEqual([]);
    });

    /**
     * Test: Handles contract read errors gracefully
     */
    it('handles contract errors in getAppByDid', async () => {
      vi.mocked(readContract).mockRejectedValueOnce(new Error('Contract error'));

      const result = await getAppByDid('did:web:example.com');

      expect(result).toBeNull();
    });

    /**
     * Test: Propagates errors in getAppsByOwner
     */
    it('propagates errors in getAppsByOwner', async () => {
      const owner = '0x' + 'a'.repeat(40);
      
      vi.mocked(readContract).mockRejectedValueOnce(new Error('Contract error'));

      await expect(getAppsByOwner(owner)).rejects.toThrow();
    });
  });

  describe('Interface Bitmap', () => {
    /**
     * Test: Interface bitmap is numeric
     */
    it('returns interfaces as numeric bitmap', async () => {
      const mockAppData = {
        did: 'did:web:example.com',
        minter: '0x' + 'a'.repeat(40),
        currentOwner: '0x' + 'a'.repeat(40),
        interfaces: 0b1111, // All interfaces enabled
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + '1'.repeat(64),
        dataUrl: 'https://example.com/metadata.json',
        versionHistory: [],
        traitHashes: [],
      };

      vi.mocked(readContract).mockResolvedValueOnce(1);
      vi.mocked(readContract).mockResolvedValueOnce(mockAppData);

      const result = await getAppByDid('did:web:example.com');

      expect(result?.interfaces).toBe(0b1111);
      expect(typeof result?.interfaces).toBe('number');
    });
  });

  describe('Data URL and Hash', () => {
    /**
     * Test: Data URL and hash are preserved
     */
    it('includes dataUrl and dataHash', async () => {
      const dataUrl = 'https://example.com/metadata.json';
      const dataHash = '0x' + '1'.repeat(64);
      
      const mockAppData = {
        did: 'did:web:example.com',
        minter: '0x' + 'a'.repeat(40),
        currentOwner: '0x' + 'a'.repeat(40),
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash,
        dataUrl,
        versionHistory: [],
        traitHashes: [],
      };

      vi.mocked(readContract).mockResolvedValueOnce(1);
      vi.mocked(readContract).mockResolvedValueOnce(mockAppData);

      const result = await getAppByDid('did:web:example.com');

      expect(result?.dataUrl).toBe(dataUrl);
      expect(result?.dataHash).toBe(dataHash);
    });

    /**
     * Test: Data hash algorithm is tracked
     */
    it('tracks data hash algorithm', async () => {
      const mockAppData = {
        did: 'did:web:example.com',
        minter: '0x' + 'a'.repeat(40),
        currentOwner: '0x' + 'a'.repeat(40),
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 1, // Keccak256
        dataHash: '0x' + '1'.repeat(64),
        dataUrl: 'https://example.com/metadata.json',
        versionHistory: [],
        traitHashes: [],
      };

      vi.mocked(readContract).mockResolvedValueOnce(1);
      vi.mocked(readContract).mockResolvedValueOnce(mockAppData);

      const result = await getAppByDid('did:web:example.com');

      expect(result?.dataHashAlgorithm).toBe(1);
    });
  });
});

