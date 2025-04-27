import type { RegistryContractData } from './registry-contract';
import type { MetadataContractData } from './metadata-contract';

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
}

/**
 * Extract just the registry contract data from the form data
 * Used when submitting to the registry contract
 */
export const extractRegistryData = (formData: WizardFormData): RegistryContractData => {
  const { metadata, ...registryData } = formData;
  return registryData;
}; 