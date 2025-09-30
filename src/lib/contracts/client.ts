/**
 * Thirdweb client and contract utilities
 */

import { getContract } from 'thirdweb';
import { defineChain } from 'thirdweb/chains';
import { client } from '@/app/client';
import { celoAlfajores } from '@/config/chains';

/**
 * Get the active chain configuration
 * For Phase 0, we're using the existing chain setup from config/chains
 */
export function getActiveChain() {
  return defineChain({
    id: celoAlfajores.id,
    rpc: celoAlfajores.rpc,
    name: celoAlfajores.name,
    nativeCurrency: celoAlfajores.nativeCurrency,
  });
}

/**
 * Helper to get a contract instance with proper chain and client setup
 * @param abi The contract ABI
 * @param address The contract address
 * @returns Contract instance ready for Thirdweb operations
 */
export function getRegistryContract(abi: any, address: string) {
  return getContract({
    client,
    chain: getActiveChain(),
    address,
    abi,
  });
}

// Re-export client for convenience
export { client };
