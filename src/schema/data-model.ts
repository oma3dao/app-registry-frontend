/**
 * Unified Data Model - Single Source of Truth
 *
 * This file contains ALL data model definitions for the OMA3 Registry.
 * Everything related to app data structure lives here - no more scattered files.
 *
 * Key principle: Single source of truth for maintainability
 * When the data model changes, modify this file and regenerate derived types.
 */

import { z } from "zod";
import type { ComponentType } from "react";
import { parseCaip10 } from "@/lib/utils/caip10";

// ============================================================================
// CORE DATA TYPES (what gets stored/transmitted)
// ============================================================================

/**
 * Application data as stored in the registry contract (on-chain)
 */
export const OnChainApp = z.object({
  did: z.string().min(1, "DID is required"),
  initialVersionMajor: z.number().int().min(0),
  initialVersionMinor: z.number().int().min(0),
  initialVersionPatch: z.number().int().min(0),
  interfaces: z.number().int().nonnegative(),
  dataUrl: z.string().url(),
  dataHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  dataHashAlgorithm: z.literal(0).or(z.literal(1)),
  fungibleTokenId: z.string().optional().default(""),
  contractId: z.string().optional().default(""),
  traitHashes: z.array(z.string().regex(/^0x[0-9a-fA-F]{64}$/)).max(20).default([]),
  minter: z.string(),
  status: z.number().int().min(0).max(2).default(0),
});

export type TOnChainApp = z.infer<typeof OnChainApp>;

/**
 * Application metadata as stored in the dataUrl JSON (off-chain)
 */
export const OffChainMetadata = z.object({
  // Core identity
  name: z.string().min(2).max(80),
  description: z.string().min(10),
  publisher: z.string().min(1),

  // URLs
  image: z.string().url(),
  external_url: z.string().url().optional(),
  summary: z.string().optional(),
  legalUrl: z.string().url().optional(),
  supportUrl: z.string().url().optional(),

  // Media
  screenshotUrls: z.array(z.string().url()).default([]),
  videoUrls: z.array(z.string().url()).default([]),
  threeDAssetUrls: z.array(z.string().url()).default([]),

  // Distribution
  iwpsPortalUrl: z.string().url().optional(),
  platforms: z.record(z.string(), z.any()).optional(), // TODO: proper PlatformDetails schema
  artifacts: z.record(z.string(), z.any()).optional(),

  // API configuration
  endpoint: z.any().optional(), // TODO: proper EndpointConfig schema
  interfaceVersions: z.array(z.string()).optional(),
  mcp: z.any().optional(), // TODO: proper McpConfig schema

  // Traits (stored here but hashed on-chain)
  traits: z.array(z.string()).max(20).default([]),
}).strict();

export type TOffChainMetadata = z.infer<typeof OffChainMetadata>;

/**
 * Platform-specific configuration
 * Each platform (web, windows, macos, etc.) has its own config
 */
export const PlatformDetails = z.object({
  launchUrl: z.string().url().optional(),
  supported: z.boolean().optional(),
  downloadUrl: z.string().url().optional(),
  artifactDid: z.string().optional(),
}).passthrough(); // Allow additional platform-specific fields

export type TPlatformDetails = z.infer<typeof PlatformDetails>;

/**
 * Defines the structure for platform availability information,
 * mapping platform keys (like "ios", "web") to their details.
 */
export const Platforms = z.record(z.string(), PlatformDetails);

export type TPlatforms = z.infer<typeof Platforms>;

/**
 * Artifact for distribution (binaries, packages)
 */
export const Artifact = z.object({
  url: z.string().url(),
  hash: z.string().optional(),
  hashAlgorithm: z.string().optional(),
  size: z.number().optional(),
  format: z.string().optional(),
  did: z.string().optional(), // did:artifact for verification
});

export type TArtifact = z.infer<typeof Artifact>;

/**
 * API endpoint configuration
 */
export const EndpointConfig = z.object({
  url: z.string().url().optional(),
  schemaUrl: z.string().url().optional(), // OpenAPI/GraphQL schema URL
});

export type TEndpointConfig = z.infer<typeof EndpointConfig>;

/**
 * MCP (Model Context Protocol) configuration
 */
export const McpConfig = z.object({
  tools: z.array(z.any()).optional(),
  resources: z.array(z.any()).optional(),
  prompts: z.array(z.any()).optional(),
  server: z.any().optional(),
}).passthrough(); // MCP spec may have additional fields

export type TMcpConfig = z.infer<typeof McpConfig>;

