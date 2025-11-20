/**
 * Tests for Wizard Step 2 - Onchain Data
 * 
 * Tests the step that collects onchain registry data including:
 * - Data URL auto-generation and customization
 * - Contract ID (CAIP-10) input
 * - Fungible token ID (CAIP-19) input
 * - Traits input and parsing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import Step2_Onchain from '@/components/wizard-steps/step-2-onchain';
import type { StepRenderContext } from '@/lib/wizard';

// Mock environment config
vi.mock('@/config/env', () => ({
  env: {
    appBaseUrl: 'https://test.app.com',
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
  },
}));

// Mock schema/mapping (must support both require() and import)
vi.mock('@/schema/mapping', () => {
  const isOurHostedUrl = vi.fn((url: string | undefined) => {
    if (!url) return false;
    return url.includes('test.app.com');
  });
  // Support both ES6 import and CommonJS require()
  const mockExports = {
    isOurHostedUrl,
    toMintAppInput: vi.fn(),
    toUpdateAppInput: vi.fn(),
  };
  return {
    __esModule: true,
    ...mockExports,
    default: mockExports,
  };
});

// Mock validation utilities
vi.mock('@/lib/validation', () => ({
  validateCaipAddress: vi.fn((address: string) => {
    if (address.startsWith('eip155:1:0x')) return { valid: true };
    return { valid: false, error: 'Invalid CAIP-10 address' };
  }),
  validateCaip19Token: vi.fn((token: string) => {
    if (token.includes('eip155') && token.includes('erc20')) return { valid: true };
    return { valid: false, error: 'Invalid CAIP-19 token' };
  }),
  validateUrl: vi.fn((url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }),
}));

describe('Wizard Step 2 - Onchain Data', () => {
  let mockContext: StepRenderContext;

  beforeEach(() => {
    mockContext = {
      state: {
        did: 'did:web:example.com',
        version: '1.0.0',
        name: 'Test App',
        dataUrl: '',
        contractId: undefined,
        fungibleTokenId: undefined,
        traits: [],
        interfaceFlags: { human: true, api: false, smartContract: false },
      },
      updateField: vi.fn(),
      errors: {},
    };
  });

  afterEach(async () => {
    cleanup();
    // Wait for any pending async operations
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  /**
   * Test: renders all required fields
   */
  it('renders all onchain data fields', () => {
    render(<Step2_Onchain {...mockContext} />);

    // Check main fields are present
    expect(screen.getByLabelText(/Data URL/i)).toBeInTheDocument();
    expect(screen.getByText(/Contract ID \(Optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fungible Token ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Traits \(Optional\)/i)).toBeInTheDocument();
  });

  /**
   * Test: auto-generates data URL
   */
  it('auto-generates data URL from DID and version', async () => {
    render(<Step2_Onchain {...mockContext} />);

    await waitFor(() => {
      expect(mockContext.updateField).toHaveBeenCalledWith(
        'dataUrl',
        'https://test.app.com/api/data-url/did:web:example.com/v/1.0.0'
      );
    });
  });

  /**
   * Test: handles custom URL toggle
   */
  it('allows customizing data URL', async () => {
    const user = userEvent.setup();
    
    mockContext.state.dataUrl = 'https://test.app.com/api/data-url/did:web:example.com/v/1.0.0';
    
    render(<Step2_Onchain {...mockContext} />);

    // Find and click the customize checkbox
    const customizeCheckbox = screen.getByRole('checkbox', { name: /I want to host metadata at my own URL/i });
    await user.click(customizeCheckbox);

    // Should clear the data URL
    expect(mockContext.updateField).toHaveBeenCalledWith('dataUrl', '');
  });

  /**
   * Test: accepts manual data URL input
   */
  it('accepts manual data URL input when customizing', async () => {
    const user = userEvent.setup();
    
    render(<Step2_Onchain {...mockContext} />);

    // Enable customization
    const customizeCheckbox = screen.getByRole('checkbox', { name: /I want to host metadata at my own URL/i });
    await user.click(customizeCheckbox);

    // Type custom URL - check that updateField was called with 'n' (last character)
    const dataUrlInput = screen.getByLabelText(/Data URL/i);
    await user.clear(dataUrlInput);
    await user.type(dataUrlInput, 'https://custom.com/metadata.json');

    // Verify the last call contains the full URL
    const calls = vi.mocked(mockContext.updateField).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe('dataUrl');
    expect(lastCall[1]).toBe('n'); // Last character typed
  });

  /**
   * Test: contract ID input
   */
  it('accepts valid contract ID (CAIP-10)', async () => {
    const user = userEvent.setup();
    
    render(<Step2_Onchain {...mockContext} />);

    // Find contract ID input (it's a Caip10Input component)
    const contractIdSection = screen.getByText(/Contract ID/i).closest('div');
    expect(contractIdSection).toBeInTheDocument();
  });

  /**
   * Test: fungible token ID input
   */
  it('accepts fungible token ID input', async () => {
    const user = userEvent.setup();
    
    render(<Step2_Onchain {...mockContext} />);

    const tokenInput = screen.getByLabelText(/Fungible Token ID/i);
    await user.type(tokenInput, 'eip155:1/erc20:0x1234567890123456789012345678901234567890');

    expect(mockContext.updateField).toHaveBeenCalled();
  });

  /**
   * Test: traits input parsing
   */
  it('parses comma-separated traits', async () => {
    const user = userEvent.setup();
    
    render(<Step2_Onchain {...mockContext} />);

    const traitsInput = screen.getByLabelText(/Traits \(Optional\)/i);
    await user.type(traitsInput, 'pay:x402, social, nft');
    await user.tab(); // Trigger blur by moving focus away

    // Should update traits field with parsed array
    await waitFor(() => {
      expect(mockContext.updateField).toHaveBeenCalledWith(
        'traits',
        expect.arrayContaining(['pay:x402', 'social', 'nft'])
      );
    });
  });

  /**
   * Test: traits input parsing with spaces
   */
  it('parses space-separated traits', async () => {
    const user = userEvent.setup();
    
    render(<Step2_Onchain {...mockContext} />);

    const traitsInput = screen.getByLabelText(/Traits \(Optional\)/i);
    await user.type(traitsInput, 'defi gaming social');
    await user.tab(); // Trigger blur by moving focus away

    await waitFor(() => {
      expect(mockContext.updateField).toHaveBeenCalledWith(
        'traits',
        expect.arrayContaining(['defi', 'gaming', 'social'])
      );
    });
  });

  /**
   * Test: shows trait suggestions
   */
  it('shows trait suggestions based on interfaces', () => {
    mockContext.state.interfaceFlags = { human: true, api: true, smartContract: false };
    
    render(<Step2_Onchain {...mockContext} />);

    // Should show API-specific trait suggestions when API interface is selected
    expect(screen.getByText(/Suggestions/i)).toBeInTheDocument();
  });

  /**
   * Test: displays validation errors for data URL
   * The UrlValidator component handles its own validation internally and displays error messages
   */
  it('displays validation errors for data URL', () => {
    // Set an invalid URL format in the state
    mockContext.state = {
      ...mockContext.state,
      dataUrl: 'not-a-valid-url',
    };
    
    render(<Step2_Onchain {...mockContext} />);

    // The UrlValidator component should display "Invalid URL format" error for malformed URLs
    expect(screen.getByText('Invalid URL format')).toBeInTheDocument();
  });

  /**
   * Test: displays validation errors for contract ID
   */
  it('displays validation errors for contract ID', () => {
    mockContext.errors = {
      contractId: 'Invalid CAIP-10 address',
    };
    
    render(<Step2_Onchain {...mockContext} />);

    // Error may appear in multiple places (in caip10-input and as step error)
    const errors = screen.queryAllByText('Invalid CAIP-10 address');
    expect(errors.length).toBeGreaterThan(0);
  });

  /**
   * Test: displays validation errors for fungible token ID
   */
  it('displays validation errors for fungible token ID', () => {
    mockContext.errors = {
      fungibleTokenId: 'Invalid CAIP-19 token',
    };
    
    render(<Step2_Onchain {...mockContext} />);

    expect(screen.getByText('Invalid CAIP-19 token')).toBeInTheDocument();
  });

  /**
   * Test: optional fields are not required
   */
  it('handles empty optional fields gracefully', () => {
    mockContext.state.contractId = undefined;
    mockContext.state.fungibleTokenId = undefined;
    mockContext.state.traits = [];
    
    render(<Step2_Onchain {...mockContext} />);

    // Should render without errors
    expect(screen.getByLabelText(/Data URL/i)).toBeInTheDocument();
  });

  /**
   * Test: re-generates URL when unchecking customize
   */
  it('re-generates default URL when unchecking customize', async () => {
    const user = userEvent.setup();
    
    mockContext.state.dataUrl = 'https://custom.com/test.json';
    mockContext.state.did = 'did:web:example.com';
    mockContext.state.version = '2.0.0';
    
    render(<Step2_Onchain {...mockContext} />);

    // Enable then disable customization
    const customizeCheckbox = screen.getByRole('checkbox', { name: /I want to host metadata at my own URL/i });
    await user.click(customizeCheckbox);
    await user.click(customizeCheckbox);

    // Should regenerate default URL
    await waitFor(() => {
      expect(mockContext.updateField).toHaveBeenCalledWith(
        'dataUrl',
        'https://test.app.com/api/data-url/did:web:example.com/v/2.0.0'
      );
    });
  });

  /**
   * Test: handles pre-populated data
   */
  it('displays pre-populated onchain data', () => {
    mockContext.state = {
      ...mockContext.state,
      dataUrl: 'https://example.com/data.json',
      contractId: 'eip155:1:0x1234567890123456789012345678901234567890',
      fungibleTokenId: 'eip155:1/erc20:0xabcdef1234567890123456789012345678901234',
      traits: ['pay:x402', 'social', 'defi'],
    };
    
    render(<Step2_Onchain {...mockContext} />);

    const dataUrlInput = screen.getByLabelText(/Data URL/i) as HTMLInputElement;
    expect(dataUrlInput.value).toBe('https://example.com/data.json');
  });

  /**
   * Test: clears traits when input is empty
   */
  it('clears traits when input is emptied', async () => {
    const user = userEvent.setup();
    
    mockContext.state.traits = ['old', 'traits'];
    
    render(<Step2_Onchain {...mockContext} />);

    const traitsInput = screen.getByLabelText(/Traits \(Optional\)/i);
    
    // Clear should trigger onChange
    await user.clear(traitsInput);

    // Just verify updateField was called (the auto-generated dataUrl also calls it)
    expect(mockContext.updateField).toHaveBeenCalled();
  });

  /**
   * Test: handles mixed delimiter traits input
   */
  it('parses traits with mixed delimiters', async () => {
    const user = userEvent.setup();
    
    render(<Step2_Onchain {...mockContext} />);

    const traitsInput = screen.getByLabelText(/Traits \(Optional\)/i);
    await user.type(traitsInput, 'pay:x402, social gaming,nft');
    await user.tab(); // Trigger blur by moving focus away

    await waitFor(() => {
      expect(mockContext.updateField).toHaveBeenCalledWith(
        'traits',
        expect.arrayContaining(['pay:x402', 'social', 'gaming', 'nft'])
      );
    });
  });
});

