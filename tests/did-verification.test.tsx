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

	it('renders verified state UI and disables button', () => {
		render(<DidVerification did="did:web:example.com" onVerificationComplete={() => {}} isVerified={true} />)
		expect(screen.getByText(/DID Ownership Verified/i)).toBeInTheDocument()
		const btn = screen.getByRole('button', { name: /verified/i })
		expect(btn).toBeDisabled()
	})
})

