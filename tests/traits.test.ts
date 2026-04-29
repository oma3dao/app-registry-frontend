import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashTrait, hashTraits } from '@/lib/utils/traits';

// Mock ethers
vi.mock('ethers', () => ({
  ethers: {
    id: (value: string) => {
      // Simple mock implementation using a deterministic hash
      // In real code, ethers.id returns keccak256 hash
      let hash = 0;
      for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
      }
      // Convert to hex string with 64 characters (32 bytes)
      const hexHash = Math.abs(hash).toString(16).padStart(64, '0');
      return `0x${hexHash}`;
    },
  },
}));

describe('traits utilities', () => {
  describe('hashTrait', () => {
    it('hashes a single trait to the expected bytes32 value', () => {
      const hash = hashTrait('example-trait');
      expect(hash).toBe('0x00000000000000000000000000000000000000000000000000000000060adfeb');
    });

    it('produces consistent hashes for same input', () => {
      const trait = 'test-trait';
      const hash1 = hashTrait(trait);
      const hash2 = hashTrait(trait);
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different inputs', () => {
      const hash1 = hashTrait('trait1');
      const hash2 = hashTrait('trait2');
      expect(hash1).not.toBe(hash2);
    });

    it('handles empty string', () => {
      const hash = hashTrait('');
      expect(hash).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('handles special characters with expected values', () => {
      expect(hashTrait('trait-with-dash')).toBe('0x000000000000000000000000000000000000000000000000000000006fdb073a');
      expect(hashTrait('trait_with_underscore')).toBe('0x000000000000000000000000000000000000000000000000000000001f0cfba2');
      expect(hashTrait('trait.with.dot')).toBe('0x00000000000000000000000000000000000000000000000000000000579b43ff');
    });

    it('handles Unicode characters', () => {
      const hash = hashTrait('trait-émoji-🎉');
      expect(hash).toBe('0x0000000000000000000000000000000000000000000000000000000021c82d8f');
    });

    it('is case-sensitive', () => {
      const hash1 = hashTrait('trait');
      const hash2 = hashTrait('TRAIT');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('hashTraits', () => {
    it('hashes an array of traits to expected values', () => {
      const traits = ['trait1', 'trait2', 'trait3'];
      const hashes = hashTraits(traits);
      
      expect(hashes).toHaveLength(3);
      expect(hashes[0]).toBe(hashTrait('trait1'));
      expect(hashes[1]).toBe(hashTrait('trait2'));
      expect(hashes[2]).toBe(hashTrait('trait3'));
    });

    it('returns empty array for empty input', () => {
      const hashes = hashTraits([]);
      expect(hashes).toEqual([]);
    });

    it('produces consistent results', () => {
      const traits = ['alpha', 'beta', 'gamma'];
      const hashes1 = hashTraits(traits);
      const hashes2 = hashTraits(traits);
      expect(hashes1).toEqual(hashes2);
    });

    it('maintains order of hashes', () => {
      const traits = ['first', 'second', 'third'];
      const hashes = hashTraits(traits);
      
      // Verify each hash corresponds to correct trait
      expect(hashes[0]).toBe(hashTrait('first'));
      expect(hashes[1]).toBe(hashTrait('second'));
      expect(hashes[2]).toBe(hashTrait('third'));
    });

    it('handles single trait array', () => {
      const hashes = hashTraits(['single']);
      expect(hashes).toHaveLength(1);
      expect(hashes[0]).toBe(hashTrait('single'));
    });

    it('handles array with duplicate traits', () => {
      const traits = ['duplicate', 'duplicate', 'unique'];
      const hashes = hashTraits(traits);
      
      expect(hashes).toHaveLength(3);
      // Duplicate traits should have same hash
      expect(hashes[0]).toBe(hashes[1]);
      // Unique trait should have different hash
      expect(hashes[2]).not.toBe(hashes[0]);
    });

    it('handles mixed content traits with expected values', () => {
      const traits = [
        'simple',
        'with-dash',
        'with_underscore',
        'with.dot',
        'UPPERCASE',
        'with spaces',
        '',
      ];
      const hashes = hashTraits(traits);
      
      expect(hashes).toHaveLength(traits.length);
      traits.forEach((trait, i) => {
        expect(hashes[i]).toBe(hashTrait(trait));
      });
    });
  });

  describe('integration tests', () => {
    it('hashTraits matches individual hashTrait calls', () => {
      const traits = ['one', 'two', 'three'];
      const batchHashes = hashTraits(traits);
      
      traits.forEach((trait, index) => {
        const individualHash = hashTrait(trait);
        expect(batchHashes[index]).toBe(individualHash);
      });
    });

    it('hashes standard interface names to expected values', () => {
      const interfaces = [
        'ERC20',
        'ERC721',
        'ERC1155',
        'IAccessControl',
        'IOwnable',
      ];
      
      const hashes = hashTraits(interfaces);
      expect(hashes).toHaveLength(interfaces.length);
      interfaces.forEach((name, i) => {
        expect(hashes[i]).toBe(hashTrait(name));
      });
    });
  });
});

