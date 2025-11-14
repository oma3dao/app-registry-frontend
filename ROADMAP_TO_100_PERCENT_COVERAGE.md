# Roadmap to 100% Test Coverage

**Current Coverage:** 96.96% Statements | 91.61% Branches | 92.82% Functions
**Target:** 100% across all metrics
**Gap to Close:** 3.04% Statements | 8.39% Branches | 7.18% Functions

## 📊 Remaining Coverage Gaps Analysis

### Critical Files Needing Improvement

#### 1. **dashboard.tsx** (77.44% statements, 80.85% branches, 91.66% functions)
**Estimated Impact:** +1.5% overall coverage
**Difficulty:** ⭐⭐⭐⭐ (High - requires complex mocking)

**Uncovered Areas:**
- Lines 93-97: `handleOpenMintModal` redirect logic with existing NFT
- Lines 161-167: Owner verification in edit mode
- Lines 192-211: Hash verification and on-chain data comparison
- Lines 222-227: Cache clearing and state updates after app update
- Lines 248-252: Fresh mint owner assignment and state updates
- Lines 277-280: Status validation and error handling

**Testing Strategy:**
```typescript
// Priority tests to add:
1. Test handleOpenMintModal with existing NFT (triggers view modal redirect)
2. Test owner verification rejects non-owner updates with proper error toast
3. Mock getAppByDid to test hash verification logging
4. Test successful update flow that clears cache and updates local state
5. Test mint flow that assigns currentOwner and minter
6. Test handleUpdateStatus with invalid status values (< 0 or > 2)
```

**Implementation:**
- Create `tests/dashboard-deep-integration.test.tsx`
- Mock thirdweb hooks with realistic return values
- Simulate full update workflow with currentNft state
- Test modal interactions using fireEvent and waitFor

---

#### 2. **nft-mint-modal.tsx** (89.89% statements, 74.41% branches, 85.71% functions)
**Estimated Impact:** +0.8% overall coverage
**Difficulty:** ⭐⭐⭐⭐⭐ (Very High - complex wizard state machine)

**Uncovered Areas:**
- Lines 266-273: Next button validation with step errors
- Lines 276-279: Submit button visibility conditions
- Lines 315: localStorage error handling in draft save
- Lines 321: Dialog animation end handler

**Testing Strategy:**
```typescript
// Priority tests to add:
1. Test "Next" button disabled when step validation fails
2. Test step transition blocked by validation errors
3. Test submit button only visible on final step
4. Test localStorage.setItem failure (quota exceeded)
5. Test localStorage.getItem failure (corrupted data)
6. Mock Dialog animation events for completion handlers
```

**Implementation:**
- Create `tests/nft-mint-modal-wizard-validation.test.tsx`
- Test each step's validation separately
- Mock localStorage to throw errors
- Test wizard state transitions with invalid data
- Use act() to handle animation callbacks

---

#### 3. **nft-view-modal.tsx** (92.2% statements, 89.43% branches, 80% functions)
**Estimated Impact:** +0.5% overall coverage
**Difficulty:** ⭐⭐⭐⭐ (High - async attestation checks)

**Uncovered Areas:**
- Lines 200-202: Invalid status validation in attestation check
- Lines 587-590: Error handling in handleEditMetadata
- Lines 712-714: onUpdateStatus callback error handling

**Testing Strategy:**
```typescript
// Priority tests to add:
1. Mock NFT with invalid status (not 0, 1, or 2)
2. Test handleEditMetadata when onEditMetadata prop is missing
3. Test handleEditMetadata with malformed metadata
4. Test onUpdateStatus rejection and error display
5. Mock ethers.id to throw error in attestation check
```

**Implementation:**
- Create `tests/nft-view-modal-error-paths.test.tsx`
- Focus on error handling branches
- Mock ethers functions to simulate failures
- Test callback prop edge cases (missing, throwing errors)

---

#### 4. **navigation.tsx** (100% statements, 40% branches, 100% functions)
**Estimated Impact:** +0.4% branch coverage
**Difficulty:** ⭐⭐ (Low - just need more link state tests)

**Uncovered Branches:**
- Line 55: `link.isActive ? "text-primary" : "text-foreground"` (false path needs testing)
- Line 56: `link.isExternal && "flex items-center"` (false path needs testing)
- Lines 59-60: Internal link paths (target and rel undefined)

