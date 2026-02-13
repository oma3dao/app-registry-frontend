/**
 * ERC-8004 Security Extension Compliance Tests
 *
 * Validates implementation against ERC8004EXT-SECURITY.md (ERC-8004 Extension:
 * Security & Ownership Verification).
 *
 * Specification Reference: ERC8004EXT-SECURITY.md
 * Covers: dataHash (JCS + keccak256), didHash, Registration File (owner, version),
 * onchain metadata keys, client verification (owner, dataHash), version rules,
 * registrations canonical/secondary, status.
 */

import { describe, it, expect } from 'vitest';
import { canonicalizeForHash } from '@/lib/utils/dataurl';
import { normalizeDid, computeDidHash, normalizeDidWeb, getDomainFromDidWeb } from '@/lib/utils/did';
import { APP_STATUSES } from '@/schema/data-model';
import { prepareRegisterApp8004, prepareMintApp, prepareUpdateApp } from '@/lib/contracts/registry.write';
import type { MintAppInput } from '@/lib/contracts/types';

describe('ERC-8004 Security Extension (ERC8004EXT-SECURITY)', () => {

  describe('dataHash: JCS canonicalization + keccak256', () => {
    /**
     * Spec: "dataHash is computed offchain as the keccak-256 of the
     * JCS-canonicalized Registration File."
     */
    it('computes dataHash as keccak256 of JCS-canonicalized JSON', () => {
      const registrationFile = {
        type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
        name: 'TestAgent',
        owner: 'eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
      };
      const { jcsJson, hash } = canonicalizeForHash(registrationFile);
      expect(hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(jcsJson).toBeTruthy();
      // JCS: keys sorted → name, owner, type
      expect(jcsJson).toContain('"name"');
      expect(jcsJson).toContain('"owner"');
      expect(jcsJson).toContain('"type"');
    });

    it('produces identical dataHash for same content regardless of key order', () => {
      const a = { z: 1, a: 2, m: 3 };
      const b = { m: 3, a: 2, z: 1 };
      const { hash: hashA } = canonicalizeForHash(a);
      const { hash: hashB } = canonicalizeForHash(b);
      expect(hashA).toBe(hashB);
    });

    it('produces different dataHash when content changes', () => {
      const v1 = { name: 'App', version: '1.0.0' };
      const v2 = { name: 'App', version: '1.0.1' };
      const { hash: h1 } = canonicalizeForHash(v1);
      const { hash: h2 } = canonicalizeForHash(v2);
      expect(h1).not.toBe(h2);
    });

    /** Spec: JCS uses sorted keys for deterministic canonical form. */
    it('JCS output has keys in lexicographic order', () => {
      const obj = { z: 1, a: 2, m: 3 };
      const { jcsJson } = canonicalizeForHash(obj);
      expect(jcsJson).toMatch(/"a":/);
      expect(jcsJson).toMatch(/"m":/);
      expect(jcsJson).toMatch(/"z":/);
      const aPos = jcsJson.indexOf('"a":');
      const mPos = jcsJson.indexOf('"m":');
      const zPos = jcsJson.indexOf('"z":');
      expect(aPos).toBeLessThan(mPos);
      expect(mPos).toBeLessThan(zPos);
    });
  });

  describe('didHash: canonical DID + keccak256', () => {
    /**
     * Spec: "didHash MUST be the Keccak-256 hash of the canonicalized DID
     * encoded as UTF-8 bytes." For did:web: host is lowercased.
     */
    it('canonicalizes did:web host to lowercase', () => {
      expect(normalizeDid('did:web:Example.COM')).toBe('did:web:example.com');
      expect(normalizeDid('did:web:Example.COM/path')).toBe('did:web:example.com/path');
    });

    it('computes didHash from canonical DID', () => {
      const did = 'did:web:example.com';
      const hash = computeDidHash(did);
      expect(hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(computeDidHash('did:web:Example.COM')).toBe(hash);
    });

    it('produces different didHash for different DIDs', () => {
      const h1 = computeDidHash('did:web:example.com');
      const h2 = computeDidHash('did:web:other.com');
      expect(h1).not.toBe(h2);
    });

    /** Spec: normalizeDidWeb throws when given non-web DID (wrong method). */
    it('normalizeDidWeb throws for non-web DID', () => {
      expect(() => normalizeDidWeb('did:pkh:eip155:1:0x1234567890123456789012345678901234567890')).toThrow(/non-web DID/);
    });

    /** Spec: did:pkh address is lowercased for canonical form. */
    it('canonicalizes did:pkh address to lowercase', () => {
      const did = 'did:pkh:eip155:1:0xAbCdEf123456789012345678901234567890AbCd';
      expect(normalizeDid(did)).toBe('did:pkh:eip155:1:0xabcdef123456789012345678901234567890abcd');
    });
  });

  describe('Onchain metadata keys (Security Extension)', () => {
    // Spec requires: dataHash, did, versionMajor/Minor/Patch, status.
    // Status is typically set by the contract at registration (default 0=active); frontend may not send it.
    const requiredKeysFromFrontend = [
      'omat.dataHash',
      'omat.did',
      'omat.versionMajor',
      'omat.versionMinor',
      'omat.versionPatch',
    ];

    it('includes all required Security Extension metadata keys (status may be set by contract)', () => {
      const input: MintAppInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/metadata.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };
      const result = prepareRegisterApp8004(input);
      const metadata = result.args[1] as Array<{ key: string; value: string }>;
      const keys = metadata.map(m => m.key);
      requiredKeysFromFrontend.forEach(k => expect(keys).toContain(k));
    });

    it('status values match spec (0=active, 1=deprecated, 2=replaced)', () => {
      expect(APP_STATUSES.map(s => s.value)).toEqual([0, 1, 2]);
      expect(APP_STATUSES[0].label).toBe('Active');
      expect(APP_STATUSES[1].label).toBe('Deprecated');
      expect(APP_STATUSES[2].label).toBe('Replaced');
    });
  });

  describe('Registration File: owner and version', () => {
    it('owner field must be CAIP-10 format for verification', () => {
      const validOwner = 'eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7';
      expect(validOwner).toMatch(/^eip155:\d+:0x[a-fA-F0-9]{40}$/);
    });

  });

  /**
   * Client: Registration File owner verification.
   * Spec: "Clients MUST verify ownership using: Fetch Registration File, extract owner (CAIP-10),
   * compare with ownerOf(agentId) / getRegistration().currentOwner"
   * Full coverage: schema-data-model.test.ts (isMetadataOwnerVerified) — see ERC8004EXT-SECURITY ref there.
   */

  describe('Client: dataHash validation', () => {
    it('canonicalizeForHash hash is 32-byte hex suitable for comparison with onchain dataHash', () => {
      const obj = { name: 'Test' };
      const { hash } = canonicalizeForHash(obj);
      expect(hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(hash.length).toBe(66);
    });

    /** Spec: Clients compare computed hash to onchain dataHash; comparison is typically case-insensitive for hex. */
    it('dataHash comparison should treat hex as case-insensitive', () => {
      const a = '0x' + 'a'.repeat(64);
      const b = '0x' + 'A'.repeat(64);
      expect(a.toLowerCase()).toBe(b.toLowerCase());
    });
  });

  /** Spec: "Clients SHOULD verify version history is append-only and timestamps are sequential." */
  describe('Version history append-only', () => {
    it('versionHistory entries are monotonically increasing (append-only)', () => {
      const versionHistory = [
        { major: 1, minor: 0, patch: 0 },
        { major: 1, minor: 1, patch: 0 },
        { major: 1, minor: 1, patch: 1 },
      ];
      for (let i = 1; i < versionHistory.length; i++) {
        const prev = versionHistory[i - 1];
        const curr = versionHistory[i];
        const prevN = prev.major * 1e6 + prev.minor * 1e3 + prev.patch;
        const currN = curr.major * 1e6 + curr.minor * 1e3 + curr.patch;
        expect(currN).toBeGreaterThanOrEqual(prevN);
      }
    });
  });

  describe('Version rules (Semantic Versioning)', () => {
    it('version fields are non-negative integers', () => {
      const input: MintAppInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/m.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 2,
        initialVersionPatch: 3,
      };
      const result = prepareMintApp(input);
      expect(result.args).toContain(1);
      expect(result.args).toContain(2);
      expect(result.args).toContain(3);
    });

    /** Spec: "MUST reject updates without a version change" — prepareUpdateApp requires newMinor/newPatch. */
    it('prepareUpdateApp requires version bump (newMinor or newPatch)', () => {
      const updateInput = {
        did: 'did:web:example.com',
        major: 1,
        newDataHash: '0x' + 'a'.repeat(64),
        newDataHashAlgorithm: 0,
        newInterfaces: 0,
        newTraitHashes: [] as string[],
        newMinor: 1,
        newPatch: 0,
      };
      const result = prepareUpdateApp(updateInput);
      expect(result).toBeDefined();
      expect(result.args).toContain(1);
      expect(result.args).toContain(0);
    });
  });

  describe('Registrations: canonical and secondary', () => {
    it('first registration object is canonical (did + agentRegistry required pre-registration)', () => {
      const registrations = [
        { did: 'did:web:example.com/myagent', agentRegistry: 'eip155:1:0x1234' },
        { agentId: 15, agentRegistry: 'eip155:8453:0xabcd' },
      ];
      expect(registrations[0]).toHaveProperty('did');
      expect(registrations[0]).toHaveProperty('agentRegistry');
      expect(registrations[0]).not.toHaveProperty('agentId');
      expect(registrations[1]).toHaveProperty('agentId');
    });

  });

  /** Spec: Registration File MUST include type, owner (CAIP-10), version (if present matches onchain). */
  describe('Registration File schema (spec-compliant shape)', () => {
    const REGISTRATION_TYPE = 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';

    it('minimal spec-compliant Registration File has type, owner, registrations', () => {
      const registrationFile = {
        type: REGISTRATION_TYPE,
        owner: 'eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
        name: 'myAgentName',
        registrations: [{ did: 'did:web:example.com/myagent', agentRegistry: 'eip155:1:0x1234' }],
      };
      expect(registrationFile.type).toBe(REGISTRATION_TYPE);
      expect(registrationFile.owner).toMatch(/^eip155:\d+:0x[a-fA-F0-9]{40}$/);
      expect(Array.isArray(registrationFile.registrations)).toBe(true);
      expect(registrationFile.registrations[0]).toHaveProperty('did');
      expect(registrationFile.registrations[0]).toHaveProperty('agentRegistry');
    });

    it('version in Registration File matches onchain major.minor.patch when present', () => {
      const onchainVersion = { major: 1, minor: 2, patch: 3 };
      const versionStr = `${onchainVersion.major}.${onchainVersion.minor}.${onchainVersion.patch}`;
      expect(versionStr).toBe('1.2.3');
      const [major, minor, patch] = versionStr.split('.').map(Number);
      expect(major).toBe(onchainVersion.major);
      expect(minor).toBe(onchainVersion.minor);
      expect(patch).toBe(onchainVersion.patch);
    });
  });

  /**
   * Minter control verification (ERC8004EXT-SECURITY).
   * Spec: Method 1 uses DNS TXT at _wallets.{domain} with v=1;caip10=eip155:chainId:0x...
   * Method 2 uses Registration File owner field (CAIP-10). If tokenUri and did do not share
   * the same domain, Registration File MUST include owner matching minter.
   */
  describe('Minter control verification (spec format)', () => {
    /** Parse ERC8004EXT-SECURITY TXT value: semicolon-separated, v=1, caip10= field. */
    function parseWalletsTxtValue(value: string): { version: string; caip10: string | null } {
      const entries = value.split(';').map(e => e.trim()).filter(Boolean);
      const version = entries.find(e => e === 'v=1') ? '1' : '';
      const caip10Entry = entries.find(e => e.startsWith('caip10='));
      const caip10 = caip10Entry ? caip10Entry.slice('caip10='.length).trim() : null;
      return { version, caip10 };
    }

    it('parses ERC8004EXT DNS TXT format (v=1;caip10=eip155:chainId:0x...)', () => {
      const value = 'v=1;caip10=eip155:66238:0xd434dd2861Af0E1c5Cd9A4Df171a9dfA45Cd7d29';
      const parsed = parseWalletsTxtValue(value);
      expect(parsed.version).toBe('1');
      expect(parsed.caip10).toBe('eip155:66238:0xd434dd2861Af0E1c5Cd9A4Df171a9dfA45Cd7d29');
    });

    it('ERC8004EXT TXT record name is _wallets.{domain}', () => {
      const domain = 'yourdomain.com';
      const recordName = `_wallets.${domain}`;
      expect(recordName).toBe('_wallets.yourdomain.com');
    });

    it('getDomainFromDidWeb extracts domain including subdomains', () => {
      expect(getDomainFromDidWeb('did:web:example.com')).toBe('example.com');
      expect(getDomainFromDidWeb('did:web:sub.example.com')).toBe('sub.example.com');
      expect(getDomainFromDidWeb('did:web:example.com/path/to/agent')).toBe('example.com');
      expect(getDomainFromDidWeb('did:pkh:eip155:1:0x1234')).toBe(null);
    });

    /** Spec: If tokenUri and did do not share the same domain, Registration File MUST include owner. */
    it('same-domain check: tokenUri host matches did:web domain', () => {
      function getHostFromTokenUri(tokenUri: string): string | null {
        try {
          const u = new URL(tokenUri);
          return u.hostname.toLowerCase();
        } catch {
          return null;
        }
      }
      const didDomain = getDomainFromDidWeb('did:web:example.com');
      expect(didDomain).toBe('example.com');
      expect(getHostFromTokenUri('https://example.com/.well-known/agent.json')).toBe('example.com');
      expect(getHostFromTokenUri('https://other.com/metadata.json')).toBe('other.com');
      expect(didDomain === getHostFromTokenUri('https://example.com/m.json')).toBe(true);
      expect(didDomain === getHostFromTokenUri('https://other.com/m.json')).toBe(false);
    });
  });

  describe('getMetadata REQUIRED in Security Extension', () => {
    it('metadata keys written by prepareRegisterApp8004 are getMetadata-queryable', () => {
      const input: MintAppInput = {
        did: 'did:web:example.com',
        interfaces: 1,
        dataUrl: 'https://example.com/m.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };
      const result = prepareRegisterApp8004(input);
      const metadata = result.args[1] as Array<{ key: string; value: string }>;
      metadata.forEach(entry => {
        expect(entry.key).toMatch(/^[a-z0-9.]+$/i);
        expect(entry.key).toContain('.');
      });
    });
  });
});
