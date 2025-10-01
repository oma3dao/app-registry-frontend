/**
 * Pure functions for reading from the OMA3AppMetadataV0 contract (Phase 0)
 */

import { readContract } from 'thirdweb';
import { getAppMetadataContract } from './client';
import type { MetadataContractData } from '@/types/metadata-contract';
import { buildMetadataStructure } from './metadata.utils';
import { normalizeEvmError } from './errors';

/**
 * Get metadata for a versioned DID
 * @param versionedDid The versioned DID (e.g., "did:web:example.com:v:1.0")
 * @returns Structured metadata or null if not found
 */
export async function getMetadata(versionedDid: string): Promise<MetadataContractData | null> {
  try {
    const contract = getAppMetadataContract();
    
    const metadataJson = await readContract({
      contract,
      method: "function getMetadataJson(string) view returns (string)",
      params: [versionedDid]
    });

    if (!metadataJson || metadataJson.trim() === "") {
      return null;
    }

    const structuredMetadata = buildMetadataStructure(metadataJson);
    if (!structuredMetadata) {
      return null;
    }

    return structuredMetadata;
    
  } catch (error) {
    console.error(`Error getting metadata for ${versionedDid}:`, error);
    return null;
  }
}
