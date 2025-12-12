/**
 * Onchain Transfer Verification (tx-encoded-value Proof Type)
 * 
 * Implements OMATrust Proof Specification §5.3.6
 * 
 * Allows delegate access by sending a deterministic amount of native tokens
 * from the subject wallet to the counterparty wallet.
 */

import { ethers } from 'ethers';
import canonicalize from 'canonicalize';

// ============================================================================
// Proof Purpose Constants
// ============================================================================

/**
 * Proof purposes as defined in OMATrust Proof Specification §5.1.3
 */
export const PROOF_PURPOSE = {
  /** Used for identity binding, controller verification, registry operations */
  SHARED_CONTROL: 'shared-control',
  /** Lower-friction proof for commercial interactions, usage confirmations */
  COMMERCIAL_TX: 'commercial-tx',
} as const;

export type ProofPurpose = typeof PROOF_PURPOSE[keyof typeof PROOF_PURPOSE];

// ============================================================================
// Chain Configuration
// ============================================================================

/**
 * Chain configuration for BASE, RANGE, and metadata
 */
interface ChainConfig {
  decimals: number;
  symbol: string;
  blockTime: number; // Average block time in seconds
  explorer: string;
  /** BASE values per proof purpose (in smallest unit, e.g., wei) */
  base: Record<ProofPurpose, bigint>;
}

/**
 * Known chain configurations per OMATrust Proof Specification Appendix A
 */
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  1: { // Ethereum Mainnet
    decimals: 18,
    symbol: 'ETH',
    blockTime: 12,
    explorer: 'https://etherscan.io',
    base: {
      [PROOF_PURPOSE.SHARED_CONTROL]: BigInt('100000000000000'),    // 1e14 wei (0.0001 ETH)
      [PROOF_PURPOSE.COMMERCIAL_TX]: BigInt('1000000000000'),       // 1e12 wei (0.000001 ETH)
    },
  },
  11155111: { // Sepolia
    decimals: 18,
    symbol: 'ETH',
    blockTime: 12,
    explorer: 'https://sepolia.etherscan.io',
    base: {
      [PROOF_PURPOSE.SHARED_CONTROL]: BigInt('100000000000000'),    // 1e14 wei
      [PROOF_PURPOSE.COMMERCIAL_TX]: BigInt('1000000000000'),       // 1e12 wei
    },
  },
  137: { // Polygon
    decimals: 18,
    symbol: 'POL',
    blockTime: 2,
    explorer: 'https://polygonscan.com',
    base: {
      [PROOF_PURPOSE.SHARED_CONTROL]: BigInt('100000000000000'),    // 1e14 wei (0.0001 POL)
      [PROOF_PURPOSE.COMMERCIAL_TX]: BigInt('1000000000000'),       // 1e12 wei (0.000001 POL)
    },
  },
  8453: { // Base
    decimals: 18,
    symbol: 'ETH',
    blockTime: 2,
    explorer: 'https://basescan.org',
    base: {
      [PROOF_PURPOSE.SHARED_CONTROL]: BigInt('100000000000000'),    // 1e14 wei
      [PROOF_PURPOSE.COMMERCIAL_TX]: BigInt('1000000000000'),       // 1e12 wei
    },
  },
  10: { // Optimism
    decimals: 18,
    symbol: 'ETH',
    blockTime: 2,
    explorer: 'https://optimistic.etherscan.io',
    base: {
      [PROOF_PURPOSE.SHARED_CONTROL]: BigInt('100000000000000'),    // 1e14 wei
      [PROOF_PURPOSE.COMMERCIAL_TX]: BigInt('1000000000000'),       // 1e12 wei
    },
  },
  42161: { // Arbitrum
    decimals: 18,
    symbol: 'ETH',
    blockTime: 0.25,
    explorer: 'https://arbiscan.io',
    base: {
      [PROOF_PURPOSE.SHARED_CONTROL]: BigInt('100000000000000'),    // 1e14 wei
      [PROOF_PURPOSE.COMMERCIAL_TX]: BigInt('1000000000000'),       // 1e12 wei
    },
  },
  6623: { // OMAChain Mainnet
    decimals: 18,
    symbol: 'OMA',
    blockTime: 3,
    explorer: 'https://explorer.chain.oma3.org',
    base: {
      [PROOF_PURPOSE.SHARED_CONTROL]: BigInt('10000000000000000'),  // 1e16 wei (0.01 OMA)
      [PROOF_PURPOSE.COMMERCIAL_TX]: BigInt('100000000000000'),     // 1e14 wei (0.0001 OMA)
    },
  },
  66238: { // OMAChain Testnet
    decimals: 18,
    symbol: 'OMA',
    blockTime: 3,
    explorer: 'https://explorer.testnet.chain.oma3.org',
    base: {
      [PROOF_PURPOSE.SHARED_CONTROL]: BigInt('10000000000000000'),  // 1e16 wei (0.01 OMA)
      [PROOF_PURPOSE.COMMERCIAL_TX]: BigInt('100000000000000'),     // 1e14 wei (0.0001 OMA)
    },
  },
};

