/**
 * Onchain Transfer Verification (Section 5.1.3.1.2.2)
 * 
 * Allows delegate access by sending a deterministic amount of native tokens
 * from the controlling wallet to the minting wallet.
 */

import { ethers } from 'ethers';

/**
 * Chain configuration for BASE and RANGE calculation
 */
interface ChainConfig {
  decimals: number;
  symbol: string;
  blockTime: number; // Average block time in seconds
  explorer: string;
}

/**
 * Known chain configurations
 */
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  1: { // Ethereum Mainnet
    decimals: 18,
    symbol: 'ETH',
    blockTime: 12,
    explorer: 'https://etherscan.io',
  },
  11155111: { // Sepolia
    decimals: 18,
    symbol: 'ETH',
    blockTime: 12,
    explorer: 'https://sepolia.etherscan.io',
  },
  137: { // Polygon
    decimals: 18,
    symbol: 'MATIC',
    blockTime: 2,
    explorer: 'https://polygonscan.com',
  },
  8453: { // Base
    decimals: 18,
    symbol: 'ETH',
    blockTime: 2,
    explorer: 'https://basescan.org',
  },
  10: { // Optimism
    decimals: 18,
    symbol: 'ETH',
    blockTime: 2,
    explorer: 'https://optimistic.etherscan.io',
  },
  42161: { // Arbitrum
    decimals: 18,
    symbol: 'ETH',
    blockTime: 0.25,
    explorer: 'https://arbiscan.io',
  },
  66238: { // OMAchain Testnet
    decimals: 18,
    symbol: 'OMA',
    blockTime: 3,
    explorer: 'https://explorer.testnet.chain.oma3.org',
  },
  // Add more chains as needed
};

/**
 * Get chain configuration, with fallback to defaults
 */
export function getChainConfig(chainId: number): ChainConfig {
  return CHAIN_CONFIGS[chainId] || {
    decimals: 18,
    symbol: 'ETH',
    blockTime: 12,
    explorer: `https://etherscan.io`, // Generic fallback
  };
}

/**
 * Calculate BASE and RANGE for a chain
 * 
 * For account-based chains (EVM):
 * - BASE = 10^(max(d-4, 0)) where d = decimals
 * - RANGE = floor(BASE/10)
 */
export function getChainConstants(chainId: number): { base: bigint; range: bigint } {
  const config = getChainConfig(chainId);
  const decimals = config.decimals;
  
  // BASE = 10^(max(d-4, 0))
  const exponent = Math.max(decimals - 4, 0);
  const base = BigInt(10) ** BigInt(exponent);
  
  // RANGE = floor(BASE/10)
  const range = base / BigInt(10);
  
  return { base, range };
}

/**
 * Calculate the exact transfer amount for ownership verification
 * 
 * Formula: BASE(chainId) + (uint256(keccak256(abi.encodePacked("OMATrust:Amount:v1:", didHash, bytes20(uint160(loginWallet))))) % RANGE(chainId))
 * 
 * @param did - The DID being verified (e.g., "did:pkh:eip155:1:0x123...")
 * @param mintingWallet - The wallet that will mint the app token
 * @param chainId - The chain ID where the contract lives
 * @returns The exact amount to transfer in wei (smallest denomination)
 */
export function calculateTransferAmount(
  did: string,
  mintingWallet: string,
  chainId: number
): bigint {
  // 1. Canonicalize DID (lowercase, trim)
  const canonicalDid = did.toLowerCase().trim();
  
  // 2. Compute didHash = keccak256(canonicalDid)
  const didHash = ethers.id(canonicalDid);
  
  // 3. Normalize minting wallet (lowercase, no checksum)
  const normalizedWallet = mintingWallet.toLowerCase();
  
  // 4. Get chain constants
  const { base, range } = getChainConstants(chainId);
  
  // 5. Compute deterministic offset
  // keccak256(abi.encodePacked("OMATrust:Amount:v1:", didHash, bytes20(uint160(loginWallet))))
  const packed = ethers.solidityPacked(
    ['string', 'bytes32', 'bytes20'],
    ['OMATrust:Amount:v1:', didHash, normalizedWallet]
  );
  const hash = ethers.keccak256(packed);
  
  // 6. offset = uint256(hash) % RANGE
  const offset = BigInt(hash) % range;
  
  // 7. Final amount = BASE + offset
  return base + offset;
}

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
 * Get recipient address for the transfer
 * For EVM chains: minting wallet
 * For non-EVM chains: OMA3 sink wallet (not yet implemented)
 */
export function getRecipientAddress(
  chainId: number,
  mintingWallet: string,
  isEVM: boolean = true
): string {
  if (isEVM) {
    return mintingWallet;
  }
  
  // For non-EVM chains, use OMA3 sink wallet
  // TODO: Deploy sink wallets and add mapping
  throw new Error(`Sink wallet not yet deployed for chain ${chainId}`);
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

/**
 * Parse CAIP-10 to extract chain ID and contract address
 */
export function parseCaip10(caip10: string): { chainId: number; contractAddress: string } | null {
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
  
  return {
    chainId,
    contractAddress: address,
  };
}

/**
 * Extract chain ID from did:pkh DID
 */
export function getChainIdFromDid(did: string): number | null {
  if (!did.startsWith('did:pkh:')) {
    return null;
  }
  
  const caip10 = did.replace('did:pkh:', '');
  const parsed = parseCaip10(caip10);
  
  return parsed?.chainId || null;
}
