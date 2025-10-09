/**
 * Core types for the wizard step registry
 * 
 * This defines the type system for declarative, schema-driven wizard steps.
 */

import type { ReactNode } from "react";
import type { z } from "zod";

/** Interface flags determine which steps are visible */
export type InterfaceFlags = {
  human: boolean;
  api: boolean;
  smartContract: boolean;
};

/** Step execution status (separate from form validation) */
export type StepStatus = "idle" | "checking" | "ready" | "error";

/** Result from a step guard check */
export type GuardResult =
  | { ok: true }
  | {
      ok: false;
      reason: string;
      /** Optional retry function for async checks */
      retry?: () => Promise<GuardResult>;
    };

/** Context passed to step renderers */
export type StepRenderContext = {
  /** Form state value (read-only in renderer) */
  state: any;
  /** Update form field */
  updateField: (path: string, value: any) => void;
  /** Current step execution status */
  status: StepStatus;
  /** Set step execution status */
  setStatus: (status: StepStatus) => void;
  /** Form errors for this step's fields */
  errors?: Record<string, string>;
};

/**
 * Step definition - the single source of truth for each wizard step
 * 
 * Each step declares:
 * - Which interfaces it applies to (undefined = always visible)
 * - Fields it owns (for validation & error routing)
 * - Zod schema for validation
 * - Guard conditions (e.g., verification must be complete)
 * - Render function
 */
export type StepDef<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  /** Unique step identifier (used for status tracking, routing) */
  id: string;

  /** Display title */
  title: string;

  /** Short description (optional, for step indicator tooltips) */
  description?: string;

  /** Which interfaces this step applies to; undefined = always visible */
  appliesTo?: (flags: InterfaceFlags) => boolean;

  /** 
   * Fields this step owns (dot-notation paths in form state)
   * Used for error routing and validation scoping
   */
  fields: string[];

  /**
   * Optional dependencies on other steps
   * Engine will prevent entering this step if dependencies aren't valid
   */
  dependsOn?: string[];

  /**
   * Zod schema for ONLY this step's fields
   * Will be composed into full schema at Review step
   */
  schema?: TSchema;

  /**
   * Guard function - hard gate before entering/leaving this step
   * Example: Step 0 requires verification.status === "ready"
   * 
   * @param state - Full form state
   * @returns GuardResult with ok status and optional reason/retry
   */
  guard?: (state: any) => GuardResult | Promise<GuardResult>;

  /**
   * Render function for this step's UI
   * Gets form methods and step-specific helpers
   */
  render: (ctx: StepRenderContext) => ReactNode;
};

/** Registry metadata */
export type RegistryMeta = {
  /** Registry version for migration tracking */
  version: number;
  /** When this registry was last modified */
  lastModified: string;
};
