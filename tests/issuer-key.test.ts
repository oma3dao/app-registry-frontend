/**
 * Tests for lib/server/issuer-key.ts
 * 
 * Tests the server-side private key loading utilities used by API routes
 * for signing attestation transactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadIssuerPrivateKey, loadIssuerPrivateKeyOrNull, getThirdwebManagedWallet } from '@/lib/server/issuer-key';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock os module
vi.mock('os', () => ({
  default: {
    homedir: vi.fn(() => '/home/testuser'),
  },
  homedir: vi.fn(() => '/home/testuser'),
}));

// Mock path (use actual implementation)
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return actual;
});

describe('issuer-key utilities', () => {
  const validPrivateKey = '0x' + '1'.repeat(64);
  const validPrivateKeyNoPrefix = '1'.repeat(64);

  beforeEach(() => {
    // Clear all environment variables
    delete process.env.ISSUER_PRIVATE_KEY;
    delete process.env.THIRDWEB_SECRET_KEY;
    delete process.env.THIRDWEB_SERVER_WALLET_ADDRESS;
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    delete process.env.ISSUER_PRIVATE_KEY;
    delete process.env.THIRDWEB_SECRET_KEY;
    delete process.env.THIRDWEB_SERVER_WALLET_ADDRESS;
  });

  describe('getThirdwebManagedWallet', () => {
    /**
     * Test: returns null when not configured (current implementation)
     */
    it('returns null when Thirdweb Managed Vault is not configured', () => {
      const result = getThirdwebManagedWallet();
      expect(result).toBeNull();
    });

    /**
     * Test: would return wallet info if configured (future feature)
     */
    it('has correct return type for future managed vault support', () => {
      const result = getThirdwebManagedWallet();
      // Currently always null, but type should support future implementation
      expect(result === null || (result.secretKey && result.walletAddress)).toBe(true);
    });
  });

  describe('loadIssuerPrivateKey', () => {
    /**
     * Test: loads from ISSUER_PRIVATE_KEY environment variable
     */
    it('loads private key from ISSUER_PRIVATE_KEY env var with 0x prefix', () => {
      process.env.ISSUER_PRIVATE_KEY = validPrivateKey;

      const result = loadIssuerPrivateKey();

      expect(result).toBe(validPrivateKey);
    });

    /**
     * Test: adds 0x prefix if missing
     */
    it('adds 0x prefix if missing from ISSUER_PRIVATE_KEY', () => {
      process.env.ISSUER_PRIVATE_KEY = validPrivateKeyNoPrefix;

      const result = loadIssuerPrivateKey();

      expect(result).toBe(validPrivateKey);
    });

    /**
     * Test: handles whitespace in environment variable
     */
    it('trims whitespace from ISSUER_PRIVATE_KEY', () => {
      process.env.ISSUER_PRIVATE_KEY = `  ${validPrivateKey}  `;

      const result = loadIssuerPrivateKey();

      expect(result).toBe(validPrivateKey);
    });

    /**
     * Test: validates private key format
     */
    it('throws error for invalid ISSUER_PRIVATE_KEY format (too short)', () => {
      process.env.ISSUER_PRIVATE_KEY = '0x123';

      expect(() => loadIssuerPrivateKey()).toThrow(/Invalid ISSUER_PRIVATE_KEY format/);
    });

    /**
     * Test: validates hex characters
     */
    it('throws error for non-hex characters in ISSUER_PRIVATE_KEY', () => {
      process.env.ISSUER_PRIVATE_KEY = '0x' + 'g'.repeat(64);

      expect(() => loadIssuerPrivateKey()).toThrow(/Invalid ISSUER_PRIVATE_KEY format/);
    });

    /**
     * Test: loads from SSH file when env var not set
     */
    it('loads private key from SSH file when env var not set', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(validPrivateKey);

      const result = loadIssuerPrivateKey();

      expect(result).toBe(validPrivateKey);
      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join('/home/testuser', '.ssh', 'local-attestation-key'),
        'utf8'
      );
    });

    /**
     * Test: adds 0x prefix to SSH file content if missing
     */
    it('adds 0x prefix to SSH file content if missing', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(validPrivateKeyNoPrefix);

      const result = loadIssuerPrivateKey();

      expect(result).toBe(validPrivateKey);
    });

    /**
     * Test: normalizes SSH file content (removes whitespace)
     */
    it('removes whitespace and normalizes SSH file content', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`  ${validPrivateKey.toUpperCase()}  \n  `);

      const result = loadIssuerPrivateKey();

      expect(result).toBe(validPrivateKey); // Should be lowercase
    });

    /**
     * Test: validates SSH file content format
     */
    it('throws error for invalid SSH file content', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid-key-content');

      expect(() => loadIssuerPrivateKey()).toThrow(/Invalid private key format/);
    });

    /**
     * Test: throws error when SSH file doesn't exist and no env var
     */
    it('throws error when no private key is available', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => loadIssuerPrivateKey()).toThrow(/No private key found/);
    });

    /**
     * Test: error message includes helpful instructions
     */
    it('provides helpful error message when no key found', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      try {
        loadIssuerPrivateKey();
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).toContain('ISSUER_PRIVATE_KEY');
        expect((error as Error).message).toContain('local-attestation-key');
      }
    });
  });

  describe('loadIssuerPrivateKeyOrNull', () => {
    /**
     * Test: returns private key when successful
     */
    it('returns private key when loadIssuerPrivateKey succeeds', async () => {
      process.env.ISSUER_PRIVATE_KEY = validPrivateKey;

      const result = await loadIssuerPrivateKeyOrNull();

      expect(result).toBe(validPrivateKey);
    });

    /**
     * Test: returns null instead of throwing on error
     */
    it('returns null when loadIssuerPrivateKey fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await loadIssuerPrivateKeyOrNull();

      expect(result).toBeNull();
    });

    /**
     * Test: returns null for invalid format
     */
    it('returns null when private key format is invalid', async () => {
      process.env.ISSUER_PRIVATE_KEY = 'invalid';

      const result = await loadIssuerPrivateKeyOrNull();

      expect(result).toBeNull();
    });

    /**
     * Test: logs errors without throwing
     */
    it('logs error message when key loading fails', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await loadIssuerPrivateKeyOrNull();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[issuer-key]'),
        expect.any(String)
      );
    });
  });
});

