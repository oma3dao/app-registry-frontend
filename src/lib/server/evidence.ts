/**
 * Shared Evidence Verification Library
 *
 * DNS TXT lookups, did.json fetching, and evidence string parsing
 * used by both controller-witness and verify-and-attest routes.
 *
 * Matching is done at the address level (not full DID) because the same
 * private key controls the same address regardless of chain ID.
 *
 * Reference: OMATrust Proof Specification §5.3.5.2 (evidence-pointer format)
 */

import dns from 'dns';
import { promisify } from 'util';
import { getAddressFromDidPkh, getDomainFromDidWeb } from '@/lib/utils/did';

const resolveTxt = promisify(dns.resolveTxt);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedEvidenceRecord {
  version: string;
  controllers: string[];
}

export interface EvidenceResult {
  found: boolean;
  /** The matching controller DID from the evidence (if found) */
  matchedController?: string;
  /** Human-readable detail for logging / error messages */
  details?: string;
}

// ---------------------------------------------------------------------------
// Evidence string parser
// ---------------------------------------------------------------------------

/**
 * Parse a single evidence string in the `v=1;controller=<DID>` format.
 *
 * Per the OMATrust Proof Spec §5.3.5.2:
 * - Fields separated by semicolons or whitespace
 * - Field order is not significant
 * - Unknown fields are ignored for forward compatibility
 * - Controller values MUST be valid DIDs (e.g. did:pkh:eip155:66238:0x...)
 *   Bare CAIP-10 or raw addresses are rejected.
 *
 * Returns null if the string doesn't contain a valid `v=1` marker.
 */
export function parseEvidenceString(text: string): ParsedEvidenceRecord | null {
  const entries = text.split(/[;\s]+/).map((e) => e.trim()).filter((e) => e.length > 0);

  const hasVersion = entries.some((e) => e === 'v=1');
  if (!hasVersion) return null;

  const controllers: string[] = [];
  for (const entry of entries) {
    if (entry.startsWith('controller=')) {
      const value = entry.slice('controller='.length).trim();
      if (!value.startsWith('did:')) {
        // Spec requires controller value to be a DID (e.g. did:pkh:eip155:66238:0x...)
        // Bare CAIP-10 or raw addresses are not accepted
        continue;
      }
      controllers.push(value);
    }
  }

  return { version: '1', controllers };
}


// ---------------------------------------------------------------------------
// Address extraction helper
// ---------------------------------------------------------------------------

/**
 * Extract the underlying address from a DID or raw address.
 *
 * Currently EVM-only (eip155 namespace). When non-EVM chains are added
 * (e.g., Solana/base58, Cosmos/bech32), this function will need to handle
 * additional namespaces from did:pkh.
 *
 * Supports:
 * - `did:pkh:eip155:<chainId>:<address>` → address
 * - `did:key:z...` → null (no extractable address)
 * - Raw `0x...` address → as-is
 *
 * Returns lowercase for case-insensitive comparison.
 */
export function extractAddress(didOrAddress: string): string | null {
  if (didOrAddress.startsWith('did:pkh:')) {
    const addr = getAddressFromDidPkh(didOrAddress);
    return addr?.toLowerCase() ?? null;
  }
  // Raw Ethereum address
  if (/^0x[a-fA-F0-9]{40}$/.test(didOrAddress)) {
    return didOrAddress.toLowerCase();
  }
  return null;
}

/**
 * Check if two DIDs or addresses refer to the same underlying key holder.
 * Compares at the address level — chain ID is ignored.
 */
export function addressesMatch(a: string, b: string): boolean {
  const addrA = extractAddress(a);
  const addrB = extractAddress(b);
  if (!addrA || !addrB) return false;
  return addrA === addrB;
}

// ---------------------------------------------------------------------------
// DNS TXT evidence
// ---------------------------------------------------------------------------

/**
 * Query `_omatrust.<domain>` DNS TXT records and look for a controller
 * that matches the expected address.
 *
 * @param domain - bare domain (e.g. "example.com"), not a DID
 * @param expectedController - DID or address to match against
 */
export async function findControllerInDnsTxt(
  domain: string,
  expectedController: string,
): Promise<EvidenceResult> {
  const txtRecordName = `_omatrust.${domain}`;

  let records: string[][];
  try {
    records = await resolveTxt(txtRecordName);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { found: false, details: `DNS lookup failed for ${txtRecordName}: ${msg}` };
  }

  if (records.length === 0) {
    return { found: false, details: `No TXT records found at ${txtRecordName}` };
  }

  const allControllers: string[] = [];

  for (const record of records) {
    const text = Array.isArray(record) ? record.join('') : record;
    const parsed = parseEvidenceString(text);
    if (!parsed) continue;

    for (const controller of parsed.controllers) {
      allControllers.push(controller);
      if (addressesMatch(controller, expectedController)) {
        return { found: true, matchedController: controller };
      }
    }
  }

  if (allControllers.length === 0) {
    return { found: false, details: `TXT records at ${txtRecordName} found but no controller entries` };
  }

  return {
    found: false,
    details: `Controllers [${allControllers.join(', ')}] in ${txtRecordName} do not match expected ${expectedController}`,
  };
}

// ---------------------------------------------------------------------------
// did.json evidence
// ---------------------------------------------------------------------------

/**
 * Fetch `/.well-known/did.json` for a domain and look for a controller
 * that matches the expected address in the verificationMethod array.
 *
 * Checks `blockchainAccountId` (CAIP-10 format) and `publicKeyHex` fields.
 *
 * @param domain - bare domain (e.g. "example.com"), not a DID
 * @param expectedController - DID or address to match against
 */
export async function findControllerInDidDoc(
  domain: string,
  expectedController: string,
): Promise<EvidenceResult> {
  const didDocUrl = `https://${domain}/.well-known/did.json`;

  let didDoc: any;
  try {
    const response = await fetch(didDocUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return { found: false, details: `DID document fetch failed: ${response.status} ${response.statusText} at ${didDocUrl}` };
    }
    didDoc = await response.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { found: false, details: `Failed to fetch DID document at ${didDocUrl}: ${msg}` };
  }

  const verificationMethods: any[] = didDoc.verificationMethod || [];
  if (verificationMethods.length === 0) {
    return { found: false, details: `DID document at ${didDocUrl} has no verificationMethod entries` };
  }

  const foundAddresses: string[] = [];

  for (const method of verificationMethods) {
    // blockchainAccountId is CAIP-10 format: namespace:chainId:address
    if (method.blockchainAccountId) {
      const parts = method.blockchainAccountId.split(':');
      if (parts.length === 3) {
        const address = parts[2];
        foundAddresses.push(address);
        if (addressesMatch(address, expectedController)) {
          return { found: true, matchedController: `did:pkh:${method.blockchainAccountId}` };
        }
      }
    }

    // publicKeyHex — raw hex address without 0x prefix
    if (method.publicKeyHex) {
      const address = '0x' + method.publicKeyHex;
      foundAddresses.push(address);
      if (addressesMatch(address, expectedController)) {
        return { found: true, matchedController: address };
      }
    }
  }

  return {
    found: false,
    details: `Addresses [${foundAddresses.join(', ')}] in ${didDocUrl} do not match expected ${expectedController}`,
  };
}
