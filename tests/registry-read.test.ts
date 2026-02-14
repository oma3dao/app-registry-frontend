import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getAppByDid, 
  isDidRegistered, 
  getLatestMajor,
  getAppsByOwner,
  getAppsByMinter,
  listActiveApps,
  getTotalActiveApps,
  searchByDid,
  getTokenIdFromEvents,
} from '@/lib/contracts/registry.read';
import type { AppSummary } from '@/lib/contracts/types';

// Mock thirdweb
vi.mock('thirdweb', () => ({
  readContract: vi.fn(),
}));

// Mock ethers (use importOriginal so keccak256/toUtf8Bytes exist for did.ts computeDidHash)
const mockGetLogs = vi.fn();
const mockParseLog = vi.fn();
const mockGetEvent = vi.fn();

vi.mock('ethers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ethers')>();
  return {
    ...actual,
    ethers: {
      ...(typeof actual.ethers === 'object' ? actual.ethers : {}),
      JsonRpcProvider: vi.fn().mockImplementation(() => ({
        getLogs: mockGetLogs,
      })),
      Interface: vi.fn().mockImplementation(() => ({
        getEvent: mockGetEvent,
        parseLog: mockParseLog,
      })),
      id: vi.fn((str: string) => `0x${Buffer.from(str).toString('hex').padEnd(64, '0')}`),
    },
  };
});

// Mock contract client
vi.mock('@/lib/contracts/client', () => ({
  getAppRegistryContract: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    chain: { id: 31337 },
  })),
  getActiveChain: vi.fn(() => ({
    rpc: 'http://localhost:8545',
    id: 31337,
  })),
}));

// Mock DID utils (importOriginal pattern, remove getDidHash; use computeDidHash from actual)
vi.mock('@/lib/utils/did', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/did')>();
  return {
    ...actual,
    normalizeDidWeb: vi.fn((did: string) => did),
    normalizeDid: vi.fn((did: string) => did),
  };
});

// Mock env
vi.mock('@/config/env', () => ({
  env: {
    registryAddress: '0x1234567890123456789012345678901234567890',
  },
}));

import { readContract } from 'thirdweb';

