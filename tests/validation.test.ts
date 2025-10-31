// Tests for validation functions in validation.ts
import { validateVersion, validateUrl, validateDid, validateName, validateCaipAddress } from '../src/lib/validation';

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
}); 