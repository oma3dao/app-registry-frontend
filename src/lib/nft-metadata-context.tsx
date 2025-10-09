"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { NFT } from "@/types/nft";
import type { MetadataContractData, Platforms, PlatformDetails } from "@/types/metadata-contract";
import { buildVersionedDID, normalizeMetadata, fetchDescriptionContent } from "@/lib/utils";
import { log } from "@/lib/log";
import { 
  METADATA_JSON_ICON_URL_KEY, 
  METADATA_JSON_MARKETING_URL_KEY,
  METADATA_JSON_DESCRIPTION_URL_KEY,
  METADATA_JSON_SCREENSHOTS_URLS_KEY,
  METADATA_JSON_PLATFORM_KEY,
  METADATA_JSON_URL_DOWNLOAD_KEY,
  METADATA_JSON_URL_LAUNCH_KEY,
  METADATA_JSON_SUPPORTED_KEY
} from "@/config/app-config";
import { ethers } from "ethers";

/**
 * UI-friendly version of the metadata with normalized field names
 * Translates from API response format to a consistent UI format
 */
interface UIMetadata {
  name: string;
  image: string | null;
  external_url: string | null;
  descriptionUrl: string | null;
  description: string | null;
  screenshotUrls: string[];
  platforms: {
    [platform: string]: {
      downloadUrl?: string;
      launchUrl?: string;
      supported?: string[];
    }
  };
}

/**
 * Extended metadata with UI-specific fields and status information
 */
interface ExtendedMetadata {
  // The original JSON response from the API
  rawData: any;
  
  // Parsed and organized data for UI consumption
  displayData: UIMetadata;
  
  // Status fields
  isLoading: boolean;
  error: string | null;
  lastFetched: number; // Timestamp
  
  // Data integrity verification (computed when fetching)
  dataHashVerification?: {
    computedHash: string;
    storedHash: string;
    isValid: boolean;
  };
}

// Define the cache structure
interface NFTMetadataCache {
  [key: string]: ExtendedMetadata;
}

// Define the context type
interface NFTMetadataContextType {
  getNFTMetadata: (nft: NFT) => ExtendedMetadata | null;
  fetchNFTDescription: (nft: NFT) => Promise<string | null>;
  clearCache: () => void;
}

// Default values for the context
const defaultContextValue: NFTMetadataContextType = {
  getNFTMetadata: () => null,
  fetchNFTDescription: async () => null,
  clearCache: () => {}
};

// Create the context
const NFTMetadataContext = createContext<NFTMetadataContextType>(defaultContextValue);

/**
 * Maps MetadataContractData (or raw API response) to UIMetadata format
 */
const mapToUIMetadata = (data: any): UIMetadata => {
  if (!data) {
    return {
      name: "Unknown",
      image: null,
      external_url: null,
      descriptionUrl: null,
      description: null,
      screenshotUrls: [],
      platforms: {}
    };
  }
  
  return {
    name: data.name || "Unknown",
    image: data[METADATA_JSON_ICON_URL_KEY] || data.image || null,
    external_url: data[METADATA_JSON_MARKETING_URL_KEY] || data.external_url || null,
    descriptionUrl: data[METADATA_JSON_DESCRIPTION_URL_KEY] || data.descriptionUrl || null,
    description: data.description || null,
    screenshotUrls: Array.isArray(data[METADATA_JSON_SCREENSHOTS_URLS_KEY] || data.screenshotUrls) 
      ? (data[METADATA_JSON_SCREENSHOTS_URLS_KEY] || data.screenshotUrls) 
      : [],
    platforms: mapPlatforms(data[METADATA_JSON_PLATFORM_KEY] || data.platforms || {})
  };
};

/**
 * Maps platform data from API format to UI format
 */
const mapPlatforms = (platformData: any): UIMetadata['platforms'] => {
  const result: UIMetadata['platforms'] = {};
  
  try {
    // Loop through each platform key in the data
    Object.keys(platformData).forEach(platform => {
      if (platformData[platform]) {
        const details = platformData[platform];
        result[platform] = {
          downloadUrl: details[METADATA_JSON_URL_DOWNLOAD_KEY] || details.downloadUrl || undefined,
          launchUrl: details[METADATA_JSON_URL_LAUNCH_KEY] || details.launchUrl || undefined,
          supported: details[METADATA_JSON_SUPPORTED_KEY] || details.supported || undefined
        };
      }
    });
  } catch (error) {
    log("[NFTMetadataContext] Error mapping platform data:", error);
  }
  
  return result;
};

