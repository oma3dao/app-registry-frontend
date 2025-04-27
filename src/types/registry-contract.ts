/**
 * Registry contract data structure
 * Contains all fields that are stored in the app registry contract
 * This structure is useful for developers integrating directly with the registry contract
 */
export interface RegistryContractData {
  /**
   * Decentralized Identifier - primary identifier for the app
   */
  did: string;
  
  /**
   * App name
   */
  name: string;
  
  /**
   * App version in format x.y.z or x.y
   */
  version: string;
  
  /**
   * URL to app metadata
   */
  dataUrl: string;
  
  /**
   * IWPS Portal URI
   */
  iwpsPortalUri: string;
  
  /**
   * Agent API URI (optional)
   */
  agentApiUri: string;
  
  /**
   * Contract address (optional)
   */
  contractAddress?: string;
  
  /**
   * App status: 0=Active, 1=Deprecated, 2=Replaced
   */
  status: number;
  
  /**
   * Ethereum address of the app creator
   */
  minter: string;
} 