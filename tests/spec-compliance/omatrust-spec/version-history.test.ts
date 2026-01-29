/**
 * OMATrust Specification Compliance: Version History Format
 * 
 * Tests implementation compliance with OMATrust Identity Specification
 * Section 5.1.1.1 - versionHistory Format Requirements.
 * 
 * SPECIFICATION REFERENCES:
 * - OMATrust Identity Specification: omatrust-specification-identity.pdf
 * - Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 * - Section: 5.1.1.1 - JSON Format: versionHistory
 * 
 * This test file validates EXTERNAL SPECIFICATIONS, not internal implementation.
 * 
 * SECTION 5.1.1.1: versionHistory Format
 * 
 * versionHistory objects MUST have the following fields:
 * | Field   | Format | Required |
 * |---------|--------|----------|
 * | major   | Int    | Y        |
 * | minor   | Int    | Y        |
 * | patch   | Int    | Y        |
 */

import { describe, it, expect } from 'vitest';
import { prepareMintApp, prepareUpdateApp } from '@/lib/contracts/registry.write';
import { OnChainApp } from '@/schema/data-model';

describe('OMATrust Identity Spec 5.1.1.1: versionHistory Format', () => {
  /**
   * Specification: OMATrust Identity Specification
   * Section: 5.1.1.1 - JSON Format: versionHistory
   * 
   * Tests validate that version fields are properly structured per specification.
   */

  describe('Required Version Fields (OT-ID-014 through OT-ID-016)', () => {
    it('includes major version field as Int (Required=Y) - OT-ID-014', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1.1
       * Requirement ID: OT-ID-014
       * Requirement: "versionHistory objects MUST include `major` field (Int)"
       * Field: major | Format: Int | Required: Y
       */

      const mintInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '1234567890abcdef'.repeat(4),
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: 2,  // Test non-zero major version
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };

      const result = prepareMintApp(mintInput);

      // Major version must be present in contract call
      expect(result.args).toContain(2);
      expect(typeof mintInput.initialVersionMajor).toBe('number');
      expect(Number.isInteger(mintInput.initialVersionMajor)).toBe(true);
    });

    it('includes minor version field as Int (Required=Y) - OT-ID-015', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1.1
       * Requirement ID: OT-ID-015
       * Requirement: "versionHistory objects MUST include `minor` field (Int)"
       * Field: minor | Format: Int | Required: Y
       */

      const mintInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '1234567890abcdef'.repeat(4),
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: 1,
        initialVersionMinor: 5,  // Test non-zero minor version
        initialVersionPatch: 0,
      };

      const result = prepareMintApp(mintInput);

      // Minor version must be present in contract call
      expect(result.args).toContain(5);
      expect(typeof mintInput.initialVersionMinor).toBe('number');
      expect(Number.isInteger(mintInput.initialVersionMinor)).toBe(true);
    });

    it('includes patch version field as Int (Required=Y) - OT-ID-016', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1.1
       * Requirement ID: OT-ID-016
       * Requirement: "versionHistory objects MUST include `patch` field (Int)"
       * Field: patch | Format: Int | Required: Y
       */

      const mintInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '1234567890abcdef'.repeat(4),
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 3,  // Test non-zero patch version
      };

      const result = prepareMintApp(mintInput);

      // Patch version must be present in contract call
      expect(result.args).toContain(3);
      expect(typeof mintInput.initialVersionPatch).toBe('number');
      expect(Number.isInteger(mintInput.initialVersionPatch)).toBe(true);
    });
  });

  describe('Semantic Versioning Compliance', () => {
    it('accepts standard semantic version format (major.minor.patch)', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1.1
       * Requirement: Version fields follow semantic versioning (semver.org)
       * 
       * Semantic version format: MAJOR.MINOR.PATCH
       * - MAJOR: Incompatible API changes
       * - MINOR: Backwards-compatible functionality
       * - PATCH: Backwards-compatible bug fixes
       */

      const versions = [
        { major: 0, minor: 1, patch: 0 },   // Pre-release
        { major: 1, minor: 0, patch: 0 },   // Initial release
        { major: 1, minor: 2, patch: 3 },   // Standard version
        { major: 2, minor: 0, patch: 0 },   // Major bump
        { major: 10, minor: 20, patch: 30 }, // Multi-digit
      ];

      versions.forEach(({ major, minor, patch }) => {
        const mintInput = {
          did: 'did:web:example.com',
          interfaces: 1,
          dataUrl: 'https://example.com/metadata.json',
          dataHash: '0x' + '0'.repeat(64),
          dataHashAlgorithm: 0 as const,
          initialVersionMajor: major,
          initialVersionMinor: minor,
          initialVersionPatch: patch,
        };

        const result = prepareMintApp(mintInput);
        expect(result).toBeDefined();
        expect(result.args).toContain(major);
        expect(result.args).toContain(minor);
        expect(result.args).toContain(patch);
      });
    });

    it('accepts version 0.x.x for pre-release software', () => {
      /**
       * Specification: Semantic Versioning 2.0.0 (semver.org)
       * Requirement: "Major version zero (0.y.z) is for initial development"
       * 
       * This is commonly used for early-stage software.
       */

      const preReleaseVersions = [
        { major: 0, minor: 0, patch: 1 },
        { major: 0, minor: 1, patch: 0 },
        { major: 0, minor: 9, patch: 9 },
      ];

      preReleaseVersions.forEach(({ major, minor, patch }) => {
        const mintInput = {
          did: 'did:web:prerelease.example.com',
          interfaces: 1,
          dataUrl: 'https://example.com/metadata.json',
          dataHash: '0x' + '0'.repeat(64),
          dataHashAlgorithm: 0 as const,
          initialVersionMajor: major,
          initialVersionMinor: minor,
          initialVersionPatch: patch,
        };

        expect(() => prepareMintApp(mintInput)).not.toThrow();
      });
    });

    it('rejects negative version numbers', () => {
      /**
       * Specification: Semantic Versioning 2.0.0 (semver.org)
       * Requirement: Version numbers MUST be non-negative integers
       * 
       * Implementation: src/schema/data-model.ts uses z.number().int().min(0)
       */

      // Test that the schema enforces non-negative versions
      // This test validates the schema, not the contract call

      const invalidVersions = [
        { major: -1, minor: 0, patch: 0 },
        { major: 0, minor: -1, patch: 0 },
        { major: 0, minor: 0, patch: -1 },
      ];

      invalidVersions.forEach(({ major, minor, patch }) => {
        const result = OnChainApp.safeParse({
          did: 'did:web:example.com',
          initialVersionMajor: major,
          initialVersionMinor: minor,
          initialVersionPatch: patch,
          interfaces: 1,
          dataUrl: 'https://example.com/metadata.json',
          dataHash: '0x' + '0'.repeat(64),
          dataHashAlgorithm: 0,
          minter: '0x1234567890123456789012345678901234567890',
        });

        // At least one version should fail validation
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Version Update Behavior (Append-Only)', () => {
    it('supports version increments via update function', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement: "versionHistory | Mutable: Y (append only)"
       * 
       * Updates should add new version entries, not modify existing ones.
       */

      const updateInput = {
        did: 'did:web:example.com',
        major: 1,                    // Current major version
        newDataHash: '0x' + 'abcd'.repeat(16),
        newDataHashAlgorithm: 0,
        newInterfaces: 0,            // 0 = no change
        newTraitHashes: [],
        newMinor: 1,                 // Increment minor
        newPatch: 0,                 // Reset patch
      };

      const result = prepareUpdateApp(updateInput);
      expect(result).toBeDefined();
      // New minor/patch should be in the call
      expect(result.args).toContain(1);  // newMinor
      expect(result.args).toContain(0);  // newPatch
    });

    it('includes major version reference for updates', () => {
      /**
       * Specification: OMATrust Identity Specification
       * Note: Updates reference the major version, not tokenId
       * 
       * Contract uses DID + major version to identify which app entry to update.
       */

      const updateInput = {
        did: 'did:web:example.com',
        major: 2,                    // Updating major version 2
        newDataHash: '0x' + 'ffff'.repeat(16),
        newDataHashAlgorithm: 0,
        newInterfaces: 0,
        newTraitHashes: [],
        newMinor: 0,
        newPatch: 1,
      };

      const result = prepareUpdateApp(updateInput);
      expect(result.args).toContain(2);  // major version reference
    });
  });

  describe('Version Field Integer Constraints', () => {
    it('accepts version fields as uint8 (0-255 range)', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1.1
       * Implementation Note: Contract uses uint8 for version fields
       * 
       * uint8 range: 0 to 255
       */

      const uint8Max = 255;
      
      const mintInput = {
        did: 'did:web:maxversion.example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: uint8Max,
        initialVersionMinor: uint8Max,
        initialVersionPatch: uint8Max,
      };

      // Should not throw for valid uint8 values
      expect(() => prepareMintApp(mintInput)).not.toThrow();
    });

    it('enforces version fields are integers (not floats)', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1.1
       * Requirement: Version fields must be Int (not float)
       */

      const floatVersions = [
        { major: 1.5, minor: 0, patch: 0 },
        { major: 1, minor: 2.5, patch: 0 },
        { major: 1, minor: 0, patch: 3.5 },
      ];

      floatVersions.forEach(({ major, minor, patch }) => {
        const result = OnChainApp.safeParse({
          did: 'did:web:example.com',
          initialVersionMajor: major,
          initialVersionMinor: minor,
          initialVersionPatch: patch,
          interfaces: 1,
          dataUrl: 'https://example.com/metadata.json',
          dataHash: '0x' + '0'.repeat(64),
          dataHashAlgorithm: 0,
          minter: '0x1234567890123456789012345678901234567890',
        });

        // Float versions should fail validation
        expect(result.success).toBe(false);
      });
    });
  });
});

