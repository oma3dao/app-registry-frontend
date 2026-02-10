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
  NEXT_PUBLIC_USE_ERC8004_REGISTER: z.enum(['true', 'false']).default('true'),
  NEXT_PUBLIC_APP_BASE_URL: z.string().url().optional(),
});

const parsed = Env.parse({
  NEXT_PUBLIC_ACTIVE_CHAIN: process.env.NEXT_PUBLIC_ACTIVE_CHAIN || 'localhost',
  NEXT_PUBLIC_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
  NEXT_PUBLIC_METADATA_ADDRESS: process.env.NEXT_PUBLIC_METADATA_ADDRESS,
  NEXT_PUBLIC_RESOLVER_ADDRESS: process.env.NEXT_PUBLIC_RESOLVER_ADDRESS,
  NEXT_PUBLIC_DEBUG_ADAPTER: process.env.NEXT_PUBLIC_DEBUG_ADAPTER,
  NEXT_PUBLIC_USE_ERC8004_REGISTER: process.env.NEXT_PUBLIC_USE_ERC8004_REGISTER || 'true',
  NEXT_PUBLIC_APP_BASE_URL: process.env.NEXT_PUBLIC_APP_BASE_URL,
});

// Get the active chain configuration from the preset
const activeChain = CHAIN_PRESETS[parsed.NEXT_PUBLIC_ACTIVE_CHAIN];

/**
 * Get the canonical base URL for on-chain storage (dataUrl, iwpsPortalUri)
 * 
 * CRITICAL: These URLs are stored IMMUTABLY on-chain. This function ensures:
 * 1. Local chain apps use localhost (safe, won't leak to production)
 * 2. Testnet/mainnet apps use the configured APP_BASE_URL or production fallback
 * 3. NEVER uses VERCEL_URL (preview URLs are ephemeral and would break on-chain data)
 * 
 * Priority:
 * 1. Localhost chain → http://localhost:3000
 * 2. NEXT_PUBLIC_APP_BASE_URL (explicit config)
 * 3. Fallback → https://registry.omatrust.org
 */
function getAppBaseUrl(): string {
  console.log(`[ENV] NODE_ENV: "${process.env.NODE_ENV}", activeChain.id: ${activeChain.id}`);
  
  // Local Hardhat chain - use localhost for development
  if (activeChain.id === 31337) {
    console.log('[ENV] Localhost chain - using localhost for appBaseUrl');
    return 'http://localhost:3000';
  }

  // Use explicit config if provided
  if (parsed.NEXT_PUBLIC_APP_BASE_URL) {
    console.log(`[ENV] Using configured APP_BASE_URL: ${parsed.NEXT_PUBLIC_APP_BASE_URL}`);
    return parsed.NEXT_PUBLIC_APP_BASE_URL;
  }

  // Fallback to canonical production domain
  console.log('[ENV] No APP_BASE_URL configured - using production fallback');
  return 'https://registry.omatrust.org';
}

/**
 * Get the current deployment URL for runtime operations (API calls, redirects, etc.)
 * 
 * This URL represents where the app is CURRENTLY running, which may differ from
 * the canonical appBaseUrl. Safe to use for:
 * - API route calls within the app
 * - OAuth redirects
 * - Preview deployment testing
 * 
 * NOT safe for on-chain storage (use appBaseUrl instead).
 * 
 * Priority:
 * 1. NEXT_PUBLIC_VERCEL_URL (for Vercel preview deployments)
 * 2. appBaseUrl (canonical URL)
 */
function getCurrentDeploymentUrl(): string {
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return getAppBaseUrl();
}

/**
 * Get the URL to use when fetching metadata
 * 
 * Handles URL rewriting for different environments:
 * - Local development (NODE_ENV=development): Rewrites production URLs to localhost for testing
 * - Deployed environments (production/test): Rewrites localhost URLs to current deployment
 * - Preview mode (DEBUG_ADAPTER=true): Rewrites registry.omatrust.org to current deployment
 *   to avoid CORS issues (production domain 302-redirects to preview)
 * 
 * Preview mode detection: NEXT_PUBLIC_DEBUG_ADAPTER=true indicates preview phase
 * When we move to real testnet, DEBUG_ADAPTER will be false and app serves at canonical URL
 */
