import { describe, it, expect, vi } from 'vitest';
import { 
  getAppRegistryContract, 
  getAppMetadataContract, 
  getResolverContract,
  getActiveChain,
} from '@/lib/contracts/client';

// Mock env
vi.mock('@/config/env', () => ({
  env: {
    activeChain: {
      id: 31337,
      name: 'Localhost',
      rpc: 'http://localhost:8545',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      blockExplorers: [{ name: 'Local Explorer', url: 'http://localhost' }],
    },
    registryAddress: '0x1111111111111111111111111111111111111111',
    metadataAddress: '0x2222222222222222222222222222222222222222',
    resolverAddress: '0x3333333333333333333333333333333333333333',
  },
}));

// Mock app client
vi.mock('@/app/client', () => ({
  client: { clientId: 'mocked-client-id' },
}));

// Mock thirdweb
vi.mock('thirdweb', () => ({
  getContract: vi.fn((params) => ({
    address: params.address,
    chain: params.chain,
    client: params.client,
  })),
}));

// Mock defineChain from thirdweb/chains
vi.mock('thirdweb/chains', () => ({
  defineChain: vi.fn((params) => ({
    id: params.id,
    name: params.name,
    rpc: params.rpc,
  })),
}));

// Mock ABIs
vi.mock('@/lib/contracts/abi/registry.abi', () => ({
  appRegistryAbi: [{ type: 'function', name: 'mint' }],
}));

vi.mock('@/lib/contracts/abi/metadata.abi', () => ({
  appMetadataAbi: [{ type: 'function', name: 'setMetadataJson' }],
}));

vi.mock('@/lib/contracts/abi/resolver.abi', () => ({
  resolverAbi: [{ type: 'function', name: 'resolve' }],
}));

describe('Contract Client Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveChain', () => {
    // Tests chain configuration
    it('returns properly configured chain from environment', () => {
      const chain = getActiveChain();

      expect(chain).toBeDefined();
      expect(chain.id).toBe(31337);
      expect(chain.name).toBe('Localhost');
    });

    // Tests chain includes all required properties
    it('includes all required chain properties', () => {
      const chain = getActiveChain();

      expect(chain.id).toBe(31337);
      expect(chain.name).toBe('Localhost');
      expect(chain.rpc).toBe('http://localhost:8545');
    });
  });

  describe('getAppRegistryContract', () => {
    // Tests registry contract creation
    it('creates registry contract with correct configuration', () => {
      const contract = getAppRegistryContract();

      expect(contract).toBeDefined();
      expect(contract.address).toBe('0x1111111111111111111111111111111111111111');
      expect(contract.chain).toBeDefined();
      expect(contract.client).toBeDefined();
    });

    // Tests chain configuration
    it('uses correct chain configuration', () => {
      const contract = getAppRegistryContract();

      expect(contract.chain.id).toBe(31337);
    });

    // Tests contract has client
    it('includes thirdweb client', () => {
      const contract = getAppRegistryContract();

      expect(contract.client).toBeDefined();
      expect(contract.client.clientId).toBe('mocked-client-id');
    });
  });

  describe('getAppMetadataContract', () => {
    // Tests metadata contract creation
    it('creates metadata contract with correct configuration', () => {
      const contract = getAppMetadataContract();

      expect(contract).toBeDefined();
      expect(contract.address).toBe('0x2222222222222222222222222222222222222222');
      expect(contract.chain).toBeDefined();
      expect(contract.client).toBeDefined();
    });

    // Tests chain configuration
    it('uses correct chain configuration', () => {
      const contract = getAppMetadataContract();

      expect(contract.chain.id).toBe(31337);
    });

    // Tests contract has client
    it('includes thirdweb client', () => {
      const contract = getAppMetadataContract();

      expect(contract.client).toBeDefined();
    });
  });

  describe('getResolverContract', () => {
    // Tests resolver contract creation
    it('creates resolver contract with correct configuration', () => {
      const contract = getResolverContract();

      expect(contract).toBeDefined();
      expect(contract.address).toBe('0x3333333333333333333333333333333333333333');
      expect(contract.chain).toBeDefined();
      expect(contract.client).toBeDefined();
    });

    // Tests chain configuration
    it('uses correct chain configuration', () => {
      const contract = getResolverContract();

      expect(contract.chain.id).toBe(31337);
    });

    // Tests contract has client
    it('includes thirdweb client', () => {
      const contract = getResolverContract();

      expect(contract.client).toBeDefined();
    });
  });

  describe('Contract Integration', () => {
    // Tests all contracts use same client
    it('all contracts use the same thirdweb client', () => {
      const registry = getAppRegistryContract();
      const metadata = getAppMetadataContract();
      const resolver = getResolverContract();

      expect(registry.client).toEqual(metadata.client);
      expect(metadata.client).toEqual(resolver.client);
    });

    // Tests all contracts use same chain
    it('all contracts use the same chain configuration', () => {
      const registry = getAppRegistryContract();
      const metadata = getAppMetadataContract();
      const resolver = getResolverContract();

      expect(registry.chain).toEqual(metadata.chain);
      expect(metadata.chain).toEqual(resolver.chain);
    });

    // Tests correct contract addresses
    it('uses correct addresses for each contract', () => {
      const registry = getAppRegistryContract();
      const metadata = getAppMetadataContract();
      const resolver = getResolverContract();

      expect(registry.address).toBe('0x1111111111111111111111111111111111111111');
      expect(metadata.address).toBe('0x2222222222222222222222222222222222222222');
      expect(resolver.address).toBe('0x3333333333333333333333333333333333333333');
    });

    // Tests all contracts have proper structure
    it('all contracts have required properties', () => {
      const registry = getAppRegistryContract();
      const metadata = getAppMetadataContract();
      const resolver = getResolverContract();

      // All should have address, chain, and client
      [registry, metadata, resolver].forEach(contract => {
        expect(contract.address).toBeDefined();
        expect(contract.chain).toBeDefined();
        expect(contract.client).toBeDefined();
      });
    });
  });
});

