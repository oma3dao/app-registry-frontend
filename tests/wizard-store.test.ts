import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStepStatusStore } from '@/lib/wizard/store';
import type { StepStatus } from '@/lib/wizard/types';

describe('useStepStatusStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    const { result } = renderHook(() => useStepStatusStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should initialize with empty statuses', () => {
    const { result } = renderHook(() => useStepStatusStore());
    
    expect(result.current.statuses).toEqual({});
  });

  it('should set and get status for a step', () => {
    const { result } = renderHook(() => useStepStatusStore());
    
    act(() => {
      result.current.setStatus('step-1', 'checking');
    });
    
    expect(result.current.getStatus('step-1')).toBe('checking');
  });

  it('should return "idle" as default status for unknown step', () => {
    const { result } = renderHook(() => useStepStatusStore());
    
    expect(result.current.getStatus('unknown-step')).toBe('idle');
  });

  it('should update status for existing step', () => {
    const { result } = renderHook(() => useStepStatusStore());
    
    act(() => {
      result.current.setStatus('step-1', 'checking');
    });
    
    expect(result.current.getStatus('step-1')).toBe('checking');
    
    act(() => {
      result.current.setStatus('step-1', 'ready');
    });
    
    expect(result.current.getStatus('step-1')).toBe('ready');
  });

  it('should handle multiple steps independently', () => {
    const { result } = renderHook(() => useStepStatusStore());
    
    act(() => {
      result.current.setStatus('step-1', 'checking');
      result.current.setStatus('step-2', 'ready');
      result.current.setStatus('step-3', 'error');
    });
    
    expect(result.current.getStatus('step-1')).toBe('checking');
    expect(result.current.getStatus('step-2')).toBe('ready');
    expect(result.current.getStatus('step-3')).toBe('error');
  });

  it('should reset all statuses', () => {
    const { result } = renderHook(() => useStepStatusStore());
    
    act(() => {
      result.current.setStatus('step-1', 'checking');
      result.current.setStatus('step-2', 'ready');
    });
    
    expect(result.current.statuses).toEqual({
      'step-1': 'checking',
      'step-2': 'ready',
    });
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.statuses).toEqual({});
    expect(result.current.getStatus('step-1')).toBe('idle');
    expect(result.current.getStatus('step-2')).toBe('idle');
  });

  it.each([
    { status: 'idle' as StepStatus, step: 'step-0' },
    { status: 'checking' as StepStatus, step: 'step-1' },
    { status: 'ready' as StepStatus, step: 'step-2' },
    { status: 'error' as StepStatus, step: 'step-3' },
  ])('should support $status status type', ({ status, step }) => {
    const { result } = renderHook(() => useStepStatusStore());
    act(() => {
      result.current.setStatus(step, status);
    });
    expect(result.current.getStatus(step)).toBe(status);
  });

  it('should maintain state across multiple renders', () => {
    const { result, rerender } = renderHook(() => useStepStatusStore());
    
    act(() => {
      result.current.setStatus('step-1', 'checking');
    });
    
    expect(result.current.getStatus('step-1')).toBe('checking');
    
    // Rerender the hook
    rerender();
    
    // State should persist
    expect(result.current.getStatus('step-1')).toBe('checking');
  });
});
