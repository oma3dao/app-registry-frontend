/**
 * DID Index Address Utilities
 * 
 * Implements the OMATrust specification section 5.3.2 for converting DIDs
 * to deterministic Ethereum addresses for efficient attestation indexing.
 */

import { keccak256, toUtf8Bytes } from 'ethers'

/**
 * Canonicalize a DID according to its method specification
 * @param did - The DID string to canonicalize
 * @returns Canonicalized DID string
 */
export function canonicalizeDID(did: string): string {
  if (!did.startsWith('did:')) {
    throw new Error('Invalid DID format: must start with "did:"')
  }

  const parts = did.split(':')
  if (parts.length < 3) {
    throw new Error('Invalid DID format: insufficient parts')
  }

  const method = parts[1]
  
  switch (method) {
    case 'web': {
      // For did:web, lowercase the host and preserve the path
      // Example: did:web:Example.COM/path -> did:web:example.com/path
      const hostAndPath = parts.slice(2).join(':')
      const [host, ...pathParts] = hostAndPath.split('/')
      const canonicalHost = host.toLowerCase()
      const path = pathParts.length > 0 ? '/' + pathParts.join('/') : ''
      return `did:web:${canonicalHost}${path}`
    }
    
    case 'pkh': {
      // For did:pkh, use canonical CAIP-10 encoding (already lowercase)
      // Example: did:pkh:eip155:1:0xABC... -> did:pkh:eip155:1:0xabc...
      if (parts.length !== 5) {
        throw new Error('Invalid did:pkh format: must have 5 parts')
      }
      const [, , namespace, chainId, address] = parts
      return `did:pkh:${namespace}:${chainId}:${address.toLowerCase()}`
    }
    
    default:
      // For other methods, return as-is (may need method-specific rules later)
      return did.toLowerCase()
  }
}

/**
 * Compute the DID hash using keccak256
 * @param did - The DID string (will be canonicalized)
 * @returns 32-byte hash as hex string
 */
export function computeDidHash(did: string): string {
  const canonicalDid = canonicalizeDID(did)
  return keccak256(toUtf8Bytes(canonicalDid))
}

/**
 * Compute the DID Index Address for efficient attestation indexing
 * @param didHash - The keccak256 hash of the canonicalized DID
 * @returns Ethereum address derived from the DID
 */
export function computeDidIndex(didHash: string): string {
  // Domain-separated, versioned prefix for portability and clarity
  const prefix = 'DID:Solidity:Address:v1:'
  const combined = prefix + didHash.slice(2) // Remove 0x prefix from didHash
  const hash = keccak256(toUtf8Bytes(combined))
  
  // Take the last 20 bytes (160 bits) to form an address
  const address = '0x' + hash.slice(-40)
  return address
}

/**
 * Convenience function to compute DID Index Address directly from a DID
 * @param did - The DID string
 * @returns Ethereum address for use as attestation recipient
 */
export function didToIndexAddress(did: string): string {
  const didHash = computeDidHash(did)
  return computeDidIndex(didHash)
}

/**
 * Validate that a DID Index Address was computed correctly
 * @param did - The original DID
 * @param indexAddress - The computed index address to validate
 * @returns True if the address matches the DID
 */
export function validateDidIndex(did: string, indexAddress: string): boolean {
  try {
    const expectedAddress = didToIndexAddress(did)
    return expectedAddress.toLowerCase() === indexAddress.toLowerCase()
  } catch {
    return false
  }
}

/**
 * Normalize a domain name to a consistent format
 * Used for DNS lookups and domain comparison
 * @param domain The domain name to normalize
 * @returns Normalized domain (lowercase, no trailing dot)
 */
export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/\.$/, '')
}

/**
 * Validate if a string is a valid DID format
 * @param did The DID string to validate
 * @returns True if valid DID format
 */
export function isValidDid(did: string): boolean {
  // Basic DID format: did:method:identifier
  const didPattern = /^did:[a-z0-9]+:.+$/i
  return didPattern.test(did)
}

/**
 * Extract the method from a DID
 * @param did The DID string
 * @returns The method part of the DID (e.g., "web" from "did:web:example.com")
 */
export function extractDidMethod(did: string): string | null {
  const match = did.match(/^did:([a-z0-9]+):/i)
  return match ? match[1] : null
}

/**
 * Extract the identifier from a DID
 * @param did The DID string
 * @returns The identifier part of the DID (e.g., "example.com" from "did:web:example.com")
 */
export function extractDidIdentifier(did: string): string | null {
  const match = did.match(/^did:[a-z0-9]+:(.+)$/i)
  return match ? match[1] : null
}

/**
 * Normalize a DID:web identifier to a consistent format
 * @param input The DID string to normalize
 * @returns Normalized DID in lowercase with did:web: prefix
 */
export function normalizeDidWeb(input: string): string {
  let s = input.trim()
  
  // Remove did:web: prefix if present to normalize
  if (s.startsWith('did:web:')) {
    s = s.slice('did:web:'.length)
  }
  
  // Convert to lowercase for consistency
  s = s.toLowerCase()
  
  // Re-add did:web: prefix
  return `did:web:${s}`
}
