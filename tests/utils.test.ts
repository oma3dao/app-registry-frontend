// Tests for utility functions in utils.ts
import { vi } from 'vitest';
import { cn, isMobile, debounce, buildVersionedDID, normalizeAndValidateVersion, normalizeMetadata, fetchMetadataImage } from '../src/lib/utils';

describe('utils', () => {
  // Test cn (className utility) function
  describe('cn', () => {
    it('combines class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('handles conditional classes', () => {
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional');
    });
  });

  // Test isMobile function
  describe('isMobile', () => {
    it('returns false in test environment', () => {
      expect(isMobile()).toBe(false);
    });

    it('returns true for mobile user agents', () => {
      // Save original navigator
      const originalNavigator = window.navigator;
      
      // Mock mobile user agent
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' },
        writable: true,
        configurable: true
      });
      
      expect(isMobile()).toBe(true);
      
      // Restore original navigator
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true
      });
    });

    it('returns true for Android user agents', () => {
      const originalNavigator = window.navigator;
      
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F)' },
        writable: true,
        configurable: true
      });
      
      expect(isMobile()).toBe(true);
      
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true
      });
    });

    it('returns false for desktop user agents', () => {
      const originalNavigator = window.navigator;
      
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        writable: true,
        configurable: true
      });
      
      expect(isMobile()).toBe(false);
      
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true
      });
    });
  });

  // Test debounce function
  describe('debounce', () => {
    it('debounces function calls', async () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);
      
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      expect(fn).not.toHaveBeenCalled();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  // Test buildVersionedDID function
  describe('buildVersionedDID', () => {
    it('builds versioned DID correctly', () => {
      expect(buildVersionedDID('did:example:123', '1.0')).toBe('did:example:123/v/1.0');
    });

    it('converts DID to lowercase', () => {
      expect(buildVersionedDID('DID:EXAMPLE:123', '1.0')).toBe('did:example:123/v/1.0');
    });

    it('throws error for empty DID', () => {
      expect(() => buildVersionedDID('', '1.0')).toThrow('DID is required');
    });
  });

  // Test normalizeAndValidateVersion function
  describe('normalizeAndValidateVersion', () => {
    it('normalizes version correctly', () => {
      expect(normalizeAndValidateVersion('1.0')).toBe('1.0');
      expect(normalizeAndValidateVersion('1.2.3')).toBe('1.2');
    });

    it('throws error for empty version', () => {
      expect(() => normalizeAndValidateVersion('')).toThrow('Version is required');
    });

    it('throws error for invalid format', () => {
      expect(() => normalizeAndValidateVersion('1')).toThrow('Invalid version format');
    });
  });

  // Test normalizeMetadata function
  describe('normalizeMetadata', () => {
    it('normalizes metadata with defaults', () => {
      const result = normalizeMetadata({ image: 'test.jpg' });
      expect(result).toEqual({
        name: '',
        description: '',
        publisher: '',
        external_url: '',
        image: 'test.jpg',
        screenshotUrls: [],
        platforms: {}
      });
    });

    it('handles null input', () => {
      expect(normalizeMetadata(null)).toEqual({});
    });

    it('handles undefined input', () => {
      expect(normalizeMetadata(undefined)).toEqual({});
    });

    it('preserves all provided fields', () => {
      const input = {
        name: 'Test App',
        description: 'A test application',
        publisher: 'Test Publisher',
        external_url: 'https://example.com',
        image: 'https://example.com/image.png',
        screenshotUrls: ['https://example.com/shot1.png'],
        platforms: { web: { launchUrl: 'https://app.example.com' } }
      };
      const result = normalizeMetadata(input);
      expect(result).toEqual(input);
    });

    it('handles non-array screenshotUrls', () => {
      const result = normalizeMetadata({ screenshotUrls: 'not-an-array' });
      expect(result.screenshotUrls).toEqual([]);
    });

    it('handles null screenshotUrls', () => {
      const result = normalizeMetadata({ screenshotUrls: null });
      expect(result.screenshotUrls).toEqual([]);
    });
  });
}); 

describe('fetchMetadataImage', () => {
  // This test checks that fetchMetadataImage returns the image URL on success
  it('returns image URL on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ image: 'https://example.com/image.png' })
    });
    const result = await fetchMetadataImage('https://data.com');
    expect(result).toBe('https://example.com/image.png');
  });

  // This test checks that fetchMetadataImage returns null if no image is present
  it('returns null if image is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    });
    const result = await fetchMetadataImage('https://data.com');
    expect(result).toBeNull();
  });

  // This test checks that fetchMetadataImage returns null if image is empty string
  it('returns null if image is empty string', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ image: '' })
    });
    const result = await fetchMetadataImage('https://data.com');
    expect(result).toBeNull();
  });

  // This test checks that fetchMetadataImage returns null if image is whitespace only
  it('returns null if image is whitespace only', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ image: '   ' })
    });
    const result = await fetchMetadataImage('https://data.com');
    expect(result).toBeNull();
  });

  // This test checks that fetchMetadataImage returns null if image is not a string
  it('returns null if image is not a string', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ image: 12345 })
    });
    const result = await fetchMetadataImage('https://data.com');
    expect(result).toBeNull();
  });

  // This test checks that fetchMetadataImage returns null on API error
  it('returns null on API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'fail' })
    });
    const result = await fetchMetadataImage('https://data.com');
    expect(result).toBeNull();
  });

  // This test checks that fetchMetadataImage returns null when API returns error in response body
  it('returns null when API response contains error field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'Failed to fetch metadata' })
    });
    const result = await fetchMetadataImage('https://data.com');
    expect(result).toBeNull();
  });

  // This test checks that fetchMetadataImage returns null on thrown error
  it('returns null on thrown error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fail'));
    const result = await fetchMetadataImage('https://data.com');
    expect(result).toBeNull();
  });

  // This test checks that fetchMetadataImage returns null if dataUrl is empty
  it('returns null if dataUrl is empty', async () => {
    const result = await fetchMetadataImage('');
    expect(result).toBeNull();
  });
});

// fetchDescriptionContent was removed from utils.ts - descriptionUrl doesn't exist in OMATrust spec
// Tests removed to reflect the current implementation 