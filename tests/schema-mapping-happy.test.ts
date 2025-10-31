import { describe, it, expect, vi, beforeEach } from 'vitest'

// Narrow mocks
vi.mock('@/config/env', () => ({ env: { appBaseUrl: 'https://app.oma3.org' } }))

vi.mock('@/lib/utils/offchain-json', () => ({
	buildOffchainMetadataObject: (obj: any) => ({ ...obj, _mapped: true }),
}))

vi.mock('@/lib/utils/dataurl', () => ({
	canonicalizeForHash: (obj: any) => ({ hash: '0x' + 'a'.repeat(64), jcsJson: JSON.stringify(obj) }),
}))

vi.mock('@/lib/utils/traits', () => ({
	hashTraits: (traits: string[]) => traits.map((t) => `hash_${t}`),
}))

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
	beforeEach(() => vi.clearAllMocks())

	it('isOurHostedUrl returns true for our base domain', () => {
		expect(isOurHostedUrl('https://app.oma3.org/x')).toBe(true)
	})

	it.skip('toMintAppInput builds interfaces, hashes traits, and includes metadataJson when hosted', () => {
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
