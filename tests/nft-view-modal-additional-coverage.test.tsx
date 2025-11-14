// tests/nft-view-modal-additional-coverage.test.tsx
// Additional tests to cover remaining edge cases and error paths in NFTViewModal
// This file focuses on launch network errors and other uncovered branches

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NFTViewModal from '@/components/nft-view-modal'

// Mock Select components
vi.mock('@/components/ui/select', () => ({
	Select: ({ children, value, onValueChange }: any) => (
		<select aria-label="Status" role="combobox" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
			{children}
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
	name: 'Test App',
	description: 'A test application',
	publisher: 'Test Publisher',
	image: 'https://example.com/image.png',
	interfaces: 1,
	status: 0,
	minter: '0xowner000000000000000000000000000000000000',
	currentOwner: '0xOwner000000000000000000000000000000000000',
	dataUrl: 'https://example.com/data.json',
	iwpsPortalUrl: 'https://portal.example.com',
	external_url: 'https://example.com',
	traits: [],
} as any

// Mock thirdweb account
vi.mock('thirdweb/react', () => ({ 
	useActiveAccount: () => ({ address: '0xOwner000000000000000000000000000000000000' }) 
}))

// Mock NFT metadata context
vi.mock('@/lib/nft-metadata-context', () => ({
	useNFTMetadata: () => ({
		getNFTMetadata: () => ({ 
			displayData: { 
				name: 'Test App', 
				image: 'https://example.com/image.png', 
				external_url: 'https://example.com', 
				description: 'Test description', 
				screenshotUrls: [], 
				platforms: {} 
			}, 
			isLoading: false 
		}),
		fetchNFTDescription: vi.fn(),
	}),
}))

// Mock contracts
vi.mock('@/lib/contracts', () => ({ 
	useMetadata: () => ({ data: {}, isLoading: false })
}))

// Mock thirdweb
vi.mock('thirdweb', () => ({
	createThirdwebClient: vi.fn(() => ({ clientId: 'test-client-id' })),
	readContract: vi.fn().mockResolvedValue(false),
}))

// Mock env
vi.mock('@/config/env', () => ({ 
	env: { resolverAddress: '0x0000000000000000000000000000000000000000' } 
}))

// Mock iwps
vi.mock('@/lib/iwps', () => ({ 
	buildIwpsProxyRequest: (nft: any) => ({ 
		requestBody: { nft: nft.name }, 
		generatedPin: '123456' 
	}) 
}))

// Mock toast
vi.mock('sonner', () => ({ 
	toast: { 
		info: vi.fn(), 
		error: vi.fn(), 
		success: vi.fn() 
	} 
}))

// Mock launch confirmation dialog
vi.mock('@/components/launch-confirmation-dialog', () => ({ 
	default: ({ isOpen }: any) => isOpen ? <div data-testid="launch-confirm" /> : null 
}))

// Mock fetch
const fetchMock = vi.fn()
vi.stubGlobal('fetch', (...args: any[]) => fetchMock(...args))

describe('NFTViewModal - Additional Coverage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(async () => {
		fetchMock.mockReset()
		await new Promise(resolve => setTimeout(resolve, 0))
	})

	/**
	 * Test: covers lines 336-342 - Network error during launch
	 * Tests that network errors are caught and handled properly
	 */
	it('handles network error during launch (fetch throws)', async () => {
		// Simulate network error
		fetchMock.mockRejectedValue(new Error('Network request failed'))
		
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const toast = await import('sonner')
		const toastErrorSpy = vi.spyOn(toast.toast, 'error')
		
		render(
			<NFTViewModal 
				isOpen 
				nft={baseNft} 
				handleCloseViewModal={() => {}} 
				onUpdateStatus={async () => {}} 
			/>
		)
		
		// Click launch button
		const launchButton = screen.getByRole('button', { name: /launch/i })
		fireEvent.click(launchButton)
		
		// Should catch the error and display toast (lines 336-342)
		await waitFor(() => {
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Failed to call IWPS proxy:',
				expect.any(Error)
			)
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Detailed error:',
				'Network request failed'
			)
			expect(toastErrorSpy).toHaveBeenCalledWith(
				'Launch failed: Could not connect to the launch service.'
			)
		})
		
		// Should not show launch confirmation
		expect(screen.queryByTestId('launch-confirm')).not.toBeInTheDocument()
		
		consoleErrorSpy.mockRestore()
	})

	/**
	 * Test: covers error instanceof Error check (line 339)
	 * Tests the detailed error logging for Error instances
	 */
	it('logs detailed error message for Error instance in launch', async () => {
		const networkError = new Error('DNS resolution failed')
		fetchMock.mockRejectedValue(networkError)
		
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		
		render(
			<NFTViewModal 
				isOpen 
				nft={baseNft} 
				handleCloseViewModal={() => {}} 
				onUpdateStatus={async () => {}} 
			/>
		)
		
		fireEvent.click(screen.getByRole('button', { name: /launch/i }))
		
		// Should log the error message (lines 339-341)
		await waitFor(() => {
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Detailed error:',
				'DNS resolution failed'
			)
		})
		
		consoleErrorSpy.mockRestore()
	})

	/**
	 * Test: covers non-Error exception in launch catch block
	 * Tests that non-Error exceptions don't crash the error handler
	 */
	it('handles non-Error exception in launch', async () => {
		// Throw a string instead of Error
		fetchMock.mockRejectedValue('Connection timeout')
		
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const toast = await import('sonner')
		const toastErrorSpy = vi.spyOn(toast.toast, 'error')
		
		render(
			<NFTViewModal 
				isOpen 
				nft={baseNft} 
				handleCloseViewModal={() => {}} 
				onUpdateStatus={async () => {}} 
			/>
		)
		
		fireEvent.click(screen.getByRole('button', { name: /launch/i }))
		
		// Should still handle the error gracefully (lines 336-342)
		await waitFor(() => {
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Failed to call IWPS proxy:',
				'Connection timeout'
			)
			expect(toastErrorSpy).toHaveBeenCalledWith(
				'Launch failed: Could not connect to the launch service.'
			)
		})
		
		// The instanceof Error check (line 339) should be false, so detailed error not logged
		expect(consoleErrorSpy).not.toHaveBeenCalledWith(
			'Detailed error:',
			expect.anything()
		)
		
		consoleErrorSpy.mockRestore()
	})

	/**
	 * Test: covers approval === false with error message (line 322)
	 * Tests that launch denial with error message is displayed
	 */
	it('displays error message when launch is denied with reason', async () => {
		fetchMock.mockResolvedValue({ 
			ok: true, 
			json: async () => ({ 
				approval: false, 
				error: 'Device not compatible with application requirements' 
			}) 
		})
		
		const toast = await import('sonner')
		const toastErrorSpy = vi.spyOn(toast.toast, 'error')
		
		render(
			<NFTViewModal 
				isOpen 
				nft={baseNft} 
				handleCloseViewModal={() => {}} 
				onUpdateStatus={async () => {}} 
			/>
		)
		
		fireEvent.click(screen.getByRole('button', { name: /launch/i }))
		
		// Should display the error reason (line 322)
		await waitFor(() => {
			expect(toastErrorSpy).toHaveBeenCalledWith(
				'Launch Denied: Device not compatible with application requirements'
			)
		})
		
		// Should not show launch confirmation
		expect(screen.queryByTestId('launch-confirm')).not.toBeInTheDocument()
	})

	/**
	 * Test: covers approval === false without error message
	 * Tests fallback message when no reason is provided
	 */
	it('displays fallback message when launch denied without reason', async () => {
		fetchMock.mockResolvedValue({ 
			ok: true, 
			json: async () => ({ 
				approval: false 
				// No error field
			}) 
		})
		
		const toast = await import('sonner')
		const toastErrorSpy = vi.spyOn(toast.toast, 'error')
		
		render(
			<NFTViewModal 
				isOpen 
				nft={baseNft} 
				handleCloseViewModal={() => {}} 
				onUpdateStatus={async () => {}} 
			/>
		)
		
		fireEvent.click(screen.getByRole('button', { name: /launch/i }))
		
		// Should display fallback message (line 322)
		await waitFor(() => {
			expect(toastErrorSpy).toHaveBeenCalledWith(
				'Launch Denied: No reason provided.'
			)
		})
	})

	/**
	 * Test: covers successful launch with all IWPS data
	 * Tests that launch confirmation is shown with complete data
	 */
	it('shows launch confirmation with complete IWPS data', async () => {
		fetchMock.mockResolvedValue({ 
			ok: true, 
			json: async () => ({ 
				approval: true, 
				destinationUrl: 'https://app.example.com/launch',
				downloadUrl: 'https://cdn.example.com/app.exe',
				location: 'US-WEST-2'
			}) 
		})
		
		render(
			<NFTViewModal 
				isOpen 
				nft={baseNft} 
				handleCloseViewModal={() => {}} 
				onUpdateStatus={async () => {}} 
			/>
		)
		
		fireEvent.click(screen.getByRole('button', { name: /launch/i }))
		
		// Should show confirmation dialog (lines 327-334)
		await waitFor(() => {
			expect(screen.getByTestId('launch-confirm')).toBeInTheDocument()
		})
	})

	/**
	 * Test: covers handleOpenChange with open=false
	 * Tests that modal state is reset when closing
	 */
	it('resets modal state when closing', () => {
		const handleClose = vi.fn()
		
		const { rerender } = render(
			<NFTViewModal 
				isOpen={true} 
				nft={baseNft} 
				handleCloseViewModal={handleClose} 
				onUpdateStatus={async () => {}} 
			/>
		)
		
		// Close the modal by triggering handleOpenChange with false
		rerender(
			<NFTViewModal 
				isOpen={false} 
				nft={baseNft} 
				handleCloseViewModal={handleClose} 
				onUpdateStatus={async () => {}} 
			/>
		)
		
		// Modal should be closed (handleOpenChange is called internally by Dialog)
		expect(screen.queryByText(baseNft.did)).not.toBeInTheDocument()
	})

	/**
	 * Note: Tests for metadataExists and isOwner checks are covered in other test files
	 * (nft-view-modal.test.tsx and nft-view-modal-edit-status.test.tsx)
	 */

	/**
	 * Test: covers early return when nft is null (line 345)
	 * Tests that modal returns null when no NFT provided
	 */
	it('returns null when nft is null', () => {
		const { container } = render(
			<NFTViewModal 
				isOpen 
				nft={null} 
				handleCloseViewModal={() => {}} 
				onUpdateStatus={async () => {}} 
			/>
		)
		
		// Modal should not render anything (line 345: if (!nft) return null)
		expect(container.firstChild).toBeNull()
	})

	/**
	 * Test: covers toast.info call at launch start (line 271)
	 * Tests that info toast is shown when launch is initiated
	 */
	it('shows info toast when launch is initiated', async () => {
		fetchMock.mockResolvedValue({ 
			ok: true, 
			json: async () => ({ approval: true, destinationUrl: 'https://app.com' }) 
		})
		
		const toast = await import('sonner')
		const toastInfoSpy = vi.spyOn(toast.toast, 'info')
		
		render(
			<NFTViewModal 
				isOpen 
				nft={baseNft} 
				handleCloseViewModal={() => {}} 
				onUpdateStatus={async () => {}} 
			/>
		)
		
		fireEvent.click(screen.getByRole('button', { name: /launch/i }))
		
		// Should show info toast (line 271)
		await waitFor(() => {
			expect(toastInfoSpy).toHaveBeenCalledWith('Initiating launch sequence...')
		})
	})
})

