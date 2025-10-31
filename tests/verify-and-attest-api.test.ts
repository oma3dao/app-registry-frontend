/**
 * Tests for /api/verify-and-attest API route
 * 
 * Tests the unified verify & attest endpoint that:
 * 1. Checks for existing attestations (fast path)
 * 2. Verifies DID ownership (did:web via DNS/did.json, did:pkh via contract)
 * 3. Writes attestations to resolver contract
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/verify-and-attest/route';

// Mock environment variables
const mockEnv = {
  NEXT_PUBLIC_THIRDWEB_CLIENT_ID: 'test-client-id',
  NEXT_PUBLIC_ACTIVE_CHAIN: 'localhost',
  ISSUER_PRIVATE_KEY: '0x1234567890123456789012345678901234567890123456789012345678901234',
};

// Mock thirdweb SDK
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
}));

// Mock thirdweb wallets
vi.mock('thirdweb/wallets', () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: '0xSignerAddress',
  })),
}));

// Mock ethers
vi.mock('ethers', () => ({
  ethers: {
    id: vi.fn((input: string) => `0x${input.length.toString().padStart(64, '0')}`),
    zeroPadValue: vi.fn((address: string) => `${address.padEnd(66, '0')}`),
    JsonRpcProvider: vi.fn(),
    Contract: vi.fn(),
    getAddress: vi.fn((addr: string) => addr),
  },
}));

// Mock DNS
vi.mock('dns', () => ({
  default: {
    resolveTxt: vi.fn(),
  },
}));

// Mock util
vi.mock('util', () => ({
  promisify: vi.fn((fn) => fn),
}));

// Mock config chains
vi.mock('@/config/chains', () => ({
  localhost: {
    chainId: 31337,
    contracts: {
      resolver: '0xLocalResolver',
    },
  },
  omachainTestnet: {
    chainId: 12345,
    contracts: {
      resolver: '0xTestnetResolver',
    },
  },
  omachainMainnet: {
    chainId: 54321,
    contracts: {
      resolver: '0xMainnetResolver',
    },
  },
}));

// Mock RPC helpers
vi.mock('@/lib/rpc', () => ({
  getRpcUrl: vi.fn(() => 'http://localhost:8545'),
  withRetry: vi.fn((fn) => fn()),
}));

// Mock DID utils
vi.mock('@/lib/utils/did', () => ({
  normalizeDomain: vi.fn((domain) => domain.toLowerCase()),
}));

// Mock issuer key loader
vi.mock('@/lib/server/issuer-key', () => ({
  loadIssuerPrivateKey: vi.fn(() => mockEnv.ISSUER_PRIVATE_KEY),
  getThirdwebManagedWallet: vi.fn(() => null), // Default to non-managed mode
}));

describe('/api/verify-and-attest', () => {
  beforeEach(() => {
    // Set up environment
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment
    Object.keys(mockEnv).forEach((key) => {
      delete process.env[key];
    });
  });

  /**
   * Test: validates required inputs
   */
  it('returns 400 when DID is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        connectedAddress: '0x1234567890123456789012345678901234567890',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('DID is required');
  });

  it('returns 400 when connected address is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:web:example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Connected address is required');
  });

  it('returns 400 when DID type is unsupported', async () => {
    const { readContract } = await import('thirdweb');
    vi.mocked(readContract).mockResolvedValue('0x0000000000000000000000000000000000000000');

    const request = new NextRequest('http://localhost:3000/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:unknown:something',
        connectedAddress: '0x1234567890123456789012345678901234567890',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Unsupported DID type');
  });

  /**
   * Test: fast path - existing attestations
   */
  it('returns success when attestations already exist (fast path)', async () => {
    const { readContract } = await import('thirdweb');
    const connectedAddress = '0x1234567890123456789012345678901234567890';
    
    // Mock existing attestation - current owner matches connected address
    vi.mocked(readContract).mockResolvedValue(connectedAddress);

    const request = new NextRequest('http://localhost:3000/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:web:example.com',
        connectedAddress,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.status).toBe('ready');
    expect(data.message).toContain('already exist');
    expect(data.attestations.present).toHaveLength(1);
    expect(data.attestations.missing).toHaveLength(0);
  });

  /**
   * Test: did:web verification via DNS TXT
   */
  it('verifies did:web via DNS TXT record and writes attestation', async () => {
    const dns = await import('dns');
    const { readContract, sendTransaction } = await import('thirdweb');
    
    const connectedAddress = '0xABCDEF1234567890123456789012345678901234';
    
    // Mock no existing attestation
    vi.mocked(readContract)
      .mockResolvedValueOnce('0x0000000000000000000000000000000000000000') // Initial check
      .mockResolvedValueOnce(connectedAddress); // Post-write check
    
    // Mock DNS TXT record with valid CAIP-10 - return as a single string (how DNS TXT records work)
    vi.mocked(dns.default.resolveTxt).mockResolvedValue([
      [`v=1 caip10=eip155:1:${connectedAddress}`],
    ]);
    
    // Mock successful transaction
    vi.mocked(sendTransaction).mockResolvedValue({
      transactionHash: '0xtxhash123',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:web:example.com',
        connectedAddress,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.status).toBe('ready');
    expect(data.txHashes).toHaveLength(1);
    expect(data.txHashes[0]).toBe('0xtxhash123');
  });

  /**
   * Test: did:web verification via did.json
   */
  it('verifies did:web via did.json and writes attestation', async () => {
    const dns = await import('dns');
    const { readContract, sendTransaction } = await import('thirdweb');
    
    const connectedAddress = '0xDEF1234567890123456789012345678901234567';
    
    // Clear and mock no existing attestation
    vi.mocked(readContract).mockReset();
    vi.mocked(readContract)
      .mockResolvedValueOnce('0x0000000000000000000000000000000000000000') // Initial check
      .mockResolvedValueOnce(connectedAddress); // Post-write check
    
    // Mock DNS TXT fails
    vi.mocked(dns.default.resolveTxt).mockRejectedValue(new Error('DNS lookup failed'));
    
    // Mock did.json fetch with valid address
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        verificationMethod: [
          {
            blockchainAccountId: `eip155:1:${connectedAddress}`,
          },
        ],
      }),
    });
    
    // Mock successful transaction
    vi.mocked(sendTransaction).mockResolvedValue({
      transactionHash: '0xtxhash456',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:web:example.com',
        connectedAddress,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.txHashes).toHaveLength(1);
  });

  /**
   * Test: did:web verification fails
   */
  it('returns 403 when did:web verification fails', async () => {
    const dns = await import('dns');
    const { readContract } = await import('thirdweb');
    
    const connectedAddress = '0xABCDEF1234567890123456789012345678901234';
    
    // Mock no existing attestation
    vi.mocked(readContract).mockResolvedValue('0x0000000000000000000000000000000000000000');
    
    // Mock DNS TXT fails
    vi.mocked(dns.default.resolveTxt).mockRejectedValue(new Error('DNS lookup failed'));
    
    // Mock did.json fetch fails
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const request = new NextRequest('http://localhost:3000/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:web:example.com',
        connectedAddress,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.ok).toBe(false);
    expect(data.status).toBe('failed');
    expect(data.error).toContain('verification failed');
  });

  /**
   * Test: did:pkh verification via owner() function
   */
  it('verifies did:pkh via contract owner() function', async () => {
    const { readContract, sendTransaction } = await import('thirdweb');
    const { ethers } = await import('ethers');
    
    const connectedAddress = '0xABCDEF1234567890123456789012345678901234';
    const contractAddress = '0x1111111111111111111111111111111111111111';
    
    // Mock no existing attestation
    vi.mocked(readContract).mockResolvedValue('0x0000000000000000000000000000000000000000');
    
    // Mock ethers provider and contract
    const mockProvider = {
      getCode: vi.fn().mockResolvedValue('0x123456'), // Contract exists
    };
    
    const mockContract = {
      owner: vi.fn().mockResolvedValue(connectedAddress),
    };
    
    vi.mocked(ethers.JsonRpcProvider).mockReturnValue(mockProvider as any);
    vi.mocked(ethers.Contract).mockReturnValue(mockContract as any);
    
    // Mock successful transaction
    vi.mocked(sendTransaction).mockResolvedValue({
      transactionHash: '0xtxhash789',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: `did:pkh:eip155:1:${contractAddress}`,
        connectedAddress,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.txHashes).toHaveLength(1);
  });

  /**
   * Test: did:pkh verification via EIP-1967 proxy admin slot
   */
  it('verifies did:pkh via EIP-1967 proxy admin slot', async () => {
    const { readContract, sendTransaction } = await import('thirdweb');
    const { ethers } = await import('ethers');
    
    const connectedAddress = '0xABCDEF1234567890123456789012345678901234';
    const contractAddress = '0x1111111111111111111111111111111111111111';
    
    // Mock no existing attestation
    vi.mocked(readContract).mockResolvedValue('0x0000000000000000000000000000000000000000');
    
    // Mock ethers provider and contract
    const mockProvider = {
      getCode: vi.fn().mockResolvedValue('0x123456'), // Contract exists
      getStorage: vi.fn().mockResolvedValue(
        '0x000000000000000000000000' + connectedAddress.slice(2) // Admin in storage slot
      ),
    };
    
    const mockContract = {
      owner: vi.fn().mockRejectedValue(new Error('No owner() function')),
      admin: vi.fn().mockRejectedValue(new Error('No admin() function')),
    };
    
    vi.mocked(ethers.JsonRpcProvider).mockReturnValue(mockProvider as any);
    vi.mocked(ethers.Contract).mockReturnValue(mockContract as any);
    vi.mocked(ethers.getAddress).mockReturnValue(connectedAddress);
    
    // Mock successful transaction
    vi.mocked(sendTransaction).mockResolvedValue({
      transactionHash: '0xtxhashproxy',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: `did:pkh:eip155:1:${contractAddress}`,
        connectedAddress,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  /**
   * Test: did:pkh verification fails when not owner
   */
  it('returns 403 when did:pkh verification fails (not owner)', async () => {
    const { readContract } = await import('thirdweb');
    const { ethers } = await import('ethers');
    
    const connectedAddress = '0xAABBCCDDEE123456789012345678901234567890';
    const contractAddress = '0x2222222222222222222222222222222222222222';
    const differentOwner = '0x9999999999999999999999999999999999999999';
    
    // Mock no existing attestation
    vi.mocked(readContract).mockReset().mockResolvedValue('0x0000000000000000000000000000000000000000');
    
    // Mock ethers provider and contract with different owner - no match anywhere
    const mockProvider = {
      getCode: vi.fn().mockResolvedValue('0x123456'),
      getStorage: vi.fn().mockResolvedValue('0x0000000000000000000000000000000000000000000000000000000000000000'), // Zero admin slot
    };
    
    const mockContract = {
      owner: vi.fn().mockResolvedValue(differentOwner),
      admin: vi.fn().mockRejectedValue(new Error('No admin() function')),
      getOwner: vi.fn().mockRejectedValue(new Error('No getOwner() function')),
    };
    
    vi.mocked(ethers.JsonRpcProvider).mockReturnValue(mockProvider as any);
    vi.mocked(ethers.Contract).mockReturnValue(mockContract as any);

    const request = new NextRequest('http://localhost:3000/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: `did:pkh:eip155:1:${contractAddress}`,
        connectedAddress,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('verification failed');
  });

  /**
   * Test: handles chain configuration
   */
  it('returns 500 when active chain is invalid', async () => {
    process.env.NEXT_PUBLIC_ACTIVE_CHAIN = 'invalid-chain';

    const request = new NextRequest('http://localhost:3000/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:web:example.com',
        connectedAddress: '0x1234567890123456789012345678901234567890',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Invalid active chain');
  });

  it('returns 500 when Thirdweb client ID is missing', async () => {
    delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

    const request = new NextRequest('http://localhost:3000/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:web:example.com',
        connectedAddress: '0x1234567890123456789012345678901234567890',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('not configured');
  });

  /**
   * Test: handles transaction errors
   */
  it('returns 500 when transaction fails to write', async () => {
    const dns = await import('dns');
    const { readContract, sendTransaction } = await import('thirdweb');
    
    const connectedAddress = '0xFEDCBA9876543210987654321098765432109876';
    
    // Mock no existing attestation
    vi.mocked(readContract).mockReset().mockResolvedValue('0x0000000000000000000000000000000000000000');
    
    // Mock DNS TXT success
    vi.mocked(dns.default.resolveTxt).mockResolvedValue([
      [`v=1 caip10=eip155:1:${connectedAddress}`],
    ]);
    
    // Mock failed transaction
    vi.mocked(sendTransaction).mockRejectedValue(new Error('Transaction reverted'));

    const request = new NextRequest('http://localhost:3000/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:web:example.com',
        connectedAddress,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.status).toBe('failed');
    expect(data.error).toContain('Failed to write attestations');
  });

  /**
   * Test: handles internal errors gracefully
   */
  it('returns 500 on unexpected internal error', async () => {
    const dns = await import('dns');
    const { readContract, prepareContractCall } = await import('thirdweb');
    
    // Mock no existing attestation
    vi.mocked(readContract).mockReset().mockResolvedValue('0x0000000000000000000000000000000000000000');
    
    const connectedAddress = '0x8888888888888888888888888888888888888888';
    
    // Mock DNS success
    vi.mocked(dns.default.resolveTxt).mockResolvedValue([
      [`v=1 caip10=eip155:1:${connectedAddress}`],
    ]);
    
    // Mock prepareContractCall to throw unexpected error during transaction preparation
    vi.mocked(prepareContractCall).mockImplementation(() => {
      throw new Error('Failed to encode transaction data');
    });

    const request = new NextRequest('http://localhost:3000/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:web:unexpected-error.com',
        connectedAddress,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.status).toBe('failed');
    expect(data.error).toBeDefined();
  });
});
