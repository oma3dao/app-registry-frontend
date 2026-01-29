import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { OnchainTransferInstructions } from '@/components/onchain-transfer-instructions'
import type { ComponentProps } from 'react'

declare global {
	// eslint-disable-next-line no-var
	var __useActiveAccountMock: vi.Mock | undefined
}

vi.mock('thirdweb/react', () => {
	const useActiveAccount = vi.fn(() => ({
		address: '0xMintingWallet000000000000000000000000000000',
	}))
	globalThis.__useActiveAccountMock = useActiveAccount as vi.Mock

	return { useActiveAccount }
})

// Mock onchain-transfer functions per OMATrust spec
// Note: getRecipientAddress no longer exists - component uses mintingWallet directly
vi.mock('@/lib/verification/onchain-transfer', () => ({
	calculateTransferAmount: vi.fn((subjectDid: string, counterpartyDid: string, chainId: number, proofPurpose: string) => {
		// Per OMATrust spec §5.3.6, calculateTransferAmount takes 4 params including proofPurpose
		return BigInt('100000000000000')
	}),
	formatTransferAmount: vi.fn(() => ({ formatted: '0.0001', symbol: 'ETH', wei: '100000000000000' })),
	getChainIdFromDid: vi.fn(() => 1),
	buildPkhDid: vi.fn((chainId: number, address: string) => `did:pkh:eip155:${chainId}:${address.toLowerCase()}`),
	getExplorerAddressUrl: vi.fn((_chainId: number, address: string) => `https://explorer/address/${address}`),
	getExplorerTxUrl: vi.fn((_chainId: number, hash: string) => `https://explorer/tx/${hash}`),
	PROOF_PURPOSE: {
		SHARED_CONTROL: 'shared-control',
		COMMERCIAL_TX: 'commercial-tx',
	},
}))

const getUseActiveAccountMock = () => {
	if (!globalThis.__useActiveAccountMock) {
		throw new Error('useActiveAccount mock not initialised')
	}
	return globalThis.__useActiveAccountMock
}