// ============================================================================
// FORM/DOMAIN TYPES (what the wizard edits)
// ============================================================================

/**
 * The complete data model that the wizard collects and edits
 * This is the canonical application data structure
 */
export const DomainForm = z.object({
  // Core identifiers
  did: z.string(),
  version: z.string(),

  // Interface flags
  interfaceFlags: z.object({
    human: z.boolean(),
    api: z.boolean(),
    smartContract: z.boolean(),
  }),

  // Contract data
  dataUrl: z.string().url().optional(),
  contractId: z.string().optional(),
  fungibleTokenId: z.string().optional(),

  // All metadata fields (flattened)
  name: z.string().min(2).max(80),
  description: z.string().min(10),
  publisher: z.string().min(1),
  image: z.string().url(),
  external_url: z.string().url().optional(),
  summary: z.string().optional(),
  legalUrl: z.string().url().optional(),
  supportUrl: z.string().url().optional(),
  screenshotUrls: z.array(z.string().url()).default([]),
  videoUrls: z.array(z.string().url()).default([]),
  threeDAssetUrls: z.array(z.string().url()).default([]),
  iwpsPortalUrl: z.string().url().optional(),
  platforms: z.record(z.string(), z.any()).optional(),
  artifacts: z.record(z.string(), z.any()).optional(),
  endpoint: z.any().optional(),
  interfaceVersions: z.array(z.string()).optional(),
  mcp: z.any().optional(),
  traits: z.array(z.string()).max(20).default([]),

  // API type
  apiType: z.enum(["openapi", "graphql", "jsonrpc", "mcp", "a2a"]).optional(),
});

export type TDomainForm = z.infer<typeof DomainForm>;

// ============================================================================
// UI STATE TYPES (wizard state, not app data)
// ============================================================================

/**
 * UI state for the wizard (separate from app data)
 */
export const UIState = z.object({
  mode: z.enum(["create", "edit"]),
  isEditing: z.boolean().default(false),
  currentVersion: z.string().optional(),
  verificationStatus: z.enum(["idle", "verifying", "success", "error"]).default("idle"),
  didVerification: z.object({
    isValid: z.boolean().default(false),
    error: z.string().optional(),
  }).default({}),
});

export type TUIState = z.infer<typeof UIState>;

export const defaultUIState: TUIState = {
  mode: "create",
  isEditing: false,
  verificationStatus: "idle",
  didVerification: {
    isValid: false,
  },
};

// ============================================================================
// COMBINED FORM STATE (domain + UI)
// ============================================================================

/**
 * Complete form state used by the wizard
 */
export const FormState = DomainForm.extend({
  ui: UIState,
});

export type TFormState = z.infer<typeof FormState>;

/**
 * Extract pure domain data from form state
 */
export function toDomain(form: TFormState): TDomainForm {
  const { ui, ...domain } = form;
  return DomainForm.parse(domain);
}

/**
 * Create form state from domain data
 */
export function fromDomain(
  domain: Partial<TDomainForm>,
  uiOverrides?: Partial<TUIState>
): TFormState {
  return FormState.parse({
    ...domain,
    ui: {
      ...defaultUIState,
      ...uiOverrides,
    },
  });
}

/**
 * Default form state for new apps
 */
export const defaultFormState: TFormState = {
  did: "",
  version: "1.0.0",
  interfaceFlags: {
    human: true,
    api: false,
    smartContract: false,
  },
  name: "",
  description: "",
  publisher: "",
  image: "",
  external_url: "",
  summary: "",
  legalUrl: "",
  supportUrl: "",
  screenshotUrls: [],
  videoUrls: [],
  threeDAssetUrls: [],
  iwpsPortalUrl: "",
  platforms: {},
  artifacts: {},
  endpoint: undefined,
  interfaceVersions: [],
  mcp: undefined,
  traits: [],
  ui: defaultUIState,
};

// ============================================================================
// FIELD CATALOG (defines all form fields and their properties)
// ============================================================================

/**
 * Field ID - dot-path into form state
 */
export type FieldId = string;

/**
 * Widget types for generic rendering
 */
export type WidgetType =
  | "text"
  | "textarea"
  | "url"
  | "number"
  | "checkbox"
  | "select"
  | "array-simple"
  | "custom";

/**
 * Field definition
 */
export interface FieldDef {
  id: FieldId;
  title: string;
  description?: string;
  widget: WidgetType;
  step: string;
  interfaces: InterfaceType[];
  required: boolean | ((flags: TFormState["interfaceFlags"]) => boolean);
  onChain: boolean; // Whether this field is stored on-chain in the smart contract

