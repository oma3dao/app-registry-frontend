# Files to Delete - Test Reduction

**Quick reference:** Files to delete to reduce test suite from 79k to ~29k lines

---

## 🗑️ Phase 1: Coverage-Driven Tests (Delete Immediately)

### Dashboard Coverage Files
- `tests/dashboard-additional-coverage.test.tsx`
- `tests/dashboard-coverage-gaps.test.tsx`
- `tests/dashboard-final-coverage.test.tsx`
- `tests/dashboard-final-coverage-gaps.test.tsx`
- `tests/dashboard-more-coverage.test.tsx`
- `tests/dashboard-update-flow-coverage.test.tsx` (if redundant)

### Wizard Coverage Files
- `tests/wizard-step-1-error-handling.test.tsx` (merge into main)
- `tests/step-1-verification-coverage.test.tsx`
- `tests/step-2-onchain-coverage.test.tsx`
- `tests/step-5-human-distribution-coverage.test.tsx`
- `tests/wizard-steps-coverage.test.tsx`
- `tests/wizard-steps-error-handling.test.tsx`

### General Coverage Files
- `tests/additional-coverage-gaps.test.tsx`
- `tests/final-coverage-gaps.test.tsx`
- `tests/final-coverage-gaps.test.ts`
- `tests/coverage-100-percent.test.ts`
- `tests/landing-page-function-coverage.test.tsx`
- `tests/caip10-input-function-coverage.test.tsx`

### Branch Coverage Files
- `tests/log-branches.test.ts` ⚠️ **221 lines testing stack parsing!**
- `tests/rpc-branches.test.ts`
- `tests/utils-branches.test.ts`
- `tests/iwps-branches.test.ts`
- `tests/iwps-additional-branches.test.ts`
- `tests/iwps-final-coverage.test.ts`
- `tests/navigation-branches.test.tsx`
- `tests/interfaces-selector-branches.test.tsx`
- `tests/nft-mint-modal-branches.test.tsx`
- `tests/nft-mint-modal-gaps.test.tsx`
- `tests/nft-mint-modal-more.test.tsx`

### Utility Coverage Files
- `tests/utility-functions-edge-cases.test.ts`
- `tests/schema-data-model-uncovered.test.ts`
- `tests/app-converter-coverage.test.ts`
- `tests/app-converter-extract-mcp.test.ts`
- `tests/verify-and-attest-coverage-gaps.test.ts`

---

## 🗑️ Phase 2: Redundant/Verbose Tests (Review & Consolidate)

### NFT Modal Tests (Already Deleted ✅)
- ✅ `tests/nft-view-modal.test.tsx`
- ✅ `tests/nft-view-modal-additional-coverage.test.tsx`
- ✅ `tests/nft-view-modal-attestation.test.tsx`
- ✅ `tests/nft-view-modal-branches.test.tsx`
- ✅ `tests/nft-view-modal-edit-status.test.tsx`
- ✅ `tests/nft-view-modal-error-paths.test.tsx`

### E2E Documentation Bloat
- `tests/e2e/TEST_UTILITIES_EXPANSION.md`
- `tests/e2e/TEST_TAGS_GUIDE.md`
- `tests/e2e/TEST_PATTERNS.md` (if redundant)
- `tests/e2e/TEST_BEST_PRACTICES.md` (if redundant)
- `tests/e2e/TEST_ANTI_PATTERNS.md`
- `tests/e2e/NEXT_STEPS_GUIDE.md`
- `tests/e2e/NEXT_STEPS.md` (duplicate)
- `tests/e2e/METRICS_DASHBOARD_GUIDE.md`
- `tests/e2e/MIGRATION_GUIDE.md`
- `tests/e2e/MAINTENANCE_AUTOMATION_GUIDE.md`
- `tests/e2e/CI_CD_INTEGRATION_GUIDE.md`
- `tests/e2e/EXECUTION_GUIDE.md`
- `tests/e2e/ACCESSIBILITY_TESTING_GUIDE.md`
- `tests/e2e/AUTHENTICATION_GUIDE.md`
- `tests/e2e/HANDOFF_GUIDE.md`
- `tests/e2e/QUICK_START.md` (if redundant with README)

---

## 📊 Summary

**Phase 1 (Delete):** ~40 files, ~10,000 lines
**Phase 2 (Review):** ~20 files, ~15,000 lines (consolidate, don't just delete)

**Total reduction:** ~25,000 lines from deletion + consolidation

---

## ✅ Keep These (Behavior-Focused)

### Core Component Tests
- `tests/dashboard.test.tsx` (main)
- `tests/dashboard-edit-flow.test.tsx` (if behavior-focused)
- `tests/dashboard-transaction-flows.test.tsx` (if behavior-focused)
- `tests/dashboard-owner-verification.test.tsx` (if behavior-focused)
- `tests/wizard-step-*.test.tsx` (main 7 files)
- `tests/landing-page.test.tsx`
- `tests/navigation.test.tsx`

### Core Utility Tests
- `tests/caip10-*.test.ts` (validators, normalize, parse)
- `tests/did-*.test.ts` (utils, verification)
- `tests/contract-*.test.ts` (core contract tests)
- `tests/metadata-*.test.ts` (core metadata tests)

### Spec Compliance (Keep Required)
- `tests/spec-compliance/omatrust-spec/*.test.ts` (spec-mandated only)
- `tests/spec-compliance/data-model-compliance.test.ts`
- `tests/spec-compliance/erc8004-compliance.test.ts`

### E2E Tests (Keep All)
- `tests/e2e/*.spec.ts` (all E2E test files)
- `tests/e2e/README.md` (main guide)
- `tests/e2e/TEST_MATRIX.md` (coverage overview)

---

## 🎯 Quick Delete Command

```bash
# Phase 1: Delete coverage files (be careful - review first!)
cd tests
rm dashboard-*-coverage*.test.tsx
rm wizard-step-*-coverage*.test.tsx
rm *-coverage*.test.tsx
rm *-branches.test.ts
rm *-gaps.test.tsx
rm *-additional*.test.tsx
rm log-branches.test.ts
```

**⚠️ Warning:** Review each file before deleting to ensure no unique behavior tests are lost!