**Testing Strategy:**
```typescript
// Already partially covered, need:
1. Test internal link (isExternal: false) without target/rel attributes
2. Test inactive link with text-foreground class
3. Test combination: active internal link
4. Test combination: inactive external link
```

**Implementation:**
- Add to existing `tests/navigation-branches.test.tsx`
- Create test cases for all 4 combinations of isActive × isExternal
- Straightforward - should take < 30 minutes

---

#### 5. **verify-and-attest/route.ts** (92.52% statements, 87.36% branches, 100% functions)
**Estimated Impact:** +0.6% overall coverage
**Difficulty:** ⭐⭐⭐⭐ (High - complex async API with many edge cases)

**Uncovered Areas:**
- Lines 569-572: Additional chain configuration edge cases
- Lines 669-772: Resolver error paths
- Lines 871-873: Attestation write error handling

**Testing Strategy:**
```typescript
// Priority tests to add:
1. Test unsupported chain ID (not in supported chains list)
2. Test resolver contract throws specific error codes
3. Test attestation write fails with gas estimation error
4. Test DID format validation edge cases
5. Test concurrent verification requests
```

**Implementation:**
- Extend `tests/verify-and-attest-coverage-gaps.test.ts`
- Mock resolver contract methods to throw specific errors
- Test chain validation with invalid chainIds
- Mock ethers provider methods for transaction failures

---

#### 6. **data-model.ts** (99.81% statements, 100% branches, 70.58% functions)
**Estimated Impact:** +0.3% function coverage
**Difficulty:** ⭐⭐ (Low - Zod schema validators)

**Uncovered Functions:**
- Various Zod schema `parse()` and `safeParse()` methods not directly invoked
- Schema refinement functions
- Schema transformation functions

**Testing Strategy:**
```typescript
// Priority tests to add:
1. Test each major Zod schema's parse() method with valid data
2. Test each schema's safeParse() with invalid data
3. Test schema refinements (custom validations)
4. Test schema transformations (coercions)
5. Test schema defaults and optional fields
```

**Implementation:**
- Create `tests/schema-data-model-validators.test.ts`
- Systematically test each exported schema
- Test both success and failure paths
- Verify error messages for invalid inputs

---

## 🎯 Strategic Implementation Plan

### Phase 1: Quick Wins (1-2 days, +2% coverage)
**Goal:** Reach 98%+ coverage with low-hanging fruit

1. **navigation.tsx branches** (30 minutes)
   - Add 4 test cases for link state combinations
   - Expected: +0.4% branch coverage

2. **data-model.ts functions** (2 hours)
   - Test all Zod schemas systematically
   - Expected: +0.3% function coverage

3. **verify-and-attest resolver errors** (3 hours)
   - Add specific resolver error test cases
   - Expected: +0.3% overall coverage

4. **nft-view-modal error paths** (2 hours)
   - Test error handling branches
   - Expected: +0.5% coverage

**Total Phase 1:** ~8 hours, +1.5% coverage → **98.5% target**

---

### Phase 2: Complex Components (3-5 days, +1.2% coverage)
**Goal:** Reach 99.5%+ coverage with complex mocking

1. **dashboard.tsx integration tests** (1 day)
   - Mock thirdweb hooks comprehensively
   - Test full update and mint workflows
   - Test owner verification flows
   - Expected: +1.0% coverage

2. **nft-mint-modal wizard validation** (1 day)
   - Test step validation blocking
   - Test localStorage error handling
   - Test wizard state machine edge cases
   - Expected: +0.8% coverage

3. **verify-and-attest edge cases** (1 day)
   - Test remaining chain configurations
   - Test attestation write failures
   - Expected: +0.4% coverage

**Total Phase 2:** ~3 days, +2.2% coverage → **99.7% target**

---

### Phase 3: The Final Mile (2-3 days, +0.3% coverage)
**Goal:** Reach 100% coverage

1. **Defensive code that's hard to trigger**
   - Lines that are theoretically reachable but practically never executed
   - May require creative mocking or dependency injection

2. **Browser-specific APIs**
   - localStorage edge cases
   - window/navigator mocking
   - Animation and timing events

3. **Race conditions and timing**
   - Async operation edge cases
   - Concurrent request handling
   - Debounced function timing

