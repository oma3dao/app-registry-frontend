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
    // Update these addresses after running: npx hardhat deploy-system --network localhost
    registry: "0x5FbDB2315678afecb367f032d93F642f64180aa3",  // From your deployment
    metadata: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // TODO: Update from deployment output
    resolver: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"  // TODO: Update from deployment output
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
    registry: "0xb493465Bcb2151d5b5BaD19d87f9484c8B8A8e83",
    metadata: "0x13aD113D0DE923Ac117c82401e9E1208F09D7F19",
    resolver: "0xe4E8FBf35b6f4D975B4334ffAfaEfd0713217cAb"
  }
};

/**
 * OMAchain Mainnet (Placeholder)
 * Chain ID: TBD
 * RPC: TBD
 * Explorer: TBD
 */
export const omachainMainnet = {
  id: 999999, // Placeholder - update when mainnet launches
  chainId: 999999,
  rpc: "https://rpc.mainnet.chain.oma3.org/", // Placeholder
  name: "OMAchain Mainnet",
  nativeCurrency: {
    name: "OMA",
    symbol: "OMA",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "OMAchain Explorer",
      url: "https://explorer.mainnet.chain.oma3.org/",
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
  localhost,          // Development - local Hardhat node
  omachainTestnet,    // OMAchain testnet for OMA3 ecosystem testing
  omachainMainnet     // OMAChain mainnet for OMA3 ecosystem
];

/**
 * Chain presets for environment-based selection
 * Maps NEXT_PUBLIC_ACTIVE_CHAIN env var to chain configurations
 */
export const CHAIN_PRESETS = {
  'localhost': localhost,
  'omachain-testnet': omachainTestnet,
  'omachain-mainnet': omachainMainnet,
} as const;

export type ChainPreset = keyof typeof CHAIN_PRESETS;