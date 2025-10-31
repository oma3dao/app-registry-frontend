import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import Dashboard from '@/components/dashboard';
import { useAppsByOwner, useMintApp, useUpdateApp, useUpdateStatus, useSetMetadata } from '@/lib/contracts';
import { useActiveAccount } from 'thirdweb/react';
import { toast } from 'sonner';
import { appSummariesToNFTs } from '@/lib/utils/app-converter';
import { hashTraits } from '@/lib/utils/traits';
import { canonicalizeForHash } from '@/lib/utils/dataurl';
import { buildOffchainMetadataObject } from '@/lib/utils/offchain-json';
import { env } from '@/config/env';
import type { NFT } from '@/types/nft';
import type { AppSummary } from '@/lib/contracts/types';

// Mock the hooks
vi.mock('@/lib/contracts', () => ({
  useAppsByOwner: vi.fn(),
  useMintApp: vi.fn(),
  useUpdateStatus: vi.fn(),
  useUpdateApp: vi.fn(),
  useSetMetadata: vi.fn(),
}));

vi.mock('thirdweb/react', () => ({
  useActiveAccount: vi.fn(),
  ConnectButton: () => React.createElement('button', { 'data-testid': 'connect-button' }, 'Mock Connect'),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/utils/app-converter', () => ({
  appSummariesToNFTs: vi.fn(),
  appSummariesToNFTsWithMetadata: vi.fn().mockResolvedValue([{
    did: 'did:oma3:123',
    name: 'Test App',
    version: '1.0.0',
    status: 0,
    metadata: { name: 'Test App', description: 'A test application' },
    iwpsPortalUrl: 'https://example.com',
    traits: [],
    dataUrl: 'https://example.com/metadata.json',
    contractId: '',
    fungibleTokenId: '',
    minter: '0x1234567890123456789012345678901234567890',
  }]),
  toMintAppInput: vi.fn((nft) => ({
    did: nft.did,
    interfaces: 0,
    dataUrl: nft.dataUrl || '',
    dataHash: '0x' + '0'.repeat(64),
    dataHashAlgorithm: 0,
    fungibleTokenId: nft.fungibleTokenId || '',
    contractId: nft.contractId || '',
    initialVersionMajor: 1,
    initialVersionMinor: 0,
    initialVersionPatch: 0,
    traitHashes: [],
    metadataJson: '',
  })),
  toUpdateAppInput: vi.fn((nft) => ({
    did: nft.did,
    major: 1,
    newDataUrl: nft.dataUrl || '',
    newDataHash: '0x' + '0'.repeat(64),
    newDataHashAlgorithm: 0,
    newInterfaces: 0,
    newTraitHashes: [],
    newMinor: 0,
    newPatch: 0,
    metadataJson: '',
  })),
}));

vi.mock('@/lib/utils/traits', () => ({
  hashTraits: vi.fn((traits) => traits ? traits.map(() => '0x' + '0'.repeat(64)) : []),
}));

vi.mock('@/lib/utils/dataurl', () => ({
  canonicalizeForHash: vi.fn(() => ({
    hash: '0x' + '0'.repeat(64),
    jcsJson: '{}',
  })),
}));

vi.mock('@/lib/utils/offchain-json', () => ({
  buildOffchainMetadataObject: vi.fn((nft) => ({
    name: nft.name,
    description: nft.description || '',
    external_url: nft.external_url || '',
  })),
}));

