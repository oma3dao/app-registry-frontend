/**
 * Thirdweb client and contract utilities
 * 
 * Contract versions are managed via Git branches:
 * - main branch: production contracts
 * - preview branch: next-gen contracts (when available)
 */

import { getContract } from 'thirdweb';
import { defineChain } from 'thirdweb/chains';
import { client } from '@/app/client';
import { env } from '@/config/env';
import { appRegistryAbi } from './abi/appRegistry.abi';
import { appMetadataAbi } from './abi/appMetadata.abi';
import { resolverAbi } from './abi/resolver.abi';

/**
 * Get the active chain configuration
 * Uses the chain selected via NEXT_PUBLIC_ACTIVE_CHAIN env var
 */
export function getActiveChain() {
  const activeChain = env.activeChain;
  return defineChain({
    id: activeChain.id,
    rpc: activeChain.rpc,
    name: activeChain.name,
    nativeCurrency: activeChain.nativeCurrency,
    blockExplorers: activeChain.blockExplorers,
  });
}

/**
 * Helper to get an App Registry contract instance with proper chain and client setup
 * Uses the address from env config (automatically selects based on env.useLegacy flag)
 * @returns Contract instance ready for Thirdweb operations
 */
export function getAppRegistryContract() {
  return getContract({
    client,
    chain: getActiveChain(),
    address: env.registryAddress,
    abi: appRegistryAbi as any, // Thirdweb's strict ABI typing requires this
  });
}

/**
 * Helper to get an App Metadata contract instance with proper chain and client setup
 * Uses the address from env config
 * @returns Contract instance ready for Thirdweb operations
 */
export function getAppMetadataContract() {
  return getContract({
    client,
    chain: getActiveChain(),
    address: env.metadataAddress,
    abi: appMetadataAbi as any, // Thirdweb's strict ABI typing requires this
  });
}

/**
 * Helper to get a Resolver contract instance with proper chain and client setup
 * Uses the address from env config
 * Used for DID ownership validation
 * @returns Contract instance ready for Thirdweb operations
 */
export function getResolverContract() {
  return getContract({
    client,
    chain: getActiveChain(),
    address: env.resolverAddress,
    abi: resolverAbi as any, // Thirdweb's strict ABI typing requires this
  });
}

// Re-export client for convenience
export { client };
