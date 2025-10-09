# Wizard Step Registry

**Single source of truth for all wizard steps.**

## Why this exists

The previous implementation had scattered logic:
- Step fields in `STEP_FIELDS`
- Validation in `validateFields`, `validateRegistration`, `validateMetadata`
- Visibility in `getVisibleSteps`
- Rendering in `renderStepContent`
- Guards sprinkled across `handleNextStep`

This made changes brittle—adding a field or step required hunting through 5+ locations.

## How it works

**All step metadata lives in one place:** `registry.tsx`

Each `StepDef` declares:
- `id` - unique identifier
- `title` - display name
- `fields` - which form fields this step owns
- `schema` - Zod validation for these fields
- `appliesTo` - visibility rule (e.g., only for human-facing apps)
- `guard` - hard gate before entering (e.g., verification must be complete)
- `render` - React component to display

The **engine** (`engine.ts`) consumes these definitions to:
- Filter visible steps based on interface flags
- Validate per-step or whole-form
- Route validation errors to the correct step
- Check guards and dependencies

## Adding a new step

1. **Create the step definition** in `registry.tsx`:

```tsx
export const Step7_ApiConfig: StepDef = {
  id: "api-config",
  title: "API Configuration",
  appliesTo: (flags) => flags.api, // Only for API apps
  fields: ["apiEndpoint", "apiKey"],
  schema: z.object({
    apiEndpoint: z.string().url(),
    apiKey: z.string().min(1).optional(),
  }),
  render: (ctx) => <Step7_ApiConfig {...ctx} />
};
```

2. **Add it to `ALL_STEPS`** (order determines wizard order):

```tsx
export const ALL_STEPS = [
  Step0_Verification,
  // ... other steps
  Step7_ApiConfig, // <-- add here
  Step8_Review,
  Step9_Mint,
];
```

3. **Create the step component** in `src/components/wizard-steps/`:

```tsx
// step-7-api-config.tsx
export default function Step7_ApiConfig({ state, updateField, errors }: StepRenderContext) {
  return (
    <div>
      <Input
        value={state.apiEndpoint}
        onChange={(e) => updateField("apiEndpoint", e.target.value)}
        error={errors?.apiEndpoint}
      />
    </div>
  );
}
```

**That's it.** The engine handles navigation, visibility, and validation automatically.

## Changing step fields

**Before (brittle):**
- Update `STEP_FIELDS`
- Update validation function
- Update render logic
- Update form type
- Hope you didn't miss anything

**Now (one place):**
- Update the step's `fields` array and `schema` in `registry.tsx`
- Update the step component if UI needs changes

## Architecture

```
registry.tsx          → Step definitions (data)
engine.ts            → Navigation & validation logic
store.ts             → Step execution status (separate from form state)
linter.ts            → Development-time validation
nft-mint-modal.tsx   → Consumes registry via engine
```

## Key concepts

### Step ownership
Each step "owns" certain fields. This determines:
- Which fields are validated when entering/leaving the step
- Where validation errors are routed for display
- Which fields appear in that step's UI

### Conditional visibility
Steps can be conditional:
```tsx
appliesTo: (flags) => flags.human && !flags.api
```

### Guards
Guards are hard gates (separate from validation):
```tsx
guard: (state) => {
  if (!state._verificationReady) {
    return { ok: false, reason: "Complete verification first" };
  }
  return { ok: true };
}
```

### Dependencies
Steps can depend on other steps:
```tsx
dependsOn: ["verification", "onchain"]
```
The engine prevents entering if dependencies are invalid.

### Step status vs. form validation
- **Form validation** (Zod): "Are the fields valid?"
- **Step status** (store): "Is an async check running?"

Example: Step 0 verification
- Form validation: DID format is correct
- Step status: `checking` → API call → `ready`

These are separate because async operations aren't form data.

## Migration notes

Phase 1 (current):
- ✅ Registry structure created
- ✅ Engine functions implemented
- ⏳ Step components still need to be created/wrapped

Phase 2 (next):
- Replace `nft-mint-modal.tsx` internals to use engine
- Wrap existing UI components as step renderers
- Delete old `STEP_FIELDS`, scattered validation

Phase 3 (later):
- Add inline field-level validation
- Implement retry logic for guards
- Add draft persistence

## Development

The registry is **linted at import time** in development mode.

Run tests:
```bash
npm test -- wizard
```

Check for issues:
```tsx
import { lintRegistry, ALL_STEPS, REGISTRY_META } from "@/lib/wizard";

const issues = lintRegistry(ALL_STEPS, REGISTRY_META);
// Empty array = valid
```

## See also

- `/docs/wizard-migration.md` - Full migration plan
- `types.ts` - Core type definitions
- `engine.ts` - Runtime logic
