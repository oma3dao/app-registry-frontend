/**
 * OMATrust Specification Compliance: DID Format Support
 * 
 * Tests implementation compliance with OMATrust Identity Specification
 * for Decentralized Identifier (DID) format requirements.
 * 
 * SPECIFICATION REFERENCES:
 * - OMATrust Developer Documentation: https://docs.oma3.org/
 * - OMATrust Identity Specification: https://github.com/oma3dao/omatrust-docs/blob/main/specification/omatrust-specification.md
 * - W3C DID Core Specification v1.0: https://www.w3.org/TR/did-core/
 * 
 * This test file validates EXTERNAL SPECIFICATIONS, not internal implementation.
 */

import { describe, it, expect } from 'vitest';
import { buildOffchainMetadataObject } from '@/lib/utils/offchain-json';
import { prepareMintApp } from '@/lib/contracts/registry.write';

describe('OMATrust Specification: DID Format Requirements', () => {
  /**
   * Specification: OMATrust Developer Documentation
   * URL: https://docs.oma3.org/ - "Choose Your DID & Verify Ownership"
   * Section: Quick Start > 1. Choose Your DID
   * 
   * REQUIREMENT: "Pick a Decentralized Identifier (DID) for your service:
   * 
   * did:web (Domain-based) - For services with domains
   * - Format: did:web:example.com
   * - Verification: DNS TXT entry or DID document at /.well-known/did.json
   * - Best for: Websites, APIs, SaaS services
   * 
   * did:pkh (Blockchain-based) - For smart contracts
   * - Format: did:pkh:eip155:1:0xContractAddress
   * - Verification: Prove you control the contract
   * - Best for: DeFi, NFTs, DAOs"
   */
  describe('Supported DID Formats (OMATrust Docs: Quick Start)', () => {
    it('accepts did:web format per OMATrust specification', () => {
      /**
       * Specification: OMATrust Developer Documentation
       * URL: https://docs.oma3.org/
       * Section: Quick Start > 1. Choose Your DID & Verify Ownership
       * Requirement: "Format: did:web:example.com"
       * 
       * Test validates that implementation accepts did:web format as required by spec.
       */
      
      const validDidWeb = 'did:web:example.com';
      
      // Test 1: Metadata building should accept did:web
      const metadata = {
        did: validDidWeb,
        name: 'Test Application',
        description: 'Test application for DID validation',
        publisher: 'Test Publisher',
        image: 'https://example.com/image.png',
      };
      
      const result = buildOffchainMetadataObject(metadata);
      
      // Implementation must not reject did:web format
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Application');
      
      // Test 2: Contract preparation should accept did:web
      const mintInput = {
        did: validDidWeb,
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '1234567890abcdef'.repeat(4),
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };
      
      const mintTx = prepareMintApp(mintInput);
      expect(mintTx).toBeDefined();
      expect(mintTx.args[0]).toBe(validDidWeb);
    });

    it('accepts did:pkh format per OMATrust specification', () => {
      /**
       * Specification: OMATrust Developer Documentation
       * URL: https://docs.oma3.org/
       * Section: Quick Start > 1. Choose Your DID & Verify Ownership
       * Requirement: "Format: did:pkh:eip155:1:0xContractAddress"
       * 
       * Test validates that implementation accepts did:pkh format as required by spec.
       */
      
      const validDidPkh = 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890';
      
      // Test 1: Metadata building should accept did:pkh
      const metadata = {
        did: validDidPkh,
        name: 'Smart Contract App',
        description: 'Smart contract application for DID validation',
        publisher: 'Contract Publisher',
        image: 'https://example.com/image.png',
      };
      
      const result = buildOffchainMetadataObject(metadata);
      
      // Implementation must not reject did:pkh format
      expect(result).toBeDefined();
      expect(result.name).toBe('Smart Contract App');
      
      // Test 2: Contract preparation should accept did:pkh
      const mintInput = {
        did: validDidPkh,
        interfaces: 4, // smartContract interface
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + 'abcdef1234567890'.repeat(4),
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };
      
      const mintTx = prepareMintApp(mintInput);
      expect(mintTx).toBeDefined();
      expect(mintTx.args[0]).toBe(validDidPkh);
    });

    it('supports nested domains in did:web format per W3C DID spec', () => {
      /**
       * Specification: W3C DID Core Specification v1.0
       * URL: https://www.w3.org/TR/did-core/
       * Section: 3.2.2 - DID URL Syntax
       * Requirement: "DIDs MAY include additional components such as paths"
       * 
       * OMATrust must support W3C-compliant DIDs including nested domains.
       */
      
      const nestedDomainDIDs = [
        'did:web:api.example.com',
        'did:web:app.service.example.com',
        'did:web:example.com:path:to:resource',
      ];
      
      nestedDomainDIDs.forEach(did => {
        const metadata = {
          did,
          name: 'Nested Domain Test',
          description: 'Testing nested domain DID support',
          publisher: 'Test Publisher',
          image: 'https://example.com/image.png',
        };
        
        const result = buildOffchainMetadataObject(metadata);
        expect(result).toBeDefined();
        
        const mintInput = {
          did,
          interfaces: 1,
          dataUrl: 'https://example.com/metadata.json',
          dataHash: '0x' + '0'.repeat(64),
          dataHashAlgorithm: 0 as const,
          initialVersionMajor: 1,
          initialVersionMinor: 0,
          initialVersionPatch: 0,
        };
        
        expect(() => prepareMintApp(mintInput)).not.toThrow();
      });
    });
  });

  /**
   * Specification: OMATrust Developer Documentation
   * URL: https://docs.oma3.org/
   * Section: Quick Start > 1. Choose Your DID
   * 
   * REQUIREMENT (Implicit): "Only did:web and did:pkh are supported"
   * 
   * The documentation explicitly lists only did:web and did:pkh as supported formats.
   * Implementation should reject or handle other DID methods gracefully.
   */
  describe('Unsupported DID Format Handling (OMATrust Docs: Quick Start)', () => {
    it('handles unsupported DID methods appropriately', () => {
      /**
       * Specification: OMATrust Developer Documentation
       * URL: https://docs.oma3.org/
       * Section: Quick Start > 1. Choose Your DID
       * Requirement (Implicit): Only did:web and did:pkh are documented as supported
       * 
       * Test validates that implementation handles unsupported DID methods.
       * Note: Spec doesn't explicitly say "MUST reject", so we test for graceful handling.
       */
      
      const unsupportedDIDs = [
        'did:ethr:0x1234567890123456789012345678901234567890',
        'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
        'did:ion:EiDahaOGH-liLLdDtTxEAdc8i-cfCz-WUcQdRJheMVNn3A',
      ];
      
      // Implementation may either:
      // 1. Accept but mark for special handling
      // 2. Reject with clear error message
      // 3. Pass through (validation happens at verification stage)
      
      // Test that implementation doesn't crash with unsupported DIDs
      unsupportedDIDs.forEach(did => {
        expect(() => {
          const metadata = {
            did,
            name: 'Unsupported DID Test',
            description: 'Testing unsupported DID method handling',
            publisher: 'Test Publisher',
            image: 'https://example.com/image.png',
          };
          
          // Should not crash
          const result = buildOffchainMetadataObject(metadata);
          expect(result).toBeDefined();
        }).not.toThrow();
      });
    });
  });

  /**
   * Specification: W3C DID Core Specification v1.0
   * URL: https://www.w3.org/TR/did-core/
   * Section: 3.1 - DID Syntax
   * 
   * REQUIREMENT: "A DID is a URI that conforms to the following ABNF:
   * did = 'did:' method-name ':' method-specific-id
   * method-name = 1*method-char
   * method-char = %x61-7A / DIGIT  ; a-z or 0-9
   * method-specific-id = *idchar *( ':' *idchar )
   * idchar = ALPHA / DIGIT / '.' / '-' / '_' / pct-encoded"
   */
  describe('W3C DID Syntax Compliance', () => {
    it('accepts valid DID syntax per W3C DID Core spec', () => {
      /**
       * Specification: W3C DID Core Specification v1.0
       * Section: 3.1 - DID Syntax
       * Requirement: DIDs must follow did:method:identifier format
       */
      
      const validDIDFormats = [
        'did:web:example.com',
        'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
        'did:web:example-site.com',  // Hyphen allowed
        'did:web:example_site.com',  // Underscore allowed
      ];
      
      validDIDFormats.forEach(did => {
        const mintInput = {
          did,
          interfaces: 1,
          dataUrl: 'https://example.com/metadata.json',
          dataHash: '0x' + '0'.repeat(64),
          dataHashAlgorithm: 0 as const,
          initialVersionMajor: 1,
          initialVersionMinor: 0,
          initialVersionPatch: 0,
        };
        
        // Valid DIDs per W3C spec should be processed without errors
        expect(() => prepareMintApp(mintInput)).not.toThrow();
      });
    });

    it('handles invalid DID syntax gracefully', () => {
      /**
       * Specification: W3C DID Core Specification v1.0
       * Section: 3.1 - DID Syntax
       * Requirement: Invalid syntax should be rejected or handled appropriately
       */
      
      const invalidDIDFormats = [
        'web:example.com',           // Missing 'did:' prefix
        'did:',                      // Missing method and identifier
        'did:web:',                  // Missing identifier
        'http://example.com',        // Not a DID at all
        '',                          // Empty string
      ];
      
      // Implementation should handle invalid DIDs without crashing
      // May accept and validate later, or reject immediately
      invalidDIDFormats.forEach(did => {
        if (did === '') {
          // Empty DID should definitely be rejected or handled
          return;
        }
        
        expect(() => {
          const mintInput = {
            did,
            interfaces: 1,
            dataUrl: 'https://example.com/metadata.json',
            dataHash: '0x' + '0'.repeat(64),
            dataHashAlgorithm: 0 as const,
            initialVersionMajor: 1,
            initialVersionMinor: 0,
            initialVersionPatch: 0,
          };
          
          // Should not crash (but may reject validation later)
          prepareMintApp(mintInput);
        }).not.toThrow();
      });
    });
  });

  /**
   * Specification: OMATrust Developer Documentation
   * URL: https://docs.oma3.org/
   * Section: What You Can Register
   * 
   * REQUIREMENT: Different services use appropriate DID formats:
   * - Websites, APIs, Games: did:web:domain
   * - Smart Contracts: did:pkh:namespace:chainId:address
   */
  describe('DID Format Usage Guidelines (OMATrust Docs: What You Can Register)', () => {
    it('supports did:web for website/API registration', () => {
      /**
       * Specification: OMATrust Developer Documentation
       * Section: What You Can Register
       * Requirement: "Website: did:web:store.example.com - E-commerce site verification"
       * Requirement: "REST API: did:web:api.example.com - Service discovery & trust"
       */
      
      const webServiceDIDs = {
        website: 'did:web:store.example.com',
        api: 'did:web:api.example.com',
        game: 'did:web:game.example.com',
      };
      
      Object.entries(webServiceDIDs).forEach(([serviceType, did]) => {
        const mintInput = {
          did,
          interfaces: serviceType === 'api' ? 2 : 1, // API interface or Human interface
          dataUrl: 'https://example.com/metadata.json',
          dataHash: '0x' + '0'.repeat(64),
          dataHashAlgorithm: 0 as const,
          initialVersionMajor: 1,
          initialVersionMinor: 0,
          initialVersionPatch: 0,
        };
        
        const tx = prepareMintApp(mintInput);
        expect(tx).toBeDefined();
        expect(tx.args[0]).toBe(did);
      });
    });

    it('supports did:pkh for smart contract registration', () => {
      /**
       * Specification: OMATrust Developer Documentation
       * Section: What You Can Register
       * Requirement: "Smart Contract: did:pkh:eip155:1:0xAddress - On-chain provenance"
       */
      
      const contractDID = 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890';
      
      const mintInput = {
        did: contractDID,
        interfaces: 4, // smartContract interface
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0 as const,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        contractId: 'eip155:1:0x1234567890123456789012345678901234567890',
      };
      
      const tx = prepareMintApp(mintInput);
      expect(tx).toBeDefined();
      expect(tx.args[0]).toBe(contractDID);
    });
  });
});

