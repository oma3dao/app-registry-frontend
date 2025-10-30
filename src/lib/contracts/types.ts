/**
 * Core types for OMA3 App Registry contract interactions
 * Based on DID-first architecture (not tokenId-first)
 * 
 * KEY CONCEPTS:
 * - Apps are identified by (DID, major version) tuples
 * - Each major version is a separate ERC721 token
 * - Minor/patch versions are tracked in versionHistory[] array
 * - TokenIds are internal implementation details
 */

/**
 * Application status enum
 */
export type Status = 'Active' | 'Deprecated' | 'Replaced';

/**
 * Version struct matching contract
 */
export interface Version {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Interface type enum for UI (bitmap values)
 */
export enum InterfaceType {
  HumanApp = 1,      // 0b001
  ApiEndpoint = 2,   // 0b010
  SmartContract = 4  // 0b100
}

/**
 * DID + major version identifier (primary key for apps)
 */
export interface DidIdentifier {
  did: string;
  major: number;
}

/**
 * App representation containing all on-chain data from the contract
 * 
 * PRIMARY KEY: (did, versionMajor) tuple
 * 
 * IMMUTABLE FIELDS: did, versionMajor, minter, fungibleTokenId, contractId
 * MUTABLE FIELDS: interfaces, status, dataUrl, dataHash, dataHashAlgorithm, 
 *                 versionHistory, traitHashes
 */
export interface AppSummary {
  // === PRIMARY IDENTIFIER ===
  did: string;                    // DID as string (e.g., "did:web:example.com")
  versionMajor: number;           // Major version number for this NFT
  
  // === CURRENT VERSION ===
  // Latest version from versionHistory array
  currentVersion: Version;        // Current semantic version
  
  // === VERSION HISTORY ===
  // Full history of all versions for this major
  versionHistory: Version[];      // Array of all versions
  
  // === OWNERSHIP ===
  minter: `0x${string}`;          // Original creator (immutable)
  currentOwner: `0x${string}`;    // Current NFT holder (from contract's AppView.currentOwner)
  owner: `0x${string}`;           // Owner from metadata JSON (for verification against currentOwner)
  
  // === INTERFACES ===
  interfaces: number;             // Bitmap: 1=human, 2=api, 4=contract
  
  // === CONTENT ===
  dataUrl: string;                // URL to off-chain JSON metadata
  dataHash: string;               // Hash of JSON at dataUrl
  dataHashAlgorithm: number;      // 0=keccak256, 1=sha256
  
  // === OPTIONAL IDENTIFIERS ===
  fungibleTokenId?: string;       // CAIP-19 token ID (immutable)
  contractId?: string;            // CAIP-10 contract address (immutable)
  
  // === TRAITS ===
  traitHashes: string[];          // Array of trait hashes (max 20)
  
  // === STATUS ===
  status: Status;                 // Active, Deprecated, or Replaced
  
  // === METADATA (parsed from dataUrl) ===
  name?: string;                  // From off-chain metadata
  description?: string;           // From off-chain metadata
  
  // === INTERNAL (don't expose to users) ===
  _tokenId?: bigint;              // ERC721 token ID (internal only)
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
 * Input for minting a new app (all 12 parameters)
 */
export interface MintAppInput {
  // Core required fields
  did: string;                    // DID identifier
  interfaces: number;             // Bitmap: 1=human, 2=api, 4=contract
  dataUrl: string;                // URL to off-chain JSON metadata
  dataHash: string;               // Hash of the JSON at dataUrl
  dataHashAlgorithm: number;      // 0=keccak256, 1=sha256
  
  // Optional identifier fields
  fungibleTokenId?: string;       // CAIP-19 token ID (empty string if not applicable)
  contractId?: string;            // CAIP-10 contract address (empty string if not applicable)
  
  // Version fields
  initialVersionMajor: number;    // Major version for this NFT
  initialVersionMinor: number;    // Initial minor version
  initialVersionPatch: number;    // Initial patch version
  
  // Optional fields
  traitHashes?: string[];         // Trait hashes (max 20, empty array if none) - generated from traits during minting
  metadataJson?: string;          // On-chain JSON for metadata contract (empty string to skip)
}

/**
 * Input for updating app (controlled update with versioning)
 */
export interface UpdateAppInput {
  did: string;
  major: number;
  
  // Optional updates (empty string or 0 = no change)
  newDataUrl?: string;
  newDataHash?: string;
  newDataHashAlgorithm?: number;
  newInterfaces?: number;         // Must be additive only
  newTraitHashes?: string[];
  
  // Version increments (required if making changes)
  newMinor: number;               // Must be >= current
  newPatch: number;               // Must be >= current
  
  // Optional on-chain metadata
  metadataJson?: string;          // On-chain JSON for metadata contract (empty string to skip)
}

/**
 * Status update input
 */
export interface UpdateStatusInput {
  did: string;
  major: number;
  status: Status;
}

/**
 * DID verification result from API
 */
export interface DidVerificationResult {
  success: boolean;
  verified: boolean;
  message: string;
  method?: 'did.json' | 'dns-txt';
  txHash?: string;
  error?: string;
}

/**
 * DID ownership info from resolver
 */
export interface DidOwnership {
  did: string;
  owner: `0x${string}`;
  isMature: boolean;
  registeredAt?: number;
  maturationPeriod?: number;
}
