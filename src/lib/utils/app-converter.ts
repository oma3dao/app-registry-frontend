/**
 * Utility functions for converting between AppSummary (contract) and NFT (frontend) types
 * 
 * TODO: Consider merging with offchain-json.ts into a single bidirectional converter
 * - app-converter.ts: Contract → NFT (reading from blockchain)
 * - offchain-json.ts: NFT → JSON metadata (writing to blockchain)
 * - Could share field mapping logic and reduce duplication
 */

import type { AppSummary } from '@/lib/contracts/types';
import type { NFT } from '@/schema/data-model';
import { statusToNumber } from './status';

/**
 * Format version for display following semantic versioning standards
 * Always show major.minor, only add patch if non-zero
 * Examples: "2.0" if 2.0.0, "2.1" if 2.1.0, "2.1.3" if 2.1.3
 */
function formatVersion(major: number, minor: number, patch: number): string {
  if (patch !== 0) {
    return `${major}.${minor}.${patch}`;
  }
  return `${major}.${minor}`;
}

/**
 * Convert AppSummary from contract to NFT for frontend display
 * This centralizes the conversion logic to avoid duplication and errors
 */
export function appSummaryToNFT(app: AppSummary, fallbackAddress?: string): NFT {
  // Format version string (only show significant parts)
  const version = formatVersion(
    app.currentVersion.major,
    app.currentVersion.minor,
    app.currentVersion.patch
  );
  
  // Convert Status type to number
  const statusNum = statusToNumber(app.status);
  
  // Note: traits come from metadata JSON, not from contract trait hashes
  // The contract stores hashes for verification, but the actual trait strings
  // are in the metadata JSON at the dataUrl
  
  return {
    did: app.did,
    name: '', // Name comes from metadata at dataUrl, will be fetched separately
    version,

    // Interface support
    interfaces: app.interfaces,
    dataUrl: app.dataUrl || '',

    // On-chain identifiers
    contractId: app.contractId || undefined,
    fungibleTokenId: app.fungibleTokenId || undefined,

    status: statusNum,
    minter: app.minter || fallbackAddress || '',

    // Flattened metadata fields (will be populated by metadata fetching)
    description: '',
    publisher: '',
    image: '',
    external_url: '',
    summary: '',
    legalUrl: '',
    supportUrl: '',
    screenshotUrls: [],
    videoUrls: [],
    threeDAssetUrls: [],
    iwpsPortalUrl: '',
    platforms: {},
    artifacts: {},
    endpoint: undefined,
    interfaceVersions: [],
    mcp: undefined,
    traits: [], // Will be populated from metadata JSON
  };
}

/**
 * Convert array of AppSummary to array of NFT
 */
export function appSummariesToNFTs(apps: AppSummary[], fallbackAddress?: string): NFT[] {
  return apps.map(app => appSummaryToNFT(app, fallbackAddress));
}

/**
 * Helper to check if an app supports a specific interface
 */
export function hasInterface(interfaces: number, interfaceType: 'human' | 'api' | 'contract'): boolean {
  const bitMap = {
    human: 1,    // 0b001
    api: 2,      // 0b010
    contract: 4, // 0b100
  };
  return (interfaces & bitMap[interfaceType]) !== 0;
}

/**
 * Helper to get all interfaces an app supports
 */
export function getInterfaceTypes(interfaces: number): Array<'human' | 'api' | 'contract'> {
  const types: Array<'human' | 'api' | 'contract'> = [];
  if (hasInterface(interfaces, 'human')) types.push('human');
  if (hasInterface(interfaces, 'api')) types.push('api');
  if (hasInterface(interfaces, 'contract')) types.push('contract');
  return types;
}

/**
 * Helper to create an interfaces bitmap from selected types
 */
export function createInterfacesBitmap(types: Array<'human' | 'api' | 'contract'>): number {
  let bitmap = 0;
  if (types.includes('human')) bitmap |= 1;
  if (types.includes('api')) bitmap |= 2;
  if (types.includes('contract')) bitmap |= 4;
  return bitmap;
}

