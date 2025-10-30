"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { NFT, defaultUIState, defaultFormState, type TFormState } from "@/schema/data-model";
import {
  ALL_STEPS,
  visibleSteps,
  canEnterStep,
  validateStep,
  useStepStatusStore,
  type StepStatus,
} from "@/lib/wizard";
import { DEFAULT_INTERFACE_FLAGS } from "@/lib/utils/interfaces";

// Draft persistence helpers
const draftKey = (did?: string, version?: string) =>
  did ? `wizard:${did}${version ? `:v:${version}` : ""}` : "";

function saveDraft(state: TFormState) {
  try {
    const key = draftKey(state.did, state.version);
    if (!key) return;
    // Strip UI state and ephemeral fields
    const { ui, ...rest } = state;
    localStorage.setItem(key, JSON.stringify(rest));
  } catch { }
}

function loadDraft(did?: string, version?: string): Partial<TFormState> | null {
  try {
    const key = draftKey(did, version);
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TFormState>;
    // Ensure UI state is reset to defaults
    return {
      ...parsed,
      ui: defaultUIState,
    };
  } catch {
    return null;
  }
}

// Legacy export removed; modal owns step state

interface NFTMintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (nft: NFT) => void;
  initialData?: Partial<NFT>;
}

export default function NFTMintModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: NFTMintModalProps) {
  // Form state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<TFormState>(defaultFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step status store (for async operations like verification)
  const { statuses: stepStatus, setStatus, reset: resetStatus } = useStepStatusStore();

  // Update a single field (supports dot-paths for nested updates)
  const updateField = useCallback((path: string, value: any) => {
    setFormData((prev) => {
      if (path.includes(".")) {
        const parts = path.split(".");
        const updated: any = { ...prev };
        let current: any = updated;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          current[part] = { ...(current[part] ?? {}) };
          current = current[part];
        }
        current[parts[parts.length - 1]] = value;
        // If DID changed via nested path (unlikely), also reset verification
        return updated as TFormState;
      }
      const next = { ...prev, [path]: value } as TFormState;
      if (path === "did") {
        next.ui.verificationStatus = "idle";
      }
      return next;
    });
    // Clear field-specific error and global validation banner on change
    setErrors((prev) => {
      if (!prev) return {};
      const next = { ...prev } as Record<string, string>;
      if (next[path]) delete next[path];
      if (next._guard) delete next._guard;
      if (next._validation) delete next._validation;
      return next;
    });
  }, []);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      const isEditMode = !!initialData.did && !!initialData.version;
      
      console.log('[nft-mint-modal] Initializing form with initialData:', initialData);
      console.log('[nft-mint-modal] initialData.traits:', initialData.traits);
      console.log('[nft-mint-modal] initialData.summary:', initialData.summary);
      console.log('[nft-mint-modal] initialData.publisher:', initialData.publisher);
      
      setFormData((prev) => {
        const newFormData: TFormState = {
          ...prev,
          ...initialData,
          ui: {
            ...prev.ui,
            mode: (isEditMode ? "edit" : "create") as "create" | "edit",
            isEditing: isEditMode,
            currentVersion: isEditMode ? initialData.version : undefined,
            // Always require verification, even in edit mode (security: ownership could have changed)
            verificationStatus: "idle" as const,
          },
        };
        
        console.log('[nft-mint-modal] New formData.traits:', newFormData.traits);
        console.log('[nft-mint-modal] New formData.summary:', newFormData.summary);
        console.log('[nft-mint-modal] New formData.publisher:', newFormData.publisher);
        
        return newFormData;
      });
    }
  }, [isOpen, initialData]);

  // Load draft if DID+Version set and draft exists
  // BUT: Don't load drafts in edit mode - use the current on-chain data instead
  useEffect(() => {
    if (!isOpen) return;
    if (!formData.did || !formData.version) return;
    
    // Skip draft loading in edit mode - we want to use the current on-chain data
    if (formData.ui?.isEditing) {
      console.log('[nft-mint-modal] Skipping draft load in edit mode');
      return;
    }
    
    const draft = loadDraft(formData.did, formData.version);
    if (draft) {
      console.log('[nft-mint-modal] Loading draft:', draft);
      setFormData((prev) => ({ ...prev, ...draft, ui: prev.ui }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, formData.did, formData.version]);

  // Reset wizard when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setFormData(defaultFormState);
      setErrors({});
      resetStatus();
    }
  }, [isOpen, resetStatus]);

  // Calculate visible steps based on interface flags
  const interfaceFlags = formData.interfaceFlags || {
    human: true,
    api: false,
    smartContract: false,
  };
  const steps = visibleSteps(ALL_STEPS, interfaceFlags);
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  // Ref to scroll step content to top on validation errors
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Handle next step
  const handleNext = async () => {
    if (!currentStep) return;

    // Validate current step
    const validation = validateStep(currentStep, formData);
    if (!validation.ok) {
      // Convert Zod issues to error map
      const errorMap: Record<string, string> = {};
      validation.issues.forEach((issue) => {
        const path = issue.path.join(".");
        errorMap[path] = issue.message;
      });
      setErrors({ _validation: "Please complete required fields", ...errorMap });
      // Scroll to top of content for visibility
      if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
      // Focus the first field with an error if possible
      const firstPath = Object.keys(errorMap)[0];
      if (firstPath) {
        const input = document.querySelector(`[name="${firstPath}"]`) as HTMLElement | null;
        if (input && typeof input.focus === "function") input.focus();
      }
      return;
    }

    // Check guard (can be async)
    const guardResult = await canEnterStep(currentStep, formData);
    if (!guardResult.ok) {
      setErrors({ _guard: guardResult.reason || "Cannot proceed" });
      return;
    }

    // Clear errors and proceed
    setErrors({});

    // Save draft on successful step validation
    saveDraft(formData);

    if (isLastStep) {
      // Final step: submit
      await handleSubmit();
    } else {
      // Move to next step
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (isFirstStep) return;
    setErrors({});
    setCurrentStepIndex(currentStepIndex - 1);
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Convert formData to NFT format (Dashboard handles actual on-chain mint via useMintApp)
    const nft: NFT = {
      ...formData,
      // Override with computed interface bitmap
      interfaces: (formData.interfaceFlags.human ? 1 : 0) +
        (formData.interfaceFlags.api ? 2 : 0) +
        (formData.interfaceFlags.smartContract ? 4 : 0),
      // Add required fields - preserve from initialData in edit mode, use defaults for new apps
      minter: initialData?.minter || '', // Preserve existing minter in edit mode, empty for new apps
      currentOwner: initialData?.currentOwner || '', // Preserve existing currentOwner in edit mode, empty for new apps
      status: initialData?.status ?? 0,  // Preserve existing status in edit mode, default to Active for new apps
      dataUrl: formData.dataUrl || '', // Ensure dataUrl is not undefined
    };

    try {
      await Promise.resolve(onSubmit(nft));
    } catch (err: any) {
      // Surface a lightweight error banner; avoid uncaught promise
      setErrors({ _guard: err?.message || 'Failed to submit. Please try again.' });
      // keep user on the current step
      if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Create memoized setStatus callback for current step
  const handleSetStatus = useCallback(
    (status: StepStatus) => {
      if (currentStep) {
        setStatus(currentStep.id, status);
      }
    },
    [currentStep, setStatus]
  );

  // Render current step content
  const StepComponent = currentStep?.render;
  const currentStatus = currentStep ? (stepStatus[currentStep.id] || "idle") : "idle";

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} key={`wizard-${currentStepIndex}`}>
      <DialogContent className="w-[95vw] sm:w-auto sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-hidden p-4 sm:p-6 flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit App Registration" : "Register New App"}
          </DialogTitle>
          <DialogDescription>
            {currentStep?.description || "Complete all required information"}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator - Compact Vertical */}
        <div className="flex items-stretch justify-between px-2 py-2 bg-muted/50 rounded-lg gap-1 overflow-x-auto">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            const status = stepStatus[step.id];

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-1 flex-shrink-0 min-w-0">
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full border transition-colors ${isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-background"
                      }`}
                    title={step.title}
                  >
                    {isCompleted ? (
                      <CheckIcon className="w-3 h-3" />
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div
                    className={`text-xs leading-tight text-center font-medium max-w-[70px] ${isActive
                      ? "text-foreground"
                      : "text-muted-foreground"
                      }`}
                  >
                    {step.title}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex items-center">
                    <div className="w-1 h-px bg-muted-foreground/30" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Global Error Banner */}
        {errors._guard && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{errors._guard}</p>
          </div>
        )}

        {/* Step Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-1" data-density="compact">
          {StepComponent && (
            <StepComponent
              state={formData}
              updateField={updateField}
              errors={errors}
              status={currentStatus}
              setStatus={handleSetStatus}
            />
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex justify-between items-center border-t pt-4">
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstStep}
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Previous
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleNext}>
              {isLastStep ? (
                <>
                  <CheckIcon className="w-4 h-4 mr-2" />
                  Submit
                </>
              ) : (
                <>
                  Next
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}