  // For custom widgets
  customComponent?: ComponentType<any>;

  // For select widgets
  options?: Array<{ value: string; label: string }>;

  // For validation
  placeholder?: string;
}

/**
 * Interface type names
 */
export type InterfaceType = "human" | "api" | "smartContract";

/**
 * API type options
 */
export type ApiType = "openapi" | "graphql" | "jsonrpc" | "mcp" | "a2a";

// ============================================================================
// FIELD CONSTANTS AND CATALOG (generated from field definitions)
// ============================================================================

export const F = {
  // Step 1: Verification
  did: "did" as FieldId,
  version: "version" as FieldId,
  interfaces: "interfaceFlags" as FieldId,
  apiType: "apiType" as FieldId,

  // Step 2: On-chain
  dataUrl: "dataUrl" as FieldId,
  contractId: "contractId" as FieldId,
  fungibleTokenId: "fungibleTokenId" as FieldId,
  traits: "traits" as FieldId,

  // Step 3: Common metadata
  name: "name" as FieldId,
  description: "description" as FieldId,
  publisher: "publisher" as FieldId,
  image: "image" as FieldId,
  external_url: "external_url" as FieldId,
  summary: "summary" as FieldId,
  legalUrl: "legalUrl" as FieldId,
  supportUrl: "supportUrl" as FieldId,

  // Step 4: Human media
  screenshotUrls: "screenshotUrls" as FieldId,
  videoUrls: "videoUrls" as FieldId,
  threeDAssetUrls: "threeDAssetUrls" as FieldId,

  // Step 5: Human distribution
  iwpsPortalUrl: "iwpsPortalUrl" as FieldId,
  platforms: "platforms" as FieldId,

  // Step 6: API endpoint
  endpoint_url: "endpoint.url" as FieldId,
  endpoint_schemaUrl: "endpoint.schemaUrl" as FieldId,
  interfaceVersions: "interfaceVersions" as FieldId,

  // Step 7: MCP
  mcp: "mcp" as FieldId,
} satisfies Record<string, FieldId>;

/**
 * Central catalog of all fields
 */
