/**
 * Describes the details for a single platform where the application is available.
 */
export interface PlatformDetails {
  /**
   * URL for downloading the application (e.g., App Store, Google Play, website).
   */
  downloadUrl?: string;
  /**
   * URL or scheme for launching the application directly (e.g., deep link).
   */
  launchUrl?: string;
  /**
   * Optional list of supported devices or architectures (e.g., ["iPhone", "iPad"], ["x64", "arm64"]).
   */
  supported?: string[];
  /**
   * DID reference to artifact for verification (per OMATrust spec)
   */
  artifactDid?: string;
}

/**
 * Defines the structure for platform availability information,
 * mapping platform keys (like "ios", "web") to their details.
 */
export interface Platforms {
  web?: PlatformDetails;
  ios?: PlatformDetails;
  android?: PlatformDetails;
  windows?: PlatformDetails;
  macos?: PlatformDetails;
  meta?: PlatformDetails; // For Meta Quest
  playstation?: PlatformDetails; // For PlayStation 5
  xbox?: PlatformDetails; // For Xbox
  nintendo?: PlatformDetails; // For Nintendo Switch
  // Add other platforms as needed
}

/**
 * Endpoint configuration for API/Contract interfaces
 * Note: API format should be specified in traits (api:rest, api:graphql, etc.)
 */
export interface EndpointConfig {
  url: string;           // Required: URL of the API endpoint
  schemaUrl?: string;    // Optional: URL to API documentation/schema
}

/**
 * MCP (Model Context Protocol) configuration for AI agents
 */
export interface McpConfig {
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: any;
    annotations?: any;
  }>;
  resources?: Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
  }>;
  prompts?: Array<{
    name: string;
    description: string;
    arguments?: any[];
  }>;
  transport?: {
    http?: any;
    stdio?: any;
  };
  authentication?: {
    oauth2?: any;
    blockchain?: any;
  };
}

/**
 * Metadata contract data structure
 * Contains all fields that are stored in the app metadata contract
 * This structure is useful for developers integrating directly with the metadata contract
 */
export interface MetadataContractData {
  /**
   * App name (required per OMATrust spec)
   */
  name: string;

  /**
   * Long description of the application (required per OMATrust spec)
   */
  description: string;

  /**
   * Publisher name (required per OMATrust spec)
   */
  publisher: string;

  /**
   * URL to app icon (required for human interface per OMATrust spec)
   */
  image: string;

  /**
   * URL to marketing materials (optional per OMATrust spec)
   */
  external_url?: string;

  /**
   * Short description (optional per OMATrust spec)
   */
  summary?: string;

  /**
   * URL to legal agreements (optional per OMATrust spec)
   */
  legalUrl?: string;

  /**
   * URL to get support (optional per OMATrust spec)
   */
  supportUrl?: string;

  /**
   * URLs to app screenshots (required for human interface per OMATrust spec)
   */
  screenshotUrls: string[];

  /**
   * URLs to demo videos (optional per OMATrust spec)
   */
  videoUrls?: string[];

  /**
   * URLs to 3D assets (optional per OMATrust spec)
   * Note: Stored as "3dAssetUrls" in JSON but using camelCase here for TypeScript compatibility
   */
  threeDAssetUrls?: string[];

  /**
   * IWPS Portal URL (optional per OMATrust spec)
   */
  iwpsPortalUrl?: string;

  /**
   * Platform availability information (required for human interface per OMATrust spec)
   */
  platforms: Platforms;

  /**
   * Traits for categorization (optional, max 20 per OMATrust spec)
   */
  traits?: string[];

  /**
   * Interface versions supported (optional per OMATrust spec)
   */
  interfaceVersions?: string[];

  /**
   * Artifacts for distribution (optional per OMATrust spec)
   */
  artifacts?: Record<string, any>;

  /**
   * API endpoint configuration (required for API interface per OMATrust spec)
   */
  endpoint?: EndpointConfig;

  /**
   * MCP configuration (optional for API interface per OMATrust spec)
   */
  mcp?: McpConfig;
} 