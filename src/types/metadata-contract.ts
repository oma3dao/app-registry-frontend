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
   * URL to marketing materials
   */
  marketingUrl: string;
  
  /**
   * Token contract address (optional)
   */
  tokenContractAddress?: string;
  
  /**
   * URL to app icon (1024x1024)
   */
  iconUrl: string;
  
  /**
   * URLs to app screenshots (max 5)
   * First screenshot is required, others are optional
   * Maximum resolution: 2048x2048
   */
  screenshotUrls: string[];
  
  /**
   * Web platform launch URL
   */
  web_url_launch?: string;
  
  /**
   * iOS platform download URL
   */
  ios_url_download?: string;
  
  /**
   * iOS platform launch URL
   */
  ios_url_launch?: string;
  
  /**
   * iOS supported devices
   */
  ios_supported?: string[];
  
  /**
   * Android platform download URL
   */
  android_url_download?: string;
  
  /**
   * Android platform launch URL
   */
  android_url_launch?: string;
  
  /**
   * Windows platform download URL
   */
  windows_url_download?: string;
  
  /**
   * Windows platform launch URL
   */
  windows_url_launch?: string;
  
  /**
   * Windows supported architectures
   */
  windows_supported?: string[];
  
  /**
   * macOS platform download URL
   */
  macos_url_download?: string;
  
  /**
   * macOS platform launch URL
   */
  macos_url_launch?: string;
  
  /**
   * Meta Quest platform download URL
   */
  meta_url_download?: string;
  
  /**
   * Meta Quest platform launch URL
   */
  meta_url_launch?: string;
  
  /**
   * PlayStation platform download URL
   */
  ps5_url_download?: string;
  
  /**
   * Xbox platform download URL
   */
  xbox_url_download?: string;
  
  /**
   * Nintendo Switch platform download URL
   */
  nintendo_url_download?: string;
} 