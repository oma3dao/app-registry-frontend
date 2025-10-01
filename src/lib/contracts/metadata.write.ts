/**
 * Pure functions for preparing write transactions to the OMA3AppMetadataV0 contract (Phase 0)
 */

import { prepareContractCall } from 'thirdweb';
import { getAppMetadataContract } from './client';
import type { NFT } from "@/types/nft";
import { buildMetadataJSON, validateMetadataJSON } from './metadata.utils';
import { buildVersionedDID } from '@/lib/utils';
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
    const versionedDID = buildVersionedDID(nft.did, nft.version);
    
    return prepareContractCall({
      contract,
      method: "function setMetadataJson(string, string)",
      params: [versionedDID, metadata]
    });
  } catch (e) {
    throw normalizeEvmError(e);
  }
}
