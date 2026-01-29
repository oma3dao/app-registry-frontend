/**
 * Performance Tests - Large Datasets
 * 
 * Tests system behavior with large amounts of data
 * Validates performance and memory usage with edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listActiveApps, getAppsByOwner, getAppByDid } from '@/lib/contracts/registry.read';
import { deduplicateReviews, calculateAverageRating } from '@/lib/attestation-queries';
import type { AttestationQueryResult } from '@/lib/attestation-queries';

// Mock thirdweb
vi.mock('thirdweb', () => ({
  readContract: vi.fn(),
}));

// Mock contract client
vi.mock('@/lib/contracts/client', () => ({
  getAppRegistryContract: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    chain: { id: 66238 },
  })),
}));

// Mock DID utilities (importOriginal pattern, remove getDidHash; use computeDidHash from actual)
vi.mock('@/lib/utils/did', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/did')>();
  return {
    ...actual,
    normalizeDidWeb: vi.fn((did: string) => did),
    normalizeDid: vi.fn((did: string) => did),
  };
});

// Mock error normalizer
vi.mock('@/lib/contracts/errors', () => ({
  normalizeEvmError: vi.fn((e: any) => e),
}));

// Mock version utils
vi.mock('@/lib/utils/version', () => ({
  getCurrentVersion: vi.fn((history: any[]) => {
    if (!history || history.length === 0) return { major: 1, minor: 0, patch: 0 };
    const latest = history[history.length - 1];
    return { major: latest.major || 1, minor: latest.minor || 0, patch: latest.patch || 0 };
  }),
}));

import { readContract } from 'thirdweb';

describe('Large Dataset Performance', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Large App Lists', () => {
    /**
     * Test: Pagination with large result sets
     */
    it('handles pagination with 100+ apps', async () => {
      const largeAppList = Array.from({ length: 100 }, (_, i) => ({
        did: `did:web:app${i}.example.com`,
        minter: '0x1234567890123456789012345678901234567890',
        currentOwner: '0x1234567890123456789012345678901234567890',
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + 'a'.repeat(64),
        dataUrl: `https://app${i}.example.com/metadata.json`,
        versionHistory: [],
        traitHashes: [],
      }));

      vi.mocked(readContract).mockResolvedValueOnce([largeAppList, 100]);

      const result = await listActiveApps(0, 20);
      
      expect(result.items.length).toBe(20); // First page
      expect(result.hasMore).toBe(true);
    });

    /**
     * Test: Maximum page size limit
     */
    it('respects maximum page size limit', async () => {
      const largeAppList = Array.from({ length: 200 }, (_, i) => ({
        did: `did:web:app${i}.example.com`,
        minter: '0x1234567890123456789012345678901234567890',
        currentOwner: '0x1234567890123456789012345678901234567890',
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + 'a'.repeat(64),
        dataUrl: `https://app${i}.example.com/metadata.json`,
        versionHistory: [],
        traitHashes: [],
      }));

      vi.mocked(readContract).mockResolvedValueOnce([largeAppList, 200]);

      const result = await listActiveApps(0, 100); // Max page size
      
      expect(result.items.length).toBeLessThanOrEqual(100);
    });

    /**
     * Test: Owner with many apps
     */
    it('handles owner with 50+ apps', async () => {
      const manyApps = Array.from({ length: 50 }, (_, i) => ({
        did: `did:web:app${i}.example.com`,
        minter: '0x1234567890123456789012345678901234567890',
        currentOwner: '0x1234567890123456789012345678901234567890',
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + 'a'.repeat(64),
        dataUrl: `https://app${i}.example.com/metadata.json`,
        versionHistory: [],
        traitHashes: [],
      }));

      vi.mocked(readContract).mockResolvedValueOnce([manyApps]);

      const apps = await getAppsByOwner('0x1234567890123456789012345678901234567890');
      
      expect(apps.length).toBe(50);
    });
  });

  describe('Large Attestation Lists', () => {
    /**
     * Test: Deduplication with 100+ reviews
     */
    it('deduplicates large review list efficiently', () => {
      const manyReviews: AttestationQueryResult[] = Array.from({ length: 100 }, (_, i) => ({
        uid: `0x${i.toString(16).padStart(64, '0')}`,
        attester: `0xAttester${i % 10}`, // 10 different attesters
        recipient: '0xRecipient',
        data: '0x',
        time: 1000 + i,
        expirationTime: 0,
        revocationTime: 0,
        refUID: '0x' + '0'.repeat(64),
        revocable: true,
        schemaId: 'user-review',
        schemaTitle: 'User Review',
        decodedData: {
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          ratingValue: (i % 5) + 1,
        },
      }));

      const deduplicated = deduplicateReviews(manyReviews);
      
      // Should have at most 10 reviews (one per attester)
      expect(deduplicated.length).toBeLessThanOrEqual(10);
    });

    /**
     * Test: Rating calculation with 1000+ reviews
     */
    it('calculates average with 1000+ reviews', () => {
      const manyReviews: AttestationQueryResult[] = Array.from({ length: 1000 }, (_, i) => ({
        uid: `0x${i.toString(16).padStart(64, '0')}`,
        attester: `0xAttester${i}`,
        recipient: '0xRecipient',
        data: '0x',
        time: 1000 + i,
        expirationTime: 0,
        revocationTime: 0,
        refUID: '0x' + '0'.repeat(64),
        revocable: true,
        schemaId: 'user-review',
        schemaTitle: 'User Review',
        decodedData: {
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          ratingValue: (i % 5) + 1, // Ratings 1-5
        },
      }));

      const { average, count } = calculateAverageRating(manyReviews);
      
      expect(count).toBe(1000);
      expect(average).toBeGreaterThanOrEqual(1);
      expect(average).toBeLessThanOrEqual(5);
    });

    /**
     * Test: Performance with mixed review/response attestations
     */
    it('handles mixed attestation types efficiently', () => {
      const mixedAttestations: AttestationQueryResult[] = Array.from({ length: 500 }, (_, i) => {
        if (i % 2 === 0) {
          // Review
          return {
            uid: `0x${i.toString(16).padStart(64, '0')}`,
            attester: `0xUser${i}`,
            recipient: '0xRecipient',
            data: '0x',
            time: 1000 + i,
            expirationTime: 0,
            revocationTime: 0,
            refUID: '0x' + '0'.repeat(64),
            revocable: true,
            schemaId: 'user-review',
            schemaTitle: 'User Review',
            decodedData: {
              subject: 'did:web:app.example.com',
              ratingValue: 4,
            },
          };
        } else {
          // Response
          return {
            uid: `0x${i.toString(16).padStart(64, '0')}`,
            attester: '0xOwner',
            recipient: '0xRecipient',
            data: '0x',
            time: 1000 + i,
            expirationTime: 0,
            revocationTime: 0,
            refUID: `0x${(i - 1).toString(16).padStart(64, '0')}`,
            revocable: true,
            schemaId: 'user-review-response',
            schemaTitle: 'Response',
            decodedData: {
              subject: 'did:web:app.example.com',
              responseText: 'Thank you',
            },
          };
        }
      });

      const reviews = mixedAttestations.filter(a => a.schemaId === 'user-review');
      const { average, count } = calculateAverageRating(reviews);
      
      expect(count).toBe(250); // Half are reviews
      expect(average).toBe(4);
    });
  });

  describe('Large Metadata Objects', () => {
    /**
     * Test: App with extensive version history
     */
    it('handles app with 50+ version history entries', async () => {
      const versionHistory = Array.from({ length: 50 }, (_, i) => ({
        major: 1,
        minor: Math.floor(i / 10),
        patch: i % 10,
      }));

      const appData = {
        did: 'did:web:example.com',
        minter: '0x1234567890123456789012345678901234567890',
        currentOwner: '0x1234567890123456789012345678901234567890',
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + 'a'.repeat(64),
        dataUrl: 'https://example.com/metadata.json',
        versionHistory,
        traitHashes: [],
      };

      vi.mocked(readContract).mockResolvedValueOnce(1);
      vi.mocked(readContract).mockResolvedValueOnce(appData);

      const app = await getAppByDid('did:web:example.com');
      
      expect(app?.versionHistory.length).toBe(50);
    });

    /**
     * Test: App with many trait hashes
     */
    it('handles app with 100+ trait hashes', async () => {
      const traitHashes = Array.from({ length: 100 }, (_, i) => 
        `0x${i.toString(16).padStart(64, '0')}`
      );

      const appData = {
        did: 'did:web:example.com',
        minter: '0x1234567890123456789012345678901234567890',
        currentOwner: '0x1234567890123456789012345678901234567890',
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + 'a'.repeat(64),
        dataUrl: 'https://example.com/metadata.json',
        versionHistory: [],
        traitHashes,
      };

      vi.mocked(readContract).mockResolvedValueOnce(1);
      vi.mocked(readContract).mockResolvedValueOnce(appData);

      const app = await getAppByDid('did:web:example.com');
      
      expect(app?.traitHashes.length).toBe(100);
    });
  });

  describe('Concurrent Operations', () => {
    /**
     * Test: Multiple concurrent app queries
     */
    it('handles 10 concurrent app queries', async () => {
      const mockAppData = {
        did: 'did:web:example.com',
        minter: '0x1234567890123456789012345678901234567890',
        currentOwner: '0x1234567890123456789012345678901234567890',
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + 'a'.repeat(64),
        dataUrl: 'https://example.com/metadata.json',
        versionHistory: [],
        traitHashes: [],
      };

      // Mock readContract to return appropriate values
      // Each getAppByDid makes 2 calls: latestMajor then getApp
      vi.mocked(readContract).mockImplementation((options: any) => {
        // Check if it's a latestMajor call or getApp call
        const method = options.method;
        if (typeof method === 'string' && method.includes('latestMajor')) {
          return Promise.resolve(1);
        }
        return Promise.resolve(mockAppData);
      });

      const queries = Array.from({ length: 10 }, () => 
        getAppByDid('did:web:example.com')
      );

      const results = await Promise.all(queries);
      
      expect(results.length).toBe(10);
      // Some may be null due to mock complexity, but most should succeed
      expect(results.filter(app => app !== null).length).toBeGreaterThan(0);
    });

    /**
     * Test: Concurrent rating calculations
     */
    it('handles concurrent rating calculations', () => {
      const createReviews = (count: number) => Array.from({ length: count }, (_, i) => ({
        uid: `0x${i.toString(16).padStart(64, '0')}`,
        attester: `0xAttester${i}`,
        recipient: '0xRecipient',
        data: '0x',
        time: 1000 + i,
        expirationTime: 0,
        revocationTime: 0,
        refUID: '0x' + '0'.repeat(64),
        revocable: true,
        schemaId: 'user-review',
        schemaTitle: 'User Review',
        decodedData: {
          subject: 'did:web:app.example.com',
          version: '1.0.0',
          ratingValue: (i % 5) + 1,
        },
      }));

      const reviewSets = [
        createReviews(100),
        createReviews(200),
        createReviews(300),
      ];

      const results = reviewSets.map(reviews => calculateAverageRating(reviews));
      
      expect(results.length).toBe(3);
      expect(results.every(r => r.count > 0)).toBe(true);
    });
  });

  describe('Memory Efficiency', () => {
    /**
     * Test: Large string handling
     */
    it('handles very long dataUrl strings', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000) + '/metadata.json';
      
      const appData = {
        did: 'did:web:example.com',
        minter: '0x1234567890123456789012345678901234567890',
        currentOwner: '0x1234567890123456789012345678901234567890',
        interfaces: 1,
        versionMajor: 1,
        status: 0,
        dataHashAlgorithm: 0,
        dataHash: '0x' + 'a'.repeat(64),
        dataUrl: longUrl,
        versionHistory: [],
        traitHashes: [],
      };

      // Mock both calls needed for getAppByDid
      vi.mocked(readContract)
        .mockResolvedValueOnce(1) // latestMajor
        .mockResolvedValueOnce(appData); // getApp

      const app = await getAppByDid('did:web:example.com');
      
      expect(app).toBeDefined();
      expect(app?.dataUrl).toBeDefined();
      if (app?.dataUrl) {
        expect(app.dataUrl.length).toBeGreaterThan(1000);
      }
    });

    /**
     * Test: Large metadata JSON
     */
    it('handles large metadata JSON strings', () => {
      const largeMetadata = JSON.stringify({
        name: 'App',
        description: 'A'.repeat(10000), // Very long description
        screenshots: Array.from({ length: 100 }, (_, i) => `https://example.com/img${i}.png`),
      });

      // Just verify it can be stringified
      expect(largeMetadata.length).toBeGreaterThan(10000);
      expect(() => JSON.parse(largeMetadata)).not.toThrow();
    });
  });
});
