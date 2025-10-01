/**
 * Utilities for converting between strings and bytes32 (used in legacy contract)
 */

/**
 * Convert a hex string (bytes32) to a regular string
 * @param hex Hex string or object with _hex property
 * @returns Decoded string with null bytes removed
 */
export function hexToString(hex: string | { _hex: string } | any): string {
  try {
    // Handle string hex values
    if (typeof hex === 'string' && hex.startsWith('0x')) {
      return Buffer.from(hex.slice(2), 'hex').toString().replace(/\0/g, '');
    }
    
    // Handle object with _hex property (from some contract responses)
    if (typeof hex === 'object' && hex?._hex) {
      return Buffer.from(hex._hex.slice(2), 'hex').toString().replace(/\0/g, '');
    }
    
    // If it's already a string or something else, return as is
    return String(hex || '');
  } catch (e) {
    console.error("Error converting hex to string:", e);
    return '';
  }
}

/**
 * Convert a string to bytes32 hex format (for legacy contract)
 * @param str String to convert
 * @returns Hex string padded to 32 bytes
 */
export function stringToBytes32(str: string): `0x${string}` {
  // Pad string to 32 bytes with null characters
  const padded = str.padEnd(32, '\0');
  // Convert to hex
  return ('0x' + Buffer.from(padded).toString('hex')) as `0x${string}`;
}

/**
 * Check if a value is a bytes32 hex string
 * @param value Value to check
 * @returns True if value is a valid bytes32 hex string
 */
export function isBytes32Hex(value: any): value is `0x${string}` {
  return typeof value === 'string' && 
         value.startsWith('0x') && 
         value.length === 66; // 0x + 64 hex chars (32 bytes)
}

/**
 * Safely decode a bytes32 value that might be a string or hex
 * @param value Value to decode
 * @returns Decoded string
 */
export function safeDecodeBytes32(value: any): string {
  if (!value) return '';
  
  // If it's already a plain string (not hex), return it
  if (typeof value === 'string' && !value.startsWith('0x')) {
    return value;
  }
  
  // Otherwise try to decode as hex
  return hexToString(value);
}
