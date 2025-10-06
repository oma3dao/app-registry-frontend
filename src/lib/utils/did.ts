/**
 * DID normalization utilities
 */

/**
 * Normalize a DID:web identifier to a consistent format
 * @param input The DID string to normalize
 * @returns Normalized DID in lowercase with did:web: prefix
 */
export function normalizeDidWeb(input: string): string {
  let s = input.trim();
  
  // Remove did:web: prefix if present to normalize
  if (s.startsWith('did:web:')) {
    s = s.slice('did:web:'.length);
  }
  
  // Convert to lowercase for consistency
  s = s.toLowerCase();
  
  // Re-add did:web: prefix
  return `did:web:${s}`;
}

/**
 * Validate if a string is a valid DID format
 * @param did The DID string to validate
 * @returns True if valid DID format
 */
export function isValidDid(did: string): boolean {
  // Basic DID format: did:method:identifier
  const didPattern = /^did:[a-z0-9]+:.+$/i;
  return didPattern.test(did);
}

/**
 * Extract the method from a DID
 * @param did The DID string
 * @returns The method part of the DID (e.g., "web" from "did:web:example.com")
 */
export function extractDidMethod(did: string): string | null {
  const match = did.match(/^did:([a-z0-9]+):/i);
  return match ? match[1] : null;
}

/**
 * Extract the identifier from a DID
 * @param did The DID string
 * @returns The identifier part of the DID (e.g., "example.com" from "did:web:example.com")
 */
export function extractDidIdentifier(did: string): string | null {
  const match = did.match(/^did:[a-z0-9]+:(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Compute keccak256 hash of a DID string (for contract calls)
 * Note: This calls the contract's getDidHash() function which does the same computation
 * This keeps the hash logic in one place (the contract)
 * @param did The DID string
 * @returns The hex-encoded keccak256 hash with 0x prefix
 */
export async function getDidHash(did: string): Promise<`0x${string}`> {
  // Import here to avoid circular dependencies
  const { readContract } = await import('thirdweb');
  const { getAppRegistryContract } = await import('../contracts/client');
  
  const contract = getAppRegistryContract();
  
  const hash = await readContract({
    contract,
    method: 'function getDidHash(string) pure returns (bytes32)',
    params: [did],
  });
  
  return hash as `0x${string}`;
}

/**
 * Synchronous version using ethers/viem keccak256
 * For cases where we need the hash without async
 */
export function getDidHashSync(did: string): `0x${string}` {
  // For now, use a simple implementation
  // In production, import from '@noble/hashes/sha3' or similar
  // return keccak256(toBytes(did))
  
  // Placeholder - throws error to force using async version
  throw new Error('Sync DID hash not implemented - use async getDidHash() instead');
}

/**
 * Normalize a domain name to a consistent format
 * Used for DNS lookups and domain comparison
 * @param domain The domain name to normalize
 * @returns Normalized domain (lowercase, no trailing dot)
 */
export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/\.$/, '');
}
