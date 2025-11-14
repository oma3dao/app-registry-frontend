import { describe, it, expect } from 'vitest';
import { getChainById, searchChains, ALL_CHAINS } from '@/lib/utils/caip10/all-chains';

describe('all-chains utilities', () => {
  describe('getChainById', () => {
    it('returns chain info for valid chain ID', () => {
      // Use a known chain ID from the list (Ethereum mainnet is 1)
      const chain = getChainById(1);
      expect(chain).toBeDefined();
      expect(chain?.chainId).toBe(1);
      expect(chain?.name).toBeDefined();
      expect(chain?.testnet).toBe(false);
    });

    it('returns undefined for non-existent chain ID', () => {
      // Use a very large chain ID that doesn't exist
      const chain = getChainById(999999);
      expect(chain).toBeUndefined();
    });

    it('returns undefined for negative chain ID', () => {
      const chain = getChainById(-1);
      expect(chain).toBeUndefined();
    });

    it('returns undefined for zero chain ID', () => {
      const chain = getChainById(0);
      expect(chain).toBeUndefined();
    });
  });

  describe('searchChains', () => {
    it('returns all chains for empty query', () => {
      const results = searchChains('');
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBe(ALL_CHAINS.length);
    });

    it('returns all chains for whitespace-only query', () => {
      const results = searchChains('   ');
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBe(ALL_CHAINS.length);
    });

    it('searches by chain name', () => {
      const results = searchChains('ethereum');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(c => c.name.toLowerCase().includes('ethereum'))).toBe(true);
    });

    it('searches by chain ID', () => {
      const results = searchChains('1');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(c => c.chainId === 1)).toBe(true);
    });

    it('returns empty array for non-matching query', () => {
      const results = searchChains('nonexistentchain12345');
      expect(results.length).toBe(0);
    });

    it('is case-insensitive', () => {
      const lowerResults = searchChains('ethereum');
      const upperResults = searchChains('ETHEREUM');
      expect(lowerResults.length).toBe(upperResults.length);
    });
  });
});

