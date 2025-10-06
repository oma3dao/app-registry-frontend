/**
 * Non-EVM chain configuration constants
 * 
 * NOTE: This file ONLY contains NON-EVM chain reference strings (Solana, Sui).
 * EVM chains are in all-chains.ts which imports from thirdweb/chains.
 * 
 * This file exists solely for the `NON_EVM_CAIP2` export below.
 */

/**
 * Non-EVM chain reference strings for CAIP-10
 * Mainnet only - testnets must be pasted as full CAIP-10
 */
export const NON_EVM_CAIP2 = {
  solana: {
    mainnetRef: 'mainnet',
  },
  sui: {
    mainnetRef: 'mainnet',
  },
} as const;
