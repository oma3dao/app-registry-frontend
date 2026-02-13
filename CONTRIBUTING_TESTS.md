# Contributing Tests - Quick Reference

## ⚠️ Test Reduction First!

**Current:** ~63k test lines for ~17k source = **~3.8:1** (improving; was 4.8:1).

**Target:** **1:1 to 2:1** (industry norm). Avoid 5:1+ — suggests over-testing, redundancy, or coverage-driven bloat.

**Quality > quantity.** A focused ~20k lines of well-designed tests often catches more bugs than 100k+ of redundant ones.

**Action:** See `TEST_REDUCTION_PLAN.md` and `REDUCTION_PROGRESS.md` before adding new tests.

---

## 🎯 PR Size Guidelines

| PR Size | Status | Review Time |
|---------|--------|-------------|
| **< 200 lines** | ✅ Ideal | < 30 min |
| **200-500 lines** | ✅ Good | 30-60 min |
| **500-1000 lines** | ⚠️ Large | 1-2 hours |
| **> 1000 lines** | ❌ Too Big | Unreviewable |

**Target:** Keep PRs under **500 lines** when possible.

---

## ✅ PR Requirements

Before opening a PR:

1. ✅ **All existing tests pass** (`npm test`)
2. ✅ **New tests pass** (green checkmarks)
3. ✅ **No test suite hangs** (completes in < 5 min)
4. ✅ **PR is < 1000 lines** (ideally < 500)
5. ✅ **Clear scope** (single focus area)
6. ✅ **Documentation updated** (if needed)

---

## 📦 PR Organization Strategy

See `PR_ORGANIZATION_PLAN.md` for the full breakdown of 22 focused PRs.

### Quick Reference - PR Groups

**Foundation (PRs 1-3):**
- Test infrastructure
- Basic UI components

**Core Features (PRs 4-9):**
- Wizard steps
- Dashboard
- Modals
- Landing page

**Backend (PRs 10-14):**
- DID/CAIP-10 validation
- Contract interactions
- Utilities

**Spec & E2E (PRs 15-20):**
- Specification compliance
- End-to-end tests

**Polish (PRs 21-22):**
- Coverage gaps
- Documentation

---

## 🚫 Anti-Patterns

❌ **Don't:**
- Create PRs > 1000 lines
- Mix unrelated test areas
- Skip test runs before merging
- Add tests that depend on unmerged PRs
- Over-test implementation details

✅ **Do:**
- Group related tests together
- Keep PRs focused on one area
- Run tests before opening PR
- Test behavior, not implementation
- Document what's tested and why

---

## 📝 Test File Naming

Follow existing patterns:

- `{component}.test.tsx` - Component tests
- `{module}.test.ts` - Utility/function tests
- `{feature}-coverage-gaps.test.tsx` - Coverage improvements
- `{feature}-branches.test.tsx` - Branch coverage
- `e2e/{feature}.spec.ts` - E2E tests

---

## 🔍 Review Checklist

When reviewing test PRs:

1. ✅ Do tests actually test behavior (not implementation)?
2. ✅ Are tests independent (no shared state)?
3. ✅ Are mocks appropriate (not over-mocking)?
4. ✅ Is test code DRY (shared fixtures/helpers)?
5. ✅ Are edge cases covered?
6. ✅ Is documentation clear?

---

## 🐛 Common Issues

### Test Suite Hangs
- **Symptom:** Tests never complete
- **Solution:** Remove problematic tests (like nft-view-modal), use mocks instead

### Too Many Tests
- **Symptom:** 5:1 test-to-source ratio
- **Solution:** Remove redundant tests, focus on behavior

### Large PRs
- **Symptom:** 55k+ lines in one PR
- **Solution:** Split into focused PRs (see PR_ORGANIZATION_PLAN.md)

---

## 📚 Resources

- **Full PR Plan:** `PR_ORGANIZATION_PLAN.md`
- **Testing Guide:** `README-TESTING.md`
- **Spec Testing:** `README_SPEC_TESTING.md`

---

## 💡 Quick Tips

1. **Start small:** One component/feature per PR
2. **Test behavior:** What the user sees, not internal state
3. **Use mocks wisely:** Mock external dependencies, not your own code
4. **Keep it fast:** Tests should complete in seconds, not minutes
5. **Document intent:** Comments explain *why*, not *what*
