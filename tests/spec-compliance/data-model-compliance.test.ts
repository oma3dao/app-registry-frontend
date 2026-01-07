/**
 * Data Model Specification Compliance Tests
 * 
 * Validates that data structures and transformations comply with the 
 * Data Model Specification defined in src/schema/data-model.ts
 * 
 * ⚠️ CRITICAL: These tests validate against SPECIFICATIONS, not implementation.
 * Each test must cite the specific specification requirement it validates.
 */

import { describe, it, expect } from 'vitest';
import { 
  OnChainApp, 
  OffChainMetadata, 
  DomainForm,
  EndpointConfig,
  type TOnChainApp,
  type TOffChainMetadata 
} from '@/schema/data-model';
import { buildOffchainMetadataObject } from '@/lib/utils/offchain-json';

describe('Data Model Specification Compliance', () => {
  /**
   * Tests for OnChainApp schema (src/schema/data-model.ts:22-36)
   * Validates on-chain data structure requirements
   */
  describe('OnChainApp Schema (data-model.ts:22-36)', () => {
    // Test: DID field validation
    it('enforces DID must be non-empty string (line 23)', () => {
      // Specification: src/schema/data-model.ts:23
      // Requirement: did: z.string().min(1, "DID is required")
      
      const validDid = 'did:web:example.com';
      const emptyDid = '';
      
      expect(OnChainApp.shape.did.safeParse(validDid).success).toBe(true);
      
      const emptyResult = OnChainApp.shape.did.safeParse(emptyDid);
      expect(emptyResult.success).toBe(false);
      if (!emptyResult.success) {
        expect(emptyResult.error.issues[0].message).toContain('DID is required');
      }
    });

    // Test: Version fields must be non-negative integers
    it('enforces version fields must be non-negative integers (lines 24-26)', () => {
      // Specification: src/schema/data-model.ts:24-26
      // Requirements:
      // - initialVersionMajor: z.number().int().min(0)
      // - initialVersionMinor: z.number().int().min(0)
      // - initialVersionPatch: z.number().int().min(0)
      
      // Valid values
      expect(OnChainApp.shape.initialVersionMajor.safeParse(0).success).toBe(true);
      expect(OnChainApp.shape.initialVersionMajor.safeParse(1).success).toBe(true);
      expect(OnChainApp.shape.initialVersionMinor.safeParse(0).success).toBe(true);
      expect(OnChainApp.shape.initialVersionPatch.safeParse(0).success).toBe(true);
      
      // Invalid: negative numbers
      expect(OnChainApp.shape.initialVersionMajor.safeParse(-1).success).toBe(false);
      expect(OnChainApp.shape.initialVersionMinor.safeParse(-1).success).toBe(false);
      expect(OnChainApp.shape.initialVersionPatch.safeParse(-1).success).toBe(false);
      
      // Invalid: floats
      expect(OnChainApp.shape.initialVersionMajor.safeParse(1.5).success).toBe(false);
      
      // Invalid: strings
      expect(OnChainApp.shape.initialVersionMajor.safeParse('1' as any).success).toBe(false);
    });

    // Test: Interfaces must be non-negative integer
    it('enforces interfaces must be non-negative integer (line 27)', () => {
      // Specification: src/schema/data-model.ts:27
      // Requirement: interfaces: z.number().int().nonnegative()
      
      expect(OnChainApp.shape.interfaces.safeParse(0).success).toBe(true);
      expect(OnChainApp.shape.interfaces.safeParse(7).success).toBe(true); // All flags set
      expect(OnChainApp.shape.interfaces.safeParse(-1).success).toBe(false);
      expect(OnChainApp.shape.interfaces.safeParse(1.5).success).toBe(false);
    });

    // Test: dataUrl must be valid URL
    it('enforces dataUrl must be valid URL (line 28)', () => {
      // Specification: src/schema/data-model.ts:28
      // Requirement: dataUrl: z.string().url()
      
      const validUrls = [
        'https://example.com/metadata.json',
        'http://localhost:3000/api/data-url/did:web:example.com',
      ];
      
      const invalidUrls = [
        'not-a-url',
        '/relative/path',
        'ftp://example.com', // Invalid protocol (typically)
        '',
      ];
      
      validUrls.forEach(url => {
        expect(OnChainApp.shape.dataUrl.safeParse(url).success).toBe(true);
      });
      
      invalidUrls.forEach(url => {
        expect(OnChainApp.shape.dataUrl.safeParse(url).success).toBe(false);
      });
    });

    // Test: dataHash must be 32-byte hex string
    it('enforces dataHash must be 32-byte hex string with 0x prefix (line 29)', () => {
      // Specification: src/schema/data-model.ts:29
      // Requirement: dataHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/)
      
      const validHash = '0x' + '1234567890abcdef'.repeat(4); // 64 hex chars
      const invalidHashes = [
        '0x123', // Too short
        '1234567890abcdef'.repeat(4), // Missing 0x prefix
        '0x' + 'xyz' + '0'.repeat(61), // Invalid hex chars
        '0x' + '0'.repeat(63), // Too short
        '0x' + '0'.repeat(65), // Too long
      ];
      
      expect(OnChainApp.shape.dataHash.safeParse(validHash).success).toBe(true);
      
      invalidHashes.forEach(hash => {
        expect(OnChainApp.shape.dataHash.safeParse(hash).success).toBe(false);
      });
    });

    // Test: dataHashAlgorithm must be 0 or 1
    it('enforces dataHashAlgorithm must be 0 (keccak256) or 1 (sha256) (line 30)', () => {
      // Specification: src/schema/data-model.ts:30
      // Requirement: dataHashAlgorithm: z.literal(0).or(z.literal(1))
      
      expect(OnChainApp.shape.dataHashAlgorithm.safeParse(0).success).toBe(true);
      expect(OnChainApp.shape.dataHashAlgorithm.safeParse(1).success).toBe(true);
      
      // Invalid values
      expect(OnChainApp.shape.dataHashAlgorithm.safeParse(2).success).toBe(false);
      expect(OnChainApp.shape.dataHashAlgorithm.safeParse(-1).success).toBe(false);
      expect(OnChainApp.shape.dataHashAlgorithm.safeParse('0' as any).success).toBe(false);
    });

    // Test: traitHashes array validation
    it('enforces traitHashes must be array of 32-byte hashes, max 20 items (line 33)', () => {
      // Specification: src/schema/data-model.ts:33
      // Requirement: traitHashes: z.array(z.string().regex(/^0x[0-9a-fA-F]{64}$/)).max(20)
      
      const validHash = '0x' + '1234567890abcdef'.repeat(4);
      
      // Valid: empty array
      expect(OnChainApp.shape.traitHashes.safeParse([]).success).toBe(true);
      
      // Valid: array with valid hashes
      expect(OnChainApp.shape.traitHashes.safeParse([validHash]).success).toBe(true);
      expect(OnChainApp.shape.traitHashes.safeParse([validHash, validHash]).success).toBe(true);
      
      // Valid: exactly 20 hashes (boundary)
      const maxHashes = Array(20).fill(validHash);
      expect(OnChainApp.shape.traitHashes.safeParse(maxHashes).success).toBe(true);
      
      // Invalid: more than 20 hashes
      const tooManyHashes = Array(21).fill(validHash);
      expect(OnChainApp.shape.traitHashes.safeParse(tooManyHashes).success).toBe(false);
      
      // Invalid: array with invalid hash
      expect(OnChainApp.shape.traitHashes.safeParse(['invalid']).success).toBe(false);
    });

    // Test: status field validation
    it('enforces status must be 0, 1, or 2 with default 0 (line 35)', () => {
      // Specification: src/schema/data-model.ts:35
      // Requirement: status: z.number().int().min(0).max(2).default(0)
      // Values: 0=Active, 1=Deprecated, 2=Malicious
      
      expect(OnChainApp.shape.status.safeParse(0).success).toBe(true);
      expect(OnChainApp.shape.status.safeParse(1).success).toBe(true);
      expect(OnChainApp.shape.status.safeParse(2).success).toBe(true);
      
      // Invalid values
      expect(OnChainApp.shape.status.safeParse(-1).success).toBe(false);
      expect(OnChainApp.shape.status.safeParse(3).success).toBe(false);
      expect(OnChainApp.shape.status.safeParse(1.5).success).toBe(false);
    });
  });

  /**
   * Tests for OffChainMetadata schema (src/schema/data-model.ts:69-99)
   * Validates off-chain metadata requirements
   */
  describe('OffChainMetadata Schema (data-model.ts:69-99)', () => {
    // Test: Core identity field - name
    it('enforces name: min 2 chars, max 80 chars (line 71)', () => {
      // Specification: src/schema/data-model.ts:71
      // Requirement: name: z.string().min(2).max(80)
      
      // Valid cases
      expect(OffChainMetadata.shape.name.safeParse('AB').success).toBe(true); // Min boundary
      expect(OffChainMetadata.shape.name.safeParse('Test App').success).toBe(true);
      expect(OffChainMetadata.shape.name.safeParse('A'.repeat(80)).success).toBe(true); // Max boundary
      
      // Invalid cases
      expect(OffChainMetadata.shape.name.safeParse('A').success).toBe(false); // Too short
      expect(OffChainMetadata.shape.name.safeParse('A'.repeat(81)).success).toBe(false); // Too long
      expect(OffChainMetadata.shape.name.safeParse('').success).toBe(false); // Empty
    });

    // Test: Core identity field - description
    it('enforces description: minimum 10 characters (line 72)', () => {
      // Specification: src/schema/data-model.ts:72
      // Requirement: description: z.string().min(10)
      
      // Valid cases
      expect(OffChainMetadata.shape.description.safeParse('A'.repeat(10)).success).toBe(true); // Min boundary
      expect(OffChainMetadata.shape.description.safeParse('This is a test application').success).toBe(true);
      
      // Invalid cases
      expect(OffChainMetadata.shape.description.safeParse('A'.repeat(9)).success).toBe(false); // Too short
      expect(OffChainMetadata.shape.description.safeParse('').success).toBe(false); // Empty
      expect(OffChainMetadata.shape.description.safeParse('Short').success).toBe(false);
    });

    // Test: Core identity field - publisher
    it('enforces publisher: minimum 1 character (line 73)', () => {
      // Specification: src/schema/data-model.ts:73
      // Requirement: publisher: z.string().min(1)
      
      expect(OffChainMetadata.shape.publisher.safeParse('A').success).toBe(true);
      expect(OffChainMetadata.shape.publisher.safeParse('Acme Corp').success).toBe(true);
      expect(OffChainMetadata.shape.publisher.safeParse('').success).toBe(false);
    });

    // Test: URL field - image (required)
    it('enforces image must be valid URL (line 76)', () => {
      // Specification: src/schema/data-model.ts:76
      // Requirement: image: z.string().url()
      
      const validUrls = [
        'https://example.com/image.png',
        'http://cdn.example.com/path/to/image.jpg',
      ];
      
      const invalidUrls = [
        'not-a-url',
        '/relative/path.png',
        'example.com/image.png', // Missing protocol
        '',
      ];
      
      validUrls.forEach(url => {
        expect(OffChainMetadata.shape.image.safeParse(url).success).toBe(true);
      });
      
      invalidUrls.forEach(url => {
        expect(OffChainMetadata.shape.image.safeParse(url).success).toBe(false);
      });
    });

    // Test: URL field - external_url (optional)
    it('enforces external_url must be valid URL or undefined (line 77)', () => {
      // Specification: src/schema/data-model.ts:77
      // Requirement: external_url: z.string().url().optional()
      
      expect(OffChainMetadata.shape.external_url.safeParse('https://example.com').success).toBe(true);
      expect(OffChainMetadata.shape.external_url.safeParse(undefined).success).toBe(true);
      expect(OffChainMetadata.shape.external_url.safeParse('not-a-url').success).toBe(false);
    });

    // Test: Media arrays
    it('enforces screenshotUrls must be array of valid URLs (line 83)', () => {
      // Specification: src/schema/data-model.ts:83
      // Requirement: screenshotUrls: z.array(z.string().url()).default([])
      
      const validUrls = [
        'https://example.com/screenshot1.png',
        'https://example.com/screenshot2.png',
      ];
      
      expect(OffChainMetadata.shape.screenshotUrls.safeParse([]).success).toBe(true); // Empty OK
      expect(OffChainMetadata.shape.screenshotUrls.safeParse(validUrls).success).toBe(true);
      expect(OffChainMetadata.shape.screenshotUrls.safeParse(['not-a-url']).success).toBe(false);
      expect(OffChainMetadata.shape.screenshotUrls.safeParse([validUrls[0], 'invalid']).success).toBe(false);
    });

    // Test: Traits array max length
    it('enforces traits array maximum 20 items (line 98)', () => {
      // Specification: src/schema/data-model.ts:98
      // Requirement: traits: z.array(z.string()).max(20).default([])
      
      const validTraits = Array(20).fill('trait'); // Max boundary
      const tooManyTraits = Array(21).fill('trait');
      
      expect(OffChainMetadata.shape.traits.safeParse([]).success).toBe(true);
      expect(OffChainMetadata.shape.traits.safeParse(['trait1', 'trait2']).success).toBe(true);
      expect(OffChainMetadata.shape.traits.safeParse(validTraits).success).toBe(true);
      expect(OffChainMetadata.shape.traits.safeParse(tooManyTraits).success).toBe(false);
    });

    // Test: Strict mode - no extra fields
    it('rejects extra fields due to strict() mode (line 99)', () => {
      // Specification: src/schema/data-model.ts:99
      // Requirement: .strict() - No additional properties allowed
      
      const validMetadata = {
        name: 'Test App',
        description: 'A test application for validation',
        publisher: 'Test Publisher',
        image: 'https://example.com/image.png',
        traits: [],
        screenshotUrls: [],
        videoUrls: [],
        threeDAssetUrls: [],
      };
      
      expect(OffChainMetadata.safeParse(validMetadata).success).toBe(true);
      
      const metadataWithExtra = {
        ...validMetadata,
        extraField: 'should be rejected',
      };
      
      expect(OffChainMetadata.safeParse(metadataWithExtra).success).toBe(false);
    });
  });

  /**
   * Tests for EndpointConfig schema (src/schema/data-model.ts:45-60)
   * Validates API endpoint configuration requirements
   */
  describe('EndpointConfig Schema (data-model.ts:45-60)', () => {
    // Test: Endpoint name requirement
    it('enforces name must be non-empty string (line 46)', () => {
      // Specification: src/schema/data-model.ts:46
      // Requirement: name: z.string().min(1)
      
      expect(EndpointConfig.shape.name.safeParse('REST API').success).toBe(true);
      expect(EndpointConfig.shape.name.safeParse('MCP').success).toBe(true);
      expect(EndpointConfig.shape.name.safeParse('').success).toBe(false);
    });

    // Test: Endpoint URL validation
    it('enforces url must be valid URL (line 47)', () => {
      // Specification: src/schema/data-model.ts:47
      // Requirement: url: z.string().url()
      
      expect(EndpointConfig.shape.url.safeParse('https://api.example.com').success).toBe(true);
      expect(EndpointConfig.shape.url.safeParse('not-a-url').success).toBe(false);
    });

    // Test: Type field requirement
    it('enforces type must be openapi, graphql, jsonrpc, mcp, or a2a (line 48)', () => {
      // Specification: src/schema/data-model.ts:48
      // Requirement: type: z.enum(["openapi", "graphql", "jsonrpc", "mcp", "a2a"])
      
      const validTypes = ['openapi', 'graphql', 'jsonrpc', 'mcp', 'a2a'];
      const invalidTypes = ['rest', 'soap', 'grpc', ''];
      
      validTypes.forEach(type => {
        expect(EndpointConfig.shape.type.safeParse(type).success).toBe(true);
      });
      
      invalidTypes.forEach(type => {
        expect(EndpointConfig.shape.type.safeParse(type).success).toBe(false);
      });
    });
  });

  /**
   * Integration tests: buildOffchainMetadataObject compliance
   * Validates that utility functions produce spec-compliant output
   */
  describe('buildOffchainMetadataObject() produces spec-compliant output', () => {
    // Test: Output validates against OffChainMetadata schema
    it('produces output that validates against OffChainMetadata schema', () => {
      // Specification: Function must produce data compliant with data-model.ts:69-99
      // Requirement: All output must pass OffChainMetadata schema validation
      
      const input = {
        name: 'Test Application',
        description: 'A comprehensive test application',
        publisher: 'Test Publisher',
        image: 'https://example.com/image.png',
        metadata: {
          external_url: 'https://example.com',
        },
      };
      
      const result = buildOffchainMetadataObject(input);
      
      // Critical: Output MUST validate against spec
      const validation = OffChainMetadata.safeParse(result);
      if (!validation.success) {
        console.error('Validation errors:', validation.error.issues);
      }
      expect(validation.success).toBe(true);
    });

    // Test: Empty/undefined values are handled per spec
    it('removes empty values but preserves empty arrays per spec defaults', () => {
      // Specification: data-model.ts default() calls indicate empty arrays are valid
      // Requirements:
      // - Empty strings should not be present
      // - Empty arrays should use default values from schema
      
      const input = {
        name: 'Test App',
        description: 'Test description for validation',
        publisher: 'Test Publisher',
        image: 'https://example.com/image.png',
        metadata: {
          external_url: '',
          summary: '   ',
        },
      };
      
      const result = buildOffchainMetadataObject(input);
      
      // Empty/whitespace strings should be removed
      expect(result).not.toHaveProperty('external_url');
      expect(result).not.toHaveProperty('summary');
      
      // Result should still validate against schema
      expect(OffChainMetadata.safeParse(result).success).toBe(true);
    });
  });
});

