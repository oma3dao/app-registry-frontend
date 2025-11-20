import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NFTViewModal from '@/components/nft-view-modal'

// Mock wallet as the owner/minter
vi.mock('thirdweb/react', () => ({ useActiveAccount: () => ({ address: '0xowner000000000000000000000000000000000000' }) }))

// Mock Select UI primitives to native select for easier interaction
vi.mock('@/components/ui/select', () => ({
	Select: ({ children, value, onValueChange }: any) => (
		<select aria-label="Status" role="combobox" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
			<option value="0">Active</option>
			<option value="1">Deprecated</option>
			<option value="2">Replaced</option>
		</select>
	),
	SelectTrigger: ({ children }: any) => <>{children}</>,
	SelectContent: ({ children }: any) => <>{children}</>,
	SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}))

// Minimal metadata and context
vi.mock('@/lib/contracts', () => ({ useMetadata: () => ({ data: {}, isLoading: false }) }))
vi.mock('@/lib/nft-metadata-context', () => ({
	useNFTMetadata: () => ({
		getNFTMetadata: () => ({ displayData: { name: 'App', image: '', external_url: '', description: 'desc', screenshotUrls: [], platforms: {} }, isLoading: false }),
		fetchNFTDescription: vi.fn(),
	}),
}))

// Silence toasts
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const nft = {
	did: 'did:web:example.com',
	version: '1.0.0',
	name: 'App',
	interfaces: 1,
	status: 0, // Active
	minter: '0xowner000000000000000000000000000000000000',
	owner: '0xowner000000000000000000000000000000000000',
	currentOwner: '0xOwner000000000000000000000000000000000000',
	dataUrl: 'https://example.com/data.json',
	traits: [],
} as any

describe('NFTViewModal edit status success path', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('allows owner to change status via Select and saves successfully', async () => {
		const onUpdateStatus = vi.fn().mockResolvedValue(undefined)
		const onClose = vi.fn()
		render(
			<NFTViewModal
				isOpen
				handleCloseViewModal={onClose}
				nft={nft}
				onUpdateStatus={onUpdateStatus}
				onEditMetadata={vi.fn()}
			/>,
		)

		// Enter edit mode
		fireEvent.click(screen.getByRole('button', { name: /change/i }))

		// Change select to Deprecated
		const select = screen.getByRole('combobox', { name: /status/i })
		fireEvent.change(select, { target: { value: '1' } })

		// Save changes
		fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

		await waitFor(() => expect(onUpdateStatus).toHaveBeenCalled())
		await waitFor(() => expect(onClose).toHaveBeenCalled())
	})
})
