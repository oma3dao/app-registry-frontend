import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hexToString,
  stringToBytes32,
  isBytes32Hex,
  safeDecodeBytes32,
} from '@/lib/utils/bytes32';

describe('bytes32 utilities', () => {
  describe('hexToString', () => {
    it('converts hex string to regular string', () => {
      // "hello" in hex
      const hex = '0x68656c6c6f000000000000000000000000000000000000000000000000000000';
      expect(hexToString(hex)).toBe('hello');
    });

    it('removes null bytes from converted string', () => {
      const hex = '0x68656c6c6f000000000000000000000000000000000000000000000000000000';
      const result = hexToString(hex);
      expect(result).toBe('hello');
      expect(result).not.toContain('\0');
    });

    it('handles object with _hex property', () => {
      const hexObj = {
        _hex: '0x68656c6c6f000000000000000000000000000000000000000000000000000000',
      };
      expect(hexToString(hexObj)).toBe('hello');
    });

    it('handles non-hex strings by returning them as is', () => {
      expect(hexToString('already a string')).toBe('already a string');
    });

    it('handles empty or null values', () => {
      expect(hexToString('')).toBe('');
      expect(hexToString(null)).toBe('');
      expect(hexToString(undefined)).toBe('');
    });

    it('handles invalid hex gracefully', () => {
      const result = hexToString('0xinvalid');
      expect(typeof result).toBe('string');
    });

    it('handles errors in hex conversion and returns empty string', () => {
      // Mock console.error to verify error is logged
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Use a spy on Buffer.from to simulate an error during conversion
      const originalBufferFrom = Buffer.from;
      vi.spyOn(Buffer, 'from').mockImplementationOnce(() => {
        throw new Error('Buffer conversion failed');
      });
      
      const result = hexToString('0xvalidhex');
      expect(result).toBe('');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error converting hex to string:', expect.any(Error));
      
      // Restore
      Buffer.from = originalBufferFrom;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('stringToBytes32', () => {
    it('converts string to bytes32 hex format', () => {
      const result = stringToBytes32('hello');
      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
      expect(result.startsWith('0x')).toBe(true);
      expect(result.length).toBe(66); // 0x + 64 hex chars
    });

    it('pads short strings to 32 bytes', () => {
      const result = stringToBytes32('hi');
      expect(result.length).toBe(66);
    });

    it('handles empty string', () => {
      const result = stringToBytes32('');
      expect(result.length).toBe(66);
      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('handles strings longer than 32 bytes', () => {
      const longString = 'a'.repeat(40); // Longer than 32 bytes
      const result = stringToBytes32(longString);
      // The function pads to 32 bytes, so strings longer than 32 bytes will result in longer hex
      expect(result.startsWith('0x')).toBe(true);
      expect(result).toMatch(/^0x[0-9a-f]+$/);
    });

    it('round-trip conversion works', () => {
      const original = 'test123';
      const hex = stringToBytes32(original);
      const decoded = hexToString(hex);
      expect(decoded).toBe(original);
    });
  });

  describe('isBytes32Hex', () => {
    it('returns true for valid bytes32 hex string', () => {
      const validHex = '0x0000000000000000000000000000000000000000000000000000000000000000';
      expect(isBytes32Hex(validHex)).toBe(true);
    });

    it('returns false for hex string without 0x prefix', () => {
      const noPrefix = '0000000000000000000000000000000000000000000000000000000000000000';
      expect(isBytes32Hex(noPrefix)).toBe(false);
    });

    it('returns false for hex string with wrong length', () => {
      expect(isBytes32Hex('0x1234')).toBe(false);
      expect(isBytes32Hex('0x' + 'a'.repeat(63))).toBe(false);
      expect(isBytes32Hex('0x' + 'a'.repeat(65))).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isBytes32Hex(123)).toBe(false);
      expect(isBytes32Hex(null)).toBe(false);
      expect(isBytes32Hex(undefined)).toBe(false);
      expect(isBytes32Hex({})).toBe(false);
    });

    it('returns false for regular strings', () => {
      expect(isBytes32Hex('hello world')).toBe(false);
    });
  });

  describe('safeDecodeBytes32', () => {
    it('returns empty string for null or undefined', () => {
      expect(safeDecodeBytes32(null)).toBe('');
      expect(safeDecodeBytes32(undefined)).toBe('');
      expect(safeDecodeBytes32('')).toBe('');
    });

    it('returns plain strings without decoding', () => {
      expect(safeDecodeBytes32('plain text')).toBe('plain text');
    });

    it('decodes hex strings', () => {
      const hex = '0x68656c6c6f000000000000000000000000000000000000000000000000000000';
      expect(safeDecodeBytes32(hex)).toBe('hello');
    });

    it('handles objects with _hex property', () => {
      const hexObj = {
        _hex: '0x68656c6c6f000000000000000000000000000000000000000000000000000000',
      };
      expect(safeDecodeBytes32(hexObj)).toBe('hello');
    });
  });
});

