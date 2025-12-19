import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ethers } from 'ethers';
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
  PROOF_PURPOSE,
  buildPkhDid,
  computeDidHash,
  constructSeed,
  hashSeed,
  type ProofPurpose,
} from '@/lib/verification/onchain-transfer';

// Mock ethers
vi.mock('ethers', () => ({
  ethers: {
    keccak256: vi.fn(),
    toUtf8Bytes: vi.fn(),
    formatUnits: vi.fn(),
  },
}));

// Mock canonicalize (JCS canonicalization)
vi.mock('canonicalize', () => ({
  default: vi.fn((obj: any) => JSON.stringify(obj)),
}));

describe('Onchain Transfer Verification (OMATrust Specification §5.3.6)', () => {
  describe('CHAIN_CONFIGS', () => {
    it('contains expected chain configurations with base per proof purpose', () => {
      // Per OMATrust spec §5.3.6.2, BASE is per-chain, per-purpose
      expect(CHAIN_CONFIGS[1]).toEqual({
        decimals: 18,
        symbol: 'ETH',
        blockTime: 12,
        explorer: 'https://etherscan.io',
        base: {
          [PROOF_PURPOSE.SHARED_CONTROL]: BigInt('100000000000000'),    // 1e14 wei
          [PROOF_PURPOSE.COMMERCIAL_TX]: BigInt('1000000000000'),       // 1e12 wei
        },
      });

      expect(CHAIN_CONFIGS[8453]).toEqual({
        decimals: 18,
        symbol: 'ETH',
        blockTime: 2,
        explorer: 'https://basescan.org',
        base: {
          [PROOF_PURPOSE.SHARED_CONTROL]: BigInt('100000000000000'),
          [PROOF_PURPOSE.COMMERCIAL_TX]: BigInt('1000000000000'),
        },
      });

      // Polygon now uses POL symbol (not MATIC) per spec
      expect(CHAIN_CONFIGS[137]).toEqual({
        decimals: 18,
        symbol: 'POL',
        blockTime: 2,
        explorer: 'https://polygonscan.com',
        base: {
          [PROOF_PURPOSE.SHARED_CONTROL]: BigInt('100000000000000'),
          [PROOF_PURPOSE.COMMERCIAL_TX]: BigInt('1000000000000'),
        },
      });
    });

    it('includes OMAchain Testnet configuration with different base values', () => {
      expect(CHAIN_CONFIGS[66238]).toEqual({
        decimals: 18,
        symbol: 'OMA',
        blockTime: 3,
        explorer: 'https://explorer.testnet.chain.oma3.org',
        base: {
          [PROOF_PURPOSE.SHARED_CONTROL]: BigInt('10000000000000000'),  // 1e16 wei (0.01 OMA)
          [PROOF_PURPOSE.COMMERCIAL_TX]: BigInt('100000000000000'),     // 1e14 wei (0.0001 OMA)
        },
      });
    });

    it('has different BASE values for different proof purposes', () => {
      const config = CHAIN_CONFIGS[1];
      expect(config.base[PROOF_PURPOSE.SHARED_CONTROL]).not.toBe(config.base[PROOF_PURPOSE.COMMERCIAL_TX]);
      expect(config.base[PROOF_PURPOSE.SHARED_CONTROL]).toBeGreaterThan(config.base[PROOF_PURPOSE.COMMERCIAL_TX]);
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
        base: {
          [PROOF_PURPOSE.SHARED_CONTROL]: BigInt('100000000000000'),
          [PROOF_PURPOSE.COMMERCIAL_TX]: BigInt('1000000000000'),
        },
      });
    });

    it('throws error for unknown chain (per OMATrust spec)', () => {
      // Per spec, getChainConfig should throw for unsupported chains
      expect(() => {
        getChainConfig(999999);
      }).toThrow(/tx-encoded-value not supported for chain/);
    });
  });

  describe('getChainConstants', () => {
    it('calculates constants for 18-decimal chain with proofPurpose', () => {
      // Per spec §5.3.6.2, getChainConstants requires proofPurpose
      const constants = getChainConstants(1, PROOF_PURPOSE.SHARED_CONTROL);
      expect(constants.base).toBe(BigInt('100000000000000')); // 1e14
      expect(constants.range).toBe(BigInt('10000000000000')); // floor(BASE / 10) = 1e13
    });

    it('calculates different constants for different proof purposes', () => {
      const sharedControl = getChainConstants(1, PROOF_PURPOSE.SHARED_CONTROL);
      const commercialTx = getChainConstants(1, PROOF_PURPOSE.COMMERCIAL_TX);
      
      // Different proof purposes have different BASE values
      expect(sharedControl.base).not.toBe(commercialTx.base);
      expect(sharedControl.base).toBeGreaterThan(commercialTx.base);
      
      // RANGE = floor(BASE / 10) for both
      expect(sharedControl.range).toBe(sharedControl.base / BigInt(10));
      expect(commercialTx.range).toBe(commercialTx.base / BigInt(10));
    });

    it('calculates RANGE as floor(BASE / 10) per spec', () => {
      const constants = getChainConstants(1, PROOF_PURPOSE.SHARED_CONTROL);
      const expectedRange = constants.base / BigInt(10);
      expect(constants.range).toBe(expectedRange);
    });
  });

  describe('computeDidHash', () => {
    beforeEach(() => {
      vi.mocked(ethers.toUtf8Bytes).mockReturnValue(new Uint8Array([1, 2, 3]));
      vi.mocked(ethers.keccak256).mockReturnValue('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    });

    it('canonicalizes DID (lowercase, trim) before hashing', () => {
      const hash = computeDidHash('  DID:PKH:EIP155:1:0X123  ');
      
      expect(ethers.toUtf8Bytes).toHaveBeenCalledWith('did:pkh:eip155:1:0x123');
      expect(ethers.keccak256).toHaveBeenCalled();
    });
  });

  describe('constructSeed', () => {
    beforeEach(() => {
      vi.mocked(ethers.toUtf8Bytes).mockReturnValue(new Uint8Array([1, 2, 3]));
    });

    it('constructs JCS-canonicalized seed per spec §5.3.6.3', () => {
      const subjectDidHash = '0xsubject';
      const counterpartyDidHash = '0xcounterparty';
      const proofPurpose = PROOF_PURPOSE.SHARED_CONTROL;
      
      const seedBytes = constructSeed(subjectDidHash, counterpartyDidHash, proofPurpose);
      
      // Should use JCS canonicalization (mocked via canonicalize)
      expect(ethers.toUtf8Bytes).toHaveBeenCalled();
      expect(seedBytes).toBeInstanceOf(Uint8Array);
    });
  });

  describe('calculateTransferAmount', () => {
    beforeEach(() => {
      vi.mocked(ethers.toUtf8Bytes).mockReturnValue(new Uint8Array([1, 2, 3]));
      vi.mocked(ethers.keccak256)
        .mockReturnValueOnce('0xsubjectHash')
        .mockReturnValueOnce('0xcounterpartyHash')
        .mockReturnValueOnce('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    });

    it('calculates transfer amount per spec §5.3.6.2 formula', () => {
      // Formula: Amount = BASE(proofPurpose, chainId) + (U256(H(Seed)) mod RANGE)
      const subjectDid = 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890';
      const counterpartyDid = 'did:pkh:eip155:1:0x9876543210987654321098765432109876543210';
      const chainId = 1;
      const proofPurpose = PROOF_PURPOSE.SHARED_CONTROL;
      
      const amount = calculateTransferAmount(subjectDid, counterpartyDid, chainId, proofPurpose);
      
      // Should compute didHash for both DIDs
      expect(ethers.keccak256).toHaveBeenCalled();
      
      // Amount should be BASE + (hash mod RANGE)
      const { base, range } = getChainConstants(chainId, proofPurpose);
      const hashValue = BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
      const expectedOffset = hashValue % range;
      const expectedAmount = base + expectedOffset;
      
      expect(amount).toBe(expectedAmount);
    });

    it('uses different BASE values for different proof purposes', () => {
      const subjectDid = 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890';
      const counterpartyDid = 'did:pkh:eip155:1:0x9876543210987654321098765432109876543210';
      
      const sharedControlAmount = calculateTransferAmount(
        subjectDid,
        counterpartyDid,
        1,
        PROOF_PURPOSE.SHARED_CONTROL
      );
      
      vi.mocked(ethers.keccak256).mockClear();
      vi.mocked(ethers.keccak256)
        .mockReturnValueOnce('0xsubjectHash')
        .mockReturnValueOnce('0xcounterpartyHash')
        .mockReturnValueOnce('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
      
      const commercialTxAmount = calculateTransferAmount(
        subjectDid,
        counterpartyDid,
        1,
        PROOF_PURPOSE.COMMERCIAL_TX
      );
      
      // Different proof purposes should produce different amounts (due to different BASE)
      expect(sharedControlAmount).not.toBe(commercialTxAmount);
    });

    it('handles different chain IDs', () => {
      const subjectDid = 'did:pkh:eip155:8453:0x1234567890123456789012345678901234567890';
      const counterpartyDid = 'did:pkh:eip155:8453:0x9876543210987654321098765432109876543210';
      
      calculateTransferAmount(
        subjectDid,
        counterpartyDid,
        8453,
        PROOF_PURPOSE.SHARED_CONTROL
      );
      
      // Should compute didHash for Base chain DIDs
      expect(ethers.keccak256).toHaveBeenCalled();
    });
  });

  describe('formatTransferAmount', () => {
    beforeEach(() => {
      vi.mocked(ethers.formatUnits).mockReturnValue('1.234567890123456789');
    });

    it('formats amount with proper decimals and symbol', () => {
      const result = formatTransferAmount(BigInt('1234567890123456789'), 1);

      expect(ethers.formatUnits).toHaveBeenCalledWith(BigInt('1234567890123456789'), 18);
      expect(result).toEqual({
        formatted: '1.234567890123456789',
        symbol: 'ETH',
        wei: '1234567890123456789',
      });
    });

    it('formats amount for Polygon with POL symbol', () => {
      const result = formatTransferAmount(BigInt('1000000000000000000'), 137);

      expect(result.symbol).toBe('POL');
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
      expect(() => {
        getExplorerTxUrl(999999, '0x1234567890abcdef');
      }).toThrow();
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

  describe('buildPkhDid', () => {
    it('builds did:pkh DID from chain ID and address', () => {
      const did = buildPkhDid(1, '0x1234567890123456789012345678901234567890');
      expect(did).toBe('did:pkh:eip155:1:0x1234567890123456789012345678901234567890');
    });

    it('normalizes address to lowercase', () => {
      const did = buildPkhDid(1, '0X1234567890123456789012345678901234567890');
      expect(did).toBe('did:pkh:eip155:1:0x1234567890123456789012345678901234567890');
    });
  });

  describe('PROOF_PURPOSE constants', () => {
    it('defines SHARED_CONTROL and COMMERCIAL_TX', () => {
      expect(PROOF_PURPOSE.SHARED_CONTROL).toBe('shared-control');
      expect(PROOF_PURPOSE.COMMERCIAL_TX).toBe('commercial-tx');
    });
  });
});
