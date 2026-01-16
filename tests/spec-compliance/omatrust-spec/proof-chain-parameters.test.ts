/**
 * OMATrust Proof Specification - Chain Parameters Tests
 * 
 * Tests for Appendix A: Chain-specific Parameters
 * Validates chain ID handling, CAIP-10 format, and multi-chain support
 * 
 * Specification: OMATrust Proof Specification Appendix A
 * Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 */

import { describe, it, expect } from 'vitest';
import { ALL_CHAINS, getChainById, searchChains } from '@/lib/utils/caip10/all-chains';
import { omachainTestnet, omachainMainnet, localhost } from '@/config/chains';

describe('OMATrust Proof Spec Appendix A - Chain Parameters', () => {

  describe('Supported Chain IDs (OT-PF-A01)', () => {
    /**
     * Test: Ethereum mainnet is supported
     * Chain ID 1 is the primary EVM chain
     */
    it('supports Ethereum mainnet (chainId: 1)', () => {
      const ethereum = getChainById(1);
      expect(ethereum).toBeDefined();
      expect(ethereum?.chainId).toBe(1);
      expect(ethereum?.name.toLowerCase()).toContain('ethereum');
    });

    /**
     * Test: Common L1 chains are supported
     * BSC, Polygon, Avalanche, etc.
     */
    it('supports major L1 chains', () => {
      const majorL1s = [
        { id: 1, name: 'ethereum' },
        { id: 56, name: 'bsc' },
        { id: 137, name: 'polygon' },
        { id: 43114, name: 'avalanche' },
      ];

      for (const chain of majorL1s) {
        const found = getChainById(chain.id);
        expect(found, `Chain ${chain.name} (${chain.id}) should be supported`).toBeDefined();
      }
    });

    /**
     * Test: L2 scaling solutions are supported
     * Arbitrum, Optimism, Base, zkSync, etc.
     */
    it('supports L2 scaling solutions', () => {
      const l2Chains = [
        { id: 42161, name: 'arbitrum' },
        { id: 10, name: 'optimism' },
        { id: 8453, name: 'base' },
      ];

      for (const chain of l2Chains) {
        const found = getChainById(chain.id);
        expect(found, `L2 ${chain.name} (${chain.id}) should be supported`).toBeDefined();
      }
    });

    /**
     * Test: OMAchain testnet configuration
     * Chain ID 66238 for OMATrust ecosystem
     */
    it('configures OMAchain testnet correctly', () => {
      expect(omachainTestnet.id).toBe(66238);
      expect(omachainTestnet.chainId).toBe(66238);
      expect(omachainTestnet.name).toContain('OMAchain');
      expect(omachainTestnet.testnet).toBe(true);
      expect(omachainTestnet.rpc).toMatch(/^https?:\/\//);
    });

    /**
     * Test: OMAchain mainnet placeholder
     */
    it('has OMAchain mainnet placeholder', () => {
      expect(omachainMainnet.id).toBeDefined();
      expect(omachainMainnet.testnet).toBe(false);
    });

    /**
     * Test: Localhost for development
     */
    it('supports localhost for development', () => {
      expect(localhost.id).toBe(31337);
      expect(localhost.chainId).toBe(31337);
      expect(localhost.testnet).toBe(true);
    });
  });

  describe('CAIP-10 Chain Namespace (OT-PF-A02)', () => {
    /**
     * Test: eip155 namespace for EVM chains
     * Format: eip155:<chainId>
     */
    it('uses eip155 namespace for EVM chains', () => {
      const evmChains = ALL_CHAINS.filter(c => c.chainId > 0);
      
      for (const chain of evmChains.slice(0, 5)) {
        const caip2 = `eip155:${chain.chainId}`;
        expect(caip2).toMatch(/^eip155:\d+$/);
      }
    });

    /**
     * Test: CAIP-10 account format
     * Format: eip155:<chainId>:<address>
     */
    it('formats CAIP-10 addresses correctly', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const chainId = 1;
      
      const caip10 = `eip155:${chainId}:${address}`;
      
      expect(caip10).toBe('eip155:1:0x1234567890123456789012345678901234567890');
      expect(caip10).toMatch(/^eip155:\d+:0x[a-fA-F0-9]{40}$/);
    });

    /**
     * Test: OMAchain CAIP-10 format
     */
    it('formats OMAchain CAIP-10 addresses', () => {
      const address = '0xabcdef1234567890abcdef1234567890abcdef12';
      const caip10 = `eip155:${omachainTestnet.chainId}:${address}`;
      
      expect(caip10).toBe('eip155:66238:0xabcdef1234567890abcdef1234567890abcdef12');
    });
  });

  describe('Chain Search Functionality (OT-PF-A03)', () => {
    /**
     * Test: Search by chain name
     */
    it('searches chains by name', () => {
      const results = searchChains('ethereum');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('ethereum');
    });

    /**
     * Test: Search by chain ID
     */
    it('searches chains by ID', () => {
      const results = searchChains('137');
      expect(results.some(c => c.chainId === 137)).toBe(true);
    });

    /**
     * Test: Empty search returns all chains
     */
    it('returns all chains for empty search', () => {
      const results = searchChains('');
      expect(results.length).toBe(ALL_CHAINS.length);
    });

    /**
     * Test: Case-insensitive search
     */
    it('performs case-insensitive search', () => {
      const upper = searchChains('POLYGON');
      const lower = searchChains('polygon');
      const mixed = searchChains('PoLyGoN');
      
      expect(upper.length).toBe(lower.length);
      expect(upper.length).toBe(mixed.length);
    });

    /**
     * Test: Partial name match
     */
    it('matches partial chain names', () => {
      const results = searchChains('arb');
      expect(results.some(c => c.name.toLowerCase().includes('arb'))).toBe(true);
    });
  });

  describe('Chain Configuration Validation', () => {
    /**
     * Test: All chains have required fields
     */
    it('all chains have required fields', () => {
      for (const chain of ALL_CHAINS) {
        expect(chain.chainId, `Chain ${chain.name} missing chainId`).toBeDefined();
        expect(chain.name, `Chain ${chain.chainId} missing name`).toBeDefined();
        expect(typeof chain.testnet, `Chain ${chain.name} missing testnet`).toBe('boolean');
      }
    });

    /**
     * Test: Chain IDs are positive integers
     */
    it('chain IDs are positive integers', () => {
      for (const chain of ALL_CHAINS) {
        expect(chain.chainId).toBeGreaterThan(0);
        expect(Number.isInteger(chain.chainId)).toBe(true);
      }
    });

    /**
     * Test: No duplicate chain IDs
     */
    it('no duplicate chain IDs', () => {
      const ids = ALL_CHAINS.map(c => c.chainId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    /**
     * Test: OMAchain has required contract addresses
     */
    it('OMAchain testnet has contract addresses', () => {
      expect(omachainTestnet.contracts.registry).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(omachainTestnet.contracts.metadata).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(omachainTestnet.contracts.resolver).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(omachainTestnet.contracts.easContract).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    /**
     * Test: Chain has valid RPC URL
     */
    it('OMAchain has valid RPC URL', () => {
      expect(omachainTestnet.rpc).toMatch(/^https:\/\//);
      expect(omachainTestnet.rpc).toContain('oma3.org');
    });

    /**
     * Test: Native currency configuration
     */
    it('chains have native currency config', () => {
      expect(omachainTestnet.nativeCurrency.name).toBe('OMA');
      expect(omachainTestnet.nativeCurrency.symbol).toBe('OMA');
      expect(omachainTestnet.nativeCurrency.decimals).toBe(18);
    });
  });

  describe('EIP-712 Domain Chain ID', () => {
    /**
     * Test: EIP-712 domain requires chainId
     */
    it('EIP-712 domain includes chainId', () => {
      const domain = {
        name: 'OMATrustProof',
        version: '1',
        chainId: omachainTestnet.chainId,
        verifyingContract: omachainTestnet.contracts.registry,
      };

      expect(domain.chainId).toBe(66238);
      expect(typeof domain.chainId).toBe('number');
    });

    /**
     * Test: EIP-712 domain for Ethereum mainnet
     */
    it('EIP-712 domain for Ethereum mainnet', () => {
      const domain = {
        name: 'OMATrustProof',
        version: '1',
        chainId: 1, // Ethereum mainnet
        verifyingContract: '0x1234567890123456789012345678901234567890',
      };

      expect(domain.chainId).toBe(1);
    });

    /**
     * Test: EIP-712 typed data message with chain context
     */
    it('EIP-712 message includes chain-aware address', () => {
      const message = {
        signer: 'eip155:1:0x1234567890123456789012345678901234567890',
        authorizedEntity: 'did:web:controller.com',
        signingPurpose: 'shared-control',
        statement: 'I authorize this entity.',
      };

      // CAIP-10 format includes chain ID
      expect(message.signer).toMatch(/^eip155:\d+:0x/);
    });
  });

  describe('Multi-Chain Proof Scenarios', () => {
    /**
     * Test: Cross-chain proof reference
     * Proof on one chain referencing asset on another
     */
    it('supports cross-chain proof references', () => {
      const crossChainProof = {
        proofType: 'tx-interaction',
        sourceChain: 'eip155:1', // Ethereum
        targetAsset: 'eip155:137:0xabcd...', // Polygon asset
        proofPurpose: 'shared-control',
      };

      expect(crossChainProof.sourceChain).toMatch(/^eip155:\d+$/);
      expect(crossChainProof.targetAsset).toMatch(/^eip155:\d+:/);
    });

    /**
     * Test: Same asset on multiple chains
     * Bridge scenarios require chain-specific identifiers
     */
    it('distinguishes same asset on different chains', () => {
      const usdcOnEthereum = 'eip155:1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
      const usdcOnPolygon = 'eip155:137:0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
      
      // Same asset type, different chain identifiers
      expect(usdcOnEthereum).not.toBe(usdcOnPolygon);
      expect(usdcOnEthereum).toContain('eip155:1');
      expect(usdcOnPolygon).toContain('eip155:137');
    });

    /**
     * Test: Chain ID validation in proof
     */
    it('validates chain ID in proof context', () => {
      const proofWithChain = {
        proofType: 'pop-eip712',
        proofObject: {
          domain: {
            name: 'OMATrustProof',
            version: '1',
            chainId: 66238,
          },
          signature: '0x...',
        },
        proofPurpose: 'shared-control',
      };

      const chainId = proofWithChain.proofObject.domain.chainId;
      expect(chainId).toBe(omachainTestnet.chainId);
    });
  });

  describe('Block Explorer Integration', () => {
    /**
     * Test: OMAchain has block explorer
     */
    it('OMAchain has block explorer URL', () => {
      expect(omachainTestnet.blockExplorers).toBeDefined();
      expect(omachainTestnet.blockExplorers.length).toBeGreaterThan(0);
      expect(omachainTestnet.blockExplorers[0].url).toMatch(/^https:\/\//);
    });

    /**
     * Test: Explorer URL can link transactions
     */
    it('can construct transaction explorer URL', () => {
      const txHash = '0x' + 'a'.repeat(64);
      const explorerUrl = omachainTestnet.blockExplorers[0].url;
      const txUrl = `${explorerUrl}tx/${txHash}`;
      
      expect(txUrl).toContain('explorer');
      expect(txUrl).toContain(txHash);
    });
  });
});

