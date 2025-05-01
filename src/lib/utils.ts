import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { log } from '@/lib/log'
import { MetadataContractData, Platforms } from '@/types/metadata-contract';

/**
 * Utility function for conditionally joining class names
 * Combines clsx and tailwind-merge for optimized class handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if the device is mobile based on userAgent
 * Used for displaying appropriate UI/guidance
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent
  
  // Check for common mobile device indicators in user agent
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
}

/**
 * Debounce function
 * @param fn Function to debounce
 * @param ms Milliseconds to wait before invoking the function
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T, 
  ms = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  
  return function(this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      fn.apply(this, args)
      timeoutId = null
    }, ms)
  }
}

/**
 * Builds a versioned DID string in the format did/v/version
 * @param did The base DID string
 * @param version The version string (e.g., '1.0' or '1.0.5')
 * @returns The versioned DID string (e.g., did/v/1.0)
 * @throws Error if version format is invalid
 */
export function buildVersionedDID(did: string, version: string): string {
  if (!did) {
    throw new Error("DID is required");
  }
  const normalizedVersion = normalizeAndValidateVersion(version);
  // Ensure the base DID part is lowercase for consistent key generation
  const lowercaseDid = did.toLowerCase(); 
  return `${lowercaseDid}/v/${normalizedVersion}`
}

/**
 * Validates and normalizes a version string to major.minor format.
 * @param version The input version string (e.g., '1.0', '1.2.3')
 * @returns The normalized version string (e.g., '1.0', '1.2')
 * @throws Error if the version format is invalid (less than x.y)
 */
export function normalizeAndValidateVersion(version: string): string {
  if (!version) {
    throw new Error("Version is required");
  }
  const parts = version.split(".");
  // Ensure at least major and minor parts exist and are not empty strings
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error("Invalid version format. Please specify at least major.minor (e.g., '1.0')");
  }
  // Optionally check if parts are numeric if needed, but requirement is just format
  // if (isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) {
  //   throw new Error("Invalid version format. Major and minor parts must be numeric.");
  // }
  return `${parts[0]}.${parts[1]}`;
}

/**
 * Fetches metadata from the API route and extracts the image URL.
 * @param dataUrl The URL to fetch metadata from.
 * @returns The image URL string if found, otherwise null.
 */
export async function fetchMetadataImage(dataUrl: string): Promise<string | null> {
  if (!dataUrl) return null;
  try {
    log("[fetchMetadataImage] Fetching for dataUrl:", dataUrl);
    // Use absolute path for API route call within server/client components
    const apiUrl = `/api/fetch-metadata?url=${encodeURIComponent(dataUrl)}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      log("[fetchMetadataImage] API response not OK:", response.status, response.statusText);
      return null; // API route failed
    }
    const data = await response.json();
    log("[fetchMetadataImage] Received data:", data);
    
    if (data.error) {
      log("[fetchMetadataImage] Error in API response:", data.error);
      return null; // Error reported by API (fetch failed, parse failed, image not found)
    }
    // Ensure image is a string and not empty before returning
    if (typeof data.image === 'string' && data.image.trim() !== '') {
       return data.image;
    } else {
       log("[fetchMetadataImage] image missing or not a non-empty string:", data.image);
       return null;
    }
  } catch (error) {
    log("[fetchMetadataImage] Error calling API route:", error);
    return null;
  }
}

/**
 * Normalizes metadata to ensure it has all required fields with default values
 * @param metadata Raw metadata object which might be missing fields
 * @returns Normalized metadata with all required fields (using defaults where needed)
 */
export const normalizeMetadata = (metadata: Record<string, any> | null | undefined): Partial<MetadataContractData> => {
  if (!metadata) return {};
  
  return {
    descriptionUrl: metadata.descriptionUrl || "",
    external_url: metadata.external_url || "",
    token: metadata.token || "",
    image: metadata.image || "",
    screenshotUrls: Array.isArray(metadata.screenshotUrls) ? metadata.screenshotUrls : ["", "", "", "", ""],
    platforms: metadata.platforms || {}
  };
};

/**
 * Fetches description content from a URL using the API route
 * @param descriptionUrl The URL where the description is hosted
 * @returns The content as a string or null if it couldn't be fetched
 */
export async function fetchDescriptionContent(descriptionUrl: string): Promise<string | null> {
  if (!descriptionUrl) return null;
  
  try {
    log("[fetchDescriptionContent] Fetching for URL:", descriptionUrl);
    // Use the fetch-description API route
    const apiUrl = `/api/fetch-description?url=${encodeURIComponent(descriptionUrl)}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      log("[fetchDescriptionContent] API response not OK:", response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    if (data.error) {
      log("[fetchDescriptionContent] Error in API response:", data.error);
      return null;
    }
    
    if (typeof data.content === 'string') {
      return data.content;
    } else {
      log("[fetchDescriptionContent] Content missing or not a string");
      return null;
    }
  } catch (error) {
    log("[fetchDescriptionContent] Error calling API route:", error);
    return null;
  }
}
