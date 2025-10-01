/**
 * Celo Alfajores Testnet
 * Chain ID: 44787
 * RPC: https://alfajores-forno.celo-testnet.org
 * Explorer: https://alfajores.celoscan.io
 * Faucet: https://faucet.celo.org/alfajores
 */
export const celoAlfajores = {
  id: 44787,
  chainId: 44787,
  rpc: "https://alfajores-forno.celo-testnet.org",
  name: "Celo Alfajores",
  nativeCurrency: {
    name: "CELO",
    symbol: "CELO",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "Celoscan",
      url: "https://alfajores.celoscan.io",
    },
  ],
  testnet: true,
  contracts: {
    OMA3AppRegistryLegacy: "0xb493465Bcb2151d5b5BaD19d87f9484c8B8A8e83", // Phase 0 contract (deployed, 29 apps)
    OMA3AppRegistry: "0x", // Phase 1 contract (not yet deployed)
    OMA3AppMetadataV0: "0x9f1f5559b6D08eC855cafaCD76D9ae69c41169C9"
  }
};

/**
 * OMAchain Testnet
 * Chain ID: 66238
 * RPC: https://rpc.testnet.chain.oma3.org/
 * Explorer: https://explorer.testnet.chain.oma3.org/
 * Faucet: TBD
 */
export const omachainTestnet = {
  id: 66238,
  chainId: 66238,
  rpc: "https://rpc.testnet.chain.oma3.org/",
  name: "OMAchain Testnet",
  nativeCurrency: {
    name: "OMA",
    symbol: "OMA",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "OMAchain Explorer",
      url: "https://explorer.testnet.chain.oma3.org/",
    },
  ],
  testnet: true,
  contracts: {
    OMA3AppRegistry: "0x", // Phase 1 contract (not yet deployed)
    OMA3AppMetadata: "0x" // Metadata contract (not yet deployed)
  }
};

/**
 * Custom EVM Chain (Placeholder)
 * Chain ID: 999999 (placeholder)
 * RPC: https://placeholder-rpc-endpoint.com (to be updated)
 * Explorer: https://placeholder-explorer.com (to be updated)
 * Faucet: TBD
 */
export const customEvmChain = {
  id: 999999,
  chainId: 999999,
  rpc: "https://placeholder-rpc-endpoint.com",
  name: "Custom EVM Chain",
  nativeCurrency: {
    name: "Custom Token",
    symbol: "CUSTOM",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "Custom Explorer",
      url: "https://placeholder-explorer.com",
    },
  ],
  testnet: true, // Change to false for mainnet
  contracts: {
    // Placeholder addresses - to be updated when contracts are deployed
    OMA3AppRegistry: "0x0000000000000000000000000000000000000000", // Phase 1
    OMA3AppMetadata: "0x0000000000000000000000000000000000000000"
  }
};

/**
 * Ethereum Mainnet configuration for wallet support
 */
export const ethereumMainnet = {
  id: 1,
  chainId: 1,
  rpc: "https://1.rpc.thirdweb.com",
  name: "Ethereum",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "Etherscan",
      url: "https://etherscan.io",
    },
  ],
  testnet: false
};

/**
 * Configuration for supported chains in the social wallet
 * Order matters - first chain is the default
 */
export const supportedWalletChains = [
  celoAlfajores,      // Primary chain - users start here
  omachainTestnet,    // OMAchain testnet for OMA3 ecosystem testing
  ethereumMainnet    // Ethereum mainnet for broader dApp compatibility
];