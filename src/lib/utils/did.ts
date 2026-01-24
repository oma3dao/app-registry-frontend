/**
 * DID Utilities
 * 
 * Unified DID utilities for the OMATrust ecosystem.
 * Supports multiple DID methods per OMATrust Identity Specification:
 * - did:web (domain-based identifiers)
 * - did:pkh (blockchain account identifiers)
 * - did:artifact (binary verification)
 * - did:key, did:ethr (other supported methods)
 * 
 * Also provides DID Address computation for EAS attestation indexing
 * per OMATrust specification section 5.3.2.
 */

import { keccak256, toUtf8Bytes } from 'ethers';

// ============================================================================
// DID Validation
// ============================================================================

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

// ============================================================================
// DID Normalization
// ============================================================================

/**
 * Normalize a did:web identifier to canonical form
 * 
 * @param input - did:web DID or bare domain
 * @returns Normalized did:web DID
 * @throws Error if input is a non-web DID method
 */
export function normalizeDidWeb(input: string): string {
  const s = input.trim();
  
  // Check for other DID methods - these should not go through did:web normalization
  if (s.startsWith('did:') && !s.startsWith('did:web:')) {
    throw new Error(`normalizeDidWeb received non-web DID: ${s}. Use normalizeDid() for general DID normalization.`);
  }
  
  // Strip did:web: prefix if present
  const identifier = s.startsWith('did:web:') ? s.slice('did:web:'.length) : s;
  
  // Lowercase host only, preserve path case (paths are case-sensitive per URL semantics)
  const [host, ...pathParts] = identifier.split('/');
  const canonicalHost = host.toLowerCase();
  const path = pathParts.length > 0 ? '/' + pathParts.join('/') : '';
  
  return `did:web:${canonicalHost}${path}`;
}

/**
 * Normalize a did:pkh identifier to canonical form
 * Lowercases the address component per CAIP-10 canonical form
 * 
 * @param input - did:pkh DID string
 * @returns Normalized did:pkh DID
 * @throws Error if input is not a valid did:pkh
 */
export function normalizeDidPkh(input: string): string {
  const s = input.trim();
  
  if (!s.startsWith('did:pkh:')) {
    throw new Error(`normalizeDidPkh received non-pkh DID: ${s}`);
  }
  
  // did:pkh:namespace:chainId:address
  const parts = s.split(':');
  if (parts.length !== 5) {
    throw new Error(`Invalid did:pkh format: ${s}. Expected did:pkh:namespace:chainId:address`);
  }
  
  const [, , namespace, chainId, address] = parts;
  return `did:pkh:${namespace}:${chainId}:${address.toLowerCase()}`;
}

/**
 * Normalize a did:handle identifier to canonical form
 * Lowercases platform (namespace), preserves username case (platform-defined)
 * 
 * @param input - did:handle DID string
 * @returns Normalized did:handle DID
 * @throws Error if input is not a valid did:handle
 */
export function normalizeDidHandle(input: string): string {
  const s = input.trim();
  
  if (!s.startsWith('did:handle:')) {
    throw new Error(`normalizeDidHandle received non-handle DID: ${s}`);
  }
  
  // did:handle:platform:username
  const parts = s.split(':');
  if (parts.length !== 4) {
    throw new Error(`Invalid did:handle format: ${s}. Expected did:handle:platform:username`);
  }
  
  const [, , platform, username] = parts;
  // Platform is namespace-controlled → lowercase
  // Username case sensitivity is platform-defined → preserve
  return `did:handle:${platform.toLowerCase()}:${username}`;
}

/**
 * Normalize a did:key identifier
 * The multibase encoding is case-sensitive, so we preserve the key portion as-is
 * 
 * @param input - did:key DID string
 * @returns Normalized did:key DID (unchanged, case-sensitive)
 * @throws Error if input is not a valid did:key
 */
export function normalizeDidKey(input: string): string {
  const s = input.trim();
  
  if (!s.startsWith('did:key:')) {
    throw new Error(`normalizeDidKey received non-key DID: ${s}`);
  }
  
  // did:key uses multibase encoding which is case-sensitive
  // Return as-is (only trim whitespace)
  return s;
}

