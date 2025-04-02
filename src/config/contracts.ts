import { defineChain } from "thirdweb/chains";
import { celoAlfajores } from "./chains";
import appRegistryAbi from "../abi/appRegistry.json";

/**
 * Configuration for the OMA3 App Registry contract
 * 
 * This follows Thirdweb's recommended pattern for storing contract information
 * to be used throughout the application.
 * 
 * The contract can be accessed in components using:
 * ```
 * import { OMA3_APP_REGISTRY } from "@/config/contracts";
 * import { getContract } from "thirdweb";
 * 
 * // In your component
 * const contract = getContract({
 *   client,
 *   chain: OMA3_APP_REGISTRY.chain,
 *   address: OMA3_APP_REGISTRY.address,
 *   abi: OMA3_APP_REGISTRY.abi,
 * });
 * ```
 */

// Define the chain using Thirdweb's defineChain for proper typing
const alfajoresChain = defineChain({
  id: 44787,
  rpc: celoAlfajores.rpc,
  name: celoAlfajores.name,
  nativeCurrency: celoAlfajores.nativeCurrency,
  blockExplorers: celoAlfajores.blockExplorers
});

// Alfajores testnet contract
export const OMA3_APP_REGISTRY = {
  name: "OMA3 App Registry",
  chain: alfajoresChain,
  address: celoAlfajores.contracts.OMA3AppRegistry,
  abi: appRegistryAbi as any
}; 