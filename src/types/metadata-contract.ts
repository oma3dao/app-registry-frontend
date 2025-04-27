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
} 