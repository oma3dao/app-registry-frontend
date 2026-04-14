# PR Consolidation – Manual Actions

GitHub CLI (`gh`) is not installed. Please complete these steps on GitHub:

---

## 1. Update PR #31 Description

Add this section to the bottom of [PR #31](https://github.com/oma3dao/app-registry-frontend/pull/31) (Edit description):

```markdown
## Rebase & SDK Integration (Latest)

- **Rebased** on latest `staging` with SDK integration (`@oma3/omatrust` / `@oma3/omatrust/identity`)
- **Behind = 0** vs target base `staging`
- All tests migrated from `@/lib/utils/did` to `@oma3/omatrust/identity`
- **Cherry-pick of 1eaad4f** (PR #23) skipped: conflicts with intentional file removals; scope superseded by this overhaul
- PRs #30, #22, #23 closed as superseded/duplicate scope
```

---

## 2. Close Superseded PRs

Close these PRs with the reason **“Superseded by PR #31”**:

| PR | Branch | Link |
|----|--------|------|
| **#30** | `fix/test-suite-improvements` | https://github.com/oma3dao/app-registry-frontend/pull/30 |
| **#22** | — | https://github.com/oma3dao/app-registry-frontend/pull/22 |
| **#23** | `test/update-unit-tests-for-main-sync` | https://github.com/oma3dao/app-registry-frontend/pull/23 |

On each PR page: **Close pull request** → optionally add comment: *Superseded by PR #31 (consolidated test overhaul with SDK integration).*

---

## Status Summary

| Item | Status |
|------|--------|
| Branch `test/erc8004ext-spec-and-cleanup` rebased on `staging` | Done |
| Behind = 0 vs `staging` | Done |
| Tests passing (146 files, 3224 tests) | Done |
| Force-push to update PR #31 | Done |
| PR #31 description update | **Manual** |
| Close PRs #30, #22, #23 | **Manual** |
