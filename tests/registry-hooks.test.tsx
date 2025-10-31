import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the registry read functions before importing
vi.mock('@/lib/contracts/registry.read', () => ({
  getAppByDid: vi.fn(() => Promise.resolve(null)),
  getAppsByOwner: vi.fn(() => Promise.resolve([])),
  listApps: vi.fn(() => Promise.resolve({ items: [] })),
  getTotalApps: vi.fn(() => Promise.resolve(0)),
  searchByDid: vi.fn(() => Promise.resolve([])),
}));

import { 
  useApp, 
  useAppsByOwner, 
  useAppsList,
  useTotalApps,
  useMintApp,
  useUpdateStatus,
  useUpdateApp,
  useSearchByDid,
} from '@/lib/contracts/registry.hooks';
import {
  getAppByDid,
  getAppsByOwner,
  listApps,
  getTotalApps,
  searchByDid,
} from '@/lib/contracts/registry.read';
import { prepareMintApp, prepareUpdateStatus, prepareUpdateApp } from '@/lib/contracts/registry.write';
import { normalizeEvmError, formatErrorMessage } from '@/lib/contracts/errors';
import { ensureWalletOnEnvChain } from '@/lib/contracts/chain-guard';
import { sendTransaction } from 'thirdweb';
import type { AppSummary, Status, MintAppInput, Paginated } from '@/lib/contracts/types';

// Mock the dependencies (duplicate removed)

vi.mock('@/lib/contracts/registry.write', () => ({
  prepareMintApp: vi.fn(),
  prepareUpdateStatus: vi.fn(),
  prepareUpdateApp: vi.fn(),
}));

vi.mock('@/lib/contracts/errors', () => ({
  normalizeEvmError: vi.fn((error) => ({
    code: 'UNKNOWN_ERROR',
    message: error.message || 'Unknown error',
  })),
  formatErrorMessage: vi.fn((error) => error.message || 'Unknown error'),
}));

vi.mock('@/lib/contracts/chain-guard', () => ({
  ensureWalletOnEnvChain: vi.fn(),
}));

vi.mock('thirdweb', () => ({
  sendTransaction: vi.fn(),
}));

vi.mock('thirdweb/react', () => ({
  useActiveAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  })),
}));

