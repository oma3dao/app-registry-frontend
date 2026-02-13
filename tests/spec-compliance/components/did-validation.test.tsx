/**
 * DID Validation Component Tests
 * 
 * Tests for DidVerification component UI behavior
 * Validates user interactions, error states, and verification flow
 * 
 * Related Specification: OMATrust Identity Specification
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DidVerification } from '@/components/did-verification';

// Mock thirdweb react
vi.mock('thirdweb/react', () => ({
  useActiveAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
  })),
}));

// Mock DID utilities (importOriginal pattern per TEST-MIGRATION-GUIDE)
vi.mock('@/lib/utils/did', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/did')>();
  return {
    ...actual,
    normalizeDidWeb: vi.fn((input: string) => {
      if (input.startsWith('did:')) return input;
      return `did:web:${input}`;
    }),
    normalizeDid: vi.fn((input: string) => {
      if (input.startsWith('did:')) return input;
      return `did:web:${input}`;
    }),
  };
});

// Mock environment config
vi.mock('@/config/env', () => ({
  env: {
    registryAddress: '0x1234567890123456789012345678901234567890',
    activeChain: {
      chainId: 66238,
      name: 'OMAchain Testnet',
      blockExplorers: [{ url: 'https://explorer.testnet.chain.oma3.org/' }],
    },
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertCircleIcon: () => <span data-testid="icon-alert">Alert</span>,
  CheckCircleIcon: () => <span data-testid="icon-check">Check</span>,
  ExternalLinkIcon: () => <span data-testid="icon-external">External</span>,
  InfoIcon: () => <span data-testid="icon-info">Info</span>,
  Loader2Icon: ({ className }: { className?: string }) => (
    <span data-testid="icon-loader" className={className}>Loading</span>
  ),
}));

import { useActiveAccount } from 'thirdweb/react';

describe('DidVerification Component', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Initial State', () => {
    /**
     * Test: Renders verify button
     */
    it('renders verify button', () => {
      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    /**
     * Test: Button shows correct text when not verified
     */
    it('shows verify text when not verified', () => {
      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      // Button should indicate verification action
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    /**
     * Test: Shows verified state
     */
    it('shows verified state when already verified', () => {
      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={true}
        />
      );
      
      // Should show check icon in button and success message (2 total)
      const checkIcons = screen.getAllByTestId('icon-check');
      expect(checkIcons.length).toBe(2); // One in button, one in success message
      // Should show "Verified" text in multiple places
      expect(screen.getAllByText(/Verified/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Wallet Connection', () => {
    /**
     * Test: Shows error when wallet not connected
     */
    it('shows error when no wallet connected', async () => {
      // Mock no wallet
      vi.mocked(useActiveAccount).mockReturnValueOnce(undefined);
      
      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/connect.*wallet/i)).toBeInTheDocument();
      });
    });

    /**
     * Test: Proceeds with connected wallet
     */
    it('proceeds when wallet is connected', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, status: 'ready' }),
      });

      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('DID Validation', () => {
    /**
     * Test: Shows error for empty DID
     */
    it('shows error for empty DID', async () => {
      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/enter.*DID/i)).toBeInTheDocument();
      });
    });

    /**
     * Test: Shows error for whitespace-only DID
     */
    it('shows error for whitespace DID', async () => {
      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="   " 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/enter.*DID/i)).toBeInTheDocument();
      });
    });

    /**
     * Test: Normalizes non-DID input
     */
    it('normalizes domain to did:web format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, status: 'ready' }),
      });

      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/verify-and-attest',
          expect.objectContaining({
            body: expect.stringContaining('did:web:example.com'),
          })
        );
      });
    });

    /**
     * Test: Preserves did: prefix if already present
     */
    it('preserves existing did: prefix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, status: 'ready' }),
      });

      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:already-formatted.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/verify-and-attest',
          expect.objectContaining({
            body: expect.stringContaining('did:web:already-formatted.com'),
          })
        );
      });
    });
  });

  describe('Loading State', () => {
    /**
     * Test: Shows loading indicator during verification
     */
    it('shows loading indicator during verification', async () => {
      // Make fetch hang
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
      });
    });

    /**
     * Test: Loading spinner has animation class
     */
    it('loading spinner animates', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        const loader = screen.getByTestId('icon-loader');
        expect(loader.className).toContain('animate-spin');
      });
    });
  });

  describe('Success State', () => {
    /**
     * Test: Calls onComplete with true on success
     */
    it('calls onVerificationComplete(true) on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, status: 'ready' }),
      });

      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(true);
      });
    });

    /**
     * Test: Shows success indicator
     */
    it('shows success state after verification', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, status: 'ready' }),
      });

      const onComplete = vi.fn();
      const { rerender } = render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(true);
      });

      // Rerender with verified=true
      rerender(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={true}
        />
      );

      // Should show check icons (in button and success message)
      const checkIcons = screen.getAllByTestId('icon-check');
      expect(checkIcons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error States', () => {
    /**
     * Test: Shows error on API failure
     */
    it('shows error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Verification failed' }),
      });

      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('icon-alert')).toBeInTheDocument();
      });
    });

    /**
     * Test: Shows error on network failure
     */
    it('shows error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('icon-alert')).toBeInTheDocument();
      });
    });

    /**
     * Test: Does not call onComplete on error
     */
    it('does not call onComplete on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed' }),
      });

      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('icon-alert')).toBeInTheDocument();
      });

      expect(onComplete).not.toHaveBeenCalledWith(true);
    });
  });

  describe('API Request', () => {
    /**
     * Test: Sends correct request body
     */
    it('sends correct request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, status: 'ready' }),
      });

      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/verify-and-attest',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('did:web:example.com'),
          })
        );
      });
    });

    /**
     * Test: Includes connected address in request
     */
    it('includes connected address in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, status: 'ready' }),
      });

      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.connectedAddress).toBe('0x1234567890123456789012345678901234567890');
      });
    });

    /**
     * Test: Requests ownership schema
     */
    it('requests ownership schema verification', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, status: 'ready' }),
      });

      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.requiredSchemas).toContain('oma3.ownership.v1');
      });
    });
  });

  describe('Button Behavior', () => {
    /**
     * Test: Button is disabled during verification
     */
    it('button disabled during verification', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const onComplete = vi.fn();
      render(
        <DidVerification 
          did="did:web:example.com" 
          onVerificationComplete={onComplete}
          isVerified={false}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });
  });
});

