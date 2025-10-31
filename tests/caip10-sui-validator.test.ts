import { describe, it, expect } from 'vitest';
import { validateSui, normalize0x32Bytes, isSuiAddress } from '@/lib/utils/caip10/validators/sui';

describe('Sui CAIP-10 validator', () => {
  describe('normalize0x32Bytes', () => {
    it('normalizes short address by left-padding', () => {
      const result = normalize0x32Bytes('0x1');
      expect(result).toBe('0x0000000000000000000000000000000000000000000000000000000000000001');
    });

    it('normalizes address with multiple digits', () => {
      const result = normalize0x32Bytes('0xabcd');
      expect(result).toBe('0x000000000000000000000000000000000000000000000000000000000000abcd');
    });

    it('preserves full 32-byte address', () => {
      const full = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const result = normalize0x32Bytes(full);
      expect(result).toBe(full);
    });

    it('converts to lowercase', () => {
      const result = normalize0x32Bytes('0xABCD');
      expect(result).toBe('0x000000000000000000000000000000000000000000000000000000000000abcd');
    });

    it('handles mixed case input', () => {
      const result = normalize0x32Bytes('0xAbCd1234Ef');
      expect(result).toBe('0x000000000000000000000000000000000000000000000000000000abcd1234ef');
    });

    it('returns error for address without 0x', () => {
      const result = normalize0x32Bytes('1234');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('must start with 0x');
    });

    it('returns error for non-hex characters', () => {
      const result = normalize0x32Bytes('0xghij');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('hexadecimal');
    });

    it('returns error for address exceeding 32 bytes', () => {
      const tooLong = '0x' + '1'.repeat(65);
      const result = normalize0x32Bytes(tooLong);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('exceeds 32 bytes');
    });

    it('handles exactly 64 hex characters', () => {
      const exact = '0x' + '1'.repeat(64);
      const result = normalize0x32Bytes(exact);
      expect(result).toBe(exact.toLowerCase());
    });

    it('handles zero address', () => {
      const result = normalize0x32Bytes('0x0');
      expect(result).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('handles max value', () => {
      const max = '0x' + 'f'.repeat(64);
      const result = normalize0x32Bytes(max);
      expect(result).toBe(max);
    });
  });

  describe('validateSui', () => {
    it('validates correct Sui mainnet address', () => {
      const result = validateSui('mainnet', '0x1');
      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBe('0x0000000000000000000000000000000000000000000000000000000000000001');
    });

    it('validates Sui testnet address', () => {
      const result = validateSui('testnet', '0x1');
      expect(result.valid).toBe(true);
    });

    it('validates Sui devnet address', () => {
      const result = validateSui('devnet', '0x1');
      expect(result.valid).toBe(true);
    });

    it('accepts reference in any case', () => {
      const lower = validateSui('mainnet', '0x1');
      const upper = validateSui('MAINNET', '0x1');
      const mixed = validateSui('MainNet', '0x1');

      expect(lower.valid).toBe(true);
      expect(upper.valid).toBe(true);
      expect(mixed.valid).toBe(true);
    });

    it('rejects invalid network reference', () => {
      const result = validateSui('invalidnet', '0x1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mainnet, testnet, devnet');
    });

    it('normalizes short address', () => {
      const result = validateSui('mainnet', '0xabc');
      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBe('0x0000000000000000000000000000000000000000000000000000000000000abc');
    });

    it('normalizes full-length address', () => {
      const full = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const result = validateSui('mainnet', full);
      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBe(full);
    });

    it('rejects address without 0x prefix', () => {
      const result = validateSui('mainnet', '1234');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must start with 0x');
    });

    it('rejects address with non-hex characters', () => {
      const result = validateSui('mainnet', '0xghij');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hexadecimal');
    });

    it('rejects address exceeding 32 bytes', () => {
      const tooLong = '0x' + '1'.repeat(65);
      const result = validateSui('mainnet', tooLong);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds 32 bytes');
    });

    it('handles uppercase hex in address', () => {
      const result = validateSui('mainnet', '0xABCD');
      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBe('0x000000000000000000000000000000000000000000000000000000000000abcd');
    });

    it('handles zero address', () => {
      const result = validateSui('mainnet', '0x0');
      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('handles max value address', () => {
      const max = '0x' + 'f'.repeat(64);
      const result = validateSui('mainnet', max);
      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBe(max);
    });
  });

  describe('isSuiAddress', () => {
    it('returns true for short valid address', () => {
      expect(isSuiAddress('0x1')).toBe(true);
    });

    it('returns true for full-length valid address', () => {
      const full = '0x0000000000000000000000000000000000000000000000000000000000000001';
      expect(isSuiAddress(full)).toBe(true);
    });

    it('returns true for uppercase hex', () => {
      expect(isSuiAddress('0xABCD')).toBe(true);
    });

    it('returns true for mixed case hex', () => {
      expect(isSuiAddress('0xAbCd')).toBe(true);
    });

    it('returns false for address without 0x', () => {
      expect(isSuiAddress('1234')).toBe(false);
    });

    it('returns false for address with non-hex characters', () => {
      expect(isSuiAddress('0xghij')).toBe(false);
    });

    it('returns false for address exceeding 64 hex chars', () => {
      const tooLong = '0x' + '1'.repeat(65);
      expect(isSuiAddress(tooLong)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isSuiAddress('')).toBe(false);
    });

    it('returns false for just 0x', () => {
      expect(isSuiAddress('0x')).toBe(false);
    });

    it('returns true for zero', () => {
      expect(isSuiAddress('0x0')).toBe(true);
    });

    it('returns true for various lengths up to 64 chars', () => {
      for (let len = 1; len <= 64; len++) {
        const addr = '0x' + '1'.repeat(len);
        expect(isSuiAddress(addr)).toBe(true);
      }
    });

    it('returns false for addresses with special characters', () => {
      expect(isSuiAddress('0x123-456')).toBe(false);
      expect(isSuiAddress('0x123+456')).toBe(false);
      expect(isSuiAddress('0x123 456')).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('validates and normalizes in one flow', () => {
      const short = '0x2';
      const result = validateSui('mainnet', short);
      
      expect(result.valid).toBe(true);
      expect(isSuiAddress(short)).toBe(true);
      expect(result.normalizedAddress).toBe('0x0000000000000000000000000000000000000000000000000000000000000002');
    });

    it('handles common Sui system addresses', () => {
      const systemAddresses = [
        { addr: '0x1', normalized: '0x0000000000000000000000000000000000000000000000000000000000000001' },
        { addr: '0x2', normalized: '0x0000000000000000000000000000000000000000000000000000000000000002' },
        { addr: '0x3', normalized: '0x0000000000000000000000000000000000000000000000000000000000000003' },
        { addr: '0x0', normalized: '0x0000000000000000000000000000000000000000000000000000000000000000' },
      ];

      systemAddresses.forEach(({ addr, normalized }) => {
        const result = validateSui('mainnet', addr);
        expect(result.valid).toBe(true);
        expect(result.normalizedAddress).toBe(normalized);
        expect(isSuiAddress(addr)).toBe(true);
      });
    });

    it('validates complete CAIP-10 flow', () => {
      const networks = ['mainnet', 'testnet', 'devnet'];
      const address = '0xabcd1234';

      networks.forEach(network => {
        const result = validateSui(network, address);
        expect(result.valid).toBe(true);
        expect(result.normalizedAddress?.startsWith('0x')).toBe(true);
        expect(result.normalizedAddress?.length).toBe(66); // 0x + 64 chars
      });
    });

    it('rejects common mistakes', () => {
      const mistakes = [
        { ref: 'mainnet', addr: 'abcd1234' }, // missing 0x
        { ref: 'ethereum', addr: '0x1' }, // wrong network
        { ref: 'mainnet', addr: '0xGHIJ' }, // invalid hex
        { ref: 'mainnet', addr: '0x' + '1'.repeat(65) }, // too long
      ];

      mistakes.forEach(({ ref, addr }) => {
        const result = validateSui(ref, addr);
        expect(result.valid).toBe(false);
      });
    });
  });
});

