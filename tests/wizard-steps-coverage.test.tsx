import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Step1_Verification from '@/components/wizard-steps/step-1-verification'
import Step3_Common from '@/components/wizard-steps/step-3-common'
import Step5_HumanDistribution from '@/components/wizard-steps/step-5-human-distribution'
import Step6_Review from '@/components/wizard-steps/step-6-review'

vi.mock('thirdweb/react', () => ({ useActiveAccount: () => undefined }))
vi.mock('@/config/env', () => ({ env: { chainId: 31337 } }))

const mkCtx = (over: any = {}) => ({ state: { interfaceFlags: { human: false, api: false, smartContract: false }, ui: {}, ...over }, updateField: vi.fn(), errors: {} })

describe('Wizard Steps coverage', () => {
	it('Step1_Verification renders key fields and DID type trigger', () => {
		const ctx = mkCtx({ name: '', version: '', did: '' })
		render(<Step1_Verification {...ctx as any} />)
		expect(screen.getByLabelText(/App Name/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/Version/i)).toBeInTheDocument()
		// DID type trigger present
		expect(screen.getByLabelText(/DID Type/i)).toBeInTheDocument()
	})

	it('Step3_Common renders inputs and propagates updates', () => {
		const ctx = mkCtx({ description: '', external_url: '', image: '' })
		render(<Step3_Common {...ctx as any} />)
		fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'desc' } })
		fireEvent.change(screen.getByLabelText(/Marketing URL/i), { target: { value: 'https://x.test' } })
		fireEvent.change(screen.getByLabelText(/Icon URL/i), { target: { value: 'https://i.test/icon.png' } })
		expect(ctx.updateField).toHaveBeenCalled()
	})

	it('Step5_HumanDistribution shows platforms grid and artifact section after download URL', () => {
		const ctx = mkCtx({ platforms: { web: { downloadUrl: 'https://example.com' } }, artifacts: {} })
		render(<Step5_HumanDistribution {...ctx as any} />)
		expect(screen.getByText(/Platforms \(at least one URL required\)/i)).toBeInTheDocument()
		expect(screen.getByText(/Binary Verification \(Optional\)/i)).toBeInTheDocument()
	})

	it('Step6_Review renders computed sections and JSON preview', () => {
		const ctx = mkCtx({ name: 'App', version: '1.0.0', description: 'd', image: 'https://img', external_url: 'https://x' })
		render(<Step6_Review {...ctx as any} />)
		expect(screen.getByText(/Identifiers/i)).toBeInTheDocument()
		expect(screen.getByText(/Data Hash Algorithm/i)).toBeInTheDocument()
		expect(screen.getByText(/Off‑chain JSON/i)).toBeInTheDocument()
	})
})
