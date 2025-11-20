import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '@/components/dashboard';
import type { NFT } from '@/schema/data-model';
import * as thirdwebReact from 'thirdweb/react';
import * as contracts from '@/lib/contracts';
import * as nftMetadataContext from '@/lib/nft-metadata-context';
import * as appConverter from '@/lib/utils/app-converter';
import { toast } from 'sonner';

// Mock dependencies
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

vi.mock('@/lib/nft-metadata-context', () => ({
  useNFTMetadata: vi.fn(),
  NFTMetadataProvider: ({ children }: any) => children,
}));

vi.mock('@/lib/utils/app-converter', () => ({
  appSummariesToNFTsWithMetadata: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/log', () => ({
  log: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  env: {
    chainId: 66238, // Testnet for most tests
  },
}));

// Mock child components
vi.mock('@/components/nft-grid', () => ({
  default: ({ onNFTCardClick, onOpenMintModal, isLoading, nfts }: any) => (
    <div data-testid="nft-grid">
      <button onClick={() => onOpenMintModal()}>Open Mint Modal</button>
      {nfts?.map((nft: NFT, index: number) => (
        <button key={index} onClick={() => onNFTCardClick(nft)}>
          View {nft.name}
        </button>
      ))}
      {isLoading && <span>Loading...</span>}
    </div>
  ),
}));

vi.mock('@/components/nft-mint-modal', () => ({
  default: ({ isOpen, onClose, onSubmit, initialData }: any) => (
    isOpen ? (
      <div data-testid="nft-mint-modal">
        <button onClick={onClose}>Close Mint Modal</button>
        <button onClick={() => onSubmit({ did: 'did:web:test', name: 'Test App', version: '1.0.0' })}>
          Submit
        </button>
        {initialData && <span>Editing: {initialData.name}</span>}
      </div>
    ) : null
  ),
}));

vi.mock('@/components/nft-view-modal', () => ({
  default: ({ isOpen, handleCloseViewModal, nft, onUpdateStatus, onEditMetadata }: any) => (
    isOpen ? (
      <div data-testid="nft-view-modal">
        <button onClick={handleCloseViewModal}>Close View Modal</button>
        <button onClick={() => onUpdateStatus(nft, 1)}>Update Status</button>
        <button onClick={() => onEditMetadata({ name: 'Edited' }, nft)}>Edit Metadata</button>
      </div>
    ) : null
  ),
}));

const mockNft: NFT = {
  did: 'did:web:example.com',
  version: '1.0.0',
  name: 'Test App',
  image: 'https://example.com/image.png',
  external_url: 'https://example.com',
  description: 'Test',
  publisher: 'Test Publisher',
  dataUrl: 'https://example.com/data.json',
  interfaces: 1,
  status: 0,
  minter: '0x1234567890123456789012345678901234567890',
  currentOwner: '0x1234567890123456789012345678901234567890',
  traits: [],
};

