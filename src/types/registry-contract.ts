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
   * App name (stored in metadata at dataUrl, not on-chain)
   */
  name: string;
  
  /**
   * App version in format x.y.z or x.y
   */
  version: string;
  
  /**
   * Interface support bitmap (1=human, 2=api, 4=contract)
   * For Phase 1: Always 1 (human apps only)
   */
  interfaces: number;
  
  /**
   * URL to app metadata JSON
   * The JSON at this URL contains: name, description, images, iwpsPortalUrl, etc.
   */
  dataUrl: string;
  
  /**
   * IWPS Portal URL (stored in metadata JSON at dataUrl, not on-chain, optional)
   * Extracted from dataUrl metadata for display/launch purposes
   */
  iwpsPortalUrl?: string;
  
  /**
   * Contract address in CAIP-10 format (on-chain, optional)
   * Format: "eip155:1:0x..."
   */
  contractId?: string;
  
  /**
   * Fungible token ID in CAIP-19 format (on-chain, optional)
   * Format: "eip155:1/erc20:0x..."
   */
  fungibleTokenId?: string;
  
  /**
   * App status: 0=Active, 1=Deprecated, 2=Replaced
   */
  status: number;
  
  /**
   * Ethereum address of the app creator
   */
  minter: string;
}
