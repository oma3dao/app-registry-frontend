import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as thirdweb from 'thirdweb';
import dns from 'dns';
import { verifyAndAttest, VerifyAndAttestError } from '@/lib/server/verify-and-attest-handler';
import { OWNERSHIP_TTL_SECONDS } from '@/config/attestation-services';

const mockEnv = {
  NEXT_PUBLIC_THIRDWEB_CLIENT_ID: 'test-client-id',
  NEXT_PUBLIC_ACTIVE_CHAIN: 'localhost',
  ISSUER_PRIVATE_KEY: '0x1234567890123456789012345678901234567890123456789012345678901234',
};

vi.mock('thirdweb', () => ({
  createThirdwebClient: vi.fn(() => ({ clientId: 'test-client-id' })),
  getContract: vi.fn(() => ({
    address: '0xResolverAddress',
    chain: { id: 31337 },
  })),
  readContract: vi.fn(),
  prepareContractCall: vi.fn(() => ({
    to: '0xResolverAddress',
    data: '0xabcdef',
  })),
  sendTransaction: vi.fn(),
  defineChain: vi.fn((chainId: number) => ({ id: chainId })),
  waitForReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
}));

vi.mock('thirdweb/wallets', () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: '0xSignerAddress',
  })),
}));

vi.mock('ethers', async () => {
  const realEthers = await vi.importActual('ethers') as any;
  return {
    ...realEthers,
    ethers: {
      ...realEthers.ethers,
      id: vi.fn((input: string) => `0x${input.length.toString().padStart(64, '0')}`),
      zeroPadValue: vi.fn((address: string) => `${address.padEnd(66, '0')}`),
      JsonRpcProvider: vi.fn(),
      Contract: vi.fn(),
      getAddress: vi.fn((addr: string) => addr),
      ZeroAddress: '0x0000000000000000000000000000000000000000',
    },
  };
});

vi.mock('dns', () => ({
  default: {
    resolveTxt: vi.fn(),
  },
}));

vi.mock('util', () => ({
  promisify: vi.fn((fn) => fn),
}));

vi.mock('@/config/chains', () => ({
  localhost: {
    name: 'Localhost',
    chainId: 31337,
    rpc: 'http://localhost:8545',
    contracts: {
      registry: '0xLocalRegistry',
      metadata: '0xLocalMetadata',
      resolver: '0xLocalResolver',
    },
  },
  omachainTestnet: {
    name: 'OMA3 Chain Testnet',
    chainId: 12345,
    rpc: 'https://testnet-rpc.oma3.io',
    contracts: {
      registry: '0xTestnetRegistry',
      metadata: '0xTestnetMetadata',
      resolver: '0xTestnetResolver',
    },
  },
  omachainMainnet: {
    name: 'OMA3 Chain Mainnet',
    chainId: 54321,
    rpc: 'https://mainnet-rpc.oma3.io',
    contracts: {
      registry: '0xMainnetRegistry',
      metadata: '0xMainnetMetadata',
      resolver: '0xMainnetResolver',
    },
  },
}));

vi.mock('@/lib/rpc', () => ({
  getRpcUrl: vi.fn(() => 'http://localhost:8545'),
  withRetry: vi.fn((fn) => fn()),
}));

vi.mock('@oma3/omatrust/identity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@oma3/omatrust/identity')>();
  return {
    ...actual,
    normalizeDomain: vi.fn((domain) => domain.toLowerCase()),
    buildEvmDidPkh: vi.fn((chainId: number, addr: string) => `did:pkh:eip155:${chainId}:${addr}`),
  };
});

vi.mock('@/lib/server/issuer-key', () => ({
  loadIssuerPrivateKey: vi.fn(() => mockEnv.ISSUER_PRIVATE_KEY),
  getThirdwebManagedWallet: vi.fn(() => null),
  submitViaServerWallet: vi.fn().mockResolvedValue({
    transactionHash: '0xmanagedTx',
    blockNumber: 1n,
  }),
}));