**Total Phase 3:** ~2-3 days, +0.3% coverage → **100% target**

---

## 🛠️ Practical Testing Techniques

### 1. Complex thirdweb Mocking
```typescript
// Mock thirdweb hooks with realistic state
vi.mock('thirdweb/react', () => ({
  useActiveAccount: vi.fn(() => ({
    address: '0x1234...',
    chainId: 1,
  })),
  useReadContract: vi.fn(() => ({
    data: mockData,
    isLoading: false,
    error: null,
  })),
  useSendTransaction: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ hash: '0xabc...' }),
    isPending: false,
  })),
}));
```

### 2. localStorage Error Simulation
```typescript
// Test localStorage quota exceeded
const mockSetItem = vi.spyOn(Storage.prototype, 'setItem');
mockSetItem.mockImplementation(() => {
  throw new DOMException('QuotaExceededError');
});

// Test corrupted localStorage data
const mockGetItem = vi.spyOn(Storage.prototype, 'getItem');
mockGetItem.mockReturnValue('invalid-json{{{');
```

### 3. Async State Testing
```typescript
// Test component with multiple async operations
const { result, rerender } = renderHook(() => useMyHook());

await act(async () => {
  await result.current.fetchData();
});

expect(result.current.data).toBeDefined();
```

### 4. Modal Interaction Testing
```typescript
// Test modal workflow with user events
render(<MyModal isOpen={true} />);

// Step 1: Fill form
await userEvent.type(screen.getByLabelText('Name'), 'Test App');

// Step 2: Click next
await userEvent.click(screen.getByText('Next'));

// Step 3: Wait for validation
await waitFor(() => {
  expect(screen.getByText('Step 2')).toBeInTheDocument();
});
```

### 5. Error Boundary Testing
```typescript
// Test component error handling
const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

render(
  <ErrorBoundary>
    <ComponentThatThrows />
  </ErrorBoundary>
);

expect(screen.getByText('Error occurred')).toBeInTheDocument();
consoleError.mockRestore();
```

---

## 🚧 Challenges & Solutions

### Challenge 1: Thirdweb Integration Complexity
**Problem:** Complex hooks with internal state management

**Solutions:**
- Create reusable mock factories for consistent thirdweb mocking
- Use `@testing-library/react-hooks` for hook testing
- Mock at the hook level, not the internal implementation
- Consider integration tests for critical flows

### Challenge 2: Async State Cascades
**Problem:** Multiple async operations trigger state updates

**Solutions:**
- Use `act()` consistently for all state updates
- Use `waitFor()` with specific assertions
- Test async operations in isolation first
- Mock network delays for timing tests

### Challenge 3: localStorage Reliability
**Problem:** localStorage can be disabled or full

**Solutions:**
- Always wrap localStorage calls in try-catch
- Provide fallbacks for storage failures
- Test both success and failure paths
- Consider IndexedDB for larger data

### Challenge 4: Modal Lifecycle Complexity
**Problem:** Modals have complex open/close/transition states

**Solutions:**
- Test modal state separately from parent component
- Mock animation callbacks with controlled timing
- Use `data-testid` for reliable element querying
- Test each step in isolation before full workflow

---

## 📋 Testing Checklist for 100% Coverage

### Prerequisites
- [ ] Coverage report generated and analyzed
- [ ] Uncovered lines identified and prioritized
- [ ] Mock strategies planned for complex dependencies
- [ ] Time allocated for testing work

### Phase 1: Quick Wins
- [ ] Navigation link state combinations tested
- [ ] Zod schema validators tested systematically
- [ ] Basic error paths covered in modals
- [ ] Resolver error cases added

### Phase 2: Complex Components
- [ ] Dashboard thirdweb integration mocked
- [ ] Full update workflow tested end-to-end
- [ ] Wizard validation state machine covered
- [ ] localStorage error cases tested

### Phase 3: Final Mile
- [ ] Defensive code paths triggered
- [ ] Browser API edge cases covered
- [ ] Race conditions tested
- [ ] All warnings and errors addressed

### Verification
- [ ] Run `npm run test:coverage`
- [ ] Review HTML coverage report
- [ ] Check for remaining uncovered lines
- [ ] Verify no flaky tests
- [ ] Update documentation

---

## 💡 Best Practices for Maintaining 100%

