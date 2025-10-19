/**
 * Utility functions for metadata JSON building and validation
 */

import type { NFT, TPlatforms, TPlatformDetails } from "@/schema/data-model";
// Removed MetadataContractData import - using generic types for frontend
import { validateUrl } from "@/lib/validation";
import { normalizeMetadata } from '@/lib/utils';
import {
  METADATA_JSON_MARKETING_URL_KEY,
  METADATA_JSON_TOKEN_CONTRACT_KEY,
  METADATA_JSON_ICON_URL_KEY,
  METADATA_JSON_SCREENSHOTS_URLS_KEY,
  METADATA_JSON_PLATFORM_KEY,
  METADATA_JSON_WEB_KEY,
  METADATA_JSON_IOS_KEY,
  METADATA_JSON_ANDROID_KEY,
  METADATA_JSON_WINDOWS_KEY,
  METADATA_JSON_MACOS_KEY,
  METADATA_JSON_META_KEY,
  METADATA_JSON_PLAYSTATION_KEY,
  METADATA_JSON_XBOX_KEY,
  METADATA_JSON_NINTENDO_KEY,
  METADATA_JSON_URL_LAUNCH_KEY,
  METADATA_JSON_URL_DOWNLOAD_KEY,
  METADATA_JSON_SUPPORTED_KEY
} from "@/config/app-config";

/**
 * Build metadata JSON object from the NFT data
 * @param nft The NFT data
 * @returns Metadata JSON string
 */
export function buildMetadataJSON(nft: NFT): string {
  const metadata: { [key: string]: any } = {
    name: nft.name || "",
    description: nft.description || "",
    publisher: nft.publisher || "",
    [METADATA_JSON_ICON_URL_KEY]: nft.image || "",
    [METADATA_JSON_MARKETING_URL_KEY]: nft.external_url || "",
    [METADATA_JSON_TOKEN_CONTRACT_KEY]: nft.fungibleTokenId || "",
    [METADATA_JSON_SCREENSHOTS_URLS_KEY]: nft.screenshotUrls?.filter(url => !!url) || [],
  };

  const outputPlatformData: { [key: string]: any } = {};

  const platformKeyMap: Record<string, string> = {
      web: METADATA_JSON_WEB_KEY,
      ios: METADATA_JSON_IOS_KEY,
      android: METADATA_JSON_ANDROID_KEY,
      windows: METADATA_JSON_WINDOWS_KEY,
      macos: METADATA_JSON_MACOS_KEY,
      meta: METADATA_JSON_META_KEY,
      playstation: METADATA_JSON_PLAYSTATION_KEY,
      xbox: METADATA_JSON_XBOX_KEY,
      nintendo: METADATA_JSON_NINTENDO_KEY,
  };

  const detailKeyMap: { [key in keyof TPlatformDetails]?: string } = {
      downloadUrl: METADATA_JSON_URL_DOWNLOAD_KEY,
      launchUrl: METADATA_JSON_URL_LAUNCH_KEY,
      supported: METADATA_JSON_SUPPORTED_KEY,
  };

  if (nft.platforms) {
    for (const platformKey in nft.platforms) {
        if (platformKeyMap.hasOwnProperty(platformKey)) {
            const inputPlatformDetails: TPlatformDetails | undefined = nft.platforms[platformKey];
            const outputJsonKey = platformKeyMap[platformKey];
            const outputPlatformDetailsJson: { [key: string]: any } = {};

            if (inputPlatformDetails) {
                for (const detailKeyString in inputPlatformDetails) {
                    const detailKey = detailKeyString as keyof TPlatformDetails;
                    if (detailKeyMap.hasOwnProperty(detailKey)) {
                         const inputDetailValue = inputPlatformDetails[detailKey];
                         const outputDetailJsonKey = detailKeyMap[detailKey]!;

                         if (inputDetailValue && (!Array.isArray(inputDetailValue) || inputDetailValue.length > 0)) {
                            outputPlatformDetailsJson[outputDetailJsonKey] = inputDetailValue;
                         }
                    }
                }
            }

            if (Object.keys(outputPlatformDetailsJson).length > 0) {
                outputPlatformData[outputJsonKey] = outputPlatformDetailsJson;
            }
        }
    }
  }

  metadata[METADATA_JSON_PLATFORM_KEY] = outputPlatformData;
  return JSON.stringify(metadata);
}

/**
 * Validate metadata JSON string
 * @param metadata The metadata JSON string
 * @returns True if valid, false otherwise
 */
export function validateMetadataJSON(metadata: string): boolean {
  try {
    const parsed = JSON.parse(metadata);
    return !!parsed.name;
  } catch (error) {
    console.error("Error validating metadata:", error);
    return false;
  }
}

/**
 * Parses and structures metadata from a JSON string.
 * @param metadataJson The metadata JSON string.
 * @returns A structured MetadataContractData object or null if invalid.
 */
export function buildMetadataStructure(metadataJson: string): Record<string, any> | null {
  try {
    const metadata = JSON.parse(metadataJson);
    
    if (typeof metadata !== 'object' || metadata === null) {
      return null;
    }

    const normalizedMetadata = normalizeMetadata(metadata);

    // Validate URLs if they exist
    if ((normalizedMetadata.external_url && !validateUrl(normalizedMetadata.external_url)) || 
        (normalizedMetadata.image && !validateUrl(normalizedMetadata.image))) {
      console.warn("Invalid URLs in metadata:", normalizedMetadata);
    }

    return normalizedMetadata;
  } catch (error) {
    console.error("Failed to parse metadata JSON:", error);
    return null;
  }
}

/**
 * Validate metadata fields
 * @param metadata The metadata to validate
 * @throws Error if validation fails
 */
export function validateMetadata(metadata: any): void {
  // All URL fields are optional, but if provided must be valid
  if (metadata.external_url && !validateUrl(metadata.external_url)) {
    throw new Error("Invalid marketing URL");
  }
  
  if (metadata.image && !validateUrl(metadata.image)) {
    throw new Error("Invalid icon URL");
  }
  
  // Screenshot URLs are optional
  if (metadata.screenshotUrls && metadata.screenshotUrls.length > 0) {
    if (!validateUrl(metadata.screenshotUrls[0])) {
      throw new Error("First screenshot URL is invalid");
    }
    
    metadata.screenshotUrls.slice(1).forEach((url: string, index: number) => {
      if (url && !validateUrl(url)) {
        throw new Error(`Invalid screenshot URL at position ${index + 1}`);
      }
    });
  }
  
  let hasPlatformUrl = false;
  if (metadata.platforms) {
      for (const platformKey in metadata.platforms) {
          const details = metadata.platforms[platformKey];
          if (details && (details.downloadUrl || details.launchUrl)) {
              hasPlatformUrl = true;
              break;
          }
      }
  }
  if (!hasPlatformUrl) {
    throw new Error("At least one platform availability URL (Download or Launch) is required");
  }
  
  const validateHttpUrl = (url: string | undefined, fieldName: string) => {
    if (url && url.startsWith('http') && !validateUrl(url)) {
      throw new Error(`Invalid ${fieldName}`);
    }
  };
  
  if (metadata.platforms) {
      for (const platformKey in metadata.platforms) {
          const details = metadata.platforms[platformKey];
          if (details) {
              validateHttpUrl(details.downloadUrl, `${platformKey} download URL`);
              validateHttpUrl(details.launchUrl, `${platformKey} launch URL`);
          }
      }
  }
}
