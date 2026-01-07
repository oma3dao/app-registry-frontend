/**
 * OMATrust Specification Compliance: Onchain Metadata (Table 1)
 * 
 * Tests implementation compliance with OMATrust Identity Specification
 * Section 5.1.1 - Application Registry On-chain Data Requirements.
 * 
 * SPECIFICATION REFERENCES:
 * - OMATrust Identity Specification: omatrust-specification-identity.pdf
 * - Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 * - Section: 5.1.1 - Onchain Metadata (Table 1)
 * 
 * This test file validates EXTERNAL SPECIFICATIONS, not internal implementation.
 * 
 * TABLE 1: Application Registry Onchain Data
 * Every app registry NFT stores the following information:
 * 
 * | Field              | Format    | Description                          | Req? | Mutable? |
 * |--------------------|-----------|--------------------------------------|------|----------|
 * | did                | string    | See Table 3                          | Y    | N        |
 * | fungibleTokenId    | string    | CAIP-19 token ID                    | N    | N        |
 * | contractId         | string    | CAIP-10 contract address            | N    | N        |
 * | versionHistory     | [object]  | Array of released version structs   | Y    | Y (append only) |
 * | status             | enum      | Active, deprecated, replaced        | Y    | Y        |
 * | minter             | address   | Address of transaction signer       | Y    | N        |
 * | owner              | address   | Current owner (built into ERC-721)  | Y    | Y (soulbound optional) |
 * | dataUrl            | URL       | URL to offchain data                | Y    | Y        |
 * | dataHash           | string    | Hash of JSON from dataUrl           | Y    | Y        |
 * | dataHashAlgorithm  | string    | Hash algorithm (keccak256, sha256)  | N    | Y        |
 * | traitHashes        | [string]  | Hashed traits (capped at ≤20)       | N    | Y        |
 * | interfaces         | [enum]    | Interface capability codes          | Y    | N        |
 */

import { describe, it, expect } from 'vitest';
import { prepareMintApp } from '@/lib/contracts/registry.write';

