/**
 * Build the canonical off-chain metadata object used for JCS hashing and display
 * Accepts flattened wizard state or NFT-like input; picks a consistent set of fields
 * 
 * TODO: Consider merging with app-converter.ts into a single bidirectional converter
 * - app-converter.ts: Contract → NFT (reading from blockchain)
 * - offchain-json.ts: NFT → JSON metadata (writing to blockchain)
 * - Could share field mapping logic and reduce duplication
 */

import { env } from '@/config/env';

type AnyRecord = Record<string, any> | undefined | null;

export interface OffchainBuildInput {
  // For backwards compatibility, accept either:
  // 1. Flattened structure (new way) - all fields at top level
  // 2. Nested structure (old way) - fields in metadata object
  name?: string;
  metadata?: AnyRecord; // Deprecated: for backwards compatibility only
  
  // ERC-8004 Security Extension
  did?: string;
  version?: string; // Semantic version for verification against on-chain version
  tokenId?: number; // ERC-721 tokenId (output as agentId in JSON per ERC-8004)
  registrations?: Array<{
    did: string;
    agentRegistry: string;
    agentId?: number;
  }>;
  
  // Flattened fields (new structure)
  external_url?: string;
  image?: string;
  description?: string;
  publisher?: string;
  summary?: string;
  owner?: string;
  legalUrl?: string;
  supportUrl?: string;
  iwpsPortalUrl?: string;
  a2a?: any;
  screenshotUrls?: string[];
  videoUrls?: string[];
  threeDAssetUrls?: string[];
  traits?: string[];
  interfaceVersions?: string[];
  endpointName?: string;
  endpointUrl?: string;
  endpointSchemaUrl?: string;
  payments?: Record<string, any>[];
  artifacts?: Record<string, any>;
  platforms?: Record<string, any>;
  mcp?: Record<string, any>;
  
  // Extra fields (for special overrides)
  extra?: Partial<{
    owner: string;
    iwpsPortalUrl: string;
    traits: string[];
    interfaceVersions: string[];
    endpointName: string;
    endpointUrl: string;
    endpointSchemaUrl: string;
    payments: Record<string, any>[];
    artifacts: Record<string, any>;
    platforms: Record<string, any>;
    mcp: Record<string, any>;
    videoUrls: string[];
    threeDAssetUrls: string[];
  }>;
}

