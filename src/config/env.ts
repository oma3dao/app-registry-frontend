/**
 * Environment configuration with Zod validation
 * Chain selection via NEXT_PUBLIC_ACTIVE_CHAIN env var
 */

import { z } from 'zod';
import { CHAIN_PRESETS, type ChainPreset } from './chains';

const Env = z.object({
  NEXT_PUBLIC_ACTIVE_CHAIN: z.enum(['localhost', 'omachain-testnet', 'omachain-mainnet']).default('localhost'),
  NEXT_PUBLIC_REGISTRY_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  NEXT_PUBLIC_METADATA_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  NEXT_PUBLIC_RESOLVER_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  NEXT_PUBLIC_DEBUG_ADAPTER: z.enum(['true', 'false']).optional(),
  NEXT_PUBLIC_APP_BASE_URL: z.string().url().optional(),
});

const parsed = Env.parse({
  NEXT_PUBLIC_ACTIVE_CHAIN: process.env.NEXT_PUBLIC_ACTIVE_CHAIN || 'localhost',
  NEXT_PUBLIC_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
  NEXT_PUBLIC_METADATA_ADDRESS: process.env.NEXT_PUBLIC_METADATA_ADDRESS,
  NEXT_PUBLIC_RESOLVER_ADDRESS: process.env.NEXT_PUBLIC_RESOLVER_ADDRESS,
  NEXT_PUBLIC_DEBUG_ADAPTER: process.env.NEXT_PUBLIC_DEBUG_ADAPTER,
  NEXT_PUBLIC_APP_BASE_URL: process.env.NEXT_PUBLIC_APP_BASE_URL,
});

// Get the active chain configuration from the preset
const activeChain = CHAIN_PRESETS[parsed.NEXT_PUBLIC_ACTIVE_CHAIN];

/**
 * Get the base URL for the application
 * Priority:
 * 1. NEXT_PUBLIC_APP_BASE_URL (explicit override)
 * 2. VERCEL_URL (automatic in Vercel deployments)
 * 3. http://localhost:3000 (development default)
 */
function getAppBaseUrl(): string {
  // Explicit override
  if (parsed.NEXT_PUBLIC_APP_BASE_URL) {
    return parsed.NEXT_PUBLIC_APP_BASE_URL;
  }
  
  // Vercel automatic URL (in deployments)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  
  // Development default
  return 'http://localhost:3000';
}

/**
 * Environment configuration
 * - Chain is selected via NEXT_PUBLIC_ACTIVE_CHAIN env var (localhost, omachain-testnet, omachain-mainnet)
 * - Contract addresses can be overridden via NEXT_PUBLIC_REGISTRY_ADDRESS, NEXT_PUBLIC_METADATA_ADDRESS, NEXT_PUBLIC_RESOLVER_ADDRESS
 * - Contract versions are managed via Git branches (not env vars)
 * - App base URL is derived from NEXT_PUBLIC_APP_BASE_URL, VERCEL_URL, or defaults to localhost:3000
 */
export const env = {
  // Active chain (from preset)
  activeChain,
  chainId: activeChain.id,
  rpcUrl: activeChain.rpc,
  
  // Contract addresses (from chain config or overridden via env vars)
  registryAddress: parsed.NEXT_PUBLIC_REGISTRY_ADDRESS || activeChain.contracts.registry,
  metadataAddress: parsed.NEXT_PUBLIC_METADATA_ADDRESS || activeChain.contracts.metadata,
  resolverAddress: parsed.NEXT_PUBLIC_RESOLVER_ADDRESS || activeChain.contracts.resolver || "0x0000000000000000000000000000000000000000",
  
  // Application base URL (for API routes)
  appBaseUrl: getAppBaseUrl(),
  
  // Flags
  debugAdapter: parsed.NEXT_PUBLIC_DEBUG_ADAPTER === 'true',
};
