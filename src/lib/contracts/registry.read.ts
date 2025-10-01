/**
 * Pure functions for reading from the OMA3 App Registry contract
 * These functions do NOT use React hooks and can be called from anywhere
 */

import { readContract } from 'thirdweb';
import { getAppRegistryContract } from './client';
import type { AppSummary, Paginated, Status } from './types';
import { normalizeDidWeb } from '../utils/did';
import { normalizeEvmError } from './errors';
import { hexToString } from '../utils/bytes32';
import { numberToStatus } from '../utils/status';

/**
 * Get a single app by its DID
 * @param did The DID of the app to fetch
 * @returns App details
 */
export async function getAppByDid(did: string): Promise<AppSummary | null> {
  try {
    const contract = getAppRegistryContract();
    
    // For legacy contract, we need to call getApp with the DID
    const result = await readContract({
      contract,
      method: 'function getApp(string) view returns (bytes32, bytes32, string, string, string, string, string, address, uint8, bool)',
      params: [did],
    });
    
    if (!result || !result[2]) {
      return null;
    }
    
    // Parse the result (array format from contract)
    const [nameBytes, versionBytes, returnedDid, dataUrl, iwpsPortalUri, agentApiUri, contractAddress, minter, status] = result;
    
    // Convert bytes32 to string using utility
    const name = hexToString(nameBytes);
    const version = hexToString(versionBytes);
    
    return {
      id: BigInt(0), // Legacy contract doesn't have token IDs in getApp response
      did: returnedDid as string,
      name,
      version,
      dataUrl: dataUrl as string,
      iwpsPortalUri: iwpsPortalUri as string,
      agentApiUri: agentApiUri as string,
      contractAddress: contractAddress as string,
      minter: minter as `0x${string}`,
      status: numberToStatus(status as number),
      owner: minter as `0x${string}`,
    };
  } catch (e) {
    throw normalizeEvmError(e);
  }
}

/**
 * Get apps by owner/minter address
 * @param owner The address of the app owner
 * @returns Array of app details with full data
 */
export async function getAppsByOwner(owner: `0x${string}`): Promise<AppSummary[]> {
  try {
    const contract = getAppRegistryContract();
    const result = await readContract({
      contract,
      method: 'function getAppsByMinter(address) view returns ((bytes32, bytes32, string, string, string, string, string, address, uint8, bool)[])',
      params: [owner],
    });
    
    if (!Array.isArray(result) || result.length === 0) {
      return [];
    }
    
    // Parse each app with full details using utilities
    const apps = result.map((appData: any, index: number) => {
      const name = hexToString(appData[0]);
      const version = hexToString(appData[1]);
      const did = appData[2] as string;
      const dataUrl = appData[3] as string;
      const iwpsPortalUri = appData[4] as string;
      const agentApiUri = appData[5] as string;
      const contractAddress = appData[6] as string;
      const minter = appData[7] as `0x${string}`;
      const statusNum = appData[8] as number;

      return {
        id: BigInt(index),
        did,
        name,
        version,
        dataUrl,
        iwpsPortalUri,
        agentApiUri,
        contractAddress,
        minter,
        owner: minter,
        status: numberToStatus(statusNum),
      };
    });
    
    return apps;
  } catch (e) {
    console.error('[registry.read] Error in getAppsByOwner:', e);
    throw normalizeEvmError(e);
  }
}

/**
 * List apps with pagination
 * @param startIndex Starting index for pagination (default 1)
 * @param pageSize Number of apps to return (default 20)
 * @returns Paginated app details
 */
export async function listApps(
  startIndex: number = 1,
  pageSize: number = 20,
): Promise<Paginated<AppSummary>> {
  try {
    const contract = getAppRegistryContract();
    
    const result = await readContract({
      contract,
      method: 'function getApps(uint256) view returns ((bytes32, bytes32, string, string, string, string, string, address, uint8, bool)[], uint256)',
      params: [BigInt(startIndex)],
    });
    
    if (!Array.isArray(result) || result.length < 2) {
      return { items: [], hasMore: false };
    }
    
    const [apps, nextIndex] = result;
    const hasMore = Number(nextIndex) > 0;
    
    // Parse each app with full details using utilities
    const items = (apps as any[]).map((appData, index) => {
      const name = hexToString(appData[0]);
      const version = hexToString(appData[1]);
      const did = appData[2] as string;
      const dataUrl = appData[3] as string;
      const iwpsPortalUri = appData[4] as string;
      const agentApiUri = appData[5] as string;
      const contractAddress = appData[6] as string;
      const minter = appData[7] as `0x${string}`;
      const statusNum = appData[8] as number;

      return {
        id: BigInt(startIndex + index),
        did,
        name,
        version,
        dataUrl,
        iwpsPortalUri,
        agentApiUri,
        contractAddress,
        minter,
        owner: minter, // For consistency with AppSummary interface
        status: numberToStatus(statusNum),
      };
    });
    
    return {
      items: items.slice(0, pageSize),
      nextCursor: hasMore ? String(nextIndex) : undefined,
      hasMore,
    };
  } catch (e) {
    throw normalizeEvmError(e);
  }
}

/**
 * Get total number of registered apps
 * @returns Total app count
 */
export async function getTotalApps(): Promise<number> {
  try {
    const contract = getAppRegistryContract();
    
    const result = await readContract({
      contract,
      method: 'function getTotalApps() view returns (uint256)',
      params: [],
    });
    
    return Number(result);
  } catch (e) {
    throw normalizeEvmError(e);
  }
}

/**
 * Search for apps by DID (normalized)
 * For Phase 0, this just fetches a single app by DID
 * @param query The DID search query
 * @returns Array of matching apps
 */
export async function searchByDid(query: string): Promise<AppSummary[]> {
  const normalizedDid = normalizeDidWeb(query);
  const app = await getAppByDid(normalizedDid);
  return app ? [app] : [];
}
