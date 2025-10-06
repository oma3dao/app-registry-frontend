/**
 * EVM (eip155) CAIP-10 validation and normalization
 * Uses EIP-55 checksumming for addresses
 */

import { getAddress, isAddress } from 'ethers';

export interface EvmValidationResult {
  valid: boolean;
  error?: string;
  normalizedAddress?: string;
  chainId?: number;
}

/**
 * Validate EVM CAIP-10 components
 * reference: numeric chainId (e.g., "1", "137")
 * address: 0x-prefixed hex address (20 bytes)
 */
export function validateEvm(reference: string, address: string): EvmValidationResult {
  // Validate reference (chainId)
  const chainId = parseInt(reference, 10);
  if (isNaN(chainId) || chainId < 0) {
    return {
      valid: false,
      error: 'Chain reference must be a valid numeric chainId',
    };
  }

  // Validate address format
  if (!address.startsWith('0x')) {
    return {
      valid: false,
      error: 'EVM address must start with 0x',
    };
  }

  if (address.length !== 42) {
    return {
      valid: false,
      error: 'EVM address must be 20 bytes (0x + 40 hex characters)',
    };
  }

  // Validate hex format
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return {
      valid: false,
      error: 'EVM address must contain only hexadecimal characters',
    };
  }

  // Validate and normalize using ethers (EIP-55 checksum)
  if (!isAddress(address)) {
    return {
      valid: false,
      error: 'Invalid EVM address',
    };
  }

  try {
    const checksummed = getAddress(address);
    return {
      valid: true,
      normalizedAddress: checksummed,
      chainId,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to checksum address',
    };
  }
}

/**
 * Convert an EVM address to EIP-55 checksum format
 */
export function toEip55(address: string): string | Error {
  try {
    return getAddress(address);
  } catch (error) {
    return new Error('Invalid EVM address');
  }
}

/**
 * Check if a string is a valid EVM address
 */
export function isEvmAddress(address: string): boolean {
  return isAddress(address);
}

