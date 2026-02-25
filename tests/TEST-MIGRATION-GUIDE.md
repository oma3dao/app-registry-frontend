# Test Migration Guide: DID Utilities (@oma3/omatrust SDK)

This document describes the DID utilities migration to the `@oma3/omatrust` npm package and how tests should use it.

**Migration status:** All affected test files have been updated to use `@oma3/omatrust/identity`. The legacy `@/lib/utils/did.ts` module was removed in favor of the SDK.

## Summary of Changes

DID utilities are now provided by the `@oma3/omatrust` npm package (`@oma3/omatrust/identity`). The local `src/lib/utils/did.ts` module has been deleted.

## Using @oma3/omatrust/identity in Tests

### 1. Imports

**Use:**
```typescript
import {
  normalizeDid,
  normalizeDidWeb,
  computeDidHash,
  didToAddress,
  getDomainFromDidWeb,
  // ... other exports as needed
} from '@oma3/omatrust/identity';
```

### 2. Mocks (use `importOriginal` pattern)

When mocking, spread the actual module and override only what you need:

```typescript
vi.mock('@oma3/omatrust/identity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@oma3/omatrust/identity')>();
  return {
    ...actual,
    normalizeDid: vi.fn((did: string) => did),
    normalizeDidWeb: vi.fn((input: string) =>
      input.startsWith('did:') ? input : `did:web:${input}`
    ),
    computeDidHash: vi.fn((did: string) =>
      `0x${Buffer.from(did).toString('hex').padEnd(64, '0').slice(0, 64)}` as `0x${string}`
    ),
  };
});
```

### 3. Key API Differences

- `normalizeDid(input)` - Primary API, handles all DID methods
- `normalizeDidWeb(input)` - Strict, throws on non-web DIDs (SDK message: "Expected did:web DID")
- `computeDidHash(did)` - Sync, returns keccak256 hash (replaces legacy `getDidHash`)
- `didToAddress(did)` - Derives address from DID for EAS indexing

## Affected Test Files (Updated)

| File | Usage |
|------|-------|
| `registry-write.test.ts` | Mocks `@oma3/omatrust/identity`, uses `normalizeDid` |
| `registry-read.test.ts` | Mocks `@oma3/omatrust/identity`, uses `normalizeDid`, `computeDidHash` |
| `did-verification.test.tsx` | Mocks `@oma3/omatrust/identity` |
| `wizard-step-1.test.tsx` | Mocks `@oma3/omatrust/identity` |
| `api-routes-error-handling.test.ts` | Mocks `@oma3/omatrust/identity` |
| `verify-and-attest-api.test.ts` | Mocks `@oma3/omatrust/identity` |
| `controller-witness.test.ts` | Mocks `getDomainFromDidWeb`, `didToAddress` |
| `controller-witness-api-contract.test.ts` | Mocks `getDomainFromDidWeb` |
| `did-utils.test.ts` | Imports from `@oma3/omatrust/identity` |
| `did-index.test.ts` | Imports from `@oma3/omatrust/identity` |
| `spec-compliance/*` | All spec-compliance tests use `@oma3/omatrust/identity` |

## SDK Exports (from @oma3/omatrust/identity)

**Normalization:**
- `normalizeDid`, `normalizeDidWeb`, `normalizeDidPkh`, `normalizeDidHandle`, `normalizeDidKey`, `normalizeDomain`

**DID Address (EAS indexing):**
- `computeDidHash`, `computeDidAddress`, `didToAddress`, `validateDidAddress`

**DID Creation:**
- `buildDidWeb`, `buildDidPkh`, `buildEvmDidPkh`, `buildDidPkhFromCaip10`

**DID Parsing:**
- `getChainIdFromDidPkh`, `getAddressFromDidPkh`, `getNamespaceFromDidPkh`, `isEvmDidPkh`, `getDomainFromDidWeb`

**Validation:**
- `isValidDid`, `extractDidMethod`, `extractDidIdentifier`