export function buildOffchainMetadataObject(input: OffchainBuildInput): Record<string, any> {
  const name = input?.name;
  
  // For backwards compatibility: support both flattened and nested structures
  // Priority: extra > top-level > metadata (nested)
  const md = (input?.metadata || {}) as Record<string, any>;
  const ex = (input?.extra || {}) as Record<string, any>;
  
  // Helper: pick from extra, then top-level input, then nested metadata
  const pick = (key: string) => {
    if (typeof ex[key] !== 'undefined') return ex[key];
    if (typeof (input as any)[key] !== 'undefined') return (input as any)[key];
    return md[key];
  };

  const out: Record<string, any> = {
    // Strings / URLs
    name: name || undefined,
    version: pick('version') || undefined,
    external_url: pick('external_url') || undefined,
    image: pick('image') || undefined,
    description: pick('description') || undefined,
    publisher: pick('publisher') || undefined,
    summary: pick('summary') || undefined,
    owner: pick('owner') || undefined,
    legalUrl: pick('legalUrl') || undefined,
    supportUrl: pick('supportUrl') || undefined,
    iwpsPortalUrl: pick('iwpsPortalUrl') || undefined,
    a2a: pick('a2a') || undefined,

    // Arrays
    screenshotUrls: Array.isArray(pick('screenshotUrls')) ? pick('screenshotUrls') : [],
    videoUrls: Array.isArray(pick('videoUrls')) ? pick('videoUrls') : [],
    // 3d assets key in spec: 3dAssetUrls
    ['3dAssetUrls']: Array.isArray(pick('3dAssetUrls'))
      ? pick('3dAssetUrls')
      : Array.isArray(pick('threeDAssetUrls'))
        ? pick('threeDAssetUrls')
        : [],
    traits: Array.isArray(pick('traits')) ? pick('traits') : [],
    interfaceVersions: Array.isArray(pick('interfaceVersions')) ? pick('interfaceVersions') : [],

    // JSON objects
    platforms: cleanPlatforms(pick('platforms')),
    artifacts: typeof pick('artifacts') === 'object' && pick('artifacts') !== null ? pick('artifacts') : undefined,
    mcp: typeof pick('mcp') === 'object' && pick('mcp') !== null ? pick('mcp') : undefined,
    payments: Array.isArray(pick('payments')) ? pick('payments') : undefined,
  } as Record<string, any>;

  // Build endpoints array from flat fields (ERC-8004 compliance)
  const endpointUrl = pick('endpointUrl');
  const endpointName = pick('endpointName') || 'API';
  const mcpConfig = pick('mcp');
  
  if (endpointUrl) {
    const endpoint: Record<string, any> = {
      name: endpointName,
      endpoint: endpointUrl,
      ...(pick('endpointSchemaUrl') && { schemaUrl: pick('endpointSchemaUrl') }),
    };
    
    // If this is an MCP endpoint, embed MCP config fields directly
    if (endpointName === 'MCP' && mcpConfig && typeof mcpConfig === 'object') {
      Object.assign(endpoint, mcpConfig);
    }
    
    out.endpoints = [endpoint];
  }
  
  // Remove top-level mcp field (it's now embedded in the endpoint)
  delete out.mcp;

  // Build registrations array (ERC-8004 Security Extension)
  // Links the metadata back to its on-chain registration for verification
  const did = input?.did || pick('did');
  if (did) {
    // Use existing registrations if present, otherwise create new
    const existingRegistrations = input?.registrations || pick('registrations');
    if (Array.isArray(existingRegistrations) && existingRegistrations.length > 0) {
      // Use existing registrations, but update agentId if we have a newer tokenId
      const updatedRegistrations = existingRegistrations.map((reg: any) => {
        if (reg.did === did && typeof input?.tokenId === 'number') {
          // Validate: if agentId exists and differs from tokenId, log warning
          if (reg.agentId !== undefined && reg.agentId !== input.tokenId) {
            console.warn(`[buildOffchainMetadataObject] agentId mismatch: existing=${reg.agentId}, tokenId=${input.tokenId}`);
          }
          return { ...reg, agentId: input.tokenId };
        }
        return reg;
      });
      out.registrations = updatedRegistrations;
    } else {
      // Create new registration
      const registration: Record<string, any> = {
        did,
        agentRegistry: `eip155:${env.chainId}:${env.registryAddress}`,
      };
      // Include agentId (tokenId) if available (for updates, not initial registration)
      if (typeof input?.tokenId === 'number') {
        registration.agentId = input.tokenId;
      }
      out.registrations = [registration];
    }
  }

  // Deep clean: recursively remove empty values
  return deepClean(out);
}

/**
 * Clean platforms object - remove artifact-specific fields
 * Artifact fields should only appear in the artifacts map, not in platforms
 */
function cleanPlatforms(platforms: any): any {
  if (!platforms || typeof platforms !== 'object') return {};

  const cleaned: any = {};

  for (const platform in platforms) {
    const {
      artifactType,
      artifactOs,
      artifactArchitecture,
      type,  // Also remove if someone used short names
      os,
      architecture,
      ...platformData
    } = platforms[platform];
    // Only keep platform-specific fields (downloadUrl, launchUrl, supported, artifactDid)
    cleaned[platform] = platformData;
  }

  return cleaned;
}

/**
 * Recursively remove empty values from an object or array
 * Removes: undefined, null, empty strings, empty arrays, empty objects
 */
function deepClean(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    const cleaned = obj
      .map(item => deepClean(item))
      .filter(item => item !== undefined);
    return cleaned.length > 0 ? cleaned : undefined;
  }

  // Handle objects
  if (typeof obj === 'object') {
    const cleaned: any = {};

    for (const key in obj) {
      const value = obj[key];

      // Skip undefined
      if (value === undefined || value === null) continue;

      // Skip empty strings
      if (typeof value === 'string' && value.trim() === '') continue;

      // Recursively clean nested structures
      const cleanedValue = deepClean(value);

      // Only add if not empty
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }

    // Return undefined if object is now empty
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  // Primitives (strings, numbers, booleans)
  return obj;
}


