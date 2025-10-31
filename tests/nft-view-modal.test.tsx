// tests/nft-view-modal.test.tsx
// Test suite for the NFTViewModal component
// This file verifies that the NFTViewModal correctly displays NFT information,
// handles status updates, manages metadata, and provides launch functionality.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NFTViewModal from '../src/components/nft-view-modal';
import type { NFT } from '../src/types/nft';
import { vi } from 'vitest';

// Mock all the dependencies
vi.mock('../src/lib/log', () => ({
  log: vi.fn(),
}));

vi.mock('../src/lib/utils', () => ({
  isMobile: vi.fn(() => false),
  buildVersionedDID: vi.fn((did, version) => `${did}-${version}`),
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

vi.mock('../src/lib/contracts/metadata.read', () => ({
  getMetadata: vi.fn(),
}));

vi.mock('../src/lib/iwps', () => ({
  buildIwpsProxyRequest: vi.fn(() => ({
    requestBody: { test: 'data' },
    generatedPin: '1234',
  })),
}));

vi.mock('../src/lib/nft-metadata-context', () => ({
  useNFTMetadata: vi.fn(() => ({
    getNFTMetadata: vi.fn(() => ({
      displayData: {
        image: 'https://example.com/image.png',
        external_url: 'https://example.com',
        descriptionUrl: 'https://example.com/description',
        description: 'Test description',
        screenshotUrls: ['https://example.com/screenshot1.png'],
        platforms: { web: { launchUrl: 'https://example.com/launch' } },
      },
      isLoading: false,
    })),
    fetchNFTDescription: vi.fn(),
  })),
}));

vi.mock('thirdweb/react', () => ({
  useActiveAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../src/config/app-config', () => ({
  METADATA_EDIT_ELIGIBLE_BASE_URLS: ['https://example.com'],
  IWPS_APPROVAL_KEY: 'approval',
  IWPS_LOCATION_KEY: 'location',
  IWPS_DESTINATION_URL_KEY: 'destinationUrl',
  IWPS_DOWNLOAD_URL_KEY: 'downloadUrl',
  IWPS_ERROR_KEY: 'error',
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('NFTViewModal component', () => {
  const mockNFT: NFT = {
    did: 'did:example:123',
    name: 'Test App',
    version: '1.0',
    dataUrl: 'https://example.com/data',
    iwpsPortalUri: 'https://example.com/portal',
    agentApiUri: 'https://example.com/api',
    status: 0,
    minter: '0x1234567890123456789012345678901234567890',
  };

  const mockHandleCloseViewModal = vi.fn();
  const mockOnUpdateStatus = vi.fn();
  const mockOnEditMetadata = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  // This test verifies that the modal renders when open with NFT data
  it('renders modal when open with NFT data', () => {
    render(
      <NFTViewModal
        isOpen={true}
        handleCloseViewModal={mockHandleCloseViewModal}
        nft={mockNFT}
        onUpdateStatus={mockOnUpdateStatus}
        onEditMetadata={mockOnEditMetadata}
      />
    );

    expect(screen.getByText('Test App')).toBeInTheDocument();
    expect(screen.getByText('Version: 1.0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /launch/i })).toBeInTheDocument();
  });

  // This test checks that the modal does not render when closed
  it('does not render when closed', () => {
    render(
      <NFTViewModal
        isOpen={false}
        handleCloseViewModal={mockHandleCloseViewModal}
        nft={mockNFT}
        onUpdateStatus={mockOnUpdateStatus}
        onEditMetadata={mockOnEditMetadata}
      />
    );

    expect(screen.queryByText('Test App')).not.toBeInTheDocument();
  });

  // This test verifies that the modal does not render when NFT is null
  it('does not render when NFT is null', () => {
    const { container } = render(
      <NFTViewModal
        isOpen={true}
        handleCloseViewModal={mockHandleCloseViewModal}
        nft={null}
        onUpdateStatus={mockOnUpdateStatus}
        onEditMetadata={mockOnEditMetadata}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  // This test checks that the modal displays NFT information correctly
  it('displays NFT information correctly', () => {
    render(
      <NFTViewModal
        isOpen={true}
        handleCloseViewModal={mockHandleCloseViewModal}
        nft={mockNFT}
        onUpdateStatus={mockOnUpdateStatus}
        onEditMetadata={mockOnEditMetadata}
      />
    );

    expect(screen.getByText('Test App')).toBeInTheDocument();
    expect(screen.getByText('Version: 1.0')).toBeInTheDocument();
    // Check for status label in the header (more specific)
    expect(screen.getAllByText('Active')[0]).toBeInTheDocument();
  });

  // This test verifies that the modal shows status editing for owner
  it('shows status editing for owner', () => {
    render(
      <NFTViewModal
        isOpen={true}
        handleCloseViewModal={mockHandleCloseViewModal}
        nft={mockNFT}
        onUpdateStatus={mockOnUpdateStatus}
        onEditMetadata={mockOnEditMetadata}
      />
    );

    // Check for the status label in the editing section
    expect(screen.getAllByText('Status')[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument();
  });

  // This test verifies that the modal shows edit metadata button when eligible
  it('shows edit metadata button when eligible', () => {
    render(
      <NFTViewModal
        isOpen={true}
        handleCloseViewModal={mockHandleCloseViewModal}
        nft={mockNFT}
        onUpdateStatus={mockOnUpdateStatus}
        onEditMetadata={mockOnEditMetadata}
      />
    );

    expect(screen.getByRole('button', { name: /edit metadata/i })).toBeInTheDocument();
  });

  // This test checks that the modal handles edit metadata button correctly
  it('handles edit metadata correctly', async () => {
    render(
      <NFTViewModal
        isOpen={true}
        handleCloseViewModal={mockHandleCloseViewModal}
        nft={mockNFT}
        onUpdateStatus={mockOnUpdateStatus}
        onEditMetadata={mockOnEditMetadata}
      />
    );

    const editMetadataButton = screen.getByRole('button', { name: /edit metadata/i });
    fireEvent.click(editMetadataButton);

    await waitFor(() => {
      // The edit metadata button should call onEditMetadata
      expect(mockOnEditMetadata).toHaveBeenCalled();
    });
  });

  // This test verifies that the modal handles launch functionality
  it('handles launch functionality', async () => {
    // Mock successful launch response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <NFTViewModal
        isOpen={true}
        handleCloseViewModal={mockHandleCloseViewModal}
        nft={mockNFT}
        onUpdateStatus={mockOnUpdateStatus}
        onEditMetadata={mockOnEditMetadata}
      />
    );

    const launchButton = screen.getByRole('button', { name: /launch/i });
    fireEvent.click(launchButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/iwps-query-proxy',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  // This test checks that the modal handles launch errors gracefully
  it('handles launch errors gracefully', async () => {
    // Mock failed launch response
    (global.fetch as any).mockRejectedValue(new Error('Launch failed'));

    render(
      <NFTViewModal
        isOpen={true}
        handleCloseViewModal={mockHandleCloseViewModal}
        nft={mockNFT}
        onUpdateStatus={mockOnUpdateStatus}
        onEditMetadata={mockOnEditMetadata}
      />
    );

    const launchButton = screen.getByRole('button', { name: /launch/i });
    fireEvent.click(launchButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  // This test checks that the modal closes correctly
  it('closes correctly', () => {
    render(
      <NFTViewModal
        isOpen={true}
        handleCloseViewModal={mockHandleCloseViewModal}
        nft={mockNFT}
        onUpdateStatus={mockOnUpdateStatus}
        onEditMetadata={mockOnEditMetadata}
      />
    );

    const closeButton = screen.getAllByRole('button', { name: /close/i })[0];
    fireEvent.click(closeButton);

    expect(mockHandleCloseViewModal).toHaveBeenCalled();
  });

  // This test verifies that the modal displays metadata information
  it('displays metadata information', () => {
    render(
      <NFTViewModal
        isOpen={true}
        handleCloseViewModal={mockHandleCloseViewModal}
        nft={mockNFT}
        onUpdateStatus={mockOnUpdateStatus}
        onEditMetadata={mockOnEditMetadata}
      />
    );

    expect(screen.getByText('DID')).toBeInTheDocument();
    expect(screen.getByText('did:example:123')).toBeInTheDocument();
    expect(screen.getByText('Data URL')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/data')).toBeInTheDocument();
  });

  // This test checks that the modal shows description when available
  it('shows description when available', () => {
    render(
      <NFTViewModal
        isOpen={true}
        handleCloseViewModal={mockHandleCloseViewModal}
        nft={mockNFT}
        onUpdateStatus={mockOnUpdateStatus}
        onEditMetadata={mockOnEditMetadata}
      />
    );

    // Use getAllByText since there may be multiple "Description" labels and content
    expect(screen.getAllByText('Description').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Test description').length).toBeGreaterThan(0);
  });

  // This test verifies that the modal shows screenshots when available
  it('shows screenshots when available', () => {
    render(
      <NFTViewModal
        isOpen={true}
        handleCloseViewModal={mockHandleCloseViewModal}
        nft={mockNFT}
        onUpdateStatus={mockOnUpdateStatus}
        onEditMetadata={mockOnEditMetadata}
      />
    );

    expect(screen.getByText('Screenshots')).toBeInTheDocument();
    // Check for screenshot image by looking for img with screenshot URL
    const images = screen.getAllByRole('img');
    const hasScreenshot = images.some(img => 
      img.getAttribute('src')?.includes('screenshot1.png')
    );
    expect(hasScreenshot).toBe(true);
  });

  // This test checks that the modal shows platforms when available
  it('shows platforms when available', () => {
    render(
      <NFTViewModal
        isOpen={true}
        handleCloseViewModal={mockHandleCloseViewModal}
        nft={mockNFT}
        onUpdateStatus={mockOnUpdateStatus}
        onEditMetadata={mockOnEditMetadata}
      />
    );

    expect(screen.getByText('Platforms')).toBeInTheDocument();
    expect(screen.getByText('web')).toBeInTheDocument();
  });
}); 