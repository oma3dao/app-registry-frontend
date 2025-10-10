// Build the canonical off-chain metadata object used for JCS hashing and display
// Accepts wizard state or NFT-like input; picks a consistent set of fields

type AnyRecord = Record<string, any> | undefined | null;

export interface OffchainBuildInput {
  name?: string;
  metadata?: AnyRecord;
  // Extra fields that may live outside metadata in wizard state
  extra?: Partial<{
    owner: string;
    iwpsPortalUrl: string;
    traits: string[];
    interfaceVersions: string[];
    endpoint: Record<string, any> | {
      url?: string;
      schemaUrl?: string;
    };
    payments: Record<string, any>[];
    artifacts: Record<string, any>;
    mcp: Record<string, any>;
    videoUrls: string[];
    threeDAssetUrls: string[]; // maps to 3dAssetUrls in output
  }>;
}

export function buildOffchainMetadataObject(input: OffchainBuildInput): Record<string, any> {
  const name = input?.name;
  const md = (input?.metadata || {}) as Record<string, any>;
  const ex = (input?.extra || {}) as Record<string, any>;

  // Helper getters: prefer extra override, fall back to metadata
  const pick = (key: string) => (typeof ex[key] !== 'undefined' ? ex[key] : md[key]);

  const out: Record<string, any> = {
    // Strings / URLs
    name: name || undefined,
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
    // allow both metadata.threeDAssetUrls and metadata['3dAssetUrls'] sources
    ['3dAssetUrls']: Array.isArray(md['3dAssetUrls'])
      ? md['3dAssetUrls']
      : Array.isArray(ex['threeDAssetUrls'])
        ? ex['threeDAssetUrls']
        : Array.isArray(md['threeDAssetUrls'])
          ? md['threeDAssetUrls']
          : [],
    traits: Array.isArray(pick('traits')) ? pick('traits') : [],
    interfaceVersions: Array.isArray(pick('interfaceVersions')) ? pick('interfaceVersions') : [],

    // JSON objects
    platforms: cleanPlatforms(pick('platforms')),
    endpoint: typeof pick('endpoint') === 'object' && pick('endpoint') !== null ? pick('endpoint') : {},
    artifacts: typeof pick('artifacts') === 'object' && pick('artifacts') !== null ? pick('artifacts') : {},
    mcp: typeof pick('mcp') === 'object' && pick('mcp') !== null ? pick('mcp') : {},
    payments: Array.isArray(pick('payments')) ? pick('payments') : [],
  } as Record<string, any>;

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


