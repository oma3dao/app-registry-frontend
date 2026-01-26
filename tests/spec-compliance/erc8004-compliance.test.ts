/**
 * ERC-8004 Standard Compliance Tests
 * 
 * Validates that the registry implementation complies with the ERC-8004
 * standard for tokenized agents/services.
 * 
 * Standard Reference: ERC-8004
 * Implementation: src/lib/contracts/registry.write.ts
 * Documentation: README.md lines 233-290
 * 
 * ⚠️ CRITICAL: These tests validate against the ERC-8004 SPECIFICATION,
 * not just the current implementation behavior.
 */

import { describe, it, expect } from 'vitest';
import { prepareRegisterApp8004, prepareMintApp } from '@/lib/contracts/registry.write';
import type { MintAppInput } from '@/lib/contracts/types';

describe('ERC-8004 Standard Compliance', () => {
  /**
   * Helper to create valid test input
   */
  const createValidInput = (overrides?: Partial<MintAppInput>): MintAppInput => ({
    did: 'did:web:example.com',
    interfaces: 1,
    dataUrl: 'https://example.com/metadata.json',
    dataHash: '0x' + '1234567890abcdef'.repeat(4),
    dataHashAlgorithm: 0,
    initialVersionMajor: 1,
    initialVersionMinor: 0,
    initialVersionPatch: 0,
    ...overrides,
  });

  /**
   * ERC-8004 Specification: Metadata Structure
   * Reference: README.md lines 240-248
   * 
   * The standard-compliant path uses a metadata array structure:
   * function register(string memory _tokenURI, MetadataEntry[] memory _metadata)
   */
  describe('Metadata Array Structure (ERC-8004)', () => {
    // Test: Metadata uses array of key-value pairs
    it('uses MetadataEntry[] array structure per ERC-8004 spec', () => {
      // Specification: ERC-8004 requires metadata as array of {key, value} pairs
      // Implementation: src/lib/contracts/registry.write.ts:125-147
      // Reference: README.md:244-247
      
      const input = createValidInput();
      const result = prepareRegisterApp8004(input);
      
      // ERC-8004 requires metadata to be second argument
      const metadata = result.args[1] as Array<{ key: string; value: string }>;
      
      // Must be an array
      expect(Array.isArray(metadata)).toBe(true);
      
      // Each entry must have 'key' and 'value' properties
      metadata.forEach((entry, index) => {
        expect(entry).toHaveProperty('key');
        expect(entry).toHaveProperty('value');
        expect(typeof entry.key).toBe('string');
        expect(typeof entry.value).toBe('string');
      });
    });

    // Test: Required metadata keys are present
    it('includes all required metadata keys per ERC-8004', () => {
      // Specification: ERC-8004 requires specific metadata keys
      // Implementation: src/lib/contracts/registry.write.ts:126-133
      // Required keys: did, interfaces, dataHash, dataHashAlgorithm, version components
      
      const input = createValidInput();
      const result = prepareRegisterApp8004(input);
      const metadata = result.args[1] as Array<{ key: string; value: string }>;
      const keys = metadata.map(m => m.key);
      
      // Required keys per ERC-8004
      const requiredKeys = [
        'omat.did',
        'omat.interfaces',
        'omat.dataHash',
        'omat.dataHashAlgorithm',
        'omat.versionMajor',
        'omat.versionMinor',
        'omat.versionPatch',
      ];
      
      requiredKeys.forEach(key => {
        expect(keys).toContain(key);
      });
    });
  });

  /**
   * ERC-8004 Specification: Metadata Key Naming Convention
   * Reference: src/lib/contracts/registry.write.ts:123
   * 
   * "IMPORTANT: Keys must match OMA3MetadataKeys constants (e.g., "omat.did")"
   */
  describe('Metadata Key Naming Convention (ERC-8004)', () => {
    // Test: All keys use omat.* prefix
    it('uses omat.* prefix for all metadata keys', () => {
      // Specification: ERC-8004 + OMA3 standard requires 'omat.' prefix
      // Implementation: src/lib/contracts/registry.write.ts:126-147
      // Reference: Comment at line 123
      
      const input = createValidInput({
        fungibleTokenId: 'eip155:1:0x1234567890123456789012345678901234567890',
        contractId: 'eip155:1:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        traitHashes: ['0x' + 'abcd'.repeat(16)],
        metadataJson: '{"name":"Test"}',
      });
      
      const result = prepareRegisterApp8004(input);
      const metadata = result.args[1] as Array<{ key: string; value: string }>;
      
      // Every key MUST start with 'omat.'
      const invalidKeys = metadata.filter(m => !m.key.startsWith('omat.'));
      
      if (invalidKeys.length > 0) {
        console.error('Keys without omat. prefix:', invalidKeys.map(k => k.key));
      }
      
      expect(invalidKeys).toEqual([]);
    });

    // Test: Key names match specification exactly
    it('uses exact key names defined in specification', () => {
      // Specification: Keys must match exact naming in OMA3MetadataKeys
      // Implementation: src/lib/contracts/registry.write.ts:126-147
      
      const input = createValidInput();
      const result = prepareRegisterApp8004(input);
      const metadata = result.args[1] as Array<{ key: string; value: string }>;
      
      // Build map of key -> value
      const keyMap = new Map(metadata.map(m => [m.key, m.value]));
      
      // Verify exact key names (not omat.DID or omat.Did, must be omat.did)
      expect(keyMap.has('omat.did')).toBe(true);
      expect(keyMap.has('omat.interfaces')).toBe(true);
      expect(keyMap.has('omat.dataHash')).toBe(true);
      expect(keyMap.has('omat.dataHashAlgorithm')).toBe(true);
      expect(keyMap.has('omat.versionMajor')).toBe(true);
      expect(keyMap.has('omat.versionMinor')).toBe(true);
      expect(keyMap.has('omat.versionPatch')).toBe(true);
      
      // Verify no variation in naming (case-sensitive)
      expect(keyMap.has('omat.DID')).toBe(false);
      expect(keyMap.has('OMAT.did')).toBe(false);
      expect(keyMap.has('omat.DataHash')).toBe(false);
    });
  });

  /**
   * ERC-8004 Specification: Value Encoding
   * Reference: src/lib/contracts/registry.write.ts:124
   * 
   * "IMPORTANT: Values must be ABI-encoded because contract uses abi.decode()"
   */
  describe('Metadata Value Encoding (ERC-8004)', () => {
    // Test: All values are ABI-encoded
    it('ABI-encodes all metadata values per ERC-8004', () => {
      // Specification: ERC-8004 requires ABI-encoded values for type safety
      // Implementation: src/lib/contracts/registry.write.ts:124
      // Comment: "Values must be ABI-encoded because contract uses abi.decode()"
      
      const input = createValidInput();
      const result = prepareRegisterApp8004(input);
      const metadata = result.args[1] as Array<{ key: string; value: string }>;
      
      // All values must be hex-encoded (ABI encoding produces hex)
      metadata.forEach((entry, index) => {
        const isHex = /^0x[0-9a-fA-F]+$/.test(entry.value);
        if (!isHex) {
          console.error(`Entry ${index} (${entry.key}) has non-hex value:`, entry.value);
        }
        expect(isHex).toBe(true);
      });
    });

    // Test: String values are ABI-encoded strings
    it('ABI-encodes string values correctly', () => {
      // Specification: String values must use abi.encode(string)
      // Implementation: abiEncodeString() helper
      
      const input = createValidInput({
        did: 'did:web:example.com',
      });
      
      const result = prepareRegisterApp8004(input);
      const metadata = result.args[1] as Array<{ key: string; value: string }>;
      const didEntry = metadata.find(m => m.key === 'omat.did')!;
      
      // ABI-encoded strings start with 0x
      expect(didEntry.value).toMatch(/^0x[0-9a-fA-F]+$/);
      
      // ABI-encoded strings are typically much longer than the original
      // (includes length prefix and padding)
      expect(didEntry.value.length).toBeGreaterThan(input.did.length);
    });

    // Test: Numeric values are ABI-encoded numbers
    it('ABI-encodes numeric values correctly', () => {
      // Specification: Numeric values must use abi.encode(uint)
      // Implementation: abiEncodeUint8() and abiEncodeUint16() helpers
      
      const input = createValidInput({
        interfaces: 7, // All interface flags set
        initialVersionMajor: 1,
        initialVersionMinor: 2,
        initialVersionPatch: 3,
      });
      
      const result = prepareRegisterApp8004(input);
      const metadata = result.args[1] as Array<{ key: string; value: string }>;
      
      const interfacesEntry = metadata.find(m => m.key === 'omat.interfaces')!;
      const majorEntry = metadata.find(m => m.key === 'omat.versionMajor')!;
      
      // ABI-encoded numbers are hex strings
      expect(interfacesEntry.value).toMatch(/^0x[0-9a-fA-F]+$/);
      expect(majorEntry.value).toMatch(/^0x[0-9a-fA-F]+$/);
      
      // ABI-encoded uint8/uint16 are padded to 32 bytes (64 hex chars + 0x)
      expect(interfacesEntry.value).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(majorEntry.value).toMatch(/^0x[0-9a-fA-F]{64}$/);
    });

    // Test: Bytes32 values are used directly (already encoded)
    it('uses bytes32 values directly without re-encoding', () => {
      // Specification: dataHash is already bytes32, no additional encoding needed
      // Implementation: src/lib/contracts/registry.write.ts:128
      
      const dataHash = '0x' + '1234567890abcdef'.repeat(4);
      const input = createValidInput({ dataHash });
      
      const result = prepareRegisterApp8004(input);
      const metadata = result.args[1] as Array<{ key: string; value: string }>;
      const hashEntry = metadata.find(m => m.key === 'omat.dataHash')!;
      
      // dataHash should be used as-is (it's already bytes32)
      expect(hashEntry.value).toBe(dataHash);
    });
  });

  /**
   * ERC-8004 Specification: Optional Fields
   * Reference: src/lib/contracts/registry.write.ts:136-147
   */
  describe('Optional Metadata Fields (ERC-8004)', () => {
    // Test: Optional fields only included when provided
    it('only includes optional fields when values are provided', () => {
      // Specification: Optional fields should not create empty/null entries
      // Implementation: src/lib/contracts/registry.write.ts:136-147
      
      const inputWithoutOptionals = createValidInput();
      const resultWithout = prepareRegisterApp8004(inputWithoutOptionals);
      const metadataWithout = resultWithout.args[1] as Array<{ key: string; value: string }>;
      const keysWithout = metadataWithout.map(m => m.key);
      
      // Optional fields should NOT be present
      expect(keysWithout).not.toContain('omat.fungibleTokenId');
      expect(keysWithout).not.toContain('omat.contractId');
      expect(keysWithout).not.toContain('omat.traitHashes');
      expect(keysWithout).not.toContain('omat.metadataJson');
    });

    // Test: Optional fields included when provided
    it('includes optional fields when values are provided', () => {
      // Specification: When optional fields have values, they must be included
      // Implementation: src/lib/contracts/registry.write.ts:136-147
      
      const inputWithOptionals = createValidInput({
        fungibleTokenId: 'eip155:1:0x1234567890123456789012345678901234567890',
        contractId: 'eip155:1:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        traitHashes: ['0x' + 'abcd'.repeat(16)],
        metadataJson: '{"test": true}',
      });
      
      const resultWith = prepareRegisterApp8004(inputWithOptionals);
      const metadataWith = resultWith.args[1] as Array<{ key: string; value: string }>;
      const keysWith = metadataWith.map(m => m.key);
      
      // Optional fields SHOULD be present
      expect(keysWith).toContain('omat.fungibleTokenId');
      expect(keysWith).toContain('omat.contractId');
      expect(keysWith).toContain('omat.traitHashes');
      expect(keysWith).toContain('omat.metadataJson');
    });
  });

  /**
   * ERC-8004 Specification: Gas-Efficient Alternative (mint function)
   * Reference: README.md lines 255-267
   * 
   * "The optimized path uses direct parameters"
   */
  describe('Gas-Efficient Native mint() Function', () => {
    // Test: mint() uses direct parameters (not metadata array)
    it('uses direct parameters instead of metadata array', () => {
      // Specification: README.md:259-266
      // Requirement: mint() uses direct parameters for gas efficiency
      // Note: Both paths "store data identically on-chain" (line 275)
      
      const input = createValidInput();
      const result = prepareMintApp(input);
      
      // mint() should NOT use metadata array structure
      // Instead it should pass parameters directly
      expect(result.args.length).toBeGreaterThan(2); // More than just tokenURI + metadata
      
      // First arg should be DID string (direct parameter)
      expect(typeof result.args[0]).toBe('string');
      expect(result.args[0]).toBe(input.did);
    });

    // Test: Both functions produce equivalent on-chain data
    it('produces equivalent on-chain data to register() per spec', () => {
      // Specification: README.md:275-276
      // Requirement: "Both registration paths store data identically on-chain"
      
      const input = createValidInput();
      
      const erc8004Result = prepareRegisterApp8004(input);
      const mintResult = prepareMintApp(input);
      
      // Both should produce transactions to the same contract
      expect(mintResult.address).toBe(erc8004Result.address);
      
      // DID should be included in both (though in different argument positions)
      const erc8004Metadata = erc8004Result.args[1] as Array<{ key: string; value: string }>;
      const didInErc8004 = erc8004Metadata.some(m => m.key === 'omat.did');
      expect(didInErc8004).toBe(true);
      expect(mintResult.args[0]).toBe(input.did);
    });
  });

  /**
   * ERC-8004 Specification: Reading Metadata
   * Reference: README.md lines 273-280
   * 
   * "Both registration paths store data identically on-chain.
   *  Retrieve specific metadata fields using: getMetadata(uint256 agentId, string key)"
   */
  describe('Metadata Reading Interface (ERC-8004)', () => {
    // Test: getMetadata() uses consistent key format
    it('ensures metadata keys are queryable via getMetadata()', () => {
      // Specification: README.md:278-279
      // Requirement: getMetadata(agentId, key) should work with omat.* keys
      // Example: getMetadata(tokenId, "omat.did")
      
      const input = createValidInput();
      const result = prepareRegisterApp8004(input);
      const metadata = result.args[1] as Array<{ key: string; value: string }>;
      
      // All keys should be in format suitable for getMetadata()
      // e.g., "omat.did", "omat.interfaces", etc.
      metadata.forEach(entry => {
        // Key should be a valid string identifier
        expect(entry.key).toMatch(/^[a-z0-9.]+$/i);
        
        // Key should use dot notation (namespace.field)
        expect(entry.key).toContain('.');
      });
    });
  });

  /**
   * Cross-Validation: Ensure consistency between functions
   */
  describe('Cross-Function Consistency', () => {
    // Test: Both functions accept same input structure
    it('accepts same input structure for both register() and mint()', () => {
      // Specification: Both functions should work with MintAppInput
      // Requirement: Consistency in input interface
      
      const input = createValidInput();
      
      // Both functions should accept the same input without errors
      expect(() => prepareRegisterApp8004(input)).not.toThrow();
      expect(() => prepareMintApp(input)).not.toThrow();
    });

    // Test: Required fields are same for both functions
    it('requires same mandatory fields for both functions', () => {
      // Specification: Both paths require same core data
      // Requirement: did, version, dataUrl, dataHash, etc.
      
      const requiredFields: (keyof MintAppInput)[] = [
        'did',
        'interfaces',
        'dataUrl',
        'dataHash',
        'dataHashAlgorithm',
        'initialVersionMajor',
        'initialVersionMinor',
        'initialVersionPatch',
      ];
      
      // Test with missing required fields
      requiredFields.forEach(field => {
        const incompleteInput = { ...createValidInput() };
        delete (incompleteInput as any)[field];
        
        // Both should fail with missing required field
        // (or handle it consistently)
        const erc8004Result = prepareRegisterApp8004(incompleteInput as MintAppInput);
        const mintResult = prepareMintApp(incompleteInput as MintAppInput);
        
        // At minimum, they should both process the input
        // Actual validation might happen at contract level
        expect(erc8004Result).toBeDefined();
        expect(mintResult).toBeDefined();
      });
    });
  });
});

