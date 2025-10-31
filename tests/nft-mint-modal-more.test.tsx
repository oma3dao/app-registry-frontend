import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NFTMintModal from '@/components/nft-mint-modal'

// Minimal wizard mocks to enforce a required field and simple rendering
vi.mock('@/lib/wizard', () => ({
	ALL_STEPS: [{ id: 'verification', title: 'Verification', description: 'desc', render: ({ state, updateField }: any) => (
		<div>
			<label htmlFor="did">DID</label>
			<input id="did" name="did" aria-label="did" value={state.did || ''} onChange={e => updateField('did', e.target.value)} />
		</div>
	)}],
	visibleSteps: (steps: any) => steps,
	validateStep: (_step: any, state: any) => (state.did ? { ok: true, issues: [] } : { ok: false, issues: [{ path: ['did'], message: 'DID is required' }] }),
	canEnterStep: async () => ({ ok: true }),
	useStepStatusStore: () => ({ statuses: {}, setStatus: vi.fn(), reset: vi.fn() }),
}))

describe('NFTMintModal more coverage', () => {
	beforeEach(() => {
		HTMLElement.prototype.scrollTo = vi.fn()
	})
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('calls onClose when Cancel is clicked', () => {
		const onClose = vi.fn()
		render(<NFTMintModal isOpen onClose={onClose} onSubmit={vi.fn()} />)
		fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
		expect(onClose).toHaveBeenCalled()
	})

	it('shows correct title for create vs edit modes', () => {
		render(<NFTMintModal isOpen onClose={() => {}} onSubmit={() => {}} />)
		expect(screen.getByText(/register new app/i)).toBeInTheDocument()

		render(
			<NFTMintModal
				isOpen
				onClose={() => {}}
				onSubmit={() => {}}
				initialData={{ did: 'did:web:x', version: '1.0.0' }}
			/>,
		)
		expect(screen.getByText(/edit app registration/i)).toBeInTheDocument()
	})

	it('focuses first invalid field and scrolls to top on validation error', async () => {
		render(<NFTMintModal isOpen onClose={() => {}} onSubmit={() => {}} />)
		// Did is empty initially; click Submit (single step) to trigger validation
		fireEvent.click(screen.getByRole('button', { name: /submit/i }))
		// Focus moved to DID input
		await waitFor(() => expect(screen.getByLabelText('did')).toHaveFocus())
		// ScrollTo called on content container
		expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled()
	})
})