describe('useApp hook', () => {
  const mockGetAppByDid = vi.mocked(getAppByDid);
  const mockFormatErrorMessage = vi.mocked(formatErrorMessage);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with null data and loading false', () => {
    const { result } = renderHook(() => useApp());
    
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not fetch app when did is undefined', async () => {
    renderHook(() => useApp(undefined));
    
    await waitFor(() => {
      expect(mockGetAppByDid).not.toHaveBeenCalled();
    });
  });

  it('should fetch app when did is provided', async () => {
    const mockApp: AppSummary = {
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
    };
    
    mockGetAppByDid.mockResolvedValue(mockApp);
    
    const { result } = renderHook(() => useApp('did:oma3:123'));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockApp);
      expect(result.current.error).toBeNull();
    expect(mockGetAppByDid).toHaveBeenCalledWith('did:oma3:123');
  });

  it('should handle fetch errors correctly', async () => {
    const error = new Error('App not found');
    mockGetAppByDid.mockRejectedValue(error);
    mockFormatErrorMessage.mockReturnValue('App not found');
    
    const { result } = renderHook(() => useApp('did:oma3:123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    expect(result.current.error).toEqual(new Error('App not found'));
    expect(mockFormatErrorMessage).toHaveBeenCalledWith(error);
  });

  it('should refetch app when refetch is called', async () => {
    const mockApp: AppSummary = {
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
    };
    
    mockGetAppByDid.mockResolvedValue(mockApp);
    
    const { result } = renderHook(() => useApp('did:oma3:123'));

      await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(mockGetAppByDid).toHaveBeenCalledTimes(1);
    
    // Call refetch
    act(() => {
      result.current.refetch();
    });

      await waitFor(() => {
      expect(mockGetAppByDid).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useAppsByOwner hook', () => {
  const mockGetAppsByOwner = vi.mocked(getAppsByOwner);
  const mockFormatErrorMessage = vi.mocked(formatErrorMessage);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty array and loading false', () => {
    const { result } = renderHook(() => useAppsByOwner());
    
    expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not fetch apps when owner is undefined', async () => {
    renderHook(() => useAppsByOwner(undefined));
    
    await waitFor(() => {
      expect(mockGetAppsByOwner).not.toHaveBeenCalled();
    });
  });

  it('should fetch apps when owner is provided', async () => {
    const mockApps: AppSummary[] = [
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
    
    mockGetAppsByOwner.mockResolvedValue(mockApps);

      const { result } = renderHook(() => useAppsByOwner('0x1234567890123456789012345678901234567890'));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockApps);
      expect(result.current.error).toBeNull();
    expect(mockGetAppsByOwner).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
  });

  it('should handle fetch errors correctly', async () => {
    const error = new Error('Network error');
    mockGetAppsByOwner.mockRejectedValue(error);
    mockFormatErrorMessage.mockReturnValue('Network error');

      const { result } = renderHook(() => useAppsByOwner('0x1234567890123456789012345678901234567890'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    expect(result.current.error).toEqual(new Error('Network error'));
    expect(mockFormatErrorMessage).toHaveBeenCalledWith(error);
  });
});

describe('useAppsList hook', () => {
  const mockListApps = vi.mocked(listApps);
  const mockFormatErrorMessage = vi.mocked(formatErrorMessage);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty items and loading false', async () => {
    const { result } = renderHook(() => useAppsList());
    
    // Wait for the initial load to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.data).toEqual({ items: [] });
    expect(result.current.error).toBeNull();
  });

  it('should fetch apps with default pagination', async () => {
    const mockPaginatedApps: Paginated<AppSummary> = {
        items: [
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
      ],
      total: 1,
      startIndex: 1,
      pageSize: 20,
    };
    
    mockListApps.mockResolvedValue(mockPaginatedApps);
    
    const { result } = renderHook(() => useAppsList());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

    expect(result.current.data).toEqual(mockPaginatedApps);
      expect(result.current.error).toBeNull();
    expect(mockListApps).toHaveBeenCalledWith(1, 20);
  });

  it('should fetch apps with custom pagination', async () => {
    const mockPaginatedApps: Paginated<AppSummary> = {
      items: [],
      total: 0,
      startIndex: 5,
      pageSize: 10,
    };
    
    mockListApps.mockResolvedValue(mockPaginatedApps);
    
    const { result } = renderHook(() => useAppsList(5, 10));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(mockListApps).toHaveBeenCalledWith(5, 10);
  });

  it('should refetch when refetch is called', async () => {
    const mockPaginatedApps: Paginated<AppSummary> = {
      items: [],
      total: 0,
      startIndex: 1,
      pageSize: 20,
    };
    
    mockListApps.mockResolvedValue(mockPaginatedApps);

      const { result } = renderHook(() => useAppsList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

    expect(mockListApps).toHaveBeenCalledTimes(1);
    
    // Call refetch
    act(() => {
      result.current.refetch();
    });
    
    await waitFor(() => {
      expect(mockListApps).toHaveBeenCalledTimes(2);
    });
    });
  });

describe('useTotalApps hook', () => {
  const mockGetTotalApps = vi.mocked(getTotalApps);
  const mockFormatErrorMessage = vi.mocked(formatErrorMessage);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with 0 and loading false', async () => {
    const { result } = renderHook(() => useTotalApps());
    
    // Wait for the initial load to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.data).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should fetch total apps count', async () => {
    mockGetTotalApps.mockResolvedValue(42);

      const { result } = renderHook(() => useTotalApps());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBe(42);
      expect(result.current.error).toBeNull();
    expect(mockGetTotalApps).toHaveBeenCalled();
  });

  it('should handle fetch errors correctly', async () => {
    const error = new Error('Network error');
    mockGetTotalApps.mockRejectedValue(error);
    mockFormatErrorMessage.mockReturnValue('Network error');

      const { result } = renderHook(() => useTotalApps());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBe(0);
    expect(result.current.error).toEqual(new Error('Network error'));
    expect(mockFormatErrorMessage).toHaveBeenCalledWith(error);
  });
});

describe('useMintApp hook', () => {
  const mockPrepareMintApp = vi.mocked(prepareMintApp);
  const mockEnsureWalletOnEnvChain = vi.mocked(ensureWalletOnEnvChain);
  const mockSendTransaction = vi.mocked(sendTransaction);
  const mockNormalizeEvmError = vi.mocked(normalizeEvmError);
  
  const mockAccount = {
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  };
  
  beforeEach(async () => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    // Ensure useActiveAccount returns a valid account by default
    const { useActiveAccount } = await import('thirdweb/react');
    vi.mocked(useActiveAccount).mockReturnValue(mockAccount);
  });

  const mockMintInput: MintAppInput = {
    did: 'did:oma3:123',
    interfaces: 1,
    dataUrl: 'https://example.com/metadata.json',
    dataHash: '0x123',
    dataHashAlgorithm: 0,
    fungibleTokenId: '',
    contractId: '',
    initialVersionMajor: 1,
    initialVersionMinor: 0,
    initialVersionPatch: 0,
    traitHashes: [],
    metadataJson: '{"name":"Test App"}',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with pending false and no error', () => {
    const { result } = renderHook(() => useMintApp());
    
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.txHash).toBeNull();
  });

  it('should throw error when no account is connected', async () => {
    // Mock no account
    const { useActiveAccount } = await import('thirdweb/react');
    vi.mocked(useActiveAccount).mockReturnValue(null);
    
    const { result } = renderHook(() => useMintApp());
    
    await expect(result.current.mint(mockMintInput)).rejects.toThrow('No active account. Please connect your wallet.');
  });

  it('should mint app successfully', async () => {
    const mockTransaction = { to: '0x123', data: '0x456' };
    const mockTxHash = '0xtxhash123';

    mockEnsureWalletOnEnvChain.mockResolvedValue(undefined);
    mockPrepareMintApp.mockReturnValue(mockTransaction);
    mockSendTransaction.mockResolvedValue({ transactionHash: mockTxHash });

    const { result } = renderHook(() => useMintApp());

    await act(async () => {
      const txHash = await result.current.mint(mockMintInput);
      expect(txHash).toBe(mockTxHash);
    });

    expect(mockEnsureWalletOnEnvChain).toHaveBeenCalledTimes(1);
    expect(mockPrepareMintApp).toHaveBeenCalledWith(mockMintInput);
    expect(mockSendTransaction).toHaveBeenCalledWith({
      account: expect.objectContaining({ address: mockAccount.address }),
      transaction: mockTransaction,
    });
    expect(result.current.txHash).toBe(mockTxHash);
    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('should handle network errors with retry', async () => {
    const mockTransaction = { to: '0x123', data: '0x456' };
    const mockTxHash = '0xtxhash123';

    mockEnsureWalletOnEnvChain.mockResolvedValue(undefined);
    mockPrepareMintApp.mockReturnValue(mockTransaction);
    
    // First call fails with network error, second succeeds
    mockNormalizeEvmError
      .mockReturnValueOnce({ code: 'NETWORK_ERROR', message: 'Network error' })
      .mockReturnValueOnce({ code: 'UNKNOWN_ERROR', message: 'Success' });
    
    mockSendTransaction
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ transactionHash: mockTxHash });

    const { result } = renderHook(() => useMintApp());

    await act(async () => {
      const txHash = await result.current.mint(mockMintInput);
      expect(txHash).toBe(mockTxHash);
    });

    expect(mockEnsureWalletOnEnvChain).toHaveBeenCalledTimes(2);
    expect(mockSendTransaction).toHaveBeenCalledTimes(2);
    expect(result.current.txHash).toBe(mockTxHash);
    expect(result.current.error).toBeNull();
  });

  it('should handle non-network errors without retry', async () => {
    const mockTransaction = { to: '0x123', data: '0x456' };

    mockEnsureWalletOnEnvChain.mockResolvedValue(undefined);
    mockPrepareMintApp.mockReturnValue(mockTransaction);
    
    mockNormalizeEvmError.mockReturnValue({ 
      code: 'REVERT_ERROR', 
      message: 'Transaction reverted' 
    });
    
    mockSendTransaction.mockRejectedValue(new Error('Transaction reverted'));

    const { result } = renderHook(() => useMintApp());

    await act(async () => {
      await expect(result.current.mint(mockMintInput))
        .rejects.toThrow('Transaction reverted');
    });

    expect(mockSendTransaction).toHaveBeenCalledTimes(1); // No retry
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Transaction reverted');
    expect(result.current.isPending).toBe(false);
  });

  it('should handle retry failure after network error', async () => {
    const mockTransaction = { to: '0x123', data: '0x456' };

    mockEnsureWalletOnEnvChain.mockResolvedValue(undefined);
    mockPrepareMintApp.mockReturnValue(mockTransaction);
    
    // Both calls fail with network error
    mockNormalizeEvmError
      .mockReturnValue({ code: 'NETWORK_ERROR', message: 'Network error' });
    
    mockSendTransaction
      .mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMintApp());

    await act(async () => {
      await expect(result.current.mint(mockMintInput))
        .rejects.toThrow('Network error');
    });

    expect(mockEnsureWalletOnEnvChain).toHaveBeenCalledTimes(2);
    expect(mockSendTransaction).toHaveBeenCalledTimes(2);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.isPending).toBe(false);
  });

  it('should set error state on failure', async () => {
    const mockTransaction = { to: '0x123', data: '0x456' };

    mockEnsureWalletOnEnvChain.mockResolvedValue(undefined);
    mockPrepareMintApp.mockReturnValue(mockTransaction);
    
    mockNormalizeEvmError.mockReturnValue({ 
      code: 'UNKNOWN_ERROR', 
      message: 'Unknown error' 
    });
    
    mockSendTransaction.mockRejectedValue(new Error('Unknown error'));

    const { result } = renderHook(() => useMintApp());

    await act(async () => {
      await expect(result.current.mint(mockMintInput))
        .rejects.toThrow('Unknown error');
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Unknown error');
    expect(result.current.txHash).toBeNull();
    expect(result.current.isPending).toBe(false);
  });
});

