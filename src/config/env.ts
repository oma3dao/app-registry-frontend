/**
 * Environment configuration with Zod validation
 * Uses ACTIVE_CHAIN from app-config as the source of truth
 */

import { z } from 'zod';
import { ACTIVE_CHAIN } from './app-config';

const Env = z.object({
  NEXT_PUBLIC_CHAIN_ID: z.string().regex(/^\d+$/).optional(),
  NEXT_PUBLIC_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_USE_LEGACY: z.enum(['true', 'false']).default('true'),
  NEXT_PUBLIC_REGISTRY_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  NEXT_PUBLIC_METADATA_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  NEXT_PUBLIC_DEBUG_ADAPTER: z.enum(['true', 'false']).optional(),
});

const parsed = Env.parse({
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  NEXT_PUBLIC_USE_LEGACY: process.env.NEXT_PUBLIC_USE_LEGACY ?? 'true',
  NEXT_PUBLIC_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
  NEXT_PUBLIC_METADATA_ADDRESS: process.env.NEXT_PUBLIC_METADATA_ADDRESS,
  NEXT_PUBLIC_DEBUG_ADAPTER: process.env.NEXT_PUBLIC_DEBUG_ADAPTER,
});

// Determine which contract addresses to use based on USE_LEGACY flag
const useLegacy = parsed.NEXT_PUBLIC_USE_LEGACY === 'true';

/**
 * Environment configuration
 * All contract addresses are selected based on the useLegacy flag
 */
export const env = {
  // Chain config (can be overridden by env vars)
  chainId: parsed.NEXT_PUBLIC_CHAIN_ID ? Number(parsed.NEXT_PUBLIC_CHAIN_ID) : ACTIVE_CHAIN.id,
  rpcUrl: parsed.NEXT_PUBLIC_RPC_URL || ACTIVE_CHAIN.rpc,
  
  // Contract addresses (automatically select legacy or new based on flag)
  registryAddress: parsed.NEXT_PUBLIC_REGISTRY_ADDRESS || 
    (useLegacy 
      ? ACTIVE_CHAIN.contracts.OMA3AppRegistryLegacy 
      : ACTIVE_CHAIN.contracts.OMA3AppRegistry),
  
  metadataAddress: parsed.NEXT_PUBLIC_METADATA_ADDRESS || 
    ACTIVE_CHAIN.contracts.OMA3AppMetadataV0,  // Only V0 for now, will add new when available
  
  // Flags
  useLegacy,
  debugAdapter: parsed.NEXT_PUBLIC_DEBUG_ADAPTER === 'true',
};
