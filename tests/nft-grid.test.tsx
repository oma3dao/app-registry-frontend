// tests/nft-grid.test.tsx
// Test suite for the NFTGrid component
// This file verifies that the NFTGrid correctly renders NFTs, handles loading states,
// shows empty states, filters duplicates, and manages user interactions.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NFTGrid from '../src/components/nft-grid';
import type { NFT } from '../src/types/nft';
import { vi } from 'vitest';

// Mock the log utility
vi.mock('../src/lib/log', () => ({
  log: vi.fn(),
}));

// Mock the NFTCard component
vi.mock('../src/components/nft-card', () => ({
  default: vi.fn(({ nft, onNFTCardClick, showStatus }) => (
    <div 
      data-testid={`nft-card-${nft.did}-${nft.version}`}
      onClick={() => onNFTCardClick(nft)}
      data-show-status={showStatus}
    >
      {nft.name} - {nft.version}
    </div>
  )),
}));

describe('NFTGrid component', () => {
  const mockOnNFTCardClick = vi.fn();
  const mockOnOpenMintModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // This test verifies that the component shows loading state
  it('shows loading state when isLoading is true', () => {
    render(
      <NFTGrid
        nfts={[]}
        onNFTCardClick={mockOnNFTCardClick}
        onOpenMintModal={mockOnOpenMintModal}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading Applications...')).toBeInTheDocument();
    expect(screen.getByText('Fetching registered applications from the blockchain.')).toBeInTheDocument();
    // Look for the loading spinner by its class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  // This test checks that the component shows empty state when no NFTs
  it('shows empty state when no NFTs are provided', () => {
    render(
      <NFTGrid
        nfts={[]}
        onNFTCardClick={mockOnNFTCardClick}
        onOpenMintModal={mockOnOpenMintModal}
        isLoading={false}
      />
    );

    expect(screen.getByText('No Applications Registered Yet')).toBeInTheDocument();
    expect(screen.getByText("Register your first application on OMA3's decentralized app registry.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register new app/i })).toBeInTheDocument();
  });

  // This test verifies that the component renders NFTs correctly
  it('renders NFTs correctly', () => {
    const mockNfts: NFT[] = [
      {
        did: 'did:example:123',
        name: 'Test App 1',
        version: '1.0',
        dataUrl: 'https://example.com/data1',
        iwpsPortalUri: 'https://example.com/portal1',
        agentApiUri: 'https://example.com/api1',
        status: 0,
        minter: '0x123',
      },
      {
        did: 'did:example:456',
        name: 'Test App 2',
        version: '2.0',
        dataUrl: 'https://example.com/data2',
        iwpsPortalUri: 'https://example.com/portal2',
        agentApiUri: 'https://example.com/api2',
        status: 1,
        minter: '0x456',
      },
    ];

    render(
      <NFTGrid
        nfts={mockNfts}
        onNFTCardClick={mockOnNFTCardClick}
        onOpenMintModal={mockOnOpenMintModal}
        isLoading={false}
      />
    );

    expect(screen.getByTestId('nft-card-did:example:123-1.0')).toBeInTheDocument();
    expect(screen.getByTestId('nft-card-did:example:456-2.0')).toBeInTheDocument();
    expect(screen.getByText('Test App 1 - 1.0')).toBeInTheDocument();
    expect(screen.getByText('Test App 2 - 2.0')).toBeInTheDocument();
  });

  // This test checks that the component filters out duplicate NFTs
  it('filters out duplicate NFTs based on DID and version', () => {
    const mockNfts: NFT[] = [
      {
        did: 'did:example:123',
        name: 'Test App 1',
        version: '1.0',
        dataUrl: 'https://example.com/data1',
        iwpsPortalUri: 'https://example.com/portal1',
        agentApiUri: 'https://example.com/api1',
        status: 0,
        minter: '0x123',
      },
      {
        did: 'did:example:123',
        name: 'Test App 1 Duplicate',
        version: '1.0',
        dataUrl: 'https://example.com/data1-duplicate',
        iwpsPortalUri: 'https://example.com/portal1-duplicate',
        agentApiUri: 'https://example.com/api1-duplicate',
        status: 1,
        minter: '0x456',
      },
      {
        did: 'did:example:456',
        name: 'Test App 2',
        version: '2.0',
        dataUrl: 'https://example.com/data2',
        iwpsPortalUri: 'https://example.com/portal2',
        agentApiUri: 'https://example.com/api2',
        status: 1,
        minter: '0x789',
      },
    ];

    render(
      <NFTGrid
        nfts={mockNfts}
        onNFTCardClick={mockOnNFTCardClick}
        onOpenMintModal={mockOnOpenMintModal}
        isLoading={false}
      />
    );

    // Should only show 2 unique NFTs (duplicate filtered out)
    expect(screen.getByTestId('nft-card-did:example:123-1.0')).toBeInTheDocument();
    expect(screen.getByTestId('nft-card-did:example:456-2.0')).toBeInTheDocument();
    expect(screen.queryByText('Test App 1 Duplicate - 1.0')).not.toBeInTheDocument();
  });

  // This test verifies that the component handles NFTs with missing DID or version
  it('handles NFTs with missing DID or version gracefully', () => {
    const mockNfts: NFT[] = [
      {
        did: 'did:example:123',
        name: 'Valid App',
        version: '1.0',
        dataUrl: 'https://example.com/data1',
        iwpsPortalUri: 'https://example.com/portal1',
        agentApiUri: 'https://example.com/api1',
        status: 0,
        minter: '0x123',
      },
      {
        did: '',
        name: 'Invalid App - No DID',
        version: '1.0',
        dataUrl: 'https://example.com/data2',
        iwpsPortalUri: 'https://example.com/portal2',
        agentApiUri: 'https://example.com/api2',
        status: 0,
        minter: '0x456',
      },
      {
        did: 'did:example:789',
        name: 'Invalid App - No Version',
        version: '',
        dataUrl: 'https://example.com/data3',
        iwpsPortalUri: 'https://example.com/portal3',
        agentApiUri: 'https://example.com/api3',
        status: 0,
        minter: '0x789',
      },
    ];

    render(
      <NFTGrid
        nfts={mockNfts}
        onNFTCardClick={mockOnNFTCardClick}
        onOpenMintModal={mockOnOpenMintModal}
        isLoading={false}
      />
    );

    // Should only show the valid NFT
    expect(screen.getByTestId('nft-card-did:example:123-1.0')).toBeInTheDocument();
    expect(screen.queryByText('Invalid App - No DID - 1.0')).not.toBeInTheDocument();
    expect(screen.queryByText('Invalid App - No Version -')).not.toBeInTheDocument();
  });

  // This test checks that the component calls onNFTCardClick when NFT is clicked
  it('calls onNFTCardClick when NFT card is clicked', () => {
    const mockNfts: NFT[] = [
      {
        did: 'did:example:123',
        name: 'Test App',
        version: '1.0',
        dataUrl: 'https://example.com/data1',
        iwpsPortalUri: 'https://example.com/portal1',
        agentApiUri: 'https://example.com/api1',
        status: 0,
        minter: '0x123',
      },
    ];

    render(
      <NFTGrid
        nfts={mockNfts}
        onNFTCardClick={mockOnNFTCardClick}
        onOpenMintModal={mockOnOpenMintModal}
        isLoading={false}
      />
    );

    const nftCard = screen.getByTestId('nft-card-did:example:123-1.0');
    fireEvent.click(nftCard);

    expect(mockOnNFTCardClick).toHaveBeenCalledWith(mockNfts[0]);
  });

  // This test verifies that the component calls onOpenMintModal when register button is clicked
  it('calls onOpenMintModal when register button is clicked', () => {
    render(
      <NFTGrid
        nfts={[]}
        onNFTCardClick={mockOnNFTCardClick}
        onOpenMintModal={mockOnOpenMintModal}
        isLoading={false}
      />
    );

    const registerButton = screen.getByRole('button', { name: /register new app/i });
    fireEvent.click(registerButton);

    expect(mockOnOpenMintModal).toHaveBeenCalled();
  });

  // This test checks that the component applies custom className
  it('applies custom className', () => {
    const mockNfts: NFT[] = [
      {
        did: 'did:example:123',
        name: 'Test App',
        version: '1.0',
        dataUrl: 'https://example.com/data1',
        iwpsPortalUri: 'https://example.com/portal1',
        agentApiUri: 'https://example.com/api1',
        status: 0,
        minter: '0x123',
      },
    ];

    const { container } = render(
      <NFTGrid
        nfts={mockNfts}
        onNFTCardClick={mockOnNFTCardClick}
        onOpenMintModal={mockOnOpenMintModal}
        isLoading={false}
        className="custom-grid-class"
      />
    );

    const gridContainer = container.querySelector('.custom-grid-class');
    expect(gridContainer).toBeInTheDocument();
  });

  // This test verifies that the component passes showStatus prop to NFT cards
  it('passes showStatus prop to NFT cards', () => {
    const mockNfts: NFT[] = [
      {
        did: 'did:example:123',
        name: 'Test App',
        version: '1.0',
        dataUrl: 'https://example.com/data1',
        iwpsPortalUri: 'https://example.com/portal1',
        agentApiUri: 'https://example.com/api1',
        status: 0,
        minter: '0x123',
      },
    ];

    render(
      <NFTGrid
        nfts={mockNfts}
        onNFTCardClick={mockOnNFTCardClick}
        onOpenMintModal={mockOnOpenMintModal}
        isLoading={false}
        showStatus={false}
      />
    );

    const nftCard = screen.getByTestId('nft-card-did:example:123-1.0');
    expect(nftCard).toHaveAttribute('data-show-status', 'false');
  });

  // This test checks that the component shows status by default
  it('shows status by default', () => {
    const mockNfts: NFT[] = [
      {
        did: 'did:example:123',
        name: 'Test App',
        version: '1.0',
        dataUrl: 'https://example.com/data1',
        iwpsPortalUri: 'https://example.com/portal1',
        agentApiUri: 'https://example.com/api1',
        status: 0,
        minter: '0x123',
      },
    ];

    render(
      <NFTGrid
        nfts={mockNfts}
        onNFTCardClick={mockOnNFTCardClick}
        onOpenMintModal={mockOnOpenMintModal}
        isLoading={false}
      />
    );

    const nftCard = screen.getByTestId('nft-card-did:example:123-1.0');
    expect(nftCard).toHaveAttribute('data-show-status', 'true');
  });

  // This test verifies that the component handles large numbers of NFTs
  it('handles large numbers of NFTs efficiently', () => {
    const mockNfts: NFT[] = Array.from({ length: 100 }, (_, index) => ({
      did: `did:example:${index}`,
      name: `Test App ${index}`,
      version: '1.0',
      dataUrl: `https://example.com/data${index}`,
      iwpsPortalUri: `https://example.com/portal${index}`,
      agentApiUri: `https://example.com/api${index}`,
      status: index % 3,
      minter: `0x${index.toString().padStart(40, '0')}`,
    }));

    render(
      <NFTGrid
        nfts={mockNfts}
        onNFTCardClick={mockOnNFTCardClick}
        onOpenMintModal={mockOnOpenMintModal}
        isLoading={false}
      />
    );

    // Should render all 100 NFTs
    expect(screen.getByTestId('nft-card-did:example:0-1.0')).toBeInTheDocument();
    expect(screen.getByTestId('nft-card-did:example:99-1.0')).toBeInTheDocument();
    expect(screen.getByText('Test App 0 - 1.0')).toBeInTheDocument();
    expect(screen.getByText('Test App 99 - 1.0')).toBeInTheDocument();
  });

  // This test checks that the component handles NFTs with different versions
  it('handles NFTs with different versions correctly', () => {
    const mockNfts: NFT[] = [
      {
        did: 'did:example:123',
        name: 'Test App',
        version: '1.0',
        dataUrl: 'https://example.com/data1',
        iwpsPortalUri: 'https://example.com/portal1',
        agentApiUri: 'https://example.com/api1',
        status: 0,
        minter: '0x123',
      },
      {
        did: 'did:example:123',
        name: 'Test App',
        version: '2.0',
        dataUrl: 'https://example.com/data2',
        iwpsPortalUri: 'https://example.com/portal2',
        agentApiUri: 'https://example.com/api2',
        status: 1,
        minter: '0x456',
      },
    ];

    render(
      <NFTGrid
        nfts={mockNfts}
        onNFTCardClick={mockOnNFTCardClick}
        onOpenMintModal={mockOnOpenMintModal}
        isLoading={false}
      />
    );

    // Should show both versions as they have different version numbers
    expect(screen.getByTestId('nft-card-did:example:123-1.0')).toBeInTheDocument();
    expect(screen.getByTestId('nft-card-did:example:123-2.0')).toBeInTheDocument();
  });
}); 