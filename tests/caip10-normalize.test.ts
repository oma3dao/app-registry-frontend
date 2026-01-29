import { describe, it, expect } from 'vitest';
import { normalizeCaip10, type NormalizationResult } from '@/lib/utils/caip10/normalize';

describe('CAIP-10 normalization', () => {
  // Use simple test address
  const validEthAddress = '0x1234567890123456789012345678901234567890';
  
  describe('normalizeCaip10 - EVM (eip155)', () => {
    it('normalizes valid EVM CAIP-10 with checksum', () => {
      const result = normalizeCaip10(`eip155:1:${validEthAddress.toLowerCase()}`);
      expect(result.valid).toBe(true);
      expect(result.normalized).toBeDefined();
      expect(result.normalized).toContain('eip155:1:0x');
      expect(result.parsed).toBeDefined();
    });

    it('validates EVM CAIP-10 address', () => {
      const input = `eip155:1:${validEthAddress}`;
      const result = normalizeCaip10(input);
      expect(result.valid).toBe(true);
      expect(result.normalized).toBeDefined();
    });

    it.each(['1', '137', '42161'])('validates EVM chain ID %s', (chainId) => {
      const result = normalizeCaip10(`eip155:${chainId}:${validEthAddress}`);
      expect(result.valid).toBe(true);
    });

    it.each([
      { input: 'eip155:1:0xinvalidaddress', label: 'invalid EVM address' },
      { input: `eip155:1:${validEthAddress.slice(2)}`, label: 'EVM address without 0x' },
      { input: `eip155:mainnet:${validEthAddress}`, label: 'invalid chain ID' },
    ])('rejects $label', ({ input }) => {
      const result = normalizeCaip10(input);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('normalizeCaip10 - Solana', () => {
    it('normalizes valid Solana CAIP-10', () => {
      const result = normalizeCaip10('solana:mainnet:4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('solana:mainnet:4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
    });

    it('normalizes reference to lowercase', () => {
      const result = normalizeCaip10('solana:MAINNET:4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('solana:mainnet:4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
    });

    it.each(['mainnet', 'devnet', 'testnet'])('validates Solana %s network', (network) => {
      const result = normalizeCaip10(`solana:${network}:4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T`);
      expect(result.valid).toBe(true);
    });

    it.each([
      { input: 'solana:ethereum:4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T', label: 'invalid Solana network' },
      { input: 'solana:mainnet:0Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T', label: 'Solana address with invalid base58' },
    ])('rejects $label', ({ input }) => {
      const result = normalizeCaip10(input);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('validates token program addresses', () => {
      const result = normalizeCaip10('solana:mainnet:TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      expect(result.valid).toBe(true);
    });
  });

  describe('normalizeCaip10 - Sui', () => {
    it('normalizes valid Sui CAIP-10', () => {
      const result = normalizeCaip10('sui:mainnet:0x1');
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('sui:mainnet:0x0000000000000000000000000000000000000000000000000000000000000001');
    });

    it('normalizes reference to lowercase', () => {
      const result = normalizeCaip10('sui:MAINNET:0x1');
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('sui:mainnet:0x0000000000000000000000000000000000000000000000000000000000000001');
    });

    it('pads short addresses', () => {
      const result = normalizeCaip10('sui:mainnet:0xabc');
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('sui:mainnet:0x0000000000000000000000000000000000000000000000000000000000000abc');
    });

    it('preserves full-length addresses', () => {
      const full = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const result = normalizeCaip10(`sui:mainnet:${full}`);
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(`sui:mainnet:${full}`);
    });

    it.each(['mainnet', 'testnet', 'devnet'])('validates Sui %s network', (network) => {
      const result = normalizeCaip10(`sui:${network}:0x1`);
      expect(result.valid).toBe(true);
    });

    it.each([
      { input: 'sui:ethereum:0x1', label: 'invalid Sui network' },
      { input: 'sui:mainnet:1234', label: 'Sui address without 0x' },
      { input: 'sui:mainnet:0xghij', label: 'Sui address with non-hex' },
    ])('rejects $label', ({ input }) => {
      const result = normalizeCaip10(input);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('normalizeCaip10 - unsupported namespaces', () => {
    it.each([
      'bitcoin:mainnet:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      'cosmos:cosmoshub-3:cosmos1...',
      'polkadot:mainnet:1234...',
    ])('rejects unsupported namespace: %s', (input) => {
      const result = normalizeCaip10(input);
      expect(result.valid).toBe(false);
    });
  });

  describe('normalizeCaip10 - format validation', () => {
    it.each([
      { input: 'invalid-format', label: 'invalid CAIP-10 format' },
      { input: 'eip155:1', label: 'missing components' },
      { input: '', label: 'empty string' },
      { input: 'eip155:0x123', label: 'only one colon' },
    ])('rejects $label', ({ input }) => {
      const result = normalizeCaip10(input);
      expect(result.valid).toBe(false);
    });
  });

  describe('normalizeCaip10 - case sensitivity', () => {
    it('treats namespace as case-sensitive (must be lowercase)', () => {
      const lower = normalizeCaip10(`eip155:1:${validEthAddress}`);
      const upper = normalizeCaip10(`EIP155:1:${validEthAddress}`);

      expect(lower.valid).toBe(true);
      expect(upper.valid).toBe(false);
    });

    it('normalizes Solana reference to lowercase', () => {
      const result = normalizeCaip10('solana:MAINNET:4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      expect(result.valid).toBe(true);
      expect(result.normalized).toContain(':mainnet:');
    });

    it('normalizes Sui reference to lowercase', () => {
      const result = normalizeCaip10('sui:MAINNET:0x1');
      expect(result.valid).toBe(true);
      expect(result.normalized).toContain(':mainnet:');
    });
  });

  describe('normalizeCaip10 - parsed output', () => {
    it('includes parsed components on success', () => {
      const result = normalizeCaip10(`eip155:1:${validEthAddress}`);
      expect(result.valid).toBe(true);
      expect(result.parsed).toBeDefined();
      expect(result.parsed?.namespace).toBe('eip155');
      expect(result.parsed?.reference).toBe('1');
      expect(result.parsed?.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it('does not include parsed components on failure', () => {
      const result = normalizeCaip10('invalid');
      expect(result.valid).toBe(false);
      expect(result.parsed).toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('validates and normalizes multiple addresses', () => {
      const addresses = [
        `eip155:1:${validEthAddress.toLowerCase()}`,
        'solana:mainnet:4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T',
        'sui:mainnet:0x2',
      ];

      addresses.forEach(addr => {
        const result = normalizeCaip10(addr);
        expect(result.valid).toBe(true);
        expect(result.normalized).toBeDefined();
      });
    });

    it('provides helpful error messages', () => {
      const testCases = [
        { input: '', expectedError: 'required' },
        { input: 'eip155:mainnet:0x123', expectedError: 'chainId' },
        { input: 'solana:ethereum:123', expectedError: 'mainnet' },
        { input: 'bitcoin:mainnet:123', expectedError: 'Unsupported' },
      ];

      testCases.forEach(({ input, expectedError }) => {
        const result = normalizeCaip10(input);
        expect(result.valid).toBe(false);
        expect(result.error).toContain(expectedError);
      });
    });

    it('round-trip: parse, validate, rebuild', () => {
      const original = `eip155:1:${validEthAddress}`;
      const result = normalizeCaip10(original);
      
      expect(result.valid).toBe(true);
      expect(result.normalized).toBeDefined();
      expect(result.normalized).toContain('eip155:1:0x');
    });
  });
});

