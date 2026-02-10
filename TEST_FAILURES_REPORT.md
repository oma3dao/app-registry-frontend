# Test Failures Report

**Date:** January 14, 2026  
**Test Run:** Full test suite with coverage  
**Results:** 3,442 passed | 35 failed | 29 skipped (3,506 total)

---

## Summary

| Category | Count | Action Required |
|----------|-------|-----------------|
| Codebase Bugs | 3 | Developer fix needed |
| Schema Mismatches | 4 | Developer fix needed |
| Test Timeouts | 6 | Investigation needed |

---

## 1. CODEBASE BUGS (Requires Developer Fix)

### BUG-001: `normalizeDidWeb()` crashes on undefined input
**File:** `src/lib/utils/did.ts:11`  
**Severity:** High  
**Failing Test:** `tests/spec-compliance/erc8004-compliance.test.ts`

**Problem:**
```typescript
export function normalizeDidWeb(input: string): string {
  let s = input.trim();  // ❌ Crashes if input is undefined
```

**Error:**
```
TypeError: Cannot read properties of undefined (reading 'trim')
```

**Recommended Fix:**
```typescript
export function normalizeDidWeb(input: string): string {
  if (!input) {
    throw new Error('DID input is required');
  }
  let s = input.trim();
```

---

### BUG-002: `normalizeDidWeb()` incorrectly converts `did:pkh` to `did:web`
**File:** `src/lib/utils/did.ts`  
**Severity:** High  
**Status:** Already documented in OMATRUST_SPECIFICATION_REQUIREMENTS.md as BUG-001

**Problem:** The function blindly adds `did:web:` prefix to any DID, even `did:pkh` DIDs.

---

### BUG-003: Missing input validation in `prepareRegisterApp8004()`
**File:** `src/lib/contracts/registry.write.ts:99`  
**Severity:** Medium

**Problem:** Function doesn't validate required fields before calling `normalizeDidWeb()`.

**Recommended Fix:** Add input validation at the start of the function.

---

## 2. SCHEMA MISMATCHES (Requires Developer Fix)

### SCHEMA-001: `EndpointConfig` schema doesn't match specification
**File:** `src/schema/data-model.ts:58-63`  
**Failing Test:** `tests/spec-compliance/data-model-compliance.test.ts`

**Current Schema:**
```typescript
export const EndpointConfig = z.object({
  name: z.string().optional(),           // ❌ Should be required, min(1)
  endpoint: z.string().url().optional(), // ❌ Field is named 'endpoint', not 'url'
  schemaUrl: z.string().url().optional(),
}).merge(McpEndpointFields);
```

**Expected per Specification:**
```typescript
export const EndpointConfig = z.object({
  name: z.string().min(1),                                    // Required, non-empty
  url: z.string().url(),                                      // Required URL (not 'endpoint')
  type: z.enum(["openapi", "graphql", "jsonrpc", "mcp", "a2a"]), // Required type
  schemaUrl: z.string().url().optional(),
});
```

**Failing Assertions:**
- `EndpointConfig.shape.name.safeParse('').success` expected `false`, got `true`
- `EndpointConfig.shape.url` is `undefined` (field is named `endpoint`)
- `EndpointConfig.shape.type` is `undefined` (field doesn't exist)

---

### SCHEMA-002: `OnChainApp.dataUrl` accepts FTP protocol
**File:** `src/schema/data-model.ts:27`  
**Failing Test:** `tests/spec-compliance/data-model-compliance.test.ts`

**Current Schema:**
```typescript
dataUrl: z.string().url(),  // ❌ Accepts any valid URL including ftp://
```

**Expected per Specification:**
```typescript
dataUrl: z.string().url().refine(
  (url) => url.startsWith('https://') || url.startsWith('http://'),
  { message: 'dataUrl must use HTTP or HTTPS protocol' }
),
```

**Failing Assertion:**
- `OnChainApp.shape.dataUrl.safeParse('ftp://example.com').success` expected `false`, got `true`

---

### SCHEMA-003: Missing validation limits per specification
**File:** `src/schema/data-model.ts`  
**Status:** Documented in OMATRUST_SPECIFICATION_REQUIREMENTS.md as GAP-001 to GAP-004

| Field | Current | Expected |
|-------|---------|----------|
| `description` | `z.string().min(10)` | `z.string().min(10).max(4000)` |
| `summary` | `z.string().optional()` | `z.string().max(80).optional()` |

---

## 3. TEST TIMEOUTS (Investigation Needed)

### TIMEOUT-001: nft-view-modal tests hang indefinitely
**Files:**
- `tests/nft-view-modal.test.tsx`
- `tests/nft-view-modal-additional-coverage.test.tsx`
- `tests/nft-view-modal-attestation.test.tsx`
- `tests/nft-view-modal-branches.test.tsx`
- `tests/nft-view-modal-edit-status.test.tsx`
- `tests/nft-view-modal-error-paths.test.tsx`

**Symptoms:**
- Tests show `0/X` progress and never complete
- No error messages, just timeout
- Affects 6 test files, ~47 tests total

**Possible Causes:**
1. Infinite loop in component rendering
2. Unresolved promises in async operations
3. Missing mock for external dependency
4. React state update loop

**Recommended Action:** Developer investigation needed to identify the blocking operation.

---

## 4. TEST FIXES APPLIED (By Test Engineer)

The following test improvements were made without modifying source code:

### Added to `tests/caip10-solana-validator.test.ts`:
- Tests for base58 decoder edge cases (leading 1s, carry overflow)
- Tests for various address lengths

### Added to `tests/contract-errors.test.ts`:
- Tests for error data as number, array, boolean
- Tests for empty string and uppercase hex prefix
- Tests for fallback chain in error data extraction

### Added to `tests/dataurl.test.ts`:
- Test for missing content-type header

---

## 5. COVERAGE STATUS

### Current Coverage (for tested lib files):
| File | Statements | Branches | Functions |
|------|------------|----------|-----------|
| errors.ts | 100% | 97.87% | 100% |
| dataurl.ts | 100% | 100% | 100% |
| did.ts | 100% | 100% | 100% |
| solana.ts | 92.06% | 84.21% | 100% |

### Unreachable Code (Cannot be tested without source changes):
- `solana.ts:81-85` - Defensive code after regex validation
- `errors.ts:92` - V8 coverage quirk with compound boolean

### Configured Thresholds vs Actual:
| Metric | Threshold | Actual | Status |
|--------|-----------|--------|--------|
| Branches | 75% | ~92% | ✅ Pass |
| Functions | 78% | 100% | ✅ Pass |
| Lines | 84% | ~97% | ✅ Pass |

---

## Recommended Actions

### For Developers:
1. **Priority 1:** Fix `normalizeDidWeb()` to handle undefined input
2. **Priority 2:** Update `EndpointConfig` schema to match specification
3. **Priority 3:** Add HTTP/HTTPS-only validation to URL fields
4. **Priority 4:** Investigate nft-view-modal test timeouts

### For Test Engineers:
1. Monitor test suite after developer fixes
2. Add regression tests for fixed bugs
3. Consider marking unreachable code with `/* v8 ignore */` comments (requires dev approval)

---

**Report Generated By:** Test Engineering Team  
**Next Review:** After developer fixes are applied