describe('Registry Read Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAppByDid', () => {
    // Tests successful app retrieval by DID
    it('retrieves app by DID successfully', async () => {
      const mockAppData = {
        did: 'did:web:example.com',
        minter: '0xMinterAddress',
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0xhash',
        fungibleTokenId: 0n,
        contractId: 0n,
        dataUrl: 'https://example.com/metadata.json',
        versionHistory: [
          { minor: 0, patch: 0, dataUrl: 'https://example.com/metadata.json' }
        ],
        traitHashes: [],
      };

      // Mock latestMajor call
      (readContract as any).mockResolvedValueOnce(1);
      // Mock getApp call
      (readContract as any).mockResolvedValueOnce(mockAppData);

      const result = await getAppByDid('did:web:example.com');

      expect(result).toBeDefined();
      expect(result?.did).toBe('did:web:example.com');
      expect(result?.minter).toBe('0xMinterAddress');
      expect(result?.status).toBe('Active');
    });

    // Tests retrieval with specific major version
    it('retrieves app with specific major version', async () => {
      const mockAppData = {
        did: 'did:web:example.com',
        minter: '0xMinterAddress',
        interfaces: 1,
        versionMajor: 2,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0xhash',
        fungibleTokenId: 0n,
        contractId: 0n,
        dataUrl: 'https://example.com/v2/metadata.json',
        versionHistory: [],
        traitHashes: [],
      };

      (readContract as any).mockResolvedValueOnce(mockAppData);

      const result = await getAppByDid('did:web:example.com', 2);

      expect(result).toBeDefined();
      expect(result?.versionMajor).toBe(2);
      expect(readContract).toHaveBeenCalledTimes(1); // Should not call latestMajor
    });

    // Tests handling of non-existent app
    it('returns null for non-existent app', async () => {
      (readContract as any).mockResolvedValueOnce(1);
      (readContract as any).mockResolvedValueOnce(null);

      const result = await getAppByDid('did:web:nonexistent.com');

      expect(result).toBeNull();
    });

    // Tests error handling
    it('handles contract errors gracefully', async () => {
      (readContract as any).mockRejectedValueOnce(new Error('Contract error'));

      const result = await getAppByDid('did:web:example.com');

      expect(result).toBeNull();
    });

    // Tests status parsing
    it.each([
      { statusNum: 0, expected: 'Active' },
      { statusNum: 1, expected: 'Deprecated' },
      { statusNum: 2, expected: 'Replaced' },
    ])('correctly parses status $statusNum as $expected', async ({ statusNum, expected }) => {
      (readContract as any).mockResolvedValueOnce(1);
      (readContract as any).mockResolvedValueOnce({
        did: 'did:web:example.com',
        minter: '0xMinterAddress',
        interfaces: 1,
        versionMajor: 1,
        status: statusNum,
        dataHashAlgorithm: 0,
        dataHash: '0xhash',
        fungibleTokenId: 0n,
        contractId: 0n,
        dataUrl: 'https://example.com/metadata.json',
        versionHistory: [],
        traitHashes: [],
      });

      const result = await getAppByDid('did:web:example.com');
      expect(result?.status).toBe(expected);
    });

    // Tests version history parsing
    it('correctly parses version history', async () => {
      const mockAppData = {
        did: 'did:web:example.com',
        minter: '0xMinterAddress',
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0xhash',
        fungibleTokenId: 0n,
        contractId: 0n,
        dataUrl: 'https://example.com/metadata.json',
        versionHistory: [
          { minor: 0, patch: 0, dataUrl: 'https://example.com/v1.0.0.json' },
          { minor: 1, patch: 0, dataUrl: 'https://example.com/v1.1.0.json' },
          { minor: 1, patch: 1, dataUrl: 'https://example.com/v1.1.1.json' },
        ],
        traitHashes: [],
      };

      (readContract as any).mockResolvedValueOnce(1);
      (readContract as any).mockResolvedValueOnce(mockAppData);

      const result = await getAppByDid('did:web:example.com');

      expect(result?.versionHistory).toHaveLength(3);
      expect(result?.versionHistory[0].minor).toBe(0);
      expect(result?.versionHistory[2].patch).toBe(1);
    });
  });

  describe('isDidRegistered', () => {
    it.each([
      { mock: () => (readContract as any).mockResolvedValueOnce(1), expected: true, label: 'registered DID (major = 1)' },
      { mock: () => (readContract as any).mockResolvedValueOnce(0), expected: false, label: 'unregistered DID (major = 0)' },
      { mock: () => (readContract as any).mockRejectedValueOnce(new Error('DIDHashNotFound')), expected: false, label: 'contract throws error' },
    ])('returns $expected for $label', async ({ mock, expected }) => {
      mock();
      const result = await isDidRegistered('did:web:example.com');
      expect(result).toBe(expected);
    });
  });

  describe('getLatestMajor', () => {
    // Tests retrieval of latest major version
    it('returns latest major version for registered DID', async () => {
      (readContract as any).mockResolvedValueOnce(3);

      const result = await getLatestMajor('did:web:example.com');

      expect(result).toBe(3);
    });

    // Tests handling of unregistered DID
    it('returns 0 for unregistered DID', async () => {
      (readContract as any).mockRejectedValueOnce(new Error('DIDHashNotFound'));

      const result = await getLatestMajor('did:web:unregistered.com');

      expect(result).toBe(0);
    });

    // Tests handling of newly registered DID
    it('returns 1 for newly registered DID', async () => {
      (readContract as any).mockResolvedValueOnce(1);

      const result = await getLatestMajor('did:web:new-app.com');

      expect(result).toBe(1);
    });
  });

  describe('getAppsByOwner', () => {
    // Tests successful retrieval of apps by owner
    it('retrieves apps owned by an address', async () => {
      const mockAppsData = [
        {
          did: 'did:web:app1.com',
          minter: '0xOwnerAddress',
          interfaces: 1,
          versionMajor: 1,
          status: 0,
          dataHashAlgorithm: 0,
          dataHash: '0xhash1',
          fungibleTokenId: 0n,
          contractId: 0n,
          dataUrl: 'https://app1.com/metadata.json',
          versionHistory: [],
          traitHashes: [],
        },
        {
          did: 'did:web:app2.com',
          minter: '0xOwnerAddress',
          interfaces: 3,
          versionMajor: 2,
          status: 0,
          dataHashAlgorithm: 0,
          dataHash: '0xhash2',
          fungibleTokenId: 0n,
          contractId: 0n,
          dataUrl: 'https://app2.com/metadata.json',
          versionHistory: [],
          traitHashes: [],
        },
      ];

      (readContract as any).mockResolvedValueOnce([mockAppsData]);

      const result = await getAppsByOwner('0x1234567890123456789012345678901234567890');

      expect(result).toHaveLength(2);
      expect(result[0].did).toBe('did:web:app1.com');
      expect(result[1].did).toBe('did:web:app2.com');
    });

    // Tests owner with no apps
    it('returns empty array when owner has no apps', async () => {
      (readContract as any).mockResolvedValueOnce([[]]);

      const result = await getAppsByOwner('0x0000000000000000000000000000000000000000');

      expect(result).toEqual([]);
    });

    // Tests pagination with startIndex
    it('supports pagination with startIndex', async () => {
      const mockAppsData = [{
        did: 'did:web:app3.com',
        minter: '0xOwnerAddress',
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0xhash',
        fungibleTokenId: 0n,
        contractId: 0n,
        dataUrl: 'https://app3.com/metadata.json',
        versionHistory: [],
        traitHashes: [],
      }];

      (readContract as any).mockResolvedValueOnce([mockAppsData]);

      const result = await getAppsByOwner('0x1234567890123456789012345678901234567890', 5);

      expect(readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.arrayContaining([BigInt(5)]),
        })
      );
    });

    // Tests error handling
    it('handles contract errors in getAppsByOwner', async () => {
      (readContract as any).mockRejectedValueOnce(new Error('Contract error'));

      await expect(getAppsByOwner('0x1234567890123456789012345678901234567890'))
        .rejects.toThrow();
    });

    // Tests invalid response format
    it('handles invalid response format gracefully', async () => {
      (readContract as any).mockResolvedValueOnce(null);

      const result = await getAppsByOwner('0x1234567890123456789012345678901234567890');

      expect(result).toEqual([]);
    });
  });

  describe('getAppsByMinter', () => {
    // Tests deprecated alias function
    it('calls getAppsByOwner with same parameters', async () => {
      const mockAppsData = [{
        did: 'did:web:app1.com',
        minter: '0xMinterAddress',
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0xhash',
        fungibleTokenId: 0n,
        contractId: 0n,
        dataUrl: 'https://app1.com/metadata.json',
        versionHistory: [],
        traitHashes: [],
      }];

      (readContract as any).mockResolvedValueOnce([mockAppsData]);

      const result = await getAppsByMinter('0x1234567890123456789012345678901234567890', 0);

      expect(result).toHaveLength(1);
      expect(result[0].did).toBe('did:web:app1.com');
    });
  });

  describe('listActiveApps', () => {
    // Tests successful listing of active apps
    it('lists active apps with pagination', async () => {
      const mockAppsData = [
        {
          did: 'did:web:app1.com',
          minter: '0xMinter1',
          interfaces: 1,
          versionMajor: 1,
          status: 0,
          dataHashAlgorithm: 0,
          dataHash: '0xhash1',
          fungibleTokenId: 0n,
          contractId: 0n,
          dataUrl: 'https://app1.com/metadata.json',
          versionHistory: [],
          traitHashes: [],
        },
      ];

      (readContract as any).mockResolvedValueOnce([mockAppsData, 20]); // hasMore = true

      const result = await listActiveApps(0, 20);

      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('20');
    });

    // Tests no more pages
    it('indicates no more pages when nextIndex is 0', async () => {
      const mockAppsData = [{
        did: 'did:web:lastapp.com',
        minter: '0xMinter',
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0xhash',
        fungibleTokenId: 0n,
        contractId: 0n,
        dataUrl: 'https://lastapp.com/metadata.json',
        versionHistory: [],
        traitHashes: [],
      }];

      (readContract as any).mockResolvedValueOnce([mockAppsData, 0]); // No more pages

      const result = await listActiveApps(0, 20);

      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    // Tests empty results
    it('returns empty array when no apps exist', async () => {
      (readContract as any).mockResolvedValueOnce([[], 0]);

      const result = await listActiveApps();

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    // Tests custom page size
    it('respects custom page size parameter', async () => {
      const mockAppsData = Array.from({ length: 50 }, (_, i) => ({
        did: `did:web:app${i}.com`,
        minter: '0xMinter',
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0xhash',
        fungibleTokenId: 0n,
        contractId: 0n,
        dataUrl: `https://app${i}.com/metadata.json`,
        versionHistory: [],
        traitHashes: [],
      }));

      (readContract as any).mockResolvedValueOnce([mockAppsData, 50]);

      const result = await listActiveApps(0, 10);

      expect(result.items).toHaveLength(10); // Should limit to pageSize
    });

    // Tests error handling
    it('throws normalized error on contract failure', async () => {
      (readContract as any).mockRejectedValueOnce(new Error('Contract error'));

      await expect(listActiveApps()).rejects.toThrow();
    });

    // Tests invalid response format
    it('handles invalid response format', async () => {
      (readContract as any).mockResolvedValueOnce(null);

      const result = await listActiveApps();

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getTotalActiveApps', () => {
    // Tests retrieval of total active apps count
    it('returns total count of active apps', async () => {
      (readContract as any).mockResolvedValueOnce(BigInt(42));

      const result = await getTotalActiveApps();

      expect(result).toBe(42);
    });

    // Tests zero apps
    it('returns 0 when no apps exist', async () => {
      (readContract as any).mockResolvedValueOnce(BigInt(0));

      const result = await getTotalActiveApps();

      expect(result).toBe(0);
    });

    // Tests large counts
    it('handles large app counts', async () => {
      (readContract as any).mockResolvedValueOnce(BigInt(1000000));

      const result = await getTotalActiveApps();

      expect(result).toBe(1000000);
    });

    // Tests error handling
    it('throws normalized error on contract failure', async () => {
      (readContract as any).mockRejectedValueOnce(new Error('RPC error'));

      await expect(getTotalActiveApps()).rejects.toThrow();
    });
  });

  describe('searchByDid', () => {
    // Tests successful search
    it('finds app by DID search query', async () => {
      const mockAppData = {
        did: 'did:web:example.com',
        minter: '0xMinter',
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0xhash',
        fungibleTokenId: 0n,
        contractId: 0n,
        dataUrl: 'https://example.com/metadata.json',
        versionHistory: [],
        traitHashes: [],
      };

      (readContract as any).mockResolvedValueOnce(1);
      (readContract as any).mockResolvedValueOnce(mockAppData);

      const result = await searchByDid('did:web:example.com');

      expect(result).toHaveLength(1);
      expect(result[0].did).toBe('did:web:example.com');
    });

    // Tests no results
    it('returns empty array when DID not found', async () => {
      (readContract as any).mockResolvedValueOnce(1);
      (readContract as any).mockResolvedValueOnce(null);

      const result = await searchByDid('did:web:notfound.com');

      expect(result).toEqual([]);
    });

    // Tests DID normalization
    it('normalizes DID before searching', async () => {
      const { normalizeDid } = await import('@/lib/utils/did');
      
      (readContract as any).mockResolvedValueOnce(1);
      (readContract as any).mockResolvedValueOnce(null);

      await searchByDid('DID:WEB:EXAMPLE.COM');

      expect(normalizeDid).toHaveBeenCalled();
    });
  });

  // Tests for hasAnyTraits function
  describe('hasAnyTraits', () => {
    // This test verifies that hasAnyTraits returns true when app has at least one trait
    it('returns true when app has any of the specified traits', async () => {
      const { hasAnyTraits } = await import('@/lib/contracts/registry.read');
      
      (readContract as any).mockResolvedValueOnce(true);

      const result = await hasAnyTraits('did:web:example.com', 1, ['0xtrait1', '0xtrait2']);

      expect(result).toBe(true);
      expect(readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'function hasAnyTraits(string, uint8, bytes32[]) view returns (bool)',
          params: [expect.stringContaining('did:web:example.com'), 1, ['0xtrait1', '0xtrait2']],
        })
      );
    });

    // This test verifies that hasAnyTraits returns false when app has none of the traits
    it('returns false when app has none of the specified traits', async () => {
      const { hasAnyTraits } = await import('@/lib/contracts/registry.read');
      
      (readContract as any).mockResolvedValueOnce(false);

      const result = await hasAnyTraits('did:web:example.com', 1, ['0xtrait1', '0xtrait2']);

      expect(result).toBe(false);
    });

    // This test verifies that hasAnyTraits handles contract errors gracefully
    it('returns false when contract call fails', async () => {
      const { hasAnyTraits } = await import('@/lib/contracts/registry.read');
      
      (readContract as any).mockRejectedValueOnce(new Error('Contract error'));

      const result = await hasAnyTraits('did:web:example.com', 1, ['0xtrait1']);

      expect(result).toBe(false);
    });

    // This test verifies that hasAnyTraits normalizes DID before checking
    it('normalizes DID before checking traits', async () => {
      const { hasAnyTraits } = await import('@/lib/contracts/registry.read');
      const { normalizeDid } = await import('@/lib/utils/did');
      
      (readContract as any).mockResolvedValueOnce(false);

      await hasAnyTraits('DID:WEB:EXAMPLE.COM', 1, ['0xtrait1']);

      expect(normalizeDid).toHaveBeenCalled();
    });
  });

  // Tests for hasAllTraits function
  describe('hasAllTraits', () => {
    // This test verifies that hasAllTraits returns true when app has all traits
    it('returns true when app has all of the specified traits', async () => {
      const { hasAllTraits } = await import('@/lib/contracts/registry.read');
      
      (readContract as any).mockResolvedValueOnce(true);

      const result = await hasAllTraits('did:web:example.com', 1, ['0xtrait1', '0xtrait2']);

      expect(result).toBe(true);
      expect(readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'function hasAllTraits(string, uint8, bytes32[]) view returns (bool)',
          params: [expect.stringContaining('did:web:example.com'), 1, ['0xtrait1', '0xtrait2']],
        })
      );
    });

    // This test verifies that hasAllTraits returns false when app is missing some traits
    it('returns false when app does not have all of the specified traits', async () => {
      const { hasAllTraits } = await import('@/lib/contracts/registry.read');
      
      (readContract as any).mockResolvedValueOnce(false);

      const result = await hasAllTraits('did:web:example.com', 1, ['0xtrait1', '0xtrait2']);

      expect(result).toBe(false);
    });

    // This test verifies that hasAllTraits handles contract errors gracefully
    it('returns false when contract call fails', async () => {
      const { hasAllTraits } = await import('@/lib/contracts/registry.read');
      
      (readContract as any).mockRejectedValueOnce(new Error('Contract error'));

      const result = await hasAllTraits('did:web:example.com', 1, ['0xtrait1']);

      expect(result).toBe(false);
    });

    // This test verifies that hasAllTraits normalizes DID before checking
    it('normalizes DID before checking traits', async () => {
      const { hasAllTraits } = await import('@/lib/contracts/registry.read');
      const { normalizeDid } = await import('@/lib/utils/did');
      
      (readContract as any).mockResolvedValueOnce(false);

      await hasAllTraits('DID:WEB:EXAMPLE.COM', 1, ['0xtrait1']);

      expect(normalizeDid).toHaveBeenCalled();
    });
  });
});



