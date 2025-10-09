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
    endpoint: Record<string, any>;
    payments: Record<string, any>[];
    artifacts: Record<string, any>;
    mcp: Record<string, any>;
    a2a: string;
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
    platforms: typeof pick('platforms') === 'object' && pick('platforms') !== null ? pick('platforms') : {},
    endpoint: typeof pick('endpoint') === 'object' && pick('endpoint') !== null ? pick('endpoint') : {},
    artifacts: typeof pick('artifacts') === 'object' && pick('artifacts') !== null ? pick('artifacts') : {},
    mcp: typeof pick('mcp') === 'object' && pick('mcp') !== null ? pick('mcp') : {},
    payments: Array.isArray(pick('payments')) ? pick('payments') : [],
  } as Record<string, any>;

  // Remove undefined, empty strings, empty arrays, and empty objects
  Object.keys(out).forEach((k) => {
    const v = out[k];
    if (typeof v === 'undefined') {
      delete out[k];
      return;
    }
    if (typeof v === 'string' && v.trim().length === 0) {
      delete out[k];
      return;
    }
    if (Array.isArray(v) && v.length === 0) {
      delete out[k];
      return;
    }
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) {
      delete out[k];
      return;
    }
  });

  return out;
}


