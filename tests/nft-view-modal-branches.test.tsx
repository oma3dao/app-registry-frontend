import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NFTViewModal from '@/components/nft-view-modal'

// Mock Select components for easier testing
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

const baseNft = {
	did: 'did:web:example.com',
	version: '1.0.0',
	name: 'App',
	interfaces: 1,
	status: 0,
	minter: '0xowner000000000000000000000000000000000000',
	currentOwner: '0xOwner000000000000000000000000000000000000',
	dataUrl: 'https://example.com/data.json',
	iwpsPortalUrl: 'https://portal.example.com', // Required for launch button to render
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

// Mock useMetadata and readContract
vi.mock('@/lib/contracts', () => ({ 
	useMetadata: () => ({ data: {}, isLoading: false })
}))

// Mock thirdweb readContract to prevent async operations after unmount
vi.mock('thirdweb', () => ({
	createThirdwebClient: vi.fn(() => ({ clientId: 'test-client-id' })),
	readContract: vi.fn().mockResolvedValue(false),
}))

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
	afterEach(async () => {
		fetchMock.mockReset()
		// Wait for any pending async operations to complete
		await new Promise(resolve => setTimeout(resolve, 0))
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

	// Test that error banner is displayed when status change fails
	it('status change shows error banner on failure', async () => {
		const onUpdateStatus = vi.fn().mockRejectedValue(new Error('Transaction failed: Insufficient gas'))
		render(<NFTViewModal isOpen nft={baseNft} handleCloseViewModal={() => {}} onUpdateStatus={onUpdateStatus} />)
		
		// Start editing status
		fireEvent.click(screen.getByRole('button', { name: /change/i }))
		
		// Change status to Deprecated (value 1)
		const statusSelect = screen.getByRole('combobox', { name: /status/i })
		fireEvent.change(statusSelect, { target: { value: '1' } })
		
		// Click Save changes button
		const saveButton = screen.getByRole('button', { name: /save changes/i })
		fireEvent.click(saveButton)
		
		// Wait for the error banner to appear
		await waitFor(() => {
			expect(screen.getByText('Status Update Error')).toBeInTheDocument()
		})
		
		// Verify error message is displayed
		expect(screen.getByText(/Transaction failed: Insufficient gas/i)).toBeInTheDocument()
		
		// Verify onUpdateStatus was called
		expect(onUpdateStatus).toHaveBeenCalledWith(
			expect.objectContaining({ status: 1 }),
			1
		)
	})

	/**
	 * Note: Lines 200-202 (invalid status validation) are defensive code that's
	 * difficult to test in the UI layer since the select component restricts options to 0-2.
	 * These lines would only execute if the component received invalid data from outside.
	 */

	/**
	 * Test: covers lines 234-237 - Error handling for non-Error types
	 * Tests that string and object errors are handled correctly
	 */
	it('handles string error in status update', async () => {
		const onUpdateStatus = vi.fn().mockRejectedValue('Network error occurred')
		render(<NFTViewModal isOpen nft={baseNft} handleCloseViewModal={() => {}} onUpdateStatus={onUpdateStatus} />)
		
		fireEvent.click(screen.getByRole('button', { name: /change/i }))
		const statusSelect = screen.getByRole('combobox', { name: /status/i })
		fireEvent.change(statusSelect, { target: { value: '1' } })
		fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
		
		// Should display the string error (line 234)
		await waitFor(() => {
			expect(screen.getByText('Network error occurred')).toBeInTheDocument()
		})
	})

	it('handles object error with message property in status update', async () => {
		const onUpdateStatus = vi.fn().mockRejectedValue({ message: 'Custom error object', code: 500 })
		render(<NFTViewModal isOpen nft={baseNft} handleCloseViewModal={() => {}} onUpdateStatus={onUpdateStatus} />)
		
		fireEvent.click(screen.getByRole('button', { name: /change/i }))
		const statusSelect = screen.getByRole('combobox', { name: /status/i })
		fireEvent.change(statusSelect, { target: { value: '1' } })
		fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
		
		// Should display the message from error object (lines 235-237)
		await waitFor(() => {
			expect(screen.getByText('Custom error object')).toBeInTheDocument()
		})
	})

	/**
	 * Test: covers lines 276-279 - Missing dataUrl in launch
	 * Tests that launch is rejected when NFT is missing dataUrl
	 */
	it('rejects launch when NFT is missing dataUrl', async () => {
		const nftWithoutDataUrl = { ...baseNft, dataUrl: '' }
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const toast = await import('sonner')
		const toastErrorSpy = vi.spyOn(toast.toast, 'error')
		
		render(<NFTViewModal isOpen nft={nftWithoutDataUrl} handleCloseViewModal={() => {}} onUpdateStatus={async () => {}} />)
		
		fireEvent.click(screen.getByRole('button', { name: /launch/i }))
		
		// Should log error and show toast (lines 276-279)
		await waitFor(() => {
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Cannot launch: Missing data URL')
			)
			expect(toastErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Cannot launch: Application is missing required configuration')
			)
		})
		
		// Should not call fetch since it returns early
		expect(fetchMock).not.toHaveBeenCalled()
		
		consoleErrorSpy.mockRestore()
	})

	/**
	 * Test: covers lines 296-304 - Launch proxy request error handling
	 * Tests error handling when proxy request fails
	 */
	it('handles proxy request error with JSON response', async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			status: 500,
			json: async () => ({ error: 'Proxy service unavailable' })
		})
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const toast = await import('sonner')
		const toastErrorSpy = vi.spyOn(toast.toast, 'error')
		
		render(<NFTViewModal isOpen nft={baseNft} handleCloseViewModal={() => {}} onUpdateStatus={async () => {}} />)
		
		fireEvent.click(screen.getByRole('button', { name: /launch/i }))
		
		// Should handle error response (lines 296-304)
		await waitFor(() => {
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Error from proxy:',
				'Proxy service unavailable'
			)
			expect(toastErrorSpy).toHaveBeenCalledWith(
				'Launch Error: Proxy service unavailable'
			)
		})
		
		consoleErrorSpy.mockRestore()
	})

	it('handles proxy request error without JSON response', async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			status: 503,
			json: async () => { throw new Error('Invalid JSON') } // Parse error
		})
		const toast = await import('sonner')
		const toastErrorSpy = vi.spyOn(toast.toast, 'error')
		
		render(<NFTViewModal isOpen nft={baseNft} handleCloseViewModal={() => {}} onUpdateStatus={async () => {}} />)
		
		fireEvent.click(screen.getByRole('button', { name: /launch/i }))
		
		// Should handle error with status fallback (lines 299-300)
		await waitFor(() => {
			expect(toastErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Proxy request failed with status: 503')
			)
		})
	})

	/**
	 * Test: covers lines 165-168 - Modal state reset when opening
	 * Tests that modal state is properly set when opening with an NFT
	 */
	it('sets modal state correctly when opening with NFT', async () => {
		const { rerender } = render(
			<NFTViewModal isOpen={false} nft={null} handleCloseViewModal={() => {}} onUpdateStatus={async () => {}} />
		)
		
		// Now open with an NFT
		rerender(
			<NFTViewModal isOpen={true} nft={baseNft} handleCloseViewModal={() => {}} onUpdateStatus={async () => {}} />
		)
		
		// Modal should display the NFT details (lines 165-168 are executed)
		await waitFor(() => {
			expect(screen.getByText(baseNft.did)).toBeInTheDocument()
		})
	})

	/**
	 * Test: covers lines 262-264 - handleEditMetadata without onEditMetadata prop
	 * Tests that edit button closes modal when no edit handler provided
	 */
	it('closes modal when edit is clicked without onEditMetadata handler', async () => {
		const handleClose = vi.fn()
		// Don't provide onEditMetadata prop
		render(<NFTViewModal isOpen nft={baseNft} handleCloseViewModal={handleClose} onUpdateStatus={async () => {}} />)
		
		// Find and click Edit Metadata button
		const editButton = screen.getByRole('button', { name: /edit metadata/i })
		fireEvent.click(editButton)
		
		// Should call handleCloseViewModal (lines 262-264)
		await waitFor(() => {
			expect(handleClose).toHaveBeenCalled()
		})
	})
})
