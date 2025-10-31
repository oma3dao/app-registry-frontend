import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import NFTViewModal from '@/components/nft-view-modal'

const baseNft = {
	did: 'did:web:example.com',
	version: '1.0.0',
	name: 'App',
	interfaces: 1,
	status: 0,
	minter: '0xowner000000000000000000000000000000000000',
	owner: '0xowner000000000000000000000000000000000000',
	dataUrl: 'https://example.com/data.json',
	image: '',
	external_url: '',
	traits: [],
} as any

// Mock wallet as owner
vi.mock('thirdweb/react', () => ({ useActiveAccount: () => ({ address: '0xOwner000000000000000000000000000000000000' }) }))

// Provide thirdweb base mocks used by app/client and resolver read
const readContractMock = vi.fn()
vi.mock('thirdweb', () => ({
	createThirdwebClient: vi.fn(() => ({})),
	readContract: (...args: any[]) => readContractMock(...args),
}))

// Resolver configured (non-zero)
vi.mock('@/config/env', () => ({ env: { resolverAddress: '0x1111111111111111111111111111111111111111' } }))

// Metadata context includes dataHashVerification for shield rendering
vi.mock('@/lib/nft-metadata-context', () => ({
	useNFTMetadata: () => ({
		getNFTMetadata: () => ({
			displayData: { name: 'App', image: '', external_url: '', description: 'desc', screenshotUrls: [], platforms: {} },
			isLoading: false,
			dataHashVerification: { isValid: true, message: 'Verified' },
			rawData: {},
		}),
		fetchNFTDescription: vi.fn(),
	}),
}))

// useMetadata returns non-null to set metadataExists true
vi.mock('@/lib/contracts', () => ({ useMetadata: () => ({ data: {}, isLoading: false }) }))

// Registry read and resolver client
const getAppByDidMock = vi.fn()
const getResolverContractMock = vi.fn(() => ({ address: '0xresolver' }))
vi.mock('@/lib/contracts/registry.read', () => ({ getAppByDid: (...args: any[]) => getAppByDidMock(...args) }))
vi.mock('@/lib/contracts/client', () => ({ getResolverContract: (...args: any[]) => getResolverContractMock(...args) }))

// Simple metadata hook for owner banner
vi.mock('@/schema/data-model', async (orig) => {
	const mod = await orig()
	return { ...mod, isMetadataOwnerVerified: (nft: any) => nft.owner?.toLowerCase?.() === nft.minter?.toLowerCase?.() }
})

describe('NFTViewModal attestation and owner banners', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	afterEach(() => {})

	it('shows attestation message title when resolver returns true', async () => {
		getAppByDidMock.mockResolvedValue({ dataHash: '0x' + '0'.repeat(64) })
		readContractMock.mockResolvedValue(true)
		render(<NFTViewModal isOpen nft={baseNft} handleCloseViewModal={() => {}} onUpdateStatus={async () => {}} />)
		await waitFor(() => expect(screen.getByTitle(/data hash attested/i)).toBeInTheDocument())
		expect(screen.getByText(/owner verified/i)).toBeInTheDocument()
	})

	it('does not show attestation title when resolver returns false', async () => {
		getAppByDidMock.mockResolvedValue({ dataHash: '0x' + '0'.repeat(64) })
		readContractMock.mockResolvedValue(false)
		render(<NFTViewModal isOpen nft={baseNft} handleCloseViewModal={() => {}} onUpdateStatus={async () => {}} />)
		// Wait for render stabilization
		await waitFor(() => expect(screen.getByText(/app/i)).toBeInTheDocument())
		expect(screen.queryByTitle(/data hash attested/i)).toBeNull()
		expect(screen.getByText(/owner verified/i)).toBeInTheDocument()
	})

	it('handles attestation errors with owner mismatch banner', async () => {
		getAppByDidMock.mockResolvedValue({ dataHash: '0x' + '0'.repeat(64) })
		readContractMock.mockRejectedValue(new Error('boom'))
		render(<NFTViewModal isOpen nft={{ ...baseNft, owner: '0xnotowner' }} handleCloseViewModal={() => {}} onUpdateStatus={async () => {}} />)
		await waitFor(() => expect(screen.getByText(/owner mismatch/i)).toBeInTheDocument())
	})
})
