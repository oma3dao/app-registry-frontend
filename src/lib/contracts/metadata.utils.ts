/**
 * Utility functions for metadata JSON building and validation
 */

import type { NFT } from "@/types/nft";
import type { Platforms, PlatformDetails, MetadataContractData } from "@/types/metadata-contract";
import { validateUrl } from "@/lib/validation";
import { normalizeMetadata } from '@/lib/utils';
import {
  METADATA_JSON_DESCRIPTION_URL_KEY,
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
    [METADATA_JSON_ICON_URL_KEY]: nft.metadata?.image || "",
    [METADATA_JSON_MARKETING_URL_KEY]: nft.metadata?.external_url || "",
    [METADATA_JSON_DESCRIPTION_URL_KEY]: nft.metadata?.descriptionUrl || "",
    [METADATA_JSON_TOKEN_CONTRACT_KEY]: nft.metadata?.token || "",
    [METADATA_JSON_SCREENSHOTS_URLS_KEY]: nft.metadata?.screenshotUrls?.filter(url => !!url) || [],
  };

  const outputPlatformData: { [key: string]: any } = {};

  const platformKeyMap: { [key in keyof Platforms]?: string } = {
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

  const detailKeyMap: { [key in keyof PlatformDetails]?: string } = {
      downloadUrl: METADATA_JSON_URL_DOWNLOAD_KEY,
      launchUrl: METADATA_JSON_URL_LAUNCH_KEY,
      supported: METADATA_JSON_SUPPORTED_KEY,
  };

  if (nft.metadata?.platforms) {
    for (const platformKey in nft.metadata.platforms) {
        if (platformKeyMap.hasOwnProperty(platformKey)) {
            const inputPlatformDetails: PlatformDetails | undefined = nft.metadata.platforms[platformKey as keyof Platforms];
            const outputJsonKey = platformKeyMap[platformKey as keyof Platforms]!;
            const outputPlatformDetailsJson: { [key: string]: any } = {};

            if (inputPlatformDetails) {
                for (const detailKeyString in inputPlatformDetails) {
                    const detailKey = detailKeyString as keyof PlatformDetails;
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
export function buildMetadataStructure(metadataJson: string): MetadataContractData | null {
  try {
    const metadata = JSON.parse(metadataJson);
    
    if (typeof metadata !== 'object' || metadata === null) {
      return null;
    }

    const normalizedMetadata = normalizeMetadata(metadata);
    const structuredMetadata = normalizedMetadata as MetadataContractData;

    if (!validateUrl(structuredMetadata.descriptionUrl) || 
        !validateUrl(structuredMetadata.external_url) || 
        !validateUrl(structuredMetadata.image)) {
      console.warn("Invalid URLs in metadata:", structuredMetadata);
    }

    return structuredMetadata;
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
export function validateMetadata(metadata: MetadataContractData): void {
  if (!metadata.descriptionUrl || !validateUrl(metadata.descriptionUrl)) {
    throw new Error("Invalid description URL");
  }
  
  if (!metadata.external_url || !validateUrl(metadata.external_url)) {
    throw new Error("Invalid marketing URL");
  }
  
  if (!metadata.image || !validateUrl(metadata.image)) {
    throw new Error("Invalid icon URL");
  }
  
  if (!metadata.screenshotUrls[0] || !validateUrl(metadata.screenshotUrls[0])) {
    throw new Error("At least one screenshot URL is required");
  }
  
  metadata.screenshotUrls.slice(1).forEach((url, index) => {
    if (url && !validateUrl(url)) {
      throw new Error(`Invalid screenshot URL at position ${index + 1}`);
    }
  });
  
  let hasPlatformUrl = false;
  if (metadata.platforms) {
      for (const platformKey in metadata.platforms) {
          const details = metadata.platforms[platformKey as keyof Platforms];
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
          const details = metadata.platforms[platformKey as keyof Platforms];
          if (details) {
              validateHttpUrl(details.downloadUrl, `${platformKey} download URL`);
              validateHttpUrl(details.launchUrl, `${platformKey} launch URL`);
          }
      }
  }
}
