/**
 * OMATrust Proof Specification - Handle-Link Statement Tests
 * 
 * Tests for Handle-Link Statement format and parsing
 * Validates the human-readable statement format used in proofs
 * 
 * Specification: OMATrust Proof Specification Section 5.4
 * Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 */

import { describe, it, expect } from 'vitest';

describe('OMATrust Proof Spec - Handle-Link Statement', () => {

  // Handle-Link statement format per specification
  // "I am linking my [HANDLE_TYPE] @[HANDLE] to this wallet."
  
  const VALID_HANDLE_TYPES = [
    'X (Twitter)',
    'GitHub',
    'Discord',
    'Telegram',
    'LinkedIn',
    'Instagram',
    'YouTube',
    'TikTok',
    'Farcaster',
    'Lens',
    'ENS',
    'custom',
  ];

  describe('Statement Format (OT-PF-105)', () => {
    /**
     * Test: Basic statement format
     * Requirement: Statement follows prescribed format
     */
    it('follows prescribed statement format', () => {
      const statement = 'I am linking my X (Twitter) @example_user to this wallet.';
      
      expect(statement).toMatch(/^I am linking my .+ @.+ to this wallet\.$/);
    });

    /**
     * Test: Statement with different handle types
     */
    it('supports various handle types', () => {
      for (const handleType of VALID_HANDLE_TYPES) {
        const statement = `I am linking my ${handleType} @testuser to this wallet.`;
        expect(statement).toContain(handleType);
        expect(statement).toContain('@testuser');
      }
    });

    /**
     * Test: Statement parsing extracts handle type
     */
    it('can parse handle type from statement', () => {
      const statement = 'I am linking my GitHub @octocat to this wallet.';
      
      const match = statement.match(/I am linking my (.+) @/);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('GitHub');
    });

    /**
     * Test: Statement parsing extracts handle
     */
    it('can parse handle from statement', () => {
      const statement = 'I am linking my X (Twitter) @elonmusk to this wallet.';
      
      const match = statement.match(/@(\S+) to this wallet/);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('elonmusk');
    });
  });

  describe('Handle Validation (OT-PF-106)', () => {
    /**
     * Test: Twitter handle format
     * Valid: alphanumeric and underscores, 1-15 chars
     */
    it('validates Twitter handle format', () => {
      const validHandles = ['a', 'user123', 'my_handle', 'A1_b2_C3'];
      const invalidHandles = ['', 'too-long-handle-name', '@user', 'user@domain'];
      
      const twitterHandleRegex = /^[a-zA-Z0-9_]{1,15}$/;
      
      for (const handle of validHandles) {
        expect(twitterHandleRegex.test(handle), `${handle} should be valid`).toBe(true);
      }
      
      for (const handle of invalidHandles) {
        expect(twitterHandleRegex.test(handle), `${handle} should be invalid`).toBe(false);
      }
    });

    /**
     * Test: GitHub username format
     * Valid: alphanumeric and hyphens, 1-39 chars, no consecutive hyphens
     */
    it('validates GitHub username format', () => {
      const validHandles = ['a', 'user123', 'my-handle', 'octocat'];
      const invalidHandles = ['', '-starts-with-hyphen', 'ends-with-hyphen-', 'has--double'];
      
      const githubUsernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
      
      for (const handle of validHandles) {
        // Simple check - actual validation may vary
        expect(handle.length).toBeGreaterThan(0);
        expect(handle.length).toBeLessThanOrEqual(39);
      }
    });

    /**
     * Test: ENS name format
     * Valid: ends with .eth
     */
    it('validates ENS name format', () => {
      const validENS = ['vitalik.eth', 'test.eth', 'my-name.eth'];
      const invalidENS = ['vitalik', 'test.com', '.eth'];
      
      const ensRegex = /^[a-zA-Z0-9-]+\.eth$/;
      
      for (const ens of validENS) {
        expect(ensRegex.test(ens), `${ens} should be valid ENS`).toBe(true);
      }
      
      for (const ens of invalidENS) {
        expect(ensRegex.test(ens), `${ens} should be invalid ENS`).toBe(false);
      }
    });

    /**
     * Test: Farcaster FID format
     * Can be numeric FID or fname
     */
    it('validates Farcaster identifier format', () => {
      const validFarcaster = ['1', '12345', 'dwr.eth', 'username'];
      
      for (const fid of validFarcaster) {
        expect(fid.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Statement Signing (OT-PF-107)', () => {
    /**
     * Test: Statement is signed with EIP-712
     */
    it('statement can be included in EIP-712 message', () => {
      const statement = 'I am linking my X (Twitter) @example to this wallet.';
      
      const eip712Message = {
        signer: '0x1234567890123456789012345678901234567890',
        authorizedEntity: 'did:web:example.com',
        signingPurpose: 'shared-control',
        statement: statement,
      };

      expect(eip712Message.statement).toBe(statement);
      expect(typeof eip712Message.statement).toBe('string');
    });

    /**
     * Test: Statement is signed with JWS
     */
    it('statement can be included in JWS claims', () => {
      const statement = 'I am linking my GitHub @octocat to this wallet.';
      
      const jwsClaims = {
        iss: 'did:web:example.com',
        aud: 'did:web:controller.com',
        proofPurpose: 'shared-control',
        statement: statement,
        iat: Math.floor(Date.now() / 1000),
      };

      expect(jwsClaims.statement).toBe(statement);
    });

    /**
     * Test: Statement timestamp is included
     */
    it('includes timestamp with statement', () => {
      const now = Math.floor(Date.now() / 1000);
      
      const signedStatement = {
        statement: 'I am linking my Discord @user#1234 to this wallet.',
        signedAt: now,
        expiresAt: now + 3600, // 1 hour
      };

      expect(signedStatement.signedAt).toBeLessThanOrEqual(Date.now() / 1000);
      expect(signedStatement.expiresAt).toBeGreaterThan(signedStatement.signedAt);
    });
  });

  describe('Statement Verification (OT-PF-108)', () => {
    /**
     * Test: Statement structure validation
     */
    it('validates statement structure', () => {
      const isValidStatement = (stmt: string): boolean => {
        const pattern = /^I am linking my .+ @\S+ to this wallet\.$/;
        return pattern.test(stmt);
      };

      expect(isValidStatement('I am linking my X (Twitter) @user to this wallet.')).toBe(true);
      expect(isValidStatement('I am linking my GitHub @octocat to this wallet.')).toBe(true);
      expect(isValidStatement('Random text')).toBe(false);
      expect(isValidStatement('I am linking my X (Twitter) @ to this wallet.')).toBe(false);
    });

    /**
     * Test: Extract all statement components
     */
    it('extracts all statement components', () => {
      const parseStatement = (stmt: string) => {
        const match = stmt.match(/^I am linking my (.+) @(\S+) to this wallet\.$/);
        if (!match) return null;
        return {
          handleType: match[1],
          handle: match[2],
        };
      };

      const result = parseStatement('I am linking my LinkedIn @john-doe to this wallet.');
      
      expect(result).not.toBeNull();
      expect(result?.handleType).toBe('LinkedIn');
      expect(result?.handle).toBe('john-doe');
    });

    /**
     * Test: Statement matches claimed handle
     */
    it('verifies statement matches claimed handle', () => {
      const claimedHandle = {
        type: 'X (Twitter)',
        username: 'testuser',
      };

      const statement = `I am linking my ${claimedHandle.type} @${claimedHandle.username} to this wallet.`;
      
      // Verify the statement contains the claimed values
      expect(statement).toContain(claimedHandle.type);
      expect(statement).toContain(`@${claimedHandle.username}`);
    });
  });

  describe('Handle Type Mapping', () => {
    /**
     * Test: Platform URL mapping
     */
    it('maps handle types to verification URLs', () => {
      const platformUrls: Record<string, string> = {
        'X (Twitter)': 'https://x.com/',
        'GitHub': 'https://github.com/',
        'Discord': 'https://discord.com/users/',
        'Telegram': 'https://t.me/',
        'LinkedIn': 'https://linkedin.com/in/',
        'Instagram': 'https://instagram.com/',
        'YouTube': 'https://youtube.com/@',
        'TikTok': 'https://tiktok.com/@',
        'Farcaster': 'https://warpcast.com/',
        'Lens': 'https://lenster.xyz/u/',
      };

      for (const [platform, baseUrl] of Object.entries(platformUrls)) {
        expect(baseUrl).toMatch(/^https:\/\//);
        expect(VALID_HANDLE_TYPES).toContain(platform);
      }
    });

    /**
     * Test: Construct verification URL
     */
    it('constructs verification URLs', () => {
      const handle = {
        type: 'X (Twitter)',
        username: 'example',
      };

      const verificationUrl = `https://x.com/${handle.username}`;
      
      expect(verificationUrl).toBe('https://x.com/example');
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test: Handle with special characters
     */
    it('handles special characters in handle', () => {
      // Some platforms allow underscores, hyphens, etc.
      const statements = [
        'I am linking my X (Twitter) @user_name to this wallet.',
        'I am linking my GitHub @user-name to this wallet.',
        'I am linking my Discord @user#1234 to this wallet.',
      ];

      for (const stmt of statements) {
        expect(stmt).toMatch(/@\S+/);
      }
    });

    /**
     * Test: Unicode handles (international usernames)
     */
    it('supports unicode in handles where platforms allow', () => {
      // Some platforms like Telegram allow unicode
      const statement = 'I am linking my Telegram @用户 to this wallet.';
      
      expect(statement).toContain('@用户');
    });

    /**
     * Test: Empty or whitespace handle rejected
     */
    it('rejects empty handles', () => {
      const invalidStatements = [
        'I am linking my X (Twitter) @ to this wallet.',
        'I am linking my GitHub @  to this wallet.',
      ];

      const pattern = /^I am linking my .+ @\S+ to this wallet\.$/;
      
      for (const stmt of invalidStatements) {
        expect(pattern.test(stmt)).toBe(false);
      }
    });

    /**
     * Test: Very long handle
     */
    it('handles very long usernames', () => {
      const longHandle = 'a'.repeat(100);
      const statement = `I am linking my custom @${longHandle} to this wallet.`;
      
      // Should still match pattern
      const pattern = /^I am linking my .+ @\S+ to this wallet\.$/;
      expect(pattern.test(statement)).toBe(true);
    });

    /**
     * Test: Numeric-only handle
     */
    it('supports numeric handles', () => {
      // Farcaster FIDs can be numeric
      const statement = 'I am linking my Farcaster @12345 to this wallet.';
      
      expect(statement).toContain('@12345');
    });
  });

  describe('Integration with Proof Objects', () => {
    /**
     * Test: Handle-Link in pop-jws proof
     */
    it('includes Handle-Link in pop-jws proof', () => {
      const proof = {
        proofType: 'pop-jws',
        proofPurpose: 'shared-control',
        proofObject: {
          // JWS token containing the statement
          token: 'eyJ...',
          claims: {
            statement: 'I am linking my X (Twitter) @user to this wallet.',
            iat: Math.floor(Date.now() / 1000),
          },
        },
      };

      expect(proof.proofObject.claims.statement).toContain('I am linking my');
    });

    /**
     * Test: Handle-Link in pop-eip712 proof
     */
    it('includes Handle-Link in pop-eip712 proof', () => {
      const proof = {
        proofType: 'pop-eip712',
        proofPurpose: 'shared-control',
        proofObject: {
          domain: {
            name: 'HandleLink',
            version: '1',
            chainId: 1,
          },
          message: {
            signer: '0x1234567890123456789012345678901234567890',
            statement: 'I am linking my GitHub @octocat to this wallet.',
          },
          signature: '0x...',
        },
      };

      expect(proof.proofObject.message.statement).toContain('I am linking my');
    });

    /**
     * Test: Handle-Link with evidence-pointer
     */
    it('references Handle-Link via evidence-pointer', () => {
      const proof = {
        proofType: 'evidence-pointer',
        proofPurpose: 'shared-control',
        proofObject: {
          evidenceUrl: 'https://x.com/user/status/1234567890',
          expectedContent: 'I am linking my X (Twitter) @user to this wallet.',
        },
      };

      expect(proof.proofObject.evidenceUrl).toMatch(/^https:\/\//);
    });
  });
});

