import { describe, it, expect } from 'vitest';
import type {
  Status,
  Version,
  DidIdentifier,
  AppSummary,
  Paginated,
  MintAppInput,
  UpdateAppInput,
  UpdateStatusInput,
  DidVerificationResult,
  DidOwnership,
} from '@/lib/contracts/types';
import { InterfaceType } from '@/lib/contracts/types';

describe('Contracts Types', () => {
  describe('Status', () => {
    it('has correct status values', () => {
      const statuses: Status[] = ['Active', 'Deprecated', 'Replaced'];
      expect(statuses).toHaveLength(3);
    });
  });

  describe('Version', () => {
    it('defines version interface correctly', () => {
      const version: Version = {
        major: 1,
        minor: 2,
        patch: 3,
      };

      expect(version.major).toBe(1);
      expect(version.minor).toBe(2);
      expect(version.patch).toBe(3);
    });
  });

  describe('InterfaceType', () => {
    it('has correct enum values', () => {
      expect(InterfaceType.HumanApp).toBe(1);
      expect(InterfaceType.ApiEndpoint).toBe(2);
      expect(InterfaceType.SmartContract).toBe(4);
    });

    it('allows bitwise operations', () => {
      const combined = InterfaceType.HumanApp | InterfaceType.ApiEndpoint;
      expect(combined).toBe(3); // 1 | 2 = 3

      const allInterfaces = InterfaceType.HumanApp | InterfaceType.ApiEndpoint | InterfaceType.SmartContract;
      expect(allInterfaces).toBe(7); // 1 | 2 | 4 = 7
    });
  });

  describe('DidIdentifier', () => {
    it('defines DID identifier interface correctly', () => {
      const identifier: DidIdentifier = {
        did: 'did:web:example.com',
        major: 1,
      };

      expect(identifier.did).toBe('did:web:example.com');
      expect(identifier.major).toBe(1);
    });
  });

  describe('AppSummary', () => {
    it('defines complete app summary interface', () => {
      const appSummary: AppSummary = {
        did: 'did:web:example.com',
        versionMajor: 1,
        currentVersion: { major: 1, minor: 2, patch: 3 },
        versionHistory: [
          { major: 1, minor: 0, patch: 0 },
          { major: 1, minor: 1, patch: 0 },
          { major: 1, minor: 2, patch: 3 },
        ],
        minter: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        owner: '0x9876543210987654321098765432109876543210' as `0x${string}`,
        interfaces: 5, // Human + SmartContract
        dataUrl: 'https://example.com/metadata',
        dataHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        dataHashAlgorithm: 0,
        fungibleTokenId: 'eip155:1:0x123',
        contractId: 'eip155:1:0x456',
        traitHashes: ['hash1', 'hash2'],
        status: 'Active',
        name: 'Test App',
        description: 'Test Description',
        _tokenId: BigInt('123'),
      };

      expect(appSummary.did).toBe('did:web:example.com');
      expect(appSummary.versionMajor).toBe(1);
      expect(appSummary.currentVersion.major).toBe(1);
      expect(appSummary.versionHistory).toHaveLength(3);
      expect(appSummary.interfaces).toBe(5);
      expect(appSummary.status).toBe('Active');
      expect(appSummary._tokenId).toBe(BigInt('123'));
    });

    it('allows optional fields to be undefined', () => {
      const minimalAppSummary: AppSummary = {
        did: 'did:web:example.com',
        versionMajor: 1,
        currentVersion: { major: 1, minor: 0, patch: 0 },
        versionHistory: [{ major: 1, minor: 0, patch: 0 }],
        minter: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        owner: '0x9876543210987654321098765432109876543210' as `0x${string}`,
        interfaces: 1,
        dataUrl: 'https://example.com/metadata',
        dataHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        dataHashAlgorithm: 0,
        traitHashes: [],
        status: 'Active',
      };

      expect(minimalAppSummary.fungibleTokenId).toBeUndefined();
      expect(minimalAppSummary.contractId).toBeUndefined();
      expect(minimalAppSummary.name).toBeUndefined();
      expect(minimalAppSummary.description).toBeUndefined();
      expect(minimalAppSummary._tokenId).toBeUndefined();
    });
  });

  describe('Paginated', () => {
    it('defines paginated response interface', () => {
      const paginated: Paginated<AppSummary> = {
        items: [],
        nextCursor: 'cursor123',
        hasMore: true,
      };

      expect(paginated.items).toEqual([]);
      expect(paginated.nextCursor).toBe('cursor123');
      expect(paginated.hasMore).toBe(true);
    });

    it('allows optional pagination fields', () => {
      const paginated: Paginated<string> = {
        items: ['item1', 'item2'],
      };

      expect(paginated.items).toEqual(['item1', 'item2']);
      expect(paginated.nextCursor).toBeUndefined();
      expect(paginated.hasMore).toBeUndefined();
    });
  });

  describe('MintAppInput', () => {
    it('defines mint app input interface', () => {
      const mintInput: MintAppInput = {
        did: 'did:web:example.com',
        interfaces: 5,
        dataUrl: 'https://example.com/metadata',
        dataHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        dataHashAlgorithm: 0,
        fungibleTokenId: 'eip155:1:0x123',
        contractId: 'eip155:1:0x456',
        initialVersionMajor: 1,
        initialVersionMinor: 2,
        initialVersionPatch: 3,
        traitHashes: ['hash1', 'hash2'],
        metadataJson: '{"name":"Test"}',
      };

      expect(mintInput.did).toBe('did:web:example.com');
      expect(mintInput.interfaces).toBe(5);
      expect(mintInput.initialVersionMajor).toBe(1);
      expect(mintInput.traitHashes).toEqual(['hash1', 'hash2']);
      expect(mintInput.metadataJson).toBe('{"name":"Test"}');
    });

    it('allows optional fields to be undefined', () => {
      const minimalMintInput: MintAppInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata',
        dataHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      expect(minimalMintInput.fungibleTokenId).toBeUndefined();
      expect(minimalMintInput.contractId).toBeUndefined();
      expect(minimalMintInput.traitHashes).toBeUndefined();
      expect(minimalMintInput.metadataJson).toBeUndefined();
    });
  });

  describe('UpdateAppInput', () => {
    it('defines update app input interface', () => {
      const updateInput: UpdateAppInput = {
        did: 'did:web:example.com',
        major: 1,
        newDataUrl: 'https://example.com/updated-metadata',
        newDataHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        newDataHashAlgorithm: 0,
        newInterfaces: 7,
        newTraitHashes: ['newHash1', 'newHash2'],
        newMinor: 2,
        newPatch: 5,
        metadataJson: '{"name":"Updated"}',
      };

      expect(updateInput.did).toBe('did:web:example.com');
      expect(updateInput.major).toBe(1);
      expect(updateInput.newInterfaces).toBe(7);
      expect(updateInput.newMinor).toBe(2);
      expect(updateInput.newPatch).toBe(5);
    });

    it('allows optional update fields', () => {
      const minimalUpdateInput: UpdateAppInput = {
        did: 'did:web:example.com',
        major: 1,
        newMinor: 1,
        newPatch: 1,
      };

      expect(minimalUpdateInput.newDataUrl).toBeUndefined();
      expect(minimalUpdateInput.newInterfaces).toBeUndefined();
      expect(minimalUpdateInput.metadataJson).toBeUndefined();
    });
  });

  describe('UpdateStatusInput', () => {
    it('defines status update input interface', () => {
      const statusInput: UpdateStatusInput = {
        did: 'did:web:example.com',
        major: 1,
        status: 'Deprecated',
      };

      expect(statusInput.did).toBe('did:web:example.com');
      expect(statusInput.major).toBe(1);
      expect(statusInput.status).toBe('Deprecated');
    });
  });

  describe('DidVerificationResult', () => {
    it('defines DID verification result interface', () => {
      const verificationResult: DidVerificationResult = {
        success: true,
        verified: true,
        message: 'Verification successful',
        method: 'did.json',
        txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      };

      expect(verificationResult.success).toBe(true);
      expect(verificationResult.verified).toBe(true);
      expect(verificationResult.method).toBe('did.json');
      expect(verificationResult.txHash).toBe('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    });

    it('allows optional fields', () => {
      const minimalResult: DidVerificationResult = {
        success: false,
        verified: false,
        message: 'Verification failed',
        error: 'Network error',
      };

      expect(minimalResult.method).toBeUndefined();
      expect(minimalResult.txHash).toBeUndefined();
      expect(minimalResult.error).toBe('Network error');
    });
  });

  describe('DidOwnership', () => {
    it('defines DID ownership interface', () => {
      const ownership: DidOwnership = {
        did: 'did:web:example.com',
        owner: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        isMature: true,
        registeredAt: 1234567890,
        maturationPeriod: 86400,
      };

      expect(ownership.did).toBe('did:web:example.com');
      expect(ownership.owner).toBe('0x1234567890123456789012345678901234567890');
      expect(ownership.isMature).toBe(true);
      expect(ownership.registeredAt).toBe(1234567890);
      expect(ownership.maturationPeriod).toBe(86400);
    });

    it('allows optional timestamp fields', () => {
      const minimalOwnership: DidOwnership = {
        did: 'did:web:example.com',
        owner: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        isMature: false,
      };

      expect(minimalOwnership.registeredAt).toBeUndefined();
      expect(minimalOwnership.maturationPeriod).toBeUndefined();
    });
  });
});