export const FIELDS: FieldDef[] = [
  // Step 1: Verification
  {
    id: F.did,
    title: "DID",
    description: "Decentralized Identifier for your app",
    widget: "custom",
    step: "verification",
    interfaces: ["human", "api", "smartContract"],
    required: true,
    onChain: true,
  },
  {
    id: F.version,
    title: "Version",
    description: "Semantic version (e.g., 1.0.0)",
    widget: "text",
    step: "verification",
    interfaces: ["human", "api", "smartContract"],
    required: true,
    onChain: true,
    placeholder: "1.0.0",
  },
  {
    id: F.interfaces,
    title: "Interfaces",
    description: "Which types of interfaces does your app support?",
    widget: "custom",
    step: "verification",
    interfaces: ["human", "api", "smartContract"],
    required: true,
    onChain: true,
  },
  {
    id: F.apiType,
    title: "API Type",
    description: "What type of API does your app provide?",
    widget: "select",
    step: "verification",
    interfaces: ["api"],
    required: (flags) => flags.api,
    onChain: false,
    options: [
      { value: "openapi", label: "OpenAPI / REST" },
      { value: "graphql", label: "GraphQL" },
      { value: "jsonrpc", label: "JSON-RPC" },
      { value: "mcp", label: "MCP (Model Context Protocol)" },
      { value: "a2a", label: "Agent-to-Agent (A2A)" },
    ],
  },

  // Step 2: On-chain
  {
    id: F.dataUrl,
    title: "Data URL",
    description: "URL to your app's metadata JSON",
    widget: "url",
    step: "onchain",
    interfaces: ["human", "api", "smartContract"],
    required: true,
    onChain: true,
  },
  {
    id: F.contractId,
    title: "Contract ID (CAIP-10)",
    description: "Smart contract address in CAIP-10 format",
    widget: "text",
    step: "onchain",
    interfaces: ["smartContract"],
    required: false,
    onChain: true,
    placeholder: "eip155:1:0x...",
  },
  {
    id: F.fungibleTokenId,
    title: "Token ID (CAIP-19)",
    description: "Fungible token identifier in CAIP-19 format",
    widget: "text",
    step: "onchain",
    interfaces: ["api", "smartContract"],
    required: false,
    onChain: true,
    placeholder: "eip155:1/erc20:0x...",
  },
  {
    id: F.traits,
    title: "Traits",
    description: "Tags for categorization (max 20)",
    widget: "array-simple",
    step: "onchain",
    interfaces: ["human", "api", "smartContract"],
    required: false,
    onChain: true,
  },

  // Step 3: Common metadata
  {
    id: F.name,
    title: "App Name",
    description: "Public name of your application",
    widget: "text",
    step: "common",
    interfaces: ["human", "api", "smartContract"],
    required: true,
    onChain: false,
    placeholder: "My Awesome App",
  },
  {
    id: F.description,
    title: "Description",
    description: "Detailed description of your app",
    widget: "textarea",
    step: "common",
    interfaces: ["human", "api", "smartContract"],
    required: (flags) => flags.human || flags.api || flags.smartContract,
    onChain: false,
  },
  {
    id: F.publisher,
    title: "Publisher",
    description: "Organization or individual publishing this app",
    widget: "text",
    step: "common",
    interfaces: ["human", "api", "smartContract"],
    required: true,
    onChain: false,
  },
  {
    id: F.image,
    title: "Icon URL",
    description: "URL to app icon/logo image",
    widget: "url",
    step: "common",
    interfaces: ["human"],
    required: (flags) => flags.human,
    onChain: false,
    placeholder: "https://...",
  },
  {
    id: F.external_url,
    title: "Marketing URL",
    description: "External marketing or homepage URL",
    widget: "url",
    step: "common",
    interfaces: ["human"],
    required: false,
    onChain: false,
  },
  {
    id: F.summary,
    title: "Summary",
    description: "Brief summary (one sentence)",
    widget: "textarea",
    step: "common",
    interfaces: ["human", "api"],
    required: false,
    onChain: false,
  },
  {
    id: F.legalUrl,
    title: "Legal/Terms URL",
    description: "URL to legal terms or privacy policy",
    widget: "url",
    step: "common",
    interfaces: ["human"],
    required: false,
    onChain: false,
  },
  {
    id: F.supportUrl,
    title: "Support URL",
    description: "URL for user support or documentation",
    widget: "url",
    step: "common",
    interfaces: ["human", "api"],
    required: false,
    onChain: false,
  },

  // Step 4: Human media
  {
    id: F.screenshotUrls,
    title: "Screenshots",
    description: "URLs to app screenshots",
    widget: "array-simple",
    step: "human-media",
    interfaces: ["human"],
    required: (flags) => flags.human,
    onChain: false,
  },
  {
    id: F.videoUrls,
    title: "Videos",
    description: "URLs to demo videos",
    widget: "array-simple",
    step: "human-media",
    interfaces: ["human"],
    required: false,
    onChain: false,
  },
  {
    id: F.threeDAssetUrls,
    title: "3D Assets",
    description: "URLs to 3D model files",
    widget: "array-simple",
    step: "human-media",
    interfaces: ["human"],
    required: false,
    onChain: false,
  },

  // Step 5: Human distribution
  {
    id: F.iwpsPortalUrl,
    title: "IWPS Portal URL",
    description: "URL for IWPS portal launch",
    widget: "url",
    step: "human-distribution",
    interfaces: ["human"],
    required: false,
    onChain: false,
  },
  {
    id: F.platforms,
    title: "Platform Configuration",
    description: "Platform-specific settings and artifacts",
    widget: "custom",
    step: "human-distribution",
    interfaces: ["human"],
    required: false,
    onChain: false,
  },

  // Step 6: API endpoint
  {
    id: F.endpoint_url,
    title: "Endpoint URL",
    description: "API endpoint URL",
    widget: "url",
    step: "api-config",
    interfaces: ["api"],
    required: (flags) => flags.api,
    onChain: false,
  },
  {
    id: F.endpoint_schemaUrl,
    title: "Schema URL",
    description: "URL to OpenAPI/GraphQL schema definition",
    widget: "url",
    step: "api-config",
    interfaces: ["api"],
    required: false,
    onChain: false,
  },
  {
    id: F.interfaceVersions,
    title: "Interface Versions",
    description: "Supported API versions",
    widget: "array-simple",
    step: "api-config",
    interfaces: ["api", "smartContract"],
    required: false,
    onChain: false,
  },

  // Step 7: MCP
  {
    id: F.mcp,
    title: "MCP Configuration",
    description: "Model Context Protocol configuration",
    widget: "custom",
    step: "mcp-config",
    interfaces: ["api"],
    required: false,
    onChain: false,
  },
];

// ============================================================================
// DERIVED TYPES (auto-generated from field catalog)
// ============================================================================

/**
 * NFT interface - automatically derived from field definitions
 * This represents the complete application data structure
 */
