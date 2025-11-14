/**
 * Additional coverage tests for /api/verify-and-attest API route
 * 
 * Targets specific error paths and edge cases to improve coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/verify-and-attest/route';
import * as thirdweb from 'thirdweb';
import dns from 'dns';

// Mock environment
const mockEnv = {
  NEXT_PUBLIC_THIRDWEB_CLIENT_ID: 'test-client-id',
  NEXT_PUBLIC_ACTIVE_CHAIN: 'localhost',
  ISSUER_PRIVATE_KEY: '0x1234567890123456789012345678901234567890123456789012345678901234',
};

vi.stubGlobal('process', { env: mockEnv });

// Mock thirdweb
vi.mock('thirdweb', () => ({
  createThirdwebClient: vi.fn(() => ({ clientId: 'test-client-id' })),
  getContract: vi.fn(() => ({ address: '0xResolver', chain: { id: 31337 } })),
  readContract: vi.fn(),
  prepareContractCall: vi.fn(() => ({ to: '0xResolver', data: '0xdata' })),
  sendTransaction: vi.fn(),
  defineChain: vi.fn((id: number) => ({ id })),
  waitForReceipt: vi.fn(),
}));

vi.mock('thirdweb/wallets', () => ({
  privateKeyToAccount: vi.fn(() => ({ address: '0xIssuer' })),
}));

// Mock ethers
vi.mock('ethers', async () => {
  const real = await vi.importActual('ethers') as any;
  return {
    ...real,
    ethers: {
      ...real.ethers,
      id: vi.fn((s: string) => `0x${s.length.toString().padStart(64, '0')}`),
      zeroPadValue: vi.fn((addr: string) => `${addr.padEnd(66, '0')}`),
      JsonRpcProvider: vi.fn().mockImplementation(() => ({
        getTransaction: vi.fn(),
        getTransactionReceipt: vi.fn(),
      })),
      Contract: vi.fn(),
      getAddress: vi.fn((addr: string) => addr),
      solidityPacked: vi.fn((types: string[], values: any[]) => {
        const parts = values.map((val, i) => {
          if (types[i] === 'string') return real.ethers.toUtf8Bytes(val);
          if (types[i] === 'bytes32') return real.ethers.getBytes(val);
          if (types[i] === 'bytes20') return real.ethers.getBytes(val);
          return val;
        });
        return real.ethers.concat(parts);
      }),
      keccak256: real.ethers.keccak256,
      ZeroAddress: '0x0000000000000000000000000000000000000000',
    },
  };
});

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

// Helper to get mocked DNS
const getMockedDns = () => {
  return vi.mocked(dns.resolveTxt);
};

// Mock chains
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
}));

// Mock issuer key loader
vi.mock('@/lib/server/issuer-key', () => ({
  loadIssuerPrivateKey: vi.fn(() => '0x1234567890123456789012345678901234567890123456789012345678901234'),
  getThirdwebManagedWallet: vi.fn(() => null),
}));

// Mock fetch
global.fetch = vi.fn() as any;

describe('verify-and-attest coverage gaps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (thirdweb.readContract as any).mockResolvedValue(false);
    (thirdweb.sendTransaction as any).mockResolvedValue({ transactionHash: '0xtxhash' });
    (thirdweb.waitForReceipt as any).mockResolvedValue({ status: 'success' });
    getMockedDns().mockReset();
    (global.fetch as any).mockReset();
  });

  /**
   * Test: covers lines 126-131 - No DNS TXT record found
   * Tests error path when DNS query returns empty array
   */
  it('returns 403 when no DNS TXT record exists', async () => {
    getMockedDns().mockResolvedValue([]); // Empty records array

    const req = new NextRequest('http://localhost/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:web:example.com',
        connectedAddress: '0x1234567890123456789012345678901234567890',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    // Should return 403 with specific error about missing DNS record (lines 126-131)
    expect(response.status).toBe(403);
    expect(data.details).toContain('No DNS TXT record found');
  });

  /**
   * Test: covers lines 191-196 - Address mismatch in DNS TXT record
   * Tests error path when DNS record has different address
   */
  it('returns 403 when DNS TXT record has wrong address', async () => {
    // Return valid TXT record but with different address
    getMockedDns().mockResolvedValue([
      ['v=1 caip10=eip155:66238:0xDifferentAddress']
    ]);

    const req = new NextRequest('http://localhost/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:web:example.com',
        connectedAddress: '0x1234567890123456789012345678901234567890',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    // Should return 403 with address mismatch error (lines 191-196)
    expect(response.status).toBe(403);
    expect(data.details).toContain('Address mismatch');
  });

  /**
   * Test: covers lines 239-244 - No verification methods in DID document
   * Tests error path when did.json has empty verificationMethod array
   */
  it('returns 403 when DID document has no verification methods', async () => {
    getMockedDns().mockRejectedValue(new Error('DNS query failed'));

    // Mock fetch to return DID document with empty verificationMethod
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        '@context': 'https://www.w3.org/ns/did/v1',
        id: 'did:web:example.com',
        verificationMethod: [], // Empty array (lines 239-244)
      }),
    });

    const req = new NextRequest('http://localhost/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:web:example.com',
        connectedAddress: '0x1234567890123456789012345678901234567890',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    // Should return 403 with no verification methods error (lines 239-244)
    expect(response.status).toBe(403);
    expect(data.details).toContain('No verification methods');
  });

  /**
   * Note: Lines 304-310 (Invalid DID format in verifyDidWeb) are defensive code.
   * The router already filters DIDs at line 936-946, so only did:web: DIDs reach verifyDidWeb.
   * Testing the router-level validation instead (lines 940-946).
   */
  it('returns 400 when DID has unsupported format', async () => {
    const req = new NextRequest('http://localhost/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:unknown:example.com', // Unsupported DID type
        connectedAddress: '0x1234567890123456789012345678901234567890',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    // Should return 400 with unsupported DID type error (lines 940-946)
    expect(response.status).toBe(400);
    expect(data.error).toContain('Unsupported DID type');
    expect(data.details).toContain('Only did:web: and did:pkh: are supported');
  });

  /**
   * Test: covers lines 357-362 - Transaction not found
   * Tests error path when transaction hash doesn't exist on chain
   */
  it('returns 403 when transfer transaction is not found', async () => {
    const ethersModule = await import('ethers');
    
    // Mock contract to return controlling wallet for discovery
    const mockContract = {
      owner: vi.fn().mockResolvedValue('0xControllingWallet'),
    };
    (ethersModule.ethers.Contract as any).mockImplementation(() => mockContract);

    const mockProvider = {
      getTransaction: vi.fn().mockResolvedValue(null), // Transaction not found
      getTransactionReceipt: vi.fn(),
      getStorage: vi.fn().mockResolvedValue('0x0000000000000000000000000000000000000000000000000000000000000000'),
    };
    (ethersModule.ethers.JsonRpcProvider as any).mockImplementation(() => mockProvider);

    const req = new NextRequest('http://localhost/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:pkh:eip155:1:0xContractAddress',
        connectedAddress: '0x1234567890123456789012345678901234567890',
        txHash: '0xnonexistenttxhash',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    // Should return 403 with transaction not found error (lines 357-362)
    expect(response.status).toBe(403);
    expect(data.error).toContain('Transaction not found');
    expect(data.details).toContain('not found on chain');
  });

  /**
   * Test: covers lines 373-378 - Transaction not confirmed
   * Tests error path when transaction exists but no receipt
   */
  it('returns 403 when transfer transaction is not confirmed', async () => {
    const ethersModule = await import('ethers');
    
    // Mock contract to return controlling wallet for discovery
    const mockContract = {
      owner: vi.fn().mockResolvedValue('0xControllingWallet'),
    };
    (ethersModule.ethers.Contract as any).mockImplementation(() => mockContract);

    const mockProvider = {
      getTransaction: vi.fn().mockResolvedValue({
        hash: '0xtxhash',
        from: '0xControllingWallet', // Match controlling wallet
        to: '0x1234567890123456789012345678901234567890',
        value: 1000000000000000000n,
        blockNumber: 12345,
      }),
      getTransactionReceipt: vi.fn().mockResolvedValue(null), // Not confirmed
      getStorage: vi.fn().mockResolvedValue('0x0000000000000000000000000000000000000000000000000000000000000000'),
    };
    (ethersModule.ethers.JsonRpcProvider as any).mockImplementation(() => mockProvider);

    const req = new NextRequest('http://localhost/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:pkh:eip155:1:0xContractAddress',
        connectedAddress: '0x1234567890123456789012345678901234567890',
        txHash: '0xunconfirmedtxhash',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    // Should return 403 with not confirmed error (lines 373-378)
    expect(response.status).toBe(403);
    expect(data.error).toContain('Transaction not confirmed');
    expect(data.details).toContain('not yet confirmed');
  });

  /**
   * Test: covers lines 403-408 - Wrong sender in transfer verification
   * Tests error path when transaction sender doesn't match controlling wallet
   */
  it('returns 403 when transfer transaction has wrong sender', async () => {
    const ethersModule = await import('ethers');
    
    // Mock contract to return controlling wallet
    const mockContract = {
      owner: vi.fn().mockResolvedValue('0xControllingWallet'),
    };
    (ethersModule.ethers.Contract as any).mockImplementation(() => mockContract);

    const mockProvider = {
      getTransaction: vi.fn().mockResolvedValue({
        hash: '0xtxhash',
        from: '0xWrongSender', // Different from controlling wallet
        to: '0x1234567890123456789012345678901234567890',
        value: 1000000000000000000n,
        blockNumber: 12345,
      }),
      getTransactionReceipt: vi.fn().mockResolvedValue({
        status: 1,
        blockNumber: 12345,
      }),
      getBlockNumber: vi.fn().mockResolvedValue(12350),
      getStorage: vi.fn().mockResolvedValue('0x0000000000000000000000000000000000000000000000000000000000000000'),
    };
    (ethersModule.ethers.JsonRpcProvider as any).mockImplementation(() => mockProvider);

    const req = new NextRequest('http://localhost/api/verify-and-attest', {
      method: 'POST',
      body: JSON.stringify({
        did: 'did:pkh:eip155:1:0xContractAddress',
        connectedAddress: '0x1234567890123456789012345678901234567890',
        txHash: '0xwrongsendertx',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    // Should return 403 with wrong sender error (lines 403-408)
    expect(response.status).toBe(403);
    expect(data.error).toContain('Wrong sender');
    expect(data.details).toContain('expected controlling wallet');
  });
});

