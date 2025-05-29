import { defineChain } from "thirdweb/chains";
import { celoAlfajores, customEvmChain } from "./chains";
import appRegistryAbi from "../abi/appRegistry.json";
import appMetadataAbi from "../abi/appMetadata.json";

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

// Configuration: Choose which chain to use
// TODO: This could be moved to environment variables or app config
const ACTIVE_CHAIN = celoAlfajores; // Change to customEvmChain when ready

// Define the active chain using Thirdweb's defineChain for proper typing
const activeChain = defineChain({
  id: ACTIVE_CHAIN.id,
  rpc: ACTIVE_CHAIN.rpc,
  name: ACTIVE_CHAIN.name,
  nativeCurrency: ACTIVE_CHAIN.nativeCurrency,
  blockExplorers: ACTIVE_CHAIN.blockExplorers
});

// App Registry contract (uses active chain configuration)
export const OMA3_APP_REGISTRY = {
  name: "OMA3 App Registry",
  chain: activeChain,
  address: ACTIVE_CHAIN.contracts.OMA3AppRegistry,
  abi: appRegistryAbi as any
}; 

// App Metadata contract (uses active chain configuration)
export const OMA3_APP_METADATA = {
  name: "OMA3 App Metadata",
  chain: activeChain,
  address: ACTIVE_CHAIN.contracts.OMA3AppMetadataV0,
  abi: appMetadataAbi as any
}; 