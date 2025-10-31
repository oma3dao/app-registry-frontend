import { describe, it, expect } from 'vitest';
import type {
  InterfaceFlags,
  StepStatus,
  GuardResult,
  StepRenderContext,
  StepDef,
  RegistryMeta,
} from '@/lib/wizard/types';

describe('Wizard Types', () => {
  describe('InterfaceFlags', () => {
    it('defines interface flags interface', () => {
      const flags: InterfaceFlags = {
        human: true,
        api: false,
        smartContract: true,
      };

      expect(flags.human).toBe(true);
      expect(flags.api).toBe(false);
      expect(flags.smartContract).toBe(true);
    });

    it('allows all flags to be false', () => {
      const flags: InterfaceFlags = {
        human: false,
        api: false,
        smartContract: false,
      };

      expect(flags.human).toBe(false);
      expect(flags.api).toBe(false);
      expect(flags.smartContract).toBe(false);
    });

    it('allows all flags to be true', () => {
      const flags: InterfaceFlags = {
        human: true,
        api: true,
        smartContract: true,
      };

      expect(flags.human).toBe(true);
      expect(flags.api).toBe(true);
      expect(flags.smartContract).toBe(true);
    });
  });

  describe('StepStatus', () => {
    it('has correct status values', () => {
      const statuses: StepStatus[] = ['idle', 'checking', 'ready', 'error'];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('GuardResult', () => {
    it('defines successful guard result', () => {
      const successResult: GuardResult = { ok: true };

      expect(successResult.ok).toBe(true);
    });

    it('defines failed guard result without retry', () => {
      const failResult: GuardResult = {
        ok: false,
        reason: 'Validation failed',
      };

      expect(failResult.ok).toBe(false);
      expect(failResult.reason).toBe('Validation failed');
      expect(failResult.retry).toBeUndefined();
    });

    it('defines failed guard result with retry function', () => {
      const retryFn = async (): Promise<GuardResult> => ({ ok: true });
      const failResultWithRetry: GuardResult = {
        ok: false,
        reason: 'Network error',
        retry: retryFn,
      };

      expect(failResultWithRetry.ok).toBe(false);
      expect(failResultWithRetry.reason).toBe('Network error');
      expect(failResultWithRetry.retry).toBe(retryFn);
    });
  });

  describe('StepRenderContext', () => {
    it('defines step render context interface', () => {
      const mockUpdateField = (path: string, value: any) => {};
      const mockSetStatus = (status: StepStatus) => {};

      const context: StepRenderContext = {
        state: { name: 'test', version: '1.0.0' },
        updateField: mockUpdateField,
        status: 'ready',
        setStatus: mockSetStatus,
        errors: { name: 'Name is required' },
      };

      expect(context.state).toEqual({ name: 'test', version: '1.0.0' });
      expect(context.updateField).toBe(mockUpdateField);
      expect(context.status).toBe('ready');
      expect(context.setStatus).toBe(mockSetStatus);
      expect(context.errors).toEqual({ name: 'Name is required' });
    });

    it('allows errors to be undefined', () => {
      const mockUpdateField = (path: string, value: any) => {};
      const mockSetStatus = (status: StepStatus) => {};

      const context: StepRenderContext = {
        state: {},
        updateField: mockUpdateField,
        status: 'idle',
        setStatus: mockSetStatus,
      };

      expect(context.errors).toBeUndefined();
    });
  });

  describe('StepDef', () => {
    it('defines minimal step definition', () => {
      const stepDef: StepDef = {
        id: 'step-1',
        title: 'Basic Information',
        fields: ['name', 'version'],
        render: () => null,
      };

      expect(stepDef.id).toBe('step-1');
      expect(stepDef.title).toBe('Basic Information');
      expect(stepDef.fields).toEqual(['name', 'version']);
      expect(typeof stepDef.render).toBe('function');
    });

    it('defines complete step definition', () => {
      const mockGuard = (state: any): GuardResult => ({ ok: true });
      const mockRender = (ctx: StepRenderContext) => null;
      const mockAppliesTo = (flags: InterfaceFlags) => flags.human;

      const stepDef: StepDef = {
        id: 'step-verification',
        title: 'DID Verification',
        description: 'Verify your DID ownership',
        appliesTo: mockAppliesTo,
        fields: ['did', 'verification'],
        dependsOn: ['step-1'],
        guard: mockGuard,
        render: mockRender,
      };

      expect(stepDef.id).toBe('step-verification');
      expect(stepDef.title).toBe('DID Verification');
      expect(stepDef.description).toBe('Verify your DID ownership');
      expect(stepDef.appliesTo).toBe(mockAppliesTo);
      expect(stepDef.fields).toEqual(['did', 'verification']);
      expect(stepDef.dependsOn).toEqual(['step-1']);
      expect(stepDef.guard).toBe(mockGuard);
      expect(stepDef.render).toBe(mockRender);
    });

    it('allows optional fields to be undefined', () => {
      const stepDef: StepDef = {
        id: 'step-simple',
        title: 'Simple Step',
        fields: ['field1'],
        render: () => null,
      };

      expect(stepDef.description).toBeUndefined();
      expect(stepDef.appliesTo).toBeUndefined();
      expect(stepDef.dependsOn).toBeUndefined();
      expect(stepDef.guard).toBeUndefined();
    });

    it('supports async guard functions', () => {
      const asyncGuard = async (state: any): Promise<GuardResult> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { ok: true };
      };

      const stepDef: StepDef = {
        id: 'step-async',
        title: 'Async Step',
        fields: ['field1'],
        guard: asyncGuard,
        render: () => null,
      };

      expect(stepDef.guard).toBe(asyncGuard);
    });

    it('supports appliesTo function with interface flags', () => {
      const appliesToHuman = (flags: InterfaceFlags) => flags.human;
      const appliesToApi = (flags: InterfaceFlags) => flags.api;
      const appliesToSmartContract = (flags: InterfaceFlags) => flags.smartContract;
      const appliesToAny = (flags: InterfaceFlags) => flags.human || flags.api || flags.smartContract;

      const humanStep: StepDef = {
        id: 'human-step',
        title: 'Human Interface',
        fields: ['name'],
        appliesTo: appliesToHuman,
        render: () => null,
      };

      const apiStep: StepDef = {
        id: 'api-step',
        title: 'API Interface',
        fields: ['endpoint'],
        appliesTo: appliesToApi,
        render: () => null,
      };

      const smartContractStep: StepDef = {
        id: 'contract-step',
        title: 'Smart Contract Interface',
        fields: ['contractAddress'],
        appliesTo: appliesToSmartContract,
        render: () => null,
      };

      const anyStep: StepDef = {
        id: 'any-step',
        title: 'Any Interface',
        fields: ['common'],
        appliesTo: appliesToAny,
        render: () => null,
      };

      expect(humanStep.appliesTo).toBe(appliesToHuman);
      expect(apiStep.appliesTo).toBe(appliesToApi);
      expect(smartContractStep.appliesTo).toBe(appliesToSmartContract);
      expect(anyStep.appliesTo).toBe(appliesToAny);
    });
  });

  describe('RegistryMeta', () => {
    it('defines registry metadata interface', () => {
      const meta: RegistryMeta = {
        version: 1,
        lastModified: '2024-01-01T00:00:00Z',
      };

      expect(meta.version).toBe(1);
      expect(meta.lastModified).toBe('2024-01-01T00:00:00Z');
    });

    it('supports different version numbers', () => {
      const metaV2: RegistryMeta = {
        version: 2,
        lastModified: '2024-02-01T12:00:00Z',
      };

      expect(metaV2.version).toBe(2);
      expect(metaV2.lastModified).toBe('2024-02-01T12:00:00Z');
    });
  });
});
