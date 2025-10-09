/**
 * Pure functions for reading from the OMA3 App Registry contract
 * These functions do NOT use React hooks and can be called from anywhere
 * 
 * KEY ARCHITECTURE:
 * - Apps are identified by (DID, major version) tuples
 * - TokenIds are internal implementation details
 * - All contract methods take DID strings, not tokenIds
 */

import { readContract } from 'thirdweb';
import { getAppRegistryContract } from './client';
import type { AppSummary, Paginated, Status, Version } from './types';
import { normalizeDidWeb } from '../utils/did';
import { normalizeEvmError } from './errors';
import { getCurrentVersion } from '../utils/version';
import type { AbiFunction } from 'abitype';
import { appRegistryAbi } from './abi/appRegistry.abi';

/**
 * Convert status number to Status enum
 */
function numberToStatus(statusNum: number): Status {
  switch (statusNum) {
    case 0: return 'Active';
    case 1: return 'Deprecated';
    case 2: return 'Replaced';
    default: return 'Active';
  }
}

/**
 * Parse App struct from contract return value into AppSummary
 */
function parseAppStruct(appData: any): AppSummary {
  // Contract returns App struct with these fields in order:
  // minter, interfaces, versionMajor, status, dataHashAlgorithm, dataHash,
  // did, fungibleTokenId, contractId, dataUrl, versionHistory[], traitHashes[]
  
  const versionHistory: Version[] = (appData.versionHistory || []).map((v: any) => ({
    major: Number(v.major || v[0]) || 0,
    minor: Number(v.minor || v[1]) || 0,
    patch: Number(v.patch || v[2]) || 0,
  }));
  
  // Get current version with fallback to versionMajor from contract
  const currentVersion = versionHistory.length > 0
    ? getCurrentVersion(versionHistory)
    : { major: Number(appData.versionMajor) || 1, minor: 0, patch: 0 };
  
  return {
    did: appData.did as string,
    versionMajor: Number(appData.versionMajor),
    currentVersion,
    versionHistory,
    minter: appData.minter as `0x${string}`,
    owner: appData.minter as `0x${string}`, // Will be overridden if we fetch actual owner
    interfaces: Number(appData.interfaces),
    dataUrl: appData.dataUrl as string,
    dataHash: appData.dataHash as string,
    dataHashAlgorithm: Number(appData.dataHashAlgorithm),
    fungibleTokenId: appData.fungibleTokenId as string || undefined,
    contractId: appData.contractId as string || undefined,
    traitHashes: (appData.traitHashes || []).map((h: any) => h as string),
    status: numberToStatus(Number(appData.status)),
  };
}

/**
 * Get a single app by its DID and major version
 * This is the PRIMARY getter function - apps are identified by DID!
 * 
 * @param did The DID of the app to fetch
 * @param major The major version (default 0 uses latest)
 * @returns App details or null if not found
 */
export async function getAppByDid(did: string, major?: number): Promise<AppSummary | null> {
  try {
    const contract = getAppRegistryContract();
    const normalizedDid = normalizeDidWeb(did);
    
    // If no major specified, get the latest
    let majorVersion = major;
    if (majorVersion === undefined || majorVersion === 0) {
      // Import here to avoid circular dependency
      const { getDidHash } = await import('../utils/did');
      const didHash = await getDidHash(normalizedDid);
      
      // Get latest major version for this DID
      majorVersion = await readContract({
        contract,
        method: 'function latestMajor(bytes32) view returns (uint8)',
        params: [didHash],
      }) as number;
    }
    
    // Get app data using contract's getApp(string, uint8) method
    const getAppMethod = (appRegistryAbi as readonly any[]).find(
      (item: any) => item.name === 'getApp' && item.type === 'function'
    );
    
    const appData = await readContract({
      contract,
      method: getAppMethod as AbiFunction,
      params: [normalizedDid, majorVersion],
    }) as any;
    
    if (!appData || !appData.did) {
      return null;
    }
    
    const app = parseAppStruct(appData);
    
    // TODO: Get actual owner via ownerOf(tokenId)
    // This requires either:
    // 1. Contract to return tokenId from getApp()
    // 2. Us to compute tokenId from DID hash + major
    // 3. Call getDIDByTokenId in reverse (expensive)
    // For now, owner = minter
    
    return app;
  } catch (e) {
    console.error('[registry.read] Error in getAppByDid:', e);
    return null; // DID not found is not an error
  }
}

/**
 * Get apps by owner address (current NFT owner, not original minter)
 * Uses ERC721Enumerable for accurate ownership tracking after transfers
 * @param owner The address of the app owner
 * @param startIndex Starting index for pagination (default 0)
 * @returns Array of app details
 */
export async function getAppsByOwner(owner: `0x${string}`, startIndex: number = 0): Promise<AppSummary[]> {
  try {
    const contract = getAppRegistryContract();
    
    // Use contract's getAppsByOwner method (renamed from getAppsByMinter)
    const getAppsByOwnerMethod = (appRegistryAbi as readonly any[]).find(
      (item: any) => item.name === 'getAppsByOwner' && item.type === 'function'
    );
    
    const result = await readContract({
      contract,
      method: getAppsByOwnerMethod as AbiFunction,
      params: [owner, BigInt(startIndex)],
    }) as any;
    
    if (!Array.isArray(result) || result.length < 1) {
      return [];
    }
    
    const [apps] = result;
    
    if (!Array.isArray(apps) || apps.length === 0) {
      return [];
    }
    
    // Parse each app
    return apps.map((appData: any) => parseAppStruct(appData));
  } catch (e) {
    console.error('[registry.read] Error in getAppsByOwner:', e);
    throw normalizeEvmError(e);
  }
}

