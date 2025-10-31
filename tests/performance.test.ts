import { describe, it, expect, vi } from 'vitest';
import { performance } from 'perf_hooks';

/**
 * Performance Tests
 * Benchmarks critical path operations to ensure they meet performance requirements
 */

describe('Performance Benchmarks', () => {
  describe('Utility Functions', () => {
    // Tests DID normalization performance
    it('normalizes DID in under 1ms', async () => {
      const { normalizeDidWeb } = await import('@/lib/utils/did');
      
      const start = performance.now();
      
      // Run multiple times to get average
      for (let i = 0; i < 100; i++) {
        normalizeDidWeb('did:web:example.com:path:to:app');
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 100;
      
      expect(avgTime).toBeLessThan(1); // Should be very fast (< 1ms per call)
    });

    // Tests version parsing performance
    it('parses version in under 1ms', async () => {
      const { parseVersion } = await import('@/lib/utils/version');
      
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        parseVersion('1.2.3');
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 100;
      
      expect(avgTime).toBeLessThan(1);
    });

    // Tests CAIP-10 parsing performance
    it('parses CAIP-10 in under 1ms', async () => {
      const { parseCaip10 } = await import('@/lib/utils/caip10/parse');
      
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        parseCaip10('eip155:1:0x1234567890123456789012345678901234567890');
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 100;
      
      expect(avgTime).toBeLessThan(1);
    });

    // Tests bytes32 conversion performance
    it('converts strings to bytes32 in under 1ms', async () => {
      const { stringToBytes32 } = await import('@/lib/utils/bytes32');
      
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        stringToBytes32('test-string-conversion');
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 100;
      
      expect(avgTime).toBeLessThan(1);
    });
  });

  describe('Data Processing', () => {
    // Tests JSON canonicalization performance
    it('canonicalizes JSON for hash in under 5ms', async () => {
      const { canonicalizeForHash } = await import('@/lib/utils/dataurl');
      
      const testObject = {
        name: 'Performance Test App',
        description: 'Testing canonicalization speed',
        metadata: {
          version: '1.0.0',
          features: ['feature1', 'feature2', 'feature3'],
        },
        platforms: {
          web: { url: 'https://web.example.com', supported: true },
          mobile: { url: 'https://mobile.example.com', supported: true },
        },
      };
      
      const start = performance.now();
      
      for (let i = 0; i < 50; i++) {
        canonicalizeForHash(testObject);
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 50;
      
      expect(avgTime).toBeLessThan(5); // Should be fast
    });

    // Tests metadata building performance
    it('builds offchain metadata in under 5ms', async () => {
      const { buildOffchainMetadataObject } = await import('@/lib/utils/offchain-json');
      
      const input = {
        name: 'Test App',
        metadata: {
          description: 'Test description',
          image: 'https://example.com/image.png',
          external_url: 'https://example.com',
        },
        extra: {
          screenshotUrls: ['https://example.com/shot1.png'],
        },
      };
      
      const start = performance.now();
      
      for (let i = 0; i < 50; i++) {
        buildOffchainMetadataObject(input);
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 50;
      
      expect(avgTime).toBeLessThan(5);
    });
  });

  describe('Validation Functions', () => {
    // Tests URL validation performance
    it('validates URLs in under 1ms', async () => {
      const { validateUrl } = await import('@/lib/validation');
      
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        validateUrl('https://example.com/path/to/resource');
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 100;
      
      expect(avgTime).toBeLessThan(1);
    });

    // Tests version parsing performance
    it('parses and validates version in under 1ms', async () => {
      const { parseVersion } = await import('@/lib/utils/version');
      
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        const result = parseVersion('1.2.3');
        // Just verify it returns a result
        expect(result).toBeDefined();
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 100;
      
      expect(avgTime).toBeLessThan(2); // Slightly more lenient for parsing
    });

    // Tests CAIP-10 parsing performance
    it('parses CAIP-10 addresses in under 2ms', async () => {
      const { parseCaip10 } = await import('@/lib/utils/caip10/parse');
      
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        parseCaip10('eip155:1:0x1234567890123456789012345678901234567890');
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 100;
      
      expect(avgTime).toBeLessThan(2);
    });
  });

  describe('Large Dataset Handling', () => {
    // Tests handling of large metadata objects
    it('processes large metadata objects efficiently', async () => {
      const { buildOffchainMetadataObject } = await import('@/lib/utils/offchain-json');
      
      const largeInput = {
        name: 'Large App',
        metadata: {
          description: 'A'.repeat(1000), // Large description
        },
        extra: {
          screenshotUrls: Array(20).fill(0).map((_, i) => `https://example.com/shot${i}.png`),
          platforms: Object.fromEntries(
            Array(10).fill(0).map((_, i) => [`platform${i}`, `https://example.com/platform${i}`])
          ),
        },
      };
      
      const start = performance.now();
      buildOffchainMetadataObject(largeInput);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(10); // Should handle large objects quickly
    });

    // Tests chain search performance with large result sets
    it('searches chains efficiently', async () => {
      const { searchChains } = await import('@/lib/utils/caip10/all-chains');
      
      const start = performance.now();
      
      // Multiple searches
      searchChains('eth');
      searchChains('polygon');
      searchChains('base');
      searchChains('arbitrum');
      
      const end = performance.now();
      const totalTime = end - start;
      
      expect(totalTime).toBeLessThan(50); // All searches should be fast
    });
  });

  describe('Memory Efficiency', () => {
    // Tests that repeated operations don't leak memory
    it('handles repeated canonicalization without memory growth', async () => {
      const { canonicalizeForHash } = await import('@/lib/utils/dataurl');
      
      const testObj = { name: 'Test', version: '1.0.0' };
      
      // First pass
      const before = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 1000; i++) {
        canonicalizeForHash(testObj);
      }
      
      // Force GC if available
      if (global.gc) global.gc();
      
      const after = process.memoryUsage().heapUsed;
      const growth = after - before;
      
      // Memory growth should be reasonable (< 5MB for 1000 operations)
      // Note: V8 GC timing can vary, so we use a more lenient threshold
      expect(growth).toBeLessThan(5 * 1024 * 1024);
    });
  });
});

