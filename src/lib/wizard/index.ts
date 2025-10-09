/**
 * Wizard step registry - main export
 * 
 * Import from here to use the wizard engine:
 * 
 * ```ts
 * import { ALL_STEPS, visibleSteps, validateStep } from "@/lib/wizard";
 * ```
 */

// Core types
export type {
  InterfaceFlags,
  StepStatus,
  GuardResult,
  StepRenderContext,
  StepDef,
  RegistryMeta,
} from "./types";

// Registry
export { ALL_STEPS, REGISTRY_META } from "./registry";

// Engine functions
export {
  visibleSteps,
  validateStep,
  composeSchemas,
  validateWholeForm,
  routeIssuesToSteps,
  canEnterStep,
  areDependenciesSatisfied,
} from "./engine";

// Status store
export { useStepStatusStore } from "./store";

// Linter (dev only)
export { lintRegistry, assertValidRegistry } from "./linter";
export type { LintIssue } from "./linter";