function getMetadataFetchUrl(dataUrl: string): string {
  const isLocalDev = process.env.NODE_ENV === 'development';
  const isLocalhostChain = activeChain.id === 31337;
  const isPreviewMode = parsed.NEXT_PUBLIC_DEBUG_ADAPTER === 'true';
  const currentUrl = getCurrentDeploymentUrl();
  
  console.log(`[ENV] getMetadataFetchUrl called:`, {
    dataUrl,
    isLocalDev,
    isLocalhostChain,
    isPreviewMode,
    currentUrl,
    debugAdapter: parsed.NEXT_PUBLIC_DEBUG_ADAPTER
  });
  
  // Local development (not localhost chain): Rewrite production URLs to localhost for testing
  if (isLocalDev && !isLocalhostChain) {
    const appBase = getAppBaseUrl();
    if (dataUrl.startsWith(appBase)) {
      const rewritten = dataUrl.replace(appBase, 'http://localhost:3000');
      console.log(`[ENV] Local dev - rewriting production URL to localhost: ${dataUrl} → ${rewritten}`);
      return rewritten;
    }
  }
  
  // Deployed environments (production/test): Rewrite localhost URLs to current deployment
  // This fixes accidental localhost URLs that were stored on-chain during development
  if (!isLocalDev && dataUrl.includes('localhost')) {
    const rewritten = dataUrl.replace(/http:\/\/localhost:\d+/, currentUrl);
    console.warn(`[ENV] Deployed environment - rewriting localhost URL: ${dataUrl} → ${rewritten}`);
    return rewritten;
  }
  
  // Preview mode: Rewrite production domains to current deployment URL
  // This avoids CORS issues when registry.omatrust.org 302-redirects to preview.registry.omatrust.org
  // Only active when DEBUG_ADAPTER=true (preview phase)
  if (!isLocalDev && isPreviewMode) {
    const productionDomains = [
      'https://registry.omatrust.org',
      'https://test.registry.omatrust.org'
    ];
    for (const domain of productionDomains) {
      if (dataUrl.startsWith(domain)) {
        const rewritten = dataUrl.replace(domain, currentUrl);
        console.log(`[ENV] Preview mode - rewriting ${domain} to current deployment: ${dataUrl} → ${rewritten}`);
        return rewritten;
      }
    }
  }
  
  console.log(`[ENV] No rewrite needed, returning original URL: ${dataUrl}`);
  return dataUrl;
}

/**
 * Environment configuration
 * - Chain is selected via NEXT_PUBLIC_ACTIVE_CHAIN env var (localhost, omachain-testnet, omachain-mainnet)
 * - Contract addresses can be overridden via NEXT_PUBLIC_REGISTRY_ADDRESS, NEXT_PUBLIC_METADATA_ADDRESS, NEXT_PUBLIC_RESOLVER_ADDRESS
 * - Contract versions are managed via Git branches (not env vars)
 * - appBaseUrl: Canonical URL for on-chain storage (NEXT_PUBLIC_APP_BASE_URL or production fallback)
 * - currentDeploymentUrl: Where the app is currently running (may be a Vercel preview URL)
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

  // Application URLs
  // appBaseUrl: For on-chain storage (dataUrl, iwpsPortalUri) - NEVER ephemeral
  appBaseUrl: getAppBaseUrl(),
  // currentDeploymentUrl: For runtime API calls, redirects - may be preview URL
  currentDeploymentUrl: getCurrentDeploymentUrl(),
  
  // Metadata fetch URL rewriter (for local development)
  getMetadataFetchUrl,

  // Flags
  debugAdapter: parsed.NEXT_PUBLIC_DEBUG_ADAPTER === 'true',
  useErc8004Register: parsed.NEXT_PUBLIC_USE_ERC8004_REGISTER === 'true',
};
