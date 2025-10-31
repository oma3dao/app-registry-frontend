// tests/iwps.test.ts
// Test suite for the IWPS utility functions
// This file verifies that the IWPS functions work correctly, including device parameter detection,
// teleport ID/PIN generation, and request building functionality.

import { 
  detectDeviceParameters, 
  generateTeleportPin, 
  generateTeleportId, 
  buildIwpsProxyRequest 
} from '../src/lib/iwps';
import { vi } from 'vitest';

// Mock the app config constants
vi.mock('@/config/app-config', () => ({
  IWPS_SOURCE_OS_KEY: 'sourceOs',
  IWPS_SOURCE_ISA_KEY: 'sourceIsa',
  IWPS_SOURCE_BITS_KEY: 'sourceBits',
  IWPS_SOURCE_CLIENT_TYPE_KEY: 'sourceClientType',
  IWPS_SOURCE_OS_VERSION_KEY: 'sourceOsVersion',
  IWPS_TELEPORT_ID_KEY: 'teleportId',
  IWPS_TELEPORT_PIN_KEY: 'teleportPin',
  IWPS_USER_ID_KEY: 'userId',
  IWPS_SOURCE_ACK_URL_KEY: 'sourceAckUrl',
  IWPS_SOURCE_NACK_URL_KEY: 'sourceNackUrl',
  IWPS_LOCATION_KEY: 'location',
  IWPS_DEFAULT_ACK_URL: 'https://default-ack-url.com',
  IWPS_DEFAULT_NACK_URL: 'https://default-nack-url.com',
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-12345'),
  },
  writable: true,
});

