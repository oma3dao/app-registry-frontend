/**
 * Mapping functions to convert between form data and contract inputs
 */

import type { TFormState, NFT } from '@/schema/data-model';
import type { MintAppInput, UpdateAppInput } from '@/lib/contracts/types';
import { hashTraits } from '@/lib/utils/traits';
import { canonicalizeForHash } from '@/lib/utils/dataurl';
import { buildOffchainMetadataObject } from '@/lib/utils/offchain-json';
import { env } from '@/config/env';

/**
 * Check if a dataUrl points to our hosted infrastructure
 * Checks for our domains: omatrust.org, oma3.org, localhost, or Vercel previews
 */
export function isOurHostedUrl(dataUrl: string | undefined): boolean {
  if (!dataUrl) return false;
  
  // Check against our base URL (handles current environment: prod, Vercel, localhost)
  if (dataUrl.startsWith(env.appBaseUrl)) return true;
  
  // Check for our root domains (handles any subdomain)
  const ourDomains = [
    'omatrust.org',
    'oma3.org',
    'localhost',
    'vercel.app', // Vercel preview deployments
  ];
  
  return ourDomains.some(domain => dataUrl.includes(domain));
}

/**
 * Convert form data to mint app input for new registrations
 */
export function toMintAppInput(nft: NFT): MintAppInput & { metadataJson: string } {
  // Parse version string (e.g., "1.0.0" -> {major: 1, minor: 0, patch: 0})
  const versionParts = nft.version.split('.').map(Number);
  const [major = 1, minor = 0, patch = 0] = versionParts;

  // Build off-chain metadata object and compute hash
  // Pass flattened NFT structure directly - all fields at top level
  const offchainObj = buildOffchainMetadataObject({
    ...nft, // Spread all flattened fields (name, description, endpoint, mcp, platforms, etc.)
  });

  const jcs = canonicalizeForHash(offchainObj);
  const dataHash = jcs ? jcs.hash : ('0x' + '0'.repeat(64)) as `0x${string}`;

  // Hash traits if provided
  const traitHashes = nft.traits ? hashTraits(nft.traits) : [];

  // Convert interface flags to bitmap
  const interfaces = (nft.interfaceFlags?.human ? 1 : 0) +
                    (nft.interfaceFlags?.api ? 2 : 0) +
                    (nft.interfaceFlags?.smartContract ? 4 : 0);

  return {
    did: nft.did,
    interfaces,
    dataUrl: nft.dataUrl || '',
    dataHash,
    dataHashAlgorithm: 0, // keccak256
    fungibleTokenId: nft.fungibleTokenId || '',
    contractId: nft.contractId || '',
    initialVersionMajor: major,
    initialVersionMinor: minor,
    initialVersionPatch: patch,
    traitHashes,
    // Pass metadataJson only if dataUrl points to our hosted infrastructure
    metadataJson: isOurHostedUrl(nft.dataUrl) ? jcs.jcsJson : "",
  };
}

/**
 * Convert form data to update app input for editing existing apps
 */
export function toUpdateAppInput(
  nft: NFT,
  currentVersion: string
): UpdateAppInput & { metadataJson: string } {
  // Parse current and new versions
  const currentParts = currentVersion.split('.').map(Number);
  const [currentMajor = 1] = currentParts;

  const newParts = nft.version.split('.').map(Number);
  const [newMajor = 1, newMinor = 0, newPatch = 0] = newParts;

  // Build off-chain metadata object and compute hash
  // Pass flattened NFT structure directly - all fields at top level
  const offchainObj = buildOffchainMetadataObject({
    ...nft, // Spread all flattened fields (name, description, endpoint, mcp, platforms, etc.)
  });

  const jcs = canonicalizeForHash(offchainObj);
  const dataHash = jcs ? jcs.hash : ('0x' + '0'.repeat(64)) as `0x${string}`;

  // Hash traits if provided
  const traitHashes = nft.traits ? hashTraits(nft.traits) : [];

  // Convert interface flags to bitmap
  const interfaces = (nft.interfaceFlags?.human ? 1 : 0) +
                    (nft.interfaceFlags?.api ? 2 : 0) +
                    (nft.interfaceFlags?.smartContract ? 4 : 0);

  return {
    did: nft.did,
    major: currentMajor,
    newDataUrl: nft.dataUrl || '',
    newDataHash: dataHash,
    newDataHashAlgorithm: 0, // keccak256
    newInterfaces: interfaces,
    newTraitHashes: traitHashes,
    newMinor,
    newPatch,
    // Pass metadataJson only if dataUrl points to our hosted infrastructure
    metadataJson: isOurHostedUrl(nft.dataUrl) ? jcs.jcsJson : "",
  };
}