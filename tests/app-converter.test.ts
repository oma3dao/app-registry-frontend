import { describe, it, expect } from 'vitest';
import {
  appSummaryToNFT,
  appSummariesToNFTs,
  hasInterface,
  getInterfaceTypes,
  createInterfacesBitmap,
} from '@/lib/utils/app-converter';
import type { AppSummary } from '@/lib/contracts/types';
import type { NFT } from '@/types/nft';

describe('app-converter utilities', () => {
  const mockAppSummary: AppSummary = {
    did: 'did:web:example.com',
    currentVersion: { major: 1, minor: 2, patch: 3 },
    interfaces: 7, // 0b111 (all interfaces)
    dataUrl: 'https://example.com/metadata.json',
    status: 'Active',
    minter: '0x1234567890123456789012345678901234567890',
    contractId: '0xcontract123',
    fungibleTokenId: '0xtoken456',
  };

  describe('appSummaryToNFT', () => {
    it('converts AppSummary to NFT format', () => {
      const nft = appSummaryToNFT(mockAppSummary);
      
      expect(nft).toMatchObject({
        did: 'did:web:example.com',
        version: '1.2.3',
        interfaces: 7,
        dataUrl: 'https://example.com/metadata.json',
        status: 0, // Active = 0
        minter: '0x1234567890123456789012345678901234567890',
        contractId: '0xcontract123',
        fungibleTokenId: '0xtoken456',
      });
    });

    it.each([
      { version: { major: 2, minor: 1, patch: 5 }, expected: '2.1.5', label: 'non-zero patch' },
      { version: { major: 2, minor: 1, patch: 0 }, expected: '2.1', label: 'zero patch' },
    ])('formats version correctly with $label', ({ version, expected }) => {
      const app = { ...mockAppSummary, currentVersion: version };
      expect(appSummaryToNFT(app).version).toBe(expected);
    });

    it.each([
      { status: 'Active' as const, expected: 0 },
      { status: 'Deprecated' as const, expected: 1 },
      { status: 'Replaced' as const, expected: 2 },
    ])('handles $status status', ({ status, expected }) => {
      const app = { ...mockAppSummary, status };
      expect(appSummaryToNFT(app).status).toBe(expected);
    });

    it('handles missing optional fields', () => {
      const minimalApp: AppSummary = {
        did: 'did:web:minimal.com',
        currentVersion: { major: 1, minor: 0, patch: 0 },
        interfaces: 1,
        dataUrl: null,
        status: 'Active',
        minter: null,
        contractId: null,
        fungibleTokenId: null,
      };
      
      const nft = appSummaryToNFT(minimalApp);
      expect(nft.dataUrl).toBe('');
      expect(nft.minter).toBe('');
      expect(nft.contractId).toBeUndefined();
      expect(nft.fungibleTokenId).toBeUndefined();
    });

    it('uses fallback address when minter is null', () => {
      const app = { ...mockAppSummary, minter: null };
      const fallback = '0xfallback123';
      const nft = appSummaryToNFT(app, fallback);
      expect(nft.minter).toBe(fallback);
    });

    it('sets empty name by default (populated from metadata)', () => {
      const nft = appSummaryToNFT(mockAppSummary);
      expect(nft.name).toBe('');
    });

    it('sets empty iwpsPortalUrl (populated separately)', () => {
      const nft = appSummaryToNFT(mockAppSummary);
      expect(nft.iwpsPortalUrl).toBe('');
    });

    it('converts tokenId when present in AppSummary', () => {
      const appWithTokenId = { ...mockAppSummary, tokenId: 42 } as any;
      const nft = appSummaryToNFT(appWithTokenId);
      expect(nft.tokenId).toBe(42);
    });

    it('converts string tokenId to number', () => {
      const appWithStringTokenId = { ...mockAppSummary, tokenId: '123' } as any;
      const nft = appSummaryToNFT(appWithStringTokenId);
      expect(nft.tokenId).toBe(123);
    });
  });

  describe('appSummariesToNFTs', () => {
    it('converts array of AppSummaries to NFTs', () => {
      const apps: AppSummary[] = [
        mockAppSummary,
        { ...mockAppSummary, did: 'did:web:example2.com' },
        { ...mockAppSummary, did: 'did:web:example3.com' },
      ];
      
      const nfts = appSummariesToNFTs(apps);
      expect(nfts).toHaveLength(3);
      expect(nfts[0].did).toBe('did:web:example.com');
      expect(nfts[1].did).toBe('did:web:example2.com');
      expect(nfts[2].did).toBe('did:web:example3.com');
    });

    it('returns empty array for empty input', () => {
      const nfts = appSummariesToNFTs([]);
      expect(nfts).toEqual([]);
    });

    it('passes fallback address to all conversions', () => {
      const apps: AppSummary[] = [
        { ...mockAppSummary, minter: null },
        { ...mockAppSummary, minter: null },
      ];
      const fallback = '0xfallback456';
      
      const nfts = appSummariesToNFTs(apps, fallback);
      nfts.forEach(nft => {
        expect(nft.minter).toBe(fallback);
      });
    });
  });

  describe('hasInterface', () => {
    it.each([
      { bitmap: 0b001, type: 'human' as const, expected: true },
      { bitmap: 0b111, type: 'human' as const, expected: true },
      { bitmap: 0b000, type: 'human' as const, expected: false },
      { bitmap: 0b110, type: 'human' as const, expected: false },
      { bitmap: 0b010, type: 'api' as const, expected: true },
      { bitmap: 0b111, type: 'api' as const, expected: true },
      { bitmap: 0b000, type: 'api' as const, expected: false },
      { bitmap: 0b101, type: 'api' as const, expected: false },
      { bitmap: 0b100, type: 'contract' as const, expected: true },
      { bitmap: 0b111, type: 'contract' as const, expected: true },
      { bitmap: 0b000, type: 'contract' as const, expected: false },
      { bitmap: 0b011, type: 'contract' as const, expected: false },
      { bitmap: 1, type: 'human' as const, expected: true },
      { bitmap: 2, type: 'api' as const, expected: true },
      { bitmap: 4, type: 'contract' as const, expected: true },
      { bitmap: 0, type: 'human' as const, expected: false },
      { bitmap: 0, type: 'api' as const, expected: false },
      { bitmap: 0, type: 'contract' as const, expected: false },
    ])('hasInterface($bitmap, $type) = $expected', ({ bitmap, type, expected }) => {
      expect(hasInterface(bitmap, type)).toBe(expected);
    });
  });

  describe('getInterfaceTypes', () => {
    it.each([
      { bitmap: 7, expected: ['human', 'api', 'contract'] },
      { bitmap: 1, expected: ['human'] },
      { bitmap: 2, expected: ['api'] },
      { bitmap: 4, expected: ['contract'] },
      { bitmap: 3, expected: ['human', 'api'] },
      { bitmap: 5, expected: ['human', 'contract'] },
      { bitmap: 6, expected: ['api', 'contract'] },
    ])('getInterfaceTypes($bitmap) = $expected', ({ bitmap, expected }) => {
      expect(getInterfaceTypes(bitmap)).toEqual(expected);
    });

    it('returns empty array for bitmap 0', () => {
      const types = getInterfaceTypes(0);
      expect(types).toEqual([]);
    });
  });

  describe('createInterfacesBitmap', () => {
    it('creates bitmap for human interface', () => {
      expect(createInterfacesBitmap(['human'])).toBe(1); // 0b001
    });

    it('creates bitmap for api interface', () => {
      expect(createInterfacesBitmap(['api'])).toBe(2); // 0b010
    });

    it('creates bitmap for contract interface', () => {
      expect(createInterfacesBitmap(['contract'])).toBe(4); // 0b100
    });

    it.each([
      { types: ['human', 'api', 'contract'] as const, expected: 7 },
      { types: ['human', 'api'] as const, expected: 3 },
      { types: ['human', 'contract'] as const, expected: 5 },
      { types: ['api', 'contract'] as const, expected: 6 },
      { types: [] as const, expected: 0 },
      { types: ['human', 'human', 'api'] as const, expected: 3 },
      { types: ['contract', 'human', 'api'] as const, expected: 7 },
      { types: ['api', 'contract', 'human'] as const, expected: 7 },
    ])('createInterfacesBitmap($types) = $expected', ({ types, expected }) => {
      expect(createInterfacesBitmap([...types])).toBe(expected);
    });
  });

  describe('round-trip conversions', () => {
    it('getInterfaceTypes and createInterfacesBitmap are inverse operations', () => {
      const bitmaps = [0, 1, 2, 3, 4, 5, 6, 7];
      
      bitmaps.forEach(bitmap => {
        const types = getInterfaceTypes(bitmap);
        const reconstructed = createInterfacesBitmap(types);
        expect(reconstructed).toBe(bitmap);
      });
    });

    it('createInterfacesBitmap and getInterfaceTypes are inverse operations', () => {
      const typeCombinations: Array<Array<'human' | 'api' | 'contract'>> = [
        [],
        ['human'],
        ['api'],
        ['contract'],
        ['human', 'api'],
        ['human', 'contract'],
        ['api', 'contract'],
        ['human', 'api', 'contract'],
      ];
      
      typeCombinations.forEach(types => {
        const bitmap = createInterfacesBitmap(types);
        const reconstructed = getInterfaceTypes(bitmap);
        expect(reconstructed).toEqual(types);
      });
    });
  });
});



