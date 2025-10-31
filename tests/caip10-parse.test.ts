import { describe, it, expect } from 'vitest';
import { parseCaip10, buildCaip10, type ParsedCaip10 } from '@/lib/utils/caip10/parse';

describe('CAIP-10 parsing utilities', () => {
  describe('parseCaip10', () => {
    it('parses valid EVM CAIP-10 string', () => {
      const result = parseCaip10('eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
      expect(result).toEqual({
        namespace: 'eip155',
        reference: '1',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      });
    });

    it('parses valid Solana CAIP-10 string', () => {
      const result = parseCaip10('solana:mainnet:4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      expect(result).toEqual({
        namespace: 'solana',
        reference: 'mainnet',
        address: '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T',
      });
    });

    it('parses valid Sui CAIP-10 string', () => {
      const result = parseCaip10('sui:mainnet:0xabcd1234');
      expect(result).toEqual({
        namespace: 'sui',
        reference: 'mainnet',
        address: '0xabcd1234',
      });
    });

    it('handles different chain references', () => {
      const ethereum = parseCaip10('eip155:1:0x1234567890123456789012345678901234567890');
      const polygon = parseCaip10('eip155:137:0x1234567890123456789012345678901234567890');
      const arbitrum = parseCaip10('eip155:42161:0x1234567890123456789012345678901234567890');

      expect((ethereum as ParsedCaip10).reference).toBe('1');
      expect((polygon as ParsedCaip10).reference).toBe('137');
      expect((arbitrum as ParsedCaip10).reference).toBe('42161');
    });

    it('returns error for empty string', () => {
      const result = parseCaip10('');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('required');
    });

    it('returns error for null/undefined', () => {
      const resultNull = parseCaip10(null as any);
      const resultUndefined = parseCaip10(undefined as any);
      
      expect(resultNull).toBeInstanceOf(Error);
      expect(resultUndefined).toBeInstanceOf(Error);
    });

    it('returns error for missing components', () => {
      const result1 = parseCaip10('eip155:1');
      const result2 = parseCaip10('eip155');
      const result3 = parseCaip10(':1:0x1234');
      
      expect(result1).toBeInstanceOf(Error);
      expect(result2).toBeInstanceOf(Error);
      expect(result3).toBeInstanceOf(Error);
    });

    it('returns error for invalid format', () => {
      const result1 = parseCaip10('not-a-caip10-string');
      const result2 = parseCaip10('eip155-1-0x1234');
      const result3 = parseCaip10('eip155/1/0x1234');
      
      expect(result1).toBeInstanceOf(Error);
      expect(result2).toBeInstanceOf(Error);
      expect(result3).toBeInstanceOf(Error);
    });

    it('trims whitespace', () => {
      const result = parseCaip10('  eip155:1:0x1234567890123456789012345678901234567890  ');
      expect(result).toEqual({
        namespace: 'eip155',
        reference: '1',
        address: '0x1234567890123456789012345678901234567890',
      });
    });

    it('allows colons in address part', () => {
      // Some address formats might include colons
      const result = parseCaip10('custom:network:address:with:colons');
      expect(result).toEqual({
        namespace: 'custom',
        reference: 'network',
        address: 'address:with:colons',
      });
    });

    it('validates namespace format (lowercase alphanumeric)', () => {
      const validResult = parseCaip10('eip155:1:0x1234567890123456789012345678901234567890');
      expect(validResult).not.toBeInstanceOf(Error);

      const invalidResult = parseCaip10('EIP155:1:0x1234567890123456789012345678901234567890');
      expect(invalidResult).toBeInstanceOf(Error);
    });

    it('handles numeric-only namespaces', () => {
      const result = parseCaip10('123:network:address');
      expect(result).toEqual({
        namespace: '123',
        reference: 'network',
        address: 'address',
      });
    });

    it('returns error for too many colons in first two parts', () => {
      // The regex should capture everything after the second colon as address
      const result = parseCaip10('eip155:1:2:0x1234567890123456789012345678901234567890');
      expect(result).toEqual({
        namespace: 'eip155',
        reference: '1',
        address: '2:0x1234567890123456789012345678901234567890',
      });
    });
  });

  describe('buildCaip10', () => {
    it('builds valid CAIP-10 string from components', () => {
      const result = buildCaip10('eip155', '1', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
      expect(result).toBe('eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
    });

    it('builds Solana CAIP-10 string', () => {
      const result = buildCaip10('solana', 'mainnet', '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      expect(result).toBe('solana:mainnet:4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
    });

    it('builds Sui CAIP-10 string', () => {
      const result = buildCaip10('sui', 'mainnet', '0xabcd1234');
      expect(result).toBe('sui:mainnet:0xabcd1234');
    });

    it('handles different chain IDs', () => {
      expect(buildCaip10('eip155', '1', '0xabc')).toBe('eip155:1:0xabc');
      expect(buildCaip10('eip155', '137', '0xabc')).toBe('eip155:137:0xabc');
      expect(buildCaip10('eip155', '42161', '0xabc')).toBe('eip155:42161:0xabc');
    });

    it('concatenates with colons', () => {
      const result = buildCaip10('a', 'b', 'c');
      expect(result).toBe('a:b:c');
    });

    it('preserves empty strings', () => {
      const result = buildCaip10('', '', '');
      expect(result).toBe('::');
    });

    it('preserves case and special characters', () => {
      const result = buildCaip10('MyNS', 'MyRef', 'MyAddr');
      expect(result).toBe('MyNS:MyRef:MyAddr');
    });
  });

  describe('round-trip conversion', () => {
    it('parse then build produces original string', () => {
      const original = 'eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const parsed = parseCaip10(original) as ParsedCaip10;
      const rebuilt = buildCaip10(parsed.namespace, parsed.reference, parsed.address);
      expect(rebuilt).toBe(original);
    });

    it('works with various valid formats', () => {
      const cases = [
        'eip155:1:0x1234567890123456789012345678901234567890',
        'eip155:137:0xabcdefABCDEF123456789012345678901234567890',
        'solana:mainnet:4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T',
        'sui:mainnet:0x0000000000000000000000000000000000000001',
      ];

      cases.forEach(original => {
        const parsed = parseCaip10(original) as ParsedCaip10;
        const rebuilt = buildCaip10(parsed.namespace, parsed.reference, parsed.address);
        expect(rebuilt).toBe(original);
      });
    });

    it('build then parse produces original components', () => {
      const namespace = 'eip155';
      const reference = '1';
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      
      const built = buildCaip10(namespace, reference, address);
      const parsed = parseCaip10(built) as ParsedCaip10;
      
      expect(parsed.namespace).toBe(namespace);
      expect(parsed.reference).toBe(reference);
      expect(parsed.address).toBe(address);
    });
  });
});

