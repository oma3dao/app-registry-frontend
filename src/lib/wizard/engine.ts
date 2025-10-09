/**
 * Wizard engine - handles step visibility, validation, and navigation logic
 * 
 * This is the runtime that consumes step definitions from the registry.
 */

import type { z } from "zod";
import type { StepDef, InterfaceFlags, GuardResult } from "./types";

/**
 * Filter steps based on interface flags
 * 
 * @param steps - All registered steps
 * @param interfaces - Current interface flags
 * @returns Visible steps in order
 */
export function visibleSteps(
  steps: StepDef[],
  interfaces: InterfaceFlags
): StepDef[] {
  return steps.filter((step) => !step.appliesTo || step.appliesTo(interfaces));
}

/**
 * Validate a single step using its schema
 * 
 * @param step - Step definition
 * @param state - Full form state
 * @returns Validation result with issues (if any)
 */
export function validateStep(
  step: StepDef,
  state: any
): { ok: true; data?: any } | { ok: false; issues: z.ZodIssue[] } {
  if (!step.schema) {
    return { ok: true };
  }

  const result = step.schema.safeParse(state);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  return { ok: false, issues: result.error.issues };
}

/**
 * Compose multiple step schemas into a single schema for full-form validation
 * Used at Review step to validate entire form
 * 
 * @param steps - Steps to compose schemas from
 * @returns Merged Zod schema
 */
export function composeSchemas(steps: StepDef[]): z.ZodTypeAny {
  const schemasToCompose = steps
    .filter((step) => step.schema)
    .map((step) => step.schema!) as z.ZodTypeAny[];

  if (schemasToCompose.length === 0) {
    // Return a pass-through schema
    return require("zod").z.object({});
  }

  // Merge all schemas using Zod's merge
  return schemasToCompose.reduce((acc, schema) => {
    // @ts-ignore - Zod merge is complex to type correctly
    return acc.merge ? acc.merge(schema) : schema;
  });
}

/**
 * Validate the entire form using composed schemas
 * 
 * @param steps - All visible steps
 * @param state - Full form state
 * @returns Validation result
 */
export function validateWholeForm(
  steps: StepDef[],
  state: any
): { ok: true; data?: any } | { ok: false; issues: z.ZodIssue[] } {
  const composedSchema = composeSchemas(steps);
  const result = composedSchema.safeParse(state);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  return { ok: false, issues: result.error.issues };
}

/**
 * Route validation issues to their owning steps
 * Used for showing error badges on step indicators
 * 
 * @param issues - Zod validation issues
 * @param steps - All steps (to lookup field ownership)
 * @returns Map of step ID to issues affecting that step
 */
export function routeIssuesToSteps(
  issues: z.ZodIssue[],
  steps: StepDef[]
): Record<string, z.ZodIssue[]> {
  const routedIssues: Record<string, z.ZodIssue[]> = {};

  for (const issue of issues) {
    const path = issue.path.join(".");

    // Find which step owns this field
    const owningStep = steps.find((step) =>
      step.fields.some((field) => path.startsWith(field))
    );

    if (owningStep) {
      if (!routedIssues[owningStep.id]) {
        routedIssues[owningStep.id] = [];
      }
      routedIssues[owningStep.id].push(issue);
    }
  }

  return routedIssues;
}

/**
 * Check if a step's guard allows entry
 * 
 * @param step - Step definition
 * @param state - Full form state
 * @returns Guard result (sync or async)
 */
export async function canEnterStep(
  step: StepDef,
  state: any
): Promise<GuardResult> {
  if (!step.guard) {
    return { ok: true };
  }

  const result = step.guard(state);

  // Handle async guards
  if (result instanceof Promise) {
    return await result;
  }

  return result;
}

/**
 * Check if all dependencies for a step are satisfied
 * 
 * @param step - Step definition
 * @param steps - All steps
 * @param state - Full form state
 * @returns True if dependencies are satisfied
 */
export function areDependenciesSatisfied(
  step: StepDef,
  steps: StepDef[],
  state: any
): { ok: true } | { ok: false; reason: string } {
  if (!step.dependsOn || step.dependsOn.length === 0) {
    return { ok: true };
  }

  const failedDeps: string[] = [];

  for (const depId of step.dependsOn) {
    const depStep = steps.find((s) => s.id === depId);
    if (!depStep) {
      failedDeps.push(`${depId} (not found)`);
      continue;
    }

    const validation = validateStep(depStep, state);
    if (!validation.ok) {
      failedDeps.push(depStep.title);
    }
  }

  if (failedDeps.length > 0) {
    return {
      ok: false,
      reason: `Complete these steps first: ${failedDeps.join(", ")}`,
    };
  }

  return { ok: true };
}
