import { getContract, readContract, sendTransaction, prepareContractCall } from "thirdweb";
import { OMA3_APP_METADATA } from "@/config/contracts";
import { client } from "@/app/client";
import type { NFT } from "@/types/nft";
import { Account } from "thirdweb/wallets";
import type { Platforms, PlatformDetails, MetadataContractData } from "@/types/metadata-contract";
import { validateUrl, validateDid } from "@/lib/validation";
import { log } from "@/lib/log";
import { buildVersionedDID } from "@/lib/utils";
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
  METADATA_JSON_PS5_KEY,
  METADATA_JSON_XBOX_KEY,
  METADATA_JSON_NINTENDO_KEY,
  METADATA_JSON_URL_LAUNCH_KEY,
  METADATA_JSON_URL_DOWNLOAD_KEY,
  METADATA_JSON_SUPPORTED_KEY
} from "@/config/app-config";
import { normalizeMetadata } from '@/lib/utils';

/**
 * Simple logger function
 */
// function log(...args: any[]) {
//   if (process.env.NODE_ENV !== 'production') {
//     console.log('[AppMetadata]', ...args);
//   }
// }

/**
 * Get the app metadata contract instance
 * @returns Contract instance
 */
export function getAppMetadataContract() {
  try {
    return getContract({
      client,
      chain: OMA3_APP_METADATA.chain,
      address: OMA3_APP_METADATA.address,
      abi: OMA3_APP_METADATA.abi,
    });
  } catch (error) {
    console.error("Error getting metadata contract:", error);
    throw error;
  }
}

/**
 * Build metadata JSON object from the NFT data
 * @param nft The NFT data
 * @returns Metadata JSON string
 */
export function buildMetadataJSON(nft: NFT): string {
  const metadata: { [key: string]: any } = {
    name: nft.name || "", // Standard name key
    [METADATA_JSON_ICON_URL_KEY]: nft.metadata?.image || "",
    [METADATA_JSON_MARKETING_URL_KEY]: nft.metadata?.external_url || "",
    [METADATA_JSON_DESCRIPTION_URL_KEY]: nft.metadata?.descriptionUrl || "",
    [METADATA_JSON_TOKEN_CONTRACT_KEY]: nft.metadata?.token || "",
    [METADATA_JSON_SCREENSHOTS_URLS_KEY]: nft.metadata?.screenshotUrls?.filter(url => !!url) || [],
  };

  // Build platform availability data using constants for output keys
  const outputPlatformData: { [key: string]: any } = {};

  // Map internal platform keys (web, ios) to JSON keys (oma3_platforms_web, etc.)
  const platformKeyMap: { [key in keyof Platforms]?: string } = {
      web: METADATA_JSON_WEB_KEY,
      ios: METADATA_JSON_IOS_KEY,
      android: METADATA_JSON_ANDROID_KEY,
      windows: METADATA_JSON_WINDOWS_KEY,
      macos: METADATA_JSON_MACOS_KEY,
      meta: METADATA_JSON_META_KEY,
      ps5: METADATA_JSON_PS5_KEY,
      xbox: METADATA_JSON_XBOX_KEY,
      nintendo: METADATA_JSON_NINTENDO_KEY,
  };

  // Map internal detail keys (url_download) to JSON keys (oma3_platform_url_download)
  const detailKeyMap: { [key in keyof PlatformDetails]?: string } = {
      url_download: METADATA_JSON_URL_DOWNLOAD_KEY,
      url_launch: METADATA_JSON_URL_LAUNCH_KEY,
      supported: METADATA_JSON_SUPPORTED_KEY,
  };

  if (nft.metadata?.platforms) {
    // Iterate over the platforms present in the input NFT metadata
    for (const platformKey in nft.metadata.platforms) {
        // Ensure it's a valid platform key we know how to map
        if (platformKeyMap.hasOwnProperty(platformKey)) {
            // Add type annotation for inputPlatformDetails
            const inputPlatformDetails: PlatformDetails | undefined = nft.metadata.platforms[platformKey as keyof Platforms];
            const outputJsonKey = platformKeyMap[platformKey as keyof Platforms]!; // Get the JSON key (e.g., oma3_platforms_ios)
            const outputPlatformDetailsJson: { [key: string]: any } = {};

            if (inputPlatformDetails) {
                // Iterate over the details for this platform
                // Add type annotation for detailKey
                for (const detailKeyString in inputPlatformDetails) {
                    const detailKey = detailKeyString as keyof PlatformDetails;
                    // Ensure it's a valid detail key we know how to map
                    if (detailKeyMap.hasOwnProperty(detailKey)) {
                         const inputDetailValue = inputPlatformDetails[detailKey]; // Use the typed key
                         const outputDetailJsonKey = detailKeyMap[detailKey]!; // Get the detail JSON key (e.g., oma3_platform_url_download)

                         // Only add non-empty values
                         if (inputDetailValue && (!Array.isArray(inputDetailValue) || inputDetailValue.length > 0)) {
                            outputPlatformDetailsJson[outputDetailJsonKey] = inputDetailValue;
                         }
                    }
                }
            }

            // Add the platform entry to the output only if it has details
            if (Object.keys(outputPlatformDetailsJson).length > 0) {
                outputPlatformData[outputJsonKey] = outputPlatformDetailsJson;
            }
        }
    }
  }

  // Add the built platform data to the main metadata object
  metadata[METADATA_JSON_PLATFORM_KEY] = outputPlatformData;

  // Convert the complete metadata object to a JSON string
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
    // Perform validation checks
    return !!parsed.name; // At minimum, name should be present
  } catch (error) {
    console.error("Error validating metadata:", error);
    return false;
  }
}

