import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DidVerification } from '@/components/did-verification'

// Mock env
vi.mock('@/config/env', () => ({
	env: { activeChain: { chainId: 31337 } },
}))

// Mock thirdweb
const mockAccount: { address?: string } = {}
vi.mock('thirdweb/react', () => ({
	useActiveAccount: () => (mockAccount.address ? { address: mockAccount.address } : undefined),
}))

// Mock DID utils
vi.mock('@/lib/utils/did', () => ({
	normalizeDidWeb: (input: string) => `did:web:${input}`,
}))

// Mock fetch
const fetchMock = vi.fn()
vi.stubGlobal('fetch', (...args: any[]) => fetchMock(...args) as any)

describe('DidVerification', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockAccount.address = undefined
	})

	it('shows instructions and disabled button when no account', () => {
		render(<DidVerification did="did:web:example.com" onVerificationComplete={() => {}} isVerified={false} />)
		const button = screen.getByRole('button', { name: /verify did ownership/i })
		expect(button).toBeDisabled()
		expect(screen.getByText(/Website DID \(did:web\) Requirements/i)).toBeInTheDocument()
	})

	it('shows error if DID is empty when clicking with account connected', async () => {
		mockAccount.address = '0xabc'
		render(<DidVerification did="" onVerificationComplete={() => {}} isVerified={false} />)
		const button = screen.getByRole('button')
		fireEvent.click(button)
		await waitFor(() => {
			expect(screen.getByText(/Please enter a DID first/i)).toBeInTheDocument()
		})
	})

	it('calls API and reports success', async () => {
		mockAccount.address = '0x1234567890123456789012345678901234567890'
		const onComplete = vi.fn()
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ ok: true, status: 'ready', txHashes: ['0x1'] }),
		})
		render(<DidVerification did="did:web:example.com" onVerificationComplete={onComplete} isVerified={false} />)
		const button = screen.getByRole('button', { name: /verify did ownership/i })
		expect(button).not.toBeDisabled()
		fireEvent.click(button)
		await waitFor(() => expect(onComplete).toHaveBeenCalledWith(true))
	})

	it('handles API failure gracefully and reports false', async () => {
		mockAccount.address = '0x1234567890123456789012345678901234567890'
		const onComplete = vi.fn()
		fetchMock.mockResolvedValueOnce({
			ok: false,
			json: async () => ({ ok: false, error: 'Failed', details: [] }),
		})
		render(<DidVerification did="example.com" onVerificationComplete={onComplete} isVerified={false} />)
		const button = screen.getByRole('button')
		fireEvent.click(button)
		await waitFor(() => {
			expect(onComplete).toHaveBeenCalledWith(false)
			expect(screen.getByText(/Verification failed/i)).toBeInTheDocument()
		})
	})

it('surfaces API detail errors from successful response with failure status', async () => {
	mockAccount.address = '0x1234567890123456789012345678901234567890'
	const onComplete = vi.fn()
	const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

	fetchMock.mockResolvedValueOnce({
		ok: true,
		json: async () => ({
			ok: false,
			error: 'Detailed failure',
			details: [
				{
					schema: 'oma3.ownership.v1',
					error: '{"message":"bad schema"}',
					diagnostics: { hint: 'check dns' },
				},
			],
		}),
	})

	render(<DidVerification did="example.com" onVerificationComplete={onComplete} isVerified={false} />)
	fireEvent.click(screen.getByRole('button'))

	await waitFor(() => {
		expect(onComplete).toHaveBeenCalledWith(false)
		expect(screen.getByText(/Detailed failure/i)).toBeInTheDocument()
	})

	expect(consoleError).toHaveBeenCalled()
	consoleError.mockRestore()
})

it('shows friendly message when the verify request throws', async () => {
	mockAccount.address = '0x1234567890123456789012345678901234567890'
	const onComplete = vi.fn()

	fetchMock.mockRejectedValueOnce(new Error('Network down'))

	render(<DidVerification did="example.com" onVerificationComplete={onComplete} isVerified={false} />)
	fireEvent.click(screen.getByRole('button'))

	await waitFor(() => {
		expect(onComplete).toHaveBeenCalledWith(false)
		expect(screen.getByText(/Network down/i)).toBeInTheDocument()
	})
})

	it('renders verified state UI and disables button', () => {
		render(<DidVerification did="did:web:example.com" onVerificationComplete={() => {}} isVerified={true} />)
		expect(screen.getByText(/DID Ownership Verified/i)).toBeInTheDocument()
		const btn = screen.getByRole('button', { name: /verified/i })
		expect(btn).toBeDisabled()
	})

	it('handles empty DID gracefully when account is disconnected', () => {
		// Test empty DID with no account - should show instructions but no error
		render(<DidVerification did="" onVerificationComplete={() => {}} isVerified={false} />)
		expect(screen.getByRole('button')).toBeDisabled()
		expect(screen.queryByText(/Please enter a DID first/i)).not.toBeInTheDocument()
	})

	it('normalizes plain domain to did:web format', async () => {
		// Test that plain domains are normalized using normalizeDidWeb
		mockAccount.address = '0x1234567890123456789012345678901234567890'
		const onComplete = vi.fn()
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ ok: true, status: 'ready' }),
		})

		render(<DidVerification did="example.com" onVerificationComplete={onComplete} isVerified={false} />)
		fireEvent.click(screen.getByRole('button'))

		await waitFor(() => expect(fetchMock).toHaveBeenCalled())

		// Verify the API was called with normalized DID
		const callBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
		expect(callBody.did).toBe('did:web:example.com')
	})

	it('handles JSON parse error in detail diagnostics gracefully', async () => {
		// Test that non-JSON error strings don't crash the component
		mockAccount.address = '0x1234567890123456789012345678901234567890'
		const onComplete = vi.fn()
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				ok: false,
				error: 'Verification failed',
				details: [
					{
						schema: 'oma3.ownership.v1',
						error: 'Plain text error message',  // Not JSON
					},
				],
			}),
		})

		render(<DidVerification did="example.com" onVerificationComplete={onComplete} isVerified={false} />)
		fireEvent.click(screen.getByRole('button'))

		await waitFor(() => {
			expect(onComplete).toHaveBeenCalledWith(false)
		})

		expect(consoleError).toHaveBeenCalled()
		consoleError.mockRestore()
	})

	it('displays CAIP-10 with correct chainId from env', () => {
		// Test that the instructions show the correct CAIP-10 format
		mockAccount.address = '0x1234567890123456789012345678901234567890'
		render(<DidVerification did="did:web:example.com" onVerificationComplete={() => {}} isVerified={false} />)

		// Should display eip155:31337 (from mocked env) - appears multiple times in instructions
		const elements = screen.getAllByText(/eip155:31337:0x1234567890123456789012345678901234567890/i)
		expect(elements.length).toBeGreaterThan(0)
	})

	it('extracts and displays domain correctly from DID', () => {
		// Test domain extraction for instructions  
		render(<DidVerification did="did:web:sub.example.com/path/to/doc" onVerificationComplete={() => {}} isVerified={false} />)

		// Should extract "sub.example.com" as the domain - appears multiple times in instructions
		const elements = screen.getAllByText(/sub\.example\.com/i)
		expect(elements.length).toBeGreaterThan(0)
	})
})

