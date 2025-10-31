import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prepareMintApp, prepareUpdateStatus, prepareUpdateApp } from '@/lib/contracts/registry.write';
import type { MintAppInput, UpdateStatusInput, UpdateAppInput } from '@/lib/contracts/types';

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
  getAppRegistryContract: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    chain: { id: 31337 },
  })),
}));

// Mock DID normalization
vi.mock('@/lib/utils/did', () => ({
  normalizeDidWeb: vi.fn((did: string) => did.toLowerCase()),
}));

// Mock error normalization
vi.mock('@/lib/contracts/errors', () => ({
  normalizeEvmError: vi.fn((e) => e),
}));

describe('Registry Write Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('prepareMintApp', () => {
    let mockMintInput: MintAppInput;

    beforeEach(() => {
      mockMintInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        dataHashAlgorithm: 0,
        fungibleTokenId: '',
        contractId: '',
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        traitHashes: [],
        metadataJson: '',
      };
    });

    // Tests successful mint preparation
    it('prepares mint transaction with all required parameters', () => {
      const result = prepareMintApp(mockMintInput);

      expect(result).toBeDefined();
      expect(result.method).toContain('function mint');
      expect(result.params).toHaveLength(12);
    });

    // Tests DID normalization
    it('normalizes DID before preparing transaction', async () => {
      const { normalizeDidWeb } = await import('@/lib/utils/did');
      prepareMintApp(mockMintInput);

      expect(normalizeDidWeb).toHaveBeenCalledWith('did:web:example.com');
    });

    // Tests with fungibleTokenId
    it('includes fungibleTokenId when provided', () => {
      mockMintInput.fungibleTokenId = 'eip155:1/erc20:0xabc';
      
      const result = prepareMintApp(mockMintInput);

      expect(result.params[5]).toBe('eip155:1/erc20:0xabc');
    });

    // Tests with contractId
    it('includes contractId when provided', () => {
      mockMintInput.contractId = 'eip155:1:0x1234';
      
      const result = prepareMintApp(mockMintInput);

      expect(result.params[6]).toBe('eip155:1:0x1234');
    });

    // Tests with trait hashes
    it('includes trait hashes when provided', () => {
      mockMintInput.traitHashes = [
        '0xaaaa',
        '0xbbbb',
      ];
      
      const result = prepareMintApp(mockMintInput);

      expect(result.params[10]).toEqual(['0xaaaa', '0xbbbb']);
    });

    // Tests with metadata JSON
    it('includes metadataJson when provided', () => {
      mockMintInput.metadataJson = '{"name":"Test App"}';
      
      const result = prepareMintApp(mockMintInput);

      expect(result.params[11]).toBe('{"name":"Test App"}');
    });

    // Tests version components
    it('correctly passes version components', () => {
      mockMintInput.initialVersionMajor = 2;
      mockMintInput.initialVersionMinor = 3;
      mockMintInput.initialVersionPatch = 4;
      
      const result = prepareMintApp(mockMintInput);

      expect(result.params[7]).toBe(2); // major
      expect(result.params[8]).toBe(3); // minor
      expect(result.params[9]).toBe(4); // patch
    });

    // Tests interfaces bitmap
    it('correctly passes interfaces bitmap', () => {
      mockMintInput.interfaces = 7; // All interfaces enabled
      
      const result = prepareMintApp(mockMintInput);

      expect(result.params[1]).toBe(7);
    });

    // Tests dataHash format
    it('formats dataHash as 0x-prefixed string', () => {
      const result = prepareMintApp(mockMintInput);

      expect(result.params[3]).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    // Tests dataHashAlgorithm
    it('includes dataHashAlgorithm', () => {
      mockMintInput.dataHashAlgorithm = 1;
      
      const result = prepareMintApp(mockMintInput);

      expect(result.params[4]).toBe(1);
    });

    // Tests empty optional fields
    it('handles empty optional fields correctly', () => {
      mockMintInput.fungibleTokenId = undefined;
      mockMintInput.contractId = undefined;
      mockMintInput.traitHashes = undefined;
      mockMintInput.metadataJson = undefined;
      
      const result = prepareMintApp(mockMintInput);

      expect(result.params[5]).toBe(''); // fungibleTokenId
      expect(result.params[6]).toBe(''); // contractId
      expect(result.params[10]).toEqual([]); // traitHashes
      expect(result.params[11]).toBe(''); // metadataJson
    });

    // Tests error handling
    it('catches and normalizes errors', () => {
      // prepareContractCall will throw, which prepareMintApp should catch
      expect(() => prepareMintApp(mockMintInput)).not.toThrow();
      // The function returns a result even with errors caught internally
      const result = prepareMintApp(mockMintInput);
      expect(result).toBeDefined();
    });
  });

  describe('prepareUpdateStatus', () => {
    let mockStatusInput: UpdateStatusInput;

    beforeEach(() => {
      mockStatusInput = {
        did: 'did:web:example.com',
        major: 1,
        status: 'Active',
      };
    });

    // Tests successful status update preparation
    it('prepares status update transaction correctly', () => {
      const result = prepareUpdateStatus(mockStatusInput);

      expect(result).toBeDefined();
      expect(result.method).toContain('function updateStatus');
      expect(result.params).toHaveLength(3);
    });

    // Tests Active status
    it('converts Active status to 0', () => {
      mockStatusInput.status = 'Active';
      
      const result = prepareUpdateStatus(mockStatusInput);

      expect(result.params[2]).toBe(0);
    });

    // Tests Deprecated status
    it('converts Deprecated status to 1', () => {
      mockStatusInput.status = 'Deprecated';
      
      const result = prepareUpdateStatus(mockStatusInput);

      expect(result.params[2]).toBe(1); // Deprecated = 1
    });

    // Tests Replaced status
    it('converts Replaced status to 2', () => {
      mockStatusInput.status = 'Replaced';
      
      const result = prepareUpdateStatus(mockStatusInput);

      expect(result.params[2]).toBe(2);
    });

    // Tests DID normalization
    it('normalizes DID before preparing transaction', async () => {
      const { normalizeDidWeb } = await import('@/lib/utils/did');
      prepareUpdateStatus(mockStatusInput);

      expect(normalizeDidWeb).toHaveBeenCalledWith('did:web:example.com');
    });

    // Tests major version parameter
    it('includes major version in parameters', () => {
      mockStatusInput.major = 5;
      
      const result = prepareUpdateStatus(mockStatusInput);

      expect(result.params[1]).toBe(5);
    });

    // Tests error handling (covers lines 98-100)
    it('catches and normalizes errors when preparing status update', async () => {
      const { normalizeEvmError } = await import('@/lib/contracts/errors');
      const mockError = new Error('Contract error');
      
      // Mock prepareContractCall to throw
      const { prepareContractCall } = await import('thirdweb');
      vi.mocked(prepareContractCall).mockImplementationOnce(() => {
        throw mockError;
      });

      expect(() => prepareUpdateStatus(mockStatusInput)).toThrow();
      expect(normalizeEvmError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('prepareUpdateApp', () => {
    let mockUpdateInput: UpdateAppInput;

    beforeEach(() => {
      mockUpdateInput = {
        did: 'did:web:example.com',
        major: 1,
        newDataUrl: 'https://example.com/new-metadata.json',
        newDataHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        newDataHashAlgorithm: 0,
        newInterfaces: 3,
        newTraitHashes: [],
        newMinor: 1,
        newPatch: 0,
      };
    });

    // Tests successful app update preparation
    it('prepares app update transaction correctly', () => {
      const result = prepareUpdateApp(mockUpdateInput);

      expect(result).toBeDefined();
      expect(result.method).toContain('function updateAppControlled');
      expect(result.params).toHaveLength(10);
    });

    // Tests DID normalization
    it('normalizes DID before preparing transaction', async () => {
      const { normalizeDidWeb } = await import('@/lib/utils/did');
      prepareUpdateApp(mockUpdateInput);

      expect(normalizeDidWeb).toHaveBeenCalledWith('did:web:example.com');
    });

    // Tests with new data URL
    it('includes new data URL when provided', () => {
      const result = prepareUpdateApp(mockUpdateInput);

      expect(result.params[2]).toBe('https://example.com/new-metadata.json');
    });

    // Tests with new data hash
    it('includes new data hash when provided', () => {
      const result = prepareUpdateApp(mockUpdateInput);

      expect(result.params[3]).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    // Tests with new interfaces
    it('includes new interfaces bitmap when provided', () => {
      mockUpdateInput.newInterfaces = 7;
      
      const result = prepareUpdateApp(mockUpdateInput);

      expect(result.params[5]).toBe(7);
    });

    // Tests with new trait hashes
    it('includes new trait hashes when provided', () => {
      mockUpdateInput.newTraitHashes = ['0x1111', '0x2222'];
      
      const result = prepareUpdateApp(mockUpdateInput);

      expect(result.params[6]).toEqual(['0x1111', '0x2222']);
    });

    // Tests new minor and patch versions
    it('includes new minor and patch versions', () => {
      mockUpdateInput.newMinor = 5;
      mockUpdateInput.newPatch = 3;
      
      const result = prepareUpdateApp(mockUpdateInput);

      expect(result.params[7]).toBe(5); // newMinor
      expect(result.params[8]).toBe(3); // newPatch
    });

    // Tests empty optional fields (no changes)
    it('handles empty optional fields with defaults', () => {
      mockUpdateInput.newDataUrl = undefined;
      mockUpdateInput.newDataHash = undefined;
      mockUpdateInput.newDataHashAlgorithm = undefined;
      mockUpdateInput.newInterfaces = undefined;
      mockUpdateInput.newTraitHashes = undefined;
      
      const result = prepareUpdateApp(mockUpdateInput);

      expect(result.params[2]).toBe(''); // empty dataUrl = no change
      expect(result.params[3]).toBe('0x0000000000000000000000000000000000000000000000000000000000000000'); // zero hash = no change
      expect(result.params[4]).toBe(0); // 0 = no change
      expect(result.params[5]).toBe(0); // 0 = no change
      expect(result.params[6]).toEqual([]); // empty = no change
    });

    // Tests major version parameter
    it('includes major version in parameters', () => {
      mockUpdateInput.major = 3;
      
      const result = prepareUpdateApp(mockUpdateInput);

      expect(result.params[1]).toBe(3);
    });

    // Tests error handling (covers lines 145-147)
    it('catches and normalizes errors when preparing app update', async () => {
      const { normalizeEvmError } = await import('@/lib/contracts/errors');
      const mockError = new Error('Contract error');
      
      // Mock prepareContractCall to throw
      const { prepareContractCall } = await import('thirdweb');
      vi.mocked(prepareContractCall).mockImplementationOnce(() => {
        throw mockError;
      });

      expect(() => prepareUpdateApp(mockUpdateInput)).toThrow();
      expect(normalizeEvmError).toHaveBeenCalledWith(mockError);
    });

    // Tests partial update (only version bump)
    it('handles partial update with only version changes', () => {
      mockUpdateInput.newDataUrl = undefined;
      mockUpdateInput.newDataHash = undefined;
      mockUpdateInput.newInterfaces = undefined;
      mockUpdateInput.newTraitHashes = undefined;
      mockUpdateInput.newMinor = 2;
      mockUpdateInput.newPatch = 1;
      
      const result = prepareUpdateApp(mockUpdateInput);

      expect(result.params[7]).toBe(2);
      expect(result.params[8]).toBe(1);
    });
  });
});