describe('useUpdateStatus hook', () => {
  const mockGetAppByDid = vi.mocked(getAppByDid);
  const mockPrepareUpdateStatus = vi.mocked(prepareUpdateStatus);
  const mockEnsureWalletOnEnvChain = vi.mocked(ensureWalletOnEnvChain);
  const mockSendTransaction = vi.mocked(sendTransaction);
  const mockNormalizeEvmError = vi.mocked(normalizeEvmError);

  const mockAccount = {
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  };

  const mockApp: AppSummary = {
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
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Ensure useActiveAccount returns a valid account by default for these tests
    const { useActiveAccount } = await import('thirdweb/react');
    vi.mocked(useActiveAccount).mockReturnValue(mockAccount);
  });

  it('should initialize with pending false and no error', () => {
    const { result } = renderHook(() => useUpdateStatus());
    
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.txHash).toBeNull();
  });

  it('should throw error when no account is connected', async () => {
    // Mock no account
    const { useActiveAccount } = await import('thirdweb/react');
    vi.mocked(useActiveAccount).mockReturnValue(null);
    
    const { result } = renderHook(() => useUpdateStatus());
    
    await expect(result.current.updateStatus('did:oma3:123', 'Deprecated')).rejects.toThrow('No active account. Please connect your wallet.');
  });

  it('should update status successfully', async () => {
    const mockTransaction = { to: '0x123', data: '0x456' };
    const mockTxHash = '0xtxhash123';

    mockGetAppByDid.mockResolvedValue(mockApp);
    mockPrepareUpdateStatus.mockReturnValue(mockTransaction);
    mockEnsureWalletOnEnvChain.mockResolvedValue(undefined);
    mockSendTransaction.mockResolvedValue({ transactionHash: mockTxHash });

    const { result } = renderHook(() => useUpdateStatus());

    await act(async () => {
      const txHash = await result.current.updateStatus('did:oma3:123', 'Deprecated');
      expect(txHash).toBe(mockTxHash);
    });

    expect(mockGetAppByDid).toHaveBeenCalledWith('did:oma3:123');
    expect(mockPrepareUpdateStatus).toHaveBeenCalledWith({
      did: 'did:oma3:123',
      major: 1,
      status: 'Deprecated',
    });
    expect(mockSendTransaction).toHaveBeenCalledWith({
      account: expect.objectContaining({ address: mockAccount.address }),
      transaction: mockTransaction,
    });
    expect(result.current.txHash).toBe(mockTxHash);
    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('should handle network errors with retry', async () => {
    const mockApp: AppSummary = {
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
    };

    const mockTransaction = { to: '0x123', data: '0x456' };
    const mockTxHash = '0xtxhash123';

    mockGetAppByDid.mockResolvedValue(mockApp);
    mockPrepareUpdateStatus.mockReturnValue(mockTransaction);
    
    // First call fails with network error, second succeeds
    mockNormalizeEvmError
      .mockReturnValueOnce({ code: 'NETWORK_ERROR', message: 'Network error' })
      .mockReturnValueOnce({ code: 'UNKNOWN_ERROR', message: 'Success' });
    
    mockSendTransaction
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ transactionHash: mockTxHash });

    const { result } = renderHook(() => useUpdateStatus());

    await act(async () => {
      const txHash = await result.current.updateStatus('did:oma3:123', 'Deprecated');
      expect(txHash).toBe(mockTxHash);
    });

    expect(mockEnsureWalletOnEnvChain).toHaveBeenCalledTimes(2);
    expect(mockSendTransaction).toHaveBeenCalledTimes(2);
    expect(result.current.txHash).toBe(mockTxHash);
    expect(result.current.error).toBeNull();
  });

  it('should handle retry failure after network error', async () => {
    const mockApp: AppSummary = {
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
    };

    const mockTransaction = { to: '0x123', data: '0x456' };

    mockGetAppByDid.mockResolvedValue(mockApp);
    mockPrepareUpdateStatus.mockReturnValue(mockTransaction);
    
    // Both calls fail with network error
    mockNormalizeEvmError
      .mockReturnValue({ code: 'NETWORK_ERROR', message: 'Network error' });
    
    mockSendTransaction
      .mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUpdateStatus());

    await act(async () => {
      await expect(result.current.updateStatus('did:oma3:123', 'Deprecated'))
        .rejects.toThrow('Network error');
    });

    expect(mockEnsureWalletOnEnvChain).toHaveBeenCalledTimes(2);
    expect(mockSendTransaction).toHaveBeenCalledTimes(2);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should handle non-network errors without retry', async () => {
    const mockApp: AppSummary = {
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
    };

    const mockTransaction = { to: '0x123', data: '0x456' };

    mockGetAppByDid.mockResolvedValue(mockApp);
    mockPrepareUpdateStatus.mockReturnValue(mockTransaction);
    
    mockNormalizeEvmError.mockReturnValue({ 
      code: 'REVERT_ERROR', 
      message: 'Transaction reverted' 
    });
    
    mockSendTransaction.mockRejectedValue(new Error('Transaction reverted'));

    const { result } = renderHook(() => useUpdateStatus());

    await act(async () => {
      await expect(result.current.updateStatus('did:oma3:123', 'Deprecated'))
        .rejects.toThrow('Transaction reverted');
    });

    expect(mockSendTransaction).toHaveBeenCalledTimes(1); // No retry
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Transaction reverted');
  });

  it('should throw error when app is not found', async () => {
    mockGetAppByDid.mockResolvedValue(null);

    const { result } = renderHook(() => useUpdateStatus());

    await act(async () => {
      await expect(result.current.updateStatus('did:oma3:123', 'Deprecated'))
        .rejects.toThrow('App not found: did:oma3:123');
    });
  });
});