/**
 * Normalize any DID to its canonical form
 * 
 * This is the primary public API for DID normalization.
 * Handles all supported DID methods per OMATrust specification.
 * 
 * @param input - DID string or bare domain (for did:web)
 * @returns Canonicalized DID string
 * @throws Error if DID format is invalid
 */
export function normalizeDid(input: string): string {
  const s = input.trim();
  
  // Bare domain (no did: prefix) - treat as did:web
  if (!s.startsWith('did:')) {
    return normalizeDidWeb(s);
  }
  
  // Extract method
  const method = extractDidMethod(s);
  
  switch (method) {
    case 'web':
      return normalizeDidWeb(s);
    
    case 'pkh':
      return normalizeDidPkh(s);
    
    case 'handle':
      return normalizeDidHandle(s);
    
    case 'key':
      return normalizeDidKey(s);
    
    case 'artifact':
    case 'ethr':
      // These methods don't require normalization beyond trimming
      return s;
    
    default:
      // Unknown method - return as-is (don't mangle unknown DIDs)
      return s;
  }
}

// ============================================================================
// DID Hashing
// ============================================================================

/**
 * Compute the keccak256 hash of a normalized DID
 * 
 * This is a local computation - no RPC call needed.
 * The DID is normalized before hashing to ensure consistent results.
 * 
 * @param did - The DID string (will be normalized first)
 * @returns 32-byte hash as hex string with 0x prefix
 */
export function computeDidHash(did: string): `0x${string}` {
  const normalizedDid = normalizeDid(did);
  return keccak256(toUtf8Bytes(normalizedDid)) as `0x${string}`;
}

// ============================================================================
// DID Address (for EAS attestation indexing)
// ============================================================================

/**
 * Compute the DID Address for attestation indexing
 * 
 * This derives a deterministic Ethereum address from a DID hash.
 * Used as the `recipient` field in EAS attestations to enable
 * efficient lookup of attestations about a DID.
 * 
 * Note: This is NOT a real wallet address - it's a derived lookup key.
 * 
 * Algorithm: Simple truncation of didHash to 20 bytes (per OMATrust spec 5.3.2)
 * 
 * @param didHash - The keccak256 hash of the normalized DID
 * @returns Ethereum address derived from the DID
 */
export function computeDidAddress(didHash: string): string {
  // Take the last 20 bytes (40 hex chars) to form an address
  // Simple truncation per OMATrust spec section 5.3.2
  return '0x' + didHash.slice(-40);
}

/**
 * Convenience function to compute DID Address directly from a DID
 * 
 * @param did - The DID string
 * @returns Ethereum address for use as attestation recipient
 */
export function didToAddress(did: string): string {
  const didHash = computeDidHash(did);
  return computeDidAddress(didHash);
}

/**
 * Validate that a DID Address was computed correctly
 * 
 * @param did - The original DID
 * @param address - The computed address to validate
 * @returns True if the address matches the DID
 */
export function validateDidAddress(did: string, address: string): boolean {
  try {
    const expectedAddress = didToAddress(did);
    return expectedAddress.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

// ============================================================================
// Domain Utilities
// ============================================================================

/**
 * Normalize a domain name to a consistent format
 * Used for DNS lookups and domain comparison
 * 
 * @param domain The domain name to normalize
 * @returns Normalized domain (lowercase, no trailing dot)
 */
export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/\.$/, '');
}

// ============================================================================
// DID Creation
// ============================================================================

/**
 * Build a did:web DID from a domain name
 * 
 * @param domain - Domain name (e.g., "example.com")
 * @returns Normalized did:web DID
 */
export function buildDidWeb(domain: string): string {
  const normalized = normalizeDomain(domain);
  return `did:web:${normalized}`;
}

/**
 * Build a did:pkh DID from components
 * 
 * @param namespace - Chain namespace (e.g., "eip155" for EVM chains)
 * @param chainId - Chain ID (e.g., 1 for Ethereum mainnet)
 * @param address - Account address
 * @returns Normalized did:pkh DID
 */
export function buildDidPkh(namespace: string, chainId: number | string, address: string): string {
  return `did:pkh:${namespace}:${chainId}:${address.toLowerCase()}`;
}

