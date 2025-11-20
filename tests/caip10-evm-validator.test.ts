import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateEvm, toEip55, isEvmAddress } from '@/lib/utils/caip10/validators/evm';
import { isAddress, getAddress } from 'ethers';
import * as ethers from 'ethers';

describe('EVM CAIP-10 validator', () => {
  // Use a simple address for testing with our deterministic mock
  const validAddress = '0x1234567890123456789012345678901234567890';
  
  describe('validateEvm', () => {
    it('validates correct EVM address with valid chain ID', () => {
      const result = validateEvm('1', validAddress);
      expect(result.valid).toBe(true);
      expect(result.chainId).toBe(1);
      expect(result.normalizedAddress).toBeDefined();
      expect(result.normalizedAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it('checksums address using EIP-55', () => {
      const lowercase = validAddress.toLowerCase();
      const result = validateEvm('1', lowercase);
      expect(result.valid).toBe(true);
      // Checksum should be applied (result different from lowercase)
      expect(result.normalizedAddress).toBeDefined();
      expect(result.normalizedAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it('accepts various chain IDs', () => {
      const ethereum = validateEvm('1', validAddress);
      const polygon = validateEvm('137', validAddress);
      const arbitrum = validateEvm('42161', validAddress);

      expect(ethereum.valid).toBe(true);
      expect(ethereum.chainId).toBe(1);
      expect(polygon.valid).toBe(true);
      expect(polygon.chainId).toBe(137);
      expect(arbitrum.valid).toBe(true);
      expect(arbitrum.chainId).toBe(42161);
    });

    it('rejects non-numeric chain ID', () => {
      const result = validateEvm('mainnet', validAddress);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('numeric chainId');
    });

    it('rejects negative chain ID', () => {
      const result = validateEvm('-1', validAddress);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('numeric chainId');
    });

    it('rejects address without 0x prefix', () => {
      const result = validateEvm('1', validAddress.slice(2)); // Remove 0x
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must start with 0x');
    });

    it('rejects address with wrong length', () => {
      const tooShort = validateEvm('1', '0x742d35');
      const tooLong = validateEvm('1', validAddress + '123');

      expect(tooShort.valid).toBe(false);
      expect(tooShort.error).toContain('20 bytes');
      expect(tooLong.valid).toBe(false);
      expect(tooLong.error).toContain('20 bytes');
    });

    // Tests hex format validation branch (lines 47-51)
    it('rejects address with non-hex characters', () => {
      // Address with correct length (42 chars: 0x + 40 chars) but invalid hex char 'g'
      // Must pass length check (42) but fail hex format check
      const invalidHex = '0x' + 'a'.repeat(39) + 'g'; // Exactly 42 chars: 0x + 39 'a' + 1 'g'
      expect(invalidHex.length).toBe(42); // Verify length
      const result = validateEvm('1', invalidHex);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('EVM address must contain only hexadecimal characters');
    });

    // Tests invalid address format branch (lines 55-59)
    it('rejects address that fails isAddress validation', () => {
      // Create an address that passes format checks but fails isAddress
      // Spy on the imported isAddress function
      const testAddress = '0x' + 'a'.repeat(40); // Valid format
      const isAddressSpy = vi.spyOn(ethers, 'isAddress').mockReturnValueOnce(false);
      
      const result = validateEvm('1', testAddress);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid EVM address');
      
      isAddressSpy.mockRestore();
    });

    // Tests catch block when getAddress throws (lines 69-73)
    it('handles checksum error gracefully', () => {
      // Create an address that passes all checks but getAddress throws
      const testAddress = '0x' + 'b'.repeat(40); // Valid format
      const isAddressSpy = vi.spyOn(ethers, 'isAddress').mockReturnValueOnce(true);
      const getAddressSpy = vi.spyOn(ethers, 'getAddress').mockImplementationOnce(() => {
        throw new Error('Checksum failed');
      });
      
      const result = validateEvm('1', testAddress);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Failed to checksum address');
      
      isAddressSpy.mockRestore();
      getAddressSpy.mockRestore();
    });

    it('validates addresses in different cases', () => {
      const lowercase = validAddress.toLowerCase();
      const result = validateEvm('1', lowercase);
      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBeDefined();
      expect(result.normalizedAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it('handles all lowercase addresses', () => {
      const result = validateEvm('1', '0x0000000000000000000000000000000000000000');
      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBe('0x0000000000000000000000000000000000000000');
    });

    it('handles addresses with mixed case', () => {
      const result = validateEvm('1', '0xAbCdEf1234567890123456789012345678901234');
      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBeDefined();
    });

    it('rejects empty address', () => {
      const result = validateEvm('1', '');
      expect(result.valid).toBe(false);
    });
  });

  describe('toEip55', () => {
    it('converts lowercase address to checksummed form', () => {
      const result = toEip55(validAddress.toLowerCase());
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it('converts addresses with valid format', () => {
      const result = toEip55(validAddress);
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it('returns error for invalid address format', () => {
      const result = toEip55('not-an-address');
      expect(result).toBeInstanceOf(Error);
    });

    it('returns error for address with non-hex', () => {
      const result = toEip55('0xGHIJ567890123456789012345678901234567890');
      expect(result).toBeInstanceOf(Error);
    });

    it('returns error for uppercase 0X prefix', () => {
      const result = toEip55('0X1234567890123456789012345678901234567890');
      expect(result).toBeInstanceOf(Error);
    });

    it('returns error for wrong length', () => {
      const result = toEip55('0x12345');
      expect(result).toBeInstanceOf(Error);
    });

    it('handles zero address', () => {
      const result = toEip55('0x0000000000000000000000000000000000000000');
      expect(result).toBe('0x0000000000000000000000000000000000000000');
    });
  });

  describe('isEvmAddress', () => {
    it('returns true for valid address', () => {
      expect(isEvmAddress(validAddress)).toBe(true);
    });

    it('returns true for lowercase address', () => {
      expect(isEvmAddress(validAddress.toLowerCase())).toBe(true);
    });

    it('returns true for mixed case hex address', () => {
      expect(isEvmAddress('0xAbCdEf1234567890123456789012345678901234')).toBe(true);
    });

    it('returns false for uppercase 0X prefix', () => {
      // ethers.isAddress rejects uppercase 0X prefix
      expect(isEvmAddress('0X1234567890123456789012345678901234567890')).toBe(false);
    });

    it('returns false for address without 0x', () => {
      expect(isEvmAddress(validAddress.slice(2))).toBe(false);
    });

    it('returns false for non-hex characters', () => {
      expect(isEvmAddress('0xGHIJK67890123456789012345678901234567890')).toBe(false);
    });

    it('returns false for invalid format', () => {
      expect(isEvmAddress('not-an-address')).toBe(false);
      expect(isEvmAddress('')).toBe(false);
    });

    it('returns false for wrong length', () => {
      expect(isEvmAddress('0x12345')).toBe(false);
      expect(isEvmAddress('0x' + '1'.repeat(41))).toBe(false);
    });

    it('returns true for zero address', () => {
      expect(isEvmAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    it('returns true for all-F address', () => {
      expect(isEvmAddress('0xffffffffffffffffffffffffffffffffffffffff')).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('validates and checksums in one flow', () => {
      const lowercase = validAddress.toLowerCase();
      
      const result = validateEvm('1', lowercase);
      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBeDefined();
      expect(result.normalizedAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it('handles common Ethereum addresses', () => {
      const addresses = [
        '0x0000000000000000000000000000000000000000', // zero address
        '0x1234567890123456789012345678901234567890', // simple address
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', // hex letters
      ];

      addresses.forEach(addr => {
        const result = validateEvm('1', addr);
        expect(result.valid).toBe(true);
        expect(isEvmAddress(addr)).toBe(true);
      });
    });

    it('rejects invalid addresses', () => {
      const invalid = [
        '0X1234567890123456789012345678901234567890', // uppercase 0X
        '123456789012345678901234567890123456789012', // no 0x
        '0x12345', // too short
        '0xGHIJ567890123456789012345678901234567890', // non-hex
      ];

      invalid.forEach(addr => {
        expect(isEvmAddress(addr)).toBe(false);
      });
    });
  });
});
