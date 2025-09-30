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