export interface NFT {
  // On-chain fields (from contract)
  did: string;
  minter: string;                 // Original creator (immutable, from contract)
  currentOwner: string;           // Current NFT holder (from contract's AppView.currentOwner)
  contractId?: string;
  fungibleTokenId?: string;
  version: string;
  interfaces: number;
  dataUrl: string;
  status: number;

  // Interface flags (for form editing)
  interfaceFlags?: {
    human: boolean;
    api: boolean;
    smartContract: boolean;
  };

  // All metadata fields (flattened, no longer nested)
  name: string;
  description: string;
  publisher: string;
  image: string;
  external_url?: string;
  summary?: string;
  owner?: string; // Owner from metadata JSON (CAIP-10 format, for verification against currentOwner)
  legalUrl?: string;
  supportUrl?: string;
  screenshotUrls: string[];
  videoUrls: string[];
  threeDAssetUrls: string[];
  iwpsPortalUrl?: string;
  platforms?: Record<string, any>;
  artifacts?: Record<string, any>;
  endpoint?: any;
  interfaceVersions?: string[];
  mcp?: any;
  traits: string[];

  // Frontend flags
  hasError?: boolean;
  errorMessage?: string;
}

/**
 * Application status options
 */
export const APP_STATUSES = [
  { value: 0, label: "Active" },
  { value: 1, label: "Deprecated" },
  { value: 2, label: "Replaced" },
] as const;

export const getStatusLabel = (status: number): string => {
  const statusObj = APP_STATUSES.find(s => s.value === status);
  return statusObj?.label || "Unknown";
};

export const getStatusClasses = (status: number): string => {
  return status === 0 ? "bg-green-100 text-green-800" :
         status === 1 ? "bg-red-100 text-red-800" :
         status === 2 ? "bg-yellow-100 text-yellow-800" :
         "bg-gray-100 text-gray-800";
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if the metadata owner matches the current NFT holder
 * @param nft The NFT to verify
 * @returns true if owner is verified, false otherwise
 */
export function isMetadataOwnerVerified(nft: NFT): boolean {
  const metadataOwner = nft.owner;           // CAIP-10 format from metadata JSON
  const contractOwner = nft.currentOwner;    // Plain Ethereum address from contract

  // If no metadata owner or current owner, can't verify
  if (!metadataOwner || !contractOwner) {
    return false;
  }

  // Use CAIP-10 library to extract address from metadata owner
  try {
    const parsed = parseCaip10(metadataOwner);
    
    // If parsing failed, return false
    if (parsed instanceof Error) {
      console.warn('[isMetadataOwnerVerified] Failed to parse CAIP-10 owner:', parsed.message);
      return false;
    }
    
    // Extract the address component from CAIP-10
    const metadataAddress = parsed.address;
    
    // Compare addresses (case-insensitive)
    return metadataAddress.toLowerCase() === contractOwner.toLowerCase();
  } catch (error) {
    console.error('[isMetadataOwnerVerified] Error parsing CAIP-10 owner:', error);
    return false;
  }
}

/**
 * Get field definition by ID
 */
export function getField(id: FieldId): FieldDef | undefined {
  return FIELDS.find((f) => f.id === id);
}

/**
 * Get all fields for a specific step
 */
export function getFieldsForStep(stepId: string): FieldDef[] {
  return FIELDS.filter((f) => f.step === stepId);
}

/**
 * Get fields visible for given interface flags
 */
export function getVisibleFields(
  stepId: string,
  interfaceFlags: TFormState["interfaceFlags"]
): FieldDef[] {
  const stepFields = getFieldsForStep(stepId);
  return stepFields.filter((field) => {
    return field.interfaces.some((iface) => interfaceFlags[iface]);
  });
}

/**
 * Check if a field is required given current interface flags
 */
export function isFieldRequired(
  field: FieldDef,
  interfaceFlags: TFormState["interfaceFlags"]
): boolean {
  if (typeof field.required === "boolean") {
    return field.required;
  }
  return field.required(interfaceFlags);
}

/**
 * Get all on-chain fields (for contract calls)
 */
export function getOnChainFields(): FieldDef[] {
  return FIELDS.filter((f) => f.onChain);
}

/**
 * Get all off-chain fields (for metadata JSON)
 */
export function getOffChainFields(): FieldDef[] {
  return FIELDS.filter((f) => !f.onChain);
}

/**
 * Get fields by storage category
 */
export function getFieldsByStorage(onChain: boolean): FieldDef[] {
  return FIELDS.filter((f) => f.onChain === onChain);
}
