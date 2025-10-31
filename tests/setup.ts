// tests/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock environment variables for tests
process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = 'test-client-id';

// Mock window.location to prevent navigation errors
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
  writable: true,
});

// Mock ethers library with realistic EIP-55 checksumming
vi.mock('ethers', () => {
  // Simple EIP-55 checksum implementation for testing
  const checksumAddress = (addr: string): string => {
    if (!addr || typeof addr !== 'string') {
      throw new Error('Invalid address');
    }
    
    // Handle uppercase 0X prefix
    if (addr.startsWith('0X')) {
      throw new Error('Invalid address');
    }
    
    if (!addr.startsWith('0x')) {
      throw new Error('Invalid address');
    }
    
    const hex = addr.slice(2);
    if (hex.length !== 40) {
      throw new Error('Invalid address');
    }
    
    if (!/^[0-9a-fA-F]{40}$/.test(hex)) {
      throw new Error('Invalid address');
    }
    
    // For testing, we'll use a simple deterministic checksum
    // In production, ethers uses keccak256 hash
    const lower = hex.toLowerCase();
    let checksummed = '0x';
    
    for (let i = 0; i < lower.length; i++) {
      const char = lower[i];
      // Simple rule: uppercase if position is even and char is a letter
      if (i % 2 === 0 && char >= 'a' && char <= 'f') {
        checksummed += char.toUpperCase();
      } else {
        checksummed += char;
      }
    }
    
    return checksummed;
  };
  
  const isValidAddress = (addr: string): boolean => {
    try {
      if (!addr || typeof addr !== 'string') return false;
      if (addr.startsWith('0X')) return false; // Uppercase 0X is invalid
      if (!addr.startsWith('0x')) return false;
      const hex = addr.slice(2);
      if (hex.length !== 40) return false;
      if (!/^[0-9a-fA-F]{40}$/.test(hex)) return false;
      return true;
    } catch {
      return false;
    }
  };
  
  // Mock keccak256 hashing (ethers.id)
  const mockId = (text: string): string => {
    // Simple deterministic hash for testing
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex with padding to 64 characters (32 bytes)
    const hexHash = Math.abs(hash).toString(16).padStart(64, '0');
    return '0x' + hexHash;
  };

  return {
    ethers: {
      isAddress: isValidAddress,
      getAddress: checksumAddress,
      id: mockId,
      Contract: vi.fn(),
      providers: {
        JsonRpcProvider: vi.fn(),
      },
    },
    isAddress: isValidAddress,
    getAddress: checksumAddress,
    id: mockId,
  };
});

// Mock thirdweb client to prevent initialization errors
vi.mock('thirdweb', () => ({
  createThirdwebClient: vi.fn(() => ({
    // Mock client methods as needed
  })),
  getContract: vi.fn(),
  readContract: vi.fn(),
  sendTransaction: vi.fn(),
}));

// Mock registry read functions
vi.mock('src/lib/contracts/registry.read', () => ({
  getAppByDid: vi.fn(() => Promise.resolve(null)),
  getAppsByOwner: vi.fn(() => Promise.resolve([])),
  listApps: vi.fn(() => Promise.resolve([])),
  getTotalApps: vi.fn(() => Promise.resolve(0)),
  searchByDid: vi.fn(() => Promise.resolve([])),
}));

// Mock registry write functions
vi.mock('src/lib/contracts/registry.write', () => ({
  prepareMintApp: vi.fn(() => Promise.resolve({})),
  prepareUpdateStatus: vi.fn(() => Promise.resolve({})),
  prepareUpdateApp: vi.fn(() => Promise.resolve({})),
}));

// Mock metadata write functions
vi.mock('src/lib/contracts/metadata.write', () => ({
  prepareSetMetadata: vi.fn(() => Promise.resolve({})),
}));

// Mock registry hooks
vi.mock('src/lib/contracts/registry.hooks', () => ({
  useApp: vi.fn(() => ({ data: null, isLoading: false, error: null, refetch: vi.fn() })),
  useAppsByOwner: vi.fn(() => ({ data: [], isLoading: false, error: null })),
  useAppsList: vi.fn(() => ({ data: { items: [] }, isLoading: false, error: null, refetch: vi.fn() })),
  useTotalApps: vi.fn(() => ({ data: 0, isLoading: false, error: null })),
  useMintApp: vi.fn(() => ({ mint: vi.fn(), isPending: false, error: null, txHash: null })),
  useUpdateStatus: vi.fn(() => ({ updateStatus: vi.fn(), isPending: false, error: null, txHash: null })),
  useUpdateApp: vi.fn(() => ({ updateApp: vi.fn(), isPending: false, error: null, txHash: null })),
  useSearchByDid: vi.fn(() => ({ data: [], isLoading: false, error: null })),
}));

// Mock contracts index
vi.mock('src/lib/contracts', () => ({
  useAppsByOwner: vi.fn(() => ({ data: [], isLoading: false, error: null })),
  useMintApp: vi.fn(() => ({ mint: vi.fn(), isPending: false, error: null, txHash: null })),
  useUpdateApp: vi.fn(() => ({ updateApp: vi.fn(), isPending: false, error: null, txHash: null })),
  useUpdateStatus: vi.fn(() => ({ updateStatus: vi.fn(), isPending: false, error: null, txHash: null })),
  useSetMetadata: vi.fn(() => ({ setMetadata: vi.fn(), isPending: false, error: null, txHash: null })),
}));

// Mock thirdweb react hooks
vi.mock('thirdweb/react', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, any>;
  return {
    ...actual,
    useActiveAccount: vi.fn(() => ({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    })),
    useConnect: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    useDisconnect: vi.fn(() => ({
      disconnect: vi.fn(),
    })),
    ConnectButton: React.createElement('button', { 'data-testid': 'connect-button' }, 'Mock Connect'),
    ThirdwebConnectButton: React.createElement('button', { 'data-testid': 'thirdweb-connect-button' }, 'Mock Thirdweb Connect'),
  };
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock schema/mapping module
vi.mock('@/schema/mapping', () => ({
  isOurHostedUrl: vi.fn((url?: string) => {
    if (!url) return false;
    return url.includes('omatrust.org') || url.includes('oma3.org') || url.includes('localhost');
  }),
  toMintAppInput: vi.fn(),
  toUpdateAppInput: vi.fn(),
}));

// Mock DOM methods that are not available in jsdom
Element.prototype.scrollIntoView = vi.fn();
HTMLElement.prototype.scrollTo = vi.fn();

// Mock scrollTo for all elements
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
} 