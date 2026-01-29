// Tests for validation functions in validation.ts
import { validateVersion, validateUrl, validateDid, validateName, validateCaipAddress, validateCaip19Token } from '../src/lib/validation';

describe('validation', () => {
  // This test checks that validateUrl correctly validates URLs
  it('validates URLs', () => {
    expect(validateUrl('https://example.com')).toBe(true);
    expect(validateUrl('not-a-url')).toBe(false);
  });

  // This test checks that validateVersion correctly validates version strings
  it('validates version strings', () => {
    expect(validateVersion('1.0')).toBe(true); // valid major.minor
    expect(validateVersion('1.2.3')).toBe(true); // valid major.minor.patch
    expect(validateVersion('1')).toBe(false); // invalid, missing minor
    expect(validateVersion('')).toBe(false); // invalid, empty
    expect(validateVersion('1.a')).toBe(false); // invalid, non-numeric
  });

  // This test checks that validateUrl correctly validates URLs and length
  it('validates URLs with regex and length', () => {
    expect(validateUrl('https://example.com')).toBe(true); // valid
    expect(validateUrl('http://example.com')).toBe(true); // valid
    expect(validateUrl('ftp://example.com')).toBe(false); // invalid protocol
    expect(validateUrl('https://example.com/' + 'a'.repeat(240))).toBe(false); // too long
    expect(validateUrl('not-a-url')).toBe(false); // invalid
    expect(validateUrl('')).toBe(false); // empty
  });

  // This test checks that validateDid correctly validates DIDs
  it('validates DIDs', () => {
    expect(validateDid('did:example:123')).toBe(true); // valid
    expect(validateDid('did:web:example.com')).toBe(true); // valid
    expect(validateDid('did:bad')).toBe(false); // invalid, missing method-specific id
    expect(validateDid('')).toBe(false); // empty
    expect(validateDid('did:example:' + 'a'.repeat(200))).toBe(false); // too long
  });

  // This test checks that validateName correctly validates name length
  it('validates name length', () => {
    expect(validateName('Valid Name')).toBe(true); // valid
    expect(validateName('')).toBe(false); // empty
    expect(validateName('a'.repeat(33))).toBe(false); // too long
  });

  // This test checks that validateCaipAddress always returns true (placeholder)
  it('validates CAIP address (placeholder)', () => {
    expect(validateCaipAddress('')).toBe(true);
    expect(validateCaipAddress('eip155:1:0x123')).toBe(true);
  });

  describe('validateCaip19Token', () => {
    it.each(['', null, undefined] as const)('returns true for empty tokenId (optional): %s', (input) => {
      expect(validateCaip19Token(input as any)).toBe(true);
    });

    it.each([
      { tokenId: 'eip155:1', label: 'missing asset part' },
      { tokenId: 'erc20:0x123', label: 'missing chain part' },
      { tokenId: 'invalid', label: 'no separator' },
    ])('returns false when $label', ({ tokenId }) => {
      expect(validateCaip19Token(tokenId)).toBe(false);
    });

    it.each([
      'eip155/erc20:0x123',
      ':1/erc20:0x123',
      'eip155:/erc20:0x123',
      'eip155:1:extra/erc20:0x123',
    ])('returns false for invalid chain part format: %s', (tokenId) => {
      expect(validateCaip19Token(tokenId)).toBe(false);
    });

    it.each([
      'eip155:1/erc20',
      'eip155:1/:0x123',
      'eip155:1/erc20:',
      'eip155:1/erc20:0x123:extra',
    ])('returns false for invalid asset part format: %s', (tokenId) => {
      expect(validateCaip19Token(tokenId)).toBe(false);
    });

    it.each([
      'eip155:1/erc20:0x1234567890123456789012345678901234567890',
      'eip155:137/erc1155:0x1234.../123',
      'eip155:1/erc721:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    ])('returns true for valid CAIP-19 token ID: %s', (tokenId) => {
      expect(validateCaip19Token(tokenId)).toBe(true);
    });

    it.each(['eip155:1/erc20:', 'eip155:/erc20:0x123', ':1/erc20:0x123'])(
      'returns false when part is empty after split: %s',
      (tokenId) => {
        expect(validateCaip19Token(tokenId)).toBe(false);
      }
    );
  });
}); 