vi.mock('@/schema/mapping', async (importOriginal) => {
  const { hashTraits } = await import('@/lib/utils/traits');
  return {
    toMintAppInput: vi.fn((nft) => {
      const versionParts = (nft.version || '1.0.0').split('.').map(Number);
      const [major = 1, minor = 0, patch = 0] = versionParts;
      
      // Call hashTraits if traits exist (to match real implementation)
      const traitHashes = nft.traits ? hashTraits(nft.traits) : [];
      
      return {
        did: nft.did,
        interfaces: 0,
        dataUrl: nft.dataUrl || '',
        dataHash: '0x' + '0'.repeat(64),
        dataHashAlgorithm: 0,
        fungibleTokenId: nft.fungibleTokenId || '',
        contractId: nft.contractId || '',
        initialVersionMajor: major,
        initialVersionMinor: minor,
        initialVersionPatch: patch,
        traitHashes,
        metadataJson: '',
      };
    }),
    toUpdateAppInput: vi.fn((nft, currentVersion) => {
      const versionParts = (nft.version || '1.0.0').split('.').map(Number);
      const [major = 1, minor = 0, patch = 0] = versionParts;
      return {
        did: nft.did,
        major: 1,
        newDataUrl: nft.dataUrl || '',
        newDataHash: '0x' + '0'.repeat(64),
        newDataHashAlgorithm: 0,
        newInterfaces: 0,
        newTraitHashes: [],
        newMinor: minor,
        newPatch: patch,
        metadataJson: '',
      };
    }),
    isOurHostedUrl: vi.fn(() => false),
  };
});

vi.mock('@/lib/utils/caip10', () => ({
  buildCaip10: vi.fn((namespace, chainId, address) => `${namespace}:${chainId}:${address}`),
}));

vi.mock('@/config/env', () => ({
  env: {
    chainId: 66238,
  },
}));

// Mock the NFT components
vi.mock('@/components/nft-grid', () => ({
  default: ({ nfts, onNFTCardClick, onOpenMintModal, isLoading, showStatus }: any) => (
    <div data-testid="nft-grid">
      {isLoading && <div>Loading NFTs...</div>}
      {nfts.map((nft: NFT, index: number) => (
        <div
          key={nft.did || index}
          data-testid={`nft-card-${index}`}
          onClick={() => onNFTCardClick(nft)}
        >
          {nft.name} - {nft.did}
        </div>
      ))}
      <button data-testid="open-mint-modal" onClick={onOpenMintModal}>
        Open Mint Modal
      </button>
    </div>
  ),
}));

// Global variable to store test-specific NFT data
let testNftData: any = null;

vi.mock('@/components/nft-mint-modal', () => ({
  default: ({ isOpen, onClose, onSubmit, initialData }: any) => (
    isOpen ? (
      <div data-testid="nft-mint-modal">
        <div>Mint Modal</div>
        <button data-testid="close-mint-modal" onClick={onClose}>
          Close
        </button>
        <button
          data-testid="submit-mint-modal"
          onClick={async () => {
            // Use test-specific data if set, otherwise use initialData or default
            const nftData = testNftData || initialData || { name: 'Test App', did: 'did:oma3:123', version: '1.0.0' };
            try {
              await onSubmit(nftData);
            } catch (error) {
              // Catch any promise rejections to prevent unhandled rejections
              console.log('Modal caught error:', error);
            }
          }}
        >
          Submit
        </button>
      </div>
    ) : null
  ),
}));

vi.mock('@/components/nft-view-modal', () => ({
  default: ({ isOpen, handleCloseViewModal, nft, onUpdateStatus, onEditMetadata }: any) => (
    isOpen ? (
      <div data-testid="nft-view-modal">
        <div>View Modal - {nft?.name}</div>
        <button data-testid="close-view-modal" onClick={handleCloseViewModal}>
          Close
        </button>
        <button
          data-testid="update-status"
          onClick={async () => {
            try {
              await onUpdateStatus(nft, 1);
            } catch (error) {
              // Catch any promise rejections to prevent unhandled rejections
              console.log('Modal caught update status error:', error);
            }
          }}
        >
          Update Status
        </button>
        <button
          data-testid="edit-metadata"
          onClick={() => onEditMetadata(nft?.metadata, nft)}
        >
          Edit Metadata
        </button>
      </div>
    ) : null
  ),
}));

