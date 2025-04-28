import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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
