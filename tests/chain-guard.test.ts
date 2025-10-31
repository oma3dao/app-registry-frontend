import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeChainId, ensureWalletOnEnvChain } from '@/lib/contracts/chain-guard';

describe('Chain Guard utilities', () => {
  describe('normalizeChainId', () => {
    // Tests normalization of valid numeric chain IDs
    it('normalizes valid numeric chainId', () => {
      expect(normalizeChainId(1)).toBe(1);
      expect(normalizeChainId(137)).toBe(137);
      expect(normalizeChainId(8453)).toBe(8453);
    });

    // Tests normalization of CAIP-2 format (eip155:chainId)
    it('normalizes CAIP-2 format (eip155:chainId)', () => {
      expect(normalizeChainId('eip155:1')).toBe(1);
      expect(normalizeChainId('eip155:137')).toBe(137);
      expect(normalizeChainId('EIP155:8453')).toBe(8453); // case insensitive
    });

    // Tests normalization of plain numeric strings
    it('normalizes plain numeric string', () => {
      expect(normalizeChainId('1')).toBe(1);
      expect(normalizeChainId('137')).toBe(137);
      expect(normalizeChainId('8453')).toBe(8453);
    });

    // Tests rejection of invalid values
    it('returns null for invalid chainId', () => {
      expect(normalizeChainId(-1)).toBeNull();
      expect(normalizeChainId(0)).toBeNull();
      expect(normalizeChainId(1.5)).toBeNull();
      expect(normalizeChainId('invalid')).toBeNull();
      expect(normalizeChainId('eip155:abc')).toBeNull();
      expect(normalizeChainId(null)).toBeNull();
      expect(normalizeChainId(undefined)).toBeNull();
      expect(normalizeChainId({})).toBeNull();
      expect(normalizeChainId([])).toBeNull();
    });

    // Tests handling of edge cases
    it('handles edge cases', () => {
      expect(normalizeChainId('')).toBeNull();
      expect(normalizeChainId('  ')).toBeNull();
      expect(normalizeChainId(NaN)).toBeNull();
      expect(normalizeChainId(Infinity)).toBeNull();
    });
  });

  describe('ensureWalletOnEnvChain', () => {
    beforeEach(() => {
      // Reset mocks before each test
      vi.clearAllMocks();
    });

    // Tests that no action is taken when wallet is already on correct chain
    it('does nothing if wallet is already on correct chain', async () => {
      const account = {
        chainId: 31337, // Localhost from env (default)
        wallet: {
          getPersonalWallet: vi.fn().mockReturnValue({
            getEthereumProvider: vi.fn().mockReturnValue({
              request: vi.fn(),
            }),
          }),
        },
      };

      await ensureWalletOnEnvChain(account);

      // Should not attempt to switch chains
      expect(account.wallet.getPersonalWallet).not.toHaveBeenCalled();
    });

    // Tests successful chain switching
    it('switches chain when on wrong chain', async () => {
      const mockRequest = vi.fn().mockResolvedValue(undefined);
      
      const account = {
        chainId: 1, // Ethereum mainnet
        wallet: {
          getPersonalWallet: vi.fn().mockReturnValue({
            getEthereumProvider: vi.fn().mockReturnValue({
              request: mockRequest,
            }),
          }),
        },
      };

      await ensureWalletOnEnvChain(account);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7a69' }], // 0x7a69 = 31337 (localhost)
      });
    });

    // Tests adding chain when chain is unknown to wallet
    it('adds chain if it is unknown (error code 4902)', async () => {
      const mockRequest = vi.fn()
        .mockRejectedValueOnce({ code: 4902, message: 'Unrecognized chain ID' })
        .mockResolvedValueOnce(undefined) // wallet_addEthereumChain
        .mockResolvedValueOnce(undefined); // wallet_switchEthereumChain retry
      
      const account = {
        chainId: 1,
        wallet: {
          getPersonalWallet: vi.fn().mockReturnValue({
            getEthereumProvider: vi.fn().mockReturnValue({
              request: mockRequest,
            }),
          }),
        },
      };

      await ensureWalletOnEnvChain(account);

      expect(mockRequest).toHaveBeenCalledTimes(3);
      // First attempt: switch chain (fails with 4902)
      expect(mockRequest).toHaveBeenNthCalledWith(1, {
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7a69' }],
      });
      // Second attempt: add chain
      expect(mockRequest).toHaveBeenNthCalledWith(2, {
        method: 'wallet_addEthereumChain',
        params: expect.arrayContaining([
          expect.objectContaining({
            chainId: '0x7a69',
            chainName: expect.any(String),
          }),
        ]),
      });
      // Third attempt: switch chain (should succeed)
      expect(mockRequest).toHaveBeenNthCalledWith(3, {
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7a69' }],
      });
    });

    // Tests handling when provider is not available (social login, in-app wallet)
    it('logs warning when provider is not available', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const account = {
        chainId: 1,
        wallet: null, // No wallet provider
      };

      await ensureWalletOnEnvChain(account);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not pre-switch wallet to chain')
      );

      consoleWarnSpy.mockRestore();
    });

    // Tests handling of account with chain object
    it('handles account with chain object', async () => {
      const account = {
        chain: { id: 31337 },
        wallet: {
          getPersonalWallet: vi.fn().mockReturnValue({
            getEthereumProvider: vi.fn().mockReturnValue({
              request: vi.fn(),
            }),
          }),
        },
      };

      await ensureWalletOnEnvChain(account);

      // Should not attempt to switch since chain.id matches env
      expect(account.wallet.getPersonalWallet).not.toHaveBeenCalled();
    });

    // Tests handling when add chain also fails
    it('logs warning when add chain fails', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockRequest = vi.fn()
        .mockRejectedValueOnce({ code: 4902 })
        .mockRejectedValueOnce(new Error('Add chain failed'));
      
      const account = {
        chainId: 1,
        wallet: {
          getPersonalWallet: vi.fn().mockReturnValue({
            getEthereumProvider: vi.fn().mockReturnValue({
              request: mockRequest,
            }),
          }),
        },
      };

      await ensureWalletOnEnvChain(account);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not pre-switch wallet to chain')
      );

      consoleWarnSpy.mockRestore();
    });
  });
});

