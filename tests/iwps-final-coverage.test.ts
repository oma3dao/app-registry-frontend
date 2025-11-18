/**
 * Final coverage tests for iwps.ts to reach 100% coverage
 * Covers remaining uncovered branches and statements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectDeviceParameters } from '../src/lib/iwps';

// Mock the app config constants
vi.mock('@/config/app-config', () => ({
  IWPS_SOURCE_OS_KEY: 'sourceOs',
  IWPS_SOURCE_ISA_KEY: 'sourceIsa',
  IWPS_SOURCE_BITS_KEY: 'sourceBits',
  IWPS_SOURCE_CLIENT_TYPE_KEY: 'sourceClientType',
  IWPS_SOURCE_OS_VERSION_KEY: 'sourceOsVersion',
}));

describe('IWPS - Final Coverage Gaps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Covers line 33 - darwin platform detection (not just mac)
   * Tests the `platform.includes('darwin')` branch
   */
  it('detects darwin platform as macOS (includes darwin check)', () => {
    Object.defineProperty(navigator, 'platform', {
      value: 'darwin',
      writable: true,
      configurable: true,
    });

    const params = detectDeviceParameters();
    expect(params.sourceOs).toBe('macos');
  });

  /**
   * Test: Covers line 39 - maxTouchPoints > 0 path (not just ontouchstart)
   * Tests the `navigator.maxTouchPoints > 0` branch for touch detection
   */
  it('detects touch device via maxTouchPoints when ontouchstart not available', () => {
    Object.defineProperty(navigator, 'platform', {
      value: 'unknown',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5, // Touch device
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      writable: true,
      configurable: true,
    });
    // Don't define ontouchstart - rely on maxTouchPoints
    Reflect.deleteProperty(window, 'ontouchstart');

    const params = detectDeviceParameters();
    expect(params.sourceOs).toBe('ios');
  });

  /**
   * Test: Covers line 42 - iPad detection (not just iPhone)
   * Tests the `userAgent.includes('ipad')` branch
   */
  it('detects iPad via userAgent (ipad check)', () => {
    Object.defineProperty(navigator, 'platform', {
      value: 'unknown',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)', // iPad in userAgent
      writable: true,
      configurable: true,
    });

    const params = detectDeviceParameters();
    expect(params.sourceOs).toBe('ios');
  });

  /**
   * Test: Covers line 32 - platform?.toLowerCase() with null platform
   * Tests the fallback when platform is null
   */
  it('handles null platform gracefully', () => {
    // When platform is null, the code uses || '' which gives empty string
    // Then it checks if platform starts with 'mac', 'win', includes 'linux', etc.
    // None of these will match an empty string, so it will check for touch
    // If touch is detected, it will try to detect iOS/Android from userAgent
    // If no userAgent or no match, sourceOs remains null
    
    Object.defineProperty(navigator, 'platform', {
      value: null,
      writable: true,
      configurable: true,
    });
    
    // Ensure no touch detection
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      writable: true,
      configurable: true,
    });
    Reflect.deleteProperty(window, 'ontouchstart');

    const params = detectDeviceParameters();
    // When platform is null and no touch, sourceOs should be null
    expect(params.sourceOs).toBeNull();
    expect(params.sourceClientType).toBe('browser');
  });

  /**
   * Test: Covers line 41 - userAgent.toLowerCase() when userAgent is undefined
   * Tests the fallback when userAgent is undefined in mobile detection
   */
  it('handles undefined userAgent in mobile detection', () => {
    Object.defineProperty(navigator, 'platform', {
      value: 'unknown',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'userAgent', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const params = detectDeviceParameters();
    // Should not detect iOS or Android without userAgent
    expect(params.sourceOs).toBeNull();
  });
});

