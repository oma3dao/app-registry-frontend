/**
 * OMATrust Specification Compliance: Traits (Appendix C)
 * 
 * Tests implementation compliance with OMATrust Identity Specification
 * Appendix C - Recommended Traits.
 * 
 * SPECIFICATION REFERENCES:
 * - OMATrust Identity Specification: omatrust-specification-identity.pdf
 * - Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 * - Section: Appendix C - Recommended Traits
 * 
 * This test file validates EXTERNAL SPECIFICATIONS, not internal implementation.
 * 
 * APPENDIX C: Recommended Traits
 * 
 * Trait Categories:
 * 1. API Format Traits (api:*)
 * 2. Token Standard Traits (token:*)
 * 3. Payment Protocol Traits (pay:*)
 * 
 * Standard Trait Strings:
 * | Trait String      | Description                    |
 * |-------------------|--------------------------------|
 * | api:openapi       | Interface type 2, OpenAPI      |
 * | api:graphql       | Interface type 2, GraphQL      |
 * | api:jsonrpc       | Interface type 2, JSON-RPC     |
 * | api:mcp           | Interface type 2, MCP          |
 * | api:a2a           | Interface type 2, A2A          |
 * | token:erc20       | Token supports ERC-20          |
 * | token:erc3009     | Token supports ERC-3009        |
 * | token:spl         | Token supports SPL             |
 * | token:2022        | Token supports Token-2022      |
 * | token:transferable| Token is transferable          |
 * | token:burnable    | Token is burnable              |
 * | pay:x402          | Endpoint supports x402         |
 * | pay:manual        | Traditional payment support    |
 */

import { describe, it, expect } from 'vitest';
import { buildOffchainMetadataObject } from '@/lib/utils/offchain-json';
import { OffChainMetadata } from '@/schema/data-model';