### 1. Pre-Commit Testing
```bash
# Add to .husky/pre-commit
npm run test:coverage
# Fail if coverage drops below threshold
```

### 2. Coverage Thresholds in CI
```javascript
// vitest.config.ts
export default {
  test: {
    coverage: {
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
};
```

### 3. New Code Coverage Requirements
- All new files must have 100% coverage
- All new functions must have tests
- All new branches must be tested
- Pull requests require coverage report

### 4. Regular Coverage Audits
- Weekly coverage report review
- Monthly deep-dive on uncovered areas
- Quarterly test suite health check
- Annual testing strategy review

---

## ⚠️ Important Considerations

### Diminishing Returns
- The last 3% takes as long as the first 90%
- Some code is inherently difficult to test
- Consider cost/benefit of 100% vs 97%

### Practical 100% vs Theoretical 100%
- **Practical 100%:** All reachable, testable code covered
- **Theoretical 100%:** Including unreachable defensive code
- Focus on practical 100% first

### Code That's OK to Skip
1. **Unreachable error handlers** (defensive programming)
2. **Browser compatibility fallbacks** (test environment limitations)
3. **Development-only code** (console.log, debug flags)
4. **Third-party library internals** (not your code to test)

### When to Use `/* istanbul ignore next */`
```typescript
// Legitimate use case: defensive code that can't be triggered
try {
  await dangerousOperation();
} catch (error) {
  /* istanbul ignore next */
  if (error instanceof VerySpecificError) {
    // This is defensive; VerySpecificError never thrown in practice
    handleUnexpectedError(error);
  }
}
```

---

## 📊 Expected Timeline

### Conservative Estimate (Thorough)
- Phase 1: 2 days → 98.5%
- Phase 2: 5 days → 99.7%
- Phase 3: 3 days → 100%
- **Total: 10 days**

### Aggressive Estimate (Focused)
- Phase 1: 1 day → 98.5%
- Phase 2: 3 days → 99.7%
- Phase 3: 2 days → 100%
- **Total: 6 days**

### Realistic Recommendation
- **Aim for 99%** in 5-7 days
- **Assess remaining gaps** at 99%
- **Decide if final 1% is worth it**

---

## 🎯 Recommended Action Plan

### Immediate Next Steps (Today)
1. ✅ Review this roadmap with team
2. ✅ Prioritize which components need 100% coverage
3. ✅ Decide on coverage target (99% vs 100%)
4. ✅ Allocate developer time for testing work

### This Week
1. 📝 Implement Phase 1 (Quick Wins)
2. 🎯 Reach 98.5% coverage
3. 📊 Review coverage gains
4. 🔄 Iterate on difficult areas

### Next Week
1. 📝 Implement Phase 2 (Complex Components)
2. 🎯 Reach 99.5% coverage
3. 📊 Assess final gaps
4. 🎬 Decide on Phase 3 effort

---

## 🏆 Success Metrics

### Coverage Targets
- [ ] 98% statements
- [ ] 95% branches
- [ ] 95% functions
- [ ] 98% lines

### Quality Metrics
- [ ] Zero flaky tests
- [ ] All tests complete in < 2 minutes
- [ ] No ignored test files
- [ ] All warnings resolved

### Maintenance Metrics
- [ ] Coverage tracked in CI
- [ ] Coverage reports generated automatically
- [ ] Team trained on testing practices
- [ ] Documentation complete

---

## 📚 Resources

### Testing Libraries
- Vitest: https://vitest.dev/
- Testing Library: https://testing-library.com/
- Testing Library React Hooks: https://react-hooks-testing-library.com/

### Coverage Tools
- Istanbul/nyc: https://istanbul.js.org/
- V8 Coverage: Built into Vitest
- Coverage Gutters (VS Code): Inline coverage display

### Best Practices
- Kent C. Dodds Testing Blog: https://kentcdodds.com/blog/
- Testing JavaScript Course: https://testingjavascript.com/
- Google Testing Blog: https://testing.googleblog.com/

---

**Summary:** Reaching 100% coverage is achievable in 6-10 days with focused effort. Prioritize quick wins first, then tackle complex components. Consider stopping at 99% if the final 1% proves too costly. Focus on practical, maintainable tests over theoretical perfection.

---

*Document Version: 1.0*
*Last Updated: November 14, 2024*
*Current Coverage: 96.96% | Target: 100%*

