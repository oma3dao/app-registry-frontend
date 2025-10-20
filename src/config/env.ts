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
});

const parsed = Env.parse({
  NEXT_PUBLIC_ACTIVE_CHAIN: process.env.NEXT_PUBLIC_ACTIVE_CHAIN || 'localhost',
  NEXT_PUBLIC_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
  NEXT_PUBLIC_METADATA_ADDRESS: process.env.NEXT_PUBLIC_METADATA_ADDRESS,
  NEXT_PUBLIC_RESOLVER_ADDRESS: process.env.NEXT_PUBLIC_RESOLVER_ADDRESS,
  NEXT_PUBLIC_DEBUG_ADAPTER: process.env.NEXT_PUBLIC_DEBUG_ADAPTER,
});

// Get the active chain configuration from the preset
const activeChain = CHAIN_PRESETS[parsed.NEXT_PUBLIC_ACTIVE_CHAIN];

/**
 * Get the base URL for the application (for storing on-chain)
 * 
 * The URL is DETERMINISTICALLY derived from the active chain:
 * - Localhost chain (31337) → http://localhost:3000
 * - Testnet/Mainnet → https://registry.omatrust.org (ALWAYS, even in dev mode)
 * 
 * CRITICAL: The dataUrl is stored IMMUTABLY on-chain. This function ensures:
 * 1. Local chain apps use localhost (safe, won't leak to production)
 * 2. Testnet/mainnet apps ALWAYS use production URLs (even during local dev)
 * 3. No manual override allowed (prevents misconfiguration)
 * 
 * For custom domains: Modify the chain configuration in chains.ts
 */
function getAppBaseUrl(): string {
  console.log(`[ENV] NODE_ENV: "${process.env.NODE_ENV}", activeChain.id: ${activeChain.id}`);
  
  // Chain-aware: Only use localhost for actual localhost chain
  if (activeChain.id === 31337) {
    // Local Hardhat chain - use localhost for development
    console.log('[ENV] Localhost chain - using localhost for dataUrl');
    return 'http://localhost:3000';
  }

  // Testnet/Mainnet: ALWAYS use production URL (even in development)
  // This ensures dataUrls stored on-chain are accessible from anywhere
  // Local dev will rewrite these URLs when fetching (see getMetadataFetchUrl)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  // Canonical production domain for testnet/mainnet
  console.log('[ENV] Testnet/Mainnet - using production URL for dataUrl');
  return 'https://registry.omatrust.org';
}

/**
 * Get the URL to use when fetching metadata
 * 
 * Handles URL rewriting for different environments:
 * - Local development (NODE_ENV=development): Rewrites production URLs to localhost for testing
 * - Deployed environments (production/test): Rewrites localhost URLs to production (fixes accidental localhost URLs on-chain)
 */
function getMetadataFetchUrl(dataUrl: string): string {
  const isLocalDev = process.env.NODE_ENV === 'development';
  const isLocalhostChain = activeChain.id === 31337;
  
  // Local development (not localhost chain): Rewrite production URLs to localhost for testing
  if (isLocalDev && !isLocalhostChain) {
    if (dataUrl.includes('registry.omatrust.org') || dataUrl.includes(process.env.NEXT_PUBLIC_VERCEL_URL || '')) {
      const rewritten = dataUrl.replace(/https:\/\/[^/]+/, 'http://localhost:3000');
      console.log(`[ENV] Local dev - rewriting production URL to localhost: ${dataUrl} → ${rewritten}`);
      return rewritten;
    }
  }
  
  // Deployed environments (production/test): Rewrite localhost URLs to production
  // This fixes accidental localhost URLs that were stored on-chain during development
  if (!isLocalDev && dataUrl.includes('localhost')) {
    const productionUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'https://registry.omatrust.org';
    const rewritten = dataUrl.replace(/http:\/\/localhost:\d+/, productionUrl);
    console.warn(`[ENV] Deployed environment - rewriting localhost URL to production: ${dataUrl} → ${rewritten}`);
    return rewritten;
  }
  
  return dataUrl;
}

/**
 * Environment configuration
 * - Chain is selected via NEXT_PUBLIC_ACTIVE_CHAIN env var (localhost, omachain-testnet, omachain-mainnet)
 * - Contract addresses can be overridden via NEXT_PUBLIC_REGISTRY_ADDRESS, NEXT_PUBLIC_METADATA_ADDRESS, NEXT_PUBLIC_RESOLVER_ADDRESS
 * - Contract versions are managed via Git branches (not env vars)
 * - App base URL is DETERMINISTICALLY derived from active chain (no manual override to prevent misconfiguration)
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

  // Application base URL (for API routes and storing on-chain)
  appBaseUrl: getAppBaseUrl(),
  
  // Metadata fetch URL rewriter (for local development)
  getMetadataFetchUrl,

  // Flags
  debugAdapter: parsed.NEXT_PUBLIC_DEBUG_ADAPTER === 'true',
};
