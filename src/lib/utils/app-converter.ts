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
 * Extract MCP configuration from an endpoint object
 * If the endpoint name is "MCP", extract MCP-specific fields
 */
function extractMcpFromEndpoint(endpoint: any): any {
  if (!endpoint || endpoint.name !== 'MCP') {
    return undefined;
  }
  
  // Extract MCP fields from the endpoint object
  const { name, endpoint: url, schemaUrl, ...mcpFields } = endpoint;
  
  // Only return if there are actual MCP fields
  if (Object.keys(mcpFields).length === 0) {
    return undefined;
  }
  
  return mcpFields;
}

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
    currentOwner: app.currentOwner || '', // Current NFT holder from contract

    // inherited ERC-721 values
    tokenId: app.tokenId !== undefined ? Number(app.tokenId) : undefined,

    // Flattened metadata fields (will be populated by metadata fetching)
    description: '',
    publisher: '',
    image: '',
    external_url: '',
    summary: '',
    owner: '', // Will be populated from metadata JSON (CAIP-10 format)
    legalUrl: '',
    supportUrl: '',
    screenshotUrls: [],
    videoUrls: [],
    threeDAssetUrls: [],
    iwpsPortalUrl: '',
    platforms: {},
    artifacts: {},
    endpointName: undefined,
    endpointUrl: undefined,
    endpointSchemaUrl: undefined,
    interfaceVersions: [],
    mcp: undefined,
    traits: [], // Will be populated from metadata JSON
  };
}

/**
 * Fetch metadata from dataUrl and merge into NFT object
 * This makes the NFT object the single source of truth with all data
 * Also performs owner verification to ensure metadata provider controls the NFT
 */
export async function hydrateNFTWithMetadata(nft: NFT): Promise<NFT> {
  if (!nft.dataUrl) {
    console.warn(`[hydrateNFTWithMetadata] No dataUrl for ${nft.did}`);
    return nft;
  }

  try {
    // In development, rewrite production URLs to localhost for testing
    const { env } = await import('@/config/env');
    const fetchUrl = env.getMetadataFetchUrl(nft.dataUrl);
    
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      console.warn(`[hydrateNFTWithMetadata] Failed to fetch metadata for ${nft.did}: ${response.status}`);
      return nft;
    }

    const metadata = await response.json();
    console.log(`[hydrateNFTWithMetadata] ${nft.did} - fetched metadata:`, metadata);

    // Extract tokenId: prefer from NFT (contract), fallback to registrations array (metadata)
    let tokenId = nft.tokenId;
    if (tokenId === undefined && metadata.registrations?.[0]?.agentId !== undefined) {
      tokenId = Number(metadata.registrations[0].agentId);
      console.log(`[hydrateNFTWithMetadata] ${nft.did} - extracted tokenId from registrations:`, tokenId);
    }

    // Merge all metadata fields into the NFT object
    // Metadata JSON is the source of truth for all off-chain fields
    return {
      ...nft,
      name: metadata.name,
      description: metadata.description,
      publisher: metadata.publisher,
      image: metadata.image,
      external_url: metadata.external_url,
      summary: metadata.summary,
      owner: metadata.owner, // Owner from metadata JSON (CAIP-10 format)
      legalUrl: metadata.legalUrl,
      supportUrl: metadata.supportUrl,
      iwpsPortalUrl: metadata.iwpsPortalUrl,
      screenshotUrls: metadata.screenshotUrls,
      videoUrls: metadata.videoUrls,
      threeDAssetUrls: metadata['3dAssetUrls'] || metadata.threeDAssetUrls,
      platforms: metadata.platforms,
      artifacts: metadata.artifacts,
      // Extract endpoint from endpoints array (ERC-8004 format)
      endpointName: metadata.endpoints?.[0]?.name,
      endpointUrl: metadata.endpoints?.[0]?.endpoint,
      endpointSchemaUrl: metadata.endpoints?.[0]?.schemaUrl,
      interfaceVersions: metadata.interfaceVersions,
      // Extract MCP config from endpoint if name === "MCP"
      mcp: extractMcpFromEndpoint(metadata.endpoints?.[0]),
      traits: metadata.traits,
      // ERC-8004 registrations array and tokenId
      tokenId,
      registrations: metadata.registrations,
    };
  } catch (error) {
    console.error(`[hydrateNFTWithMetadata] Error fetching metadata for ${nft.did}:`, error);
    return nft; // Return original NFT on error
  }
}

/**
 * Convert array of AppSummary to array of NFT
 */
export function appSummariesToNFTs(apps: AppSummary[], fallbackAddress?: string): NFT[] {
  return apps.map(app => appSummaryToNFT(app, fallbackAddress));
}

/**
 * Convert array of AppSummary to array of fully hydrated NFTs with metadata
 * This is the recommended way to load apps - returns NFTs with all metadata merged in
 */
export async function appSummariesToNFTsWithMetadata(
  apps: AppSummary[],
  fallbackAddress?: string
): Promise<NFT[]> {
  const nfts = appSummariesToNFTs(apps, fallbackAddress);
  // Fetch metadata for all NFTs in parallel
  return Promise.all(nfts.map(nft => hydrateNFTWithMetadata(nft)));
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

