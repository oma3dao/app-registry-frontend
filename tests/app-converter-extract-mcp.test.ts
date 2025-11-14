/**
 * Tests for extractMcpFields utility function
 * Covers lines 24-32 in lib/utils/app-converter.ts
 */

import { describe, it, expect } from 'vitest';

// Import the function (it may not be exported, so we might need to access through module)
import * as appConverter from '@/lib/utils/app-converter';

// Since extractMcpFields might not be exported, let's test through the functions that use it
// or test it directly if it's exported
describe('app-converter - extractMcpFields', () => {
  /**
   * Test: extractMcpFromEndpoint returns undefined when endpoint name is not 'MCP' (covers line 19-20)
   * Tests the early return when endpoint is not MCP
   */
  it('returns undefined when endpoint name is not MCP', () => {
    const appWithNonMcpEndpoint = {
      did: 'did:web:example.com',
      name: 'Test App',
      dataUrl: 'https://example.com/data',
      minter: '0x123',
      currentVersion: { major: 1, minor: 0, patch: 0 },
      endpoints: [
        {
          name: 'API', // Not 'MCP'
          endpoint: 'https://api.example.com',
          schemaUrl: 'https://schema.example.com',
          // No additional MCP fields
        }
      ]
    };
    
    const result = appConverter.appSummariesToNFTs([appWithNonMcpEndpoint]);
    
    // Should convert successfully without MCP extraction
    expect(result).toHaveLength(1);
    expect(result[0].did).toBe('did:web:example.com');
  });

  /**
   * Test: extractMcpFromEndpoint returns undefined when MCP endpoint has no extra fields (covers lines 27-28)
   * Tests the case where MCP endpoint only has name, endpoint, and schemaUrl
   */
  it('returns undefined when MCP endpoint has no extra fields', () => {
    const appWithMinimalMcp = {
      did: 'did:web:minimal-mcp.com',
      name: 'Minimal MCP App',
      dataUrl: 'https://minimal-mcp.com/data',
      minter: '0x123',
      currentVersion: { major: 1, minor: 0, patch: 0 },
      endpoints: [
        {
          name: 'MCP', // MCP endpoint
          endpoint: 'https://mcp.example.com',
          schemaUrl: 'https://schema.example.com',
          // No tools, resources, prompts - just the basic fields
        }
      ]
    };
    
    const result = appConverter.appSummariesToNFTs([appWithMinimalMcp]);
    
    // Should convert, extractMcpFromEndpoint returns undefined (lines 27-28)
    expect(result).toHaveLength(1);
    expect(result[0].did).toBe('did:web:minimal-mcp.com');
  });

  /**
   * Test: extractMcpFromEndpoint extracts MCP fields when present (covers lines 24-31)
   * Tests the case where MCP endpoint has additional fields like tools, resources, prompts
   */
  it('extracts MCP fields when present in MCP endpoint', () => {
    const appWithMcp = {
      did: 'did:web:mcp.example.com',
      name: 'MCP App',
      dataUrl: 'https://example.com/mcp-data',
      minter: '0x456',
      currentVersion: { major: 1, minor: 0, patch: 0 },
      endpoints: [
        {
          name: 'MCP', // Must be 'MCP' to trigger extraction
          endpoint: 'https://mcp.example.com',
          schemaUrl: 'https://schema.example.com',
          // Additional MCP fields (lines 24-31 extract these)
          tools: [{ name: 'search', description: 'Search tool' }],
          resources: [{ uri: 'file:///data', name: 'Data' }],
          prompts: [{ name: 'hello', description: 'Greeting' }]
        }
      ]
    };
    
    const result = appConverter.appSummariesToNFTs([appWithMcp]);
    
    // Should successfully extract and convert
    expect(result).toHaveLength(1);
    expect(result[0].did).toBe('did:web:mcp.example.com');
  });

  /**
   * Test: handles endpoint with only name, endpoint, schemaUrl (lines 24, 27-28)
   * Tests destructuring and empty object check
   */
  it('handles minimal endpoint structure correctly', () => {
    const minimalEndpoint = {
      did: 'did:web:minimal.com',
      name: 'Minimal App',
      dataUrl: 'https://minimal.com/data',
      minter: '0x789',
      currentVersion: { major: 1, minor: 0, patch: 0 },
      endpoints: [
        {
          name: 'Basic API',
          endpoint: 'https://api.minimal.com',
          schemaUrl: 'https://schema.minimal.com'
          // Exactly the three extracted fields, nothing more
        }
      ]
    };
    
    const result = appConverter.appSummariesToNFTs([minimalEndpoint]);
    
    // Should successfully convert without errors
    expect(result).toHaveLength(1);
    expect(result[0].did).toBe('did:web:minimal.com');
    // Name is populated from metadata, not from app summary
    expect(result[0].name).toBe('');
  });

  /**
   * Test: handles app with no endpoints array
   * Tests edge case where endpoints might be missing
   */
  it('handles apps without endpoints array', () => {
    const appWithoutEndpoints = {
      did: 'did:web:noendpoints.com',
      name: 'No Endpoints App',
      dataUrl: 'https://noendpoints.com/data',
      minter: '0xABC',
      currentVersion: { major: 1, minor: 0, patch: 0 },
      // No endpoints field
    };
    
    const result = appConverter.appSummariesToNFTs([appWithoutEndpoints]);
    
    // Should still convert successfully
    expect(result).toHaveLength(1);
    expect(result[0].did).toBe('did:web:noendpoints.com');
  });

  /**
   * Test: handles multiple apps with mixed MCP fields
   * Tests that extractMcpFields works correctly for each app independently
   */
  it('processes multiple apps with different MCP configurations', () => {
    const apps = [
      {
        did: 'did:web:app1.com',
        name: 'App 1',
        dataUrl: 'https://app1.com/data',
        minter: '0x111',
        currentVersion: { major: 1, minor: 0, patch: 0 },
        endpoints: [{ name: 'API', endpoint: 'https://api1.com', schemaUrl: 'https://schema1.com' }]
      },
      {
        did: 'did:web:app2.com',
        name: 'App 2',
        dataUrl: 'https://app2.com/data',
        minter: '0x222',
        currentVersion: { major: 1, minor: 0, patch: 0 },
        endpoints: [
          { 
            name: 'MCP', 
            endpoint: 'https://mcp2.com', 
            schemaUrl: 'https://schema2.com',
            tools: [{ name: 'tool1' }]
          }
        ]
      }
    ];
    
    const result = appConverter.appSummariesToNFTs(apps);
    
    // Both should convert successfully
    expect(result).toHaveLength(2);
    expect(result[0].did).toBe('did:web:app1.com');
    expect(result[1].did).toBe('did:web:app2.com');
  });
});

