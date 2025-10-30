/**
 * Localhost (Hardhat)
 * Chain ID: 31337
 * RPC: http://127.0.0.1:8545
 * For local development and testing
 */
export const localhost = {
  id: 31337,
  chainId: 31337,
  rpc: "http://127.0.0.1:8545",
  name: "Localhost (Hardhat)",
  nativeCurrency: {
    name: "OMA",
    symbol: "OMA",
    decimals: 18,
  },
  blockExplorers: [],
  testnet: true,
  contracts: {
    // Update these addresses after running: npx hardhat deploy-system --network localhost and copy the addresses from the deployment output to the below fields:
    registry: "",
    metadata: "",
    resolver: ""
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
      name: "OMAchain Testnet Explorer",
      url: "https://explorer.testnet.chain.oma3.org/",
    },
  ],
  testnet: true,
  contracts: {
    registry: "0x29387aE755214b5e9221D06BdDB6f21eE5A1a50a",
    metadata: "0x9a530e23370C7d820FbaB2E0a884c58be5E4e919",
    resolver: "0xDc120C00E62822329A4d8C7808f5a43C9CbfC1f8"
  }
};

/**
 * OMAchain Mainnet (Placeholder)
 * Chain ID: TBD
 * RPC: TBD
 * Explorer: TBD
 */
export const omachainMainnet = {
  id: 6623, // Placeholder - update when mainnet launches
  chainId: 6623,
  rpc: "https://rpc.chain.oma3.org/", // Placeholder
  name: "OMAchain Mainnet",
  nativeCurrency: {
    name: "OMA",
    symbol: "OMA",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "OMAchain Explorer",
      url: "https://explorer.chain.oma3.org/",
    },
  ],
  testnet: false,
  contracts: {
    registry: "0x", // Not yet deployed
    metadata: "0x",  // Not yet deployed
    resolver: "0x"  // Not yet deployed
  }
};

/**
 * Configuration for supported chains in the social wallet
 * Order matters - first chain is the default
 */
export const supportedWalletChains = [
  omachainTestnet,    // OMAchain testnet for OMA3 ecosystem testing
  // localhost,       // Uncomment only when actively using a local node
  omachainMainnet  // Placeholder - enable when mainnet is ready
];

/**
 * Chain presets for environment-based selection
 * Maps NEXT_PUBLIC_ACTIVE_CHAIN env var to chain configurations
 */
export const CHAIN_PRESETS = {
  'omachain-testnet': omachainTestnet,
  'localhost': localhost,
  'omachain-mainnet': omachainMainnet,
} as const;

export type ChainPreset = keyof typeof CHAIN_PRESETS;