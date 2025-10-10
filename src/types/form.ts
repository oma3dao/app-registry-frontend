import type { RegistryContractData } from './registry-contract';
import type { MetadataContractData } from './metadata-contract';

/**
 * Interface flags for Step 0
 * Determines which interface types the app supports
 */
export type InterfaceFlags = {
  human: boolean;
  api: boolean;
  smartContract: boolean;
};

/**
 * API type selection for API interface
 */
export type ApiType = 'openapi' | 'graphql' | 'jsonrpc' | 'mcp' | 'a2a' | null;

/**
 * Combined form data for the NFT creation wizard
 * Used to manage state across all wizard steps
 */
export interface WizardFormData extends RegistryContractData {
  /**
   * Metadata fields (optional)
   * Only used when proceeding beyond step 1 to the full wizard flow
   */
  metadata?: MetadataContractData;
  
  /**
   * Interface flags (from Step 0)
   * Used to determine which steps to show and compute interfaces bitmap
   */
  interfaceFlags?: InterfaceFlags;
  
  /**
   * API type selection (only when API interface is enabled)
   */
  apiType?: ApiType;
  
  /**
   * IWPS Portal URL (distribution field)
   */
  iwpsPortalUrl?: string;
  
  /**
   * Internal verification status tracking
   */
  _verificationStatus?: 'idle' | 'pending' | 'verified' | 'failed';
}

/**
 * Extract just the registry contract data from the form data
 * Used when submitting to the registry contract
 */
export const extractRegistryData = (formData: WizardFormData): RegistryContractData => {
  const { metadata, ...registryData } = formData;
  return registryData;
}; 