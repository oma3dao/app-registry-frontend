# Test Suite Reduction Plan

**Goal:** Reduce from **5:1** (79k test lines) to **1:1-2:1** (16k-33k test lines)

**Current State:**
- Source code: ~16,621 lines (111 files)
- Unit tests: ~79,491 lines
- Ratio: **4.8:1** (way too high)
- Target: **16,621 - 33,242 lines** of tests
- **Need to remove: 46,249 - 62,870 lines** (58-79% reduction)

---

## 🎯 Reduction Strategy

### Phase 1: Remove Coverage-Driven Tests (Target: -30k lines)

These files test implementation details, not behavior. **DELETE them:**

#### Dashboard Tests (9 files → 2 files)
**Keep:**
- `dashboard.test.tsx` (main behavior tests)
- `dashboard-edit-flow.test.tsx` (if it tests actual user flows)

**Delete:**
- ❌ `dashboard-additional-coverage.test.tsx` (~400 lines)
- ❌ `dashboard-coverage-gaps.test.tsx` (~313 lines)
- ❌ `dashboard-final-coverage.test.tsx` (~118 lines - mostly skipped!)
- ❌ `dashboard-final-coverage-gaps.test.tsx` (~313 lines)
- ❌ `dashboard-more-coverage.test.tsx` (~397 lines)
- ❌ `dashboard-extended.test.tsx` (if redundant)
- ❌ `dashboard-update-flow-coverage.test.tsx` (if redundant)

**Savings: ~1,500 lines**

#### Wizard Step Tests
**Keep:**
- `wizard-step-1.test.tsx` through `wizard-step-7.test.tsx` (main tests)

**Delete:**
- ❌ `wizard-step-1-error-handling.test.tsx` (merge into main)
- ❌ `wizard-step-1-verification-coverage.test.tsx`
- ❌ `step-2-onchain-coverage.test.tsx`
- ❌ `step-5-human-distribution-coverage.test.tsx`
- ❌ `wizard-steps-coverage.test.tsx`
- ❌ `wizard-steps-error-handling.test.tsx`

**Savings: ~2,000 lines**

#### Component Coverage Tests
**Delete:**
- ❌ `additional-coverage-gaps.test.tsx`
- ❌ `final-coverage-gaps.test.tsx`
- ❌ `final-coverage-gaps.test.ts`
- ❌ `coverage-100-percent.test.ts`
- ❌ `landing-page-function-coverage.test.tsx`
- ❌ `caip10-input-function-coverage.test.tsx`

**Savings: ~1,500 lines**

#### Branch Coverage Tests
**Delete:**
- ❌ `log-branches.test.ts` (221 lines - tests internal stack parsing!)
- ❌ `rpc-branches.test.ts`
- ❌ `utils-branches.test.ts`
- ❌ `iwps-branches.test.ts`
- ❌ `iwps-additional-branches.test.ts`
- ❌ `iwps-final-coverage.test.ts`
- ❌ `navigation-branches.test.tsx`
- ❌ `interfaces-selector-branches.test.tsx`
- ❌ `nft-mint-modal-branches.test.tsx`
- ❌ `nft-mint-modal-gaps.test.tsx`
- ❌ `nft-mint-modal-more.test.tsx`

**Savings: ~3,000 lines**

#### Utility Coverage Tests
**Delete:**
- ❌ `utility-functions-edge-cases.test.ts`
- ❌ `schema-data-model-uncovered.test.ts`
- ❌ `app-converter-coverage.test.ts`
- ❌ `app-converter-extract-mcp.test.ts`
- ❌ `verify-and-attest-coverage-gaps.test.ts`

**Savings: ~2,000 lines**

#### NFT Modal Tests (Already Removed)
✅ Already deleted 6 nft-view-modal files (~70KB)

**Total Phase 1 Savings: ~10,000 lines**

---

### Phase 2: Consolidate Redundant Tests (Target: -15k lines)

#### Dashboard Consolidation
**Current:** 9-11 files testing dashboard
**Target:** 2-3 files

**Strategy:**
1. Merge all "coverage" tests into main `dashboard.test.tsx`
2. Keep only behavior-focused tests
3. Remove tests that verify internal state/logging

**Savings: ~2,000 lines**

#### Wizard Consolidation
**Current:** 7 main + 6 coverage files = 13 files
**Target:** 7 files (one per step)