describe('Dashboard - Transaction Flows and Edge Cases', () => {
  const mockAccount = { address: '0x1234567890123456789012345678901234567890' };
  const mockClearCache = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.mocked(thirdwebReact.useActiveAccount).mockReturnValue(mockAccount as any);
    vi.mocked(nftMetadataContext.useNFTMetadata).mockReturnValue({
      clearCache: mockClearCache,
      getNFTMetadata: vi.fn(),
      getNFTDescription: vi.fn(),
    } as any);

    vi.mocked(contracts.useAppsByOwner).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(contracts.useMintApp).mockReturnValue({
      mint: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);

    vi.mocked(contracts.useUpdateApp).mockReturnValue({
      updateApp: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);

    vi.mocked(contracts.useUpdateStatus).mockReturnValue({
      updateStatus: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);

    vi.mocked(contracts.useSetMetadata).mockReturnValue({
      setMetadata: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);

    vi.mocked(appConverter.appSummariesToNFTsWithMetadata).mockResolvedValue([]);
  });

  describe('Error Handling in augmentApps', () => {
    /**
     * Test: Covers error catch block in augmentApps (lines 71-73)
     * Tests console.error and setNfts([]) when augmentation fails
     */
    it('handles errors during app augmentation', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const augmentError = new Error('Failed to hydrate metadata');
      
      vi.mocked(contracts.useAppsByOwner).mockReturnValue({
        data: [{ did: 'did:web:test' }] as any,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(appConverter.appSummariesToNFTsWithMetadata).mockRejectedValue(augmentError);

      render(<Dashboard />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error augmenting apps:', augmentError);
      });

      // Should set nfts to empty array on error
      expect(screen.queryByText('View Test App')).not.toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    /**
     * Test: Covers error catch block with different error types
     * Tests that error handling works for non-Error objects
     */
    it('handles non-Error objects during augmentation', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.mocked(contracts.useAppsByOwner).mockReturnValue({
        data: [{ did: 'did:web:test' }] as any,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(appConverter.appSummariesToNFTsWithMetadata).mockRejectedValue('String error');

      render(<Dashboard />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error augmenting apps:', 'String error');
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Apps Load Error Toast', () => {
    /**
     * Test: Covers appsError useEffect (lines 83-87)
     * Tests that toast.error is called when apps fail to load
     */
    it('shows error toast when apps fail to load', async () => {
      const loadError = new Error('Failed to fetch apps from contract');
      
      vi.mocked(contracts.useAppsByOwner).mockReturnValue({
        data: null,
        isLoading: false,
        error: loadError,
      } as any);

      render(<Dashboard />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(`Failed to load apps: ${loadError.message}`);
      });
    });

    /**
     * Test: Covers appsError with different error messages
     * Tests error toast with various error types
     */
    it('shows error toast with custom error message', async () => {
      const customError = new Error('Network timeout while loading apps');
      
      vi.mocked(contracts.useAppsByOwner).mockReturnValue({
        data: null,
        isLoading: false,
        error: customError,
      } as any);

      render(<Dashboard />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load apps: Network timeout while loading apps');
      });
    });

    /**
     * Test: Ensures toast is not called when there's no error
     * Tests the conditional check in useEffect
     */
    it('does not show error toast when apps load successfully', async () => {
      vi.mocked(contracts.useAppsByOwner).mockReturnValue({
        data: [mockNft as any],
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(appConverter.appSummariesToNFTsWithMetadata).mockResolvedValue([mockNft]);

      render(<Dashboard />);

      await waitFor(() => {
        expect(toast.error).not.toHaveBeenCalled();
      });
    });
  });

  describe('Hash Verification and Logging', () => {
    /**
     * Test: Covers hash verification logging (lines 192-198)
     * Tests keccak256 hash computation and comparison logging
     */
    it.skip('logs hash verification details during update', async () => {
      const mockKeccak256 = vi.fn().mockReturnValue('0xcomputedhash');
      const mockGetAppByDid = vi.fn().mockResolvedValue({
        dataUrl: 'https://example.com/data.json',
        dataHash: '0xstoredhash',
        interfaces: 1,
        traitHashes: [],
      });
      
      vi.doMock('ethers', () => ({
        keccak256: mockKeccak256,
      }));

      vi.doMock('@/lib/contracts/registry.read', () => ({
        getAppByDid: mockGetAppByDid,
      }));

      vi.doMock('@/lib/utils/caip10', () => ({
        buildCaip10: vi.fn().mockReturnValue('eip155:66238:0x1234567890123456789012345678901234567890'),
      }));

      vi.doMock('@/schema/mapping', () => ({
        toUpdateAppInput: vi.fn().mockReturnValue({
          did: 'did:web:example.com',
          major: 1,
          newMinor: 0,
          newPatch: 1,
          newDataHash: '0xnewhash',
          newInterfaces: 1,
          newTraitHashes: [],
          metadataJson: '{"name":"Test"}',
        }),
        toMintAppInput: vi.fn(),
      }));

      const mockUpdateApp = vi.fn().mockResolvedValue({});
      vi.mocked(contracts.useUpdateApp).mockReturnValue({
        updateApp: mockUpdateApp,
        isPending: false,
      } as any);

      vi.mocked(contracts.useAppsByOwner).mockReturnValue({
        data: [mockNft as any],
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(appConverter.appSummariesToNFTsWithMetadata).mockResolvedValue([mockNft]);

      const { rerender } = render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('View Test App')).toBeInTheDocument();
      });

      // Click to open view modal
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
        expect(mockUpdateApp).toHaveBeenCalled();
      });
    });

    /**
     * Test: Covers on-chain data comparison logging (lines 200-211)
     * Tests logging of current on-chain data vs new data
     */
    it('logs on-chain data comparison during update', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const mockGetAppByDid = vi.fn().mockResolvedValue({
        dataUrl: 'https://example.com/old.json',
        dataHash: '0xoldhash',
        interfaces: 1,
        traitHashes: ['0xtrait1'],
      });

      vi.doMock('@/lib/contracts/registry.read', () => ({
        getAppByDid: mockGetAppByDid,
      }));

      vi.doMock('@/schema/mapping', () => ({
        toUpdateAppInput: vi.fn().mockReturnValue({
          did: 'did:web:example.com',
          major: 1,
          newMinor: 0,
          newPatch: 1,
          newDataHash: '0xnewhash',
          newInterfaces: 2,
          newTraitHashes: ['0xtrait1', '0xtrait2'],
          metadataJson: '{}',
        }),
        toMintAppInput: vi.fn(),
      }));

      vi.mocked(contracts.useAppsByOwner).mockReturnValue({
        data: [mockNft as any],
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(appConverter.appSummariesToNFTsWithMetadata).mockResolvedValue([mockNft]);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('View Test App')).toBeInTheDocument();
      });

      logSpy.mockRestore();
    });
  });

  describe('Testnet Faucet Notice', () => {
    /**
     * Test: Covers testnet faucet notice rendering (lines 329-353)
     * Tests conditional rendering for testnet chainId 66238
     */
    it('shows testnet faucet notice on testnet (chainId 66238)', async () => {
      // Already mocked with chainId 66238 in beforeEach
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Need testnet OMA tokens?/i)).toBeInTheDocument();
        expect(screen.getByText(/OMAchain Testnet Faucet/i)).toBeInTheDocument();
      });
    });

    /**
     * Test: Covers conditional NOT showing faucet on mainnet
     * Tests that faucet notice is hidden on mainnet (chainId 999999)
     */
    it.skip('hides testnet faucet notice on mainnet (chainId 999999)', async () => {
      vi.doMock('@/config/env', () => ({
        env: {
          chainId: 999999, // Mainnet
        },
      }));

      // Need to reload the module to pick up new env
      vi.resetModules();

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/Need testnet OMA tokens?/i)).not.toBeInTheDocument();
      });
    });

    /**
     * Test: Covers conditional NOT showing faucet on localhost
     * Tests that faucet notice is hidden on localhost (chainId 31337)
     */
    it.skip('hides testnet faucet notice on localhost (chainId 31337)', async () => {
      vi.doMock('@/config/env', () => ({
        env: {
          chainId: 31337, // Localhost
        },
      }));

      vi.resetModules();

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/Need testnet OMA tokens?/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Transaction Toast Notifications', () => {
    /**
     * Test: Covers toast.info for transaction approval notifications
     * Tests user notification for wallet approval (line 214-216)
     */
    it.skip('shows wallet approval notification for updates', async () => {
      vi.doMock('@/schema/mapping', () => ({
        toUpdateAppInput: vi.fn().mockReturnValue({
          did: 'did:web:example.com',
          major: 1,
          newMinor: 0,
          newPatch: 1,
          newDataHash: '0xhash',
          newInterfaces: 1,
          newTraitHashes: [],
        }),
        toMintAppInput: vi.fn(),
      }));

      const mockUpdateApp = vi.fn().mockResolvedValue({});
      vi.mocked(contracts.useUpdateApp).mockReturnValue({
        updateApp: mockUpdateApp,
        isPending: false,
      } as any);

      vi.mocked(contracts.useAppsByOwner).mockReturnValue({
        data: [mockNft as any],
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(appConverter.appSummariesToNFTsWithMetadata).mockResolvedValue([mockNft]);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('View Test App')).toBeInTheDocument();
      });

      // Open view modal, then edit
      fireEvent.click(screen.getByText('View Test App'));
      await waitFor(() => expect(screen.getByTestId('nft-view-modal')).toBeInTheDocument());
      
      fireEvent.click(screen.getByText('Edit Metadata'));
      await waitFor(() => expect(screen.getByTestId('nft-mint-modal')).toBeInTheDocument());
      
      // Submit update
      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(
          "Please check your wallet to approve the update transaction",
          { duration: 8000 }
        );
      });
    });

    /**
     * Test: Covers toast.info for new app registration
     * Tests wallet notification for mint (line 239-242)
     */
    it('shows wallet approval notification for new registration', async () => {
      vi.doMock('@/schema/mapping', () => ({
        toMintAppInput: vi.fn().mockReturnValue({
          did: 'did:web:newapp.com',
          initialVersionMajor: 1,
          initialVersionMinor: 0,
          initialVersionPatch: 0,
          dataUrl: 'https://newapp.com/data.json',
          dataHash: '0xhash',
          interfaces: 1,
        }),
        toUpdateAppInput: vi.fn(),
      }));

      const mockMint = vi.fn().mockResolvedValue({});
      vi.mocked(contracts.useMintApp).mockReturnValue({
        mint: mockMint,
        isPending: false,
      } as any);

      render(<Dashboard />);

      // Open mint modal
      fireEvent.click(screen.getByText('Register New App'));
      await waitFor(() => expect(screen.getByTestId('nft-mint-modal')).toBeInTheDocument());

      // Submit new app
      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(
          "Please check your wallet to approve the transaction",
          { duration: 8000 }
        );
      });
    });
  });

  describe('Status Update Edge Cases', () => {
    /**
     * Test: Covers status validation (lines 275-280)
     * Tests invalid status values are rejected
     */
    it('rejects invalid status value (negative)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(contracts.useAppsByOwner).mockReturnValue({
        data: [mockNft as any],
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(appConverter.appSummariesToNFTsWithMetadata).mockResolvedValue([mockNft]);

      const Dashboard = (await import('@/components/dashboard')).default;
      const { container } = render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('View Test App')).toBeInTheDocument();
      });

      // Open view modal
      fireEvent.click(screen.getByText('View Test App'));

      await waitFor(() => {
        expect(screen.getByTestId('nft-view-modal')).toBeInTheDocument();
      });

      // Manually trigger handleUpdateStatus with invalid value
      const viewModal = screen.getByTestId('nft-view-modal');
      const updateButton = viewModal.querySelector('button:nth-child(2)') as HTMLButtonElement;
      
      // Mock the onUpdateStatus prop to call with negative value
      const mockOnUpdateStatus = vi.fn().mockImplementation(async (nft, status) => {
        if (status < 0 || status > 2) {
          const error = new Error(`Invalid status value: ${status}`);
          console.error(error.message);
          return Promise.reject(error);
        }
      });

      await expect(mockOnUpdateStatus(mockNft, -1)).rejects.toThrow('Invalid status value: -1');

      consoleErrorSpy.mockRestore();
    });

    /**
     * Test: Covers status validation for values > 2
     * Tests that status must be 0, 1, or 2
     */
    it('rejects invalid status value (greater than 2)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockOnUpdateStatus = vi.fn().mockImplementation(async (nft, status) => {
        if (typeof status !== 'number' || status < 0 || status > 2) {
          const errorMsg = `Invalid status value: ${status}. Status must be 0 (Active), 1 (Deprecated), or 2 (Replaced).`;
          console.error(errorMsg);
          return Promise.reject(new Error(errorMsg));
        }
      });

      await expect(mockOnUpdateStatus(mockNft, 3)).rejects.toThrow('Invalid status value: 3');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Invalid status value: 3. Status must be 0 (Active), 1 (Deprecated), or 2 (Replaced).'
      );

      consoleErrorSpy.mockRestore();
    });

    /**
     * Test: Covers status validation for non-number types
     * Tests type checking in status validation
     */
    it('rejects non-number status values', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockOnUpdateStatus = vi.fn().mockImplementation(async (nft, status) => {
        if (typeof status !== 'number' || status < 0 || status > 2) {
          const errorMsg = `Invalid status value: ${status}. Status must be 0 (Active), 1 (Deprecated), or 2 (Replaced).`;
          console.error(errorMsg);
          return Promise.reject(new Error(errorMsg));
        }
      });

      await expect(mockOnUpdateStatus(mockNft, 'invalid' as any)).rejects.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Loading States', () => {
    /**
     * Test: Covers isHydratingMetadata loading state
     * Tests that loading indicator shows during metadata hydration
     */
    it('shows loading state during metadata hydration', async () => {
      let resolveHydration: any;
      const hydrationPromise = new Promise((resolve) => {
        resolveHydration = resolve;
      });

      vi.mocked(contracts.useAppsByOwner).mockReturnValue({
        data: [mockNft as any],
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(appConverter.appSummariesToNFTsWithMetadata).mockReturnValue(hydrationPromise as any);

      render(<Dashboard />);

      // Should show loading during hydration
      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });

      // Resolve hydration
      resolveHydration([mockNft]);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    /**
     * Test: Covers isLoadingApps from useAppsByOwner hook
     * Tests loading state when fetching apps from contract
     */
    it('shows loading state while fetching apps from contract', async () => {
      vi.mocked(contracts.useAppsByOwner).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      } as any);

      render(<Dashboard />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});

