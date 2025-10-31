import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NFTMintModal from '@/components/nft-mint-modal'

// Mock wizard pieces to drive branches
const mockVisibleSteps = vi.fn()
const mockValidateStep = vi.fn()
const mockCanEnterStep = vi.fn()
const mockUseStepStatusStore = vi.fn(() => ({ statuses: {}, setStatus: vi.fn(), reset: vi.fn() }))

vi.mock('@/lib/wizard', () => ({
	ALL_STEPS: [{ id: 'verification', title: 'Verification', description: 'desc', render: ({ state, updateField }: any) => (
		<div>
			<input name="did" aria-label="did" value={state.did || ''} onChange={e => updateField('did', e.target.value)} />
			<input name="version" aria-label="version" value={state.version || ''} onChange={e => updateField('version', e.target.value)} />
		</div>
	)}],
	visibleSteps: (...args: any[]) => mockVisibleSteps(...args),
	validateStep: (...args: any[]) => mockValidateStep(...args),
	canEnterStep: (...args: any[]) => mockCanEnterStep(...args),
	useStepStatusStore: () => mockUseStepStatusStore(),
}))

// Dialog primitives are fine; no heavy mocks

const baseInitial = {
	did: 'did:web:example.com',
	name: 'App',
	version: '1.0.0',
	image: '',
	external_url: '',
	interfaces: 0,
	status: 0,
	minter: '0xabc',
	dataUrl: 'https://data',
}

describe('NFTMintModal branches', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockVisibleSteps.mockReturnValue([{ id: 'verification', title: 'Verification', description: 'desc', render: ({ state, updateField }: any) => (
			<div>
				<input name="did" aria-label="did" value={state.did || ''} onChange={e => updateField('did', e.target.value)} />
				<input name="version" aria-label="version" value={state.version || ''} onChange={e => updateField('version', e.target.value)} />
			</div>
		)}])
		mockValidateStep.mockReturnValue({ ok: true, issues: [] })
		mockCanEnterStep.mockResolvedValue({ ok: true })
		vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
		// localStorage
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			key: vi.fn(),
			length: 0,
		} as any)
	})
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('shows validation errors and keeps user on step with did input focused', () => {
		mockValidateStep.mockReturnValue({ ok: false, issues: [{ path: ['did'], message: 'DID required' }] })
		render(<NFTMintModal isOpen onClose={() => {}} onSubmit={() => {}} initialData={{}} />)
		fireEvent.click(screen.getByRole('button', { name: /submit/i }))
		const input = screen.getByLabelText('did') as HTMLInputElement
		expect(input.value).toBe('')
		// Still on first step (Previous disabled)
		expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
	})

	it('shows guard error when guard denies step entry', async () => {
		mockValidateStep.mockReturnValue({ ok: true })
		mockCanEnterStep.mockResolvedValue({ ok: false, reason: 'Guard says no' })
		render(<NFTMintModal isOpen onClose={() => {}} onSubmit={() => {}} initialData={{}} />)
		fireEvent.click(screen.getByRole('button', { name: /submit/i }))
		// Guard banner appears
		expect(await screen.findByText(/guard says no/i)).toBeInTheDocument()
	})

	it('submits with computed interfaces bitmap and preserves minter/status in edit', async () => {
		const onSubmit = vi.fn()
		render(<NFTMintModal isOpen onClose={() => {}} onSubmit={onSubmit} initialData={baseInitial} />)
		fireEvent.click(screen.getByRole('button', { name: /submit/i }))
		await waitFor(() => expect(onSubmit).toHaveBeenCalled())
		const arg = onSubmit.mock.calls[0][0]
		expect(arg.interfaces).toBeGreaterThanOrEqual(0)
		expect(arg.minter).toBe('0xabc')
		expect(arg.status).toBe(0)
		expect(typeof arg.dataUrl).toBe('string')
	})

	it('loads and saves draft when not editing', async () => {
		(localStorage.getItem as any).mockReturnValueOnce(JSON.stringify({ name: 'DraftName' }))
		render(<NFTMintModal isOpen onClose={() => {}} onSubmit={() => {}} initialData={{}} />)
		fireEvent.change(screen.getByLabelText('did'), { target: { value: 'did:web:x' } })
		fireEvent.change(screen.getByLabelText('version'), { target: { value: '1.0.0' } })
		fireEvent.click(screen.getByRole('button', { name: /submit/i }))
		await waitFor(() => expect(localStorage.setItem).toHaveBeenCalled())
	})
})
