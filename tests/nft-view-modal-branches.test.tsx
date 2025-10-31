import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NFTViewModal from '@/components/nft-view-modal'

const baseNft = {
	did: 'did:web:example.com',
	version: '1.0.0',
	name: 'App',
	interfaces: 1,
	status: 0,
	minter: '0xowner000000000000000000000000000000000000',
	dataUrl: 'https://example.com/data.json',
	image: '',
	external_url: '',
	traits: [],
} as any

// Mock thirdweb account to be owner
vi.mock('thirdweb/react', () => ({ useActiveAccount: () => ({ address: '0xOwner000000000000000000000000000000000000' }) }))

// Mock metadata hooks
vi.mock('@/lib/nft-metadata-context', () => ({
	useNFTMetadata: () => ({
		getNFTMetadata: () => ({ displayData: { name: 'App', image: '', external_url: '', description: 'desc', screenshotUrls: [], platforms: {} }, isLoading: false }),
		fetchNFTDescription: vi.fn(),
	}),
}))

// Mock useMetadata
vi.mock('@/lib/contracts', () => ({ useMetadata: () => ({ data: {}, isLoading: false }) }))

// Mock env/resolver to be ZeroAddress path
vi.mock('@/config/env', () => ({ env: { resolverAddress: '0x0000000000000000000000000000000000000000' } }))

// Mock iwps builder
vi.mock('@/lib/iwps', () => ({ buildIwpsProxyRequest: (nft: any) => ({ requestBody: { nft }, generatedPin: '123456' }) }))

// Mock toast
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }))

// Dialog child
vi.mock('@/components/launch-confirmation-dialog', () => ({ default: ({ isOpen }: any) => isOpen ? <div data-testid="launch-confirm" /> : null }))

// Mock fetch
const fetchMock = vi.fn()
vi.stubGlobal('fetch', (...args: any[]) => fetchMock(...args))

describe('NFTViewModal branches', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	afterEach(() => {
		fetchMock.mockReset()
	})

	it('handles launch denial (approval=false)', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ approval: false, error: 'denied' }) })
		render(<NFTViewModal isOpen nft={baseNft} handleCloseViewModal={() => {}} onUpdateStatus={async () => {}} />)
		fireEvent.click(screen.getByRole('button', { name: /launch/i }))
		await waitFor(() => expect(fetchMock).toHaveBeenCalled())
		expect(screen.queryByTestId('launch-confirm')).not.toBeInTheDocument()
	})

	it('shows launch confirmation when approved', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ approval: true, destinationUrl: 'https://d', downloadUrl: '', location: '' }) })
		render(<NFTViewModal isOpen nft={baseNft} handleCloseViewModal={() => {}} onUpdateStatus={async () => {}} />)
		fireEvent.click(screen.getByRole('button', { name: /launch/i }))
		await waitFor(() => expect(screen.getByTestId('launch-confirm')).toBeInTheDocument())
	})

	it.skip('status change shows error banner on failure', async () => {})
})
