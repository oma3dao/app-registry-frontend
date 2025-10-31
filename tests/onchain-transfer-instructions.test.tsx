import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OnchainTransferInstructions } from '@/components/onchain-transfer-instructions'

// Mock thirdweb account
vi.mock('thirdweb/react', () => ({ useActiveAccount: () => ({ address: '0xMintingWallet000000000000000000000000000000' }) }))

// Mock verification helpers
vi.mock('@/lib/verification/onchain-transfer', () => ({
	calculateTransferAmount: vi.fn(() => BigInt('100000000000000')),
	formatTransferAmount: vi.fn(() => ({ formatted: '0.01', symbol: 'ETH', wei: '100000000000000' })),
	getRecipientAddress: vi.fn((chainId: number, mint: string) => mint),
	getChainIdFromDid: vi.fn(() => 1),
	getExplorerAddressUrl: vi.fn((c: number, a: string) => `https://explorer/address/${a}`),
	getExplorerTxUrl: vi.fn((c: number, h: string) => `https://explorer/tx/${h}`),
}))

// Mock clipboard API
Object.assign(navigator, {
	clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
})

describe.skip('OnchainTransferInstructions', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
	})

	it('renders key fields and enables submit when tx hash entered', () => {
		render(
			<OnchainTransferInstructions
				appDidVersioned={"did:web:example.com/v/1.0"}
				mintingWallet={"0xMintingWallet000000000000000000000000000000"}
				recipientDid={"did:pkh:eip155:1:0xRecipient0000000000000000000000000000000000"}
				onSubmit={vi.fn()}
			/>
		)

		expect(screen.getByText(/Minting Wallet/i)).toBeInTheDocument()
		expect(screen.getByText(/Transfer Amount/i)).toBeInTheDocument()

		const hashInput = screen.getByPlaceholderText(/0x Transaction Hash/i)
		fireEvent.change(hashInput, { target: { value: '0xabc' } })
		expect(screen.getByRole('button', { name: /submit/i })).toBeEnabled()
	})

	it('copy buttons invoke clipboard and timers are flushed', () => {
		render(
			<OnchainTransferInstructions
				appDidVersioned={"did:web:example.com/v/1.0"}
				mintingWallet={"0xMintingWallet000000000000000000000000000000"}
				recipientDid={"did:pkh:eip155:1:0xRecipient0000000000000000000000000000000000"}
				onSubmit={vi.fn()}
			/>
		)

		fireEvent.click(screen.getByRole('button', { name: /copy wallet/i }))
		expect(navigator.clipboard.writeText).toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: /copy amount/i }))
		expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2)

		vi.runAllTimers()
	})
})
