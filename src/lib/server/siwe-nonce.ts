/**
 * Server-side SIWE nonce generation and verification
 * Stateless implementation using HMAC signatures (Vercel-compatible)
 * 
 * Priority for secret:
 * 1. SIWE_SERVER_SECRET env var (Vercel/deployment)
 * 2. SSH file ~/.ssh/siwe-server-secret (local dev)
 * 3. Fallback to NEXTAUTH_SECRET if available
 */

import { randomBytes, createHmac } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Get server secret for SIWE nonce signing
 */
function getServerSecret(): string {
  // 1. Check environment variable first (for Vercel/deployment)
  if (process.env.SIWE_SERVER_SECRET) {
    return process.env.SIWE_SERVER_SECRET;
  }
  
  // 2. Try SSH file (for local dev)
  try {
    const sshKeyPath = path.join(os.homedir(), '.ssh', 'siwe-server-secret');
    
    if (fs.existsSync(sshKeyPath)) {
      const secret = fs.readFileSync(sshKeyPath, 'utf8').trim();
      if (secret) {
        console.log('[siwe-secret] Using secret from SSH file');
        return secret;
      }
    }
  } catch (error) {
    // Ignore file read errors, fall through to next option
  }
  
  // 3. Fallback to NEXTAUTH_SECRET
  if (process.env.NEXTAUTH_SECRET) {
    console.log('[siwe-secret] Using NEXTAUTH_SECRET as fallback');
    return process.env.NEXTAUTH_SECRET;
  }
  
  throw new Error(
    'No SIWE server secret found. Either:\n' +
    '1. Set SIWE_SERVER_SECRET environment variable, or\n' +
    '2. Create SSH secret: openssl rand -base64 32 > ~/.ssh/siwe-server-secret && chmod 600 ~/.ssh/siwe-server-secret'
  );
}

/**
 * Generate a stateless nonce token
 * Format: {randomNonce}.{timestamp}.{hmacSignature}
 */
export function generateNonceToken(): string {
  const randomNonce = randomBytes(16).toString('base64url');
  const timestamp = Date.now().toString();
  
  // Create HMAC signature of nonce + timestamp
  const hmac = createHmac('sha256', getServerSecret());
  hmac.update(`${randomNonce}.${timestamp}`);
  const signature = hmac.digest('base64url');
  
  // Return token: nonce.timestamp.signature
  return `${randomNonce}.${timestamp}.${signature}`;
}

/**
 * Verify a nonce token is valid and not expired
 * Returns the original nonce if valid, null otherwise
 */
export function verifyNonceToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('[siwe-nonce] Invalid token format');
      return null;
    }
    
    const [randomNonce, timestamp, signature] = parts;
    
    // Verify HMAC signature
    const hmac = createHmac('sha256', getServerSecret());
    hmac.update(`${randomNonce}.${timestamp}`);
    const expectedSignature = hmac.digest('base64url');
    
    if (signature !== expectedSignature) {
      console.log('[siwe-nonce] Invalid signature');
      return null;
    }
    
    // Check if expired (10 minutes)
    const tenMinutes = 10 * 60 * 1000;
    const tokenTime = parseInt(timestamp, 10);
    if (Date.now() - tokenTime > tenMinutes) {
      console.log('[siwe-nonce] Token expired');
      return null;
    }
    
    console.log('[siwe-nonce] Token verified successfully');
    return token; // Return the full token as the nonce
    
  } catch (error) {
    console.error('[siwe-nonce] Verification error:', error);
    return null;
  }
}
