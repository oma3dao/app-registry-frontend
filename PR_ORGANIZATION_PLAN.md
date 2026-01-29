# PR Organization Plan - Breaking Down Test Suite

**Goal:** Split large test additions into focused, reviewable PRs (< 1000 lines each)

**⚠️ IMPORTANT:** Before adding new tests, see `TEST_REDUCTION_PLAN.md` - we need to **reduce** from 79k to 29k lines first!

---

## 📏 PR Size Guidelines (per review feedback)

| Size | Lines | Verdict |
|------|-------|---------|
| **Small** | < 200 | Ideal, easy to review |
| **Medium** | 200–500 | Reasonable |
| **Large** | 500–1000 | Needs justification |
| **Too big** | > 1000 | Hard to review properly |

**55k+ lines in a single PR is unreviewable** — too many changes at once makes it hard to isolate failures.  
Break work into smaller, focused PRs (e.g. E2E infra, spec-compliance, component tests, performance).  
**Each PR must pass all tests before merging.**

---

## 📊 Current Situation

- **Problem:** 55,000+ lines in a single PR is unreviewable
- **Target:** Each PR should be < 1000 lines (ideally < 500)
- **Principle:** Each PR must pass all tests before merging

---

## 🎯 Proposed PR Structure

### PR 1: Test Infrastructure & Setup (~300-500 lines)
**Focus:** Foundation that other tests depend on

**Files:**
- `tests/setup.ts` (if changes needed)
- `vitest.config.ts` (test configuration)
- `playwright.config.ts` (E2E configuration)
- Shared test utilities/helpers
- Mock factories

**Why First:** Other PRs depend on this infrastructure

---

### PR 2: Core Component Tests - Part 1 (~500-800 lines)
**Focus:** Essential component rendering and basic interactions

**Files:**
- `tests/button.test.tsx`
- `tests/card.test.tsx`
- `tests/dialog.test.tsx`
- `tests/input.test.tsx`
- `tests/label.test.tsx`
- Basic UI component tests

**Why:** Low-risk, foundational components

---

### PR 3: Core Component Tests - Part 2 (~500-800 lines)
**Focus:** More complex UI components

**Files:**
- `tests/component.test.tsx`
- `tests/image-preview.test.tsx`
- `tests/url-validator.test.tsx`
- `tests/nft-card.test.tsx`
- `tests/nft-grid.test.tsx`

**Why:** Builds on PR 2, still relatively isolated

---

### PR 4: Wizard Step Tests - Part 1 (Steps 1-3) (~600-900 lines)
**Focus:** First half of wizard flow

**Files:**
- `tests/wizard-steps/step-1-verification.test.tsx`
- `tests/wizard-steps/step-2-onchain.test.tsx`
- `tests/wizard-steps/step-3-common.test.tsx`
- `tests/mcp-config.test.tsx` (if related)

**Why:** Logical grouping, tests a complete sub-flow

---

### PR 5: Wizard Step Tests - Part 2 (Steps 4-7) (~600-900 lines)
**Focus:** Second half of wizard flow

**Files:**
- `tests/wizard-steps/step-4-human-media.test.tsx`
- `tests/wizard-steps/step-5-human-distribution.test.tsx`
- `tests/wizard-steps/step-6-review.test.tsx`
- `tests/wizard-steps/step-7-api-only.test.tsx`

**Why:** Completes wizard coverage, can be reviewed independently

---

### PR 6: Dashboard Tests - Core Flow (~500-800 lines)
**Focus:** Main dashboard functionality

**Files:**
- `tests/dashboard.test.tsx`
- `tests/dashboard-edit-flow.test.tsx`
- `tests/dashboard-transaction-flows.test.tsx`

**Why:** Core user-facing feature, needs careful review

---

### PR 7: Dashboard Tests - Extended Coverage (~400-700 lines)
**Focus:** Edge cases and additional coverage

