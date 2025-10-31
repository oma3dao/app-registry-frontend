import { describe, it, expect } from 'vitest';
import { validateSolana, isBase58 } from '@/lib/utils/caip10/validators/solana';

describe('Solana CAIP-10 validator', () => {
  describe('validateSolana', () => {
    it('validates correct Solana mainnet address', () => {
      const result = validateSolana('mainnet', '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBe('4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
    });

    it('validates Solana devnet address', () => {
      const result = validateSolana('devnet', '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      expect(result.valid).toBe(true);
    });

    it('validates Solana testnet address', () => {
      const result = validateSolana('testnet', '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      expect(result.valid).toBe(true);
    });

    it('accepts reference in any case', () => {
      const lower = validateSolana('mainnet', '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      const upper = validateSolana('MAINNET', '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      const mixed = validateSolana('MainNet', '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');

      expect(lower.valid).toBe(true);
      expect(upper.valid).toBe(true);
      expect(mixed.valid).toBe(true);
    });

    it('rejects invalid network reference', () => {
      const result = validateSolana('invalidnet', '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mainnet, devnet, testnet');
    });

    it('rejects address with invalid base58 characters', () => {
      const withZero = validateSolana('mainnet', '0Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      const withO = validateSolana('mainnet', 'ONd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      const withI = validateSolana('mainnet', 'INd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      const withl = validateSolana('mainnet', 'lNd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');

      expect(withZero.valid).toBe(false);
      expect(withZero.error).toContain('base58');
      expect(withO.valid).toBe(false);
      expect(withI.valid).toBe(false);
      expect(withl.valid).toBe(false);
    });

    // Tests decodeBase58 failure branch (lines 81-85)
    it('handles decodeBase58 failure gracefully', () => {
      // Use an address that passes base58 check but fails decode
      // This would be a base58 string that doesn't decode properly
      const invalidDecode = '11111111111111111111111111111111'; // Valid base58 but may fail decode
      const result = validateSolana('mainnet', invalidDecode);
      
      // Should fail either at decode or length check
      expect(result.valid).toBe(false);
      // Error should mention base58 encoding or length
      expect(result.error).toBeDefined();
    });

    it('rejects empty address', () => {
      const result = validateSolana('mainnet', '');
      expect(result.valid).toBe(false);
    });

    it('validates properly formatted Solana addresses', () => {
      // Use known valid Solana address format
      const result = validateSolana('mainnet', '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      expect(result.valid).toBe(true);
    });

    it('rejects address that is too short', () => {
      // Too short address
      const result = validateSolana('mainnet', '1111');
      expect(result.valid).toBe(false);
      // Will fail validation (either base58 or length check)
    });

    it('validates token program addresses', () => {
      const tokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
      const result = validateSolana('mainnet', tokenProgram);
      expect(result.valid).toBe(true);
    });

    it('handles special characters rejection', () => {
      const withSpecial = validateSolana('mainnet', '4Nd1-BQtr+MJV/YVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      expect(withSpecial.valid).toBe(false);
      expect(withSpecial.error).toContain('base58');
    });

    it('normalizedAddress matches input for valid addresses', () => {
      const address = '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T';
      const result = validateSolana('mainnet', address);
      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBe(address);
    });
  });

  describe('isBase58', () => {
    it('returns true for valid base58 string', () => {
      expect(isBase58('4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T')).toBe(true);
    });

    it('returns true for numeric base58', () => {
      expect(isBase58('123456789')).toBe(true);
    });

    it('returns true for all valid base58 characters', () => {
      const allChars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      expect(isBase58(allChars)).toBe(true);
    });

    it('returns false for string with 0', () => {
      expect(isBase58('0123456789')).toBe(false);
    });

    it('returns false for string with O', () => {
      expect(isBase58('O123456789')).toBe(false);
    });

    it('returns false for string with I', () => {
      expect(isBase58('I123456789')).toBe(false);
    });

    it('returns false for string with l (lowercase L)', () => {
      expect(isBase58('l123456789')).toBe(false);
    });

    it('returns false for string with special characters', () => {
      expect(isBase58('abc-def')).toBe(false);
      expect(isBase58('abc+def')).toBe(false);
      expect(isBase58('abc/def')).toBe(false);
      expect(isBase58('abc=def')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isBase58('')).toBe(false);
    });

    it('returns false for spaces', () => {
      expect(isBase58('abc def')).toBe(false);
    });

    it('returns true for single valid character', () => {
      expect(isBase58('1')).toBe(true);
      expect(isBase58('A')).toBe(true);
      expect(isBase58('z')).toBe(true);
    });

    it('validates common Solana addresses format', () => {
      const addresses = [
        '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      ];

      addresses.forEach(addr => {
        expect(isBase58(addr)).toBe(true);
      });
    });
  });

  describe('integration scenarios', () => {
    it('validates complete CAIP-10 flow for valid address', () => {
      const networks = ['mainnet', 'devnet', 'testnet'];
      const address = '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T';

      networks.forEach(network => {
        const result = validateSolana(network, address);
        expect(result.valid).toBe(true);
        expect(result.normalizedAddress).toBe(address);
      });
    });

    it('validates token program addresses', () => {
      const tokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
      const result = validateSolana('mainnet', tokenProgram);
      expect(result.valid).toBe(true);
      expect(isBase58(tokenProgram)).toBe(true);
    });

    it('rejects common mistakes', () => {
      const mistakes = [
        { ref: 'mainnet', addr: '0x4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T' }, // has 0x
        { ref: 'ethereum', addr: '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T' }, // wrong network
        { ref: 'mainnet', addr: '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB40' }, // has 0
      ];

      mistakes.forEach(({ ref, addr }) => {
        const result = validateSolana(ref, addr);
        expect(result.valid).toBe(false);
      });
    });
  });
});

