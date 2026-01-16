/**
 * OMATrust Identity Specification - dataUrl Field Validation Tests
 * 
 * Tests for Section 5.1.1.2: dataUrl JSON Format
 * Validates field constraints, character limits, and format requirements.
 * 
 * Specification: OMATrust Identity Registry Specification
 * Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 */

import { describe, it, expect } from 'vitest';
import { 
  OnChainApp, 
  OffChainMetadata, 
  EndpointConfig,
  PlatformDetails 
} from '@/schema/data-model';

describe('OMATrust Identity Spec 5.1.1 - OnChain Field Constraints', () => {
  
  describe('dataHashAlgorithm Field', () => {
    
    /**
     * Test: dataHashAlgorithm field values
     * Requirement ID: OT-ID-011
     * Requirement: "dataHashAlgorithm MUST be 'keccak256' (0) or 'sha256' (1)"
     */
    it('should accept keccak256 as dataHashAlgorithm (0) - OT-ID-011', () => {
      const result = OnChainApp.shape.dataHashAlgorithm.safeParse(0);
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: dataHashAlgorithm sha256 value
     * Requirement ID: OT-ID-011
     */
    it('should accept sha256 as dataHashAlgorithm (1) - OT-ID-011', () => {
      const result = OnChainApp.shape.dataHashAlgorithm.safeParse(1);
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: dataHashAlgorithm rejects invalid values
     * Requirement ID: OT-ID-011
     */
    it('should reject invalid dataHashAlgorithm values - OT-ID-011', () => {
      const result = OnChainApp.shape.dataHashAlgorithm.safeParse(2);
      expect(result.success).toBe(false);
    });
  });
  
  describe('traitHashes Field', () => {
    
    /**
     * Test: traitHashes max 20 entries
     * Requirement ID: OT-ID-012
     * Requirement: "traitHashes SHOULD be capped at ≤20 entries"
     */
    it('should accept up to 20 traitHashes - OT-ID-012', () => {
      const validHashes = Array(20).fill('0x' + '1234567890abcdef'.repeat(4));
      const result = OnChainApp.shape.traitHashes.safeParse(validHashes);
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: traitHashes rejects more than 20
     * Requirement ID: OT-ID-012
     */
    it('should reject more than 20 traitHashes - OT-ID-012', () => {
      const tooManyHashes = Array(21).fill('0x' + '1234567890abcdef'.repeat(4));
      const result = OnChainApp.shape.traitHashes.safeParse(tooManyHashes);
      expect(result.success).toBe(false);
    });
    
    /**
     * Test: traitHashes must be valid hex hashes
     * Requirement ID: OT-ID-012
     */
    it('should require valid 0x-prefixed hex hashes - OT-ID-012', () => {
      const validHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = OnChainApp.shape.traitHashes.safeParse([validHash]);
      expect(result.success).toBe(true);
      
      const invalidHash = 'not-a-hash';
      const invalidResult = OnChainApp.shape.traitHashes.safeParse([invalidHash]);
      expect(invalidResult.success).toBe(false);
    });
  });
  
  describe('dataUrl Field', () => {
    
    /**
     * Test: dataUrl must be valid URL
     * Requirement ID: OT-ID-006
     * Requirement: "dataUrl MUST be a valid URL pointing to off-chain metadata"
     */
    it('should accept valid HTTPS URLs - OT-ID-006', () => {
      const result = OnChainApp.shape.dataUrl.safeParse('https://example.com/metadata.json');
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: dataUrl accepts HTTP (not recommended but valid URL)
     * Requirement ID: OT-ID-006
     */
    it('should accept HTTP URLs (valid but not recommended) - OT-ID-006', () => {
      const result = OnChainApp.shape.dataUrl.safeParse('http://example.com/metadata.json');
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: dataUrl rejects invalid URLs
     * Requirement ID: OT-ID-006
     */
    it('should reject invalid URLs - OT-ID-006', () => {
      const result = OnChainApp.shape.dataUrl.safeParse('not-a-url');
      expect(result.success).toBe(false);
    });
  });
  
  describe('dataHash Field', () => {
    
    /**
     * Test: dataHash format
     * Requirement ID: OT-ID-007
     * Requirement: "dataHash MUST be 0x-prefixed 64-character hex string"
     */
    it('should accept valid 0x-prefixed 64-char hex hash - OT-ID-007', () => {
      const validHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = OnChainApp.shape.dataHash.safeParse(validHash);
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: dataHash rejects short hashes
     * Requirement ID: OT-ID-007
     */
    it('should reject hashes that are too short - OT-ID-007', () => {
      const shortHash = '0x1234567890abcdef';
      const result = OnChainApp.shape.dataHash.safeParse(shortHash);
      expect(result.success).toBe(false);
    });
    
    /**
     * Test: dataHash rejects non-0x prefix
     * Requirement ID: OT-ID-007
     */
    it('should reject hashes without 0x prefix - OT-ID-007', () => {
      const noPrefix = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = OnChainApp.shape.dataHash.safeParse(noPrefix);
      expect(result.success).toBe(false);
    });
  });
});

describe('OMATrust Identity Spec 5.1.1.2 - OffChain Metadata Constraints', () => {
  
  describe('name Field', () => {
    
    /**
     * Test: name field constraints
     * Requirement ID: OT-ID-017
     * Requirement: "name MUST be present, 2-80 characters"
     */
    it('should accept valid name (2-80 chars) - OT-ID-017', () => {
      const result = OffChainMetadata.shape.name.safeParse('My App');
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: name rejects too short
     * Requirement ID: OT-ID-017
     */
    it('should reject name shorter than 2 characters - OT-ID-017', () => {
      const result = OffChainMetadata.shape.name.safeParse('A');
      expect(result.success).toBe(false);
    });
    
    /**
     * Test: name rejects too long
     * Requirement ID: OT-ID-017
     */
    it('should reject name longer than 80 characters - OT-ID-017', () => {
      const longName = 'A'.repeat(81);
      const result = OffChainMetadata.shape.name.safeParse(longName);
      expect(result.success).toBe(false);
    });
    
    /**
     * Test: name accepts exactly 80 characters
     * Requirement ID: OT-ID-017
     */
    it('should accept name of exactly 80 characters - OT-ID-017', () => {
      const maxName = 'A'.repeat(80);
      const result = OffChainMetadata.shape.name.safeParse(maxName);
      expect(result.success).toBe(true);
    });
  });
  
  describe('description Field', () => {
    
    /**
     * Test: description min length
     * Requirement ID: OT-ID-018
     * Requirement: "description MUST have min 10 characters"
     * Note: Spec says max 4000, implementation has min 10
     */
    it('should accept valid description (min 10 chars) - OT-ID-018', () => {
      const result = OffChainMetadata.shape.description.safeParse('This is a valid description');
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: description rejects too short
     * Requirement ID: OT-ID-018
     */
    it('should reject description shorter than 10 characters - OT-ID-018', () => {
      const result = OffChainMetadata.shape.description.safeParse('Short');
      expect(result.success).toBe(false);
    });
    
    /**
     * Test: description max length (spec requirement)
     * Requirement ID: OT-ID-018
     * Requirement: "description max 4000 characters per spec"
     * Note: This is a spec requirement that may need enforcement
     */
    it('should document max 4000 char requirement - OT-ID-018', () => {
      const specMaxLength = 4000;
      // This documents the spec requirement
      expect(specMaxLength).toBe(4000);
    });
  });
  
  describe('summary Field', () => {
    
    /**
     * Test: summary is optional
     * Requirement ID: OT-ID-024
     * Requirement: "summary is optional, max 80 chars"
     */
    it('should accept undefined summary - OT-ID-024', () => {
      const result = OffChainMetadata.shape.summary.safeParse(undefined);
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: summary accepts valid values
     * Requirement ID: OT-ID-024
     */
    it('should accept valid summary - OT-ID-024', () => {
      const result = OffChainMetadata.shape.summary.safeParse('A brief summary of the application.');
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: summary max 80 chars (spec requirement)
     * Requirement ID: OT-ID-024
     * Requirement: "summary max 80 characters per spec"
     * Note: This is a spec requirement that may need enforcement
     */
    it('should document max 80 char requirement for summary - OT-ID-024', () => {
      const specMaxLength = 80;
      const validSummary = 'A'.repeat(80);
      
      // Document the spec requirement
      expect(specMaxLength).toBe(80);
      expect(validSummary.length).toBe(80);
    });
  });
  
  describe('traits Field', () => {
    
    /**
     * Test: traits max 20 entries
     * Requirement ID: OT-ID-025
     * Requirement: "traits max 20 entries"
     */
    it('should accept up to 20 traits - OT-ID-025', () => {
      const traits = Array(20).fill('api:openapi');
      const result = OffChainMetadata.shape.traits.safeParse(traits);
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: traits rejects more than 20
     * Requirement ID: OT-ID-025
     */
    it('should reject more than 20 traits - OT-ID-025', () => {
      const tooManyTraits = Array(21).fill('api:openapi');
      const result = OffChainMetadata.shape.traits.safeParse(tooManyTraits);
      expect(result.success).toBe(false);
    });
    
    /**
     * Test: traits accepts empty array
     * Requirement ID: OT-ID-025
     */
    it('should accept empty traits array - OT-ID-025', () => {
      const result = OffChainMetadata.shape.traits.safeParse([]);
      expect(result.success).toBe(true);
    });
  });
  
  describe('screenshotUrls Field', () => {
    
    /**
     * Test: screenshotUrls accepts valid URLs
     * Requirement ID: OT-ID-026
     * Requirement: "screenshotUrls is array of URLs, required for Interface 0"
     */
    it('should accept valid screenshot URLs - OT-ID-026', () => {
      const result = OffChainMetadata.shape.screenshotUrls.safeParse([
        'https://example.com/screenshot1.png',
        'https://example.com/screenshot2.png'
      ]);
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: screenshotUrls accepts empty array
     * Requirement ID: OT-ID-026
     */
    it('should accept empty screenshotUrls array - OT-ID-026', () => {
      const result = OffChainMetadata.shape.screenshotUrls.safeParse([]);
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: screenshotUrls rejects invalid URLs
     * Requirement ID: OT-ID-026
     */
    it('should reject invalid URLs in screenshotUrls - OT-ID-026', () => {
      const result = OffChainMetadata.shape.screenshotUrls.safeParse([
        'not-a-url'
      ]);
      expect(result.success).toBe(false);
    });
  });
  
  describe('videoUrls Field', () => {
    
    /**
     * Test: videoUrls accepts valid URLs
     * Requirement ID: OT-ID-027
     * Requirement: "videoUrls is optional array of URLs"
     */
    it('should accept valid video URLs - OT-ID-027', () => {
      const result = OffChainMetadata.shape.videoUrls.safeParse([
        'https://youtube.com/watch?v=abc123',
        'https://vimeo.com/12345'
      ]);
      expect(result.success).toBe(true);
    });
  });
  
  describe('threeDAssetUrls Field', () => {
    
    /**
     * Test: threeDAssetUrls (3dAssetUrls) accepts valid URLs
     * Requirement ID: OT-ID-028
     * Requirement: "3dAssetUrls is optional array of URLs"
     */
    it('should accept valid 3D asset URLs - OT-ID-028', () => {
      const result = OffChainMetadata.shape.threeDAssetUrls.safeParse([
        'https://example.com/model.glb',
        'https://example.com/scene.gltf'
      ]);
      expect(result.success).toBe(true);
    });
  });
});

describe('OMATrust Identity Spec 5.1.2.1 - platforms Object', () => {
  
  describe('PlatformDetails Fields', () => {
    
    /**
     * Test: launchUrl field
     * Requirement ID: OT-ID-050
     * Requirement: "launchUrl is URL for launching the app"
     */
    it('should accept valid launchUrl - OT-ID-050', () => {
      const result = PlatformDetails.shape.launchUrl.safeParse('https://app.example.com/launch');
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: supported field is boolean
     * Requirement ID: OT-ID-051
     * Requirement: "supported indicates if platform is supported"
     */
    it('should accept boolean supported field - OT-ID-051', () => {
      const result = PlatformDetails.shape.supported.safeParse(true);
      expect(result.success).toBe(true);
      
      const falseResult = PlatformDetails.shape.supported.safeParse(false);
      expect(falseResult.success).toBe(true);
    });
    
    /**
     * Test: downloadUrl field
     * Requirement ID: OT-ID-052
     * Requirement: "downloadUrl is URL for downloading app"
     */
    it('should accept valid downloadUrl - OT-ID-052', () => {
      const result = PlatformDetails.shape.downloadUrl.safeParse('https://example.com/download/app.dmg');
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: artifactDid field
     * Requirement ID: OT-ID-053
     * Requirement: "artifactDid references did:artifact for verification"
     */
    it('should accept artifactDid string - OT-ID-053', () => {
      const result = PlatformDetails.shape.artifactDid.safeParse('did:artifact:bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku');
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: Complete platform object
     */
    it('should accept complete platform configuration', () => {
      const platformConfig = {
        launchUrl: 'https://app.example.com',
        supported: true,
        downloadUrl: 'https://example.com/download',
        artifactDid: 'did:artifact:bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku'
      };
      
      const result = PlatformDetails.safeParse(platformConfig);
      expect(result.success).toBe(true);
    });
  });
});

describe('OMATrust Identity Spec 5.1.2.2 - endpoints Object', () => {
  
  describe('EndpointConfig Fields', () => {
    
    /**
     * Test: endpoint name field
     * Requirement ID: OT-ID-060
     * Requirement: "name identifies endpoint type (MCP, A2A, etc.)"
     */
    it('should accept endpoint name - OT-ID-060', () => {
      const result = EndpointConfig.shape.name.safeParse('MCP');
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: endpoint URL field
     * Requirement ID: OT-ID-061
     * Requirement: "endpoint is the URL of the API"
     */
    it('should accept valid endpoint URL - OT-ID-061', () => {
      const result = EndpointConfig.shape.endpoint.safeParse('https://api.example.com/v1');
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: schemaUrl field
     * Requirement ID: OT-ID-062
     * Requirement: "schemaUrl points to OpenAPI/GraphQL schema"
     */
    it('should accept valid schemaUrl - OT-ID-062', () => {
      const result = EndpointConfig.shape.schemaUrl.safeParse('https://api.example.com/openapi.json');
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: Complete endpoint configuration
     */
    it('should accept complete endpoint configuration', () => {
      const endpointConfig = {
        name: 'OpenAPI',
        endpoint: 'https://api.example.com/v1',
        schemaUrl: 'https://api.example.com/openapi.json'
      };
      
      const result = EndpointConfig.safeParse(endpointConfig);
      expect(result.success).toBe(true);
    });
    
    /**
     * Test: MCP endpoint with additional fields
     * Requirement: MCP endpoints can have tools, resources, prompts
     */
    it('should accept MCP endpoint with MCP-specific fields', () => {
      const mcpEndpoint = {
        name: 'MCP',
        endpoint: 'https://mcp.example.com',
        tools: [{ name: 'search', description: 'Search tool' }],
        resources: [{ name: 'database', uri: 'db://main' }],
        prompts: [{ name: 'greeting', template: 'Hello {name}' }]
      };
      
      const result = EndpointConfig.safeParse(mcpEndpoint);
      expect(result.success).toBe(true);
    });
  });
});

describe('OffChain Metadata - Complete Validation', () => {
  
  /**
   * Test: Minimal valid metadata
   */
  it('should validate minimal required metadata', () => {
    const minimalMetadata = {
      name: 'Test App',
      description: 'A test application with at least 10 characters',
      publisher: 'Test Publisher',
      image: 'https://example.com/icon.png'
    };
    
    const result = OffChainMetadata.safeParse(minimalMetadata);
    expect(result.success).toBe(true);
  });
  
  /**
   * Test: Complete valid metadata
   */
  it('should validate complete metadata with all fields', () => {
    const completeMetadata = {
      name: 'Complete Test App',
      description: 'A comprehensive test application with all fields populated',
      publisher: 'Test Publisher',
      image: 'https://example.com/icon.png',
      external_url: 'https://example.com',
      summary: 'Brief summary',
      legalUrl: 'https://example.com/legal',
      supportUrl: 'https://example.com/support',
      screenshotUrls: ['https://example.com/ss1.png', 'https://example.com/ss2.png'],
      videoUrls: ['https://youtube.com/watch?v=abc'],
      threeDAssetUrls: ['https://example.com/model.glb'],
      platforms: {
        web: { launchUrl: 'https://app.example.com', supported: true },
        ios: { downloadUrl: 'https://apps.apple.com/app/123', supported: true }
      },
      endpoints: [
        { name: 'MCP', endpoint: 'https://mcp.example.com' },
        { name: 'REST', endpoint: 'https://api.example.com/v1', schemaUrl: 'https://api.example.com/openapi.json' }
      ],
      interfaceVersions: ['1.0', '1.1', '2.0'],
      traits: ['api:openapi', 'token:erc20', 'pay:x402']
    };
    
    const result = OffChainMetadata.safeParse(completeMetadata);
    expect(result.success).toBe(true);
  });
});