// Provider component
export function NFTMetadataProvider({ children }: { children: ReactNode }) {
  // Cache to store metadata for each NFT
  const [metadataCache, setMetadataCache] = useState<NFTMetadataCache>({});
  // Track fetch requests in progress
  const [fetchInProgress, setFetchInProgress] = useState<{[key: string]: boolean}>({});

  // Function to get a unique key for each NFT
  const getNFTKey = (nft: NFT): string => {
    return `${nft.did}-${nft.version}`;
  };

  // Function to fetch metadata for an NFT
  const fetchMetadata = async (nft: NFT): Promise<ExtendedMetadata> => {
    try {
      const versionedDID = buildVersionedDID(nft.did, nft.version);
      log(`[NFTMetadataContext] Fetching metadata for: ${versionedDID}`);
      
      // Call our RESTful data-url API endpoint using path-based URL
      // This matches the URL format stored on-chain in the registry
      // Next.js dynamic routes handle the path segments automatically
      const response = await fetch(`/api/data-url/${versionedDID}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        throw new Error(errorData.error || `Failed to fetch metadata: ${response.status}`);
      }
      
      // Get raw text for hash computation
      const jsonText = await response.text();
      const rawData = JSON.parse(jsonText);
      log(`[NFTMetadataContext] Successfully received metadata for: ${versionedDID}`);
      
      // Map the raw data to UI-friendly format
      const displayData = mapToUIMetadata(rawData);
      
      // Verify dataHash integrity (compute hash from fetched data)
      let dataHashVerification = undefined;
      try {
        const computedHash = ethers.id(jsonText);
        
        // Fetch app data from registry to get stored hash
        const { getAppByDid } = await import('@/lib/contracts/registry.read');
        const appData = await getAppByDid(nft.did);
        
        if (appData) {
          const isValid = computedHash.toLowerCase() === appData.dataHash.toLowerCase();
          dataHashVerification = {
            computedHash,
            storedHash: appData.dataHash,
            isValid
          };
          
          if (!isValid) {
            log(`[NFTMetadataContext] ⚠️ Hash mismatch for ${versionedDID}!`);
          } else {
            log(`[NFTMetadataContext] ✅ Hash verified for ${versionedDID}`);
          }
        }
      } catch (error) {
        log(`[NFTMetadataContext] Hash verification failed:`, error);
      }
      
      return {
        rawData,
        displayData,
        isLoading: false,
        error: null,
        lastFetched: Date.now(),
        dataHashVerification
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`[NFTMetadataContext] Error fetching metadata: ${errorMessage}`);
      
      // Create fallback display data with error indicators
      const displayData: UIMetadata = {
        name: nft.name || "Error",
        image: nft.metadata?.[METADATA_JSON_ICON_URL_KEY] || nft.metadata?.image || null,
        external_url: nft.metadata?.[METADATA_JSON_MARKETING_URL_KEY] || nft.metadata?.external_url || null,
        descriptionUrl: nft.metadata?.[METADATA_JSON_DESCRIPTION_URL_KEY] || nft.metadata?.descriptionUrl || null,
        description: nft.metadata?.description || null,
        screenshotUrls: nft.metadata?.[METADATA_JSON_SCREENSHOTS_URLS_KEY] || nft.metadata?.screenshotUrls || [],
        platforms: nft.metadata?.[METADATA_JSON_PLATFORM_KEY] ? mapPlatforms(nft.metadata[METADATA_JSON_PLATFORM_KEY]) : {}
      };
      
      return {
        rawData: null,
        displayData,
        isLoading: false,
        error: errorMessage,
        lastFetched: Date.now()
      };
    }
  };

  // Function to get metadata for an NFT (from cache or fetch it)
  const getNFTMetadata = (nft: NFT): ExtendedMetadata | null => {
    if (!nft || !nft.did || !nft.version) return null;

    const nftKey = getNFTKey(nft);

    // If we already have the metadata in cache and it's not too old (1 hour), return it
    const cachedData = metadataCache[nftKey];
    const now = Date.now();
    const cacheMaxAge = 60 * 60 * 1000; // 1 hour in milliseconds
    
    if (cachedData && !cachedData.isLoading && (now - cachedData.lastFetched < cacheMaxAge)) {
      return cachedData;
    }

    // If we don't have metadata but fetch is not yet in progress, start fetching
    if (!fetchInProgress[nftKey]) {
      setFetchInProgress(prev => ({ ...prev, [nftKey]: true }));
      
      // Create initial metadata from NFT if available
      let initialDisplayData: UIMetadata = {
        name: nft.name || "Loading...",
        // Use constants for consistent field access
        image: nft.metadata?.[METADATA_JSON_ICON_URL_KEY] || nft.metadata?.image || null,
        external_url: nft.metadata?.[METADATA_JSON_MARKETING_URL_KEY] || nft.metadata?.external_url || null,
        descriptionUrl: nft.metadata?.[METADATA_JSON_DESCRIPTION_URL_KEY] || nft.metadata?.descriptionUrl || null,
        description: nft.metadata?.description || null,
        screenshotUrls: nft.metadata?.[METADATA_JSON_SCREENSHOTS_URLS_KEY] || nft.metadata?.screenshotUrls || [],
        platforms: nft.metadata?.[METADATA_JSON_PLATFORM_KEY] ? mapPlatforms(nft.metadata[METADATA_JSON_PLATFORM_KEY]) : {}
      };
      
      log(`[NFTMetadataContext] Setting initial data for ${nftKey} with name: ${initialDisplayData.name}`);
      
      // Set initial loading state in cache
      setMetadataCache(prev => ({
        ...prev,
        [nftKey]: {
          rawData: null,
          displayData: initialDisplayData,
          isLoading: true,
          error: null,
          lastFetched: 0
        }
      }));

      // Fetch the metadata
      fetchMetadata(nft).then(result => {
        log(`[NFTMetadataContext] Fetch completed for ${nftKey} with ${result.error ? 'error' : 'success'}`);
        
        // Update cache with results
        setMetadataCache(prev => ({
          ...prev,
          [nftKey]: result
        }));
        
        // Mark fetch as complete
        setFetchInProgress(prev => {
          const newState = { ...prev };
          delete newState[nftKey];
          return newState;
        });
      });
    }

    // Return current state (could be loading, complete, or error)
    return metadataCache[nftKey] || null;
  };

  // New function to explicitly fetch description for an NFT when needed
  const fetchNFTDescription = async (nft: NFT): Promise<string | null> => {
    if (!nft || !nft.did || !nft.version) return null;
    
    const nftKey = getNFTKey(nft);
    const metadata = metadataCache[nftKey];
    
    // If we already have the description cached, return it
    if (metadata?.displayData?.description) {
      return metadata.displayData.description;
    }
    
    // If no description but we have a URL, fetch it
    if (metadata?.displayData?.descriptionUrl) {
      try {
        log(`[NFTMetadataContext] Explicitly fetching description for: ${nftKey}`);
        const descriptionContent = await fetchDescriptionContent(metadata.displayData.descriptionUrl);
        
        if (descriptionContent) {
          // Update the cache with the new description
          setMetadataCache(prev => {
            // Make sure the metadata still exists in cache
            if (!prev[nftKey]) return prev;
            
            // Create new state with the description
            return {
              ...prev,
              [nftKey]: {
                ...prev[nftKey],
                displayData: {
                  ...prev[nftKey].displayData,
                  description: descriptionContent
                },
                rawData: prev[nftKey].rawData ? {
                  ...prev[nftKey].rawData,
                  description: descriptionContent
                } : null
              }
            };
          });
          
          return descriptionContent;
        }
      } catch (error) {
        log(`[NFTMetadataContext] Error fetching description: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return null;
  };

  // Function to clear the entire cache
  const clearCache = (): void => {
    setMetadataCache({});
    setFetchInProgress({});
  };

  // Provide the context
  return (
    <NFTMetadataContext.Provider value={{ getNFTMetadata, fetchNFTDescription, clearCache }}>
      {children}
    </NFTMetadataContext.Provider>
  );
}

// Custom hook for using the context
export function useNFTMetadata() {
  return useContext(NFTMetadataContext);
} 