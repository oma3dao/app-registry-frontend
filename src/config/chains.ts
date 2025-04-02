export const thirdwebTestSubnet = {
    id: 894538,
    chainId: 894538,
    rpc: "https://894538.rpc.thirdweb.com",
    nativeCurrency: {
      name: "Thirdweb Test Token",
      symbol: "TWT",
      decimals: 18,
    },
  };

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
    OMA3AppRegistry: "0xb493465Bcb2151d5b5BaD19d87f9484c8B8A8e83"
  }
};