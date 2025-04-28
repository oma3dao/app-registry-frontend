import { getContract, readContract, sendTransaction, prepareContractCall } from "thirdweb";
import { OMA3_APP_METADATA } from "@/config/contracts";
import { client } from "@/app/client";
import type { NFT } from "@/types/nft";
import { Account } from "thirdweb/wallets";
import { MetadataContractData } from "@/types/metadata-contract";
import { validateUrl } from "@/lib/validation";
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
  // Build the metadata object based on the NFT data
  const metadata: any = {
    name: nft.name,
    // Use properties from metadata if they exist
    description: nft.metadata?.descriptionUrl || "",
    image: nft.metadata?.iconUrl || "",
    external_url: nft.metadata?.marketingUrl || "",
    // Add any other metadata fields as needed
  };

  // Add platform availability if it exists
  if (nft.metadata) {
    const platformData: any = {};
    
    // Web platform
    if (nft.metadata.web_url_launch) {
      platformData.web = { 
        url_launch: nft.metadata.web_url_launch 
      };
    }
    
    // iOS platform
    if (nft.metadata.ios_url_download || nft.metadata.ios_url_launch || (nft.metadata.ios_supported && nft.metadata.ios_supported.length > 0)) {
      platformData.ios = {};
      if (nft.metadata.ios_url_download) platformData.ios.url_download = nft.metadata.ios_url_download;
      if (nft.metadata.ios_url_launch) platformData.ios.url_launch = nft.metadata.ios_url_launch;
      if (nft.metadata.ios_supported && nft.metadata.ios_supported.length > 0) {
        platformData.ios.supported = nft.metadata.ios_supported;
      }
    }
    
    // Android platform
    if (nft.metadata.android_url_download || nft.metadata.android_url_launch) {
      platformData.android = {};
      if (nft.metadata.android_url_download) platformData.android.url_download = nft.metadata.android_url_download;
      if (nft.metadata.android_url_launch) platformData.android.url_launch = nft.metadata.android_url_launch;
    }
    
    // Windows platform
    if (nft.metadata.windows_url_download || nft.metadata.windows_url_launch || (nft.metadata.windows_supported && nft.metadata.windows_supported.length > 0)) {
      platformData.windows = {};
      if (nft.metadata.windows_url_download) platformData.windows.url_download = nft.metadata.windows_url_download;
      if (nft.metadata.windows_url_launch) platformData.windows.url_launch = nft.metadata.windows_url_launch;
      if (nft.metadata.windows_supported && nft.metadata.windows_supported.length > 0) {
        platformData.windows.supported = nft.metadata.windows_supported;
      }
    }
    
    // macOS platform
    if (nft.metadata.macos_url_download || nft.metadata.macos_url_launch) {
      platformData.macos = {};
      if (nft.metadata.macos_url_download) platformData.macos.url_download = nft.metadata.macos_url_download;
      if (nft.metadata.macos_url_launch) platformData.macos.url_launch = nft.metadata.macos_url_launch;
    }
    
    // Meta Quest platform
    if (nft.metadata.meta_url_download || nft.metadata.meta_url_launch) {
      platformData.meta = {};
      if (nft.metadata.meta_url_download) platformData.meta.url_download = nft.metadata.meta_url_download;
      if (nft.metadata.meta_url_launch) platformData.meta.url_launch = nft.metadata.meta_url_launch;
    }
    
    // PlayStation 5
    if (nft.metadata.ps5_url_download) {
      platformData.ps5 = {
        url_download: nft.metadata.ps5_url_download
      };
    }
    
    // Xbox
    if (nft.metadata.xbox_url_download) {
      platformData.xbox = {
        url_download: nft.metadata.xbox_url_download
      };
    }
    
    // Nintendo Switch
    if (nft.metadata.nintendo_url_download) {
      platformData.nintendo = {
        url_download: nft.metadata.nintendo_url_download
      };
    }
    
    // Add platform data to metadata
    if (Object.keys(platformData).length > 0) {
      metadata.platform_availability = platformData;
    } else {
      log("Warning: No platform availability data found in NFT metadata");
    }
  }

  // Convert to JSON string
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

    // Use buildVersionedDID utility for versioned DID
    if (!nft.version) {
      throw new Error('Version is required');
    }
         
    const versionedDID = buildVersionedDID(nft.did, nft.version);
    log(`Using versioned DID: ${versionedDID} (version: ${nft.version})`);

    // Prepare the contract call using prepareContractCall
    log("Preparing contract call for setMetadataJson function");
    log(`Setting metadata for DID: ${versionedDID}, metadata size: ${metadata.length} bytes`);
    
    const transaction = prepareContractCall({
      contract,
      method: "function setMetadataJson(string, string)",
      params: [versionedDID, metadata]
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
    log(`Successfully set metadata for app with DID: ${versionedDID}`);
    
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