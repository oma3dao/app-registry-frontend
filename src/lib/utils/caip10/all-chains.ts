/**
 * Comprehensive mainnet chain list from thirdweb v5
 * Mainnets only - testnets must be pasted as full CAIP-10
 */

import {
  // Major Mainnets (L1)
  ethereum,
  bsc,
  polygon,
  avalanche,
  fantom,
  arbitrum,
  optimism,
  celo,
  gnosis,
  moonbeam,
  cronos,
  // L2s & Scaling Solutions
  base,
  zora,
  zkSync,
  polygonZkEvm,
  linea,
  scroll,
  blast,
  mode,
  // Import more mainnets as needed from thirdweb/chains
} from 'thirdweb/chains';

import type { Chain } from 'thirdweb/chains';

export interface ChainInfo {
  chainId: number;
  name: string;
  testnet: boolean;
  chain?: Chain;
}

/**
 * All mainnet chains from thirdweb
 * Add more mainnets as needed - testnets are paste-only
 */
const ALL_THIRDWEB_CHAINS: Chain[] = [
  ethereum,
  bsc,
  polygon,
  avalanche,
  fantom,
  arbitrum,
  optimism,
  celo,
  gnosis,
  moonbeam,
  cronos,
  base,
  zora,
  zkSync,
  polygonZkEvm,
  linea,
  scroll,
  blast,
  mode,
];

/**
 * Convert thirdweb chains to our format and sort alphabetically
 * All chains in this list are mainnets
 */
export const ALL_CHAINS: ChainInfo[] = ALL_THIRDWEB_CHAINS
  .map((chain): ChainInfo => ({
    chainId: chain.id,
    name: chain.name || `Chain ${chain.id}`,
    testnet: false, // All chains in this list are mainnets
    chain,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Search chains by name or chainId
 * All results are mainnets - testnets must be pasted as full CAIP-10
 */
export function searchChains(query: string): ChainInfo[] {
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) {
    return ALL_CHAINS;
  }
  
  return ALL_CHAINS.filter(chain => 
    chain.name.toLowerCase().includes(lowerQuery) ||
    chain.chainId.toString().includes(lowerQuery)
  );
}

/**
 * Get chain by ID
 */
export function getChainById(chainId: number): ChainInfo | undefined {
  return ALL_CHAINS.find(c => c.chainId === chainId);
}

