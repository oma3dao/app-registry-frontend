import { describe, it, expect } from 'vitest'

// Import from domain re-exports
import * as Domain from '@/schema/domain'
import * as UI from '@/schema/ui'

describe('schema/domain re-exports', () => {
  it('exposes core schemas and helpers from data-model', () => {
    // Zod schemas should exist
    expect(typeof Domain.OnChainApp).toBe('object')
    expect(typeof Domain.OffChainMetadata).toBe('object')
    expect(typeof Domain.DomainForm).toBe('object')

    // Functions/constants should be present
    expect(Domain.toDomain).toBeDefined()
    expect(Domain.fromDomain).toBeDefined()
    expect(Domain.FIELDS).toBeDefined()
    expect(Domain.getField).toBeDefined()
    expect(Domain.getOnChainFields).toBeDefined()
    expect(Domain.getOffChainFields).toBeDefined()
  })
})

describe('schema/ui re-exports', () => {
  it('exposes UIState, FormState and defaults', () => {
    expect(UI.UIState).toBeDefined()
    expect(UI.FormState).toBeDefined()
    expect(UI.defaultUIState).toBeDefined()
  })
})
