import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  visibleSteps,
  validateStep,
  composeSchemas,
  validateWholeForm,
  routeIssuesToSteps,
  canEnterStep,
  areDependenciesSatisfied,
} from '@/lib/wizard/engine';
import type { StepDef, InterfaceFlags } from '@/lib/wizard/types';

describe('Wizard Engine', () => {
  describe('visibleSteps', () => {
    // Tests filtering steps based on interface flags
    it('returns all steps when no appliesTo conditions', () => {
      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: [], Component: () => null },
        { id: 'step2', title: 'Step 2', fields: [], Component: () => null },
      ];
      const interfaces: InterfaceFlags = { human: true, api: false, smartContract: false };

      const visible = visibleSteps(steps, interfaces);

      expect(visible).toHaveLength(2);
      expect(visible).toEqual(steps);
    });

    // Tests filtering based on appliesTo conditions
    it('filters steps based on appliesTo function', () => {
      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: [], Component: () => null },
        {
          id: 'step2',
          title: 'API Only',
          fields: [],
          appliesTo: (flags) => flags.api,
          Component: () => null,
        },
        {
          id: 'step3',
          title: 'Human Only',
          fields: [],
          appliesTo: (flags) => flags.human,
          Component: () => null,
        },
      ];

      const humanOnly: InterfaceFlags = { human: true, api: false, smartContract: false };
      const visibleHuman = visibleSteps(steps, humanOnly);

      expect(visibleHuman).toHaveLength(2);
      expect(visibleHuman.find(s => s.id === 'step2')).toBeUndefined();
      expect(visibleHuman.find(s => s.id === 'step3')).toBeDefined();

      const apiOnly: InterfaceFlags = { human: false, api: true, smartContract: false };
      const visibleApi = visibleSteps(steps, apiOnly);

      expect(visibleApi).toHaveLength(2);
      expect(visibleApi.find(s => s.id === 'step2')).toBeDefined();
      expect(visibleApi.find(s => s.id === 'step3')).toBeUndefined();
    });

    // Tests complex appliesTo conditions
    it('handles complex appliesTo conditions', () => {
      const steps: StepDef[] = [
        {
          id: 'api-or-contract',
          title: 'API or Contract',
          fields: [],
          appliesTo: (flags) => flags.api || flags.smartContract,
          Component: () => null,
        },
      ];

      expect(visibleSteps(steps, { human: true, api: false, smartContract: false })).toHaveLength(0);
      expect(visibleSteps(steps, { human: false, api: true, smartContract: false })).toHaveLength(1);
      expect(visibleSteps(steps, { human: false, api: false, smartContract: true })).toHaveLength(1);
      expect(visibleSteps(steps, { human: true, api: true, smartContract: true })).toHaveLength(1);
    });
  });

  describe('validateStep', () => {
    // Tests validation with no schema (always passes)
    it('returns ok when step has no schema', () => {
      const step: StepDef = { id: 'step1', title: 'Step 1', fields: [], Component: () => null };
      const state = {};

      const result = validateStep(step, state);

      expect(result.ok).toBe(true);
    });

    // Tests successful validation with schema
    it('validates successfully with valid data', () => {
      const schema = z.object({
        name: z.string().min(1),
        version: z.string(),
      });

      const step: StepDef = {
        id: 'step1',
        title: 'Step 1',
        fields: ['name', 'version'],
        schema,
        Component: () => null,
      };

      const state = { name: 'Test App', version: '1.0.0' };
      const result = validateStep(step, state);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBeDefined();
      }
    });

    // Tests validation failure
    it('returns issues when validation fails', () => {
      const schema = z.object({
        name: z.string().min(1),
        version: z.string().regex(/^\d+\.\d+/),
      });

      const step: StepDef = {
        id: 'step1',
        title: 'Step 1',
        fields: ['name', 'version'],
        schema,
        Component: () => null,
      };

      const state = { name: '', version: 'invalid' };
      const result = validateStep(step, state);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });

    // Tests partial state validation
    it('validates only step-specific fields', () => {
      const schema = z.object({
        name: z.string().min(1),
      });

      const step: StepDef = {
        id: 'step1',
        title: 'Step 1',
        fields: ['name'],
        schema,
        Component: () => null,
      };

      const state = { name: 'Valid', otherField: 'ignored' };
      const result = validateStep(step, state);

      expect(result.ok).toBe(true);
    });
  });

  describe('composeSchemas', () => {
    // Tests composition of multiple schemas
    it('composes multiple schemas correctly', () => {
      const schema1 = z.object({ name: z.string() });
      const schema2 = z.object({ version: z.string() });

      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: ['name'], schema: schema1, Component: () => null },
        { id: 'step2', title: 'Step 2', fields: ['version'], schema: schema2, Component: () => null },
      ];

      const composed = composeSchemas(steps);

      // Composed schema should validate both fields
      const valid = composed.safeParse({ name: 'Test', version: '1.0' });
      const invalid = composed.safeParse({ name: 'Test' }); // Missing version

      expect(valid.success).toBe(true);
      expect(invalid.success).toBe(false);
    });

    // Tests handling empty schema list
    it('returns empty object schema when no schemas provided', () => {
      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: [], Component: () => null },
      ];

      const composed = composeSchemas(steps);

      // Should accept any object
      const result = composed.safeParse({});
      expect(result.success).toBe(true);
    });

    // Tests filtering steps without schemas
    it('ignores steps without schemas', () => {
      const schema1 = z.object({ name: z.string() });

      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: ['name'], schema: schema1, Component: () => null },
        { id: 'step2', title: 'Step 2', fields: ['other'], Component: () => null }, // No schema
      ];

      const composed = composeSchemas(steps);

      // Should only validate fields from step1
      expect(composed.safeParse({ name: 'Test' }).success).toBe(true);
      expect(composed.safeParse({}).success).toBe(false);
    });
  });

  describe('validateWholeForm', () => {
    // Tests successful whole form validation
    it('validates entire form successfully', () => {
      const schema1 = z.object({ name: z.string().min(1) });
      const schema2 = z.object({ version: z.string() });

      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: ['name'], schema: schema1, Component: () => null },
        { id: 'step2', title: 'Step 2', fields: ['version'], schema: schema2, Component: () => null },
      ];

      const state = { name: 'Test App', version: '1.0.0' };
      const result = validateWholeForm(steps, state);

      expect(result.ok).toBe(true);
    });

    // Tests whole form validation failure
    it('returns issues when form is invalid', () => {
      const schema1 = z.object({ name: z.string().min(1) });
      const schema2 = z.object({ version: z.string().regex(/^\d/) });

      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: ['name'], schema: schema1, Component: () => null },
        { id: 'step2', title: 'Step 2', fields: ['version'], schema: schema2, Component: () => null },
      ];

      const state = { name: '', version: 'invalid' };
      const result = validateWholeForm(steps, state);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('routeIssuesToSteps', () => {
    // Tests routing issues to correct steps
    it('routes issues to owning steps', () => {
      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: ['name', 'version'], Component: () => null },
        { id: 'step2', title: 'Step 2', fields: ['description'], Component: () => null },
      ];

      const issues: z.ZodIssue[] = [
        { code: 'invalid_type', path: ['name'], message: 'Required', expected: 'string', received: 'undefined' },
        { code: 'invalid_type', path: ['description'], message: 'Required', expected: 'string', received: 'undefined' },
      ];

      const routed = routeIssuesToSteps(issues, steps);

      expect(routed['step1']).toHaveLength(1);
      expect(routed['step1'][0].path).toEqual(['name']);
      expect(routed['step2']).toHaveLength(1);
      expect(routed['step2'][0].path).toEqual(['description']);
    });

    // Tests handling nested field paths
    it('handles nested field paths', () => {
      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: ['metadata'], Component: () => null },
      ];

      const issues: z.ZodIssue[] = [
        { code: 'invalid_type', path: ['metadata', 'image'], message: 'Invalid', expected: 'string', received: 'number' },
      ];

      const routed = routeIssuesToSteps(issues, steps);

      expect(routed['step1']).toHaveLength(1);
    });

    // Tests issues for unknown fields
    it('ignores issues for fields not owned by any step', () => {
      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: ['name'], Component: () => null },
      ];

      const issues: z.ZodIssue[] = [
        { code: 'invalid_type', path: ['unknownField'], message: 'Error', expected: 'string', received: 'undefined' },
      ];

      const routed = routeIssuesToSteps(issues, steps);

      expect(Object.keys(routed)).toHaveLength(0);
    });

    // Tests multiple issues per step
    it('groups multiple issues for same step', () => {
      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: ['name', 'version', 'did'], Component: () => null },
      ];

      const issues: z.ZodIssue[] = [
        { code: 'invalid_type', path: ['name'], message: 'Required', expected: 'string', received: 'undefined' },
        { code: 'invalid_type', path: ['version'], message: 'Required', expected: 'string', received: 'undefined' },
        { code: 'invalid_type', path: ['did'], message: 'Required', expected: 'string', received: 'undefined' },
      ];

      const routed = routeIssuesToSteps(issues, steps);

      expect(routed['step1']).toHaveLength(3);
    });
  });

  describe('canEnterStep', () => {
    // Tests step with no guard (always allowed)
    it('allows entry when step has no guard', async () => {
      const step: StepDef = { id: 'step1', title: 'Step 1', fields: [], Component: () => null };
      const state = {};

      const result = await canEnterStep(step, state);

      expect(result.ok).toBe(true);
    });

    // Tests synchronous guard that passes
    it('allows entry when sync guard passes', async () => {
      const step: StepDef = {
        id: 'step1',
        title: 'Step 1',
        fields: [],
        guard: (state) => ({ ok: true }),
        Component: () => null,
      };

      const result = await canEnterStep(step, {});

      expect(result.ok).toBe(true);
    });

    // Tests synchronous guard that fails
    it('blocks entry when sync guard fails', async () => {
      const step: StepDef = {
        id: 'step1',
        title: 'Step 1',
        fields: [],
        guard: (state) => ({ ok: false, reason: 'Not allowed' }),
        Component: () => null,
      };

      const result = await canEnterStep(step, {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('Not allowed');
      }
    });

    // Tests asynchronous guard that passes
    it('allows entry when async guard passes', async () => {
      const step: StepDef = {
        id: 'step1',
        title: 'Step 1',
        fields: [],
        guard: async (state) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { ok: true };
        },
        Component: () => null,
      };

      const result = await canEnterStep(step, {});

      expect(result.ok).toBe(true);
    });

    // Tests asynchronous guard that fails
    it('blocks entry when async guard fails', async () => {
      const step: StepDef = {
        id: 'step1',
        title: 'Step 1',
        fields: [],
        guard: async (state) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { ok: false, reason: 'Async check failed' };
        },
        Component: () => null,
      };

      const result = await canEnterStep(step, {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('Async check failed');
      }
    });

    // Tests guard with state access
    it('passes state to guard function', async () => {
      let receivedState: any = null;

      const step: StepDef = {
        id: 'step1',
        title: 'Step 1',
        fields: [],
        guard: (state) => {
          receivedState = state;
          return { ok: true };
        },
        Component: () => null,
      };

      const testState = { name: 'Test' };
      await canEnterStep(step, testState);

      expect(receivedState).toEqual(testState);
    });
  });

  describe('areDependenciesSatisfied', () => {
    // Tests step with no dependencies
    it('returns ok when step has no dependencies', () => {
      const step: StepDef = { id: 'step1', title: 'Step 1', fields: [], Component: () => null };
      const steps: StepDef[] = [step];

      const result = areDependenciesSatisfied(step, steps, {});

      expect(result.ok).toBe(true);
    });

    // Tests satisfied dependencies
    it('returns ok when all dependencies are satisfied', () => {
      const schema1 = z.object({ name: z.string().min(1) });

      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: ['name'], schema: schema1, Component: () => null },
        { id: 'step2', title: 'Step 2', fields: ['version'], dependsOn: ['step1'], Component: () => null },
      ];

      const state = { name: 'Valid Name' };
      const result = areDependenciesSatisfied(steps[1], steps, state);

      expect(result.ok).toBe(true);
    });

    // Tests unsatisfied dependencies
    it('returns failure when dependency is not satisfied', () => {
      const schema1 = z.object({ name: z.string().min(1) });

      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: ['name'], schema: schema1, Component: () => null },
        { id: 'step2', title: 'Step 2', fields: ['version'], dependsOn: ['step1'], Component: () => null },
      ];

      const state = { name: '' }; // Invalid
      const result = areDependenciesSatisfied(steps[1], steps, state);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('Complete these steps first');
        expect(result.reason).toContain('Step 1');
      }
    });

    // Tests missing dependency step
    it('handles non-existent dependency steps', () => {
      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: [], dependsOn: ['nonexistent'], Component: () => null },
      ];

      const result = areDependenciesSatisfied(steps[0], steps, {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('not found');
      }
    });

    // Tests multiple dependencies
    it('validates all dependencies', () => {
      const schema1 = z.object({ name: z.string().min(1) });
      const schema2 = z.object({ version: z.string().min(1) }); // Require non-empty version

      const steps: StepDef[] = [
        { id: 'step1', title: 'Step 1', fields: ['name'], schema: schema1, Component: () => null },
        { id: 'step2', title: 'Step 2', fields: ['version'], schema: schema2, Component: () => null },
        { id: 'step3', title: 'Step 3', fields: [], dependsOn: ['step1', 'step2'], Component: () => null },
      ];

      // Both dependencies satisfied
      const validState = { name: 'Valid', version: '1.0' };
      expect(areDependenciesSatisfied(steps[2], steps, validState).ok).toBe(true);

      // One dependency unsatisfied (empty version should fail)
      const invalidState = { name: 'Valid', version: '' };
      const result = areDependenciesSatisfied(steps[2], steps, invalidState);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('Step 2');
      }
    });

    // Tests empty dependencies array
    it('returns ok when dependencies array is empty', () => {
      const step: StepDef = {
        id: 'step1',
        title: 'Step 1',
        fields: [],
        dependsOn: [],
        Component: () => null,
      };

      const result = areDependenciesSatisfied(step, [step], {});

      expect(result.ok).toBe(true);
    });
  });
});

