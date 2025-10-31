import { describe, it, expect } from 'vitest';
import { lintRegistry, assertValidRegistry } from '@/lib/wizard/linter';
import type { StepDef, RegistryMeta } from '@/lib/wizard/types';

describe('Wizard Linter', () => {
  const baseMeta: RegistryMeta = {
    version: 1,
    lastUpdated: new Date().toISOString(),
  };

  describe('lintRegistry', () => {
    // Tests valid registry with no issues
    it('returns empty array for valid registry', () => {
      const steps: StepDef[] = [
        {
          id: 'step1',
          title: 'Step 1',
          fields: ['field1', 'field2'],
          Component: () => null,
        },
        {
          id: 'step2',
          title: 'Step 2',
          fields: ['field3'],
          dependsOn: ['step1'],
          Component: () => null,
        },
      ];

      const issues = lintRegistry(steps, baseMeta);
      expect(issues).toEqual([]);
    });

    // Tests detection of duplicate step IDs
    it('detects duplicate step IDs', () => {
      const steps: StepDef[] = [
        {
          id: 'step1',
          title: 'Step 1',
          fields: ['field1'],
          Component: () => null,
        },
        {
          id: 'step1', // Duplicate!
          title: 'Step 1 Copy',
          fields: ['field2'],
          Component: () => null,
        },
      ];

      const issues = lintRegistry(steps, baseMeta);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('Duplicate step ID: step1');
      expect(issues[0].stepId).toBe('step1');
    });

    // Tests detection of overlapping field ownership
    it('detects overlapping field ownership', () => {
      const steps: StepDef[] = [
        {
          id: 'step1',
          title: 'Step 1',
          fields: ['sharedField'],
          Component: () => null,
        },
        {
          id: 'step2',
          title: 'Step 2',
          fields: ['sharedField'], // Same field!
          Component: () => null,
        },
      ];

      const issues = lintRegistry(steps, baseMeta);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('Field "sharedField"');
      expect(issues[0].message).toContain('owned by both');
    });

    // Tests detection of invalid dependencies
    it('detects dependencies on non-existent steps', () => {
      const steps: StepDef[] = [
        {
          id: 'step1',
          title: 'Step 1',
          fields: ['field1'],
          dependsOn: ['nonexistent'], // Invalid dependency!
          Component: () => null,
        },
      ];

      const issues = lintRegistry(steps, baseMeta);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('depends on non-existent step');
      expect(issues[0].message).toContain('nonexistent');
    });

    // Tests detection of circular dependencies
    it('detects self-referencing dependencies', () => {
      const steps: StepDef[] = [
        {
          id: 'step1',
          title: 'Step 1',
          fields: ['field1'],
          dependsOn: ['step1'], // Circular!
          Component: () => null,
        },
      ];

      const issues = lintRegistry(steps, baseMeta);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('cannot depend on itself');
    });

    // Tests warning for version 0
    it('warns when registry version is 0', () => {
      const steps: StepDef[] = [
        {
          id: 'step1',
          title: 'Step 1',
          fields: ['field1'],
          Component: () => null,
        },
      ];

      const meta: RegistryMeta = { version: 0, lastUpdated: new Date().toISOString() };
      const issues = lintRegistry(steps, meta);
      
      expect(issues.length).toBeGreaterThan(0);
      const warning = issues.find(i => i.severity === 'warning');
      expect(warning).toBeDefined();
      expect(warning?.message).toContain('Registry version is 0');
    });

    // Tests multiple errors at once
    it('detects multiple issues in one pass', () => {
      const steps: StepDef[] = [
        {
          id: 'step1',
          title: 'Step 1',
          fields: ['field1'],
          dependsOn: ['step1'], // Self-reference
          Component: () => null,
        },
        {
          id: 'step1', // Duplicate
          title: 'Step 1 Copy',
          fields: ['field1'], // Overlapping field
          Component: () => null,
        },
      ];

      const issues = lintRegistry(steps, { version: 0, lastUpdated: '' });
      
      // Should find: duplicate ID, overlapping field, self-reference, version 0
      expect(issues.length).toBeGreaterThanOrEqual(3);
    });

    // Tests valid complex registry
    it('validates complex multi-step registry correctly', () => {
      const steps: StepDef[] = [
        {
          id: 'verification',
          title: 'Verification',
          fields: ['did', 'name', 'version'],
          Component: () => null,
        },
        {
          id: 'onchain',
          title: 'On-chain',
          fields: ['chainId'],
          dependsOn: ['verification'],
          Component: () => null,
        },
        {
          id: 'metadata',
          title: 'Metadata',
          fields: ['description', 'image'],
          dependsOn: ['verification'],
          Component: () => null,
        },
        {
          id: 'review',
          title: 'Review',
          fields: [],
          dependsOn: ['verification', 'onchain', 'metadata'],
          Component: () => null,
        },
      ];

      const issues = lintRegistry(steps, baseMeta);
      
      // Should have no errors
      const errors = issues.filter(i => i.severity === 'error');
      expect(errors).toEqual([]);
    });
  });

  describe('assertValidRegistry', () => {
    // Tests assertion passes for valid registry
    it('does not throw for valid registry', () => {
      const steps: StepDef[] = [
        {
          id: 'step1',
          title: 'Step 1',
          fields: ['field1'],
          Component: () => null,
        },
      ];

      expect(() => assertValidRegistry(steps, baseMeta)).not.toThrow();
    });

    // Tests assertion throws for invalid registry
    it('throws for registry with errors', () => {
      const steps: StepDef[] = [
        {
          id: 'step1',
          title: 'Step 1',
          fields: ['field1'],
          dependsOn: ['nonexistent'],
          Component: () => null,
        },
      ];

      expect(() => assertValidRegistry(steps, baseMeta)).toThrow('Registry validation failed');
    });

    // Tests assertion includes all error messages
    it('includes all error messages in thrown error', () => {
      const steps: StepDef[] = [
        {
          id: 'step1',
          title: 'Step 1',
          fields: ['shared'],
          Component: () => null,
        },
        {
          id: 'step2',
          title: 'Step 2',
          fields: ['shared'], // Overlapping
          dependsOn: ['missing'], // Invalid dependency
          Component: () => null,
        },
      ];

      try {
        assertValidRegistry(steps, baseMeta);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('owned by both');
        expect(error.message).toContain('non-existent step');
      }
    });

    // Tests assertion ignores warnings
    it('does not throw for warnings only', () => {
      const steps: StepDef[] = [
        {
          id: 'step1',
          title: 'Step 1',
          fields: ['field1'],
          Component: () => null,
        },
      ];

      const meta: RegistryMeta = { version: 0, lastUpdated: '' }; // Will trigger warning
      
      // Should not throw - warnings don't fail assertion
      expect(() => assertValidRegistry(steps, meta)).not.toThrow();
    });
  });
});