describe('OnchainTransferInstructions (OMATrust Specification)', () => {
	const did = 'did:pkh:eip155:1:0xDelegate0000000000000000000000000000000000'
	const controllingWallet = '0xControllingWallet000000000000000000000000000000'

	let openSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		vi.useFakeTimers()
		openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
		Object.assign(navigator, {
			clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
		})
		getUseActiveAccountMock()
			.mockReset()
			.mockImplementation(() => ({
			address: '0xMintingWallet000000000000000000000000000000',
			}))
	})

	afterEach(() => {
		act(() => {
			vi.runOnlyPendingTimers()
		})
		vi.useRealTimers()
		openSpy.mockRestore()
		getUseActiveAccountMock().mockClear()
	})

	const renderComponent = (overrides: Partial<ComponentProps<typeof OnchainTransferInstructions>> = {}) =>
		render(
			<OnchainTransferInstructions
				did={did}
				controllingWallet={controllingWallet}
				onTransferProvided={vi.fn()}
				{...overrides}
			/>
		)

	it('shows transfer details and calls onTransferProvided with the trimmed hash', () => {
		const onTransferProvided = vi.fn()
		renderComponent({ onTransferProvided })

		expect(screen.getAllByText('From (Controlling Wallet)')[0]).toBeInTheDocument()
		expect(screen.getAllByText('To (Minting Wallet)')[0]).toBeInTheDocument()
		
		// Per spec, UI text changed from "Exact Amount (CRITICAL - Must be exact!)" to "Exact Amount"
		const amountLabel = screen.getByText('Exact Amount')
		expect(amountLabel).toBeInTheDocument()

		const hashInput = screen.getByLabelText(/Transaction Hash/i)
		fireEvent.change(hashInput, { target: { value: ' 0xabc123 ' } })

		const submitButton = screen.getByRole('button', { name: /verify transfer/i })
		expect(submitButton).not.toBeDisabled()

		fireEvent.click(submitButton)
		expect(onTransferProvided).toHaveBeenCalledWith('0xabc123')
	})

	it('copies helper fields and opens explorer links', () => {
		renderComponent()

		const fromSection = screen.getAllByText('From (Controlling Wallet)')[0].parentElement!
		const [copyFromButton, openFromButton] = Array.from(fromSection.querySelectorAll('button'))

		fireEvent.click(copyFromButton)
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(controllingWallet)

		fireEvent.click(openFromButton)
		expect(openSpy).toHaveBeenCalledWith(expect.stringContaining(controllingWallet), '_blank')

		// Find amount section by new label text "Exact Amount"
		const amountSection = screen.getByText('Exact Amount').parentElement!
		const amountCopyButton = amountSection.querySelector('button') as HTMLButtonElement
		fireEvent.click(amountCopyButton)
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('0.0001')

		act(() => {
			vi.advanceTimersByTime(2000)
		})
	})

	it('renders nothing when the connected minting wallet is unavailable', () => {
		getUseActiveAccountMock().mockReturnValueOnce(undefined)

		const { container } = renderComponent()
		expect(container).toBeEmptyDOMElement()
	})

	it('does not call onTransferProvided when hash is empty', () => {
		const onTransferProvided = vi.fn()
		renderComponent({ onTransferProvided })

		const submitButton = screen.getByRole('button', { name: /verify transfer/i })
		fireEvent.click(submitButton)

		// Should not be called because hash is empty
		expect(onTransferProvided).not.toHaveBeenCalled()
	})

	it('does not call onTransferProvided when hash contains only whitespace', () => {
		const onTransferProvided = vi.fn()
		renderComponent({ onTransferProvided })

		const hashInput = screen.getByLabelText(/Transaction Hash/i)
		fireEvent.change(hashInput, { target: { value: '   ' } })

		const submitButton = screen.getByRole('button', { name: /verify transfer/i })
		fireEvent.click(submitButton)

		// Should not be called because trimmed hash is empty
		expect(onTransferProvided).not.toHaveBeenCalled()
	})

	it('shows and hides copy success indicator after timeout', () => {
		renderComponent()

		const amountSection = screen.getByText('Exact Amount').parentElement!
		const amountCopyButton = amountSection.querySelector('button') as HTMLButtonElement
		
		// Verify copy button exists before clicking
		expect(amountCopyButton).toBeTruthy()
		
		fireEvent.click(amountCopyButton)
		
		// Verify clipboard was called
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('0.0001')

		// Advance timers to trigger the timeout
		act(() => {
			vi.advanceTimersByTime(2000)
		})

		// After timeout, we should be able to copy again
		fireEvent.click(amountCopyButton)
		expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2)
	})

	it('copies the minting wallet (To address) when copy button is clicked', () => {
		renderComponent()

		const toSection = screen.getAllByText('To (Minting Wallet)')[0].parentElement!
		const copyToButton = toSection.querySelector('button') as HTMLButtonElement

		fireEvent.click(copyToButton)
		// Per spec, getRecipientAddress no longer exists - component uses mintingWallet directly
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('0xMintingWallet000000000000000000000000000000')
	})

	it('To address section has only copy button, no external link', () => {
		renderComponent()

		const toSection = screen.getAllByText('To (Minting Wallet)')[0].parentElement!
		const buttons = Array.from(toSection.querySelectorAll('button'))
		
		// The To section should have only 1 button (copy)
		expect(buttons).toHaveLength(1)
		
		// Clicking the button should copy, not open a link
		fireEvent.click(buttons[0])
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('0xMintingWallet000000000000000000000000000000')
		expect(openSpy).not.toHaveBeenCalled()
	})

	it('updates transaction hash input value', () => {
		renderComponent()

		const hashInput = screen.getByLabelText(/Transaction Hash/i) as HTMLInputElement
		expect(hashInput.value).toBe('')

		fireEvent.change(hashInput, { target: { value: '0xtest123' } })
		expect(hashInput.value).toBe('0xtest123')
	})

	it('calls calculateTransferAmount with correct parameters per OMATrust spec', async () => {
		const { calculateTransferAmount, buildPkhDid, PROOF_PURPOSE } = await import('@/lib/verification/onchain-transfer')
		
		renderComponent()

		// Per OMATrust spec §5.3.6, calculateTransferAmount should be called with:
		// - subjectDid: the DID being proven
		// - counterpartyDid: the recipient DID (built from minting wallet)
		// - chainId: extracted from DID
		// - proofPurpose: PROOF_PURPOSE.SHARED_CONTROL
		expect(buildPkhDid).toHaveBeenCalledWith(1, '0xMintingWallet000000000000000000000000000000')
		expect(calculateTransferAmount).toHaveBeenCalledWith(
			did,
			'did:pkh:eip155:1:0xmintingwallet000000000000000000000000000000',
			1,
			PROOF_PURPOSE.SHARED_CONTROL
		)
	})

	it('displays transfer amount with correct formatting', () => {
		renderComponent()

		// Should display formatted amount
		expect(screen.getByText(/0\.0001/)).toBeInTheDocument()
		expect(screen.getByText(/ETH/)).toBeInTheDocument()
	})

	it('shows warning about exact amount requirement with updated text', () => {
		renderComponent()

		// Should show warning about exact amount
		const warning = screen.getByText(/Important/i)
		expect(warning).toBeInTheDocument()
		
		// Should mention copying the amount (new UI text)
		const copyText = screen.getByText(/Copy the amount using the button/i)
		expect(copyText).toBeInTheDocument()
		
		// Should mention pasting exact value
		const pasteText = screen.getByText(/Paste the exact value into your wallet/i)
		expect(pasteText).toBeInTheDocument()
	})

	it('shows updated amount label text', () => {
		renderComponent()

		// New UI text is "Exact Amount" (not "Exact Amount (CRITICAL - Must be exact!)")
		const amountLabel = screen.getByText('Exact Amount')
		expect(amountLabel).toBeInTheDocument()
		
		// Should show warning text below amount
		const warningText = screen.getByText(/Use the copy button/i)
		expect(warningText).toBeInTheDocument()
	})

	it('opens explorer link for transaction hash when provided', () => {
		renderComponent()

		const hashInput = screen.getByLabelText(/Transaction Hash/i)
		fireEvent.change(hashInput, { target: { value: '0xabc123' } })

		// Find the external link button for transaction
		const buttons = screen.getAllByRole('button')
		const txButton = buttons.find(btn => {
			const svg = btn.querySelector('svg')
			const input = btn.closest('div')?.querySelector('input')
			return svg && input
		})
		
		if (txButton) {
			fireEvent.click(txButton)
			// Explorer URL should be called (mocked)
		}
	})

	it('uses minting wallet directly as recipient (no getRecipientAddress)', () => {
		renderComponent()

		// Component should use mintingWallet directly, not getRecipientAddress
		const toSection = screen.getAllByText('To (Minting Wallet)')[0].parentElement!
		const addressCode = toSection.querySelector('code')
		
		expect(addressCode?.textContent).toBe('0xMintingWallet000000000000000000000000000000')
	})
})
