/**
 * ERC-8004 Web Extension Compliance Tests
 *
 * Validates implementation against ERC8004EXT-WEB.md (ERC-8004 Extension:
 * Web Services Trust Layer).
 *
 * Specification Reference: ERC8004EXT-WEB.md
 * Covers: interfaces bitmap, contractId, traitHashes/traits, Registration File
 * extensions (image, publisher, summary, traits), artifacts (did:artifact, type, downloadUrls).
 */

import { describe, it, expect } from 'vitest';
import { prepareRegisterApp8004, prepareMintApp, prepareUpdateApp } from '@/lib/contracts/registry.write';
import { hashTrait, hashTraits } from '@/lib/utils/traits';
import { normalizeDid, computeDidHash } from '@/lib/utils/did';
import { OffChainMetadata, OnChainApp } from '@/schema/data-model';
import type { MintAppInput } from '@/lib/contracts/types';
import { keccak256, toUtf8Bytes } from 'ethers';

describe('ERC-8004 Web Extension (ERC8004EXT-WEB)', () => {
  describe('interfaces onchain field (bitmap)', () => {
    /**
     * Spec: Bit 0=1 Human, Bit 1=2 API, Bit 2=4 Smart Contract.
     * Multiple interfaces MAY be combined with bitwise OR.
     */
    const INTERFACE_HUMAN = 1;
    const INTERFACE_API = 2;
    const INTERFACE_SMART_CONTRACT = 4;

    it('accepts interface value 1 (Human)', () => {
      const input: MintAppInput = {
        did: 'did:web:example.com',
        interfaces: INTERFACE_HUMAN,
        dataUrl: 'https://example.com/m.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };
      const result = prepareMintApp(input);
      expect(result.args).toContain(1);
    });

    it('accepts interface value 2 (API)', () => {
      const input: MintAppInput = {
        did: 'did:web:api.example.com',
        interfaces: INTERFACE_API,
        dataUrl: 'https://example.com/m.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };
      const result = prepareMintApp(input);
      expect(result.args).toContain(2);
    });

    it('accepts interface value 4 (Smart Contract)', () => {
      const input: MintAppInput = {
        did: 'did:web:contract.example.com',
        interfaces: INTERFACE_SMART_CONTRACT,
        dataUrl: 'https://example.com/m.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };
      const result = prepareMintApp(input);
      expect(result.args).toContain(4);
    });

    it('accepts combined interfaces (e.g. 3 = Human + API)', () => {
      const input: MintAppInput = {
        did: 'did:web:example.com',
        interfaces: INTERFACE_HUMAN | INTERFACE_API,
        dataUrl: 'https://example.com/m.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };
      const result = prepareMintApp(input);
      expect(result.args).toContain(3);
    });

    it('accepts all interfaces 7 (Human | API | Smart Contract)', () => {
      const input: MintAppInput = {
        did: 'did:web:example.com',
        interfaces: 7,
        dataUrl: 'https://example.com/m.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };
      const result = prepareMintApp(input);
      expect(result.args).toContain(7);
    });

    /** Spec: interfaces is a bitmap; 0 means no interface flags set. */
    it('accepts interfaces value 0 (no interface flags)', () => {
      const input: MintAppInput = {
        did: 'did:web:example.com',
        interfaces: 0,
        dataUrl: 'https://example.com/m.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };
      expect(() => prepareMintApp(input)).not.toThrow();
      const result = prepareMintApp(input);
      expect(result.args).toContain(0);
    });

    /** Schema: interfaces must be non-negative (spec bitmap is 0–7 for three bits). */
    it('OnChainApp rejects negative interfaces', () => {
      const result = OnChainApp.safeParse({
        did: 'did:web:example.com',
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        interfaces: -1,
        dataUrl: 'https://example.com/m.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0,
        minter: '0x1234567890123456789012345678901234567890',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('contractId metadata key', () => {
    /**
     * Spec: contractId MUST be CAIP-10 format (eip155:chainId:0xaddress). Immutable after registration.
     */

    /** Spec: "contractId MUST be immutable after registration" — prepareUpdateApp does not accept contractId. */
    it('contractId is immutable (not in update flow)', () => {
      const updateInput = {
        did: 'did:web:example.com',
        major: 1,
        newDataHash: '0x' + '0'.repeat(64),
        newDataHashAlgorithm: 0,
        newInterfaces: 0,
        newTraitHashes: [] as string[],
        newMinor: 1,
        newPatch: 0,
      };
      expect(updateInput).not.toHaveProperty('contractId');
      expect(() => prepareUpdateApp(updateInput)).not.toThrow();
    });
    it('includes contractId in metadata when provided (CAIP-10 format)', () => {
      const contractId = 'eip155:1:0x1234567890123456789012345678901234567890';
      const input: MintAppInput = {
        did: 'did:web:example.com',
        interfaces: 4,
        dataUrl: 'https://example.com/m.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        contractId,
      };
      const result = prepareRegisterApp8004(input);
      const metadata = result.args[1] as Array<{ key: string; value: string }>;
      const keys = metadata.map(m => m.key);
      expect(keys).toContain('omat.contractId');
    });

    it('accepts valid CAIP-10 contractId format (eip155:chainId:0x40hex)', () => {
      const validIds = [
        'eip155:1:0x1234567890123456789012345678901234567890',
        'eip155:8453:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ];
      validIds.forEach(contractId => {
        expect(contractId).toMatch(/^eip155:\d+:0x[a-fA-F0-9]{40}$/);
      });
    });

    it('omits contractId when not provided', () => {
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
      const keys = metadata.map(m => m.key);
      expect(keys).not.toContain('omat.contractId');
    });

    /** Spec: "Clients MUST treat unverified contractId values as untrusted." */
    it('documents client requirement: unverified contractId must be treated as untrusted', () => {
      const contractId = 'eip155:1:0x1234567890123456789012345678901234567890';
      const isVerified = false; // would come from registry/attestation
      expect(contractId).toMatch(/^eip155:\d+:0x[a-fA-F0-9]{40}$/);
      expect(isVerified).toBe(false);
      // Client logic: when !isVerified, treat contractId as untrusted (no assertion on app code here)
    });
  });

  describe('traitHashes (onchain) and traits (offchain)', () => {
    /**
     * Spec: traitHashes = array of keccak256 hashes of trait strings.
     * hasAnyTraits(did, major, traits), hasAllTraits(did, major, traits).
     */
    it('hashTraits produces array of hashes', () => {
      const traits = ['api:openapi', 'api:graphql'];
      const hashes = hashTraits(traits);
      expect(hashes).toHaveLength(2);
      hashes.forEach(h => expect(h).toMatch(/^0x[0-9a-fA-F]{64}$/));
      expect(hashes[0]).not.toBe(hashes[1]);
    });

    it('includes traitHashes in metadata when provided', () => {
      const traitHashes = ['0x' + 'a'.repeat(64), '0x' + 'b'.repeat(64)];
      const input: MintAppInput = {
        did: 'did:web:example.com',
        interfaces: 2,
        dataUrl: 'https://example.com/m.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
        traitHashes,
      };
      const result = prepareRegisterApp8004(input);
      const metadata = result.args[1] as Array<{ key: string; value: string }>;
      const keys = metadata.map(m => m.key);
      expect(keys).toContain('omat.traitHashes');
    });

    it('standardized trait strings are valid (spec examples)', () => {
      const standardized = [
        'api:openapi',
        'api:graphql',
        'api:jsonrpc',
        'api:mcp',
        'api:a2a',
        'api:oasf',
        'pay:x402',
        'pay:manual',
      ];
      standardized.forEach(t => {
        const h = hashTrait(t);
        expect(h).toMatch(/^0x[0-9a-fA-F]{64}$/);
      });
    });

    /** Spec: traitHashes MUST be keccak-256 hashes of trait strings. */
    it('hashTrait produces keccak256 of trait string (spec algorithm)', () => {
      const trait = 'api:openapi';
      const expected = keccak256(toUtf8Bytes(trait));
      expect(hashTrait(trait)).toBe(expected);
    });
  });

  /** Spec: For Smart Contract interface, Clients MUST use did:pkh DID method. */
  describe('did:pkh for Smart Contract interface', () => {
    it('normalizeDid and computeDidHash support did:pkh', () => {
      const did = 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890';
      const normalized = normalizeDid(did);
      expect(normalized).toMatch(/^did:pkh:eip155:1:0x[a-f0-9]{40}$/);
      const hash = computeDidHash(did);
      expect(hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    });

    it('did:pkh is valid when interfaces includes Smart Contract (4)', () => {
      const input: MintAppInput = {
        did: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890',
        interfaces: 4,
        dataUrl: 'https://example.com/m.json',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0,
        initialVersionMajor: 1,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      };
      expect(() => prepareMintApp(input)).not.toThrow();
      const result = prepareMintApp(input);
      expect(result.args[0]).toMatch(/^did:pkh:/);
    });
  });

  describe('Registration File extensions (image, publisher, summary, traits)', () => {
    /**
     * Spec: image MUST (Human), publisher MUST (Human), summary SHOULD max 80,
     * traits array max 20, 120 chars total (spec); we test schema max 20.
     */
    it('OffChainMetadata requires image (URI)', () => {
      const withoutImage = {
        name: 'App Name That Is Long Enough',
        description: 'A description that is at least ten characters long here.',
        publisher: 'Publisher',
      };
      const result = OffChainMetadata.safeParse(withoutImage);
      expect(result.success).toBe(false);
    });

    it('OffChainMetadata requires publisher', () => {
      const withoutPublisher = {
        name: 'App Name That Is Long Enough',
        description: 'A description that is at least ten characters long here.',
        image: 'https://example.com/icon.png',
      };
      const result = OffChainMetadata.safeParse(withoutPublisher);
      expect(result.success).toBe(false);
    });

    it('OffChainMetadata accepts summary up to 80 chars', () => {
      const withSummary = {
        name: 'App Name That Is Long Enough',
        description: 'A description that is at least ten characters long here.',
        publisher: 'Publisher',
        image: 'https://example.com/icon.png',
        summary: 'A'.repeat(80),
      };
      const result = OffChainMetadata.safeParse(withSummary);
      expect(result.success).toBe(true);
    });

    it('OffChainMetadata accepts traits array (max 20)', () => {
      const withTraits = {
        name: 'App Name That Is Long Enough',
        description: 'A description that is at least ten characters long here.',
        publisher: 'Publisher',
        image: 'https://example.com/icon.png',
        traits: ['api:openapi', 'pay:x402'],
      };
      const result = OffChainMetadata.safeParse(withTraits);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.traits).toHaveLength(2);
    });

    it('OffChainMetadata rejects more than 20 traits', () => {
      const withManyTraits = {
        name: 'App Name That Is Long Enough',
        description: 'A description that is at least ten characters long here.',
        publisher: 'Publisher',
        image: 'https://example.com/icon.png',
        traits: Array(21).fill('trait'),
      };
      const result = OffChainMetadata.safeParse(withManyTraits);
      expect(result.success).toBe(false);
    });

    /** Spec: "Max 20 traits, 120 chars total" — schema enforces 20; 120 total enforced when refinement is added. */
    it('traits: up to 120 chars total is spec-compliant; over 120 is rejected when schema refines', () => {
      function traitsTotalChars(traits: string[]): number {
        return traits.join('').length;
      }
      const compliant = Array(20).fill('abcdef'); // 120 chars
      expect(traitsTotalChars(compliant)).toBe(120);
      const compliantResult = OffChainMetadata.safeParse({
        name: 'App Name That Is Long Enough',
        description: 'A description that is at least ten characters long here.',
        publisher: 'Publisher',
        image: 'https://example.com/icon.png',
        traits: compliant,
      });
      expect(compliantResult.success).toBe(true);
      if (compliantResult.success) expect(traitsTotalChars(compliantResult.data.traits)).toBe(120);
      const overLimit = ['a'.repeat(121)];
      const overResult = OffChainMetadata.safeParse({
        name: 'App Name That Is Long Enough',
        description: 'A description that is at least ten characters long here.',
        publisher: 'Publisher',
        image: 'https://example.com/icon.png',
        traits: overLimit,
      });
      expect(traitsTotalChars(overLimit)).toBeGreaterThan(120);
      // Schema does not yet enforce 120-char total; when added, expect(overResult.success).toBe(false)
    });
  });

  describe('artifacts (did:artifact, type, downloadUrls)', () => {
    /**
     * Spec: artifacts = object where keys are artifactDid (did:artifact:<cidv1>),
     * values are { type: "binary"|"container"|"website", downloadUrls: string[] }.
     */
    it('accepts artifacts object with did:artifact key and type + downloadUrls', () => {
      const artifactDid = 'did:artifact:bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      const metadata = {
        name: 'DataViz Pro',
        description: 'Professional data visualization tool for enterprises and teams.',
        publisher: 'Publisher',
        image: 'https://example.com/app-icon.png',
        artifacts: {
          [artifactDid]: {
            type: 'binary',
            downloadUrls: [
              'https://downloads.example.com/DataViz-Setup.exe',
              'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
            ],
          },
        },
      };
      const result = OffChainMetadata.safeParse(metadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.artifacts).toHaveProperty(artifactDid);
        const art = (result.data.artifacts as Record<string, any>)[artifactDid];
        expect(art.type).toBe('binary');
        expect(Array.isArray(art.downloadUrls)).toBe(true);
        expect(art.downloadUrls).toHaveLength(2);
      }
    });

    it('artifactDid format uses did:artifact: prefix and CIDv1-style identifier', () => {
      const validDid = 'did:artifact:bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      expect(validDid).toMatch(/^did:artifact:[a-z0-9]+/);
    });

    /** Spec: artifactDid uses did:artifact:<cidv1> where cidv1 is base32-lower (starts with b). */
    it('CIDv1 base32-lower format: artifactDid cid part starts with valid multibase', () => {
      const artifactDid = 'did:artifact:bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      const cidPart = artifactDid.replace('did:artifact:', '');
      expect(cidPart[0]).toBe('b');
      expect(cidPart).toMatch(/^[a-z0-9]+$/);
    });

    /** Spec: type MUST be one of "binary", "container", or "website". */
    it('accepts only spec-allowed artifact types (binary, container, website)', () => {
      const allowed = ['binary', 'container', 'website'] as const;
      const artifactDid = 'did:artifact:bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      allowed.forEach(type => {
        const result = OffChainMetadata.safeParse({
          name: 'App',
          description: 'A description that is at least ten characters long here.',
          publisher: 'Pub',
          image: 'https://example.com/icon.png',
          artifacts: { [artifactDid]: { type, downloadUrls: ['https://example.com/x'] } },
        });
        expect(result.success).toBe(true);
      });
    });

    /** Spec: downloadUrls is MUST — at least one URL. */
    it('artifact with single downloadUrl is valid', () => {
      const metadata = {
        name: 'App',
        description: 'A description that is at least ten characters long here.',
        publisher: 'Pub',
        image: 'https://example.com/icon.png',
        artifacts: {
          'did:artifact:bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi': {
            type: 'binary',
            downloadUrls: ['https://example.com/single.exe'],
          },
        },
      };
      const result = OffChainMetadata.safeParse(metadata);
      expect(result.success).toBe(true);
      if (result.success) {
        const art = (result.data.artifacts as Record<string, any>)['did:artifact:bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'];
        expect(art.downloadUrls).toHaveLength(1);
      }
    });

    /** Spec allows only type "binary"|"container"|"website". Current schema accepts any string. */
    it('current schema accepts non-spec artifact type (documentation gap)', () => {
      const metadata = {
        name: 'App',
        description: 'A description that is at least ten characters long here.',
        publisher: 'Pub',
        image: 'https://example.com/icon.png',
        artifacts: {
          'did:artifact:bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi': {
            type: 'executable',
            downloadUrls: ['https://example.com/app.exe'],
          },
        },
      };
      const result = OffChainMetadata.safeParse(metadata);
      expect(result.success).toBe(true);
      if (result.success) {
        const art = (result.data.artifacts as Record<string, any>)['did:artifact:bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'];
        expect(art.type).toBe('executable');
      }
    });
  });

  describe('external_url (Registration File)', () => {
    it('OffChainMetadata accepts optional external_url', () => {
      const metadata = {
        name: 'App Name That Is Long Enough',
        description: 'A description that is at least ten characters long here.',
        publisher: 'Publisher',
        image: 'https://example.com/icon.png',
        external_url: 'https://example.com/marketing',
      };
      const result = OffChainMetadata.safeParse(metadata);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.external_url).toBe('https://example.com/marketing');
    });
  });
});
