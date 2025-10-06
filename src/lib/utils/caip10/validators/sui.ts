/**
 * Sui CAIP-10 validation
 * Reference format: "mainnet", "testnet"
 * Address format: 0x-prefixed 32-byte hex (64 characters)
 * Short forms are left-padded (e.g., 0x1 → 0x0000...0001)
 */

export interface SuiValidationResult {
  valid: boolean;
  error?: string;
  normalizedAddress?: string;
}

/**
 * Normalize a Sui address to 32-byte hex format
 * Left-pads with zeros if necessary
 */
export function normalize0x32Bytes(address: string): string | Error {
  if (!address.startsWith('0x')) {
    return new Error('Sui address must start with 0x');
  }

  const hex = address.slice(2).toLowerCase();
  
  if (!/^[0-9a-f]+$/.test(hex)) {
    return new Error('Sui address must contain only hexadecimal characters');
  }

  if (hex.length > 64) {
    return new Error('Sui address exceeds 32 bytes (64 hex characters)');
  }

  // Left-pad to 64 characters
  const padded = hex.padStart(64, '0');
  return `0x${padded}`;
}

/**
 * Validate Sui CAIP-10 components
 */
export function validateSui(reference: string, address: string): SuiValidationResult {
  // Validate reference
  const validRefs = ['mainnet', 'testnet', 'devnet'];
  if (!validRefs.includes(reference.toLowerCase())) {
    return {
      valid: false,
      error: `Sui reference must be one of: ${validRefs.join(', ')}`,
    };
  }

  // Normalize address
  const normalized = normalize0x32Bytes(address);
  if (normalized instanceof Error) {
    return {
      valid: false,
      error: normalized.message,
    };
  }

  return {
    valid: true,
    normalizedAddress: normalized,
  };
}

/**
 * Check if a string is a valid Sui address format (before normalization)
 */
export function isSuiAddress(address: string): boolean {
  if (!address.startsWith('0x')) return false;
  const hex = address.slice(2);
  return /^[0-9a-fA-F]{1,64}$/.test(hex);
}

