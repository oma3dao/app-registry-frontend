import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CHAIN_CONFIGS,
  getChainConfig,
  getChainConstants,
  calculateTransferAmount,
  formatTransferAmount,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  estimateBlocksToSearch,
  parseCaip10,
  getChainIdFromDid,
  isChainSupported,
} from '@/lib/verification/onchain-transfer';

// Use actual ethers for these tests (unmock the global mock from setup.ts)
vi.unmock('ethers');

describe('Onchain Transfer Verification', () => {
  describe('CHAIN_CONFIGS', () => {
    it('contains expected chain configurations', () => {
      expect(CHAIN_CONFIGS[1]).toEqual({
        decimals: 18,
        symbol: 'ETH',
        blockTime: 12,
        explorer: 'https://etherscan.io',
      });

      expect(CHAIN_CONFIGS[8453]).toEqual({
        decimals: 18,
        symbol: 'ETH',
        blockTime: 2,
        explorer: 'https://basescan.org',
      });

      expect(CHAIN_CONFIGS[137]).toEqual({
        decimals: 18,
        symbol: 'MATIC',
        blockTime: 2,
        explorer: 'https://polygonscan.com',
      });
    });
  });

  describe('getChainConfig', () => {
    it('returns config for known chain', () => {
      const config = getChainConfig(1);
      expect(config).toEqual({
        decimals: 18,
        symbol: 'ETH',
        blockTime: 12,
        explorer: 'https://etherscan.io',
      });
    });

    it('throws error for unknown chain', () => {
      expect(() => getChainConfig(999999)).toThrow('tx-encoded-value not supported for chain 999999');
    });
  });

  describe('getChainConstants', () => {
    it('calculates constants for 18-decimal chain', () => {
      const constants = getChainConstants(1, 'shared-control');
      expect(constants.base).toBe(BigInt('100000000000000')); // 10^14
      expect(constants.range).toBe(BigInt('10000000000000')); // 10^13
    });

    it('calculates constants for different proof purpose', () => {
      const constants = getChainConstants(1, 'commercial-tx');
      expect(constants.base).toBe(BigInt('1000000000000')); // 10^12
      expect(constants.range).toBe(BigInt('100000000000')); // 10^11
    });

    it('throws error for unsupported chain', () => {
      expect(() => getChainConstants(999999, 'shared-control')).toThrow('tx-encoded-value not supported for chain 999999');
    });
  });

  describe('calculateTransferAmount', () => {
    it('calculates transfer amount correctly', () => {
      const amount = calculateTransferAmount(
        'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
        '0x9876543210987654321098765432109876543210',
        1,
        'shared-control'
      );

      // Should return base + offset
      const base = BigInt('100000000000000'); // 10^14
      expect(amount).toBeGreaterThanOrEqual(base);
    });

    it('handles different chain IDs', () => {
      const amount = calculateTransferAmount(
        'did:pkh:eip155:8453:0x1234567890123456789012345678901234567890',
        '0x9876543210987654321098765432109876543210',
        8453,
        'shared-control'
      );

      // Base chain has same base as Ethereum
      const base = BigInt('100000000000000'); // 10^14
      expect(amount).toBeGreaterThanOrEqual(base);
    });

    it('normalizes DID and wallet addresses', () => {
      const amount1 = calculateTransferAmount(
        'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
        '0x9876543210987654321098765432109876543210',
        1,
        'shared-control'
      );
      
      const amount2 = calculateTransferAmount(
        '  DID:PKH:EIP155:1:0X1234567890123456789012345678901234567890  ',
        '0X9876543210987654321098765432109876543210',
        1,
        'shared-control'
      );

      // Both should produce the same amount after normalization
      expect(amount1).toBe(amount2);
    });
  });

  describe('formatTransferAmount', () => {
    it('formats amount with proper decimals and symbol', () => {
      const result = formatTransferAmount(BigInt('1234567890123456789'), 1);

      expect(result.symbol).toBe('ETH');
      expect(result.wei).toBe('1234567890123456789');
      // The formatted value should be the amount in ETH
      expect(result.formatted).toBeDefined();
    });

    it('formats amount for different chains', () => {
      const result = formatTransferAmount(BigInt('1000000000000000000'), 8453);

      expect(result.symbol).toBe('ETH');
      expect(result.formatted).toBe('1.0');
    });
  });

  describe('getExplorerTxUrl', () => {
    it('returns correct transaction URL for known chain', () => {
      const url = getExplorerTxUrl(1, '0x1234567890abcdef');
      expect(url).toBe('https://etherscan.io/tx/0x1234567890abcdef');
    });

    it('returns correct transaction URL for Base chain', () => {
      const url = getExplorerTxUrl(8453, '0xabcdef1234567890');
      expect(url).toBe('https://basescan.org/tx/0xabcdef1234567890');
    });

    it('throws error for unknown chain', () => {
      expect(() => getExplorerTxUrl(999999, '0x1234567890abcdef')).toThrow('tx-encoded-value not supported for chain 999999');
    });
  });

  describe('getExplorerAddressUrl', () => {
    it('returns correct address URL for known chain', () => {
      const url = getExplorerAddressUrl(1, '0x1234567890123456789012345678901234567890');
      expect(url).toBe('https://etherscan.io/address/0x1234567890123456789012345678901234567890');
    });

    it('returns correct address URL for Polygon chain', () => {
      const url = getExplorerAddressUrl(137, '0x1234567890123456789012345678901234567890');
      expect(url).toBe('https://polygonscan.com/address/0x1234567890123456789012345678901234567890');
    });
  });

  describe('estimateBlocksToSearch', () => {
    it('calculates blocks for Ethereum mainnet', () => {
      const blocks = estimateBlocksToSearch(1, 120); // 2 minutes
      expect(blocks).toBe(10); // 120 / 12 = 10
    });

    it('calculates blocks for Base chain', () => {
      const blocks = estimateBlocksToSearch(8453, 120); // 2 minutes
      expect(blocks).toBe(60); // 120 / 2 = 60
    });

    it('calculates blocks for Arbitrum', () => {
      const blocks = estimateBlocksToSearch(42161, 120); // 2 minutes
      expect(blocks).toBe(480); // 120 / 0.25 = 480
    });

    it('rounds up fractional blocks', () => {
      const blocks = estimateBlocksToSearch(1, 125); // 125 seconds
      expect(blocks).toBe(11); // Math.ceil(125 / 12) = 11
    });
  });

  describe('parseCaip10', () => {
    it('parses valid CAIP-10 address', () => {
      const result = parseCaip10('eip155:1:0x1234567890123456789012345678901234567890');
      expect(result).toEqual({
        chainId: 1,
        address: '0x1234567890123456789012345678901234567890',
      });
    });

    it('parses CAIP-10 with different chain ID', () => {
      const result = parseCaip10('eip155:8453:0xabcdef1234567890abcdef1234567890abcdef12');
      expect(result).toEqual({
        chainId: 8453,
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
      });
    });

    it('returns null for invalid format', () => {
      expect(parseCaip10('invalid')).toBeNull();
      expect(parseCaip10('eip155:1')).toBeNull();
      expect(parseCaip10('eip155:1:0x123:extra')).toBeNull();
    });

    it('returns null for non-eip155 namespace', () => {
      expect(parseCaip10('solana:mainnet:123456789')).toBeNull();
    });

    it('returns null for invalid chain ID', () => {
      expect(parseCaip10('eip155:invalid:0x1234567890123456789012345678901234567890')).toBeNull();
    });
  });

  describe('getChainIdFromDid', () => {
    it('extracts chain ID from valid did:pkh', () => {
      const chainId = getChainIdFromDid('did:pkh:eip155:1:0x1234567890123456789012345678901234567890');
      expect(chainId).toBe(1);
    });

    it('extracts chain ID from did:pkh with different chain', () => {
      const chainId = getChainIdFromDid('did:pkh:eip155:8453:0x1234567890123456789012345678901234567890');
      expect(chainId).toBe(8453);
    });

    it('returns null for non-did:pkh DID', () => {
      expect(getChainIdFromDid('did:web:example.com')).toBeNull();
      expect(getChainIdFromDid('did:key:123456789')).toBeNull();
    });

    it('returns null for invalid did:pkh format', () => {
      expect(getChainIdFromDid('did:pkh:invalid')).toBeNull();
      expect(getChainIdFromDid('did:pkh:eip155:invalid:0x123')).toBeNull();
    });

    it('returns null for non-eip155 namespace', () => {
      expect(getChainIdFromDid('did:pkh:solana:mainnet:123456789')).toBeNull();
    });
  });
});