// ============================================================================
// Seed Construction Constants
// ============================================================================

/**
 * Domain separation string for Amount derivation (§5.3.6.3)
 */
const AMOUNT_DOMAIN = 'OMATrust:Amount:v1';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get chain configuration
 * @throws Error if chain is not supported for tx-encoded-value
 */
export function getChainConfig(chainId: number): ChainConfig {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) {
    throw new Error(`tx-encoded-value not supported for chain ${chainId}. Supported chains: ${Object.keys(CHAIN_CONFIGS).join(', ')}`);
  }
  return config;
}

/**
 * Get list of supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(CHAIN_CONFIGS).map(Number);
}

/**
 * Check if a chain supports tx-encoded-value proofs
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in CHAIN_CONFIGS;
}

/**
 * Get BASE and RANGE for a chain and proof purpose
 * 
 * Per spec §5.3.6.2:
 * - BASE is a per-chain, per-purpose constant
 * - RANGE = floor(BASE / 10) unless overridden
 */
export function getChainConstants(
  chainId: number,
  proofPurpose: ProofPurpose
): { base: bigint; range: bigint } {
  const config = getChainConfig(chainId);
  const base = config.base[proofPurpose];
  
  // RANGE = floor(BASE / 10) per spec default
  const range = base / BigInt(10);
  
  return { base, range };
}

/**
 * Canonicalize a DID string per OMATrust Identity Specification
 * - Lowercase
 * - Trim whitespace
 */
export function canonicalizeDid(did: string): string {
  return did.toLowerCase().trim();
}

/**
 * Compute didHash = keccak256(canonicalizeDID(did))
 */
export function computeDidHash(did: string): string {
  const canonical = canonicalizeDid(did);
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
}

/**
 * Build a did:pkh DID from chain ID and address
 */
export function buildPkhDid(chainId: number, address: string): string {
  return `did:pkh:eip155:${chainId}:${address.toLowerCase()}`;
}

// ============================================================================
// Core Amount Calculation
// ============================================================================

/**
 * Construct the canonical Seed per §5.3.6.3
 * 
 * Seed is a JCS-canonicalized JSON object:
 * {
 *   "domain": "OMATrust:Amount:v1",
 *   "subjectDidHash": "<didHash(subject)>",
 *   "counterpartyIdHash": "<didHash(counterpartyId)>",
 *   "proofPurpose": "<proofPurpose>"
 * }
 */
export function constructSeed(
  subjectDidHash: string,
  counterpartyDidHash: string,
  proofPurpose: ProofPurpose
): Uint8Array {
  const seedObject = {
    domain: AMOUNT_DOMAIN,
    subjectDidHash,
    counterpartyIdHash: counterpartyDidHash,
    proofPurpose,
  };
  
  // JCS canonicalize and encode to UTF-8 bytes
  const canonicalJson = canonicalize(seedObject);
  if (!canonicalJson) {
    throw new Error('Failed to canonicalize seed object');
  }
  
  return ethers.toUtf8Bytes(canonicalJson);
}

/**
 * Hash function H(x) per spec §5.3.6.2
 * 
 * Currently only supports EVM chains (keccak256).
 * 
 * TODO: When supporting non-EVM chains (e.g., Solana), implement isEvmChain(caip2Id: string)
 * to determine hash algorithm. Non-EVM chains use SHA-256 per spec.
 * This will require key binding attestations since the frontend only supports EVM wallets.
 */
export function hashSeed(seedBytes: Uint8Array, _chainId: number): string {
  // EVM chains use keccak256
  return ethers.keccak256(seedBytes);
}

/**
 * Calculate the exact transfer amount for tx-encoded-value proof
 * 
 * Formula (§5.3.6.2):
 * Amount = BASE(proofPurpose, chainId) + (U256(H(Seed)) mod RANGE(proofPurpose, chainId))
 * 
 * @param subjectDid - The DID of the subject (sender of the transfer)
 * @param counterpartyDid - The DID of the counterparty (recipient of the transfer)
 * @param chainId - The chain ID where the transfer occurs
 * @param proofPurpose - The proof purpose (shared-control or commercial-tx)
 * @returns The exact amount to transfer in wei (smallest denomination)
 */
export function calculateTransferAmount(
  subjectDid: string,
  counterpartyDid: string,
  chainId: number,
  proofPurpose: ProofPurpose
): bigint {
  // 1. Compute didHash for subject and counterparty
  const subjectDidHash = computeDidHash(subjectDid);
  const counterpartyDidHash = computeDidHash(counterpartyDid);
  
  // 2. Get chain constants for this purpose
  const { base, range } = getChainConstants(chainId, proofPurpose);
  
  // 3. Construct canonical Seed (JCS)
  const seedBytes = constructSeed(subjectDidHash, counterpartyDidHash, proofPurpose);
  
  // 4. H(Seed) - hash function depends on chain (keccak256 for EVM, SHA-256 for others)
  const hash = hashSeed(seedBytes, chainId);
  
  // 5. U256(hash) mod RANGE
  const offset = BigInt(hash) % range;
  
  // 6. Amount = BASE + offset
  return base + offset;
}