**Strategy:**
1. Merge error handling into main step files
2. Remove coverage-specific files
3. Keep only user-flow tests

**Savings: ~2,500 lines**

#### CAIP-10 / DID Tests
**Current:** Multiple files per validator
**Target:** One file per validator type

**Files:**
- `caip10-evm-validator.test.ts`
- `caip10-solana-validator.test.ts`
- `caip10-sui-validator.test.ts`
- `caip10-input.test.tsx`
- `caip10-normalize.test.ts`
- `caip10-parse.test.ts`
- `did-utils.test.ts`
- `did-verification.test.tsx`
- `did-pkh-verification.test.tsx`
- `did-web-input.test.tsx`
- `did-index.test.ts`

**Strategy:** Consolidate into 3-4 focused files

**Savings: ~2,000 lines**

#### Contract Tests
**Current:** Multiple files
**Target:** Consolidate related tests

**Files:**
- `appRegistry.test.ts`
- `contract-client.test.ts`
- `contract-errors.test.ts`
- `contracts-types.test.ts`
- `registry-read.test.ts`
- `registry-write.test.ts`
- `registry-hooks.test.tsx`
- `metadata-read.test.ts`
- `metadata-write.test.ts`
- `metadata-utils.test.ts`
- `metadata-hooks.test.tsx`

**Strategy:** Group into logical files (registry, metadata, errors)

**Savings: ~2,000 lines**

#### Spec Compliance Tests
**Current:** 57 files in `spec-compliance/`
**Target:** Reduce by 30-40%

**Strategy:**
1. Remove redundant edge case tests
2. Consolidate similar validation tests
3. Keep only specification-mandated tests
4. Remove "what if" scenarios that aren't in spec

**Savings: ~5,000 lines**

#### E2E Documentation Bloat
**Current:** 29 markdown files in `e2e/`
**Target:** 5-7 essential docs

**Delete:**
- ❌ `TEST_UTILITIES_EXPANSION.md`
- ❌ `TEST_TAGS_GUIDE.md`
- ❌ `TEST_PATTERNS.md` (if redundant)
- ❌ `TEST_BEST_PRACTICES.md` (if redundant)
- ❌ `TEST_ANTI_PATTERNS.md`
- ❌ `NEXT_STEPS_GUIDE.md`
- ❌ `NEXT_STEPS.md` (duplicate)
- ❌ `METRICS_DASHBOARD_GUIDE.md`
- ❌ `MIGRATION_GUIDE.md`
- ❌ `MAINTENANCE_AUTOMATION_GUIDE.md`
- ❌ `CI_CD_INTEGRATION_GUIDE.md`
- ❌ `EXECUTION_GUIDE.md`
- ❌ `ACCESSIBILITY_TESTING_GUIDE.md`
- ❌ `AUTHENTICATION_GUIDE.md`
- ❌ `HANDOFF_GUIDE.md`
- ❌ `QUICK_START.md` (if redundant with README)

**Keep:**
- ✅ `README.md` (main guide)
- ✅ `TEST_MATRIX.md` (coverage overview)
- ✅ `VISUAL_REGRESSION_GUIDE.md` (specific feature)

**Savings: ~1,500 lines** (docs, but still counts)

**Total Phase 2 Savings: ~15,000 lines**

---

### Phase 3: Remove Over-Testing (Target: -20k lines)

#### Implementation Detail Tests
**Delete tests that verify:**
- Internal logging behavior
- Stack trace parsing
- Internal state changes
- Implementation-specific error messages
- Code paths that are implementation details

**Examples to remove:**
- `log-branches.test.ts` - tests stack parsing (implementation detail)
- Tests that verify `console.log` calls
- Tests that check internal variable values
- Tests that verify mock setup details

**Savings: ~3,000 lines**

#### Redundant Edge Cases
**Keep:** Edge cases that affect user behavior
**Delete:** Edge cases that are defensive code paths

**Examples:**
- Tests for "what if function receives null" when function never receives null in practice
- Tests for invalid enum values when UI restricts to valid values
- Tests for malformed data that can't occur in real usage

**Savings: ~5,000 lines**

#### Verbose Test Code
**Refactor to use:**
- Shared fixtures/helpers
- Test data factories
- Parameterized tests
- DRY principles

**Current:** Many tests repeat same setup (50-100 lines each)
**Target:** Shared setup reduces to 10-20 lines per test

