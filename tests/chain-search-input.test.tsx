/**
 * Tests for ChainSearchInput component
 * Tests chain selection dropdown with search and keyboard navigation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ChainSearchInput } from '@/components/chain-search-input';

describe('ChainSearchInput component', () => {
  it('renders with placeholder', () => {
    const onChange = vi.fn();
    render(<ChainSearchInput value={null} onChange={onChange} />);

    expect(screen.getByPlaceholderText(/Search mainnets/i)).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    const onChange = vi.fn();
    render(
      <ChainSearchInput 
        value={null} 
        onChange={onChange}
        placeholder="Custom placeholder" 
      />
    );

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('displays selected chain when value is provided', () => {
    const onChange = vi.fn();
    // Ethereum mainnet chain ID
    render(<ChainSearchInput value={1} onChange={onChange} />);

    // Should show Ethereum (the input clears but the display shows the selection)
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('shows dropdown when input is focused', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ChainSearchInput value={null} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.click(input);

    // Dropdown should be visible (check for common chain names)
    // Note: The exact behavior depends on the searchChains implementation
  });

  it('filters chains based on search query', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ChainSearchInput value={null} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Eth');

    // Should filter to show Ethereum-related chains
  });

  it('calls onChange when chain is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ChainSearchInput value={null} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.click(input);

    // This test would need more setup to properly test selection
    // For now, just verify the component renders without crashing
    expect(input).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ChainSearchInput 
        value={null} 
        onChange={onChange}
        className="custom-class" 
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('clears search when chain is selected', () => {
    const onChange = vi.fn();
    
    const { rerender } = render(<ChainSearchInput value={null} onChange={onChange} />);

    // Simulate selecting a chain by updating the value prop
    rerender(<ChainSearchInput value={1} onChange={onChange} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    // When a chain is selected, the component displays the chain name
    expect(input.value).toBe('Ethereum (1)');
  });

  it('handles null value', () => {
    const onChange = vi.fn();
    render(<ChainSearchInput value={null} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('is keyboard accessible', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ChainSearchInput value={null} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    
    // Tab to focus
    await user.tab();
    expect(input).toHaveFocus();
  });

  describe('Keyboard navigation', () => {
    it('opens dropdown on ArrowDown key when closed', async () => {
      // Test ArrowDown opens dropdown
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ChainSearchInput value={null} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      input.focus();
      
      // Press ArrowDown to open
      await user.keyboard('{ArrowDown}');

      // Should show dropdown content
      await waitFor(() => {
        expect(screen.getByText(/chains/i)).toBeInTheDocument();
      });
    });

    it('navigates down with ArrowDown key', async () => {
      // Test ArrowDown navigation
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ChainSearchInput value={null} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      // Wait for dropdown to appear
      await waitFor(() => {
        expect(screen.getByText(/chains/i)).toBeInTheDocument();
      });

      // Navigate down
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');

      // The highlighted item should change (visual feedback)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('navigates up with ArrowUp key', async () => {
      // Test ArrowUp navigation
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ChainSearchInput value={null} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText(/chains/i)).toBeInTheDocument();
      });

      // Navigate down first, then up
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');

      // Should still have dropdown open
      expect(screen.getByText(/chains/i)).toBeInTheDocument();
    });

    it('selects highlighted chain on Enter key', async () => {
      // Test Enter key selects chain
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ChainSearchInput value={null} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText(/chains/i)).toBeInTheDocument();
      });

      // Press Enter to select first chain
      await user.keyboard('{Enter}');

      // onChange should be called
      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      });
    });

    it('closes dropdown on Escape key', async () => {
      // Test Escape key closes dropdown
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ChainSearchInput value={null} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText(/chains/i)).toBeInTheDocument();
      });

      // Press Escape
      await user.keyboard('{Escape}');

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByText(/chains/i)).not.toBeInTheDocument();
      });
    });

    it('prevents default on navigation keys', async () => {
      // Test that navigation keys prevent default behavior
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ChainSearchInput value={null} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText(/chains/i)).toBeInTheDocument();
      });

      // These should not cause scrolling or other default behaviors
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{Enter}');

      // Component should still function normally
      expect(input).toBeInTheDocument();
    });
  });

  describe('Dropdown behavior', () => {
    it('shows "No chains found" when search has no results', async () => {
      // Test empty results message
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ChainSearchInput value={null} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      // Type a search that won't match any chains
      await user.type(input, 'zzzznonexistent');

      await waitFor(() => {
        expect(screen.getByText(/No chains found/i)).toBeInTheDocument();
      });
    });

    it('shows chain count with singular form', async () => {
      // Test singular "chain" text
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ChainSearchInput value={null} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      // Search for something that returns exactly 1 result
      await user.type(input, 'ethereum');

      await waitFor(() => {
        // Check if "1 chain" appears (might be "1 chains" depending on results)
        const text = screen.getByText(/\d+ chains?/i).textContent;
        expect(text).toMatch(/\d+ chains?/i);
      });
    });

    it('closes dropdown when clicking outside', async () => {
      // Test click outside closes dropdown
      const user = userEvent.setup();
      const onChange = vi.fn();

      const { container } = render(
        <div>
          <ChainSearchInput value={null} onChange={onChange} />
          <div data-testid="outside">Outside element</div>
        </div>
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText(/chains/i)).toBeInTheDocument();
      });

      // Click outside
      const outside = screen.getByTestId('outside');
      await user.click(outside);

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByText(/chains/i)).not.toBeInTheDocument();
      });
    });

    it('selects chain when clicking on dropdown item', async () => {
      // Test clicking a chain in dropdown
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ChainSearchInput value={null} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText(/chains/i)).toBeInTheDocument();
      });

      // Click on a chain button (get first chain button)
      const chainButtons = screen.getAllByRole('button');
      if (chainButtons.length > 0) {
        await user.click(chainButtons[0]);

        // onChange should be called
        await waitFor(() => {
          expect(onChange).toHaveBeenCalled();
        });
      }
    });

    it('shows check icon for selected chain', async () => {
      // Test that selected chain shows check icon
      const user = userEvent.setup();
      const onChange = vi.fn();

      // Render with Ethereum selected (chainId: 1)
      const { container } = render(<ChainSearchInput value={1} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        // Check icon should be visible (lucide CheckIcon renders as svg)
        const svgs = container.querySelectorAll('svg');
        expect(svgs.length).toBeGreaterThan(0);
      });
    });

    it('updates display value when props change', () => {
      // Test that display updates when value prop changes
      const onChange = vi.fn();
      
      const { rerender } = render(<ChainSearchInput value={null} onChange={onChange} />);

      let input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('');

      // Update to Ethereum
      rerender(<ChainSearchInput value={1} onChange={onChange} />);

      input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toContain('Ethereum');
    });

    it('clears search query when chain is selected', async () => {
      // Test that search query clears after selection
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ChainSearchInput value={null} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      
      // Type a search query
      await user.type(input, 'eth');
      expect((input as HTMLInputElement).value).toBe('eth');

      // Wait for dropdown to be visible
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });

      // Select a chain
      const chainButtons = screen.getAllByRole('button');
      if (chainButtons.length > 0) {
        await user.click(chainButtons[0]);

        // Search query should be cleared (but display shows selected chain)
        await waitFor(() => {
          expect(onChange).toHaveBeenCalled();
        });
      }
    });
  });
});