/**
 * Convenience function using addresses instead of DIDs
 * Builds did:pkh DIDs from the addresses and chain ID
 */
export function calculateTransferAmountFromAddresses(
  subjectAddress: string,
  counterpartyAddress: string,
  chainId: number,
  proofPurpose: ProofPurpose
): bigint {
  const subjectDid = buildPkhDid(chainId, subjectAddress);
  const counterpartyDid = buildPkhDid(chainId, counterpartyAddress);
  
  return calculateTransferAmount(subjectDid, counterpartyDid, chainId, proofPurpose);
}

// ============================================================================
// Display and Formatting
// ============================================================================

/**
 * Format amount for display with proper decimals
 */
export function formatTransferAmount(
  amount: bigint,
  chainId: number
): { formatted: string; symbol: string; wei: string } {
  const config = getChainConfig(chainId);
  const formatted = ethers.formatUnits(amount, config.decimals);
  
  return {
    formatted,
    symbol: config.symbol,
    wei: amount.toString(),
  };
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const config = getChainConfig(chainId);
  return `${config.explorer}/tx/${txHash}`;
}

/**
 * Get explorer URL for an address
 */
export function getExplorerAddressUrl(chainId: number, address: string): string {
  const config = getChainConfig(chainId);
  return `${config.explorer}/address/${address}`;
}

/**
 * Estimate how many blocks to search based on validity window
 */
export function estimateBlocksToSearch(chainId: number, validityWindowSeconds: number): number {
  const config = getChainConfig(chainId);
  return Math.ceil(validityWindowSeconds / config.blockTime);
}

// ============================================================================
// DID and CAIP Parsing
// ============================================================================

/**
 * Parse CAIP-10 to extract chain ID and address
 */
export function parseCaip10(caip10: string): { chainId: number; address: string } | null {
  // Format: namespace:reference:address
  // Example: eip155:1:0x1234567890123456789012345678901234567890
  const parts = caip10.split(':');
  
  if (parts.length !== 3) {
    return null;
  }
  
  const [namespace, reference, address] = parts;
  
  if (namespace !== 'eip155') {
    return null; // Only EVM supported for now
  }
  
  const chainId = parseInt(reference, 10);
  if (isNaN(chainId)) {
    return null;
  }
  
  return { chainId, address };
}

/**
 * Extract chain ID from did:pkh DID
 * Returns null for non-EVM DIDs (only eip155 namespace supported)
 */
export function getChainIdFromDid(did: string): number | null {
  if (!did.startsWith('did:pkh:')) {
    return null;
  }

  const caip10 = did.replace('did:pkh:', '');
  const parsed = parseCaip10(caip10);

  return parsed?.chainId || null;
}

/**
 * Check if a did:pkh DID is an EVM chain (eip155 namespace)
 * Non-EVM DIDs (solana, cosmos, etc.) are not yet supported for tx-encoded-value proofs
 */
export function isEvmDid(did: string): boolean {
  if (!did.startsWith('did:pkh:')) {
    return false;
  }

  const caip10 = did.replace('did:pkh:', '');
  const parts = caip10.split(':');

  return parts.length >= 1 && parts[0] === 'eip155';
}

/**
 * Get the namespace from a did:pkh DID (e.g., "eip155", "solana", "cosmos")
 */
export function getDidNamespace(did: string): string | null {
  if (!did.startsWith('did:pkh:')) {
    return null;
  }

  const caip10 = did.replace('did:pkh:', '');
  const parts = caip10.split(':');

  return parts.length >= 1 ? parts[0] : null;
}

/**
 * Extract address from did:pkh DID
 */
export function getAddressFromDid(did: string): string | null {
  if (!did.startsWith('did:pkh:')) {
    return null;
  }
  
  const caip10 = did.replace('did:pkh:', '');
  const parsed = parseCaip10(caip10);
  
  return parsed?.address || null;
}

// ============================================================================
// Proof Object Construction
// ============================================================================

/**
 * tx-encoded-value proof object structure per §5.3.6.1
 */
export interface TxEncodedValueProofObject {
  chainId: string;
  txHash: string;
}

/**
 * Full proof wrapper structure per §5.3.1
 */
export interface TxEncodedValueProof {
  proofType: 'tx-encoded-value';
  proofPurpose: ProofPurpose;
  proofObject: TxEncodedValueProofObject;
  version?: number;
  issuedAt?: number;
  expiresAt?: number;
}

/**
 * Create a tx-encoded-value proof wrapper
 */
export function createTxEncodedValueProof(
  chainId: number,
  txHash: string,
  proofPurpose: ProofPurpose,
  options?: {
    issuedAt?: number;
    expiresAt?: number;
  }
): TxEncodedValueProof {
  return {
    proofType: 'tx-encoded-value',
    proofPurpose,
    proofObject: {
      chainId: `eip155:${chainId}`,
      txHash,
    },
    version: 1,
    ...(options?.issuedAt && { issuedAt: options.issuedAt }),
    ...(options?.expiresAt && { expiresAt: options.expiresAt }),
  };
}
