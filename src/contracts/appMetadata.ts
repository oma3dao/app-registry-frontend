import { getContract, readContract, sendTransaction, prepareContractCall } from "thirdweb";
import { OMA3_APP_METADATA } from "@/config/contracts";
import { client } from "@/app/client";
import type { NFT } from "@/types/nft";
import { Account } from "thirdweb/wallets";
import { MetadataContractData } from "@/types/metadata-contract";
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
  // Initialize metadata object using constants for OMA3 fields
  // Use standard keys directly where appropriate (name, image, external_url)
  const metadata: { [key: string]: any } = {
    name: nft.name || "", // Standard name key
    [METADATA_JSON_ICON_URL_KEY]: nft.metadata?.iconUrl || "", // Now uses "image" key directly via constant
    [METADATA_JSON_MARKETING_URL_KEY]: nft.metadata?.marketingUrl || "", // Now uses "external_url" key directly via constant
    [METADATA_JSON_DESCRIPTION_URL_KEY]: nft.metadata?.descriptionUrl || "",
    [METADATA_JSON_TOKEN_CONTRACT_KEY]: nft.metadata?.tokenContractAddress || "",
    [METADATA_JSON_SCREENSHOTS_URLS_KEY]: nft.metadata?.screenshotUrls?.filter(url => !!url) || [],
  };

  // NOTE: We are intentionally omitting the standard "description" key
  // as OMA3 uses METADATA_JSON_DESCRIPTION_URL_KEY

  // Build platform availability data using constants
  const platformData: { [key: string]: any } = {};

  // Platform configuration map
  const platformConfigs = [
    { key: METADATA_JSON_WEB_KEY,       launchField: 'web_url_launch' },
    { key: METADATA_JSON_IOS_KEY,       downloadField: 'ios_url_download', launchField: 'ios_url_launch', supportedField: 'ios_supported' },
    { key: METADATA_JSON_ANDROID_KEY,   downloadField: 'android_url_download', launchField: 'android_url_launch' },
    { key: METADATA_JSON_WINDOWS_KEY,   downloadField: 'windows_url_download', launchField: 'windows_url_launch', supportedField: 'windows_supported' },
    { key: METADATA_JSON_MACOS_KEY,     downloadField: 'macos_url_download', launchField: 'macos_url_launch' },
    { key: METADATA_JSON_META_KEY,      downloadField: 'meta_url_download', launchField: 'meta_url_launch' },
    { key: METADATA_JSON_PS5_KEY,       downloadField: 'ps5_url_download' },
    { key: METADATA_JSON_XBOX_KEY,      downloadField: 'xbox_url_download' },
    { key: METADATA_JSON_NINTENDO_KEY,  downloadField: 'nintendo_url_download' },
  ];

  if (nft.metadata) {
    platformConfigs.forEach(config => {
      const entry: { [key: string]: any } = {};
      const downloadUrl = config.downloadField ? nft.metadata![config.downloadField as keyof MetadataContractData] : undefined;
      const launchUrl = config.launchField ? nft.metadata![config.launchField as keyof MetadataContractData] : undefined;
      const supported = config.supportedField ? nft.metadata![config.supportedField as keyof MetadataContractData] : undefined;

      if (downloadUrl) entry[METADATA_JSON_URL_DOWNLOAD_KEY] = downloadUrl;
      if (launchUrl) entry[METADATA_JSON_URL_LAUNCH_KEY] = launchUrl;
      if (Array.isArray(supported) && supported.length > 0) entry[METADATA_JSON_SUPPORTED_KEY] = supported;

      // Add platform entry only if it has at least one value
      if (Object.keys(entry).length > 0) {
        platformData[config.key] = entry;
      }
    });
  }

  // Always include the platform availability key
  metadata[METADATA_JSON_PLATFORM_KEY] = platformData;

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
 * Get metadata for an NFT
 * @param did The DID of the NFT
 * @returns Metadata JSON string
 */
export async function getMetadata(did: string): Promise<string> {
  try {
    log(`Getting metadata for DID: ${did}`);
    const contract = getAppMetadataContract();
    log("Metadata contract obtained successfully");
    
    // Read the metadata from the contract
    log(`Reading metadata for DID: ${did}`);
    const metadata = await readContract({
      contract,
      method: "getMetadataJson",
      params: [did]
    });
    
    const metadataStr = metadata as string;
    log(`Metadata retrieved successfully, length: ${metadataStr.length}`);
    
    return metadataStr;
  } catch (error) {
    console.error(`Error getting metadata for DID ${did}:`, error);
    
    // Safely extract error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.constructor.name : 'Unknown';
    
    log("Error type:", errorName);
    log("Error message:", errorMessage);
    
    return "";
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
  
  if (!metadata.marketingUrl || !validateUrl(metadata.marketingUrl)) {
    throw new Error("Invalid marketing URL");
  }
  
  if (!metadata.iconUrl || !validateUrl(metadata.iconUrl)) {
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
  
  // At least one platform availability is required
  const hasPlatform = metadata.web_url_launch ||
    metadata.ios_url_download || metadata.ios_url_launch ||
    metadata.android_url_download || metadata.android_url_launch ||
    metadata.windows_url_download || metadata.windows_url_launch ||
    metadata.macos_url_download || metadata.macos_url_launch ||
    metadata.meta_url_download || metadata.meta_url_launch ||
    metadata.ps5_url_download ||
    metadata.xbox_url_download ||
    metadata.nintendo_url_download;
  
  if (!hasPlatform) {
    throw new Error("At least one platform availability URL is required");
  }
  
  // Validate HTTP URLs
  const validateHttpUrl = (url: string | undefined, fieldName: string) => {
    if (url && url.startsWith('http') && !validateUrl(url)) {
      throw new Error(`Invalid ${fieldName}`);
    }
  };
  
  validateHttpUrl(metadata.web_url_launch, 'web launch URL');
  validateHttpUrl(metadata.ios_url_download, 'iOS download URL');
  validateHttpUrl(metadata.ios_url_launch, 'iOS launch URL');
  validateHttpUrl(metadata.android_url_download, 'Android download URL');
  validateHttpUrl(metadata.android_url_launch, 'Android launch URL');
  validateHttpUrl(metadata.windows_url_download, 'Windows download URL');
  validateHttpUrl(metadata.windows_url_launch, 'Windows launch URL');
  validateHttpUrl(metadata.macos_url_download, 'macOS download URL');
  validateHttpUrl(metadata.macos_url_launch, 'macOS launch URL');
  validateHttpUrl(metadata.meta_url_download, 'Meta Quest download URL');
  validateHttpUrl(metadata.meta_url_launch, 'Meta Quest launch URL');
  validateHttpUrl(metadata.ps5_url_download, 'PlayStation download URL');
  validateHttpUrl(metadata.xbox_url_download, 'Xbox download URL');
  validateHttpUrl(metadata.nintendo_url_download, 'Nintendo Switch download URL');
} 