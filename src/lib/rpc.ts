/**
 * RPC Helper Functions
 * 
 * Provides RPC URL generation and retry logic for blockchain interactions.
 * 
 * Primary: Thirdweb RPC Edge (EVM chains only)
 * Fallback: QuickNode (future support for Solana, Sui, Aptos, etc.)
 */

/**
 * Get Thirdweb RPC Edge URL for any EVM chain
 * URL pattern: https://${chainId}.rpc.thirdweb.com/${clientId}
 * 
 * @param chainId - The EVM chain ID (must be positive integer)
 * @param clientId - Thirdweb Client ID (same as used in browser SDK)
 * @returns RPC URL for the chain
 * @throws Error if chainId is invalid or clientId is missing
 * 
 * @see https://thirdweb.com/learn/guides/what-is-rpc-edge-and-how-do-i-use-it
 */
export function getThirdwebRpcUrl(chainId: number, clientId: string): string {
  // Validate chainId
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error(`Invalid chainId: ${chainId}. Must be a positive integer.`);
  }
  
  // Validate clientId
  if (!clientId || clientId.trim() === '') {
    throw new Error('Thirdweb Client ID is required. Set NEXT_PUBLIC_THIRDWEB_CLIENT_ID environment variable.');
  }
  
  return `https://${chainId}.rpc.thirdweb.com/${clientId}`;
}

/**
 * Retry an async operation with exponential backoff
 * 
 * @param fn - Async function to retry
 * @param maxAttempts - Maximum number of attempts (default: 2)
 * @param initialDelay - Initial delay in ms (default: 500)
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 2,
  initialDelay: number = 500
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }
      
      // Exponential backoff: 500ms, 1000ms, 2000ms, etc.
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(`[rpc] Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Operation failed after ${maxAttempts} attempts: ${lastError?.message}`);
}

/**
 * Get RPC URL for a given chain ID with priority system
 * 
 * Priority:
 * 1. OMA chains (custom chains from config)
 * 2. Thirdweb RPC Edge (all EVM chains)
 * 3. QuickNode (future: non-EVM chains like Solana, Sui)
 * 
 * @param chainId - The chain ID
 * @param omaChainId - The OMA chain ID from config (optional)
 * @param omaRpcUrl - The OMA chain RPC URL from config (optional)
 * @returns RPC URL for the chain
 */
export function getRpcUrl(
  chainId: number,
  omaChainId?: number,
  omaRpcUrl?: string
): string {
  // Priority 1: OMA chain (custom chain)
  if (omaChainId !== undefined && chainId === omaChainId && omaRpcUrl) {
    console.log(`[rpc] Using OMA chain RPC for chainId ${chainId}`);
    return omaRpcUrl;
  }
  
  // Priority 2: Thirdweb RPC Edge (all EVM chains)
  const thirdwebClientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  
  if (thirdwebClientId) {
    try {
      const url = getThirdwebRpcUrl(chainId, thirdwebClientId);
      console.log(`[rpc] Using Thirdweb RPC Edge for chainId ${chainId}`);
      return url;
    } catch (error) {
      console.warn(`[rpc] Failed to get Thirdweb RPC URL: ${(error as Error).message}`);
    }
  }
  
  // Priority 3: QuickNode (future support for non-EVM chains)
  // TODO: Add QuickNode support for Solana, Sui, Aptos when needed
  
  // Fallback: localhost for development
  if (chainId === 31337 || chainId === 1337) {
    console.log(`[rpc] Using localhost RPC for chainId ${chainId}`);
    return 'http://localhost:8545';
  }
  
  throw new Error(
    `No RPC provider configured for chainId ${chainId}. ` +
    `Set NEXT_PUBLIC_THIRDWEB_CLIENT_ID environment variable to use Thirdweb RPC Edge.`
  );
}