describe('OMATrust Identity Spec Appendix C: Recommended Traits', () => {
  /**
   * Specification: OMATrust Identity Specification
   * Section: Appendix C - Recommended Traits
   * 
   * Tests validate trait handling per specification.
   */

  describe('Trait Array Structure (OT-ID-037)', () => {
    it('recognizes standard API format traits - OT-ID-037', () => {
      /**
       * Specification: OMATrust Identity Specification - Appendix C
       * Requirement ID: OT-ID-037
       * Requirement: "System SHOULD recognize standard trait strings from Appendix C"
       * 
       * API Format Traits: api:openapi, api:graphql, api:jsonrpc, api:mcp, api:a2a
       */

      const apiTraits = [
        'api:openapi',
        'api:graphql',
        'api:jsonrpc',
        'api:mcp',
        'api:a2a',
      ];

      const metadata = {
        name: 'API Traits Test',
        description: 'Testing API format traits per Appendix C',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        traits: apiTraits,
      };

      const result = buildOffchainMetadataObject(metadata);
      expect(result).toHaveProperty('traits');
      expect(Array.isArray(result.traits)).toBe(true);
      
      // All standard API traits should be preserved
      apiTraits.forEach(trait => {
        expect(result.traits).toContain(trait);
      });
    });

    it('recognizes standard token traits', () => {
      /**
       * Specification: OMATrust Identity Specification - Appendix C
       * Token Traits: token:erc20, token:erc3009, token:spl, token:2022,
       *               token:transferable, token:burnable
       */

      const tokenTraits = [
        'token:erc20',
        'token:erc3009',
        'token:spl',
        'token:2022',
        'token:transferable',
        'token:burnable',
      ];

      const metadata = {
        name: 'Token Traits Test',
        description: 'Testing token standard traits per Appendix C',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        traits: tokenTraits,
      };

      const result = buildOffchainMetadataObject(metadata);
      
      tokenTraits.forEach(trait => {
        expect(result.traits).toContain(trait);
      });
    });

    it('recognizes standard payment traits', () => {
      /**
       * Specification: OMATrust Identity Specification - Appendix C
       * Payment Traits: pay:x402, pay:manual
       */

      const paymentTraits = [
        'pay:x402',
        'pay:manual',
      ];

      const metadata = {
        name: 'Payment Traits Test',
        description: 'Testing payment protocol traits per Appendix C',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        traits: paymentTraits,
      };

      const result = buildOffchainMetadataObject(metadata);
      
      paymentTraits.forEach(trait => {
        expect(result.traits).toContain(trait);
      });
    });
  });

  describe('Custom Traits (OT-ID-038)', () => {
    it('allows custom trait strings beyond Appendix C - OT-ID-038', () => {
      /**
       * Specification: OMATrust Identity Specification - Appendix C
       * Requirement ID: OT-ID-038
       * Requirement: "Developers MAY add custom trait strings beyond Appendix C"
       * 
       * Custom traits allow for extensibility beyond standard traits.
       */

      const customTraits = [
        'custom:my-trait',
        'game:multiplayer',
        'feature:dark-mode',
        'platform:cross-platform',
      ];

      const metadata = {
        name: 'Custom Traits Test',
        description: 'Testing custom trait support',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        traits: customTraits,
      };

      const result = buildOffchainMetadataObject(metadata);
      
      // Custom traits should be accepted
      customTraits.forEach(trait => {
        expect(result.traits).toContain(trait);
      });
    });

    it('supports mixed standard and custom traits', () => {
      /**
       * Specification: OMATrust Identity Specification - Appendix C
       * Requirement: Both standard and custom traits can coexist
       */

      const mixedTraits = [
        'api:openapi',           // Standard API trait
        'token:erc20',           // Standard token trait
        'custom:verified-owner', // Custom trait
        'game:pvp',              // Custom game trait
      ];

      const metadata = {
        name: 'Mixed Traits Test',
        description: 'Testing mixed trait support',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        traits: mixedTraits,
      };

      const result = buildOffchainMetadataObject(metadata);
      expect(result.traits).toHaveLength(4);
      
      mixedTraits.forEach(trait => {
        expect(result.traits).toContain(trait);
      });
    });
  });

  describe('Trait Limits (OT-ID-010, OT-ID-011)', () => {
    it('caps traits at 20 entries per specification - OT-ID-010', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1 (Table 1)
       * Requirement ID: OT-ID-010
       * Requirement: "Implementations SHOULD cap `traitHashes` to ≤ 20 entries"
       * 
       * Both on-chain and off-chain traits limited to 20.
       */

      // Create exactly 20 traits (boundary test)
      const maxTraits = Array.from({ length: 20 }, (_, i) => `trait:${i + 1}`);
      
      const validResult = OffChainMetadata.safeParse({
        name: 'Max Traits',
        description: 'Testing 20 trait maximum',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        traits: maxTraits,
      });
      
      // 20 traits should be accepted
      expect(validResult.success).toBe(true);
    });

    it('enforces maximum 20 traits in schema', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1
       * Implementation: src/schema/data-model.ts:98 uses .max(20)
       */

      // Create 21 traits (exceeds limit)
      const tooManyTraits = Array.from({ length: 21 }, (_, i) => `trait:${i + 1}`);
      
      const invalidResult = OffChainMetadata.safeParse({
        name: 'Too Many Traits',
        description: 'Testing trait limit enforcement',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        traits: tooManyTraits,
      });
      
      // 21 traits should be rejected
      expect(invalidResult.success).toBe(false);
    });

    it('clients must not assume more than 20 traits indexed - OT-ID-011', () => {
      /**
       * Specification: OMATrust Identity Specification - Section 5.1.1
       * Requirement ID: OT-ID-011
       * Requirement: "Clients MUST NOT assume more than 20 `traitHashes` are indexed"
       * 
       * Even if more traits are provided, only first 20 are guaranteed indexed.
       */

      // This is a behavioral requirement - testing that our output respects the limit
      const metadata = {
        name: 'Indexing Test',
        description: 'Testing trait indexing limits',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        traits: Array.from({ length: 20 }, (_, i) => `indexed:${i + 1}`),
      };

      const result = buildOffchainMetadataObject(metadata);
      
      // Output should have at most 20 traits
      expect(result.traits.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Trait Hashing (OT-ID-039)', () => {
    it('trait hashes use chain-specific algorithm - OT-ID-039', () => {
      /**
       * Specification: OMATrust Identity Specification - Appendix C
       * Requirement ID: OT-ID-039
       * Requirement: "Trait hashes MUST be computed using chain-specific 
       *               hash algorithm (e.g., keccak256 for Ethereum)"
       * 
       * Note: This tests the conceptual requirement. Actual hashing
       * is done at contract level or by traitHashes preparation.
       */

      // Document the expected behavior
      const traits = ['api:openapi', 'token:erc20'];
      
      // For Ethereum-compatible chains, keccak256 is used
      // Implementation: The contract computes hashes from trait strings
      
      // Schema accepts trait strings (hashing done on-chain or pre-computed)
      const metadata = {
        name: 'Trait Hash Test',
        description: 'Testing trait hashing requirements',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        traits,
      };

      const result = buildOffchainMetadataObject(metadata);
      
      // Off-chain metadata stores trait strings
      expect(result.traits).toContain('api:openapi');
      expect(result.traits).toContain('token:erc20');
      
      // traitHashes (on-chain) would be keccak256 hashes of these strings
      // This is validated in onchain-metadata.test.ts
    });
  });

  describe('Trait Format Validation', () => {
    it('accepts trait strings with colon separator', () => {
      /**
       * Specification: OMATrust Identity Specification - Appendix C
       * Observation: Standard traits use category:value format
       */

      const colonSeparatedTraits = [
        'api:openapi',
        'token:erc20',
        'pay:x402',
        'custom:myvalue',
      ];

      const metadata = {
        name: 'Colon Format Test',
        description: 'Testing colon-separated trait format',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        traits: colonSeparatedTraits,
      };

      const result = buildOffchainMetadataObject(metadata);
      
      colonSeparatedTraits.forEach(trait => {
        expect(result.traits).toContain(trait);
        expect(trait).toContain(':');
      });
    });

    it('accepts traits without colon separator', () => {
      /**
       * Note: While standard traits use colon format,
       * arbitrary strings may also be valid traits.
       */

      const simpleTraits = [
        'verified',
        'premium',
        'featured',
      ];

      const metadata = {
        name: 'Simple Trait Test',
        description: 'Testing simple trait strings',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        traits: simpleTraits,
      };

      const result = buildOffchainMetadataObject(metadata);
      
      simpleTraits.forEach(trait => {
        expect(result.traits).toContain(trait);
      });
    });

    it('handles empty traits array', () => {
      /**
       * Traits are optional, so empty array should be valid.
       */

      const metadata = {
        name: 'No Traits Test',
        description: 'Testing empty traits array',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        traits: [],
      };

      const result = buildOffchainMetadataObject(metadata);
      
      // Empty array may be omitted or preserved
      expect(result.traits === undefined || result.traits.length === 0).toBe(true);
    });
  });

  describe('Trait Interoperability', () => {
    it('traits in metadata match on-chain traitHashes', () => {
      /**
       * Specification: OMATrust Identity Specification
       * Section: 5.1.1 (Table 1) and Appendix C
       * 
       * Off-chain traits (strings) must correspond to on-chain traitHashes.
       */

      const traits = ['api:openapi', 'pay:x402'];
      
      const metadata = {
        name: 'Interop Test',
        description: 'Testing trait interoperability',
        publisher: 'Test Publisher',
        image: 'https://example.com/icon.png',
        traits,
      };

      const result = buildOffchainMetadataObject(metadata);
      
      // Traits in off-chain metadata
      expect(result.traits).toEqual(traits);
      
      // Note: Corresponding traitHashes would be:
      // - keccak256('api:openapi')
      // - keccak256('pay:x402')
      // These are computed by the contract or registry.write functions
    });
  });
});

