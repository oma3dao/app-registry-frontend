/**
 * Validation utilities for app registry
 * These are shared between the frontend form validation and backend contract validation
 */

// Maximum field lengths (in characters)
export const MAX_URL_LENGTH = 256;
export const MAX_DID_LENGTH = 128;
export const MAX_NAME_LENGTH = 32;

// Regular expressions for validation
export const VERSION_REGEX = /^\d+\.\d+(\.\d+)?$/;
export const DID_REGEX = /^did:[a-z0-9]+:[a-zA-Z0-9.%-:_]+$/;
// Updated to allow localhost and single-label domains for development
export const URL_REGEX = /^(https?:\/\/)([a-zA-Z0-9-]+(\.([a-zA-Z0-9-]+))*)(:\d+)?(\/[^\s]*)?$/;

/**
 * Validates a version string in format x.y.z or x.y
 * @param version The version string to validate
 * @returns True if valid, false otherwise
 */
export function validateVersion(version: string): boolean {
  if (!version) {
    return false;
  }
  const parts = version.split('.');
  // Must have at least major.minor (parts[0] and parts[1] must exist and be non-empty)
  // Allow optional patch version (parts[2])
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    return false;
  }
  // Check if all provided parts are numeric
  return parts.every(part => /^[0-9]+$/.test(part));
}

/**
 * Validates a URL string and checks its length
 * @param url The URL to validate
 * @returns True if the URL is valid and within length limits
 */
export function validateUrl(url: string): boolean {
  // Return false for empty URLs
  if (!url) return false;
  
  // Trim the URL to remove leading/trailing whitespace
  const trimmedUrl = url.trim();
  
  // Check if the URL exceeds the maximum allowed length (256 characters)
  if (trimmedUrl.length > MAX_URL_LENGTH) return false;
  
  // Validate the URL format using regex
  return URL_REGEX.test(trimmedUrl);
}

/**
 * Validates a DID string and checks its format and length
 * @param did The DID to validate
 * @returns True if the DID is valid
 */
export function validateDid(did: string): boolean {
  if (!did || did.length > MAX_DID_LENGTH) return false;
  return DID_REGEX.test(did);
}

/**
 * Validates a name's length
 * @param name The name to validate
 * @returns True if the name is valid
 */
export function validateName(name: string): boolean {
  return name.length > 0 && name.length <= MAX_NAME_LENGTH;
}

/**
 * Validates a CAIP-10 address (account identifier)
 * Format: namespace:reference:address
 * @param address The CAIP-10 address to validate
 * @returns True if the address is valid
 */
export function validateCaipAddress(address: string): boolean {
  if (!address) return true; // Optional field
  // CAIP-10 format: namespace:reference:address
  // Example: eip155:1:0x1234567890123456789012345678901234567890
  const parts = address.split(':');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

/**
 * Validates a CAIP-19 asset identifier (fungible token)
 * Format: namespace:reference/assetNamespace:assetReference
 * @param tokenId The CAIP-19 token ID to validate
 * @returns True if the token ID is valid
 */
export function validateCaip19Token(tokenId: string): boolean {
  if (!tokenId) return true; // Optional field
  // CAIP-19 format: namespace:reference/assetNamespace:assetReference
  // Example: eip155:1/erc20:0x1234567890123456789012345678901234567890
  // Example: eip155:1/erc1155:0x1234.../123
  const [chainPart, assetPart] = tokenId.split('/');
  if (!chainPart || !assetPart) return false;
  
  const chainParts = chainPart.split(':');
  const assetParts = assetPart.split(':');
  
  // Chain part must be namespace:reference
  if (chainParts.length !== 2 || chainParts.some(p => !p)) return false;
  
  // Asset part must be assetNamespace:assetReference
  if (assetParts.length !== 2 || assetParts.some(p => !p)) return false;
  
  return true;
}