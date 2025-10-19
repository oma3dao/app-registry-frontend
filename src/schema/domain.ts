/**
 * Domain Schema - Single Source of Truth for App Data
 *
 * This file defines the canonical data model for applications in the OMA3 Registry.
 * It separates on-chain (contract) data from off-chain (metadata) data.
 *
 * IMPORTANT: This is DOMAIN data only - no UI state here!
 * UI state (like verification status, edit mode) lives in schema/ui.ts
 */

// Re-export everything from the unified data model for backwards compatibility
export * from "./data-model";

// Re-export legacy types for backwards compatibility
export type { TOnChainApp, TOffChainMetadata, TDomainForm, TUIState, TFormState } from "./data-model";
export { OnChainApp, OffChainMetadata, DomainForm, UIState, FormState, defaultUIState, defaultFormState } from "./data-model";
export { toDomain, fromDomain } from "./data-model";
export { FIELDS, F, getField, getFieldsForStep, getVisibleFields, isFieldRequired, getOnChainFields, getOffChainFields, getFieldsByStorage } from "./data-model";
export * from "./mapping";
export * from "./ui";
