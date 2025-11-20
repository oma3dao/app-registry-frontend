import { describe, it, expect, vi } from 'vitest'

// Use vi.hoisted() to ensure mocks are available before module evaluation
const mockBuildOffchain = vi.hoisted(() => (obj: any) => ({ ...obj, _mapped: true }))
const mockCanonicalizeForHash = vi.hoisted(() => (obj: any) => ({ 
  hash: '0x' + 'a'.repeat(64) as `0x${string}`, 
  jcsJson: JSON.stringify(obj) 
}))
const mockHashTraits = vi.hoisted(() => (traits: string[]) => traits.map((t) => `hash_${t}`))

// Narrow mocks
vi.mock('@/config/env', () => ({ env: { appBaseUrl: 'https://app.oma3.org' } }))

vi.mock('@/lib/utils/offchain-json', () => ({
	buildOffchainMetadataObject: mockBuildOffchain,
}))

vi.mock('@/lib/utils/dataurl', () => ({
	canonicalizeForHash: mockCanonicalizeForHash,
}))

vi.mock('@/lib/utils/traits', () => ({
	hashTraits: mockHashTraits,
}))

// Override the global mock from setup.ts to get the real implementation
vi.mock('@/schema/mapping', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/schema/mapping')>()
  return {
    ...actual,
    // Keep the real implementations instead of mocked ones
  }
})

import { toMintAppInput, isOurHostedUrl } from '@/schema/mapping'

const baseNft: any = {
	did: 'did:web:example.com',
	version: '1.2.3',
	name: 'App',
	dataUrl: 'https://app.oma3.org/data.json',
	traits: ['a', 'b'],
	interfaceFlags: { human: true, api: true, smartContract: false },
	fungibleTokenId: 'eip155:1:0xabc',
	contractId: '0xdef',
}

describe('schema/mapping happy path', () => {

	it('isOurHostedUrl returns true for our base domain', () => {
		expect(isOurHostedUrl('https://app.oma3.org/x')).toBe(true)
	})

	it('toMintAppInput builds interfaces, hashes traits, and includes metadataJson when hosted', () => {
		const out = toMintAppInput(baseNft)
		expect(out).toBeDefined()
		expect(out.did).toBe('did:web:example.com')
		expect(out.initialVersionMajor).toBe(1)
		expect(out.initialVersionMinor).toBe(2)
		expect(out.initialVersionPatch).toBe(3)
		expect(out.interfaces).toBe(1 + 2)
		expect(out.dataHash).toMatch(/^0x[a-f0-9]{64}$/)
		expect(out.traitHashes).toEqual(['hash_a', 'hash_b'])
		expect(out.metadataJson).toContain('"_mapped":true')
	})
})