describe('verifyAndAttest handler', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.keys(mockEnv).forEach((key) => {
      delete process.env[key];
    });
    global.fetch = originalFetch;
  });

  it('throws 400 when DID is missing', async () => {
    await expect(
      verifyAndAttest({
        did: '',
        connectedAddress: '0x1234567890123456789012345678901234567890',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      body: expect.objectContaining({ error: 'DID is required' }),
    } satisfies Partial<VerifyAndAttestError>);
  });

  it('throws 400 when connected address is invalid', async () => {
    await expect(
      verifyAndAttest({
        did: 'did:web:example.com',
        connectedAddress: 'not-an-address',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      body: expect.objectContaining({ error: 'Invalid Ethereum address format' }),
    } satisfies Partial<VerifyAndAttestError>);
  });

  it('throws 400 when DID type is unsupported', async () => {
    vi.mocked(thirdweb.readContract).mockResolvedValue('0x0000000000000000000000000000000000000000');

    await expect(
      verifyAndAttest({
        did: 'did:unknown:something',
        connectedAddress: '0x1234567890123456789012345678901234567890',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      body: expect.objectContaining({ error: 'Unsupported DID type' }),
    } satisfies Partial<VerifyAndAttestError>);
  });

  it('returns ready on fast path when attestation already exists', async () => {
    const connectedAddress = '0x1234567890123456789012345678901234567890';
    vi.mocked(thirdweb.readContract).mockResolvedValue(connectedAddress);
    vi.mocked(dns.resolveTxt).mockResolvedValue([]);

    const result = await verifyAndAttest({
      did: 'did:web:example.com',
      connectedAddress,
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('ready');
    expect(result.attestations.present).toEqual(['oma3.ownership.v1']);
    expect(result.attestations.missing).toEqual([]);
    expect(result.message).toContain('already exist');
  });

  describe('ownership TTL and expiry re-verification', () => {
    it('writes ownership attestation with ~30-day TTL (not zero)', async () => {
      const connectedAddress = '0xABCDEF1234567890123456789012345678901234';
      vi.mocked(thirdweb.readContract)
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000')
        .mockResolvedValueOnce(connectedAddress);
      vi.mocked(dns.resolveTxt).mockResolvedValue([
        [`v=1 caip10=eip155:1:${connectedAddress}`],
      ]);
      vi.mocked(thirdweb.sendTransaction).mockResolvedValue({
        transactionHash: '0xtxhash-ttl',
      } as any);

      await verifyAndAttest({
        did: 'did:web:example.com',
        connectedAddress,
      });

      expect(thirdweb.prepareContractCall).toHaveBeenCalled();
      const firstCallArgs = vi.mocked(thirdweb.prepareContractCall).mock.calls[0][0] as {
        params: [string, string, bigint];
      };
      const expiresAt = firstCallArgs.params[2];
      const now = Math.floor(Date.now() / 1000);
      expect(typeof expiresAt).toBe('bigint');
      expect(expiresAt).toBeGreaterThan(BigInt(now));
      expect(expiresAt).toBeLessThan(BigInt(now + 31 * 24 * 60 * 60));
      expect(expiresAt).not.toBe(0n);
      expect(expiresAt).toBeGreaterThanOrEqual(BigInt(now + OWNERSHIP_TTL_SECONDS - 5));
    });

    it('re-verifies via DNS and writes new attestation when current owner is zero (expired)', async () => {
      const connectedAddress = '0xABCDEF1234567890123456789012345678901234';
      vi.mocked(thirdweb.readContract)
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000')
        .mockResolvedValueOnce(connectedAddress);
      vi.mocked(dns.resolveTxt).mockResolvedValue([
        [`v=1 caip10=eip155:1:${connectedAddress}`],
      ]);
      vi.mocked(thirdweb.sendTransaction).mockResolvedValue({
        transactionHash: '0xtxhash-dns',
      } as any);

      const result = await verifyAndAttest({
        did: 'did:web:example.com',
        connectedAddress,
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe('ready');
      expect(thirdweb.prepareContractCall).toHaveBeenCalled();
      expect(dns.resolveTxt).toHaveBeenCalledWith('_controllers.example.com');
    });

    it('falls back to .well-known/did.json when DNS fails and writes attestation', async () => {
      const connectedAddress = '0xDEF1234567890123456789012345678901234567';
      vi.mocked(thirdweb.readContract)
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000')
        .mockResolvedValueOnce(connectedAddress);
      vi.mocked(dns.resolveTxt).mockRejectedValue(new Error('DNS lookup failed'));
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          verificationMethod: [
            { blockchainAccountId: `eip155:1:${connectedAddress}` },
          ],
        }),
      } as any);
      vi.mocked(thirdweb.sendTransaction).mockResolvedValue({
        transactionHash: '0xtxhash-diddoc',
      } as any);

      const result = await verifyAndAttest({
        did: 'did:web:example.com',
        connectedAddress,
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe('ready');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/.well-known/did.json',
        expect.any(Object),
      );
    });

    it('throws 403 when owner is zero and both DNS + did.json re-verification fail', async () => {
      const connectedAddress = '0xABCDEF1234567890123456789012345678901234';
      vi.mocked(thirdweb.readContract).mockResolvedValue('0x0000000000000000000000000000000000000000');
      vi.mocked(dns.resolveTxt).mockRejectedValue(new Error('DNS lookup failed'));
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      await expect(
        verifyAndAttest({
          did: 'did:web:example.com',
          connectedAddress,
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        body: expect.objectContaining({
          ok: false,
          error: expect.stringContaining('DID ownership verification failed'),
        }),
      } satisfies Partial<VerifyAndAttestError>);
    });

    it('keeps fast path for active attestation and skips DNS/did.json', async () => {
      const connectedAddress = '0x1234567890123456789012345678901234567890';
      vi.mocked(thirdweb.readContract).mockResolvedValue(connectedAddress);
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as any;

      const result = await verifyAndAttest({
        did: 'did:web:example.com',
        connectedAddress,
      });

      expect(result.ok).toBe(true);
      expect(result.message).toBe('All attestations already exist');
      expect(dns.resolveTxt).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(thirdweb.prepareContractCall).not.toHaveBeenCalled();
    });
  });
});