describe('useUpdateApp hook', () => {
  const mockPrepareUpdateApp = vi.mocked(prepareUpdateApp);
  const mockEnsureWalletOnEnvChain = vi.mocked(ensureWalletOnEnvChain);
  const mockSendTransaction = vi.mocked(sendTransaction);
  const mockNormalizeEvmError = vi.mocked(normalizeEvmError);

  const mockAccount = {
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Ensure useActiveAccount returns a valid account by default
    const { useActiveAccount } = await import('thirdweb/react');
    vi.mocked(useActiveAccount).mockReturnValue(mockAccount);
  });

  const mockUpdateInput = {
    did: 'did:oma3:123',
    major: 1,
    newDataUrl: 'https://example.com/new-metadata.json',
    newDataHash: '0x456' as `0x${string}`,
    newDataHashAlgorithm: 0,
    newInterfaces: 2,
    newTraitHashes: ['0x789' as `0x${string}`],
    newMinor: 1,
    newPatch: 0,
    metadataJson: '{"name":"Updated App"}',
  };

  it('should initialize with pending false and no error', () => {
    const { result } = renderHook(() => useUpdateApp());
    
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.txHash).toBeNull();
  });

  it('should throw error when no account is connected', async () => {
    const { useActiveAccount } = await import('thirdweb/react');
    vi.mocked(useActiveAccount).mockReturnValue(null);
    
    const { result } = renderHook(() => useUpdateApp());
    
    await expect(result.current.updateApp(mockUpdateInput)).rejects.toThrow('No active account. Please connect your wallet.');
  });

  it('should update app successfully', async () => {
    const mockTransaction = { to: '0x123', data: '0x456' };
    const mockTxHash = '0xtxhash123';

    mockPrepareUpdateApp.mockReturnValue(mockTransaction);
    mockEnsureWalletOnEnvChain.mockResolvedValue(undefined);
    mockSendTransaction.mockResolvedValue({ transactionHash: mockTxHash });

    const { result } = renderHook(() => useUpdateApp());

    await act(async () => {
      const txHash = await result.current.updateApp(mockUpdateInput);
      expect(txHash).toBe(mockTxHash);
    });

    expect(mockEnsureWalletOnEnvChain).toHaveBeenCalledTimes(1);
    expect(mockPrepareUpdateApp).toHaveBeenCalledWith(mockUpdateInput);
    expect(mockSendTransaction).toHaveBeenCalledWith({
      account: expect.objectContaining({ address: mockAccount.address }),
      transaction: mockTransaction,
    });
    expect(result.current.txHash).toBe(mockTxHash);
    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('should handle network errors with retry', async () => {
    const mockTransaction = { to: '0x123', data: '0x456' };
    const mockTxHash = '0xtxhash123';

    mockPrepareUpdateApp.mockReturnValue(mockTransaction);
    mockEnsureWalletOnEnvChain.mockResolvedValue(undefined);
    
    // First call fails with network error, second succeeds
    mockNormalizeEvmError
      .mockReturnValueOnce({ code: 'NETWORK_ERROR', message: 'Network error' })
      .mockReturnValueOnce({ code: 'UNKNOWN_ERROR', message: 'Success' });
    
    mockSendTransaction
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ transactionHash: mockTxHash });

    const { result } = renderHook(() => useUpdateApp());

    await act(async () => {
      const txHash = await result.current.updateApp(mockUpdateInput);
      expect(txHash).toBe(mockTxHash);
    });

    expect(mockEnsureWalletOnEnvChain).toHaveBeenCalledTimes(2);
    expect(mockSendTransaction).toHaveBeenCalledTimes(2);
    expect(result.current.txHash).toBe(mockTxHash);
    expect(result.current.error).toBeNull();
  });

  it('should handle retry failure after network error', async () => {
    const mockTransaction = { to: '0x123', data: '0x456' };

    mockPrepareUpdateApp.mockReturnValue(mockTransaction);
    mockEnsureWalletOnEnvChain.mockResolvedValue(undefined);
    
    // Both calls fail with network error
    mockNormalizeEvmError
      .mockReturnValue({ code: 'NETWORK_ERROR', message: 'Network error' });
    
    mockSendTransaction
      .mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUpdateApp());

    await act(async () => {
      await expect(result.current.updateApp(mockUpdateInput))
        .rejects.toThrow('Network error');
    });

    expect(mockEnsureWalletOnEnvChain).toHaveBeenCalledTimes(2);
    expect(mockSendTransaction).toHaveBeenCalledTimes(2);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should handle non-network errors without retry', async () => {
    const mockTransaction = { to: '0x123', data: '0x456' };

    mockPrepareUpdateApp.mockReturnValue(mockTransaction);
    mockEnsureWalletOnEnvChain.mockResolvedValue(undefined);
    
    mockNormalizeEvmError.mockReturnValue({ 
      code: 'REVERT_ERROR', 
      message: 'Transaction reverted' 
    });
    
    mockSendTransaction.mockRejectedValue(new Error('Transaction reverted'));

    const { result } = renderHook(() => useUpdateApp());

    await act(async () => {
      await expect(result.current.updateApp(mockUpdateInput))
        .rejects.toThrow('Transaction reverted');
    });

    expect(mockSendTransaction).toHaveBeenCalledTimes(1); // No retry
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Transaction reverted');
    expect(result.current.isPending).toBe(false);
  });
});

