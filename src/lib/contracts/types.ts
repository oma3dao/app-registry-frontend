/**
 * Core types for OMA3 App Registry contract interactions
 */

/**
 * Application status enum
 */
export type Status = 'Active' | 'Inactive' | 'Deprecated';

/**
 * Summary representation of an app (for lists/grids)
 */
export interface AppSummary {
  id: bigint;
  did: string;
  name?: string;
  status: Status;
}

/**
 * Detailed representation of an app (for individual views)
 */
export interface AppDetail extends AppSummary {
  owner?: `0x${string}`;
  dataUrl?: string;
  iwpsPortalUri?: string;
  agentApiUri?: string;
  contractAddress?: string;
  version?: string;
  minter?: `0x${string}`;
  // Phase 1 additions (placeholders for now)
  traits?: string[];
  interfaces?: number;
  versions?: Array<{ version: string; timestamp: number }>;
}

/**
 * Paginated response wrapper
 */
export interface Paginated<T> {
  items: T[];
  nextCursor?: string;
  hasMore?: boolean;
}

/**
 * Input for minting a new app
 */
export interface MintAppInput {
  did: string;
  name: string;
  version: string;
  dataUrl?: string;
  iwpsPortalUri?: string;
  agentApiUri?: string;
  contractAddress?: string;
}

/**
 * Status update input
 */
export interface UpdateStatusInput {
  did: string;
  status: Status;
}
