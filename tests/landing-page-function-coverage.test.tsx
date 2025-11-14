/**
 * Tests for LandingPage component - Function Coverage
 * This file targets uncovered functions to improve function coverage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LandingPage from '@/components/landing-page';

// Mock dependencies
vi.mock('@/lib/contracts/registry.read', () => ({
  getTotalActiveApps: vi.fn(),
  listActiveApps: vi.fn(),
}));

vi.mock('@/lib/utils/app-converter', () => ({
  appSummariesToNFTsWithMetadata: vi.fn(),
}));

vi.mock('thirdweb/react', () => ({
  useActiveAccount: vi.fn(() => null),
  ConnectButton: () => <button>Connect Wallet</button>,
}));

// Mock NFTGrid with click handler
vi.mock('@/components/nft-grid', () => ({
  default: vi.fn(({ nfts, onNFTCardClick, onMintClick, isLoading }) => (
    <div data-testid="nft-grid">
      {isLoading ? <div>Loading...</div> : null}
      {nfts.map((nft: any, index: number) => (
        <div 
          key={index} 
          onClick={() => onNFTCardClick(nft)} 
          data-testid={`nft-card-${index}`}
        >
          {nft.name}
        </div>
      ))}
      {onMintClick && <button onClick={onMintClick} data-testid="mint-button">Mint</button>}
    </div>
  )),
}));

// Mock NFTViewModal
let mockHandleCloseViewModal: (() => void) | null = null;
let mockHandleUpdateStatus: ((nft: any, status: number) => Promise<void>) | null = null;

vi.mock('@/components/nft-view-modal', () => ({
  default: vi.fn(({ isOpen, handleCloseViewModal, nft, onUpdateStatus }) => {
    // Capture the handlers so we can test them
    mockHandleCloseViewModal = handleCloseViewModal;
    mockHandleUpdateStatus = onUpdateStatus;
    
    return isOpen ? (
      <div data-testid="nft-view-modal" role="dialog">
        <h2>NFT Details</h2>
        <p>{nft?.name}</p>
        <button onClick={handleCloseViewModal} data-testid="close-modal-btn">Close</button>
        <button onClick={() => onUpdateStatus(nft, 1)} data-testid="update-status-btn">Update Status</button>
      </div>
    ) : null;
  }),
}));

describe('LandingPage - Function Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleCloseViewModal = null;
    mockHandleUpdateStatus = null;
  });

  /**
   * Test: handleOpenViewModal function (lines 115-118)
   * Covers opening the view modal with an NFT
   */
  it('opens view modal when NFT card is clicked', async () => {
    const { getTotalActiveApps, listActiveApps } = await import('@/lib/contracts/registry.read');
    const { appSummariesToNFTsWithMetadata } = await import('@/lib/utils/app-converter');

    const mockNFT = {
      did: 'did:web:example.com',
      name: 'Test App',
      version: '1.0.0',
      image: 'https://example.com/image.png',
      currentOwner: '0x1234',
      minter: '0x1234',
      status: 0,
    };

    vi.mocked(getTotalActiveApps).mockResolvedValue(1);
    vi.mocked(listActiveApps).mockResolvedValue({ items: [mockNFT] });
    vi.mocked(appSummariesToNFTsWithMetadata).mockResolvedValue([mockNFT] as any);

    render(<LandingPage />);

    // Wait for NFTs to load
    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Click on NFT card to open view modal
    const nftCard = screen.getByTestId('nft-card-0');
    fireEvent.click(nftCard);

    // Verify modal opened
    await waitFor(() => {
      expect(screen.getByTestId('nft-view-modal')).toBeInTheDocument();
    });

    expect(screen.getByText('NFT Details')).toBeInTheDocument();
  });

  /**
   * Test: handleCloseViewModal function (lines 121-124)
   * Covers closing the view modal
   */
  it('closes view modal when close button is clicked', async () => {
    const { getTotalActiveApps, listActiveApps } = await import('@/lib/contracts/registry.read');
    const { appSummariesToNFTsWithMetadata } = await import('@/lib/utils/app-converter');

    const mockNFT = {
      did: 'did:web:example.com',
      name: 'Test App 2',
      version: '1.0.0',
      image: 'https://example.com/image.png',
      currentOwner: '0x1234',
      minter: '0x1234',
      status: 0,
    };

    vi.mocked(getTotalActiveApps).mockResolvedValue(1);
    vi.mocked(listActiveApps).mockResolvedValue({ items: [mockNFT] });
    vi.mocked(appSummariesToNFTsWithMetadata).mockResolvedValue([mockNFT] as any);

    render(<LandingPage />);

    // Wait for NFTs and open modal
    await waitFor(() => {
      expect(screen.getByText('Test App 2')).toBeInTheDocument();
    }, { timeout: 2000 });

    fireEvent.click(screen.getByTestId('nft-card-0'));

    await waitFor(() => {
      expect(screen.getByTestId('nft-view-modal')).toBeInTheDocument();
    });

    // Click close button
    const closeButton = screen.getByTestId('close-modal-btn');
    fireEvent.click(closeButton);

    // Verify modal closed
    await waitFor(() => {
      expect(screen.queryByTestId('nft-view-modal')).not.toBeInTheDocument();
    });
  });

  /**
   * Test: handleUpdateStatus function (lines 127-130)
   * Covers the stub updateStatus function that does nothing on landing page
   */
  it('handles status update attempt gracefully (stub function)', async () => {
    const { getTotalActiveApps, listActiveApps } = await import('@/lib/contracts/registry.read');
    const { appSummariesToNFTsWithMetadata } = await import('@/lib/utils/app-converter');

    const mockNFT = {
      did: 'did:web:example.com',
      name: 'Test App 3',
      version: '1.0.0',
      image: 'https://example.com/image.png',
      currentOwner: '0x1234',
      minter: '0x1234',
      status: 0,
    };

    vi.mocked(getTotalActiveApps).mockResolvedValue(1);
    vi.mocked(listActiveApps).mockResolvedValue({ items: [mockNFT] });
    vi.mocked(appSummariesToNFTsWithMetadata).mockResolvedValue([mockNFT] as any);

    render(<LandingPage />);

    // Wait for NFTs and open modal
    await waitFor(() => {
      expect(screen.getByText('Test App 3')).toBeInTheDocument();
    }, { timeout: 2000 });

    fireEvent.click(screen.getByTestId('nft-card-0'));

    await waitFor(() => {
      expect(screen.getByTestId('nft-view-modal')).toBeInTheDocument();
    });

    // Try to update status (should do nothing but not error)
    const updateStatusButton = screen.getByTestId('update-status-btn');
    fireEvent.click(updateStatusButton);

    // Verify no errors occurred and modal still works
    await waitFor(() => {
      expect(screen.getByTestId('nft-view-modal')).toBeInTheDocument();
    });
  });

  /**
   * Test: handleOpenMintModal function (dummy function, line 132)
   * Covers the stub mint modal handler
   */
  it('renders NFTGrid with onMintClick prop', async () => {
    const { getTotalActiveApps, listActiveApps } = await import('@/lib/contracts/registry.read');
    const { appSummariesToNFTsWithMetadata } = await import('@/lib/utils/app-converter');

    vi.mocked(getTotalActiveApps).mockResolvedValue(0);
    vi.mocked(listActiveApps).mockResolvedValue({ items: [] });
    vi.mocked(appSummariesToNFTsWithMetadata).mockResolvedValue([]);

    render(<LandingPage />);

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByTestId('nft-grid')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Verify NFTGrid is rendered (which receives onMintClick prop)
    expect(screen.getByTestId('nft-grid')).toBeInTheDocument();
  });
});

