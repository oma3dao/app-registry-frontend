/**
 * Tests for shared evidence verification library
 *
 * Covers parseEvidenceString, extractAddress, addressesMatch,
 * findControllerInDnsTxt, findControllerInDidDoc
 * per OMATrust Proof Specification §5.3.5.2 (evidence-pointer format)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dns from 'dns';
import {
  parseEvidenceString,
  extractAddress,
  addressesMatch,
  findControllerInDnsTxt,
  findControllerInDidDoc,
} from '@/lib/server/evidence';

// Mock dns to avoid actual DNS lookups in unit tests
vi.mock('dns', () => ({
  default: {
    resolveTxt: vi.fn(),
  },
}));

vi.mock('util', () => ({
  promisify: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
}));

const getResolveTxt = () => vi.mocked(dns.resolveTxt);

describe('evidence', () => {
  describe('parseEvidenceString', () => {
    it('returns null when v=1 marker is absent', () => {
      expect(parseEvidenceString('controller=did:pkh:eip155:1:0xabc123')).toBeNull();
      expect(parseEvidenceString('')).toBeNull();
      expect(parseEvidenceString('v=0;controller=did:pkh:eip155:1:0xabc123')).toBeNull();
    });

    it('parses v=1 with single controller (semicolon-separated)', () => {
      const result = parseEvidenceString('v=1;controller=did:pkh:eip155:1:0xabc123');
      expect(result).not.toBeNull();
      expect(result!.version).toBe('1');
      expect(result!.controllers).toEqual(['did:pkh:eip155:1:0xabc123']);
    });

    it('parses v=1 with single controller (whitespace-separated)', () => {
      const result = parseEvidenceString('v=1 controller=did:pkh:eip155:1:0xabc123');
      expect(result).not.toBeNull();
      expect(result!.controllers).toEqual(['did:pkh:eip155:1:0xabc123']);
    });

    it('parses v=1 with multiple controllers', () => {
      const result = parseEvidenceString(
        'v=1; controller=did:pkh:eip155:1:0xaaa; controller=did:pkh:eip155:1:0xbbb'
      );
      expect(result).not.toBeNull();
      expect(result!.controllers).toEqual(['did:pkh:eip155:1:0xaaa', 'did:pkh:eip155:1:0xbbb']);
    });

    it('ignores non-DID controller values (bare CAIP-10)', () => {
      const result = parseEvidenceString('v=1; controller=eip155:1:0xabc123');
      expect(result).not.toBeNull();
      expect(result!.controllers).toEqual([]);
    });

    it('ignores non-DID controller values (raw address)', () => {
      const result = parseEvidenceString('v=1; controller=0xabc123');
      expect(result).not.toBeNull();
      expect(result!.controllers).toEqual([]);
    });

    it('trims whitespace around entries', () => {
      const result = parseEvidenceString('  v=1  ;  controller=did:pkh:eip155:1:0xabc123  ');
      expect(result).not.toBeNull();
      expect(result!.controllers).toEqual(['did:pkh:eip155:1:0xabc123']);
    });
  });

  describe('extractAddress', () => {
    const validAddr = '0x' + 'a'.repeat(40);

    it('extracts address from did:pkh:eip155', () => {
      expect(extractAddress(`did:pkh:eip155:1:${validAddr}`)).toBe(validAddr);
      expect(extractAddress('did:pkh:eip155:66238:0x7D5beD223Bc343F114Aa28961Cc447dbbc9c2330')).toBe(
        '0x7d5bed223bc343f114aa28961cc447dbbc9c2330'
      );
    });

    it('returns null for did:key', () => {
      expect(extractAddress('did:key:z6Mk...')).toBeNull();
    });

    it('returns raw 0x address as lowercase', () => {
      expect(extractAddress('0xABC1230000000000000000000000000000000000')).toBe(
        '0xabc1230000000000000000000000000000000000'
      );
    });

    it('returns null for invalid input', () => {
      expect(extractAddress('did:web:example.com')).toBeNull();
      expect(extractAddress('not-an-address')).toBeNull();
      expect(extractAddress('')).toBeNull();
    });
  });

  describe('addressesMatch', () => {
    const addrA = '0x' + 'a'.repeat(40);
    const addrALower = addrA.toLowerCase();

    it('matches same did:pkh with different chain IDs', () => {
      expect(
        addressesMatch(
          `did:pkh:eip155:1:${addrA}`,
          `did:pkh:eip155:66238:${addrA}`
        )
      ).toBe(true);
    });

    it('matches did:pkh with raw address', () => {
      expect(
        addressesMatch(`did:pkh:eip155:1:${addrA}`, addrALower)
      ).toBe(true);
    });

    it('matches addresses case-insensitively', () => {
      const mixedCase = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
      expect(addressesMatch(mixedCase, mixedCase.toLowerCase())).toBe(true);
    });

    it('returns false for different addresses', () => {
      expect(
        addressesMatch(
          'did:pkh:eip155:1:0xaaa',
          'did:pkh:eip155:1:0xbbb'
        )
      ).toBe(false);
    });

    it('returns false when one cannot extract address', () => {
      expect(
        addressesMatch('did:key:z6Mk...', '0xabc123')
      ).toBe(false);
    });
  });

  describe('findControllerInDnsTxt', () => {
    const expectedAddr = '0x' + 'a'.repeat(40);
    const expectedDid = `did:pkh:eip155:66238:${expectedAddr}`;

    beforeEach(() => {
      getResolveTxt().mockReset();
    });

    it('returns found when TXT record contains matching controller', async () => {
      getResolveTxt().mockResolvedValue([['v=1;controller=' + expectedDid]]);

      const result = await findControllerInDnsTxt('example.com', expectedDid);

      expect(result.found).toBe(true);
      expect(result.matchedController).toBe(expectedDid);
      expect(getResolveTxt()).toHaveBeenCalledWith('_omatrust.example.com');
    });

    it('returns found when matching by raw address', async () => {
      getResolveTxt().mockResolvedValue([['v=1;controller=' + expectedDid]]);

      const result = await findControllerInDnsTxt('example.com', expectedAddr);

      expect(result.found).toBe(true);
      expect(result.matchedController).toBe(expectedDid);
    });

    it('returns not found when no TXT records', async () => {
      getResolveTxt().mockResolvedValue([]);

      const result = await findControllerInDnsTxt('example.com', expectedDid);

      expect(result.found).toBe(false);
      expect(result.details).toContain('No TXT records found');
      expect(result.details).toContain('_omatrust.example.com');
    });

    it('returns not found when controller does not match', async () => {
      const otherDid = 'did:pkh:eip155:1:0x' + 'b'.repeat(40);
      getResolveTxt().mockResolvedValue([['v=1;controller=' + otherDid]]);

      const result = await findControllerInDnsTxt('example.com', expectedDid);

      expect(result.found).toBe(false);
      expect(result.details).toContain('do not match expected');
    });

    it('returns not found when TXT has no v=1 controller entries', async () => {
      getResolveTxt().mockResolvedValue([['v=0;foo=bar']]);

      const result = await findControllerInDnsTxt('example.com', expectedDid);

      expect(result.found).toBe(false);
      expect(result.details).toContain('no controller entries');
    });

    it('returns error details when DNS lookup fails', async () => {
      getResolveTxt().mockRejectedValue(new Error('ENOTFOUND'));

      const result = await findControllerInDnsTxt('example.com', expectedDid);

      expect(result.found).toBe(false);
      expect(result.details).toContain('DNS lookup failed');
      expect(result.details).toContain('ENOTFOUND');
    });
  });

  describe('findControllerInDidDoc', () => {
    const expectedAddr = '0x' + 'a'.repeat(40);
    const expectedDid = `did:pkh:eip155:66238:${expectedAddr}`;

    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new Error('fetch not mocked')))
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      globalThis.fetch = originalFetch;
    });

    it('returns found when verificationMethod has matching blockchainAccountId', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                verificationMethod: [
                  {
                    blockchainAccountId: `eip155:66238:${expectedAddr}`,
                  },
                ],
              }),
          } as Response)
        )
      );

      const result = await findControllerInDidDoc('example.com', expectedDid);

      expect(result.found).toBe(true);
      expect(result.matchedController).toContain('did:pkh:');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com/.well-known/did.json',
        expect.objectContaining({ headers: { Accept: 'application/json' } })
      );
    });

    it('returns found when verificationMethod has matching publicKeyHex', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                verificationMethod: [
                  { publicKeyHex: expectedAddr.slice(2) },
                ],
              }),
          } as Response)
        )
      );

      const result = await findControllerInDidDoc('example.com', expectedAddr);

      expect(result.found).toBe(true);
      expect(result.matchedController).toBe(expectedAddr);
    });

    it('returns not found when no verificationMethod entries', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ verificationMethod: [] }),
          } as Response)
        )
      );

      const result = await findControllerInDidDoc('example.com', expectedDid);

      expect(result.found).toBe(false);
      expect(result.details).toContain('no verificationMethod entries');
    });

    it('returns not found when addresses do not match', async () => {
      const otherAddr = '0x' + 'b'.repeat(40);
      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                verificationMethod: [
                  { blockchainAccountId: `eip155:66238:${otherAddr}` },
                ],
              }),
          } as Response)
        )
      );

      const result = await findControllerInDidDoc('example.com', expectedDid);

      expect(result.found).toBe(false);
      expect(result.details).toContain('do not match expected');
    });

    it('returns error when fetch fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new Error('Network error')))
      );

      const result = await findControllerInDidDoc('example.com', expectedDid);

      expect(result.found).toBe(false);
      expect(result.details).toContain('Failed to fetch DID document');
      expect(result.details).toContain('Network error');
    });

    it('returns error when response is not ok', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          } as Response)
        )
      );

      const result = await findControllerInDidDoc('example.com', expectedDid);

      expect(result.found).toBe(false);
      expect(result.details).toContain('DID document fetch failed');
      expect(result.details).toContain('404');
    });
  });
});
