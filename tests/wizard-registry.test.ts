import { describe, it, expect, vi } from 'vitest'
import { ALL_STEPS, REGISTRY_META, Step1_Verification, Step3_Common, Step4_HumanMedia, Step5_HumanDistribution, Step7_ApiOnly } from '@/lib/wizard/registry'

const mkFlags = (over?: Partial<{ human: boolean; api: boolean; smartContract: boolean }>) => ({ human: false, api: false, smartContract: false, ...(over || {}) })

describe('wizard/registry', () => {
	it('exports ordered ALL_STEPS and registry metadata', () => {
		expect(Array.isArray(ALL_STEPS)).toBe(true)
		expect(ALL_STEPS.map(s => s.id)).toEqual([
			'verification',
			'onchain',
			'common',
			'human-media',
			'human-distribution',
			'endpoint-config',
			'review',
		])
		expect(REGISTRY_META.version).toBeGreaterThanOrEqual(1)
		expect(() => new Date(REGISTRY_META.lastModified).toISOString()).not.toThrow()
	})

	it('invokes registry validator when NODE_ENV=development', async () => {
		const originalEnv = process.env.NODE_ENV
		const { Module } = await import('module')
		const originalModuleRequire = Module.prototype.require
		vi.resetModules()
		process.env.NODE_ENV = 'development'

		const assertValidRegistry = vi.fn()
		Module.prototype.require = function (path: string) {
			if (path.endsWith('wizard/linter') || path === './linter') {
				return { assertValidRegistry }
			}
			return originalModuleRequire.call(this, path)
		}

		const registryModule = await import('@/lib/wizard/registry')

		expect(assertValidRegistry).toHaveBeenCalledWith(
			registryModule.ALL_STEPS,
			registryModule.REGISTRY_META,
		)

		process.env.NODE_ENV = originalEnv
		Module.prototype.require = originalModuleRequire
		vi.resetModules()
	})

	it('appliesTo rules behave for human-specific and api/contract steps', () => {
		expect(Step4_HumanMedia.appliesTo?.(mkFlags({ human: true }))).toBe(true)
		expect(Step4_HumanMedia.appliesTo?.(mkFlags({ human: false }))).toBe(false)
		expect(Step5_HumanDistribution.appliesTo?.(mkFlags({ human: true }))).toBe(true)
		expect(Step5_HumanDistribution.appliesTo?.(mkFlags({ human: false }))).toBe(false)
		expect(Step7_ApiOnly.appliesTo?.(mkFlags({ api: true }))).toBe(true)
		expect(Step7_ApiOnly.appliesTo?.(mkFlags({ smartContract: true }))).toBe(true)
		expect(Step7_ApiOnly.appliesTo?.(mkFlags({} as any))).toBe(false)
	})

	it('Step1_Verification schema enforces apiType when api enabled and version increment on edit', () => {
		const base = {
			did: 'did:web:example.com',
			version: '1.0.1',
			name: 'My App',
			interfaceFlags: mkFlags({ api: true }),
			ui: { isEditing: false },
		}
		// Missing apiType when api enabled -> error
		const r1 = Step1_Verification.schema.safeParse(base)
		expect(r1.success).toBe(false)
		// Provide apiType -> ok
		const r2 = Step1_Verification.schema.safeParse({ ...base, apiType: 'openapi' })
		expect(r2.success).toBe(true)
		// Editing: same or lower version rejected
		const r3 = Step1_Verification.schema.safeParse({ ...base, apiType: 'openapi', ui: { isEditing: true, currentVersion: '1.0.1' } })
		expect(r3.success).toBe(false)
		const r4 = Step1_Verification.schema.safeParse({ ...base, apiType: 'openapi', version: '1.0.0', ui: { isEditing: true, currentVersion: '1.0.1' } })
		expect(r4.success).toBe(false)
		const r5 = Step1_Verification.schema.safeParse({ ...base, apiType: 'openapi', version: '1.1.0', ui: { isEditing: true, currentVersion: '1.0.1' } })
		expect(r5.success).toBe(true)
	})

	it('Step3_Common validates required urls and accepts optional when valid', () => {
		// Provide optional values with valid urls to avoid requirement coupling
		const ok = Step3_Common.schema.safeParse({
			interfaceFlags: mkFlags({ human: false }),
			description: 'desc',
			publisher: 'pub',
			external_url: 'https://example.com',
			image: 'https://example.com/icon.png',
			summary: 'sum',
			legalUrl: '',
			supportUrl: 'https://example.com/support',
		})
		expect(ok.success).toBe(true)

		// Invalid URL when provided should error
		const bad = Step3_Common.schema.safeParse({
			interfaceFlags: mkFlags(),
			description: 'desc',
			publisher: 'pub',
			external_url: 'not-a-url',
			image: '',
		})
		expect(bad.success).toBe(false)
	})

	it('Step5_HumanDistribution requires at least one platform URL for human apps and validates urls', () => {
		const missing = Step5_HumanDistribution.schema.safeParse({ interfaceFlags: mkFlags({ human: true }), platforms: {} })
		expect(missing.success).toBe(false)

		const ok = Step5_HumanDistribution.schema.safeParse({
			interfaceFlags: mkFlags({ human: true }),
			platforms: { web: { downloadUrl: 'https://example.com/dl' } },
		})
		expect(ok.success).toBe(true)

		const badUrl = Step5_HumanDistribution.schema.safeParse({
			interfaceFlags: mkFlags({ human: true }),
			platforms: { web: { downloadUrl: 'not-a-url' } },
		})
		expect(badUrl.success).toBe(false)
	})

	// Tests URL validation error catch branches in Step3_Common (lines 205-207)
	it('Step3_Common catches URL validation errors for external_url', () => {
		const result = Step3_Common.schema.safeParse({
			interfaceFlags: mkFlags(),
			description: 'desc',
			publisher: 'pub',
			external_url: 'not-a-valid-url',
			image: 'https://example.com/icon.png',
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues.some(i => i.path.includes('external_url'))).toBe(true)
		}
	})

	it('Step3_Common catches URL validation errors for image', () => {
		const result = Step3_Common.schema.safeParse({
			interfaceFlags: mkFlags(),
			description: 'desc',
			publisher: 'pub',
			external_url: 'https://example.com',
			image: 'invalid-url-format',
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues.some(i => i.path.includes('image'))).toBe(true)
		}
	})

	it('Step3_Common catches URL validation errors for optional URLs', () => {
		const result = Step3_Common.schema.safeParse({
			interfaceFlags: mkFlags(),
			description: 'desc',
			publisher: 'pub',
			external_url: 'https://example.com',
			image: 'https://example.com/icon.png',
			legalUrl: 'not-a-url',
			supportUrl: 'also-not-a-url',
		})
		expect(result.success).toBe(false)
	})

	// Tests URL validation error catch branch in Step4_HumanMedia (line 258)
	it('Step4_HumanMedia catches URL validation errors for screenshot URLs', () => {
		const result = Step4_HumanMedia.schema.safeParse({
			interfaceFlags: mkFlags({ human: true }),
			screenshotUrls: ['https://valid.com/img.png', 'invalid-url-format', 'https://another.com/img.png'],
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues.some(i => i.path.includes('screenshotUrls'))).toBe(true)
		}
	})

	// Tests URL validation error catch branches in Step5_HumanDistribution (lines 303, 306)
	it('Step5_HumanDistribution catches URL validation errors for platform downloadUrl', () => {
		const result = Step5_HumanDistribution.schema.safeParse({
			interfaceFlags: mkFlags({ human: true }),
			platforms: { 
				web: { downloadUrl: 'invalid-url-format' },
				ios: { launchUrl: 'https://valid.com/launch' }
			},
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues.some(i => 
				i.path.includes('downloadUrl') || i.path.includes('platforms')
			)).toBe(true)
		}
	})

	it('Step5_HumanDistribution catches URL validation errors for platform launchUrl', () => {
		const result = Step5_HumanDistribution.schema.safeParse({
			interfaceFlags: mkFlags({ human: true }),
			platforms: { 
				web: { launchUrl: 'not-a-valid-url' },
				ios: { downloadUrl: 'https://valid.com/download' }
			},
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues.some(i => 
				i.path.includes('launchUrl') || i.path.includes('platforms')
			)).toBe(true)
		}
	})

	it('Step5_HumanDistribution catches URL validation errors for IWPS portal URL', () => {
		const result = Step5_HumanDistribution.schema.safeParse({
			interfaceFlags: mkFlags({ human: true }),
			iwpsPortalUrl: 'invalid-url-format',
			platforms: { web: { downloadUrl: 'https://valid.com/dl' } },
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues.some(i => i.path.includes('iwpsPortalUrl'))).toBe(true)
		}
	})

	// Tests version parsing catch block (lines 115-124)
	it('Step1_Verification handles version parsing errors gracefully', () => {
		const base = {
			did: 'did:web:example.com',
			name: 'My App',
			interfaceFlags: mkFlags(),
			ui: { isEditing: true, currentVersion: 'invalid-version' },
		}
		// When version parsing fails, just require it to be different
		const sameVersion = Step1_Verification.schema.safeParse({ ...base, version: 'invalid-version' })
		expect(sameVersion.success).toBe(false)
		
		// Different version should pass even if parsing fails
		const diffVersion = Step1_Verification.schema.safeParse({ ...base, version: '1.0.0' })
		expect(diffVersion.success).toBe(true)
	})

	// Tests major version increment (lines 103-114)
	it('Step1_Verification accepts major version increment', () => {
		const base = {
			did: 'did:web:example.com',
			name: 'My App',
			interfaceFlags: mkFlags(),
			ui: { isEditing: true, currentVersion: '1.0.0' },
		}
		const result = Step1_Verification.schema.safeParse({ ...base, version: '2.0.0' })
		expect(result.success).toBe(true)
	})

	// Tests minor version increment
	it('Step1_Verification accepts minor version increment', () => {
		const base = {
			did: 'did:web:example.com',
			name: 'My App',
			interfaceFlags: mkFlags(),
			ui: { isEditing: true, currentVersion: '1.0.0' },
		}
		const result = Step1_Verification.schema.safeParse({ ...base, version: '1.1.0' })
		expect(result.success).toBe(true)
	})

	// Tests patch version increment
	it('Step1_Verification accepts patch version increment', () => {
		const base = {
			did: 'did:web:example.com',
			name: 'My App',
			interfaceFlags: mkFlags(),
			ui: { isEditing: true, currentVersion: '1.0.0' },
		}
		const result = Step1_Verification.schema.safeParse({ ...base, version: '1.0.1' })
		expect(result.success).toBe(true)
	})

	// Tests guard function for did:web (lines 128-140)
	it('Step1_Verification guard blocks did:web without verification', () => {
		const state = {
			did: 'did:web:example.com',
			ui: { verificationStatus: undefined },
		}
		const result = Step1_Verification.guard?.(state as any)
		expect(result?.ok).toBe(false)
		expect(result?.reason).toContain('verification')
	})

	// Tests guard function for did:pkh
	it('Step1_Verification guard blocks did:pkh without verification', () => {
		const state = {
			did: 'did:pkh:eth:0x123',
			ui: { verificationStatus: undefined },
		}
		const result = Step1_Verification.guard?.(state as any)
		expect(result?.ok).toBe(false)
		expect(result?.reason).toContain('verification')
	})

	// Tests guard function allows progression when verified
	it('Step1_Verification guard allows progression when verified', () => {
		const state = {
			did: 'did:web:example.com',
			ui: { verificationStatus: 'success' },
		}
		const result = Step1_Verification.guard?.(state as any)
		expect(result?.ok).toBe(true)
	})

	// Tests guard function with empty/whitespace DID
	it('Step1_Verification guard handles empty DID', () => {
		const state = {
			did: '',
			ui: {},
		}
		const result = Step1_Verification.guard?.(state as any)
		expect(result?.ok).toBe(true) // Empty DID should pass guard (validation happens in schema)
	})

	// Tests Step3_Common schema optional URL validation branch (lines 208-210)
	it('Step3_Common validates optional URLs when provided', () => {
		const result = Step3_Common.schema.safeParse({
			interfaceFlags: mkFlags(),
			description: 'desc',
			publisher: 'pub',
			external_url: 'https://example.com',
			image: 'https://example.com/icon.png',
			legalUrl: 'https://example.com/legal',
			supportUrl: 'https://example.com/support',
		})
		expect(result.success).toBe(true)
	})

	// Tests Step3_Common schema type validation for summary (lines 220-222)
	it('Step3_Common validates summary type', () => {
		const result = Step3_Common.schema.safeParse({
			interfaceFlags: mkFlags(),
			description: 'desc',
			publisher: 'pub',
			external_url: 'https://example.com',
			image: 'https://example.com/icon.png',
			summary: 123, // Invalid: should be string
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues.some(i => i.path.includes('summary'))).toBe(true)
		}
	})

	// Tests Step3_Common schema type validation for publisher (lines 223-225)
	it('Step3_Common validates publisher type', () => {
		const result = Step3_Common.schema.safeParse({
			interfaceFlags: mkFlags(),
			description: 'desc',
			publisher: 123, // Invalid: should be string
			external_url: 'https://example.com',
			image: 'https://example.com/icon.png',
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues.some(i => i.path.includes('publisher'))).toBe(true)
		}
	})

	// Tests Step3_Common optional URL validation branch (lines 208-210)
	it('Step3_Common validates optional URLs when provided as non-empty strings', () => {
		const result = Step3_Common.schema.safeParse({
			interfaceFlags: mkFlags(),
			description: 'desc',
			publisher: 'pub',
			external_url: 'https://example.com',
			image: 'https://example.com/icon.png',
			legalUrl: 'https://example.com/legal', // Optional but provided
			supportUrl: 'https://example.com/support', // Optional but provided
		})
		expect(result.success).toBe(true)
	})

	// Tests Step4_HumanMedia screenshot requirement when mustScreens is true (lines 251-252)
	it('Step4_HumanMedia requires at least one screenshot when mustScreens is true', () => {
		// This test covers the conditional check on lines 251-252
		// When isFieldRequired returns true for screenshotUrls, it should require at least one
		const result = Step4_HumanMedia.schema.safeParse({
			interfaceFlags: mkFlags({ human: true }),
			screenshotUrls: [], // Empty array when required
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues.some(i => 
				i.path.includes('screenshotUrls') && 
				i.message?.includes('At least one screenshot')
			)).toBe(true)
		}
	})

	// Tests Step4_HumanMedia handles non-string values in screenshotUrls array
	it('Step4_HumanMedia filters out non-string values from screenshotUrls', () => {
		const result = Step4_HumanMedia.schema.safeParse({
			interfaceFlags: mkFlags({ human: true }),
			screenshotUrls: ['https://valid.com/img.png', null, '', undefined, 'https://another.com/img.png'],
		})
		// Should pass validation (filters out non-strings and empty strings)
		expect(result.success).toBe(true)
	})

	// Tests Step4_HumanMedia URL validation in loop (lines 255-259)
	it('Step4_HumanMedia validates each screenshot URL in the array', () => {
		const result = Step4_HumanMedia.schema.safeParse({
			interfaceFlags: mkFlags({ human: true }),
			screenshotUrls: ['https://valid.com/img.png', 'invalid-url', 'https://another.com/img.png'],
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues.some(i => 
				i.path.includes('screenshotUrls') && 
				Array.isArray(i.path) && 
				i.path[1] === 1 // Second item (index 1) should have error
			)).toBe(true)
		}
	})
})
