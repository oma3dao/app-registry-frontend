/**
 * Registry linter - validates step definitions at build time
 * 
 * Catches common mistakes like duplicate IDs, overlapping fields, etc.
 */

import type { StepDef, RegistryMeta } from "./types";

export type LintIssue = {
  severity: "error" | "warning";
  stepId?: string;
  message: string;
};

/**
 * Lint the step registry for common issues
 * 
 * @param steps - All registered steps
 * @param meta - Registry metadata
 * @returns Array of lint issues (empty if valid)
 */
export function lintRegistry(
  steps: StepDef[],
  meta: RegistryMeta
): LintIssue[] {
  const issues: LintIssue[] = [];

  // Check for duplicate step IDs
  const ids = new Set<string>();
  for (const step of steps) {
    if (ids.has(step.id)) {
      issues.push({
        severity: "error",
        stepId: step.id,
        message: `Duplicate step ID: ${step.id}`,
      });
    }
    ids.add(step.id);
  }

  // Check for overlapping field ownership
  const fieldOwnership = new Map<string, string>();
  for (const step of steps) {
    for (const field of step.fields) {
      const existing = fieldOwnership.get(field);
      if (existing) {
        issues.push({
          severity: "error",
          stepId: step.id,
          message: `Field "${field}" is owned by both "${existing}" and "${step.id}"`,
        });
      }
      fieldOwnership.set(field, step.id);
    }
  }

  // Check for invalid dependencies
  for (const step of steps) {
    if (step.dependsOn) {
      for (const depId of step.dependsOn) {
        if (!ids.has(depId)) {
          issues.push({
            severity: "error",
            stepId: step.id,
            message: `Step "${step.id}" depends on non-existent step "${depId}"`,
          });
        }
      }
    }
  }

  // Check for circular dependencies (simple check)
  for (const step of steps) {
    if (step.dependsOn?.includes(step.id)) {
      issues.push({
        severity: "error",
        stepId: step.id,
        message: `Step "${step.id}" cannot depend on itself`,
      });
    }
  }

  // Warn if registry version is 0 (not initialized)
  if (meta.version === 0) {
    issues.push({
      severity: "warning",
      message: "Registry version is 0. Consider setting an initial version.",
    });
  }

  return issues;
}

/**
 * Assert registry is valid (throws if not)
 * Use this in development/tests
 */
export function assertValidRegistry(
  steps: StepDef[],
  meta: RegistryMeta
): void {
  const issues = lintRegistry(steps, meta);
  const errors = issues.filter((i) => i.severity === "error");

  if (errors.length > 0) {
    const errorMessages = errors.map((e) => e.message).join("\n  - ");
    throw new Error(`Registry validation failed:\n  - ${errorMessages}`);
  }
}
