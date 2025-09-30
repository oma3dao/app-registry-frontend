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
  AppDetail,
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

// Client (rarely needed directly in components)
export { client, getRegistryContract, getActiveChain } from './client';
