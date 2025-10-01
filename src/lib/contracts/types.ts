/**
 * Core types for OMA3 App Registry contract interactions
 */

/**
 * Application status enum
 */
export type Status = 'Active' | 'Inactive' | 'Deprecated';

/**
 * App representation containing all on-chain data from the contract
 * 
 * PHASE 0 (Current):
 * This contains all 10 fields from the contract tuple plus derived fields.
 * Used for all read operations (lists, grids, individual views).
 * 
 * PHASE 1 (Future):
 * When we parse the dataUrl off-chain metadata, we'll introduce interface-specific
 * types that extend this base type:
 * 
 * type AppDetail = HumanAppDetail | ApiAppDetail | ContractAppDetail
 * 
 * where each type includes parsed metadata based on the interfaces field:
 * - HumanAppDetail (interfaces=0): platforms, screenshots, mcp, artifacts, etc.
 * - ApiAppDetail (interfaces=2): endpoint, payments, mcp, a2a, etc.
 * - ContractAppDetail (interfaces=4): minimal metadata
 */
export interface AppSummary {
  // NFT token ID
  id: bigint;
  
  // On-chain fields (immutable or controlled by versioning policy)
  did: string;
  name?: string;
  version?: string;
  dataUrl?: string;
  iwpsPortalUri?: string;
  agentApiUri?: string;
  contractAddress?: string;
  
  // Ownership & status
  minter?: `0x${string}`;
  owner?: `0x${string}`;
  status: Status;
  
  // Phase 1 fields (coming soon)
  interfaces?: number;  // Bitfield: 0=human, 2=api, 4=contract
  traitHashes?: string[];
  dataHash?: string;
  dataHashAlgorithm?: string;
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
