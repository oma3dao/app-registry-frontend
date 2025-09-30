/**
 * Pure functions for reading from the OMA3 App Registry contract
 * These functions do NOT use React hooks and can be called from anywhere
 */

import { readContract } from 'thirdweb';
import { getRegistryContract } from './client';
import { appRegistryLegacyAbi } from './abi/appRegistry.legacy.abi';
import { celoAlfajores } from '@/config/chains';
import type { AppDetail, AppSummary, Paginated, Status } from './types';
import { normalizeDidWeb } from '../utils/did';
import { normalizeEvmError } from './errors';

// Use the existing contract address from config
const REGISTRY_ADDRESS = celoAlfajores.contracts.OMA3AppRegistry;

/**
 * Get a single app by its DID
 * @param did The DID of the app to fetch
 * @returns App details
 */
export async function getAppByDid(did: string): Promise<AppDetail | null> {
  try {
    const contract = getRegistryContract(appRegistryLegacyAbi, REGISTRY_ADDRESS);
    
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
    
    // Convert bytes32 to string
    const name = Buffer.from((nameBytes as string).slice(2), 'hex').toString().replace(/\0/g, '');
    const version = Buffer.from((versionBytes as string).slice(2), 'hex').toString().replace(/\0/g, '');
    
    // Map status number to Status type
    const statusMap: Record<number, Status> = { 0: 'Active', 1: 'Inactive', 2: 'Deprecated' };
    
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
      status: statusMap[status as number] || 'Active',
      owner: minter as `0x${string}`,
    };
  } catch (e) {
    throw normalizeEvmError(e);
  }
}

/**
 * Get apps by owner/minter address
 * @param owner The address of the app owner
 * @returns Array of app summaries
 */
export async function getAppsByOwner(owner: `0x${string}`): Promise<AppSummary[]> {
  try {
    const contract = getRegistryContract(appRegistryLegacyAbi, REGISTRY_ADDRESS);
    
    const result = await readContract({
      contract,
      method: 'function getAppsByMinter(address) view returns ((bytes32, bytes32, string, string, string, string, string, address, uint8, bool)[])',
      params: [owner],
    });
    
    if (!Array.isArray(result) || result.length === 0) {
      return [];
    }
    
    // Parse each app
    return result.map((appData: any, index: number) => {
      const name = Buffer.from((appData[0] as string).slice(2), 'hex').toString().replace(/\0/g, '');
      const did = appData[2] as string;
      const statusNum = appData[8] as number;
      const statusMap: Record<number, Status> = { 0: 'Active', 1: 'Inactive', 2: 'Deprecated' };
      
      return {
        id: BigInt(index),
        did,
        name,
        status: statusMap[statusNum] || 'Active',
      };
    });
  } catch (e) {
    throw normalizeEvmError(e);
  }
}

/**
 * List apps with pagination
 * @param startIndex Starting index for pagination (default 1)
 * @param pageSize Number of apps to return (default 20)
 * @returns Paginated app summaries
 */
export async function listApps(
  startIndex: number = 1,
  pageSize: number = 20,
): Promise<Paginated<AppSummary>> {
  try {
    const contract = getRegistryContract(appRegistryLegacyAbi, REGISTRY_ADDRESS);
    
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
    
    // Parse each app
    const items = (apps as any[]).map((appData, index) => {
      const name = Buffer.from((appData[0] as string).slice(2), 'hex').toString().replace(/\0/g, '');
      const did = appData[2] as string;
      const statusNum = appData[8] as number;
      const statusMap: Record<number, Status> = { 0: 'Active', 1: 'Inactive', 2: 'Deprecated' };
      
      return {
        id: BigInt(startIndex + index),
        did,
        name,
        status: statusMap[statusNum] || 'Active',
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
    const contract = getRegistryContract(appRegistryLegacyAbi, REGISTRY_ADDRESS);
    
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
