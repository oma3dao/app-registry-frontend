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
   * URL to app description
   */
  descriptionUrl?: string;
  
  /**
   * Full text description content (cached from descriptionUrl)
   */
  description?: string;
  
  /**
   * URL to marketing materials
   */
  external_url?: string;
  
  /**
   * Token contract address (optional)
   */
  token?: string;
  
  /**
   * URL to app icon (1024x1024)
   */
  image?: string;
  
  /**
   * URLs to app screenshots (max 5)
   * First screenshot is required, others are optional
   * Maximum resolution: 2048x2048
   */
  screenshotUrls?: string[];
  
  /**
   * Nested object containing details for each supported platform.
   * Matches the "platforms" key used in the final JSON.
   */
  platforms?: Platforms;
  
  /**
   * Brief summary of the app
   */
  summary?: string;
  
  /**
   * Publisher/developer name
   */
  publisher?: string;
  
  /**
   * URL to legal documents (privacy policy, TOS, etc.)
   */
  legalUrl?: string;
  
  /**
   * URL to support/help resources
   */
  supportUrl?: string;
  
  // === API/Contract Interface Fields ===
  
  /**
   * Array of interface versions supported (API/Contract)
   */
  interfaceVersions?: string[];
  
  /**
   * API/Contract endpoint configuration
   */
  endpoint?: EndpointConfig;
  
  /**
   * Model Context Protocol configuration (API for AI agents)
   */
  mcp?: McpConfig;
  
  /**
   * Payment mechanisms (x402, manual, etc.)
   */
  payments?: Array<{
    type: 'x402' | 'manual';
    url?: string;
    chains?: string[];
  }>;
  
  /**
   * Artifact verification (for downloadable binaries)
   */
  artifacts?: Record<string, any>;
  
  /**
   * Video URLs (human interface)
   */
  videoUrls?: string[];
  
  /**
   * 3D asset URLs (human interface)
   */
  threeDAssetUrls?: string[];
} 