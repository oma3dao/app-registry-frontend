/**
 * Step status store - tracks async execution state separately from form validation
 * 
 * Uses Zustand for simple, type-safe state management.
 */

import { create } from "zustand";
import type { StepStatus } from "./types";

type StepStatusState = {
  /** Map of step ID to current execution status */
  statuses: Record<string, StepStatus>;

  /** Set status for a specific step */
  setStatus: (stepId: string, status: StepStatus) => void;

  /** Get status for a specific step (defaults to "idle") */
  getStatus: (stepId: string) => StepStatus;

  /** Reset all statuses (e.g., when closing modal) */
  reset: () => void;
};

export const useStepStatusStore = create<StepStatusState>((set, get) => ({
  statuses: {},

  setStatus: (stepId, status) =>
    set((state) => ({
      statuses: { ...state.statuses, [stepId]: status },
    })),

  getStatus: (stepId) => get().statuses[stepId] || "idle",

  reset: () => set({ statuses: {} }),
}));