describe('getTokenIdFromEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLogs.mockReset();
    mockParseLog.mockReset();
    mockGetEvent.mockReset();
  });

  it('returns tokenId when matching event is found', async () => {
    const mockLogs = [{
      topics: ['0xtopic1', '0x0000000000000000000000000000000000000000000000000000000000000042', '0xtopic3', '0xdidhash'],
      data: '0xdata',
    }];
    
    mockGetEvent.mockReturnValue({ topicHash: '0xtopic1' });
    mockGetLogs.mockResolvedValue(mockLogs);
    mockParseLog.mockReturnValue({
      args: {
        tokenId: 66n,
        versionMajor: 1,
      },
    });
    
    const result = await getTokenIdFromEvents('did:web:example.com', 1);
    
    expect(result).toBe(66);
  });

  it('returns undefined when no matching major version found', async () => {
    const mockLogs = [{
      topics: ['0xtopic1', '0x42', '0xtopic3', '0xdidhash'],
      data: '0xdata',
    }];
    
    mockGetEvent.mockReturnValue({ topicHash: '0xtopic1' });
    mockGetLogs.mockResolvedValue(mockLogs);
    mockParseLog.mockReturnValue({
      args: {
        tokenId: 66n,
        versionMajor: 2, // Different major version
      },
    });
    
    const result = await getTokenIdFromEvents('did:web:example.com', 1);
    
    expect(result).toBeUndefined();
  });

  it('returns undefined when no events found', async () => {
    mockGetEvent.mockReturnValue({ topicHash: '0xtopic1' });
    mockGetLogs.mockResolvedValue([]);
    
    const result = await getTokenIdFromEvents('did:web:example.com', 1);
    
    expect(result).toBeUndefined();
  });

  it('returns undefined when event fragment not found', async () => {
    mockGetEvent.mockReturnValue(null); // No event fragment
    
    const result = await getTokenIdFromEvents('did:web:example.com', 1);
    
    expect(result).toBeUndefined();
  });

  it('handles errors gracefully and returns undefined', async () => {
    mockGetEvent.mockImplementation(() => {
      throw new Error('Interface error');
    });
    
    const result = await getTokenIdFromEvents('did:web:example.com', 1);
    
    expect(result).toBeUndefined();
  });

  it('skips unparseable logs and continues searching', async () => {
    const mockLogs = [
      { topics: ['0xtopic1'], data: '0xinvalid' },
      { topics: ['0xtopic1', '0x42'], data: '0xvalid' },
    ];
    
    mockGetEvent.mockReturnValue({ topicHash: '0xtopic1' });
    mockGetLogs.mockResolvedValue(mockLogs);
    
    let parseCallCount = 0;
    mockParseLog.mockImplementation(() => {
      parseCallCount++;
      if (parseCallCount === 1) {
        throw new Error('Parse error');
      }
      return {
        args: {
          tokenId: 99n,
          versionMajor: 1,
        },
      };
    });
    
    const result = await getTokenIdFromEvents('did:web:example.com', 1);
    
    expect(result).toBe(99);
  });
});
