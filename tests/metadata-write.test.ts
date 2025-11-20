import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prepareSetMetadata } from '@/lib/contracts/metadata.write';
import type { NFT } from '@/types/nft';

// Mock thirdweb
vi.mock('thirdweb', () => ({
  prepareContractCall: vi.fn((params) => ({
    contract: params.contract,
    method: params.method,
    params: params.params,
  })),
}));

// Mock contract client
vi.mock('@/lib/contracts/client', () => ({
  getAppMetadataContract: vi.fn(() => ({
    address: '0x9876543210987654321098765432109876543210',
    chain: { id: 31337 },
  })),
}));

// Mock metadata utilities
vi.mock('@/lib/contracts/metadata.utils', () => ({
  buildMetadataJSON: vi.fn((nft) => JSON.stringify({ name: nft.name })),
  validateMetadataJSON: vi.fn(() => true),
}));

// Mock error normalization
vi.mock('@/lib/contracts/errors', () => ({
  normalizeEvmError: vi.fn((e) => e),
}));

describe('Metadata Write Functions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset mock implementations to defaults
    const { buildMetadataJSON, validateMetadataJSON } = await import('@/lib/contracts/metadata.utils');
    (buildMetadataJSON as any).mockImplementation((nft: any) => JSON.stringify({ name: nft.name }));
    (validateMetadataJSON as any).mockReturnValue(true);
  });

  describe('prepareSetMetadata', () => {
    let mockNFT: NFT;

    beforeEach(() => {
      mockNFT = {
        tokenId: 'did:web:example.com:1',
        did: 'did:web:example.com',
        version: '1.0.0',
        name: 'Test App',
        description: 'Test description',
        image: 'https://example.com/image.png',
        external_url: 'https://example.com',
        summary: 'Test summary',
        publisher: 'Test Publisher',
        status: 'Active',
        interfaceBitmap: 1,
        dataUrl: 'https://example.com/data.json',
        dataHash: '0x1234',
        dataHashAlgorithm: 0,
      };
    });

    // Tests successful metadata preparation
    it('prepares setMetadata transaction correctly', () => {
      const result = prepareSetMetadata(mockNFT);

      expect(result).toBeDefined();
      expect(result.method).toContain('function setMetadataJson');
      expect(result.params).toHaveLength(5);
    });

    // Tests DID parameter
    it('includes DID in parameters', () => {
      const result = prepareSetMetadata(mockNFT);

      expect(result.params[0]).toBe('did:web:example.com');
    });

    // Tests version parsing (major.minor.patch)
    it('parses version string into components', () => {
      mockNFT.version = '2.3.4';
      
      const result = prepareSetMetadata(mockNFT);

      expect(result.params[1]).toBe(2); // major
      expect(result.params[2]).toBe(3); // minor
      expect(result.params[3]).toBe(4); // patch
    });

    // Tests version with only major
    it('defaults minor and patch to 0 for incomplete versions', () => {
      mockNFT.version = '3';
      
      const result = prepareSetMetadata(mockNFT);

      expect(result.params[1]).toBe(3); // major
      expect(result.params[2]).toBe(0); // minor (default)
      expect(result.params[3]).toBe(0); // patch (default)
    });

    // Tests version with major.minor only
    it('defaults patch to 0 for major.minor versions', () => {
      mockNFT.version = '2.5';
      
      const result = prepareSetMetadata(mockNFT);

      expect(result.params[1]).toBe(2); // major
      expect(result.params[2]).toBe(5); // minor
      expect(result.params[3]).toBe(0); // patch (default)
    });

    // Tests metadata JSON parameter
    it('includes built metadata JSON in parameters', async () => {
      const { buildMetadataJSON } = await import('@/lib/contracts/metadata.utils');
      const result = prepareSetMetadata(mockNFT);

      expect(buildMetadataJSON).toHaveBeenCalledWith(mockNFT);
      expect(result.params[4]).toBe('{"name":"Test App"}');
    });

    // Tests metadata validation
    it('validates metadata before preparing transaction', async () => {
      const { validateMetadataJSON } = await import('@/lib/contracts/metadata.utils');
      prepareSetMetadata(mockNFT);

      expect(validateMetadataJSON).toHaveBeenCalled();
    });

    // Tests validation failure
    it('throws error when metadata validation fails', async () => {
      const { validateMetadataJSON } = await import('@/lib/contracts/metadata.utils');
      (validateMetadataJSON as any).mockReturnValueOnce(false);

      expect(() => prepareSetMetadata(mockNFT)).toThrow('Invalid metadata');
    });

    // Tests error handling in build
    it('catches and normalizes errors from buildMetadataJSON', async () => {
      const { buildMetadataJSON } = await import('@/lib/contracts/metadata.utils');
      (buildMetadataJSON as any).mockImplementationOnce(() => {
        throw new Error('Build error');
      });

      expect(() => prepareSetMetadata(mockNFT)).toThrow();
    });

    // Tests contract call preparation
    it('calls prepareContractCall with correct structure', () => {
      const result = prepareSetMetadata(mockNFT);

      // Verify the result has the expected structure
      expect(result).toBeDefined();
      expect(result.method).toContain('setMetadataJson');
      expect(result.params).toHaveLength(5);
    });

    // Tests with minimal NFT data
    it('handles NFT with minimal required fields', () => {
      mockNFT = {
        tokenId: 'did:web:minimal.com:1',
        did: 'did:web:minimal.com',
        version: '1.0.0',
        name: 'Minimal App',
        status: 'Active',
        interfaceBitmap: 0,
        dataUrl: 'https://minimal.com/data.json',
        dataHash: '0x0000',
        dataHashAlgorithm: 0,
      };

      const result = prepareSetMetadata(mockNFT);

      expect(result).toBeDefined();
      expect(result.params[0]).toBe('did:web:minimal.com');
    });

    // Tests with complex version
    it('handles version with leading zeros', () => {
      mockNFT.version = '01.02.03';
      
      const result = prepareSetMetadata(mockNFT);

      expect(result.params[1]).toBe(1); // major (parsed as number)
      expect(result.params[2]).toBe(2); // minor
      expect(result.params[3]).toBe(3); // patch
    });

    // Tests error normalization
    it('normalizes errors using normalizeEvmError', async () => {
      const { buildMetadataJSON } = await import('@/lib/contracts/metadata.utils');
      const { normalizeEvmError } = await import('@/lib/contracts/errors');
      const testError = new Error('Contract error');
      (buildMetadataJSON as any).mockImplementationOnce(() => {
        throw testError;
      });

      expect(() => prepareSetMetadata(mockNFT)).toThrow();
      expect(normalizeEvmError).toHaveBeenCalled();
    });
  });
});

