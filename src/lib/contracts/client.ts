/**
 * Thirdweb client and contract utilities
 * 
 * PHASE 0 CONFIGURATION (Current)
 * - Using OMA3AppRegistryLegacy contract
 * - Using OMA3AppMetadataV0 contract
 * 
 * FOR PHASE 1 MIGRATION:
 * Just change the import lines below to:
 *   import { appRegistryAbi } from './abi/appRegistry.abi';
 *   import { appMetadataAbi } from './abi/appMetadata.abi';
 * That's it! No other changes needed.
 */

import { getContract } from 'thirdweb';
import { defineChain } from 'thirdweb/chains';
import { client } from '@/app/client';
import { ACTIVE_CHAIN } from '@/config/app-config';
import { env } from '@/config/env';

// Phase 0 ABIs (current) - aliased to generic names
import { appRegistryLegacyAbi as appRegistryAbi } from './abi/appRegistry.legacy.abi';
import { appMetadataV0Abi as appMetadataAbi } from './abi/appMetadata.v0.abi';

/**
 * Get the active chain configuration
 * Uses the chain defined in app-config.ts (ACTIVE_CHAIN)
 */
export function getActiveChain() {
  return defineChain({
    id: ACTIVE_CHAIN.id,
    rpc: ACTIVE_CHAIN.rpc,
    name: ACTIVE_CHAIN.name,
    nativeCurrency: ACTIVE_CHAIN.nativeCurrency,
    blockExplorers: ACTIVE_CHAIN.blockExplorers,
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
    abi: appRegistryAbi,
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
    abi: appMetadataAbi,
  });
}

// Re-export client for convenience
export { client };
