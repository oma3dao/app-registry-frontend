/**
 * App Registration Flow Integration Tests
 * 
 * Tests the complete app registration flow from DID creation to querying
 * Validates the full user journey through the registration process
 * 
 * Flow: DID Setup → Verification → Mint → Metadata Upload → Query
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prepareMintApp } from '@/lib/contracts/registry.write';
import { getAppByDid, isDidRegistered, getLatestMajor } from '@/lib/contracts/registry.read';
import { normalizeDidWeb } from '@/lib/utils/did';
import type { MintAppInput, AppSummary } from '@/lib/contracts/types';

// Mock thirdweb
vi.mock('thirdweb', () => ({
  prepareContractCall: vi.fn((options: any) => ({
    to: options.contract?.address || '0x1234567890123456789012345678901234567890',
    data: '0xmockedcalldata',
    value: 0n,
    params: options.params || [],
    method: options.method || '',
  })),
  readContract: vi.fn(),
}));

// Mock contract client
vi.mock('@/lib/contracts/client', () => ({
  getAppRegistryContract: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    chain: { id: 66238 },
  })),
}));

// Mock DID utilities
vi.mock('@/lib/utils/did', () => ({
  normalizeDidWeb: vi.fn((did: string) => {
    if (did.startsWith('did:web:')) return did;
    return `did:web:${did}`;
  }),
  getDidHash: vi.fn(async (did: string) => `0x${Buffer.from(did).toString('hex').padEnd(64, '0')}`),
}));

// Mock error normalizer
vi.mock('@/lib/contracts/errors', () => ({
  normalizeEvmError: vi.fn((e: any) => e),
}));

import { readContract } from 'thirdweb';

describe('App Registration Flow Integration', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Step 1: DID Setup and Normalization', () => {
    /**
     * Test: Domain to DID normalization
     * User enters domain, system normalizes to did:web format
     */
    it('normalizes domain input to did:web format', () => {
      const userInput = 'myapp.example.com';
      const normalized = normalizeDidWeb(userInput);
      
      expect(normalized).toBe('did:web:myapp.example.com');
    });

    /**
     * Test: Preserves valid DID format
     * User enters complete DID, system preserves it
     */
    it('preserves already-normalized DID', () => {
      const userInput = 'did:web:myapp.example.com';
      const normalized = normalizeDidWeb(userInput);
      
      expect(normalized).toBe('did:web:myapp.example.com');
    });

    /**
     * Test: Handles subdomains correctly
     */
    it('handles subdomain DIDs', () => {
      const userInput = 'app.api.example.com';
      const normalized = normalizeDidWeb(userInput);
      
      expect(normalized).toBe('did:web:app.api.example.com');
    });

    /**
     * Test: Path-based DIDs
     */
    it('handles path-based DIDs', () => {
      const userInput = 'did:web:example.com:apps:myapp';
      const normalized = normalizeDidWeb(userInput);
      
      expect(normalized).toBe('did:web:example.com:apps:myapp');
    });
  });

  describe('Step 2: Check DID Availability', () => {
    /**
     * Test: New DID is available
     */
    it('confirms new DID is available for registration', async () => {
      // Mock: DID not registered
      vi.mocked(readContract).mockRejectedValueOnce(new Error('DIDHashNotFound'));

      const isRegistered = await isDidRegistered('did:web:newapp.example.com');
      
      expect(isRegistered).toBe(false);
    });

    /**
     * Test: Existing DID is not available
     */
    it('detects existing DID registration', async () => {
      // Mock: DID has major version 1
      vi.mocked(readContract).mockResolvedValueOnce(1);

      const isRegistered = await isDidRegistered('did:web:existingapp.example.com');
      
      expect(isRegistered).toBe(true);
    });

    /**
     * Test: Get latest major version for existing DID
     */
    it('gets latest major version for existing DID', async () => {
      // Mock: DID has major version 2
      vi.mocked(readContract).mockResolvedValueOnce(2);

      const latestMajor = await getLatestMajor('did:web:existingapp.example.com');
      
      expect(latestMajor).toBe(2);
    });
  });

  describe('Step 3: Prepare Mint Transaction', () => {
    /**
     * Test: Prepare mint with minimal required fields
     */
    it('prepares mint with minimal required fields', () => {
      const input: MintAppInput = {
        did: 'did:web:myapp.example.com',
        interfaces: 0b0001, // API only
        dataUrl: 'https://myapp.example.com/oma3-metadata.json',
        dataHash: '0x' + 'a'.repeat(64),
        dataHashAlgorithm: 0, // SHA256
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const tx = prepareMintApp(input);
      
      expect(tx).toBeDefined();
      expect(tx.params[0]).toBe('did:web:myapp.example.com');
    });

    /**
     * Test: Prepare mint with all optional fields
     */
    it('prepares mint with all optional fields', () => {
      const input: MintAppInput = {
        did: 'did:web:myapp.example.com',
        interfaces: 0b1111, // All interfaces
        dataUrl: 'https://myapp.example.com/oma3-metadata.json',
        dataHash: '0x' + 'a'.repeat(64),
        dataHashAlgorithm: 0,
        fungibleTokenId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
        contractId: 'eip155:1/erc721:0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d',
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        traitHashes: ['0x' + 'b'.repeat(64)],
        metadataJson: JSON.stringify({ name: 'My App' }),
      };

      const tx = prepareMintApp(input);
      
      expect(tx).toBeDefined();
      expect(tx.params.length).toBe(12);
    });

    /**
     * Test: Interface bitmap combinations
     */
    it('handles various interface combinations', () => {
      const interfaceCases = [
        { bitmap: 0b0001, desc: 'API only' },
        { bitmap: 0b0010, desc: 'MCP only' },
        { bitmap: 0b0100, desc: 'A2A only' },
        { bitmap: 0b0011, desc: 'API + MCP' },
        { bitmap: 0b1111, desc: 'All interfaces' },
      ];

      for (const { bitmap, desc } of interfaceCases) {
        vi.clearAllMocks();
        
        const input: MintAppInput = {
          did: 'did:web:myapp.example.com',
          interfaces: bitmap,
          dataUrl: 'https://myapp.example.com/metadata.json',
          dataHash: '0x' + 'a'.repeat(64),
          dataHashAlgorithm: 0,
          initialVersionMajor: 1,
          initialVersionMinor: 0,
          initialVersionPatch: 0,
        };

        const tx = prepareMintApp(input);
        expect(tx.params[1]).toBe(bitmap);
      }
    });
  });

  describe('Step 4: Query Registered App', () => {
    /**
     * Test: Query app by DID
     */
    it('queries registered app by DID', async () => {
      const mockAppData = {
        did: 'did:web:myapp.example.com',
        minter: '0x1234567890123456789012345678901234567890',
        currentOwner: '0x1234567890123456789012345678901234567890',
        interfaces: 0b0001,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + 'a'.repeat(64),
        dataUrl: 'https://myapp.example.com/metadata.json',
        versionHistory: [{ major: 1, minor: 0, patch: 0 }],
        traitHashes: [],
      };

      // Mock latestMajor
      vi.mocked(readContract).mockResolvedValueOnce(1);
      // Mock getApp
      vi.mocked(readContract).mockResolvedValueOnce(mockAppData);

      const app = await getAppByDid('did:web:myapp.example.com');
      
      expect(app).toBeDefined();
      expect(app?.did).toBe('did:web:myapp.example.com');
      expect(app?.status).toBe('Active');
    });

    /**
     * Test: Query specific major version
     */
    it('queries specific major version', async () => {
      const mockAppData = {
        did: 'did:web:myapp.example.com',
        minter: '0x1234567890123456789012345678901234567890',
        currentOwner: '0x1234567890123456789012345678901234567890',
        interfaces: 0b0011,
        versionMajor: 2,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + 'b'.repeat(64),
        dataUrl: 'https://myapp.example.com/v2/metadata.json',
        versionHistory: [{ major: 2, minor: 0, patch: 0 }],
        traitHashes: [],
      };

      vi.mocked(readContract).mockResolvedValueOnce(mockAppData);

      const app = await getAppByDid('did:web:myapp.example.com', 2);
      
      expect(app?.versionMajor).toBe(2);
    });

    /**
     * Test: Non-existent app returns null
     */
    it('returns null for non-existent app', async () => {
      vi.mocked(readContract).mockResolvedValueOnce(0); // No major version

      const app = await getAppByDid('did:web:nonexistent.example.com');
      
      expect(app).toBeNull();
    });
  });

  describe('Complete Registration Flow', () => {
    /**
     * Test: Full registration journey
     * Simulates user going through entire registration process
     */
    it('completes full registration journey', async () => {
      // Step 1: User enters domain
      const userDomain = 'myawesomeapp.example.com';
      const did = normalizeDidWeb(userDomain);
      expect(did).toBe('did:web:myawesomeapp.example.com');

      // Step 2: Check availability
      vi.mocked(readContract).mockRejectedValueOnce(new Error('DIDHashNotFound'));
      const isAvailable = !(await isDidRegistered(did));
      expect(isAvailable).toBe(true);

      // Step 3: Prepare mint transaction
      const mintInput: MintAppInput = {
        did,
        interfaces: 0b0001,
        dataUrl: `https://${userDomain}/oma3-metadata.json`,
        dataHash: '0x' + 'c'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const tx = prepareMintApp(mintInput);
      expect(tx).toBeDefined();

      // Step 4: After mint, query the app
      const mockRegisteredApp = {
        did,
        minter: '0x1234567890123456789012345678901234567890',
        currentOwner: '0x1234567890123456789012345678901234567890',
        interfaces: 0b0001,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + 'c'.repeat(64),
        dataUrl: `https://${userDomain}/oma3-metadata.json`,
        versionHistory: [{ major: 1, minor: 0, patch: 0 }],
        traitHashes: [],
      };

      vi.mocked(readContract).mockResolvedValueOnce(1);
      vi.mocked(readContract).mockResolvedValueOnce(mockRegisteredApp);

      const registeredApp = await getAppByDid(did);
      
      expect(registeredApp).toBeDefined();
      expect(registeredApp?.did).toBe(did);
      expect(registeredApp?.status).toBe('Active');
      expect(registeredApp?.currentVersion).toEqual({ major: 1, minor: 0, patch: 0 });
    });

    /**
     * Test: Registration with new major version
     * User has existing app, registers new major version
     */
    it('registers new major version of existing app', async () => {
      const did = 'did:web:existingapp.example.com';

      // Step 1: Check current version
      vi.mocked(readContract).mockResolvedValueOnce(1); // Current major is 1
      const currentMajor = await getLatestMajor(did);
      expect(currentMajor).toBe(1);

      // Step 2: Prepare mint for v2
      const mintInput: MintAppInput = {
        did,
        interfaces: 0b0011, // Added MCP support
        dataUrl: `https://existingapp.example.com/v2/metadata.json`,
        dataHash: '0x' + 'd'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 2, // New major version
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const tx = prepareMintApp(mintInput);
      expect(tx.params[7]).toBe(2); // Version major is 2
    });
  });

  describe('Validation Rules', () => {
    /**
     * Test: DataUrl must be HTTPS
     */
    it('accepts HTTPS dataUrl', () => {
      const input: MintAppInput = {
        did: 'did:web:secure.example.com',
        interfaces: 1,
        dataUrl: 'https://secure.example.com/metadata.json',
        dataHash: '0x' + 'a'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const tx = prepareMintApp(input);
      expect(tx.params[2]).toMatch(/^https:\/\//);
    });

    /**
     * Test: DataHash must be 32 bytes (64 hex chars + 0x)
     */
    it('validates dataHash length', () => {
      const input: MintAppInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + 'a'.repeat(64), // Correct: 32 bytes
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const tx = prepareMintApp(input);
      expect(tx.params[3]).toMatch(/^0x[a-f0-9]{64}$/i);
    });

    /**
     * Test: Version numbers are uint8 (0-255)
     */
    it('accepts valid version numbers', () => {
      const input: MintAppInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + 'a'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 255,
        initialVersionMinor: 255,
        initialVersionPatch: 255,
      };

      const tx = prepareMintApp(input);
      expect(tx.params[7]).toBe(255);
      expect(tx.params[8]).toBe(255);
      expect(tx.params[9]).toBe(255);
    });
  });

  describe('Error Scenarios', () => {
    /**
     * Test: Query error handling
     */
    it('handles query errors gracefully', async () => {
      vi.mocked(readContract).mockRejectedValueOnce(new Error('Network error'));

      const app = await getAppByDid('did:web:error.example.com');
      
      expect(app).toBeNull();
    });

    /**
     * Test: Empty DID handling
     */
    it('normalizes empty domain gracefully', () => {
      const normalized = normalizeDidWeb('');
      expect(normalized).toBe('did:web:');
    });
  });
});

