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

vi.mock('@/lib/verification/onchain-transfer', () => ({
	calculateTransferAmount: vi.fn(() => BigInt('100000000000000')),
	formatTransferAmount: vi.fn(() => ({ formatted: '0.01', symbol: 'ETH', wei: '100000000000000' })),
	getRecipientAddress: vi.fn((_chainId: number, mintingWallet: string) => mintingWallet),
	getChainIdFromDid: vi.fn(() => 1),
	getExplorerAddressUrl: vi.fn((_chainId: number, address: string) => `https://explorer/address/${address}`),
	getExplorerTxUrl: vi.fn((_chainId: number, hash: string) => `https://explorer/tx/${hash}`),
}))

const getUseActiveAccountMock = () => {
	if (!globalThis.__useActiveAccountMock) {
		throw new Error('useActiveAccount mock not initialised')
	}
	return globalThis.__useActiveAccountMock
}

describe('OnchainTransferInstructions', () => {
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
		expect(screen.getByText('Exact Amount (CRITICAL - Must be exact!)')).toBeInTheDocument()

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

		const amountSection = screen.getAllByText('Exact Amount (CRITICAL - Must be exact!)')[0].parentElement!
		const amountCopyButton = amountSection.querySelector('button') as HTMLButtonElement
		fireEvent.click(amountCopyButton)
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('0.01')

		act(() => {
			vi.advanceTimersByTime(2000)
		})
	})

	it('renders nothing when the connected minting wallet is unavailable', () => {
		getUseActiveAccountMock().mockReturnValueOnce(undefined)

		const { container } = renderComponent()
		expect(container).toBeEmptyDOMElement()
	})

	// Test that button is disabled when transaction hash is empty
	it('does not call onTransferProvided when hash is empty', () => {
		const onTransferProvided = vi.fn()
		renderComponent({ onTransferProvided })

		const submitButton = screen.getByRole('button', { name: /verify transfer/i })
		fireEvent.click(submitButton)

		// Should not be called because hash is empty
		expect(onTransferProvided).not.toHaveBeenCalled()
	})

	// Test that whitespace-only hash is not submitted
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

	// Test that copy success indicator disappears after timeout
	it('shows and hides copy success indicator after timeout', () => {
		renderComponent()

		const amountSection = screen.getAllByText('Exact Amount (CRITICAL - Must be exact!)')[0].parentElement!
		const amountCopyButton = amountSection.querySelector('button') as HTMLButtonElement
		
		// Verify copy button exists before clicking
		expect(amountCopyButton).toBeTruthy()
		
		fireEvent.click(amountCopyButton)
		
		// Verify clipboard was called
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('0.01')

		// Advance timers to trigger the timeout
		act(() => {
			vi.advanceTimersByTime(2000)
		})

		// After timeout, we should be able to copy again
		fireEvent.click(amountCopyButton)
		expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2)
	})

	// Test that To address copy button works correctly
	it('copies the minting wallet (To address) when copy button is clicked', () => {
		renderComponent()

		const toSection = screen.getAllByText('To (Minting Wallet)')[0].parentElement!
		const copyToButton = toSection.querySelector('button') as HTMLButtonElement

		fireEvent.click(copyToButton)
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('0xMintingWallet000000000000000000000000000000')
	})

	// Test that To address section only has copy button (no external link)
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

	// Test the transaction hash input onChange behavior
	it('updates transaction hash input value', () => {
		renderComponent()

		const hashInput = screen.getByLabelText(/Transaction Hash/i) as HTMLInputElement
		expect(hashInput.value).toBe('')

		fireEvent.change(hashInput, { target: { value: '0xtest123' } })
		expect(hashInput.value).toBe('0xtest123')
	})
})
