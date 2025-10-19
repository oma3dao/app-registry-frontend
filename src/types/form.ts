/**
 * Form-related types and utilities
 * 
 * TODO: Consolidate this file into @/schema/data-model.ts
 * - InterfaceFlags and ApiType could move to data-model.ts
 * - WizardFormData is already deprecated (use TFormState)
 * - extractOnChainData could move to schema/mapping.ts or data-model.ts
 * - This would eliminate the types/form.ts file entirely
 */

import type { TFormState } from '@/schema/data-model';

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
 *
 * @deprecated Use TFormState from @/schema/data-model instead
 */
export interface WizardFormData extends TFormState {
  // This interface now just extends TFormState for backwards compatibility
}

/**
 * Extract just the on-chain fields from the form data
 * Used when submitting to the registry contract
 */
export const extractOnChainData = (formData: TFormState) => {
  const { ui, ...domainData } = formData;
  // Return only on-chain fields
  const { getOnChainFields } = require('@/schema/data-model');
  const onChainFields = getOnChainFields();

  const result: any = {};
  onChainFields.forEach((field: any) => {
    const path = field.id;
    const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], domainData);
    if (path.includes('.')) {
      // Handle nested paths like 'interfaceFlags.human'
      const parts = path.split('.');
      let current = result;
      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = current[parts[i]] || {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    } else {
      result[path] = value;
    }
  });

  return result;
}; 