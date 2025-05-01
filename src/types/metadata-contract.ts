/**
 * Describes the details for a single platform where the application is available.
 */
export interface PlatformDetails {
  /**
   * URL for downloading the application (e.g., App Store, Google Play, website).
   */
  url_download?: string;
  /**
   * URL or scheme for launching the application directly (e.g., deep link).
   */
  url_launch?: string;
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
  ps5?: PlatformDetails; // For PlayStation 5
  xbox?: PlatformDetails; // For Xbox
  nintendo?: PlatformDetails; // For Nintendo Switch
  // Add other platforms as needed
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
  descriptionUrl: string;
  
  /**
   * Full text description content (cached from descriptionUrl)
   */
  description?: string;
  
  /**
   * URL to marketing materials
   */
  external_url: string;
  
  /**
   * Token contract address (optional)
   */
  token?: string;
  
  /**
   * URL to app icon (1024x1024)
   */
  image: string;
  
  /**
   * URLs to app screenshots (max 5)
   * First screenshot is required, others are optional
   * Maximum resolution: 2048x2048
   */
  screenshotUrls: string[];
  
  /**
   * Nested object containing details for each supported platform.
   * Matches the "platforms" key used in the final JSON.
   */
  platforms?: Platforms;
} 