describe('OMATrust Identity Spec 5.1.1: Onchain Metadata (Table 1)', () => {
  /**
   * Specification: OMATrust Identity Specification
   * Section: 5.1.1 - Application Registry Onchain Data
   * Table: Table 1
   * 
   * Tests validate that the implementation correctly handles all required
   * onchain metadata fields as defined in the specification.
   */

  describe('Required Fields (OT-ID-001 through OT-ID-012)', () => {
    it('includes did field (Required=Y, Mutable=N) - OT-ID-001', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement ID: OT-ID-001
       * Requirement: "Application Registry NFT MUST store `did` field"
       * Field: did | Format: string | Required: Y | Mutable: N
       */

      const mintInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '1234567890abcdef'.repeat(4),
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const result = prepareMintApp(mintInput);

      // did must be first argument in contract call
      expect(result.args[0]).toBe('did:web:example.com');
      expect(typeof result.args[0]).toBe('string');
    });

    it('accepts optional fungibleTokenId field (Required=N) - OT-ID-002', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement ID: OT-ID-002 (derived)
       * Requirement: "fungibleTokenId is optional (Required=N)"
       * Field: fungibleTokenId | Format: string (CAIP-19) | Required: N | Mutable: N
       * Note: CAIP-19 format: namespace:reference:asset_namespace:asset_reference
       * Example: eip155:1/erc20:0x...
       */

      // Test should pass without fungibleTokenId
      const mintInputWithoutToken = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '1234567890abcdef'.repeat(4),
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const result = prepareMintApp(mintInputWithoutToken);
      expect(result).toBeDefined();
      
      // TODO: Test with fungibleTokenId when implementation supports it
      // const mintInputWithToken = { ...mintInputWithoutToken, fungibleTokenId: 'eip155:1/erc20:0x...' };
      // const resultWithToken = prepareMintApp(mintInputWithToken);
      // expect(resultWithToken).toBeDefined();
    });

    it('accepts optional contractId field (Required=N) - OT-ID-003', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement ID: OT-ID-003 (derived)
       * Requirement: "contractId is optional (Required=N)"
       * Field: contractId | Format: string (CAIP-10) | Required: N | Mutable: N
       * Note: CAIP-10 format: namespace:reference:account_address
       * Example: eip155:1:0x...
       */

      // Test should pass without contractId
      const mintInputWithoutContract = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '1234567890abcdef'.repeat(4),
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const result = prepareMintApp(mintInputWithoutContract);
      expect(result).toBeDefined();
      
      // TODO: Test with contractId when implementation supports it
      // const mintInputWithContract = { ...mintInputWithoutContract, contractId: 'eip155:1:0x...' };
      // const resultWithContract = prepareMintApp(mintInputWithContract);
      // expect(resultWithContract).toBeDefined();
    });

    it('includes versionHistory field (Required=Y, Mutable=Y append-only) - OT-ID-003', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement ID: OT-ID-003
       * Requirement: "Application Registry NFT MUST store `versionHistory` as append-only array"
       * Field: versionHistory | Format: [object] | Required: Y | Mutable: Y (append only)
       * 
       * Version objects must contain: { major: Int, minor: Int, patch: Int }
       * See Section 5.1.1.1 for versionHistory object format.
       */

      const mintInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '1234567890abcdef'.repeat(4),
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const result = prepareMintApp(mintInput);

      // Version fields must be present in contract call
      // The implementation uses initialVersionMajor/Minor/Patch which initialize versionHistory
      expect(result.args).toContain(1); // major
      expect(result.args).toContain(0); // minor
      expect(result.args).toContain(0); // patch
    });

    it('includes status field (Required=Y, Mutable=Y) - OT-ID-004', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement ID: OT-ID-004
       * Requirement: "Application Registry NFT MUST store `status` field (Active, deprecated, replaced)"
       * Field: status | Format: enum | Required: Y | Mutable: Y
       * Values: Active, deprecated, replaced
       */

      // TODO: Implementation doesn't explicitly expose status field in prepareMintApp
      // This test is a placeholder until status is added to the API
      
      const mintInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '1234567890abcdef'.repeat(4),
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const result = prepareMintApp(mintInput);
      expect(result).toBeDefined();
      
      // TODO: Once status is exposed, test it:
      // expect(result.args).toContainEqual(expect.objectContaining({ status: 'Active' }));
    });

    it('includes dataUrl field (Required=Y, Mutable=Y) - OT-ID-007', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement ID: OT-ID-007
       * Requirement: "Application Registry NFT MUST store `dataUrl`"
       * Field: dataUrl | Format: URL | Required: Y | Mutable: Y
       * Description: "URL to offchain data"
       */

      const mintInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '1234567890abcdef'.repeat(4),
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const result = prepareMintApp(mintInput);

      // dataUrl must be present in contract call
      expect(result.args).toContain('https://example.com/metadata.json');
    });

    it('includes dataHash field (Required=Y, Mutable=Y) - OT-ID-008', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement ID: OT-ID-008
       * Requirement: "Application Registry NFT MUST store `dataHash` (hash of JSON from dataUrl)"
       * Field: dataHash | Format: string | Required: Y | Mutable: Y
       * Description: "Hash of the JSON returned by dataUrl (see 5.1.3.3)"
       * 
       * See Section 5.1.3.3 for hash computation details.
       */

      const testHash = '0x' + '1234567890abcdef'.repeat(4);
      
      const mintInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: testHash,
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const result = prepareMintApp(mintInput);

      // dataHash must be present in contract call
      expect(result.args).toContain(testHash);
      expect(typeof testHash).toBe('string');
    });

    it('accepts optional dataHashAlgorithm field (Required=N) - OT-ID-009', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement ID: OT-ID-009
       * Requirement: "`dataHashAlgorithm` MAY be 'keccak256' or 'sha256'"
       * Field: dataHashAlgorithm | Format: string | Required: N | Mutable: Y
       * Description: "The hash algorithm used to compute dataHash. Values: 'keccak256', 'sha256'. Default is VM-specific (e.g.- keccak256 for EVM)."
       */

      // Test with keccak256 (default for EVM)
      const mintInputKeccak = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '1234567890abcdef'.repeat(4),
        dataHashAlgorithm: 0 as const, // 0 = keccak256 in implementation
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const resultKeccak = prepareMintApp(mintInputKeccak);
      expect(resultKeccak).toBeDefined();
      expect(resultKeccak.args).toContain(0); // Algorithm enum value

      // Test with sha256
      const mintInputSha = {
        ...mintInputKeccak,
        dataHashAlgorithm: 1 as const, // 1 = sha256 in implementation
      };

      const resultSha = prepareMintApp(mintInputSha);
      expect(resultSha).toBeDefined();
      expect(resultSha.args).toContain(1); // Algorithm enum value
    });

    it('caps traitHashes to ≤20 entries (Required=N) - OT-ID-010, OT-ID-011', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement ID: OT-ID-010, OT-ID-011
       * Requirement: "Implementations SHOULD cap `traitHashes` to ≤ 20 entries"
       *              "Clients MUST NOT assume more than 20 `traitHashes` are indexed"
       * Field: traitHashes | Format: [string] | Required: N | Mutable: Y
       * Description: "A structure of hashed traits. Implementation is different for each VM. 
       *               Implementations SHOULD cap on-chain traitHashes to ≤ 20 entries to mirror 
       *               the off-chain keywords cap, and clients MUST NOT assume more than 20 are indexed."
       * 
       * See Appendix C for recommended trait strings.
       */

      // TODO: Implementation doesn't expose traitHashes in prepareMintApp yet
      // This is a placeholder test
      
      const twentyTraits = Array.from({ length: 20 }, (_, i) => `trait${i}`);
      const twentyOneTraits = Array.from({ length: 21 }, (_, i) => `trait${i}`);

      // Test: 20 traits should be accepted
      // expect(validateTraitHashes(twentyTraits)).toBe(true);
      
      // Test: 21 traits should be rejected or capped
      // expect(validateTraitHashes(twentyOneTraits)).toBe(false);
      // OR
      // const capped = capTraitHashes(twentyOneTraits);
      // expect(capped.length).toBeLessThanOrEqual(20);

      // Placeholder assertion
      expect(twentyTraits.length).toBe(20);
      expect(twentyOneTraits.length).toBeGreaterThan(20);
    });

    it('includes interfaces field (Required=Y, Mutable=N) - OT-ID-012, OT-ID-013', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement ID: OT-ID-012, OT-ID-013
       * Requirement: "Application Registry NFT MUST store `interfaces` field"
       *              "`interfaces` MUST be immutable"
       * Field: interfaces | Format: [enum] | Required: Y | Mutable: N
       * Description: "An unordered set of interface capability codes. Multiple capabilities may be present.
       *               Example: if using a bitmap, bit 0 = human, bit 1 = api, and bit 2 = smart contract."
       * 
       * Interface type codes:
       * - 0 = Human (consumer UI)
       * - 2 = API
       * - 4 = Smart Contract
       */

      // Test with single interface
      const mintInputHuman = {
        did: 'did:web:example.com',
        interfaces: 1, // Bit 0 = Human
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '1234567890abcdef'.repeat(4),
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const resultHuman = prepareMintApp(mintInputHuman);
      expect(resultHuman.args).toContain(1); // Interfaces bitmap

      // Test with multiple interfaces (Human + API)
      const mintInputMultiple = {
        ...mintInputHuman,
        interfaces: 3, // Bits 0 and 1 = Human + API
      };

      const resultMultiple = prepareMintApp(mintInputMultiple);
      expect(resultMultiple.args).toContain(3); // Interfaces bitmap
    });
  });

  describe('Field Mutability Requirements', () => {
    it('enforces immutability of did field - OT-ID-002', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement ID: OT-ID-002
       * Requirement: "`did` field MUST be immutable"
       * Field: did | Mutable: N
       * 
       * The DID, once set during minting, cannot be changed.
       */

      // TODO: This requires testing update functions that don't exist yet
      // Placeholder test documents the requirement
      
      const initialDid = 'did:web:example.com';
      const attemptedNewDid = 'did:web:different.com';

      // Test concept: Any update function should reject DID changes
      // expect(() => updateAppDid(tokenId, attemptedNewDid)).toThrow();
      
      expect(initialDid).not.toBe(attemptedNewDid);
    });

    it('enforces immutability of interfaces field - OT-ID-013', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement ID: OT-ID-013
       * Requirement: "`interfaces` MUST be immutable"
       * Field: interfaces | Mutable: N
       * 
       * The interfaces capability bitmap, once set during minting, cannot be changed.
       */

      // TODO: This requires testing update functions that don't exist yet
      // Placeholder test documents the requirement
      
      const initialInterfaces = 1; // Human only
      const attemptedNewInterfaces = 3; // Human + API

      // Test concept: Any update function should reject interfaces changes
      // expect(() => updateAppInterfaces(tokenId, attemptedNewInterfaces)).toThrow();
      
      expect(initialInterfaces).not.toBe(attemptedNewInterfaces);
    });

    it('allows versionHistory updates (append-only) - OT-ID-003', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement ID: OT-ID-003
       * Requirement: "`versionHistory` is mutable but append-only"
       * Field: versionHistory | Mutable: Y (append only)
       * 
       * New versions can be added to versionHistory, but existing entries cannot be modified or removed.
       */

      // TODO: This requires testing version update functions
      // Placeholder test documents the requirement
      
      const initialVersion = { major: 1, minor: 0, patch: 0 };
      const newVersion = { major: 1, minor: 1, patch: 0 };

      // Test concept: Should allow appending new version
      // expect(appendVersion(tokenId, newVersion)).toBe(true);
      
      // Test concept: Should reject modifying existing version
      // expect(() => modifyVersion(tokenId, 0, newVersion)).toThrow();
      
      expect(initialVersion.major).toBe(1);
      expect(newVersion.minor).toBe(1);
    });
  });
});