describe('Dashboard component - Extended tests', () => {
  const mockUseAppsByOwner = vi.mocked(useAppsByOwner);
  const mockUseMintApp = vi.mocked(useMintApp);
  const mockUseUpdateApp = vi.mocked(useUpdateApp);
  const mockUseUpdateStatus = vi.mocked(useUpdateStatus);
  const mockUseSetMetadata = vi.mocked(useSetMetadata);
  const mockUseActiveAccount = vi.mocked(useActiveAccount);
  const mockToast = vi.mocked(toast);
  const mockAppSummariesToNFTs = vi.mocked(appSummariesToNFTs);
  const mockHashTraits = vi.mocked(hashTraits);
  const mockCanonicalizeForHash = vi.mocked(canonicalizeForHash);
  const mockBuildOffchainMetadataObject = vi.mocked(buildOffchainMetadataObject);

  const mockAccount = {
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  };

  const mockAppsData: AppSummary[] = [
    {
      did: 'did:oma3:123',
      owner: '0x1234567890123456789012345678901234567890',
      versionMajor: 1,
      versionMinor: 0,
      versionPatch: 0,
      status: 0,
      interfaces: 1,
      dataUrl: 'https://example.com/metadata.json',
      dataHash: '0x123',
      dataHashAlgorithm: 0,
      fungibleTokenId: '',
      contractId: '',
      traitHashes: [],
    },
  ];

  const mockNFTs: NFT[] = [
    {
      did: 'did:oma3:123',
      name: 'Test App',
      version: '1.0.0',
      status: 0,
      metadata: {
        name: 'Test App',
        description: 'A test application',
      },
      dataUrl: 'https://example.com/metadata.json',
      fungibleTokenId: '',
      contractId: '',
      traits: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset test NFT data
    testNftData = null;
    
    mockUseActiveAccount.mockReturnValue(mockAccount);
    mockUseAppsByOwner.mockReturnValue({
      data: mockAppsData,
      isLoading: false,
      error: null,
    });
    mockUseMintApp.mockReturnValue({
      mint: vi.fn().mockResolvedValue('0x123'),
      isPending: false,
      error: null,
      txHash: null,
    });
    mockUseUpdateApp.mockReturnValue({
      updateApp: vi.fn().mockResolvedValue('0x789'),
      isPending: false,
      error: null,
      txHash: null,
    });
    mockUseUpdateStatus.mockReturnValue({
      updateStatus: vi.fn().mockResolvedValue('0x456'),
      isPending: false,
      error: null,
      txHash: null,
    });
    mockUseSetMetadata.mockReturnValue({
      setMetadata: vi.fn().mockResolvedValue(true),
      isPending: false,
      error: null,
    });
    
    mockAppSummariesToNFTs.mockReturnValue(mockNFTs);
    mockHashTraits.mockReturnValue(['0xabc', '0xdef']);
    mockCanonicalizeForHash.mockReturnValue({
      jcsJson: '{"name":"Test App"}',
      hash: '0x1234567890abcdef' as `0x${string}`,
    });
    mockBuildOffchainMetadataObject.mockReturnValue({
      name: 'Test App',
      metadata: { name: 'Test App' },
      extra: { iwpsPortalUrl: 'https://example.com', traits: [] },
    });
  });

  it('should display testnet faucet notice when on testnet', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('Need testnet OMA tokens?')).toBeInTheDocument();
    expect(screen.getByText('OMAchain Testnet Faucet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /OMAchain Testnet Faucet/ })).toHaveAttribute(
      'href',
      'https://faucet.testnet.chain.oma3.org/'
    );
  });

  it('should not display testnet faucet notice when not on testnet', () => {
    // Mock different chain ID
    vi.mocked(env).chainId = 1;
    
    render(<Dashboard />);
    
    expect(screen.queryByText('Need testnet OMA tokens?')).not.toBeInTheDocument();
  });

  it('should show error toast when apps fail to load', async () => {
    const error = new Error('Failed to load apps');
    mockUseAppsByOwner.mockReturnValue({
      data: [],
      isLoading: false,
      error,
    });
    
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load apps: Failed to load apps');
    });
  });

  it('should handle empty apps data', async () => {
    mockUseAppsByOwner.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    
    render(<Dashboard />);
    
    // When apps data is empty, appSummariesToNFTs is not called
    // The component returns early and sets nfts to empty array
    await waitFor(() => {
      expect(mockAppSummariesToNFTs).not.toHaveBeenCalled();
    });
  });

  it('should handle apps data loading error', async () => {
    mockUseAppsByOwner.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    });
    
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load apps: Network error');
    });
  });

  it('should handle register app with custom URLs flag', async () => {
    const mockMint = vi.fn().mockResolvedValue('0x123');
    mockUseMintApp.mockReturnValue({
      mint: mockMint,
      isPending: false,
      error: null,
      txHash: null,
    });
    
    render(<Dashboard />);
    
    // Open mint modal
    const openMintButton = screen.getByTestId('open-mint-modal');
    await userEvent.click(openMintButton);
    
    // Submit with custom URLs flag
    const submitButton = screen.getByTestId('submit-mint-modal');
    await userEvent.click(submitButton);
    
    // The component should handle the isCustomUrls flag
    expect(mockMint).toHaveBeenCalled();
  });

  it('should handle register app with traits', async () => {
    const mockMint = vi.fn().mockResolvedValue('0x123');
    mockUseMintApp.mockReturnValue({
      mint: mockMint,
      isPending: false,
      error: null,
      txHash: null,
    });
    
    // Set test-specific NFT data with traits
    testNftData = { 
      name: 'Test App', 
      did: 'did:oma3:123', 
      version: '1.0.0',
      traits: [{ trait_type: 'Category', value: 'Game' }]
    };
    
    render(<Dashboard />);
    
    // Open mint modal
    const openMintButton = screen.getByTestId('open-mint-modal');
    await userEvent.click(openMintButton);
    
    // Submit
    const submitButton = screen.getByTestId('submit-mint-modal');
    await userEvent.click(submitButton);
    
    expect(mockHashTraits).toHaveBeenCalledWith([{ trait_type: 'Category', value: 'Game' }]);
  });

  it('should handle register app with different version formats', async () => {
    const mockMint = vi.fn().mockResolvedValue('0x123');
    mockUseMintApp.mockReturnValue({
      mint: mockMint,
      isPending: false,
      error: null,
      txHash: null,
    });
    
    // Set test-specific NFT data
    testNftData = { name: 'Test App', did: 'did:oma3:123', version: '2.1.3' };
    
    render(<Dashboard />);
    
    // Open mint modal
    const openMintButton = screen.getByTestId('open-mint-modal');
    await userEvent.click(openMintButton);
    
    // Submit
    const submitButton = screen.getByTestId('submit-mint-modal');
    await userEvent.click(submitButton);
    
    expect(mockMint).toHaveBeenCalledWith(
      expect.objectContaining({
        initialVersionMajor: 2,
        initialVersionMinor: 1,
        initialVersionPatch: 3,
      })
    );
  });

  it('should handle register app with missing version parts', async () => {
    const mockMint = vi.fn().mockResolvedValue('0x123');
    mockUseMintApp.mockReturnValue({
      mint: mockMint,
      isPending: false,
      error: null,
      txHash: null,
    });
    
    // Set test-specific NFT data
    testNftData = { name: 'Test App', did: 'did:oma3:123', version: '2' };
    
    render(<Dashboard />);
    
    // Open mint modal
    const openMintButton = screen.getByTestId('open-mint-modal');
    await userEvent.click(openMintButton);
    
    // Submit
    const submitButton = screen.getByTestId('submit-mint-modal');
    await userEvent.click(submitButton);
    
    expect(mockMint).toHaveBeenCalledWith(
      expect.objectContaining({
        initialVersionMajor: 2,
        initialVersionMinor: 0,
        initialVersionPatch: 0,
      })
    );
  });

  it('should handle register app error', async () => {
    const error = new Error('Transaction failed');
    const mockMint = vi.fn().mockRejectedValue(error);
    mockUseMintApp.mockReturnValue({
      mint: mockMint,
      isPending: false,
      error: null,
      txHash: null,
    });
    
    render(<Dashboard />);
    
    // Open mint modal
    const openMintButton = screen.getByTestId('open-mint-modal');
    await userEvent.click(openMintButton);
    
    // Submit (the mocked modal now catches the promise rejection)
    const submitButton = screen.getByTestId('submit-mint-modal');
    await userEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to register app: Transaction failed');
    });
  });

  it('should handle register app with no wallet connected', async () => {
    mockUseActiveAccount.mockReturnValue(null);
    const mockMint = vi.fn().mockRejectedValue(new Error('No wallet connected'));
    mockUseMintApp.mockReturnValue({
      mint: mockMint,
      isPending: false,
      error: null,
      txHash: null,
    });
    
    render(<Dashboard />);
    
    // Open mint modal
    const openMintButton = screen.getByTestId('open-mint-modal');
    await userEvent.click(openMintButton);
    
    // Submit (the mocked modal now catches the promise rejection)
    const submitButton = screen.getByTestId('submit-mint-modal');
    await userEvent.click(submitButton);
    
    // Wait a bit for the promise to settle
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // The component rejects the promise when no wallet is connected
    // The mint modal handles the error internally, no toast is shown
    await waitFor(() => {
      expect(mockToast.error).not.toHaveBeenCalled();
    });
  });

  it('should handle update status with invalid status', async () => {
    const mockUpdateStatus = vi.fn().mockRejectedValue(new Error('Invalid status'));
    mockUseUpdateStatus.mockReturnValue({
      updateStatus: mockUpdateStatus,
      isPending: false,
      error: null,
      txHash: null,
    });
    
    render(<Dashboard />);
    
    // Click on NFT card to open view modal (wait for it to appear after async load)
    const nftCard = await screen.findByTestId('nft-card-0');
    await userEvent.click(nftCard);
    
    // Click update status button (the mocked modal now catches the promise rejection)
    const updateStatusButton = screen.getByTestId('update-status');
    await userEvent.click(updateStatusButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to update status');
    });
  });

  it('should handle update status with no account connected', async () => {
    mockUseActiveAccount.mockReturnValue(null);
    const mockUpdateStatus = vi.fn().mockRejectedValue(new Error('No account connected'));
    mockUseUpdateStatus.mockReturnValue({
      updateStatus: mockUpdateStatus,
      isPending: false,
      error: null,
      txHash: null,
    });
    
    render(<Dashboard />);
    
    // Click on NFT card to open view modal (wait for it to appear after async load)
    const nftCard = await screen.findByTestId('nft-card-0');
    await userEvent.click(nftCard);
    
    // Click update status button (the mocked modal now catches the promise rejection)
    const updateStatusButton = screen.getByTestId('update-status');
    await userEvent.click(updateStatusButton);
    
    // Wait a bit for the promise to settle
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // The component rejects the promise when no account is connected
    // The view modal handles the error internally, no toast is shown
    await waitFor(() => {
      expect(mockToast.error).not.toHaveBeenCalled();
    });
  });

  it('should handle successful status update', async () => {
    const mockUpdateStatus = vi.fn().mockResolvedValue('0x456');
    mockUseUpdateStatus.mockReturnValue({
      updateStatus: mockUpdateStatus,
      isPending: false,
      error: null,
      txHash: null,
    });
    
    render(<Dashboard />);
    
    // Click on NFT card to open view modal (wait for it to appear after async load)
    const nftCard = await screen.findByTestId('nft-card-0');
    await userEvent.click(nftCard);
    
    // Click update status button
    const updateStatusButton = screen.getByTestId('update-status');
    await userEvent.click(updateStatusButton);
    
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Status updated successfully!');
    });
  });

  it('should handle edit metadata flow', async () => {
    render(<Dashboard />);
    
    // Click on NFT card to open view modal (wait for it to appear after async load)
    const nftCard = await screen.findByTestId('nft-card-0');
    await userEvent.click(nftCard);
    
    // Click edit metadata button
    const editMetadataButton = screen.getByTestId('edit-metadata');
    await userEvent.click(editMetadataButton);
    
    // Should close view modal and open mint modal
    expect(screen.queryByTestId('nft-view-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('nft-mint-modal')).toBeInTheDocument();
  });

  it('should handle close view modal', async () => {
    render(<Dashboard />);
    
    // Click on NFT card to open view modal (wait for it to appear after async load)
    const nftCard = await screen.findByTestId('nft-card-0');
    await userEvent.click(nftCard);
    
    // Click close button
    const closeButton = screen.getByTestId('close-view-modal');
    await userEvent.click(closeButton);
    
    expect(screen.queryByTestId('nft-view-modal')).not.toBeInTheDocument();
  });

  it('should handle close mint modal', async () => {
    render(<Dashboard />);
    
    // Open mint modal
    const openMintButton = screen.getByTestId('open-mint-modal');
    await userEvent.click(openMintButton);
    
    // Click close button
    const closeButton = screen.getByTestId('close-mint-modal');
    await userEvent.click(closeButton);
    
    expect(screen.queryByTestId('nft-mint-modal')).not.toBeInTheDocument();
  });

  it('should handle apps data conversion error', async () => {
    const error = new Error('Conversion failed');
    mockAppSummariesToNFTs.mockImplementation(() => {
      throw error;
    });
    
    render(<Dashboard />);
    
    // The component handles conversion errors by logging them and setting nfts to empty array
    // No toast is shown for conversion errors
    await waitFor(() => {
      expect(mockToast.error).not.toHaveBeenCalled();
    });
  });

  it('should handle missing dataUrl in NFT', async () => {
    const mockMint = vi.fn().mockResolvedValue('0x123');
    mockUseMintApp.mockReturnValue({
      mint: mockMint,
      isPending: false,
      error: null,
      txHash: null,
    });
    
    const nftWithoutDataUrl: NFT = {
      ...mockNFTs[0],
      dataUrl: '',
    };
    
    mockAppSummariesToNFTs.mockReturnValue([nftWithoutDataUrl]);
    
    render(<Dashboard />);
    
    // Open mint modal
    const openMintButton = screen.getByTestId('open-mint-modal');
    await userEvent.click(openMintButton);
    
    // Submit
    const submitButton = screen.getByTestId('submit-mint-modal');
    await userEvent.click(submitButton);
    
    expect(mockMint).toHaveBeenCalledWith(
      expect.objectContaining({
        dataUrl: '',
      })
    );
  });

  it('should handle missing fungibleTokenId and contractId in NFT', async () => {
    const mockMint = vi.fn().mockResolvedValue('0x123');
    mockUseMintApp.mockReturnValue({
      mint: mockMint,
      isPending: false,
      error: null,
      txHash: null,
    });
    
    const nftWithoutIds: NFT = {
      ...mockNFTs[0],
      fungibleTokenId: '',
      contractId: '',
    };
    
    mockAppSummariesToNFTs.mockReturnValue([nftWithoutIds]);
    
    render(<Dashboard />);
    
    // Open mint modal
    const openMintButton = screen.getByTestId('open-mint-modal');
    await userEvent.click(openMintButton);
    
    // Submit
    const submitButton = screen.getByTestId('submit-mint-modal');
    await userEvent.click(submitButton);
    
    expect(mockMint).toHaveBeenCalledWith(
      expect.objectContaining({
        fungibleTokenId: '',
        contractId: '',
      })
    );
  });
});

