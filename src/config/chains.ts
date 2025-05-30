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
    OMA3AppRegistry: "0xb493465Bcb2151d5b5BaD19d87f9484c8B8A8e83",
    OMA3AppMetadataV0: "0x9f1f5559b6D08eC855cafaCD76D9ae69c41169C9"
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
    OMA3AppRegistry: "0x0000000000000000000000000000000000000000",
    OMA3AppMetadataV0: "0x0000000000000000000000000000000000000000"
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
  ethereumMainnet    // Ethereum mainnet for broader dApp compatibility
];