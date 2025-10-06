/**
 * Solana CAIP-10 validation
 * Reference format: "mainnet", "devnet", "testnet"
 * Address format: base58-encoded 32-byte public key
 */

export interface SolanaValidationResult {
  valid: boolean;
  error?: string;
  normalizedAddress?: string;
}

// Base58 alphabet (Bitcoin/Solana variant)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Decode base58 string to bytes
 */
function decodeBase58(str: string): Uint8Array | null {
  if (!str || str.length === 0) return null;

  const bytes: number[] = [0];
  
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const value = BASE58_ALPHABET.indexOf(c);
    
    if (value === -1) return null; // Invalid character
    
    for (let j = 0; j < bytes.length; j++) {
      bytes[j] *= 58;
    }
    
    bytes[0] += value;
    
    let carry = 0;
    for (let j = 0; j < bytes.length; j++) {
      bytes[j] += carry;
      carry = bytes[j] >> 8;
      bytes[j] &= 0xff;
    }
    
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  
  // Handle leading zeros
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    bytes.push(0);
  }
  
  return new Uint8Array(bytes.reverse());
}

/**
 * Validate Solana CAIP-10 components
 */
export function validateSolana(reference: string, address: string): SolanaValidationResult {
  // Validate reference
  const validRefs = ['mainnet', 'devnet', 'testnet'];
  if (!validRefs.includes(reference.toLowerCase())) {
    return {
      valid: false,
      error: `Solana reference must be one of: ${validRefs.join(', ')}`,
    };
  }

  // Validate address is base58
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
    return {
      valid: false,
      error: 'Solana address must be base58-encoded (no 0, O, I, or l)',
    };
  }

  // Decode and check length
  const decoded = decodeBase58(address);
  if (!decoded) {
    return {
      valid: false,
      error: 'Invalid base58 encoding',
    };
  }

  if (decoded.length !== 32) {
    return {
      valid: false,
      error: 'Solana address must decode to 32 bytes',
    };
  }

  return {
    valid: true,
    normalizedAddress: address, // Solana addresses are already normalized
  };
}

/**
 * Check if a string is a valid base58 character set
 */
export function isBase58(str: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(str);
}

