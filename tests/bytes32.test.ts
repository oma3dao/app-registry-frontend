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
      expect(isBytes32Hex('0x0000000000000000000000000000000000000000000000000000000000000000')).toBe(true);
    });

    it.each([
      { val: '0000000000000000000000000000000000000000000000000000000000000000', label: 'no 0x prefix' },
      { val: '0x1234', label: 'too short' },
      { val: '0x' + 'a'.repeat(63), label: '63 chars' },
      { val: '0x' + 'a'.repeat(65), label: '65 chars' },
      { val: 123, label: 'number' },
      { val: null, label: 'null' },
      { val: undefined, label: 'undefined' },
      { val: {}, label: 'object' },
      { val: 'hello world', label: 'regular string' },
    ])('returns false for $label', ({ val }) => {
      expect(isBytes32Hex(val)).toBe(false);
    });
  });

  describe('safeDecodeBytes32', () => {
    it.each([null, undefined, ''])('returns empty string for %s', (val) => {
      expect(safeDecodeBytes32(val)).toBe('');
    });

    it.each([
      { input: 'plain text', expected: 'plain text', label: 'plain string' },
      { input: '0x68656c6c6f000000000000000000000000000000000000000000000000000000', expected: 'hello', label: 'hex string' },
      { input: { _hex: '0x68656c6c6f000000000000000000000000000000000000000000000000000000' }, expected: 'hello', label: 'object with _hex property' },
    ])('decodes $label correctly', ({ input, expected }) => {
      expect(safeDecodeBytes32(input)).toBe(expected);
    });
  });
});