**Savings: ~10,000 lines**

#### AI-Generated Bloat
**Identify and remove:**
- Tests with identical structure but different data
- Tests that test the same path with slightly different inputs
- Tests that verify coverage metrics rather than behavior

**Savings: ~2,000 lines**

**Total Phase 3 Savings: ~20,000 lines**

---

### Phase 4: Focus on Behavior (Target: -5k lines)

#### Replace Coverage Tests with Behavior Tests

**Instead of:**
```typescript
// ❌ Coverage-driven
it('covers line 234 when error is thrown', () => {
  // Tests implementation detail
});
```

**Do:**
```typescript
// ✅ Behavior-driven
it('shows error message when API call fails', async () => {
  // Tests user-visible behavior
});
```

**Strategy:**
1. Review each "coverage" test file
2. Identify what behavior it's actually testing
3. Merge into main test file if behavior-focused
4. Delete if it's only testing implementation

**Savings: ~5,000 lines**

---

## 📊 Expected Results

| Phase | Lines Removed | Remaining | Ratio |
|-------|--------------|-----------|-------|
| **Current** | - | 79,491 | 4.8:1 |
| **Phase 1** | -10,000 | 69,491 | 4.2:1 |
| **Phase 2** | -15,000 | 54,491 | 3.3:1 |
| **Phase 3** | -20,000 | 34,491 | 2.1:1 |
| **Phase 4** | -5,000 | **29,491** | **1.8:1** ✅ |

**Target Achieved:** 1.8:1 ratio (within 1:1 to 2:1 range)

---

## ✅ What to Keep

### Keep These Test Types:
1. ✅ **User behavior tests** - What users see/experience
2. ✅ **Integration tests** - How components work together
3. ✅ **Error handling** - User-visible errors
4. ✅ **Edge cases** - Real-world edge cases
5. ✅ **Spec compliance** - Required by specification
6. ✅ **E2E tests** - Full user flows

### Delete These Test Types:
1. ❌ **Coverage-driven tests** - Tests written to hit coverage %
2. ❌ **Implementation detail tests** - Internal state/logging
3. ❌ **Branch coverage tests** - Testing every code path
4. ❌ **Redundant edge cases** - Defensive code that never runs
5. ❌ **Verbose setup** - Repeated mock setup (DRY it up)
6. ❌ **AI-generated bloat** - Similar tests with different data

---

## 🎯 Implementation Order

### Week 1: Phase 1 (Quick Wins)
- Delete all `-coverage`, `-branches`, `-gaps`, `-additional` files
- **Expected:** -10k lines, 2-3 hours work

### Week 2: Phase 2 (Consolidation)
- Merge redundant test files
- Consolidate similar tests
- **Expected:** -15k lines, 1-2 days work

### Week 3: Phase 3 (Refactoring)
- Remove over-testing
- DRY up verbose tests
- **Expected:** -20k lines, 2-3 days work

### Week 4: Phase 4 (Behavior Focus)
- Replace coverage tests with behavior tests
- Final cleanup
- **Expected:** -5k lines, 1-2 days work

**Total:** ~1 week of focused work to reduce from 79k to 29k lines

---

## 📝 Quality Checklist

After reduction, verify:

1. ✅ **All user flows still tested** - No behavior regressions
2. ✅ **Error cases covered** - User-visible errors tested
3. ✅ **Spec compliance maintained** - Required tests still present
4. ✅ **E2E coverage intact** - Full flows still tested
5. ✅ **Test suite runs fast** - < 2 minutes for unit tests
6. ✅ **No test hangs** - All tests complete successfully

---

## 🚨 Red Flags to Watch For

If you see these patterns, **DELETE the test:**

- ❌ Test name includes "coverage", "branches", "gaps", "additional"
- ❌ Test verifies `console.log` calls
- ❌ Test checks internal variable values
- ❌ Test is identical to another test with different data
- ❌ Test covers a code path that can't occur in real usage
- ❌ Test file is mostly `it.skip()` tests
- ❌ Test file has 10+ tests but only 2-3 actually run

---

## 💡 Success Metrics

**Before:**
- 79,491 test lines
- 4.8:1 ratio
- Many hanging tests
- Hard to maintain

**After:**
- ~29,491 test lines
- 1.8:1 ratio ✅
- Fast test suite
- Easy to maintain
- **Quality > Quantity**
