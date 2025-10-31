import { describe, it, expect, vi, beforeEach } from 'vitest'
import { appSummaryToNFT, appSummariesToNFTs, appSummariesToNFTsWithMetadata, hydrateNFTWithMetadata, hasInterface, getInterfaceTypes, createInterfacesBitmap } from '@/lib/utils/app-converter'
import type { AppSummary } from '@/lib/contracts/types'

const baseApp: AppSummary = {
	did: 'did:web:example.com',
	versionMajor: 1,
	currentVersion: { major: 1, minor: 2, patch: 0 },
	versionHistory: [{ major: 1, minor: 0, patch: 0 }, { major: 1, minor: 2, patch: 0 }],
	minter: '0x1234567890123456789012345678901234567890',
	owner: '0x1111111111111111111111111111111111111111',
	interfaces: 5,
	dataUrl: 'https://example.com/meta.json',
	dataHash: '0x' + '0'.repeat(64),
	dataHashAlgorithm: 0,
	fungibleTokenId: 'eip155:1:0xabc',
	contractId: 'eip155:1:0xdef',
	traitHashes: [],
	status: 'Active',
}

describe('app-converter', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it('appSummaryToNFT converts fields with version formatting and fallbacks', () => {
		const nft = appSummaryToNFT(baseApp, '0xFALLBACK')
		expect(nft.did).toBe('did:web:example.com')
		// currentVersion: 1.2.0 -> formatted as 1.2
		expect(nft.version).toBe('1.2')
		expect(nft.interfaces).toBe(5)
		expect(nft.dataUrl).toBe('https://example.com/meta.json')
		expect(nft.contractId).toBe('eip155:1:0xdef')
		expect(nft.fungibleTokenId).toBe('eip155:1:0xabc')
		// minter from app, not fallback
		expect(nft.minter).toBe('0x1234567890123456789012345678901234567890')
		// empty metadata fields present
		expect(nft.description).toBe('')
	})

	it('appSummariesToNFTs maps array', () => {
		const nfts = appSummariesToNFTs([baseApp, { ...baseApp, did: 'did:web:other.com' }])
		expect(nfts).toHaveLength(2)
		expect(nfts[1].did).toBe('did:web:other.com')
	})

	it('hydrateNFTWithMetadata returns original when no dataUrl', async () => {
		const nft = appSummaryToNFT({ ...baseApp, dataUrl: '' } as any)
		const out = await hydrateNFTWithMetadata(nft)
		expect(out).toBe(nft)
	})

	it('hydrateNFTWithMetadata handles non-ok response gracefully', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as any
		const out = await hydrateNFTWithMetadata(appSummaryToNFT(baseApp))
		expect(out.name).toBe('')
	})

	it('hydrateNFTWithMetadata merges metadata fields', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
			name: 'Name', description: 'Desc', publisher: 'Pub', image: 'img', external_url: 'ext', summary: 'sum', owner: 'owner', legalUrl: 'legal', supportUrl: 'support',
			iwpsPortalUrl: 'iwps', screenshotUrls: ['a'], videoUrls: ['b'], threeDAssetUrls: ['c'], platforms: { web: {} }, artifacts: { x: {} }, endpoint: { url: 'x' }, interfaceVersions: ['1.0'], mcp: { tools: [] }, traits: ['t']
		}) }) as any
		const out = await hydrateNFTWithMetadata(appSummaryToNFT(baseApp))
		expect(out.name).toBe('Name')
		expect(out.traits).toEqual(['t'])
		expect(out.platforms).toEqual({ web: {} })
	})

	it('hydrateNFTWithMetadata handles fetch exceptions gracefully', async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error('boom')) as any
		const out = await hydrateNFTWithMetadata(appSummaryToNFT(baseApp))
		expect(out.did).toBe(baseApp.did)
	})

	it('appSummariesToNFTsWithMetadata hydrates all NFTs', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any
		const out = await appSummariesToNFTsWithMetadata([baseApp, baseApp])
		expect(out).toHaveLength(2)
	})

	it('hasInterface and helpers compute correctly', () => {
		// bitmap 0b111 (7)
		expect(hasInterface(7, 'human')).toBe(true)
		expect(hasInterface(7, 'api')).toBe(true)
		expect(hasInterface(7, 'contract')).toBe(true)
		// get types
		expect(getInterfaceTypes(5)).toEqual(['human', 'contract'])
		// create bitmap
		expect(createInterfacesBitmap(['human', 'api'])).toBe(3)
	})
})
