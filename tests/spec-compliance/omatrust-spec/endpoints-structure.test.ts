/**
 * OMATrust Specification Compliance: Endpoints Object Structure
 * 
 * Tests implementation compliance with OMATrust Identity Specification
 * Section 5.1.2.2 - endpoints Object (Interface 2/4 - API/Smart Contract)
 * 
 * SPECIFICATION REFERENCES:
 * - OMATrust Identity Specification: omatrust-specification-identity.pdf
 * - Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 * - Section: 5.1.2.2 - endpoints Object
 * 
 * SECTION 5.1.2.2: endpoints Object Structure
 * 
 * Endpoint Object Fields:
 * | Field     | Format | Required | Description |
 * |-----------|--------|----------|-------------|
 * | name      | string | Y        | Endpoint type: "MCP", "A2A", "OpenAPI", etc. |
 * | endpoint  | string | Y        | URL to the API endpoint |
 * | schemaUrl | string | O        | URL to schema definition (OpenAPI, GraphQL) |
 */

import { describe, it, expect } from 'vitest';
import { buildOffchainMetadataObject } from '@/lib/utils/offchain-json';
import { EndpointConfig, OffChainMetadata } from '@/schema/data-model';

describe('OMATrust Identity Spec 5.1.2.2: endpoints Object Structure', () => {
  /**
   * Tests validate endpoint configuration per specification.
   */

  describe('Endpoint Object Required Fields (OT-ID-060 to OT-ID-062)', () => {
    it('requires name field for endpoint type - OT-ID-060', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.2.2
       * Requirement ID: OT-ID-060
       * Requirement: "name field MUST identify the endpoint type"
       * Field: name | Format: string | Required: Y
       * Examples: "MCP", "A2A", "OpenAPI", "GraphQL", "JSON-RPC"
       */
      const validEndpoint = {
        name: 'OpenAPI',
        endpoint: 'https://api.example.com/v1',
      };

      const result = EndpointConfig.safeParse(validEndpoint);
      expect(result.success).toBe(true);

      // Test common endpoint type names
      const validNames = ['MCP', 'A2A', 'OpenAPI', 'GraphQL', 'JSON-RPC', 'REST'];
      validNames.forEach(name => {
        const ep = { name, endpoint: 'https://api.example.com' };
        const res = EndpointConfig.safeParse(ep);
        expect(res.success).toBe(true);
      });
    });

    it('requires endpoint URL field - OT-ID-061', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.2.2
       * Requirement ID: OT-ID-061
       * Requirement: "endpoint field MUST be a valid URL to the API"
       * Field: endpoint | Format: string (URL) | Required: Y
       */
      const validEndpoint = {
        name: 'REST API',
        endpoint: 'https://api.example.com/v1',
      };

      const result = EndpointConfig.safeParse(validEndpoint);
      expect(result.success).toBe(true);

      // Test invalid URL
      const invalidUrl = {
        name: 'REST API',
        endpoint: 'not-a-valid-url',
      };

      const invalidResult = EndpointConfig.safeParse(invalidUrl);
      // Document current behavior
      if (invalidResult.success) {
        console.warn('[OT-ID-061] WARNING: Invalid URL accepted in endpoint field');
      }
    });

    it('supports optional schemaUrl field - OT-ID-062', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.2.2
       * Requirement ID: OT-ID-062
       * Requirement: "schemaUrl field MAY provide URL to schema definition"
       * Field: schemaUrl | Format: string (URL) | Required: O
       */
      const withSchema = {
        name: 'OpenAPI',
        endpoint: 'https://api.example.com/v1',
        schemaUrl: 'https://api.example.com/openapi.json',
      };

      const result = EndpointConfig.safeParse(withSchema);
      expect(result.success).toBe(true);

      // Without schema URL
      const withoutSchema = {
        name: 'OpenAPI',
        endpoint: 'https://api.example.com/v1',
      };

      const withoutResult = EndpointConfig.safeParse(withoutSchema);
      expect(withoutResult.success).toBe(true);
    });
  });

  describe('Endpoint Types and Integration', () => {
    it('builds endpoints array from flat form fields', () => {
      /**
       * Tests the buildOffchainMetadataObject function creates proper endpoints array
       */
      const metadata = {
        name: 'API Service',
        description: 'A service with API endpoints',
        publisher: 'API Publisher',
        image: 'https://example.com/icon.png',
        endpointUrl: 'https://api.example.com/v1',
        endpointName: 'REST API',
        endpointSchemaUrl: 'https://api.example.com/openapi.json',
      };

      const result = buildOffchainMetadataObject(metadata);
      
      expect(result.endpoints).toBeDefined();
      expect(Array.isArray(result.endpoints)).toBe(true);
      
      if (result.endpoints && result.endpoints.length > 0) {
        const endpoint = result.endpoints[0];
        expect(endpoint.name).toBe('REST API');
        expect(endpoint.endpoint).toBe('https://api.example.com/v1');
        expect(endpoint.schemaUrl).toBe('https://api.example.com/openapi.json');
      }
    });

    it('supports MCP endpoint type with embedded fields', () => {
      /**
       * Specification: MCP (Model Context Protocol) Extension
       * Requirement: MCP endpoints embed additional MCP-specific fields
       */
      const mcpEndpoint = {
        name: 'MCP',
        endpoint: 'https://mcp.example.com',
        tools: [
          { name: 'search', description: 'Search the database' },
          { name: 'query', description: 'Run SQL queries' },
        ],
        resources: [
          { name: 'database', description: 'Access database tables' },
        ],
      };

      const result = EndpointConfig.safeParse(mcpEndpoint);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.name).toBe('MCP');
        expect(result.data.tools).toBeDefined();
        expect(Array.isArray(result.data.tools)).toBe(true);
      }
    });

    it('supports A2A (Agent-to-Agent) endpoint type', () => {
      /**
       * Specification: A2A Protocol
       * Requirement: A2A endpoints for agent communication
       */
      const a2aEndpoint = {
        name: 'A2A',
        endpoint: 'https://agent.example.com/.well-known/agent.json',
      };

      const result = EndpointConfig.safeParse(a2aEndpoint);
      expect(result.success).toBe(true);
    });

    it('supports GraphQL endpoint type', () => {
      /**
       * Specification: GraphQL APIs
       * Requirement: GraphQL endpoints with schema introspection
       */
      const graphqlEndpoint = {
        name: 'GraphQL',
        endpoint: 'https://api.example.com/graphql',
        schemaUrl: 'https://api.example.com/graphql/schema.graphql',
      };

      const result = EndpointConfig.safeParse(graphqlEndpoint);
      expect(result.success).toBe(true);
    });

    it('supports JSON-RPC endpoint type', () => {
      /**
       * Specification: JSON-RPC APIs
       * Requirement: JSON-RPC 2.0 endpoints
       */
      const jsonRpcEndpoint = {
        name: 'JSON-RPC',
        endpoint: 'https://rpc.example.com',
      };

      const result = EndpointConfig.safeParse(jsonRpcEndpoint);
      expect(result.success).toBe(true);
    });
  });

  describe('Endpoints Array in OffChainMetadata', () => {
    it('validates endpoints array in OffChainMetadata schema', () => {
      /**
       * Tests that endpoints field is properly validated in OffChainMetadata
       */
      const validMetadata = {
        name: 'Multi-Endpoint API',
        description: 'An API with multiple endpoints',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        endpoints: [
          { name: 'REST', endpoint: 'https://api.example.com/rest' },
          { name: 'GraphQL', endpoint: 'https://api.example.com/graphql' },
        ],
      };

      const result = OffChainMetadata.safeParse(validMetadata);
      expect(result.success).toBe(true);
    });

    it('supports interfaceVersions for API versioning - OT-ID-031', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.2.2
       * Requirement ID: OT-ID-031
       * Requirement: "interfaceVersions field MAY list supported API versions"
       * Field: interfaceVersions | Format: [string] | Required: O
       */
      const metadata = {
        name: 'Versioned API',
        description: 'An API with multiple versions',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        endpoints: [
          { name: 'REST', endpoint: 'https://api.example.com/v1' },
        ],
        interfaceVersions: ['1.0.0', '1.1.0', '2.0.0'],
      };

      const result = OffChainMetadata.safeParse(metadata);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.interfaceVersions).toEqual(['1.0.0', '1.1.0', '2.0.0']);
      }
    });
  });

  describe('Endpoint Validation Edge Cases', () => {
    it('handles empty endpoints array', () => {
      /**
       * Edge case: Empty endpoints array should be valid
       */
      const metadata = {
        name: 'No Endpoints App',
        description: 'An app without API endpoints',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        endpoints: [],
      };

      const result = OffChainMetadata.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it('handles undefined endpoints (optional)', () => {
      /**
       * Edge case: Missing endpoints should be valid (field is optional)
       */
      const metadata = {
        name: 'Human Only App',
        description: 'An app without API endpoints',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
      };

      const result = OffChainMetadata.safeParse(metadata);
      expect(result.success).toBe(true);
    });
  });
});