**Files:**
- `tests/dashboard-additional-coverage.test.tsx`
- `tests/dashboard-coverage-gaps.test.tsx`
- `tests/dashboard-extended.test.tsx`
- `tests/dashboard-owner-verification.test.tsx`

**Why:** Can be reviewed after core dashboard tests are merged

---

### PR 8: Modal Tests - Mint Modal (~400-600 lines)
**Focus:** NFT minting modal

**Files:**
- `tests/nft-mint-modal.test.tsx`
- `tests/nft-mint-modal-branches.test.tsx`
- `tests/nft-mint-modal-gaps.test.tsx`
- `tests/nft-mint-modal-more.test.tsx`
- `tests/nft-mint-modal-submit-error.test.tsx`

**Why:** Self-contained feature, no dependencies on view modal

---

### PR 9: Landing Page & Navigation Tests (~400-600 lines)
**Focus:** Public-facing pages

**Files:**
- `tests/landing-page.test.tsx`
- `tests/landing-page-function-coverage.test.tsx`
- `tests/navigation.test.tsx`
- `tests/navigation-branches.test.tsx`

**Why:** Public pages, relatively isolated

---

### PR 10: DID & CAIP-10 Validation Tests (~500-800 lines)
**Focus:** Identity validation logic

**Files:**
- `tests/caip10-*.test.tsx` (all CAIP-10 related)
- `tests/did-*.test.tsx` (all DID related)
- `tests/caip10-normalize.test.ts`
- `tests/caip10-parse.test.ts`

**Why:** Logical grouping of validation logic

---

### PR 11: Contract & Blockchain Tests - Part 1 (~500-800 lines)
**Focus:** Core contract interactions

**Files:**
- `tests/appRegistry.test.ts`
- `tests/contract-client.test.ts`
- `tests/contract-errors.test.ts`
- `tests/contracts-types.test.ts`
- `tests/registry-*.test.ts` (if any)

**Why:** Critical blockchain logic, needs careful review

---

### PR 12: Contract & Blockchain Tests - Part 2 (~500-800 lines)
**Focus:** Metadata and advanced contract features

**Files:**
- `tests/metadata-*.test.ts` (all metadata tests)
- `tests/issuer-key.test.ts`
- `tests/chain-guard.test.ts`
- `tests/bytes32.test.ts`

**Why:** Builds on PR 11, still focused on contracts

---

### PR 13: Utility & Library Tests - Part 1 (~500-800 lines)
**Focus:** Core utilities

**Files:**
- `tests/dataurl-*.test.ts`
- `tests/log.test.ts`
- `tests/utils-*.test.ts` (if any)
- `tests/fetch-description-api.test.ts`
- `tests/fetch-metadata-route.test.ts`

**Why:** Supporting utilities, lower risk

---

### PR 14: Utility & Library Tests - Part 2 (~500-800 lines)
**Focus:** Advanced utilities and helpers

**Files:**
- `tests/interfaces-*.test.tsx`
- `tests/iwps-*.test.ts`
- `tests/metadata-hooks.test.tsx`
- `tests/nft-metadata-context-*.test.tsx`

**Why:** More complex utilities, can be reviewed after PR 13

---

### PR 15: Spec Compliance Tests - OMATrust Identity (~600-900 lines)
**Focus:** Specification-driven tests for Identity spec

**Files:**
- `tests/spec-compliance/omatrust-spec/` (Identity-related)
- `tests/spec-compliance/data-model-compliance.test.ts`
- Related spec compliance tests

**Why:** Specification validation, needs careful review

---

### PR 16: Spec Compliance Tests - Proofs & Reputation (~500-800 lines)
**Focus:** Remaining specification tests

**Files:**
- `tests/spec-compliance/omatrust-spec/` (Proofs/Reputation)
- `tests/spec-compliance/edge-cases/`
- `tests/spec-compliance/integration/`

**Why:** Completes spec coverage

---

