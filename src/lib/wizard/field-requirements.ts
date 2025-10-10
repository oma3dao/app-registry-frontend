import type { InterfaceFlags } from "./types";

/**
 * Central registry of field requirements per interface type.
 * Keyed by dot-paths in the form state.
 */
export const FIELD_REQUIREMENTS: Record<string, { human: boolean; api: boolean; smartContract: boolean }> = {
  // Step 1 - Verification
  "did":                  { human: true,  api: true,  smartContract: true },
  "version":              { human: true,  api: true,  smartContract: true },
  "name":                 { human: true,  api: true,  smartContract: true },
  // interfaceFlags are configuration flags, not required inputs

  // Step 2 - Onchain
  "dataUrl":                { human: true,  api: true,  smartContract: true },
  "contractId":             { human: false, api: false, smartContract: false },
  "fungibleTokenId":        { human: false, api: false, smartContract: false },
  "traits":                 { human: false, api: false, smartContract: false },

  // Step 3 - Common Offchain
  "metadata.description":    { human: true,  api: true,  smartContract: true },
  "metadata.external_url":   { human: false, api: false, smartContract: false },
  "metadata.image":          { human: true,  api: false, smartContract: false },
  "metadata.summary":        { human: false, api: false, smartContract: false }, // optional by default
  "metadata.publisher":      { human: true,  api: true,  smartContract: true }, // optional by default
  "metadata.legalUrl":       { human: false, api: false, smartContract: false }, // optional by default
  "metadata.supportUrl":     { human: false, api: false, smartContract: false }, // optional by default

  // Step 4 - Human Media
  "metadata.screenshotUrls": { human: true,  api: false, smartContract: false },
  "metadata.videoUrls":      { human: false, api: false, smartContract: false }, // Optional
  "metadata.threeDAssetUrls":{ human: false, api: false, smartContract: false }, // Optional

  // Step 5 - Human Distribution
  "iwpsPortalUrl":           { human: false, api: false, smartContract: false },
  // Note: platforms requirement is composite; enforced in schema that at least one URL exists
  
  // Step 7 - Endpoint Configuration (API & Smart Contract)
  "metadata.endpoint":       { human: false, api: true,  smartContract: false }, // Endpoint required for API, optional for contract
  "metadata.endpoint.url":   { human: false, api: true,  smartContract: false }, // Endpoint URL required for API
  "metadata.endpoint.schemaUrl":{ human: false, api: false, smartContract: false }, // Schema URL optional
  "metadata.interfaceVersions":{ human: false, api: false, smartContract: false }, // Optional for APIs only
  "metadata.mcp":            { human: false, api: false, smartContract: false }, // MCP optional (only for MCP type)
};

export function isFieldRequired(fieldPath: string, flags?: InterfaceFlags): boolean {
  if (!flags) return false;
  const rule = FIELD_REQUIREMENTS[fieldPath];
  if (!rule) return false;
  return (rule.human && flags.human) || (rule.api && flags.api) || (rule.smartContract && flags.smartContract);
}

/**
 * Safe getter for nested values using a dot-path
 */
export function getByPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