/**
 * Set metadata for an NFT
 * @param nft The NFT data
 * @param account The user's account
 * @returns True if successful, false otherwise
 */
export async function setMetadata(nft: NFT, account: Account): Promise<boolean> {
  try {
    log(`Starting setMetadata function`);
    
    // Build metadata JSON
    const metadata = buildMetadataJSON(nft);
    log("Metadata JSON built:", JSON.stringify(metadata));
    
    // Validate metadata
    if (!validateMetadataJSON(metadata)) {
      log("Metadata validation failed");
      throw new Error("Invalid metadata");
    }
    log("Metadata validation passed");
    
    const contract = getAppMetadataContract();
    log("AppMetadata contract obtained successfully:", contract);
    log("Contract type:", typeof contract);
    log("Contract keys:", Object.keys(contract));

    // Use buildVersionedDID utility for versioned DID.
    // It handles validation, normalization (e.g., 1.2.3 -> 1.0), and lowercasing the base DID.
    const versionedDID = buildVersionedDID(nft.did, nft.version);
    log(`Using versioned DID for contract key: ${versionedDID} (from input version: ${nft.version})`);

    // Prepare the contract call using prepareContractCall
    log("Preparing contract call for setMetadataJson function");
    log(`Setting metadata for DID key: ${versionedDID}, metadata size: ${metadata.length} bytes`);
    
    const transaction = prepareContractCall({
      contract,
      method: "function setMetadataJson(string, string)",
      params: [versionedDID, metadata] // Pass the versioned DID string as the key
    });
    
    log("Transaction prepared:", {
      to: transaction.to,
      method: "setMetadataJson",
      params: [`${versionedDID}`, `${metadata.substring(0, 50)}...`]
    });
    
    // Log transaction details
    log("Account address used for transaction:", account.address);
    log("About to send transaction - wallet signing dialog should appear now");
    
    const result = await sendTransaction({
      account,
      transaction
    });
    
    log("Metadata transaction sent successfully with hash:", result.transactionHash);
    log(`Successfully set metadata for app with DID key: ${versionedDID}`);
    
    return true;
  } catch (error) {
    console.error("Error setting metadata:", error);
    
    // Safely extract error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.constructor.name : 'Unknown';
    
    log("Error type:", errorName);
    log("Error message:", errorMessage);
    
    console.error("Error details:", JSON.stringify(error, null, 2));
    throw error;
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

    // Use the shared normalizeMetadata utility function
    const normalizedMetadata = normalizeMetadata(metadata);
    
    // Cast to MetadataContractData since normalizeMetadata returns Partial<MetadataContractData>
    const structuredMetadata = normalizedMetadata as MetadataContractData;

    // Validate URLs and log warnings if invalid
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

export async function getMetadata(versionedDid: string): Promise<MetadataContractData | null> {
  try {
    log(`Getting metadata for versioned DID: ${versionedDid}`);
    const contract = getAppMetadataContract();
    log("Metadata contract obtained successfully");
    
    const metadataJson = await readContract({
      contract,
      method: "function getMetadataJson(string) view returns (string)",
      params: [versionedDid]
    });

    if (!metadataJson || metadataJson.trim() === "") { 
      log(`Metadata not found or empty for key: ${versionedDid}`);
      return null;
    }

    const structuredMetadata = buildMetadataStructure(metadataJson);
    if (!structuredMetadata) {
      log("Invalid metadata structure");
      return null;
    }

    log(`Metadata retrieved and structured successfully`);
    return structuredMetadata;
    
  } catch (error) {
    console.error(`Error getting metadata for ${versionedDid}:`, error);
    return null;
  }
}

/**
 * Validate metadata fields
 * @param metadata The metadata to validate
 * @throws Error if validation fails
 */
export function validateMetadata(metadata: MetadataContractData): void {
  // Required fields
  if (!metadata.descriptionUrl || !validateUrl(metadata.descriptionUrl)) {
    throw new Error("Invalid description URL");
  }
  
  if (!metadata.external_url || !validateUrl(metadata.external_url)) {
    throw new Error("Invalid marketing URL");
  }
  
  if (!metadata.image || !validateUrl(metadata.image)) {
    throw new Error("Invalid icon URL");
  }
  
  // First screenshot is required
  if (!metadata.screenshotUrls[0] || !validateUrl(metadata.screenshotUrls[0])) {
    throw new Error("At least one screenshot URL is required");
  }
  
  // Validate other screenshot URLs if provided
  metadata.screenshotUrls.slice(1).forEach((url, index) => {
    if (url && !validateUrl(url)) {
      throw new Error(`Invalid screenshot URL at position ${index + 1}`);
    }
  });
  
  // At least one platform availability URL is required
  let hasPlatformUrl = false;
  if (metadata.platforms) {
      for (const platformKey in metadata.platforms) {
          // Use type assertion for safety when accessing details
          const details = metadata.platforms[platformKey as keyof Platforms];
          if (details && (details.url_download || details.url_launch)) {
              hasPlatformUrl = true;
              break; // Found at least one, no need to check further
          }
      }
  }
  if (!hasPlatformUrl) {
    throw new Error("At least one platform availability URL (Download or Launch) is required");
  }
  
  // Validate HTTP URLs within platforms
  const validateHttpUrl = (url: string | undefined, fieldName: string) => {
    if (url && url.startsWith('http') && !validateUrl(url)) {
      throw new Error(`Invalid ${fieldName}`);
    }
  };
  
  if (metadata.platforms) {
      for (const platformKey in metadata.platforms) {
          // Use type assertion for safety when accessing details
          const details = metadata.platforms[platformKey as keyof Platforms];
          if (details) {
              validateHttpUrl(details.url_download, `${platformKey} download URL`);
              validateHttpUrl(details.url_launch, `${platformKey} launch URL`);
              // Note: 'supported' is an array of strings, not a URL, so no validation needed here.
          }
      }
  }
}