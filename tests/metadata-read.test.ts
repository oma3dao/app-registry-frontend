import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMetadata } from '@/lib/contracts/metadata.read';

// Mock thirdweb
vi.mock('thirdweb', () => ({
  readContract: vi.fn(),
}));

// Mock contract client
vi.mock('@/lib/contracts/client', () => ({
  getAppMetadataContract: vi.fn(() => ({
    address: '0x2222222222222222222222222222222222222222',
    chain: { id: 31337 },
  })),
}));

// Mock metadata utils
vi.mock('@/lib/contracts/metadata.utils', () => ({
  buildMetadataStructure: vi.fn((json: string) => {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }),
}));

import { readContract } from 'thirdweb';

describe('Metadata Read Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMetadata', () => {
    // Tests successful metadata retrieval
    it('retrieves metadata for versioned DID', async () => {
      const mockMetadataJson = JSON.stringify({
        name: 'Test App',
        description: 'A test application',
        image: 'https://example.com/image.png',
        version: '1.0.0',
      });

      (readContract as any).mockResolvedValueOnce(mockMetadataJson);

      const result = await getMetadata('did:web:example.com:v:1.0');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Test App');
      expect(result?.description).toBe('A test application');
      expect(result?.image).toBe('https://example.com/image.png');
    });

    // Tests handling of non-existent metadata
    it('returns null for non-existent metadata', async () => {
      (readContract as any).mockResolvedValueOnce('');

      const result = await getMetadata('did:web:nonexistent.com:v:1.0');

      expect(result).toBeNull();
    });

    // Tests handling of empty metadata
    it('returns null for empty metadata string', async () => {
      (readContract as any).mockResolvedValueOnce('   ');

      const result = await getMetadata('did:web:example.com:v:1.0');

      expect(result).toBeNull();
    });

    // Tests error handling
    it('handles contract errors gracefully', async () => {
      (readContract as any).mockRejectedValueOnce(new Error('Contract error'));

      const result = await getMetadata('did:web:example.com:v:1.0');

      expect(result).toBeNull();
    });

    // Tests handling of invalid JSON
    it('returns null for invalid JSON metadata', async () => {
      const { buildMetadataStructure } = await import('@/lib/contracts/metadata.utils');
      (buildMetadataStructure as any).mockReturnValueOnce(null);
      (readContract as any).mockResolvedValueOnce('invalid json');

      const result = await getMetadata('did:web:example.com:v:1.0');

      expect(result).toBeNull();
    });

    // Tests metadata with complete fields
    it('retrieves complete metadata structure', async () => {
      const mockMetadataJson = JSON.stringify({
        name: 'Complete App',
        description: 'Fully featured app',
        image: 'https://example.com/icon.png',
        external_url: 'https://example.com',
        screenshotUrls: [
          'https://example.com/shot1.png',
          'https://example.com/shot2.png',
        ],
        platforms: {
          windows: 'https://example.com/windows',
          mac: 'https://example.com/mac',
          linux: 'https://example.com/linux',
        },
        version: '2.5.1',
      });

      (readContract as any).mockResolvedValueOnce(mockMetadataJson);

      const result = await getMetadata('did:web:example.com:v:2.5');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Complete App');
      expect(result?.screenshotUrls).toHaveLength(2);
      expect(result?.platforms).toBeDefined();
    });

    // Tests different versioned DID formats
    it('handles various versioned DID formats', async () => {
      const testCases = [
        'did:web:example.com:v:1.0',
        'did:web:subdomain.example.com:v:2.5',
        'did:web:app.example.com:v:1.0.0',
      ];

      for (const versionedDid of testCases) {
        (readContract as any).mockResolvedValueOnce(JSON.stringify({ name: 'Test' }));
        
        const result = await getMetadata(versionedDid);
        
        expect(result).toBeDefined();
        expect(readContract).toHaveBeenCalledWith(
          expect.objectContaining({
            method: expect.stringContaining('getMetadataJson'),
            params: [versionedDid],
          })
        );
      }
    });
  });
});

