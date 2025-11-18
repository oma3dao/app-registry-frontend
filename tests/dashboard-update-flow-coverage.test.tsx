/**
 * Test file: Dashboard Update Flow Coverage
 * 
 * This file covers:
 * - Update app flow with hash verification (lines 155-229)
 * - Invalid status validation (lines 277-280)
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Dashboard from '@/components/dashboard';

// Mock all dependencies
vi.mock('thirdweb/react', () => ({
  useActiveAccount: vi.fn(),
}));

vi.mock('@/lib/contracts', () => ({
  useAppsByOwner: vi.fn(),
  useMintApp: vi.fn(),
  useUpdateApp: vi.fn(),
  useUpdateStatus: vi.fn(),
  useSetMetadata: vi.fn(),
}));

vi.mock('@/lib/contracts/index', () => ({
  useAppsByOwner: vi.fn(),
  useMintApp: vi.fn(),
  useUpdateApp: vi.fn(),
  useUpdateStatus: vi.fn(),
  useSetMetadata: vi.fn(),
}));

vi.mock('@/lib/nft-metadata-context', () => ({
  useNFTMetadata: vi.fn(() => ({ clearCache: vi.fn() })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/config/env', () => ({
  env: {
    chainId: 66238,
  },
}));

vi.mock('@/lib/log', () => ({
  log: vi.fn(),
}));

vi.mock('@/lib/utils/app-converter', () => ({
  appSummariesToNFTsWithMetadata: vi.fn(),
}));

// Mock registry.read for getAppByDid
vi.mock('@/lib/contracts/registry.read', () => ({
  getAppByDid: vi.fn(),
}));

// Mock schema/mapping
vi.mock('@/schema/mapping', () => ({
  toUpdateAppInput: vi.fn(),
  toMintAppInput: vi.fn(),
}));

// Mock ethers for hash verification
vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers') as any;
  const mockKeccak256 = vi.fn((data: string | Buffer | Uint8Array) => {
    // Convert Buffer to hex string if needed
    if (Buffer.isBuffer(data)) {
      return `0x${data.toString('hex').padStart(64, '0')}`;
    }
    if (typeof data === 'string') {
      // If it's already a hex string, return it; otherwise convert
      return data.startsWith('0x') ? data : `0x${Buffer.from(data).toString('hex').padStart(64, '0')}`;
    }
    return `0x${Buffer.from(data).toString('hex').padStart(64, '0')}`;
  });
  return {
    ...actual,
    keccak256: mockKeccak256,
    ethers: {
      ...actual.ethers,
      keccak256: mockKeccak256,
    },
  };
});

// Mock child components
vi.mock('@/components/nft-grid', () => ({
  default: ({ onNFTCardClick, onOpenMintModal, nfts }: any) => (
    <div data-testid="nft-grid">
      <button onClick={() => onOpenMintModal()}>Open Mint Modal</button>
      {nfts?.map((nft: any, index: number) => (
        <button key={index} onClick={() => onNFTCardClick(nft)}>
          View {nft.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/components/nft-mint-modal', () => ({
  default: ({ isOpen, onClose, onSubmit, initialData }: any) =>
    isOpen ? (
      <div data-testid="nft-mint-modal">
        <button onClick={onClose}>Close</button>
        <button
          onClick={() =>
            onSubmit({
              did: initialData?.did || 'did:web:example.com',
              name: 'Updated App',
              version: '1.0.1',
              metadataJson: '{"name":"Updated App"}',
            })
          }
        >
          Submit
        </button>
      </div>
    ) : null,
}));

vi.mock('@/components/nft-view-modal', () => ({
  default: ({ isOpen, handleCloseViewModal, nft, onUpdateStatus, onEditMetadata }: any) =>
    isOpen ? (
      <div data-testid="nft-view-modal">
        <button onClick={handleCloseViewModal}>Close</button>
        <button onClick={async () => {
          try {
            await onUpdateStatus(nft, -1);
          } catch (e) {
            // Error is handled by handleUpdateStatus
          }
        }}>Update Status Invalid</button>
        <button onClick={async () => {
          try {
            await onUpdateStatus(nft, 3);
          } catch (e) {
            // Error is handled by handleUpdateStatus
          }
        }}>Update Status Too High</button>
        <button onClick={() => onEditMetadata({ name: 'Edited' }, nft)}>Edit Metadata</button>
      </div>
    ) : null,
}));

describe('Dashboard - Update Flow Coverage', () => {
  const mockAccount = { address: '0x1234567890123456789012345678901234567890' };
  const mockClearCache = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useActiveAccount } = await import('thirdweb/react');
    const contracts = await import('@/lib/contracts');
    const { useAppsByOwner, useMintApp, useUpdateApp, useUpdateStatus, useSetMetadata } = contracts;
    const { useNFTMetadata } = await import('@/lib/nft-metadata-context');
    const { appSummariesToNFTsWithMetadata } = await import('@/lib/utils/app-converter');

    vi.mocked(useActiveAccount).mockReturnValue(mockAccount as any);
    vi.mocked(useNFTMetadata).mockReturnValue({
      clearCache: mockClearCache,
      getNFTMetadata: vi.fn(),
      getNFTDescription: vi.fn(),
    } as any);

    const mockNft = {
      did: 'did:web:example.com',
      name: 'Test App',
      version: '1.0.0',
      status: 0,
      minter: mockAccount.address.toLowerCase(),
      currentOwner: mockAccount.address.toLowerCase(),
      dataUrl: 'https://example.com/data.json',
    };

    vi.mocked(useAppsByOwner).mockReturnValue({
      data: [mockNft],
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useMintApp).mockReturnValue({
      mint: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);

    vi.mocked(useUpdateApp).mockReturnValue({
      updateApp: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);

    vi.mocked(useUpdateStatus).mockReturnValue({
      updateStatus: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);

    vi.mocked(useSetMetadata).mockReturnValue({
      setMetadata: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);

    vi.mocked(appSummariesToNFTsWithMetadata).mockResolvedValue([mockNft]);
  });

  /**
   * Test: Covers lines 155-229 - Update app flow with hash verification
   * Tests the complete update flow including:
   * - Hash verification (lines 192-198)
   * - On-chain data comparison (lines 200-211)
   * - Cache clearing (line 222)
   * - Local state update (lines 225-227)
   */
  it('updates app with hash verification and on-chain comparison', async () => {
    const contracts = await import('@/lib/contracts');
    const { useUpdateApp } = contracts;
    const { getAppByDid } = await import('@/lib/contracts/registry.read');
    const { toUpdateAppInput } = await import('@/schema/mapping');
    const { toast } = await import('sonner');
    const ethers = await import('ethers');

    const mockUpdateApp = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateApp).mockReturnValue({
      updateApp: mockUpdateApp,
      isPending: false,
    } as any);

    // Mock getAppByDid to return current on-chain data (lines 200-211)
    vi.mocked(getAppByDid).mockResolvedValue({
      dataUrl: 'https://example.com/data.json',
      dataHash: '0xoldhash',
      interfaces: 1,
      traitHashes: [],
    } as any);

    // Mock toUpdateAppInput to return update input with metadataJson (lines 192-198)
    vi.mocked(toUpdateAppInput).mockReturnValue({
      did: 'did:web:example.com',
      major: 1,
      newMinor: 0,
      newPatch: 1,
      newDataHash: '0xnewhash',
      newInterfaces: 1,
      newTraitHashes: [],
      metadataJson: '{"name":"Updated App"}',
    });

    // Mock keccak256 for hash verification (lines 193-194)
    vi.mocked(ethers.ethers.keccak256).mockReturnValue('0xnewhash');

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('View Test App')).toBeInTheDocument();
    });

    // Click to view the app
    fireEvent.click(screen.getByText('View Test App'));

    await waitFor(() => {
      expect(screen.getByTestId('nft-view-modal')).toBeInTheDocument();
    });

    // Click edit metadata
    fireEvent.click(screen.getByText('Edit Metadata'));

    await waitFor(() => {
      expect(screen.getByTestId('nft-mint-modal')).toBeInTheDocument();
    });

    // Submit the update
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // Verify hash verification was called (lines 192-198)
      expect(ethers.ethers.keccak256).toHaveBeenCalled();

      // Verify getAppByDid was called for on-chain comparison (lines 200-211)
      expect(getAppByDid).toHaveBeenCalledWith('did:web:example.com');

      // Verify updateApp was called (line 219)
      expect(mockUpdateApp).toHaveBeenCalled();

      // Verify cache was cleared (line 222)
      expect(mockClearCache).toHaveBeenCalled();

      // Verify success toast (line 229)
      expect(toast.success).toHaveBeenCalledWith('App updated successfully!');
    });
  });

  /**
   * Test: Covers lines 277-280 - Invalid status validation
   * Tests that invalid status values are rejected
   */
  it('rejects invalid status value (negative)', async () => {
    const contracts = await import('@/lib/contracts');
    const { useUpdateStatus } = contracts;
    const { toast } = await import('sonner');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockUpdateStatus = vi.fn();
    vi.mocked(useUpdateStatus).mockReturnValue({
      updateStatus: mockUpdateStatus,
      isPending: false,
    } as any);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('View Test App')).toBeInTheDocument();
    });

    // Click to view the app
    fireEvent.click(screen.getByText('View Test App'));

    await waitFor(() => {
      expect(screen.getByTestId('nft-view-modal')).toBeInTheDocument();
    });

    // Click update status with invalid value (-1)
    fireEvent.click(screen.getByText('Update Status Invalid'));

    await waitFor(() => {
      // Should reject invalid status (lines 277-280)
      // The function returns Promise.reject directly, so console.error is called but catch block is not executed
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid status value: -1')
      );
    }, { timeout: 2000 });

    consoleErrorSpy.mockRestore();
  });

  /**
   * Test: Covers lines 277-280 - Invalid status validation (greater than 2)
   * Tests that status values > 2 are rejected
   */
  it('rejects invalid status value (greater than 2)', async () => {
    const contracts = await import('@/lib/contracts');
    const { useUpdateStatus } = contracts;
    const { toast } = await import('sonner');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockUpdateStatus = vi.fn();
    vi.mocked(useUpdateStatus).mockReturnValue({
      updateStatus: mockUpdateStatus,
      isPending: false,
    } as any);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('View Test App')).toBeInTheDocument();
    });

    // Click to view the app
    fireEvent.click(screen.getByText('View Test App'));

    await waitFor(() => {
      expect(screen.getByTestId('nft-view-modal')).toBeInTheDocument();
    });

    // Click update status with invalid value (3)
    fireEvent.click(screen.getByText('Update Status Too High'));

    await waitFor(() => {
      // Should reject invalid status (lines 277-280)
      // The function returns Promise.reject directly, so console.error is called but catch block is not executed
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid status value: 3')
      );
    }, { timeout: 2000 });

    consoleErrorSpy.mockRestore();
  });
});

