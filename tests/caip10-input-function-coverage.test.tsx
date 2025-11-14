/**
 * Tests for Caip10Input component - Function Coverage
 * This file targets uncovered functions to improve function coverage from 70% to higher
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Caip10Input } from '@/components/caip10-input';

// Mock the normalizeCaip10 function
vi.mock('@/lib/utils/caip10/normalize', () => ({
  normalizeCaip10: vi.fn((input: string) => {
    if (!input || !input.includes(':')) {
      return { valid: false, error: 'Invalid CAIP-10 format' };
    }
    if (input.startsWith('eip155:1:0x')) {
      return { valid: true, normalized: input.toLowerCase(), namespace: 'eip155', reference: '1', accountAddress: input.split(':')[2] };
    }
    if (input.startsWith('solana:')) {
      return { valid: true, normalized: input, namespace: 'solana', reference: input.split(':')[1], accountAddress: input.split(':')[2] };
    }
    if (input.startsWith('sui:')) {
      return { valid: true, normalized: input.toLowerCase(), namespace: 'sui', reference: input.split(':')[1], accountAddress: input.split(':')[2] };
    }
    return { valid: false, error: 'Unsupported format' };
  }),
}));

vi.mock('@/lib/utils/caip10/parse', () => ({
  buildCaip10: vi.fn((namespace: string, reference: string, address: string) => {
    return `${namespace}:${reference}:${address}`;
  }),
}));

// Mock chain search input
vi.mock('@/components/chain-search-input', () => ({
  ChainSearchInput: ({ value, onChange }: any) => (
    <input
      data-testid="chain-search"
      value={value || ''}
      onChange={(e) => onChange(parseInt(e.target.value) || null)}
      placeholder="Search chains..."
    />
  ),
}));

describe('Caip10Input - Function Coverage', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
    vi.clearAllMocks();
  });

  /**
   * Test: handleInputBlur function
   * Covers the blur handler that normalizes input
   */
  it('normalizes input on blur when valid', async () => {
    render(<Caip10Input value="" onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(/eip155:1:0x.../);
    
    // Type a valid CAIP-10
    fireEvent.change(input, { target: { value: 'eip155:1:0xABC123' } });
    
    // Blur to trigger normalization
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('eip155:1:0xabc123');
    });
  });

  /**
   * Test: handleInputBlur with invalid input
   * Covers the error path in blur handler
   */
  it('notifies parent with null on blur when input is invalid', async () => {
    render(<Caip10Input value="" onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(/eip155:1:0x.../);
    
    // Type invalid CAIP-10
    fireEvent.change(input, { target: { value: 'invalid-format' } });
    
    // Blur to trigger validation
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(null);
    });
  });

  /**
   * Test: handleInputBlur with empty input
   * Covers the empty string path in blur handler
   */
  it('notifies parent with null on blur when input is empty', async () => {
    render(<Caip10Input value="eip155:1:0xABC" onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(/eip155:1:0x.../);
    
    // Clear the input
    fireEvent.change(input, { target: { value: '' } });
    
    // Blur
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(null);
    });
  });

  /**
   * Test: handleCopy function
   * Covers the copy to clipboard functionality
   */
  it('copies normalized CAIP-10 to clipboard', async () => {
    // Mock clipboard API
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<Caip10Input value="eip155:1:0xABC123" onChange={mockOnChange} />);

    // Wait for validation
    await waitFor(() => {
      expect(screen.queryByText(/Invalid/)).not.toBeInTheDocument();
    });

    // Click copy button using title attribute
    const copyButton = screen.getByTitle('Copy normalized CAIP-10');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('eip155:1:0xabc123');
    });
  });

  /**
   * Test: handleBuilderApply function with EVM chain
   * Covers the builder apply logic for EIP155
   */
  it('applies builder values for EVM chain', async () => {
    render(<Caip10Input value="" onChange={mockOnChange} />);

    // Open builder
    const toggleButton = screen.getByText('CAIP-10 Builder');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText(/Chain ID/)).toBeInTheDocument();
    });

    // Fill in EVM chain ID
    const chainInput = screen.getByTestId('chain-search');
    fireEvent.change(chainInput, { target: { value: '1' } });

    // Fill in address - use getAllByPlaceholderText and select the last one (builder input)
    const addressInputs = screen.getAllByPlaceholderText(/0x.../);
    const builderAddressInput = addressInputs[addressInputs.length - 1];
    fireEvent.change(builderAddressInput, { target: { value: '0xABCDEF123456' } });

    // Apply
    const applyButton = screen.getByText('Use this');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('eip155:1:0xabcdef123456');
    });
  });

  /**
   * Test: handleBuilderApply function with Solana
   * Covers the builder apply logic for Solana namespace
   */
  it('applies builder values for Solana chain', async () => {
    render(<Caip10Input value="" onChange={mockOnChange} />);

    // Open builder
    const toggleButton = screen.getByText('CAIP-10 Builder');
    fireEvent.click(toggleButton);

    // Switch to Solana
    const namespaceSelect = screen.getByRole('combobox');
    fireEvent.click(namespaceSelect);
    
    await waitFor(() => {
      const solanaOption = screen.getByText(/solana.*Solana/i);
      fireEvent.click(solanaOption);
    });

    // Fill in Solana address (placeholder is "TokenkegQfeZyiNw...")
    const addressInput = screen.getByPlaceholderText(/TokenkegQfeZyiNw/);
    fireEvent.change(addressInput, { target: { value: 'SolanaAddress123' } });

    // Apply
    const applyButton = screen.getByText('Use this');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  /**
   * Test: handleBuilderApply function with Sui
   * Covers the builder apply logic for Sui namespace
   */
  it('applies builder values for Sui chain', async () => {
    render(<Caip10Input value="" onChange={mockOnChange} />);

    // Open builder
    const toggleButton = screen.getByText('CAIP-10 Builder');
    fireEvent.click(toggleButton);

    // Switch to Sui
    const namespaceSelect = screen.getByRole('combobox');
    fireEvent.click(namespaceSelect);
    
    await waitFor(() => {
      const suiOption = screen.getByText(/sui.*Sui/i);
      fireEvent.click(suiOption);
    });

    // Wait for Sui input to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/0x1.*padded/)).toBeInTheDocument();
    });

    // Fill in Sui address
    const addressInput = screen.getByPlaceholderText(/0x1.*padded/);
    fireEvent.change(addressInput, { target: { value: '0x1' } });

    // Apply
    const applyButton = screen.getByText('Use this');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  /**
   * Test: handleBuilderApply early return (empty address)
   * Covers the early return path when address is missing
   */
  it('does not apply when address is empty', async () => {
    render(<Caip10Input value="" onChange={mockOnChange} />);

    // Open builder
    const toggleButton = screen.getByText('CAIP-10 Builder');
    fireEvent.click(toggleButton);

    // Wait for builder to be visible
    await waitFor(() => {
      expect(screen.getByText(/Chain ID/)).toBeInTheDocument();
    });

    // Don't fill in address, just try to apply
    const applyButton = screen.getByText('Use this');
    fireEvent.click(applyButton);

    // Should not call onChange since address is empty
    await waitFor(() => {
      expect(mockOnChange).not.toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  /**
   * Test: Auto-scroll effect when builder opens
   * Covers the useEffect for scrolling when builder is opened
   */
  it('attempts to scroll when builder opens', async () => {
    const mockScrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = mockScrollIntoView;

    render(<Caip10Input value="" onChange={mockOnChange} />);

    // Open builder
    const toggleButton = screen.getByText('CAIP-10 Builder');
    fireEvent.click(toggleButton);

    // Wait for scroll effect
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  /**
   * Test: Builder toggle functionality
   * Covers opening and closing the builder
   */
  it('toggles builder open and closed', async () => {
    render(<Caip10Input value="" onChange={mockOnChange} />);

    const toggleButton = screen.getByText('CAIP-10 Builder');
    
    // Initially closed
    expect(screen.queryByText(/Chain ID/)).not.toBeInTheDocument();

    // Open
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(screen.getByText(/Chain ID/)).toBeInTheDocument();
    });

    // Close
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(screen.queryByText(/Chain ID/)).not.toBeInTheDocument();
    });
  });
});