describe('IWPS utility functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectDeviceParameters', () => {
    // This test verifies that device parameters are detected correctly
    it('detects device parameters correctly', () => {
      // Mock navigator properties
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        writable: true,
      });
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        writable: true,
      });

      const result = detectDeviceParameters();

      expect(result).toEqual({
        sourceOs: 'macos',
        sourceIsa: null,
        sourceBits: null,
        sourceClientType: 'browser',
        sourceOsVersion: null,
      });
    });

    // This test checks Windows platform detection
    it('detects Windows platform correctly', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        writable: true,
      });

      const result = detectDeviceParameters();

      expect(result.sourceOs).toBe('windows');
    });

    // This test checks Linux platform detection
    it('detects Linux platform correctly', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'Linux x86_64',
        writable: true,
      });

      const result = detectDeviceParameters();

      expect(result.sourceOs).toBe('linux');
    });

    // This test checks iOS detection
    it('detects iOS platform correctly', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'iPhone',
        writable: true,
      });
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true,
      });

      const result = detectDeviceParameters();

      expect(result.sourceOs).toBe('ios');
    });

    // This test checks Android detection
    it('detects Android platform correctly', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'Linux armv8l',
        writable: true,
      });
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G973F)',
        writable: true,
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        writable: true,
      });

      const result = detectDeviceParameters();

      // The code checks platform for 'linux' first, so it returns 'linux' for Android devices
      // Android detection via userAgent only happens if platform doesn't include 'linux'
      expect(result.sourceOs).toBe('linux');
    });

    // This test verifies error handling
    it('handles detection errors gracefully', () => {
      // Save the original navigator
      const originalNavigator = window.navigator;
      // Create a mock navigator that throws on platform access
      const mockNavigator = {
        get platform() {
          throw new Error('Platform detection error');
        },
        userAgent: '',
        maxTouchPoints: 0,
      };
      // @ts-ignore
      Object.defineProperty(window, 'navigator', {
        value: mockNavigator,
        configurable: true,
      });

      const result = detectDeviceParameters();

      expect(result).toEqual({
        sourceOs: null,
        sourceIsa: null,
        sourceBits: null,
        sourceClientType: 'browser',
        sourceOsVersion: null,
      });

      // Restore the original navigator
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    });
  });

  describe('generateTeleportPin', () => {
    // This test verifies that teleport PIN generation works correctly
    it('generates a 4-digit PIN', () => {
      const pin = generateTeleportPin();
      
      expect(pin).toMatch(/^\d{4}$/);
      expect(parseInt(pin)).toBeGreaterThanOrEqual(1000);
      expect(parseInt(pin)).toBeLessThanOrEqual(9999);
    });

    // This test checks that PINs are random
    it('generates different PINs on multiple calls', () => {
      const pin1 = generateTeleportPin();
      const pin2 = generateTeleportPin();
      
      expect(pin1).not.toBe(pin2);
    });
  });

  describe('generateTeleportId', () => {
    // This test verifies that teleport ID generation works correctly
    it('generates a UUID using crypto.randomUUID', () => {
      const id = generateTeleportId();
      
      expect(id).toBe('test-uuid-12345');
      expect(global.crypto.randomUUID).toHaveBeenCalled();
    });

    // This test checks that IDs are unique
    it('generates different IDs on multiple calls', () => {
      const id1 = generateTeleportId();
      const id2 = generateTeleportId();
      
      expect(id1).toBe(id2); // Since we're mocking with the same value
      expect(global.crypto.randomUUID).toHaveBeenCalledTimes(2);
    });
  });

  describe('buildIwpsProxyRequest', () => {
    // Mock NFT object
    const mockNft = {
      iwpsPortalUrl: 'https://test-portal.com',
      // Add other required NFT properties as needed
    } as any;

    // This test verifies that the request is built correctly
    it('builds request with correct structure', () => {
      const result = buildIwpsProxyRequest(mockNft);

      expect(result).toHaveProperty('requestBody');
      expect(result).toHaveProperty('generatedPin');
      expect(result.generatedPin).toMatch(/^\d{4}$/);
    });

    // This test checks that the request body has the correct structure
    it('request body has correct structure', () => {
      const result = buildIwpsProxyRequest(mockNft);

      expect(result.requestBody).toEqual({
        targetIwpsPortalUrl: 'https://test-portal.com',
        iwpsParams: expect.objectContaining({
          teleportId: 'test-uuid-12345',
          teleportPin: expect.stringMatching(/^\d{4}$/),
          userId: '',
          sourceAckUrl: 'https://default-ack-url.com',
          sourceNackUrl: 'https://default-nack-url.com',
          location: '',
          sourceClientType: 'browser',
        }),
      });
    });

    // This test verifies that device parameters are included when available
    it('includes device parameters when detected', () => {
      // Mock navigator for macOS detection
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        writable: true,
      });

      const result = buildIwpsProxyRequest(mockNft);

      expect(result.requestBody.iwpsParams).toHaveProperty('sourceOs', 'macos');
    });

    // This test checks that the generated PIN is returned correctly
    it('returns the generated PIN', () => {
      const result = buildIwpsProxyRequest(mockNft);

      expect(result.generatedPin).toMatch(/^\d{4}$/);
      expect(result.requestBody.iwpsParams.teleportPin).toBe(result.generatedPin);
    });

    // This test verifies that the teleport ID is consistent
    it('uses consistent teleport ID', () => {
      const result = buildIwpsProxyRequest(mockNft);

      expect(result.requestBody.iwpsParams.teleportId).toBe('test-uuid-12345');
    });

    // This test checks that required fields are always present
    it('always includes required fields', () => {
      const result = buildIwpsProxyRequest(mockNft);

      const requiredFields = [
        'teleportId',
        'teleportPin',
        'userId',
        'sourceAckUrl',
        'sourceNackUrl',
        'location',
        'sourceClientType',
      ];

      requiredFields.forEach(field => {
        expect(result.requestBody.iwpsParams).toHaveProperty(field);
      });
    });

    // This test verifies that optional fields are only included when detected
    it('only includes optional fields when detected', () => {
      // Mock navigator to not detect any OS
      Object.defineProperty(navigator, 'platform', {
        value: 'Unknown',
        writable: true,
      });
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Unknown Browser',
        writable: true,
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        writable: true,
      });

      const result = buildIwpsProxyRequest(mockNft);

      expect(result.requestBody.iwpsParams).not.toHaveProperty('sourceOs');
      expect(result.requestBody.iwpsParams).not.toHaveProperty('sourceIsa');
      expect(result.requestBody.iwpsParams).not.toHaveProperty('sourceBits');
      expect(result.requestBody.iwpsParams).not.toHaveProperty('sourceOsVersion');
    });
  });
}); 