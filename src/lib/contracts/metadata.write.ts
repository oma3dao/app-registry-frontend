/**
 * Pure functions for preparing write transactions to the OMA3AppMetadataV0 contract (Phase 0)
 */

import { prepareContractCall } from 'thirdweb';
import { getAppMetadataContract } from './client';
import type { NFT } from "@/schema/data-model";
import { buildMetadataJSON, validateMetadataJSON } from './metadata.utils';
import { normalizeEvmError } from './errors';

/**
 * Prepare a transaction to set metadata for an app
 * @param nft The NFT data containing metadata
 * @returns Prepared transaction ready to be sent with an account
 */
export function prepareSetMetadata(nft: NFT) {
  try {
    const metadata = buildMetadataJSON(nft);
    
    if (!validateMetadataJSON(metadata)) {
      throw new Error("Invalid metadata");
    }
    
    const contract = getAppMetadataContract();
    
    // Parse version string to components
    const versionParts = nft.version.split('.').map(Number);
    const [major = 1, minor = 0, patch = 0] = versionParts;
    
    return prepareContractCall({
      contract,
      method: "function setMetadataJson(string, uint8, uint8, uint8, string)",
      params: [nft.did, major, minor, patch, metadata]
    });
  } catch (e) {
    throw normalizeEvmError(e);
  }
}
