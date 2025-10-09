/**
 * Server-side utility for loading issuer private key
 * Used by API routes for signing attestation transactions
 * 
 * Note: This only returns a private key for direct signing.
 * Check for Thirdweb Managed Vault separately (different signing flow).
 * 
 * Priority:
 * 1. ISSUER_PRIVATE_KEY env var (Vercel/deployment - simple testnet approach)
 * 2. SSH file ~/.ssh/local-attestation-key (local dev)
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Check if Thirdweb Managed Vault is configured
 * Returns wallet address if available, null otherwise
 * 
 * TODO: Re-enable for production deployment
 */
export function getThirdwebManagedWallet(): { secretKey: string; walletAddress: string } | null {
  // TODO: Uncomment for production Thirdweb Managed Vault support
  // const secretKey = process.env.THIRDWEB_SECRET_KEY;
  // const walletAddress = process.env.THIRDWEB_SERVER_WALLET_ADDRESS;
  // 
  // if (secretKey && walletAddress) {
  //   console.log('[issuer-key] Thirdweb Managed Vault configured');
  //   return { secretKey, walletAddress };
  // }
  
  return null;
}

export function loadIssuerPrivateKey(): `0x${string}` {
  // 1. Check environment variable first (for Vercel/deployment)
  if (process.env.ISSUER_PRIVATE_KEY) {
    const envKey = process.env.ISSUER_PRIVATE_KEY.trim();
    const privateKey = envKey.startsWith('0x') ? envKey : `0x${envKey}`;
    
    // Validate format
    if (privateKey.length !== 66 || !/^0x[0-9a-f]{64}$/i.test(privateKey)) {
      throw new Error(
        `Invalid ISSUER_PRIVATE_KEY format. Expected 0x + 64 hex chars, got: ${privateKey.length} chars`
      );
    }
    
    console.log('[issuer-key] Using ISSUER_PRIVATE_KEY from environment');
    return privateKey as `0x${string}`;
  }
  
  // 2. Fall back to SSH file (for local dev)
  const sshKeyPath = path.join(os.homedir(), '.ssh', 'local-attestation-key');
  
  if (!fs.existsSync(sshKeyPath)) {
    throw new Error(
      `No private key found. Either:\n` +
      `1. Set ISSUER_PRIVATE_KEY environment variable, or\n` +
      `2. Create SSH key: node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))" > ~/.ssh/local-attestation-key && chmod 600 ~/.ssh/local-attestation-key`
    );
  }
  
  const keyContent = fs.readFileSync(sshKeyPath, 'utf8')
    .trim()
    .replace(/\s+/g, '') // Remove all whitespace
    .toLowerCase(); // Normalize to lowercase
  
  // Ensure 0x prefix
  const privateKey = keyContent.startsWith('0x') ? keyContent : `0x${keyContent}`;
  
  // Validate: should be 0x + 64 hex chars = 66 chars total
  if (privateKey.length !== 66 || !/^0x[0-9a-f]{64}$/.test(privateKey)) {
    throw new Error(
      `Invalid private key format in ${sshKeyPath}. Expected 0x + 64 hex chars, got: ${privateKey.length} chars`
    );
  }
  
  console.log('[issuer-key] Loaded private key from SSH file');
  return privateKey as `0x${string}`;
}

/**
 * Alternative key loader for verify-did route compatibility
 * Returns null on error instead of throwing
 */
export async function loadIssuerPrivateKeyOrNull(): Promise<string | null> {
  try {
    return loadIssuerPrivateKey();
  } catch (error) {
    console.log('[issuer-key] Could not load private key:', (error as Error).message);
    return null;
  }
}

