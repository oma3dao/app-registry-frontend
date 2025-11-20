import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NFTMintModal from '@/components/nft-mint-modal'

vi.mock('@/lib/wizard', () => ({
	ALL_STEPS: [{ id: 'verification', title: 'Verification', description: 'desc', render: ({ state, updateField }: any) => (
		<div>
			<input name="did" aria-label="did" value={state.did || ''} onChange={e => updateField('did', e.target.value)} />
			<input name="version" aria-label="version" value={state.version || ''} onChange={e => updateField('version', e.target.value)} />
		</div>
	)}],
	visibleSteps: (_steps: any, _flags: any) => [{ id: 'verification', title: 'Verification', description: 'desc', render: ({ state, updateField }: any) => (
		<div>
			<input name="did" aria-label="did" value={state.did || ''} onChange={e => updateField('did', e.target.value)} />
			<input name="version" aria-label="version" value={state.version || ''} onChange={e => updateField('version', e.target.value)} />
		</div>
	)}],
	validateStep: () => ({ ok: true }),
	canEnterStep: async () => ({ ok: true }),
	useStepStatusStore: () => ({ statuses: {}, setStatus: vi.fn(), reset: vi.fn() }),
}))

describe('NFTMintModal submit error banner', () => {
	it('shows error banner when onSubmit throws', async () => {
		const onSubmit = vi.fn().mockRejectedValue(new Error('submit failed'))
		render(<NFTMintModal isOpen onClose={() => {}} onSubmit={onSubmit} initialData={{ did: 'did:web:x', version: '1.0.0' }} />)
		fireEvent.click(screen.getByRole('button', { name: /submit/i }))
		expect(await screen.findByText(/submit failed/i)).toBeInTheDocument()
	})
})