/**
 * @deprecated Use getAppsByOwner instead
 * Backward compatibility alias
 */
export async function getAppsByMinter(minter: `0x${string}`, startIndex: number = 0): Promise<AppSummary[]> {
  return getAppsByOwner(minter, startIndex);
}

/**
 * List active apps (status=0 only, publicly browsable)
 * @param startIndex Starting index for pagination (default 0)
 * @param pageSize Number of apps to return (max 100 per contract)
 * @returns Paginated app details
 */
export async function listActiveApps(
  startIndex: number = 0,
  pageSize: number = 20,
): Promise<Paginated<AppSummary>> {
  try {
    const contract = getAppRegistryContract();
    
    // Use contract's getApps method (returns active apps only)
    const getAppsMethod = (appRegistryAbi as readonly any[]).find(
      (item: any) => item.name === 'getApps' && item.type === 'function'
    );
    
    const result = await readContract({
      contract,
      method: getAppsMethod as AbiFunction,
      params: [BigInt(startIndex)],
    }) as any;
    
    if (!Array.isArray(result) || result.length < 2) {
      return { items: [], hasMore: false };
    }
    
    const [apps, nextStartIndex] = result;
    const nextIndex = Number(nextStartIndex);
    const hasMore = nextIndex > 0;
    
    if (!Array.isArray(apps) || apps.length === 0) {
      return { items: [], hasMore: false };
    }
    
    // Parse each app
    const items = apps
      .slice(0, pageSize)
      .map((appData: any) => parseAppStruct(appData));
    
    return {
      items,
      nextCursor: hasMore ? String(nextIndex) : undefined,
      hasMore,
    };
  } catch (e) {
    console.error('[registry.read] Error in listActiveApps:', e);
    throw normalizeEvmError(e);
  }
}

/**
 * Get total number of active apps (status=0)
 * @returns Total active app count
 */
export async function getTotalActiveApps(): Promise<number> {
  try {
    const contract = getAppRegistryContract();
    
    const result = await readContract({
      contract,
      method: 'function getTotalAppsByStatus(uint8) view returns (uint256)',
      params: [0], // 0 = Active status
    });
    
    return Number(result);
  } catch (e) {
    console.error('[registry.read] Error in getTotalActiveApps:', e);
    throw normalizeEvmError(e);
  }
}

/**
 * Search for apps by DID (normalized)
 * @param query The DID search query
 * @returns Array of matching apps
 */
export async function searchByDid(query: string): Promise<AppSummary[]> {
  const normalizedDid = normalizeDidWeb(query);
  const app = await getAppByDid(normalizedDid);
  return app ? [app] : [];
}

/**
 * Check if a DID is already registered (any major version)
 * @param did The DID to check
 * @returns True if DID exists
 */
export async function isDidRegistered(did: string): Promise<boolean> {
  try {
    const normalizedDid = normalizeDidWeb(did);
    const { getDidHash } = await import('../utils/did');
    const didHash = await getDidHash(normalizedDid);
    
    const contract = getAppRegistryContract();
    
    // Try to get latest major version
    const major = await readContract({
      contract,
      method: 'function latestMajor(bytes32) view returns (uint8)',
      params: [didHash],
    });
    
    return major !== undefined && major !== 0;
  } catch (e) {
    // If error (DIDHashNotFound), then not registered
    return false;
  }
}

/**
 * Get the latest major version for a DID
 * @param did The DID to query
 * @returns Latest major version number, or 0 if not found
 */
export async function getLatestMajor(did: string): Promise<number> {
  try {
    const normalizedDid = normalizeDidWeb(did);
    const { getDidHash } = await import('../utils/did');
    const didHash = await getDidHash(normalizedDid);
    
    const contract = getAppRegistryContract();
    
    const major = await readContract({
      contract,
      method: 'function latestMajor(bytes32) view returns (uint8)',
      params: [didHash],
    });
    
    return Number(major);
  } catch (e) {
    return 0;
  }
}

/**
 * Check if an app has any of the specified traits
 * @param did The DID of the app
 * @param major The major version
 * @param traits Array of trait hashes to check
 * @returns True if app has at least one trait
 */
export async function hasAnyTraits(
  did: string,
  major: number,
  traits: string[]
): Promise<boolean> {
  try {
    const contract = getAppRegistryContract();
    const normalizedDid = normalizeDidWeb(did);
    
    const result = await readContract({
      contract,
      method: 'function hasAnyTraits(string, uint8, bytes32[]) view returns (bool)',
      params: [normalizedDid, major, traits as `0x${string}`[]],
    });
    
    return Boolean(result);
  } catch (e) {
    return false;
  }
}

/**
 * Check if an app has all of the specified traits
 * @param did The DID of the app
 * @param major The major version
 * @param traits Array of trait hashes to check
 * @returns True if app has all traits
 */
export async function hasAllTraits(
  did: string,
  major: number,
  traits: string[]
): Promise<boolean> {
  try {
    const contract = getAppRegistryContract();
    const normalizedDid = normalizeDidWeb(did);
    
    const result = await readContract({
      contract,
      method: 'function hasAllTraits(string, uint8, bytes32[]) view returns (bool)',
      params: [normalizedDid, major, traits as `0x${string}`[]],
    });
    
    return Boolean(result);
  } catch (e) {
    return false;
  }
}

// ============================================================================
// Convenience aliases for backward compatibility
// ============================================================================

/**
 * @deprecated Use listActiveApps instead
 * Convenience alias for backward compatibility
 */
export const listApps = listActiveApps;

/**
 * @deprecated Use getTotalActiveApps instead
 * Convenience alias for backward compatibility
 */
export const getTotalApps = getTotalActiveApps;