### PR 17: E2E Test Infrastructure (~400-600 lines)
**Focus:** E2E setup and utilities

**Files:**
- `tests/e2e/` setup files
- `tests/e2e/helpers/`
- `tests/e2e/test-runner.js`
- E2E configuration

**Why:** Foundation for E2E tests

---

### PR 18: E2E Tests - User Flows (~500-800 lines)
**Focus:** Core user journey tests

**Files:**
- `tests/e2e/landing-page.spec.ts`
- `tests/e2e/dashboard.spec.ts`
- `tests/e2e/wizard-flow.spec.ts`
- `tests/e2e/component-interactions.spec.ts`

**Why:** Critical user paths, needs thorough review

---

### PR 19: E2E Tests - Quality & Accessibility (~400-600 lines)
**Focus:** Non-functional requirements

**Files:**
- `tests/e2e/accessibility.spec.ts`
- `tests/e2e/performance.spec.ts`
- `tests/e2e/visual-regression.spec.ts`
- `tests/e2e/network.spec.ts`

**Why:** Quality metrics, can be reviewed independently

---

### PR 20: E2E Tests - API Integration (~400-600 lines)
**Focus:** API endpoint testing

**Files:**
- `tests/e2e/api-routes.spec.ts`
- `tests/e2e/api-integration.spec.ts`
- API-related E2E tests

**Why:** API coverage, isolated from UI tests

---

### PR 21: Coverage Gap Tests (~400-600 lines)
**Focus:** Tests targeting uncovered code paths

**Files:**
- `tests/*-coverage-gaps.test.tsx`
- `tests/*-additional-coverage.test.tsx`
- `tests/final-coverage-gaps.test.tsx`

**Why:** Can be added incrementally after core tests

---

### PR 22: Documentation & Cleanup (~200-400 lines)
**Focus:** Test documentation and organization

**Files:**
- `README-TESTING.md` updates
- `CONTRIBUTING.md` test guidelines
- Test organization improvements
- Removal of redundant tests (like we did with nft-view-modal)

**Why:** Final polish, low risk

---

## ✅ PR Review Checklist

Each PR should:

1. ✅ **Pass all existing tests** (no regressions)
2. ✅ **Pass its own new tests** (all green)
3. ✅ **Be < 1000 lines** (ideally < 500)
4. ✅ **Have clear scope** (single focus area)
5. ✅ **Include documentation** (what's tested, why)
6. ✅ **Be independently reviewable** (no circular dependencies)

---

## 🚫 What NOT to Do

- ❌ Combine unrelated test areas in one PR
- ❌ Add tests that depend on unmerged PRs (unless explicitly coordinated)
- ❌ Skip test runs before merging
- ❌ Create PRs > 1000 lines
- ❌ Mix test infrastructure with test implementations

---

## 📝 Implementation Strategy

### Phase 1: Foundation (PRs 1-3)
Get infrastructure and basic components in place first.

### Phase 2: Core Features (PRs 4-9)
Add tests for main user-facing features.

### Phase 3: Backend & Utilities (PRs 10-14)
Cover contract interactions and utilities.

### Phase 4: Spec Compliance (PRs 15-16)
Add specification-driven tests.

### Phase 5: E2E (PRs 17-20)
End-to-end testing infrastructure and tests.

### Phase 6: Polish (PRs 21-22)
Coverage gaps and documentation.

---

## 🎯 Success Metrics

- ✅ Each PR reviewed and merged within 1-2 days
- ✅ No test suite hangs or timeouts
- ✅ All PRs pass CI before merging
- ✅ Test-to-source ratio remains healthy (1:1 to 2:1)
- ✅ No redundant or over-testing

---

## 📌 Notes

- **NFTViewModal tests removed:** These were causing hangs and have been removed. Modal is covered via mocks in dashboard/landing tests and E2E.
- **Test organization:** Group related tests together, but keep PRs focused.
- **Incremental approach:** Each PR builds on previous ones, but should be reviewable independently.
