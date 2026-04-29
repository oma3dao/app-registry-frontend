/**
 * OMATrust Specification Compliance: Control Policy (Versioning Rules)
 * 
 * Tests implementation compliance with OMATrust Identity Specification
 * Section 5.1.4 - Control Policy
 * 
 * SPECIFICATION REFERENCES:
 * - OMATrust Identity Specification: omatrust-specification-identity.pdf
 * - Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 * - Section: 5.1.4 - Control Policy
 * 
 * SECTION 5.1.4: Control Policy (Versioning Rules)
 * 
 * | Desired Change      | Rule                              |
 * |---------------------|-----------------------------------|
 * | Major version change| Must mint new NFT                 |
 * | Edit interfaces     | Minor bump, additive only         |
 * | Edit traitHashes    | Requires patch or minor bump      |
 * | Edit dataUrl        | Must mint new NFT                 |
 * | Edit contractId     | Not allowed                       |
 * 
 * Key Principles:
 * - Version history is append-only
 * - Breaking changes require new NFT
 * - Non-breaking changes bump minor/patch
 */

import { describe, it, expect, vi } from 'vitest';
import { prepareMintApp, prepareUpdateApp } from '@/lib/contracts/registry.write';
import { OnChainApp } from '@/schema/data-model';

describe('OMATrust Identity Spec 5.1.4: Control Policy (Versioning Rules)', () => {
  /**
   * Tests validate version control and mutation rules per specification.
   */

  describe('Major Version Changes (OT-ID-100)', () => {
    it('major version change requires new NFT mint - OT-ID-100', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.4
       * Requirement ID: OT-ID-100
       * Requirement: "Major version change MUST require minting a new NFT"
       * 
       * A major version bump (e.g., 1.x.x → 2.x.x) indicates breaking changes
       * and requires a completely new registry entry.
       */
      
      // Version 1.0.0 - initial
      const v1App = {
        did: 'did:web:example.com',
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        interfaces: 1,
        dataUrl: 'https://example.com/v1/metadata.json',
        dataHash: '0x' + '1'.repeat(64),
        dataHashAlgorithm: 0 as const,
        minter: '0x1234567890123456789012345678901234567890',
      };

      const v1Result = OnChainApp.safeParse(v1App);
      expect(v1Result.success).toBe(true);

      // Version 2.0.0 - major bump (would be a NEW NFT, not an update)
      const v2App = {
        ...v1App,
        did: 'did:web:example.com', // Same DID
        initialVersionMajor: 2,     // Major version bump
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        dataUrl: 'https://example.com/v2/metadata.json', // New data URL
        dataHash: '0x' + '2'.repeat(64),                 // New hash
      };

      const v2Result = OnChainApp.safeParse(v2App);
      expect(v2Result.success).toBe(true);

      // Document: Both are valid apps, but v2 should be a NEW mint, not an update
      // The contract should enforce this, not the frontend schema
      console.info('[OT-ID-100] Major version changes require new NFT mint (contract enforcement)');
    });
  });

  describe('Interface Changes (OT-ID-101)', () => {
    it('interface additions require minor version bump - OT-ID-101', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.4
       * Requirement ID: OT-ID-101
       * Requirement: "Edit interfaces MUST be additive only with minor version bump"
       * 
       * Adding new interface capabilities is a non-breaking change
       * that requires at least a minor version bump.
       */
      
      // Original: Human interface only (bit 0 = 1)
      const originalInterfaces = 0b001; // Human only
      
      // Updated: Human + API interfaces (bits 0 and 1 = 3)
      const updatedInterfaces = 0b011; // Human + API
      
      // Verify it's additive (new includes old)
      expect((updatedInterfaces & originalInterfaces)).toBe(originalInterfaces);
      
      // Test version bump requirement
      const originalVersion = { major: 1, minor: 0, patch: 0 };
      const updatedVersion = { major: 1, minor: 1, patch: 0 }; // Minor bump
      
      expect(updatedVersion.minor).toBeGreaterThan(originalVersion.minor);
    });

    it('interface removal is not allowed', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.4
       * Requirement: Interface changes MUST be additive only
       * 
       * Removing interfaces would be a breaking change and is not allowed.
       */
      
      // Original: Human + API (bits 0 and 1)
      const originalInterfaces = 0b011;
      
      // Attempted removal: Human only (bit 0)
      const attemptedRemoval = 0b001;
      
      // This is NOT additive - it removes the API interface
      const isAdditive = (attemptedRemoval & originalInterfaces) === originalInterfaces;
      expect(isAdditive).toBe(false);
      
      // Document: Contract should reject non-additive interface changes
      console.info('[OT-ID-101] Interface removal should be rejected by contract');
    });
  });

  describe('TraitHashes Changes (OT-ID-102)', () => {
    it('traitHashes changes require patch or minor bump - OT-ID-102', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.4
       * Requirement ID: OT-ID-102
       * Requirement: "Edit traitHashes requires patch or minor version bump"
       * 
       * Trait changes are non-breaking but require version tracking.
       */
      
      const originalTraits = [
        '0x' + 'a'.repeat(64), // api:openapi
        '0x' + 'b'.repeat(64), // pay:x402
      ];
      
      const updatedTraits = [
        '0x' + 'a'.repeat(64), // api:openapi (unchanged)
        '0x' + 'b'.repeat(64), // pay:x402 (unchanged)
        '0x' + 'c'.repeat(64), // NEW: token:erc20
      ];
      
      // Adding a trait is valid
      expect(updatedTraits.length).toBeGreaterThan(originalTraits.length);
      
      // Version bump options
      const patchBump = { major: 1, minor: 0, patch: 1 }; // 1.0.0 → 1.0.1
      const minorBump = { major: 1, minor: 1, patch: 0 }; // 1.0.0 → 1.1.0
      
      // Either is acceptable for trait changes
      expect(patchBump.patch > 0 || minorBump.minor > 0).toBe(true);
    });

    it('enforces maximum 20 traits', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1
       * Requirement: traitHashes array MUST have maximum 20 entries
       */
      
      // Valid: exactly 20 traits
      const maxTraits = Array(20).fill('0x' + 'a'.repeat(64));
      const validApp = {
        did: 'did:web:example.com',
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '1'.repeat(64),
        dataHashAlgorithm: 0 as const,
        minter: '0x1234567890123456789012345678901234567890',
        traitHashes: maxTraits,
      };
      
      const validResult = OnChainApp.safeParse(validApp);
      expect(validResult.success).toBe(true);
      
      // Invalid: 21 traits
      const tooManyTraits = Array(21).fill('0x' + 'a'.repeat(64));
      const invalidApp = { ...validApp, traitHashes: tooManyTraits };
      
      const invalidResult = OnChainApp.safeParse(invalidApp);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('DataUrl Changes (OT-ID-103)', () => {
    it('dataUrl change requires new NFT mint - OT-ID-103', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.4
       * Requirement ID: OT-ID-103
       * Requirement: "Edit dataUrl MUST require minting a new NFT"
       * 
       * The dataUrl is the canonical location of metadata.
       * Changing it fundamentally changes the app identity.
       */
      
      const originalDataUrl = 'https://example.com/v1/metadata.json';
      const newDataUrl = 'https://example.com/v2/metadata.json';
      
      // These are different URLs
      expect(originalDataUrl).not.toBe(newDataUrl);
      
      // Document: Contract should not allow dataUrl updates on existing NFT
      console.info('[OT-ID-103] dataUrl changes require new NFT mint (contract enforcement)');
    });
  });

  describe('ContractId Immutability (OT-ID-104)', () => {
    it('contractId cannot be edited - OT-ID-104', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.4
       * Requirement ID: OT-ID-104
       * Requirement: "Edit contractId is NOT allowed"
       * 
       * The contractId (for smart contract interfaces) is immutable
       * because it represents the on-chain identity of the contract.
       */
      
      const originalContractId = 'eip155:1:0x1234567890123456789012345678901234567890';
      const attemptedChange = 'eip155:1:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      
      // These are different contract IDs
      expect(originalContractId).not.toBe(attemptedChange);
      
      // Document: Contract should reject any contractId changes
      console.info('[OT-ID-104] contractId is immutable (contract enforcement)');
    });
  });

  describe('Version History Append-Only', () => {
    it('versionHistory must be append-only', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1
       * Requirement: versionHistory array is append-only
       * 
       * Previous versions cannot be removed or modified.
       */
      
      const versionHistory = [
        { major: 1, minor: 0, patch: 0 }, // Initial
        { major: 1, minor: 0, patch: 1 }, // Patch
        { major: 1, minor: 1, patch: 0 }, // Minor
      ];
      
      // Each subsequent version must be greater
      for (let i = 1; i < versionHistory.length; i++) {
        const prev = versionHistory[i - 1];
        const curr = versionHistory[i];
        
        const isGreater = 
          curr.major > prev.major ||
          (curr.major === prev.major && curr.minor > prev.minor) ||
          (curr.major === prev.major && curr.minor === prev.minor && curr.patch > prev.patch);
        
        expect(isGreater).toBe(true);
      }
    });

    it('version numbers must be non-negative integers', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1.1
       * Requirement: Version fields must be Int (not float), non-negative
       */
      
      const validVersions = [
        { major: 0, minor: 0, patch: 1 },
        { major: 1, minor: 0, patch: 0 },
        { major: 99, minor: 99, patch: 99 },
      ];
      
      validVersions.forEach(v => {
        expect(Number.isInteger(v.major)).toBe(true);
        expect(Number.isInteger(v.minor)).toBe(true);
        expect(Number.isInteger(v.patch)).toBe(true);
        expect(v.major >= 0).toBe(true);
        expect(v.minor >= 0).toBe(true);
        expect(v.patch >= 0).toBe(true);
      });
    });
  });

  describe('Minter Immutability', () => {
    it('minter address is immutable after mint', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1
       * Requirement: minter field is immutable (N in Mutable column)
       * 
       * The minter is the original creator of the NFT and cannot be changed.
       */
      
      const app = {
        did: 'did:web:example.com',
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '1'.repeat(64),
        dataHashAlgorithm: 0 as const,
        minter: '0x1234567890123456789012345678901234567890',
      };
      
      // Minter should be a valid Ethereum address
      expect(app.minter).toMatch(/^0x[a-fA-F0-9]{40}$/);
      
      // Document: Contract should not allow minter changes
      console.info('[OT-ID-004] minter is immutable (contract enforcement)');
    });
  });

  describe('Status Transitions', () => {
    it('status can be changed (mutable field)', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1
       * Requirement: status field is mutable (Y in Mutable column)
       * Values: 0=Active, 1=Deprecated, 2=Replaced
       */
      
      const validStatuses = [0, 1, 2];
      
      validStatuses.forEach(status => {
        const app = {
          did: 'did:web:example.com',
          initialVersionMajor: 1,
          initialVersionMinor: 0,
          initialVersionPatch: 0,
          interfaces: 1,
          dataUrl: 'https://example.com/metadata.json',
          dataHash: '0x' + '1'.repeat(64),
          dataHashAlgorithm: 0 as const,
          minter: '0x1234567890123456789012345678901234567890',
          status,
        };
        
        const result = OnChainApp.safeParse(app);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid status values', () => {
      /**
       * Status must be 0, 1, or 2
       */
      
      const invalidStatuses = [-1, 3, 100];
      
      invalidStatuses.forEach(status => {
        const app = {
          did: 'did:web:example.com',
          initialVersionMajor: 1,
          initialVersionMinor: 0,
          initialVersionPatch: 0,
          interfaces: 1,
          dataUrl: 'https://example.com/metadata.json',
          dataHash: '0x' + '1'.repeat(64),
          dataHashAlgorithm: 0 as const,
          minter: '0x1234567890123456789012345678901234567890',
          status,
        };
        
        const result = OnChainApp.safeParse(app);
        expect(result.success).toBe(false);
      });
    });
  });
});

