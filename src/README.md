# OMA3 App Registry Frontend

This directory contains the source code for the OMA3 App Registry frontend application.

## Configuration

The application uses a centralized configuration system for blockchain-related settings.

### Blockchain Configuration

#### `src/config/chains.ts`

This file contains chain configuration data for the blockchains the application interacts with. It defines properties like:
- Chain IDs
- RPC endpoints
- Native currency information
- Block explorers
- Contract addresses deployed on each chain

```typescript
// Example: accessing supported testnet configurations
import { celoAlfajores, omachainTestnet } from "@/config/chains";

// Access Celo Alfajores chain properties
const celoChainId = celoAlfajores.chainId; // 44787
const celoRpcUrl = celoAlfajores.rpc; // https://alfajores-forno.celo-testnet.org
const celoRegistryAddress = celoAlfajores.contracts.OMA3AppRegistry;

// Access OMAchain testnet chain properties
const omachainId = omachainTestnet.chainId; // 66238
const omachainRpcUrl = omachainTestnet.rpc; // https://rpc.testnet.chain.oma3.org/
const omachainRegistryAddress = omachainTestnet.contracts.OMA3AppRegistry;
```

#### `src/config/contracts.ts`

This file defines the smart contracts the application interacts with, including their:
- Chain information
- Contract addresses (referenced from chains.ts)
- ABIs (Application Binary Interfaces)

The contract configurations import their addresses from `chains.ts` to maintain a single source of truth.

### How to Configure the OMA3 App Registry Contract

1. First, add your contract address to the appropriate chain in `src/config/chains.ts`:
   ```ts
   export const celoAlfajores = {
     // ...chain configuration
     contracts: {
       OMA3AppRegistry: "0xYourContractAddressHere"
     }
   };
   
   export const omachainTestnet = {
     // ...chain configuration
     contracts: {
       OMA3AppRegistry: "0xYourContractAddressHere"
     }
   };
   ```

2. Add your contract ABI in the `contracts.ts` file:
   - You can get the ABI from the compiled contract JSON file
   - Or from blockchain explorers like Celoscan for verified contracts

```ts
export const OMA3_APP_REGISTRY = {
  name: "OMA3 App Registry",
  chain: celoAlfajores,
  address: celoAlfajores.contracts.OMA3AppRegistry,
  abi: [
    {
      "inputs": [],
      "name": "getAllApps",
      "outputs": [{ "internalType": "App[]", "name": "", "type": "tuple[]" }],
      "stateMutability": "view",
      "type": "function"
    },
    // ... more ABI entries
  ]
} as const;
```

### How to Use Contract Configurations in Components

```typescript
// Example: accessing OMA3 App Registry contract configuration
import { OMA3_APP_REGISTRY } from "@/config/contracts";
import { getContract } from "thirdweb";
import { client } from "@/app/client";

// Get contract instance
const contract = getContract({
  client,
  chain: OMA3_APP_REGISTRY.chain,
  address: OMA3_APP_REGISTRY.address,
  abi: OMA3_APP_REGISTRY.abi,
});

// Read from contract
// Example: Get all apps from contract
async function getAllApps() {
  try {
    const result = await contract.read.getApps([0]); // Start from token ID 0
    return result.apps;
  } catch (error) {
    console.error("Error fetching apps:", error);
    return [];
  }
}

// Write to contract
// Example: Register a new app
async function registerApp(app) {
  try {
    // Using the mint function with the app data
    const result = await contract.write.mint([
      app.did,
      app.name,
      app.version.major,
      app.version.minor,
      app.version.patch,
      app.dataUrl,
      app.iwpsPortalUri,
      app.agentPortalUri,
      app.contractAddress || ""
    ]);
    return result;
  } catch (error) {
    console.error("Error registering app:", error);
    throw error;
  }
}
```

## Best Practices

1. **Single Source of Truth**: Chain information is defined in `chains.ts` and contract addresses are stored there. Contract configurations in `contracts.ts` reference these addresses.

2. **Type Safety**: All configurations use TypeScript for type safety.

3. **DRY Principle**: Following the "Don't Repeat Yourself" principle by centralizing blockchain configurations.

4. **Separation of Concerns**: Chain configurations are separate from contract configurations, making it easy to add new chains or contracts independently. 