/**
 * Build a did:pkh DID for an EVM chain
 * Convenience function that uses "eip155" namespace
 * 
 * TODO: When adding non-EVM wallet support (Solana, Cosmos, etc.),
 * callers should migrate to buildDidPkh() with the appropriate namespace,
 * or add similar convenience functions (buildSolanaDidPkh, etc.)
 * See: OMATrust Proof Spec Appendix A for supported chains
 * 
 * @param chainId - EVM chain ID
 * @param address - Ethereum address
 * @returns Normalized did:pkh DID
 */
export function buildEvmDidPkh(chainId: number, address: string): string {
  return buildDidPkh('eip155', chainId, address);
}

/**
 * Build a did:pkh DID from a CAIP-10 account identifier
 * 
 * @param caip10 - CAIP-10 string (e.g., "eip155:1:0x...")
 * @returns did:pkh DID
 */
export function buildDidPkhFromCaip10(caip10: string): string {
  return `did:pkh:${caip10.toLowerCase()}`;
}

// ============================================================================
// DID Parsing (for did:pkh)
// ============================================================================

/**
 * Parse a CAIP-10 account identifier
 * 
 * @param caip10 - CAIP-10 string (e.g., "eip155:1:0x...")
 * @returns Parsed components or null if invalid
 */
export function parseCaip10(caip10: string): { namespace: string; chainId: number; address: string } | null {
  const parts = caip10.split(':');
  
  if (parts.length !== 3) {
    return null;
  }
  
  const [namespace, chainIdStr, address] = parts;
  const chainId = parseInt(chainIdStr, 10);
  
  if (isNaN(chainId)) {
    return null;
  }
  
  return { namespace, chainId, address };
}

/**
 * Extract chain ID from a did:pkh DID
 * 
 * @param did - did:pkh DID string
 * @returns Chain ID or null if not a valid did:pkh
 */
export function getChainIdFromDidPkh(did: string): number | null {
  if (!did.startsWith('did:pkh:')) {
    return null;
  }
  
  const caip10 = did.slice('did:pkh:'.length);
  const parsed = parseCaip10(caip10);
  
  return parsed?.chainId ?? null;
}

/**
 * Extract address from a did:pkh DID
 * 
 * @param did - did:pkh DID string
 * @returns Address or null if not a valid did:pkh
 */
export function getAddressFromDidPkh(did: string): string | null {
  if (!did.startsWith('did:pkh:')) {
    return null;
  }
  
  const caip10 = did.slice('did:pkh:'.length);
  const parsed = parseCaip10(caip10);
  
  return parsed?.address ?? null;
}

/**
 * Extract namespace from a did:pkh DID
 * 
 * @param did - did:pkh DID string
 * @returns Namespace (e.g., "eip155") or null if not a valid did:pkh
 */
export function getNamespaceFromDidPkh(did: string): string | null {
  if (!did.startsWith('did:pkh:')) {
    return null;
  }
  
  const caip10 = did.slice('did:pkh:'.length);
  const parsed = parseCaip10(caip10);
  
  return parsed?.namespace ?? null;
}

/**
 * Check if a did:pkh DID is for an EVM chain (eip155 namespace)
 * 
 * TODO: When adding non-EVM wallet support, consider adding similar
 * functions (isSolanaDidPkh, isCosmosDidPkh) or a generic
 * isDidPkhNamespace(did, namespace) function.
 * 
 * @param did - did:pkh DID string
 * @returns True if EVM chain, false otherwise
 */
export function isEvmDidPkh(did: string): boolean {
  const namespace = getNamespaceFromDidPkh(did);
  return namespace === 'eip155';
}

/**
 * Extract domain from a did:web DID
 * 
 * @param did - did:web DID string
 * @returns Domain or null if not a valid did:web
 */
export function getDomainFromDidWeb(did: string): string | null {
  if (!did.startsWith('did:web:')) {
    return null;
  }
  
  const identifier = did.slice('did:web:'.length);
  // Domain is everything before the first slash (path separator)
  const [domain] = identifier.split('/');
  return domain || null;
}
