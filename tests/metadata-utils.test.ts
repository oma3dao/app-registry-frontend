import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildMetadataJSON, validateMetadataJSON, buildMetadataStructure, validateMetadata } from '@/lib/contracts/metadata.utils';
import type { NFT } from '@/schema/data-model';
import type { MetadataContractData } from '@/types/metadata-contract';
import {
  METADATA_JSON_ICON_URL_KEY,
  METADATA_JSON_MARKETING_URL_KEY,
  METADATA_JSON_TOKEN_CONTRACT_KEY,
  METADATA_JSON_SCREENSHOTS_URLS_KEY,
} from '@/config/app-config';

describe('Metadata Utils', () => {
  describe('buildMetadataJSON', () => {
    let mockNFT: NFT;

    beforeEach(() => {
      mockNFT = {
        did: 'did:web:example.com',
        minter: '0x1234567890abcdef',
        version: '1.0.0',
        name: 'Test App',
        description: 'Test description',
        publisher: 'Test Publisher',
        image: 'https://example.com/image.png',
        external_url: 'https://example.com',
        summary: 'Test summary',
        interfaces: 1,
        status: 0,
        dataUrl: 'https://example.com/data.json',
        screenshotUrls: [],
        videoUrls: [],
        threeDAssetUrls: [],
        traits: [],
      };
    });

    // Tests basic metadata building
    it('builds valid metadata JSON from NFT', () => {
      const result = buildMetadataJSON(mockNFT);
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('Test App');
      // Check that it has the expected structure
      expect(result).toContain('Test App');
    });

    // Tests description URL is not in OMATrust spec - removed

    // Tests empty metadata
    it('handles NFT with no metadata', () => {
      const result = buildMetadataJSON(mockNFT);
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('Test App');
      expect(typeof parsed).toBe('object');
    });

    // Tests undefined optional fields use empty string fallback (lines 36-39, 42)
    it('uses empty string fallback for undefined name', () => {
      const nftWithoutName = { ...mockNFT, name: undefined };
      const result = buildMetadataJSON(nftWithoutName);
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('');
    });

    it('uses empty string fallback for undefined description', () => {
      const nftWithoutDesc = { ...mockNFT, description: undefined };
      const result = buildMetadataJSON(nftWithoutDesc);
      const parsed = JSON.parse(result);

      expect(parsed.description).toBe('');
    });

    it('uses empty string fallback for undefined publisher', () => {
      const nftWithoutPub = { ...mockNFT, publisher: undefined };
      const result = buildMetadataJSON(nftWithoutPub);
      const parsed = JSON.parse(result);

      expect(parsed.publisher).toBe('');
    });

    it('uses empty string fallback for undefined image', () => {
      const nftWithoutImage = { ...mockNFT, image: undefined };
      const result = buildMetadataJSON(nftWithoutImage);
      const parsed = JSON.parse(result);

      expect(parsed[METADATA_JSON_ICON_URL_KEY]).toBe('');
    });

    it('uses empty string fallback for undefined external_url', () => {
      const nftWithoutExternal = { ...mockNFT, external_url: undefined };
      const result = buildMetadataJSON(nftWithoutExternal);
      const parsed = JSON.parse(result);

      expect(parsed[METADATA_JSON_MARKETING_URL_KEY]).toBe('');
    });

    it('uses empty string fallback for undefined fungibleTokenId', () => {
      const nftWithoutToken = { ...mockNFT, fungibleTokenId: undefined };
      const result = buildMetadataJSON(nftWithoutToken);
      const parsed = JSON.parse(result);

      expect(parsed[METADATA_JSON_TOKEN_CONTRACT_KEY]).toBe('');
    });

    it('uses empty array fallback for undefined screenshotUrls', () => {
      const nftWithoutScreenshots = { ...mockNFT, screenshotUrls: undefined };
      const result = buildMetadataJSON(nftWithoutScreenshots);
      const parsed = JSON.parse(result);

      expect(parsed[METADATA_JSON_SCREENSHOTS_URLS_KEY]).toEqual([]);
    });

    // Tests screenshot URLs
    it('includes screenshot URLs when present in metadata', () => {
      mockNFT.screenshotUrls = ['https://example.com/screen1.png', 'https://example.com/screen2.png'];

      const result = buildMetadataJSON(mockNFT);
      const parsed = JSON.parse(result);

      expect(parsed.screenshotUrls).toEqual(['https://example.com/screen1.png', 'https://example.com/screen2.png']);
    });

    // Tests filtering empty screenshot URLs
    it('filters out empty screenshot URLs', () => {
      mockNFT.screenshotUrls = ['https://example.com/screen1.png', '', 'https://example.com/screen2.png'];

      const result = buildMetadataJSON(mockNFT);
      const parsed = JSON.parse(result);

      expect(parsed.screenshotUrls).toHaveLength(2);
      expect(parsed.screenshotUrls).toEqual(['https://example.com/screen1.png', 'https://example.com/screen2.png']);
    });

    // Tests platform data
    it('includes platform data when present in metadata', () => {
      mockNFT.platforms = {
        web: {
          downloadUrl: 'https://example.com/download',
          launchUrl: 'https://example.com/launch',
          supported: ['VR', 'AR'],
        },
      };

      const result = buildMetadataJSON(mockNFT);
      const parsed = JSON.parse(result);

      expect(parsed.platforms).toBeDefined();
      expect(parsed.platforms.web).toBeDefined();
    });

    // Tests minimal NFT
    it('builds metadata with minimal required fields', () => {
      const minimalNFT: NFT = {
        did: 'did:web:minimal.com',
        minter: '0xminter',
        version: '1.0.0',
        interfaces: 0,
        status: 0,
        dataUrl: 'https://minimal.com/data.json',
        name: 'Minimal App',
        description: 'Minimal description',
        publisher: 'Minimal Publisher',
        image: 'https://minimal.com/image.png',
        screenshotUrls: [],
        videoUrls: [],
        threeDAssetUrls: [],
        traits: [],
      };

      const result = buildMetadataJSON(minimalNFT);
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('Minimal App');
      expect(typeof parsed).toBe('object');
    });

    // Tests returns valid JSON string
    it('returns a valid JSON string', () => {
      const result = buildMetadataJSON(mockNFT);

      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe('validateMetadataJSON', () => {
    // Tests valid JSON
    it('validates correct JSON string', () => {
      const validJson = JSON.stringify({ name: 'Test', description: 'Test description' });

      const result = validateMetadataJSON(validJson);

      expect(result).toBe(true);
    });

    // Tests invalid JSON
    it('rejects invalid JSON string', () => {
      const invalidJson = '{invalid json}';

      const result = validateMetadataJSON(invalidJson);

      expect(result).toBe(false);
    });

    // Tests missing required fields
    it('validates presence of required fields', () => {
      const missingName = JSON.stringify({ description: 'Test' });

      const result = validateMetadataJSON(missingName);

      // Should return false if name is required
      expect(typeof result).toBe('boolean');
    });

    // Tests empty string
    it('rejects empty string', () => {
      const result = validateMetadataJSON('');

      expect(result).toBe(false);
    });

    // Tests whitespace-only string
    it('rejects whitespace-only string', () => {
      const result = validateMetadataJSON('   ');

      expect(result).toBe(false);
    });

    // Tests complex nested object
    it('validates complex nested metadata', () => {
      const complexJson = JSON.stringify({
        name: 'Test',
        description: 'Test',
        platforms: {
          web: { downloadUrl: 'https://example.com' },
        },
        mcp: {
          name: 'MCP Server',
          endpoint: 'https://mcp.example.com',
        },
      });

      const result = validateMetadataJSON(complexJson);

      expect(result).toBe(true);
    });

    // Tests JSON with null values
    it('handles JSON with null values', () => {
      const jsonWithNull = JSON.stringify({
        name: 'Test',
        description: null,
      });

      const result = validateMetadataJSON(jsonWithNull);

      expect(typeof result).toBe('boolean');
    });

    // Tests JSON with arrays
    it('validates JSON with arrays', () => {
      const jsonWithArrays = JSON.stringify({
        name: 'Test',
        screenshotUrls: ['https://example.com/1.png', 'https://example.com/2.png'],
      });

      const result = validateMetadataJSON(jsonWithArrays);

      expect(result).toBe(true);
    });
  });

  describe('buildMetadataStructure', () => {
    // Tests valid metadata structure
    it('builds valid metadata structure from JSON', () => {
      const metadataJson = JSON.stringify({
        name: 'Test App',
        description: 'Test description',
        image: 'https://example.com/image.png',
        external_url: 'https://example.com',
        screenshotUrls: ['https://example.com/screen1.png'],
        platforms: {
          web: {
            downloadUrl: 'https://example.com/download',
            launchUrl: 'https://example.com/launch',
            supported: ['VR', 'AR']
          }
        }
      });

      const result = buildMetadataStructure(metadataJson);

      expect(result).toBeDefined();
      expect(result?.image).toBe('https://example.com/image.png');
      expect(result?.external_url).toBe('https://example.com');
      expect(result?.screenshotUrls).toEqual(['https://example.com/screen1.png']);
      expect(result?.platforms?.web?.downloadUrl).toBe('https://example.com/download');
    });

    // Tests invalid JSON
    it('returns null for invalid JSON', () => {
      const invalidJson = '{invalid json}';

      const result = buildMetadataStructure(invalidJson);

      expect(result).toBeNull();
    });

    // Tests null metadata
    it('returns null for null metadata', () => {
      const nullJson = JSON.stringify(null);

      const result = buildMetadataStructure(nullJson);

      expect(result).toBeNull();
    });

    // Tests non-object metadata
    it('returns null for non-object metadata', () => {
      const stringJson = JSON.stringify('just a string');

      const result = buildMetadataStructure(stringJson);

      expect(result).toBeNull();
    });

    // Tests metadata with invalid URLs (should still return structure but log warning)
    it('handles metadata with invalid URLs', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const metadataJson = JSON.stringify({
        name: 'Test App',
        external_url: 'also-invalid',
        image: 'not-a-url'
      });

      const result = buildMetadataStructure(metadataJson);

      expect(result).toBeDefined();
      expect(result?.external_url).toBe('also-invalid');
      expect(result?.image).toBe('not-a-url');
      expect(consoleSpy).toHaveBeenCalledWith('Invalid URLs in metadata:', expect.any(Object));
      
      consoleSpy.mockRestore();
    });

    // Tests empty metadata
    it('handles empty metadata object', () => {
      const emptyJson = JSON.stringify({});

      const result = buildMetadataStructure(emptyJson);

      expect(result).toBeDefined();
      expect(result?.external_url).toBe('');
      expect(result?.image).toBe('');
    });

    // Tests metadata with complex platforms
    it('handles complex platform data', () => {
      const metadataJson = JSON.stringify({
        name: 'Test App',
        platforms: {
          web: {
            downloadUrl: 'https://example.com/download',
            launchUrl: 'https://example.com/launch',
            supported: ['VR', 'AR']
          },
          ios: {
            downloadUrl: 'https://apps.apple.com/app',
            launchUrl: 'https://example.com/ios-launch',
            supported: ['iPhone', 'iPad']
          }
        }
      });

      const result = buildMetadataStructure(metadataJson);

      expect(result).toBeDefined();
      expect(result?.platforms?.web?.downloadUrl).toBe('https://example.com/download');
      expect(result?.platforms?.ios?.supported).toEqual(['iPhone', 'iPad']);
    });
  });

  describe('validateMetadata', () => {
    let validMetadata: MetadataContractData;

    beforeEach(() => {
      validMetadata = {
        name: 'Test App',
        description: 'Test description',
        image: 'https://example.com/image.png',
        external_url: 'https://example.com',
        screenshotUrls: ['https://example.com/screen1.png', 'https://example.com/screen2.png'],
        platforms: {
          web: {
            downloadUrl: 'https://example.com/download',
            launchUrl: 'https://example.com/launch',
            supported: ['VR', 'AR']
          }
        }
      };
    });

    // Tests valid metadata
    it('validates correct metadata', () => {
      expect(() => validateMetadata(validMetadata)).not.toThrow();
    });

    // Tests invalid description URL - removed, not in OMATrust spec

    // Tests invalid marketing URL
    it('throws error for invalid marketing URL', () => {
      validMetadata.external_url = 'not-a-url';

      expect(() => validateMetadata(validMetadata)).toThrow('Invalid marketing URL');
    });

    // Tests invalid icon URL
    it('throws error for invalid icon URL', () => {
      validMetadata.image = 'invalid-icon-url';

      expect(() => validateMetadata(validMetadata)).toThrow('Invalid icon URL');
    });

    // Tests invalid first screenshot URL
    it('throws error for invalid first screenshot URL', () => {
      validMetadata.screenshotUrls = ['invalid-screenshot-url'];

      expect(() => validateMetadata(validMetadata)).toThrow('First screenshot URL is invalid');
    });

    // Tests invalid screenshot URL at specific position
    it('throws error for invalid screenshot URL at specific position', () => {
      validMetadata.screenshotUrls = [
        'https://example.com/valid.png',
        'invalid-url',
        'https://example.com/valid2.png'
      ];

      expect(() => validateMetadata(validMetadata)).toThrow('Invalid screenshot URL at position 1');
    });

    // Tests missing platform URLs
    it('throws error when no platform URLs are provided', () => {
      validMetadata.platforms = {
        web: {
          supported: ['VR', 'AR']
          // No downloadUrl or launchUrl
        }
      };

      expect(() => validateMetadata(validMetadata)).toThrow('At least one platform availability URL (Download or Launch) is required');
    });

    // Tests invalid platform download URL
    it('throws error for invalid platform download URL', () => {
      validMetadata.platforms = {
        web: {
          downloadUrl: 'http://example .com', // Invalid: space in domain
          launchUrl: 'https://example.com/launch'
        }
      };

      expect(() => validateMetadata(validMetadata)).toThrow('Invalid web download URL');
    });

    // Tests invalid platform launch URL
    it('throws error for invalid platform launch URL', () => {
      validMetadata.platforms = {
        web: {
          downloadUrl: 'https://example.com/download',
          launchUrl: 'http://example@.com' // Invalid: special character in domain
        }
      };

      expect(() => validateMetadata(validMetadata)).toThrow('Invalid web launch URL');
    });

    // Tests valid metadata with multiple platforms
    it('validates metadata with multiple platforms', () => {
      validMetadata.platforms = {
        web: {
          downloadUrl: 'https://example.com/web-download',
          launchUrl: 'https://example.com/web-launch'
        },
        ios: {
          downloadUrl: 'https://apps.apple.com/app',
          launchUrl: 'https://example.com/ios-launch'
        },
        android: {
          downloadUrl: 'https://play.google.com/store/apps/details?id=com.example',
          launchUrl: 'https://example.com/android-launch'
        }
      };

      expect(() => validateMetadata(validMetadata)).not.toThrow();
    });

    // Tests metadata with no platforms
    it('throws error when no platforms are provided', () => {
      validMetadata.platforms = undefined;

      expect(() => validateMetadata(validMetadata)).toThrow('At least one platform availability URL (Download or Launch) is required');
    });

    // Tests metadata with empty platforms
    it('throws error when platforms object is empty', () => {
      validMetadata.platforms = {};

      expect(() => validateMetadata(validMetadata)).toThrow('At least one platform availability URL (Download or Launch) is required');
    });

    // Tests metadata with valid URLs but no platform URLs
    it('throws error when platforms have no download or launch URLs', () => {
      validMetadata.platforms = {
        web: {
          supported: ['VR', 'AR']
          // No downloadUrl or launchUrl
        }
      };

      expect(() => validateMetadata(validMetadata)).toThrow('At least one platform availability URL (Download or Launch) is required');
    });

    // Tests metadata with only download URL
    it('validates metadata with only download URL', () => {
      validMetadata.platforms = {
        web: {
          downloadUrl: 'https://example.com/download'
          // No launchUrl
        }
      };

      expect(() => validateMetadata(validMetadata)).not.toThrow();
    });

    // Tests metadata with only launch URL
    it('validates metadata with only launch URL', () => {
      validMetadata.platforms = {
        web: {
          launchUrl: 'https://example.com/launch'
          // No downloadUrl
        }
      };

      expect(() => validateMetadata(validMetadata)).not.toThrow();
    });

    // Tests metadata with empty screenshot URLs
    it('validates metadata with empty screenshot URLs', () => {
      validMetadata.screenshotUrls = [];

      expect(() => validateMetadata(validMetadata)).not.toThrow();
    });

    // Tests metadata with undefined screenshot URLs
    it('validates metadata with undefined screenshot URLs', () => {
      validMetadata.screenshotUrls = undefined;

      expect(() => validateMetadata(validMetadata)).not.toThrow();
    });
  });
});

