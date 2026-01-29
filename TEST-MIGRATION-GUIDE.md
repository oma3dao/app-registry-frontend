# Test Migration Guide: DID Utilities Refactoring

This document describes changes to `src/lib/utils/did.ts` that require test updates.

**Migration status:** All affected test files listed below have been updated per this guide (see branch `fix/test-suite-improvements`).

## Summary of Changes

The DID utilities were consolidated and refactored. The main change is that `normalizeDid()` is now the primary public API, and `normalizeDidWeb()` is now a strict function that throws on non-web DIDs.

## Breaking Changes for Tests

### 1. `normalizeDid()` replaces `normalizeDidWeb()` as primary API

**Before:** Code called `normalizeDidWeb(did)` for all DIDs
**After:** Code calls `normalizeDid(did)` which dispatches to method-specific normalizers

**Test fix:** Change assertions from:
```typescript
expect(normalizeDidWeb).toHaveBeenCalledWith('did:web:example.com');
```
To:
```typescript
expect(normalizeDid).toHaveBeenCalledWith('did:web:example.com');
```

### 2. Mocks must use `importOriginal` pattern

The old mock pattern doesn't expose new exports (`normalizeDid`, `computeDidHash`, `buildEvmDidPkh`, etc.):

**Before:**
```typescript
vi.mock('@/lib/utils/did', () => ({
  normalizeDidWeb: vi.fn((did: string) => did),
}));
```

**After:**
```typescript
vi.mock('@/lib/utils/did', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/did')>();
  return {
    ...actual,
    normalizeDidWeb: vi.fn((did: string) => did),
    normalizeDid: vi.fn((did: string) => did),
  };
});
```

### 3. `getDidHash()` removed - use `computeDidHash()` instead

**Before:** `getDidHash(did)` - async RPC call
**After:** `computeDidHash(did)` - sync local computation

No mock needed for `computeDidHash` since it's a pure function.

### 4. `did-index.ts` deleted

Any imports from `@/lib/did-index` should change to `@/lib/utils/did`.

Old function names were renamed:
- `computeDidIndex` → `computeDidAddress`
- `didToIndexAddress` → `didToAddress`
- `validateDidIndex` → `validateDidAddress`

## Affected Test Files

| File | Changes Needed |
|------|----------------|
| `registry-write.test.ts` | Update mock, change 4 `normalizeDidWeb` → `normalizeDid` assertions |
| `registry-read.test.ts` | Update mock, change 3 `normalizeDidWeb` → `normalizeDid` assertions, remove `getDidHash` mock |
| `did-verification.test.tsx` | Update mock to include `normalizeDid` |
| `wizard-step-1.test.tsx` | Update mock to include `normalizeDid` |
| `api-routes-error-handling.test.ts` | Update mock with `importOriginal` pattern |
| `verify-and-attest-api.test.ts` | Update mock with `importOriginal` pattern |

## New Exports Available

The consolidated `did.ts` now exports:

**Normalization:**
- `normalizeDid(input)` - Primary API, handles all DID methods
- `normalizeDidWeb(input)` - Strict, throws on non-web DIDs
- `normalizeDidPkh(input)` - Strict, throws on non-pkh DIDs
- `normalizeDidHandle(input)` - Strict, throws on non-handle DIDs
- `normalizeDidKey(input)` - Strict, throws on non-key DIDs

**DID Address (for EAS indexing):**
- `computeDidHash(did)` - Sync, returns keccak256 hash
- `computeDidAddress(didHash)` - Derives address from hash
- `didToAddress(did)` - Convenience: hash + address in one call
- `validateDidAddress(did, address)` - Validates address matches DID

**DID Creation:**
- `buildDidWeb(domain)`
- `buildDidPkh(namespace, chainId, address)`
- `buildEvmDidPkh(chainId, address)` - EVM convenience wrapper
- `buildDidPkhFromCaip10(caip10)`

**DID Parsing:**
- `parseCaip10(caip10)`
- `getChainIdFromDidPkh(did)`
- `getAddressFromDidPkh(did)`
- `getNamespaceFromDidPkh(did)`
- `isEvmDidPkh(did)`
- `getDomainFromDidWeb(did)`

**Validation:**
- `isValidDid(did)`
- `extractDidMethod(did)`
- `extractDidIdentifier(did)`
