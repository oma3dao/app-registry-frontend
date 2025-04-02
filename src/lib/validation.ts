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
export const DID_REGEX = /^did:[a-z0-9]+:[a-zA-Z0-9.%-]+$/;

/**
 * Validates a version string in format x.y.z or x.y
 * @param version The version string to validate
 * @returns True if the version is valid
 */
export function validateVersion(version: string): boolean {
  return VERSION_REGEX.test(version);
}

/**
 * Validates a URL string and checks its length
 * @param url The URL to validate
 * @returns True if the URL is valid and within length limits
 */
export function validateUrl(url: string): boolean {
  if (url.length > MAX_URL_LENGTH) return false;
  
  try {
    // Check if the URL is valid
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
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
 * Placeholder for CAIP address validation
 * @param address The CAIP address to validate
 * @returns True if the address is valid
 */
export function validateCaipAddress(address: string): boolean {
  // CAIP-2 format is chainNamespace:chainReference:address
  // For now, we'll accept any non-empty string or empty (as it's optional)
  return true;
} 