describe('useSearchByDid hook', () => {
  const mockSearchByDid = vi.mocked(searchByDid);
  const mockFormatErrorMessage = vi.mocked(formatErrorMessage);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty array and loading false', () => {
    const { result } = renderHook(() => useSearchByDid());
    
    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not search when query is undefined', async () => {
    renderHook(() => useSearchByDid(undefined));
    
    await waitFor(() => {
      expect(mockSearchByDid).not.toHaveBeenCalled();
    });
  });

  it('should not search when query is empty string', async () => {
    renderHook(() => useSearchByDid(''));
    
    await waitFor(() => {
      expect(mockSearchByDid).not.toHaveBeenCalled();
    });
  });

  it('should not search when query is only whitespace', async () => {
    renderHook(() => useSearchByDid('   '));
    
    await waitFor(() => {
      expect(mockSearchByDid).not.toHaveBeenCalled();
    });
  });

  it('should search when query is provided', async () => {
    const mockResults: AppSummary[] = [
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
    
    mockSearchByDid.mockResolvedValue(mockResults);
    
    const { result } = renderHook(() => useSearchByDid('did:oma3:123'));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockResults);
      expect(result.current.error).toBeNull();
    expect(mockSearchByDid).toHaveBeenCalledWith('did:oma3:123');
  });

  it('should handle search errors correctly', async () => {
    const error = new Error('Search failed');
    mockSearchByDid.mockRejectedValue(error);
    mockFormatErrorMessage.mockReturnValue('Search failed');
    
    const { result } = renderHook(() => useSearchByDid('did:oma3:123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    expect(result.current.error).toEqual(new Error('Search failed'));
    expect(mockFormatErrorMessage).toHaveBeenCalledWith(error);
  });
});