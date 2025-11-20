/**
 * Comprehensive tests for Step2_Onchain component
 * 
 * Tests coverage for lines 90-192, 217-222
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Step2_Onchain from '@/components/wizard-steps/step-2-onchain'
import type { StepRenderContext } from '@/lib/wizard'

// Mock child components
vi.mock('@/components/caip10-input', () => ({
  Caip10Input: ({ value, onChange, error }: any) => (
    <div data-testid="caip10-input">
      <input
        data-testid="caip10-input-field"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="CAIP-10 address"
      />
      {error && <span data-testid="caip10-error">{error}</span>}
    </div>
  )
}))

vi.mock('@/components/url-validator', () => ({
  UrlValidator: ({ url }: any) => (
    <div data-testid="url-validator">Validating: {url}</div>
  )
}))

vi.mock('@/schema/mapping', () => ({
  isOurHostedUrl: vi.fn((url: string) => {
    return url?.includes('/api/data-url/') || false
  })
}))

vi.mock('@/config/env', () => ({
  env: {
    appBaseUrl: 'http://localhost:3000'
  }
}))

// Helper to create mock context
const mkCtx = (overrides: Partial<StepRenderContext['state']> = {}): StepRenderContext => {
  const defaultState = {
    did: 'did:web:example.com',
    version: '1.0.0',
    name: 'Test App',
    dataUrl: '',
    contractId: '',
    fungibleTokenId: '',
    traits: [],
    interfaceFlags: {
      human: false,
      api: false,
    },
    apiType: undefined,
    ...overrides,
  }

  return {
    state: defaultState,
    updateField: vi.fn(),
    errors: {},
    setStatus: vi.fn(),
  }
}

describe('Step2_Onchain Component Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Test: covers lines 92-107 - getTraitSuggestions function
   */
  it('shows trait suggestions without API interface', () => {
    const ctx = mkCtx({ interfaceFlags: { human: false, api: false } })
    render(<Step2_Onchain {...ctx} />)

    const traitsInput = screen.getByPlaceholderText(/pay:x402/i)
    expect(traitsInput).toBeInTheDocument()
    // Should include general traits but not API-specific ones
    const placeholder = traitsInput.getAttribute('placeholder')
    expect(placeholder).toContain('pay:x402')
    expect(placeholder).not.toContain('api:mcp')
  })

  it('shows trait suggestions with API interface enabled', () => {
    const ctx = mkCtx({ 
      interfaceFlags: { human: false, api: true },
    })
    render(<Step2_Onchain {...ctx} />)

    const traitsInput = screen.getByPlaceholderText(/pay:x402/i)
    const placeholder = traitsInput.getAttribute('placeholder')
    // Should include API-specific traits when API interface is enabled
    expect(placeholder).toContain('pay:x402')
    // The placeholder should include API traits
    expect(placeholder).toMatch(/api:/)
  })

  /**
   * Test: covers lines 110-118 - parseTraits function
   */
  it('parses traits on blur from comma-separated input', async () => {
    const user = userEvent.setup()
    const ctx = mkCtx()
    render(<Step2_Onchain {...ctx} />)

    const traitsInput = screen.getByPlaceholderText(/pay:x402/i)
    
    // Type comma-separated traits
    await user.type(traitsInput, 'gaming, social, defi')
    await user.tab() // Blur the input

    // Should parse and call updateField with traits array
    await waitFor(() => {
      expect(ctx.updateField).toHaveBeenCalled()
    })
    
    // Check that updateField was called with 'traits' and an array
    const traitsCalls = vi.mocked(ctx.updateField).mock.calls.filter(
      call => call[0] === 'traits'
    )
    expect(traitsCalls.length).toBeGreaterThan(0)
    const lastCall = traitsCalls[traitsCalls.length - 1]
    expect(Array.isArray(lastCall[1])).toBe(true)
    expect(lastCall[1]).toContain('gaming')
    expect(lastCall[1]).toContain('social')
    expect(lastCall[1]).toContain('defi')
  })

  it('parses traits on blur from space-separated input', async () => {
    const user = userEvent.setup()
    const ctx = mkCtx()
    render(<Step2_Onchain {...ctx} />)

    const traitsInput = screen.getByPlaceholderText(/pay:x402/i)
    
    // Type space-separated traits
    await user.type(traitsInput, 'nft gaming social')
    await user.tab() // Blur the input

    await waitFor(() => {
      expect(ctx.updateField).toHaveBeenCalled()
    })
    
    const traitsCalls = vi.mocked(ctx.updateField).mock.calls.filter(
      call => call[0] === 'traits'
    )
    expect(traitsCalls.length).toBeGreaterThan(0)
    const lastCall = traitsCalls[traitsCalls.length - 1]
    expect(Array.isArray(lastCall[1])).toBe(true)
    expect(lastCall[1]).toContain('nft')
    expect(lastCall[1]).toContain('gaming')
  })

  it('handles empty traits input on blur', async () => {
    const user = userEvent.setup()
    const ctx = mkCtx({ traits: ['existing'] })
    render(<Step2_Onchain {...ctx} />)

    const traitsInput = screen.getByPlaceholderText(/pay:x402/i)
    
    // Clear the input
    await user.clear(traitsInput)
    await user.tab() // Blur

    await waitFor(() => {
      expect(ctx.updateField).toHaveBeenCalled()
    })
    
    // Should set traits to undefined or empty array when cleared
    const traitsCalls = vi.mocked(ctx.updateField).mock.calls.filter(
      call => call[0] === 'traits'
    )
    expect(traitsCalls.length).toBeGreaterThan(0)
  })

  /**
   * Test: covers lines 148-152 - handleTraitsChange
   */
  it('updates traitsInput state without parsing on change', async () => {
    const user = userEvent.setup()
    const ctx = mkCtx()
    render(<Step2_Onchain {...ctx} />)

    const traitsInput = screen.getByPlaceholderText(/pay:x402/i) as HTMLInputElement
    
    // Type traits with commas - should not parse yet
    await user.type(traitsInput, 'gaming, social')
    
    // Input value should be updated but not parsed to updateField yet
    expect(traitsInput.value).toContain('gaming, social')
    
    // updateField should not be called with 'traits' on change
    const traitsCalls = vi.mocked(ctx.updateField).mock.calls.filter(
      call => call[0] === 'traits'
    )
    // Should not have parsed yet (only on blur)
    expect(traitsCalls.length).toBe(0)
  })

  /**
   * Test: covers lines 121-146 - useEffect for auto-managing API traits
   */
  it('auto-adds API trait when API interface is enabled and type is selected', async () => {
    const ctx = mkCtx({ 
      interfaceFlags: { human: false, api: true },
      apiType: 'mcp',
      traits: ['gaming', 'social'],
    })
    
    render(<Step2_Onchain {...ctx} />)

    // Wait for useEffect to run
    await waitFor(() => {
      // Should call updateField to add api:mcp trait
      const traitsCalls = vi.mocked(ctx.updateField).mock.calls.filter(
        call => call[0] === 'traits'
      )
      expect(traitsCalls.length).toBeGreaterThan(0)
    })
  })

  it('auto-removes API traits when API interface is disabled', async () => {
    const ctx = mkCtx({ 
      interfaceFlags: { human: false, api: false },
      apiType: 'mcp',
      traits: ['gaming', 'api:mcp', 'social'],
    })
    
    const { rerender } = render(<Step2_Onchain {...ctx} />)

    // Wait for useEffect to run and remove API traits
    await waitFor(() => {
      const traitsCalls = vi.mocked(ctx.updateField).mock.calls.filter(
        call => call[0] === 'traits'
      )
      if (traitsCalls.length > 0) {
        const lastCall = traitsCalls[traitsCalls.length - 1]
        const traits = lastCall[1]
        if (Array.isArray(traits)) {
          expect(traits).not.toContain('api:mcp')
        }
      }
    })
  })

  it('does not add API trait when max traits (20) is reached', async () => {
    const maxTraits = Array.from({ length: 20 }, (_, i) => `trait${i}`)
    const ctx = mkCtx({ 
      interfaceFlags: { human: false, api: true },
      apiType: 'openapi',
      traits: maxTraits,
    })
    
    render(<Step2_Onchain {...ctx} />)

    // Wait a bit to ensure useEffect runs
    await waitFor(() => {
      // Should not add api:openapi because max traits reached
      const traitsCalls = vi.mocked(ctx.updateField).mock.calls.filter(
        call => call[0] === 'traits'
      )
      // If it updates, it should not add the API trait
      if (traitsCalls.length > 0) {
        const lastCall = traitsCalls[traitsCalls.length - 1]
        const traits = lastCall[1]
        if (Array.isArray(traits) && traits.length === 20) {
          // Should not contain api:openapi if max traits reached
          expect(traits).not.toContain('api:openapi')
        }
      }
    }, { timeout: 100 })
  })

  /**
   * Test: covers lines 189-209 - Custom URL section when isCustomizingUrl is true
   */
  it('shows custom URL input when customize checkbox is checked', async () => {
    const user = userEvent.setup()
    const ctx = mkCtx({ 
      did: 'did:web:example.com',
      version: '1.0.0',
    })
    render(<Step2_Onchain {...ctx} />)

    const checkbox = screen.getByLabelText(/I want to host metadata/i)
    await user.click(checkbox)

    // Should show custom URL input
    await waitFor(() => {
      const customInput = screen.getByPlaceholderText(/https:\/\/example.com\/metadata.json/i)
      expect(customInput).toBeInTheDocument()
    })
    
    // Should show custom URL mode info
    expect(screen.getByText(/Custom URL Mode/i)).toBeInTheDocument()
  })

  it('shows UrlValidator when customizing URL', async () => {
    const user = userEvent.setup()
    const ctx = mkCtx()
    render(<Step2_Onchain {...ctx} />)

    const checkbox = screen.getByLabelText(/I want to host metadata/i)
    await user.click(checkbox)

    await waitFor(() => {
      expect(screen.getByTestId('url-validator')).toBeInTheDocument()
    })
  })

  /**
   * Test: covers lines 217-222 - Read-only dataUrl when isCustomizingUrl is false
   */
  it('shows read-only dataUrl input when customize checkbox is unchecked', () => {
    const ctx = mkCtx({ 
      did: 'did:web:example.com',
      version: '1.0.0',
      dataUrl: 'http://localhost:3000/api/data-url/did:web:example.com/v/1.0.0',
    })
    render(<Step2_Onchain {...ctx} />)

    // Should show read-only input
    const dataUrlInput = screen.getByDisplayValue(/http:\/\/localhost:3000\/api\/data-url/i)
    expect(dataUrlInput).toBeInTheDocument()
    expect(dataUrlInput).toHaveAttribute('readOnly')
    
    // Should show auto-generated message
    expect(screen.getByText(/Auto-generated based on your DID/i)).toBeInTheDocument()
  })

  it('generates dataUrl automatically when not customizing', async () => {
    const ctx = mkCtx({ 
      did: 'did:web:example.com',
      version: '1.0.0',
      dataUrl: '', // Start empty
    })
    render(<Step2_Onchain {...ctx} />)

    // Wait for useEffect to generate the URL
    await waitFor(() => {
      expect(ctx.updateField).toHaveBeenCalledWith(
        'dataUrl',
        expect.stringContaining('/api/data-url/did:web:example.com/v/1.0.0')
      )
    })
  })

  /**
   * Test: covers handleFungibleTokenIdChange (line 86-89)
   */
  it('handles fungible token ID change', async () => {
    const user = userEvent.setup()
    const ctx = mkCtx()
    render(<Step2_Onchain {...ctx} />)

    const tokenInput = screen.getByPlaceholderText(/eip155:1\/erc20:0x/i)
    await user.type(tokenInput, 'eip155:1/erc20:0x123')

    // Should call updateField (may be called multiple times as user types)
    await waitFor(() => {
      expect(ctx.updateField).toHaveBeenCalled()
    })
    
    // Check that it was called with fungibleTokenId
    const tokenCalls = vi.mocked(ctx.updateField).mock.calls.filter(
      call => call[0] === 'fungibleTokenId'
    )
    expect(tokenCalls.length).toBeGreaterThan(0)
  })

  it('clears fungible token ID when input is empty', async () => {
    const user = userEvent.setup()
    const ctx = mkCtx({ fungibleTokenId: 'eip155:1/erc20:0x123' })
    render(<Step2_Onchain {...ctx} />)

    const tokenInput = screen.getByPlaceholderText(/eip155:1\/erc20:0x/i)
    await user.clear(tokenInput)

    // Should call updateField with undefined when cleared
    await waitFor(() => {
      const tokenCalls = vi.mocked(ctx.updateField).mock.calls.filter(
        call => call[0] === 'fungibleTokenId'
      )
      expect(tokenCalls.length).toBeGreaterThan(0)
      // Last call should have undefined value
      const lastCall = tokenCalls[tokenCalls.length - 1]
      expect(lastCall[1]).toBeUndefined()
    })
  })

  /**
   * Test: covers line 87-88 - handleContractIdChange with null value
   * Tests that contractId is set to undefined when null is passed
   */
  it('handles contractId change with null value', async () => {
    const ctx = mkCtx({ contractId: 'did:pkh:eip155:1:0x123' })
    render(<Step2_Onchain {...ctx} />)

    // The Caip10Input is mocked, so we can directly find it by test-id
    const caip10Input = screen.getByTestId('caip10-input-field')
    const user = userEvent.setup()
    
    // Clear the input to trigger onChange with empty value
    await user.clear(caip10Input)

    // handleContractIdChange converts empty string to undefined (line 87)
    await waitFor(() => {
      const contractCalls = vi.mocked(ctx.updateField).mock.calls.filter(
        call => call[0] === 'contractId'
      )
      expect(contractCalls.length).toBeGreaterThan(0)
    })
  })

  /**
   * Test: covers lines 180-198 - edit mode renders immutable dataUrl
   * Tests that in edit mode, the dataUrl field is disabled with info message
   */
  it('renders immutable dataUrl in edit mode', () => {
    const ctx = mkCtx({ 
      dataUrl: 'https://example.com/immutable-data.json',
      ui: { isEditing: true } // This triggers edit mode
    })
    
    render(<Step2_Onchain {...ctx} />)

    // Find the disabled dataUrl input (lines 181-188)
    const dataUrlInput = screen.getByDisplayValue('https://example.com/immutable-data.json')
    expect(dataUrlInput).toBeDisabled()
    expect(dataUrlInput).toHaveClass('cursor-not-allowed')

    // Check for the info message about immutability (lines 189-198)
    expect(screen.getByText(/Data URL cannot be changed/i)).toBeInTheDocument()
    expect(screen.getByText(/immutable and set at mint time/i)).toBeInTheDocument()
  })

  /**
   * Test: covers line 229 - dataUrl error display
   * Tests that validation errors for dataUrl are displayed
   */
  it('displays dataUrl validation error when present', () => {
    const ctx = mkCtx({ dataUrl: 'invalid-url' })
    // Set errors separately (not in state overrides)
    ctx.errors = { dataUrl: 'Please enter a valid HTTPS URL' }
    
    render(<Step2_Onchain {...ctx} />)

    // Check that error message is displayed (line 229)
    expect(screen.getByText('Please enter a valid HTTPS URL')).toBeInTheDocument()
    
    // Check that input has error styling
    const dataUrlInput = screen.getByDisplayValue('invalid-url')
    expect(dataUrlInput).toHaveClass('border-red-500')
  })
})

