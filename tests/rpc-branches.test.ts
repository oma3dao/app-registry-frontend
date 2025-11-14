// tests/rpc-branches.test.ts
// Additional branch coverage tests for RPC utility functions
// Covers edge cases and branches not fully tested in the main rpc test suite

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getRpcUrl } from '@/lib/rpc';

describe('RPC utilities - Branch Coverage', () => {
  let originalEnv: string | undefined;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    originalEnv = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = originalEnv;
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  // This test covers lines 90-93: hardcoded OMAChain Testnet
  it('returns hardcoded RPC for OMAChain Testnet (chainId 66238)', () => {
    const url = getRpcUrl(66238);
    
    expect(url).toBe('https://rpc.testnet.chain.oma3.org/');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[rpc] Using hardcoded OMAChain Testnet RPC for chainId 66238'
    );
  });

  // This test covers lines 95-98: hardcoded OMAChain Mainnet
  it('returns hardcoded RPC for OMAChain Mainnet (chainId 6623)', () => {
    const url = getRpcUrl(6623);
    
    expect(url).toBe('https://rpc.chain.oma3.org/');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[rpc] Using hardcoded OMAChain Mainnet RPC for chainId 6623'
    );
  });

  // This test covers lines 101-104: OMA chain with matching chainId and omaRpcUrl
  it('uses custom OMA chain RPC when chainId matches omaChainId', () => {
    const url = getRpcUrl(99999, 99999, 'https://custom-oma-chain.rpc');
    
    expect(url).toBe('https://custom-oma-chain.rpc');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[rpc] Using OMA chain RPC for chainId 99999'
    );
  });

  // This test covers the branch where omaChainId matches but omaRpcUrl is not provided
  it('does not use OMA chain when omaRpcUrl is missing', () => {
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = 'test-client';
    
    // omaChainId matches but no omaRpcUrl
    const url = getRpcUrl(12345, 12345);
    
    // Should fall through to Thirdweb RPC (line 101 condition fails due to !omaRpcUrl)
    expect(url).toBe('https://12345.rpc.thirdweb.com/test-client');
  });

  // This test covers the branch where omaChainId is undefined (line 101)
  it('does not use OMA chain when omaChainId is undefined', () => {
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = 'test-client';
    
    // omaChainId is undefined
    const url = getRpcUrl(12345, undefined, 'https://should-not-be-used.rpc');
    
    // Should use Thirdweb RPC instead
    expect(url).toBe('https://12345.rpc.thirdweb.com/test-client');
  });

  // This test covers lines 109-117: Thirdweb RPC Edge path with clientId present
  it('uses Thirdweb RPC when clientId is available', () => {
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = 'my-client-id';
    
    const url = getRpcUrl(1);
    
    expect(url).toBe('https://1.rpc.thirdweb.com/my-client-id');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[rpc] Using Thirdweb RPC Edge for chainId 1'
    );
  });

  // This test covers lines 123-126: localhost fallback for dev chains
  it('returns localhost for chainId 31337', () => {
    delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    
    const url = getRpcUrl(31337);
    
    expect(url).toBe('http://localhost:8545');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[rpc] Using localhost RPC for chainId 31337'
    );
  });

  // This test covers the localhost branch for chainId 1337
  it('returns localhost for chainId 1337', () => {
    delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    
    const url = getRpcUrl(1337);
    
    expect(url).toBe('http://localhost:8545');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[rpc] Using localhost RPC for chainId 1337'
    );
  });

  // This test covers lines 128-131: error thrown when no RPC provider is configured
  it('throws error when no RPC provider is configured for non-dev chains', () => {
    delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    
    expect(() => getRpcUrl(5000)).toThrow(
      'No RPC provider configured for chainId 5000. ' +
      'Set NEXT_PUBLIC_THIRDWEB_CLIENT_ID environment variable to use Thirdweb RPC Edge.'
    );
  });

  // This test verifies priority order: hardcoded OMA chains take precedence over custom OMA chain
  it('hardcoded OMAChain Testnet takes precedence over custom OMA config', () => {
    // Even if we pass custom OMA chain config, hardcoded should win
    const url = getRpcUrl(66238, 66238, 'https://custom-should-be-ignored.rpc');
    
    expect(url).toBe('https://rpc.testnet.chain.oma3.org/');
  });

  // This test verifies priority order: hardcoded OMA mainnet takes precedence
  it('hardcoded OMAChain Mainnet takes precedence over custom OMA config', () => {
    const url = getRpcUrl(6623, 6623, 'https://custom-should-be-ignored.rpc');
    
    expect(url).toBe('https://rpc.chain.oma3.org/');
  });

  // This test covers the case where thirdwebClientId is present but empty
  it('handles empty thirdwebClientId string', () => {
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = '';
    
    // Should fall through to localhost for dev chains
    const url = getRpcUrl(31337);
    expect(url).toBe('http://localhost:8545');
  });

  // This test covers the fallback path when Thirdweb URL can't be generated
  it('falls through when Thirdweb client ID is whitespace only', () => {
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = '   ';
    
    // For dev chains, should use localhost
    const url = getRpcUrl(1337);
    expect(url).toBe('http://localhost:8545');
  });

  // This test verifies console.log calls for different scenarios
  it('logs correct messages for each RPC provider path', () => {
    // Test hardcoded OMA testnet logging
    getRpcUrl(66238);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[rpc] Using hardcoded OMAChain Testnet RPC for chainId 66238'
    );

    consoleLogSpy.mockClear();

    // Test hardcoded OMA mainnet logging
    getRpcUrl(6623);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[rpc] Using hardcoded OMAChain Mainnet RPC for chainId 6623'
    );

    consoleLogSpy.mockClear();

    // Test custom OMA chain logging
    getRpcUrl(55555, 55555, 'https://test.rpc');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[rpc] Using OMA chain RPC for chainId 55555'
    );

    consoleLogSpy.mockClear();

    // Test Thirdweb logging
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = 'test';
    getRpcUrl(1);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[rpc] Using Thirdweb RPC Edge for chainId 1'
    );

    consoleLogSpy.mockClear();

    // Test localhost logging
    delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    getRpcUrl(31337);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[rpc] Using localhost RPC for chainId 31337'
    );
  });

  // This test verifies all conditional branches in the if-else chain
  it('evaluates all priority conditions in correct order', () => {
    // Priority 1: Hardcoded OMAChain Testnet (chainId === 66238)
    let url = getRpcUrl(66238, 123, 'https://ignored.rpc');
    expect(url).toBe('https://rpc.testnet.chain.oma3.org/');

    // Priority 2: Hardcoded OMAChain Mainnet (chainId === 6623)
    url = getRpcUrl(6623, 123, 'https://ignored.rpc');
    expect(url).toBe('https://rpc.chain.oma3.org/');

    // Priority 3: Custom OMA chain (omaChainId matches && omaRpcUrl provided)
    url = getRpcUrl(777, 777, 'https://custom-oma.rpc');
    expect(url).toBe('https://custom-oma.rpc');

    // Priority 4: Thirdweb RPC Edge (clientId present)
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = 'client';
    url = getRpcUrl(888);
    expect(url).toBe('https://888.rpc.thirdweb.com/client');

    // Priority 5: Localhost for dev chains (chainId === 31337 or 1337)
    delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    url = getRpcUrl(31337);
    expect(url).toBe('http://localhost:8545');

    url = getRpcUrl(1337);
    expect(url).toBe('http://localhost:8545');

    // Priority 6: Throw error (no provider available)
    expect(() => getRpcUrl(999)).toThrow('No RPC provider configured');
  });
});

