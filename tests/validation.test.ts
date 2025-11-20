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

  /**
   * Test: covers lines 95-112 - validateCaip19Token function
   */
  describe('validateCaip19Token', () => {
    // Test: covers line 95 - empty tokenId returns true (optional field)
    it('returns true for empty tokenId (optional field)', () => {
      expect(validateCaip19Token('')).toBe(true);
      expect(validateCaip19Token(null as any)).toBe(true);
      expect(validateCaip19Token(undefined as any)).toBe(true);
    });

    // Test: covers line 100 - missing chainPart or assetPart
    it('returns false when tokenId is missing chain or asset part', () => {
      expect(validateCaip19Token('eip155:1')).toBe(false); // Missing asset part
      expect(validateCaip19Token('erc20:0x123')).toBe(false); // Missing chain part
      expect(validateCaip19Token('invalid')).toBe(false); // No separator
    });

    // Test: covers line 106 - invalid chain part format
    it('returns false for invalid chain part format', () => {
      expect(validateCaip19Token('eip155/erc20:0x123')).toBe(false); // Missing reference
      expect(validateCaip19Token(':1/erc20:0x123')).toBe(false); // Empty namespace
      expect(validateCaip19Token('eip155:/erc20:0x123')).toBe(false); // Empty reference
      expect(validateCaip19Token('eip155:1:extra/erc20:0x123')).toBe(false); // Too many parts
    });

    // Test: covers line 109 - invalid asset part format
    it('returns false for invalid asset part format', () => {
      expect(validateCaip19Token('eip155:1/erc20')).toBe(false); // Missing asset reference
      expect(validateCaip19Token('eip155:1/:0x123')).toBe(false); // Empty asset namespace
      expect(validateCaip19Token('eip155:1/erc20:')).toBe(false); // Empty asset reference
      expect(validateCaip19Token('eip155:1/erc20:0x123:extra')).toBe(false); // Too many parts
    });

    // Test: covers line 111 - valid CAIP-19 token IDs
    it('returns true for valid CAIP-19 token IDs', () => {
      expect(validateCaip19Token('eip155:1/erc20:0x1234567890123456789012345678901234567890')).toBe(true);
      expect(validateCaip19Token('eip155:137/erc1155:0x1234.../123')).toBe(true); // Note: actual format may vary
      expect(validateCaip19Token('eip155:1/erc721:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')).toBe(true);
    });

    // Test: covers edge cases with empty parts
    it('returns false when any part is empty after split', () => {
      expect(validateCaip19Token('eip155:1/erc20:')).toBe(false); // Empty asset reference
      expect(validateCaip19Token('eip155:/erc20:0x123')).toBe(false); // Empty chain reference
      expect(validateCaip19Token(':1/erc20:0x123')).toBe(false); // Empty chain namespace
    });
  });
}); 