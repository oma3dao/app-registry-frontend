/**
 * OMA3 App Registry Contract Adapter Layer
 * 
 * This module provides a clean abstraction for interacting with the OMA3 App Registry contract.
 * Components should import hooks from this module, never directly from the contract files.
 * 
 * Usage in components:
 * ```tsx
 * import { useApp, useMintApp, useAppsByOwner } from '@/lib/contracts';
 * ```
 */

// React Hooks (primary exports for components)
export {
  useApp,
  useAppsByOwner,
  useAppsList,
  useTotalApps,
  useMintApp,
  useUpdateStatus,
  useSearchByDid,
} from './registry.hooks';

// Types
export type {
  Status,
  AppSummary,
  Paginated,
  MintAppInput,
  UpdateStatusInput,
} from './types';

// Pure functions (for use in API routes, server components, etc.)
export {
  getAppByDid,
  getAppsByOwner,
  listApps,
  getTotalApps,
  searchByDid,
} from './registry.read';

export {
  prepareMintApp,
  prepareUpdateStatus,
} from './registry.write';

// Utilities
export {
  normalizeDidWeb,
  isValidDid,
  extractDidMethod,
  extractDidIdentifier,
} from '../utils/did';

export {
  normalizeEvmError,
  isUserRejection,
  formatErrorMessage,
} from './errors';

export {
  numberToStatus,
  statusToNumber,
  isValidStatus,
  getStatusLabel,
  getStatusColor,
} from '../utils/status';

export {
  hexToString,
  stringToBytes32,
  isBytes32Hex,
  safeDecodeBytes32,
} from '../utils/bytes32';

// Client and chain utilities (rarely needed directly in components)
export { client, getAppRegistryContract, getAppMetadataContract, getActiveChain } from './client';

// ====================
// Metadata Contract
// ====================

// Metadata hooks (primary exports for components)
export { useMetadata, useSetMetadata } from './metadata.hooks';

// Metadata pure functions (for API routes, server components, etc.)
export { getMetadata } from './metadata.read';
export { prepareSetMetadata } from './metadata.write';

// Metadata utilities
export {
  buildMetadataJSON,
  validateMetadataJSON,
  buildMetadataStructure,
  validateMetadata,
} from './metadata.utils';
