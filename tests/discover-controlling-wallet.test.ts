import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/discover-controlling-wallet/route';
import { NextRequest } from 'next/server';

// Mock ethers
const mockContract = {
  owner: vi.fn(),
  admin: vi.fn(),
  getOwner: vi.fn(),
};

const mockProvider = {
  getStorage: vi.fn(),
};

vi.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: vi.fn(() => mockProvider),
    Contract: vi.fn(() => mockContract),
    getAddress: vi.fn((addr) => addr),
  },
}));

// Mock RPC utilities
vi.mock('@/lib/rpc', () => ({
  getRpcUrl: vi.fn(() => 'https://test-rpc-url.com'),
  withRetry: vi.fn((fn) => fn()),
}));

describe('/api/discover-controlling-wallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console.log mock
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('returns 400 for missing DID', async () => {
    const request = new NextRequest('http://localhost:3000/api/discover-controlling-wallet', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('DID is required');
  });

  it('returns 400 for invalid DID type', async () => {
    const request = new NextRequest('http://localhost:3000/api/discover-controlling-wallet', {
      method: 'POST',
      body: JSON.stringify({ did: 123 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('DID is required');
  });

  it('returns 400 for invalid did:pkh format', async () => {
    const request = new NextRequest('http://localhost:3000/api/discover-controlling-wallet', {
      method: 'POST',
      body: JSON.stringify({ did: 'did:web:example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('Invalid did:pkh format');
  });

  it('returns 400 for non-eip155 namespace', async () => {
    const request = new NextRequest('http://localhost:3000/api/discover-controlling-wallet', {
      method: 'POST',
      body: JSON.stringify({ did: 'did:pkh:solana:mainnet:123456789' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('Invalid did:pkh format');
  });

  it('returns 400 for invalid chain ID', async () => {
    const request = new NextRequest('http://localhost:3000/api/discover-controlling-wallet', {
      method: 'POST',
      body: JSON.stringify({ did: 'did:pkh:eip155:invalid:0x1234567890123456789012345678901234567890' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('Invalid did:pkh format');
  });

  it('successfully discovers owner via owner() function', async () => {
    const ownerAddress = '0x1234567890123456789012345678901234567890';
    mockContract.owner.mockResolvedValue(ownerAddress);

    const request = new NextRequest('http://localhost:3000/api/discover-controlling-wallet', {
      method: 'POST',
      body: JSON.stringify({ did: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.controllingWallet).toBe(ownerAddress);
    expect(data.chainId).toBe(1);
    expect(data.contractAddress).toBe('0x1234567890123456789012345678901234567890');
  });

  it('successfully discovers owner via admin() function when owner() fails', async () => {
    const adminAddress = '0x9876543210987654321098765432109876543210';
    mockContract.owner.mockRejectedValue(new Error('No owner function'));
    mockContract.admin.mockResolvedValue(adminAddress);

    const request = new NextRequest('http://localhost:3000/api/discover-controlling-wallet', {
      method: 'POST',
      body: JSON.stringify({ did: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.controllingWallet).toBe(adminAddress);
  });

  it('successfully discovers owner via getOwner() function when others fail', async () => {
    const getOwnerAddress = '0x5555555555555555555555555555555555555555';
    mockContract.owner.mockRejectedValue(new Error('No owner function'));
    mockContract.admin.mockRejectedValue(new Error('No admin function'));
    mockContract.getOwner.mockResolvedValue(getOwnerAddress);

    const request = new NextRequest('http://localhost:3000/api/discover-controlling-wallet', {
      method: 'POST',
      body: JSON.stringify({ did: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.controllingWallet).toBe(getOwnerAddress);
  });

  it('successfully discovers owner via EIP-1967 proxy admin slot', async () => {
    // Mock all contract functions to fail
    mockContract.owner.mockRejectedValue(new Error('No owner function'));
    mockContract.admin.mockRejectedValue(new Error('No admin function'));
    mockContract.getOwner.mockRejectedValue(new Error('No getOwner function'));

    // Mock EIP-1967 admin slot
    const adminAddress = '0x1111111111111111111111111111111111111111';
    const adminSlotValue = '0x000000000000000000000000' + adminAddress.slice(2);
    mockProvider.getStorage.mockResolvedValue(adminSlotValue);

    const request = new NextRequest('http://localhost:3000/api/discover-controlling-wallet', {
      method: 'POST',
      body: JSON.stringify({ did: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.controllingWallet).toBe(adminAddress);
  });

  it('returns 404 when no controlling wallet is found', async () => {
    // Mock all methods to fail or return zero address
    mockContract.owner.mockResolvedValue('0x0000000000000000000000000000000000000000');
    mockContract.admin.mockResolvedValue('0x0000000000000000000000000000000000000000');
    mockContract.getOwner.mockResolvedValue('0x0000000000000000000000000000000000000000');
    mockProvider.getStorage.mockResolvedValue('0x0000000000000000000000000000000000000000000000000000000000000000');

    const request = new NextRequest('http://localhost:3000/api/discover-controlling-wallet', {
      method: 'POST',
      body: JSON.stringify({ did: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Could not discover controlling wallet');
  });

  it('handles internal errors gracefully', async () => {
    // Mock JSON parsing to throw
    const request = new NextRequest('http://localhost:3000/api/discover-controlling-wallet', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('handles provider errors gracefully', async () => {
    mockContract.owner.mockRejectedValue(new Error('RPC Error'));

    const request = new NextRequest('http://localhost:3000/api/discover-controlling-wallet', {
      method: 'POST',
      body: JSON.stringify({ did: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404); // When owner() fails, it tries other methods, then returns 404
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Could not discover controlling wallet');
  });

  it('ignores zero address from contract functions', async () => {
    mockContract.owner.mockResolvedValue('0x0000000000000000000000000000000000000000');
    mockContract.admin.mockResolvedValue('0x0000000000000000000000000000000000000000');
    mockContract.getOwner.mockResolvedValue('0x0000000000000000000000000000000000000000');
    mockProvider.getStorage.mockResolvedValue('0x0000000000000000000000000000000000000000000000000000000000000000');

    const request = new NextRequest('http://localhost:3000/api/discover-controlling-wallet', {
      method: 'POST',
      body: JSON.stringify({ did: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.ok).toBe(false);
  });

  it('ignores zero address from EIP-1967 slot', async () => {
    mockContract.owner.mockRejectedValue(new Error('No owner function'));
    mockContract.admin.mockRejectedValue(new Error('No admin function'));
    mockContract.getOwner.mockRejectedValue(new Error('No getOwner function'));
    mockProvider.getStorage.mockResolvedValue('0x0000000000000000000000000000000000000000000000000000000000000000');

    const request = new NextRequest('http://localhost:3000/api/discover-controlling-wallet', {
      method: 'POST',
      body: JSON.stringify({ did: 'did:pkh:eip155:1:0x1234567890123456789012345678901234567890' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.ok).toBe(false);
  });
});
