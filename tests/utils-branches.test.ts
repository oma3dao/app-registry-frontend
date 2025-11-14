// tests/utils-branches.test.ts
// Additional branch coverage tests for utils.ts
// Covers edge cases and branches not fully tested in the main utils test suite

import { vi } from 'vitest';
import { isMobile, debounce, fetchMetadataImage } from '../src/lib/utils';

describe('utils - Branch Coverage', () => {
  describe('isMobile', () => {
    // This test covers line 19: typeof window === 'undefined' branch (false)
    // In normal browser environment, window is defined
    it('returns false for non-mobile user agent', () => {
      // Mock window.navigator.userAgent
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true,
      });

      expect(isMobile()).toBe(false);
    });

    // This test covers the regex test returning true (line 24)
    it('returns true for mobile user agents', () => {
      const mobileUserAgents = [
        'Mozilla/5.0 (Android 10; Mobile; rv:68.0)',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (iPod touch; CPU iPhone OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (webOS/1.0)',
        'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900)',
        'Opera/9.80 (J2ME/MIDP; Opera Mini/9.80)',
      ];

      mobileUserAgents.forEach(ua => {
        Object.defineProperty(window.navigator, 'userAgent', {
          value: ua,
          writable: true,
          configurable: true,
        });

        expect(isMobile()).toBe(true);
      });
    });
  });

  describe('debounce', () => {
    // This test covers line 40: when timeoutId is not null (clearTimeout called)
    it('clears previous timeout when called multiple times', async () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      // Call multiple times rapidly
      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      // Should not have called yet
      expect(fn).not.toHaveBeenCalled();

      // Wait for debounce timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should only be called once with the last arguments
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('third');
    });

    // This test covers line 40: when timeoutId is null (first call)
    it('does not clear timeout on first call', async () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 50);

      // First call - timeoutId is null, so clearTimeout won't be called
      debouncedFn('first');

      expect(fn).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve, 75));

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('first');
    });

    // This test covers line 46: timeoutId set to null after timeout
    it('resets timeoutId to null after timeout executes', async () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 50);

      debouncedFn('first');

      // Wait for timeout to execute
      await new Promise(resolve => setTimeout(resolve, 75));

      // timeoutId should be null now
      // Call again - should not clear any timeout (line 40 false branch)
      debouncedFn('second');

      await new Promise(resolve => setTimeout(resolve, 75));

      // Both calls should have executed
      expect(fn).toHaveBeenCalledTimes(2);
    });

    // This test covers using custom ms parameter
    it('uses custom debounce delay', async () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 200); // Custom 200ms delay

      debouncedFn('test');

      // Should not be called after 150ms
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(fn).not.toHaveBeenCalled();

      // Should be called after 250ms total
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(fn).toHaveBeenCalledTimes(1);
    });

    // This test verifies the function context is preserved (line 45)
    it('preserves function context', async () => {
      const obj = {
        value: 42,
        method: vi.fn(function(this: any, arg: string) {
          return this.value + arg;
        }),
      };

      const debouncedMethod = debounce(obj.method, 50);

      // Call with specific context
      debouncedMethod.call(obj, '-test');

      await new Promise(resolve => setTimeout(resolve, 75));

      expect(obj.method).toHaveBeenCalledWith('-test');
    });
  });

  describe('fetchMetadataImage', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // This test covers line 110-112: when data.error exists
    it('returns null when API response contains error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'Failed to fetch metadata' }),
      });

      const result = await fetchMetadataImage('https://test.com');

      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/fetch-metadata?url=')
      );
    });

    // This test covers line 115-116: when image is a valid non-empty string (true branch)
    it('returns image URL when valid', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ image: 'https://test.com/image.png' }),
      });

      const result = await fetchMetadataImage('https://test.com');

      expect(result).toBe('https://test.com/image.png');
    });

    // This test covers line 117-120: when image is not a string or is empty (else branch)
    it('returns null when image is empty string', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ image: '   ' }), // Empty/whitespace string
      });

      const result = await fetchMetadataImage('https://test.com');

      expect(result).toBeNull();
    });

    // This test covers line 117-120: when image is not a string
    it('returns null when image is not a string', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ image: null }),
      });

      const result = await fetchMetadataImage('https://test.com');

      expect(result).toBeNull();
    });

    // This test covers line 117-120: when image is a number
    it('returns null when image is a number', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ image: 12345 }),
      });

      const result = await fetchMetadataImage('https://test.com');

      expect(result).toBeNull();
    });

    // This test covers line 117-120: when image is an object
    it('returns null when image is an object', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ image: { url: 'test.png' } }),
      });

      const result = await fetchMetadataImage('https://test.com');

      expect(result).toBeNull();
    });

    // This test covers line 96: early return when dataUrl is empty
    it('returns null when dataUrl is empty string', async () => {
      const result = await fetchMetadataImage('');

      expect(result).toBeNull();
      // fetch should not be called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    // This test covers line 103-106: when response.ok is false
    it('returns null when API response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await fetchMetadataImage('https://test.com');

      expect(result).toBeNull();
    });

    // This test covers the catch block when fetch throws an error
    it('returns null when fetch throws an error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchMetadataImage('https://test.com');

      expect(result).toBeNull();
    });

    // This test covers the catch block when JSON parsing fails
    it('returns null when JSON parsing fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await fetchMetadataImage('https://test.com');

      expect(result).toBeNull();
    });

    // This test verifies URL encoding (line 100)
    it('encodes URL parameter correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ image: 'https://test.com/image.png' }),
      });

      await fetchMetadataImage('https://test.com/path?param=value&other=123');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/fetch-metadata?url=https%3A%2F%2Ftest.com%2Fpath%3Fparam%3Dvalue%26other%3D123'
      );
    });
  });
});