// Additional tests for async functions
import { vi, beforeEach, afterEach } from 'vitest';
import { hydrateNFTWithMetadata, appSummariesToNFTsWithMetadata } from '@/lib/utils/app-converter';

describe('app-converter async utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hydrateNFTWithMetadata', () => {
    const mockNFT = {
      did: 'did:web:example.com',
      version: '1.0.0',
      interfaces: 1,
      dataUrl: 'https://example.com/metadata.json',
      status: 0,
      minter: '0x123',
      currentOwner: '0x456',
      name: '',
      description: '',
      publisher: '',
      image: '',
      screenshotUrls: [],
      videoUrls: [],
      threeDAssetUrls: [],
      traits: [],
    };

    it('returns original NFT when dataUrl is empty', async () => {
      const nftWithoutDataUrl = { ...mockNFT, dataUrl: '' };
      const result = await hydrateNFTWithMetadata(nftWithoutDataUrl as any);
      expect(result).toEqual(nftWithoutDataUrl);
    });

    it('returns original NFT when fetch fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await hydrateNFTWithMetadata(mockNFT as any);
      expect(result).toEqual(mockNFT);
    });

    it('returns original NFT when fetch throws error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await hydrateNFTWithMetadata(mockNFT as any);
      expect(result).toEqual(mockNFT);
    });

    it('merges metadata into NFT on successful fetch', async () => {
      const mockMetadata = {
        name: 'Test App',
        description: 'A test application',
        publisher: 'Test Publisher',
        image: 'https://example.com/image.png',
        external_url: 'https://example.com',
        summary: 'Test summary',
        owner: 'eip155:1:0x456',
        screenshotUrls: ['https://example.com/shot1.png'],
        videoUrls: ['https://example.com/video.mp4'],
        threeDAssetUrls: [],
        traits: ['trait1', 'trait2'],
        platforms: { web: { launchUrl: 'https://app.example.com' } },
        endpoints: [{ name: 'REST', endpoint: 'https://api.example.com' }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const result = await hydrateNFTWithMetadata(mockNFT as any);

      expect(result.name).toBe('Test App');
      expect(result.description).toBe('A test application');
      expect(result.publisher).toBe('Test Publisher');
      expect(result.image).toBe('https://example.com/image.png');
      expect(result.traits).toEqual(['trait1', 'trait2']);
      expect(result.endpointName).toBe('REST');
      expect(result.endpointUrl).toBe('https://api.example.com');
    });

    it('extracts tokenId from registrations array', async () => {
      const mockMetadata = {
        name: 'Test App',
        description: 'Test',
        publisher: 'Test',
        image: 'https://example.com/image.png',
        registrations: [{ did: 'did:web:example.com', agentRegistry: '0x123', agentId: 42 }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const nftWithoutTokenId = { ...mockNFT, tokenId: undefined };
      const result = await hydrateNFTWithMetadata(nftWithoutTokenId as any);

      expect(result.tokenId).toBe(42);
    });

    it('prefers NFT tokenId over registrations', async () => {
      const mockMetadata = {
        name: 'Test App',
        description: 'Test',
        publisher: 'Test',
        image: 'https://example.com/image.png',
        registrations: [{ did: 'did:web:example.com', agentRegistry: '0x123', agentId: 99 }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const nftWithTokenId = { ...mockNFT, tokenId: 42 };
      const result = await hydrateNFTWithMetadata(nftWithTokenId as any);

      expect(result.tokenId).toBe(42); // Should keep original, not 99
    });

    it('handles 3dAssetUrls field name variation', async () => {
      const mockMetadata = {
        name: 'Test App',
        description: 'Test',
        publisher: 'Test',
        image: 'https://example.com/image.png',
        '3dAssetUrls': ['https://example.com/model.glb'],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const result = await hydrateNFTWithMetadata(mockNFT as any);

      expect(result.threeDAssetUrls).toEqual(['https://example.com/model.glb']);
    });

    it('extracts MCP config from endpoint with name MCP', async () => {
      const mockMetadata = {
        name: 'Test App',
        description: 'Test',
        publisher: 'Test',
        image: 'https://example.com/image.png',
        endpoints: [{
          name: 'MCP',
          endpoint: 'https://mcp.example.com',
          tools: [{ name: 'tool1' }],
          resources: [{ name: 'resource1' }],
        }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const result = await hydrateNFTWithMetadata(mockNFT as any);

      expect(result.mcp).toBeDefined();
      expect(result.mcp.tools).toEqual([{ name: 'tool1' }]);
    });

    it('returns undefined mcp when endpoint has no MCP fields', async () => {
      const mockMetadata = {
        name: 'Test App',
        description: 'Test',
        publisher: 'Test',
        image: 'https://example.com/image.png',
        endpoints: [{
          name: 'MCP',  // Name is MCP but no MCP-specific fields
          endpoint: 'https://api.example.com',
          schemaUrl: 'https://api.example.com/schema',
          // No MCP-specific fields like tools, resources, prompts
        }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const result = await hydrateNFTWithMetadata(mockNFT as any);

      // MCP should be undefined because there are no MCP-specific fields
      expect(result.mcp).toBeUndefined();
    });

    it('returns undefined mcp when endpoints array is empty', async () => {
      const mockMetadata = {
        name: 'Test App',
        description: 'Test',
        publisher: 'Test',
        image: 'https://example.com/image.png',
        endpoints: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const result = await hydrateNFTWithMetadata(mockNFT as any);

      expect(result.mcp).toBeUndefined();
    });
  });

  describe('appSummariesToNFTsWithMetadata', () => {
    const mockAppSummary = {
      did: 'did:web:example.com',
      currentVersion: { major: 1, minor: 0, patch: 0 },
      interfaces: 1,
      dataUrl: 'https://example.com/metadata.json',
      status: 'Active' as const,
      minter: '0x123',
      contractId: null,
      fungibleTokenId: null,
    };

    it('converts and hydrates multiple apps', async () => {
      const mockMetadata = {
        name: 'Test App',
        description: 'Test description',
        publisher: 'Test Publisher',
        image: 'https://example.com/image.png',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const apps = [
        mockAppSummary,
        { ...mockAppSummary, did: 'did:web:example2.com' },
      ];

      const result = await appSummariesToNFTsWithMetadata(apps);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test App');
      expect(result[1].name).toBe('Test App');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('returns empty array for empty input', async () => {
      const result = await appSummariesToNFTsWithMetadata([]);
      expect(result).toEqual([]);
    });

    it('passes fallback address to conversions', async () => {
      const mockMetadata = {
        name: 'Test App',
        description: 'Test',
        publisher: 'Test',
        image: 'https://example.com/image.png',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const apps = [{ ...mockAppSummary, minter: null }];
      const fallback = '0xfallback';

      const result = await appSummariesToNFTsWithMetadata(apps, fallback);

      expect(result[0].minter).toBe(fallback);
    });
  });
});
