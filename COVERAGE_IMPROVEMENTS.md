# Test Coverage Improvement Areas

**Last Updated:** 2025-11-07 14:25:53

**Current Overall Coverage:** 82.72% Statements | 83.98% Branches | 81.84% Functions | 82.72% Lines

> **Note:** Coverage numbers are from a previous successful test run. Current test status: 8 failed | 94 passed | 2 skipped (104 test files), 24 failed | 1,695 passed | 9 skipped (1,728 tests). Coverage files are only generated when all tests pass. To get the latest coverage numbers, fix failing tests and run `npm run test:coverage` again.

## Priority Areas for 100% Coverage

### 🔴 Critical: Files with < 80% Coverage

#### 1. **API Routes** (Highest Priority)
- **`app/api/verify-and-attest/route.ts`** - 52.57% statements, 62.5% branches, 81.81% functions
  - Uncovered lines: 1121, 1126-1147
  - Missing coverage for error handling paths and edge cases

- **`app/api/iwps-query-proxy/route.ts`** - 62.72% statements, 65.21% branches, 50% functions
  - Uncovered lines: ...-91, 98, 133-142
  - Missing error handling and proxy functionality tests

- **`app/api/discover-controlling-wallet/route.ts`** - 76.51% statements, 51.42% branches
  - Uncovered lines: ...12-213, 222-227
  - Missing branch coverage for wallet discovery logic

#### 2. **UI Components**
- **`components/caip10-input.tsx`** - 73.66% statements, 75.47% branches, 40% functions
  - Uncovered lines: ...36, 351-353, 369
  - Missing validation and error handling tests

- **`app/dashboard.tsx`** - 76.02% statements, 77.77% branches
  - Uncovered lines: ...55-231, 278-281
  - Missing component interaction and state management tests

- **`app/landing-page.tsx`** - 81.81% statements, 16.66% functions, 95.45% branches
  - Uncovered lines: ...28-130, 134-135
  - Very low function coverage - needs component render tests

#### 3. **Schema & Data Model**
- **`schema/data-model.ts`** - 89.72% statements, 72.72% branches, 17.64% functions
  - Uncovered lines: ...28-829, 835-836
  - Very low function coverage - many Zod schemas not tested
  - Missing validation edge cases

- **`schema/mapping.ts`** - 100% statements, 68.96% branches
  - Uncovered branches: 96-102, 104-109
  - Missing branch coverage for conditional logic

### 🟡 Medium Priority: Files with 80-90% Coverage

#### 4. **Component Coverage**
- **`components/nft-card.tsx`** - 89.24% statements, 91.3% branches, 60% functions
  - Uncovered lines: ...67-170, 251-254
  - Missing interaction tests (click handlers, modal triggers)

- **`components/mcp-config.tsx`** - 89.85% statements, 71.87% branches, 69.56% functions
  - Uncovered lines: ...31-132, 232-242
  - Missing MCP configuration validation tests

- **`components/select.tsx`** - 89.38% statements, 100% branches
  - Uncovered lines: 106-111, 141-146
  - Missing edge case handling

#### 5. **Utility Functions**
- **`lib/utils/validation.ts`** - 79.54% statements, 100% branches, 83.33% functions
  - Uncovered lines: 95-112
  - Missing validation error path tests

- **`lib/utils/rpc.ts`** - 87.69% statements, 88.88% branches
  - Uncovered lines: ..., 96-98, 115-116
  - Missing RPC error handling tests

- **`lib/utils/iwps.ts`** - 89.33% statements, 73.91% branches
  - Uncovered lines: ...15-116, 121-122
  - Missing IWPS protocol edge cases

#### 6. **Contract Utilities**
- **`lib/contracts/errors.ts`** - 75.89% statements, 82.92% branches
  - Uncovered lines: 110-139
  - Missing error normalization edge cases

- **`lib/contracts/registry.write.ts`** - 49.36% statements, 90.47% branches, 80% functions
  - Uncovered lines: 76-78, 96-191
  - **CRITICAL**: Very low statement coverage - many write functions not tested

### 🟢 Low Priority: Files with > 90% Coverage

#### 7. **Near Complete Coverage**
- **`lib/utils/caip10/validators/evm.ts`** - 82.45% statements, 87.5% branches
  - Uncovered lines: 55-59, 69-73
  - Missing edge case validation

- **`lib/utils/caip10/validators/solana.ts`** - 92.06% statements, 84.21% branches
  - Uncovered lines: 81-85
  - Missing error handling

- **`lib/utils/dataurl.ts`** - 98.43% statements, 90.62% branches
  - Uncovered lines: 52
  - Nearly complete

- **`lib/utils/offchain-json.ts`** - 97.5% statements, 92.53% branches
  - Uncovered lines: 143-144
  - Nearly complete

### 📝 Notes

1. **Type-only files** (like `lib/wizard/types.ts`) show 0% coverage because they contain only TypeScript types, not executable code. This is expected and doesn't need testing.

2. **Branch coverage** is often lower than statement coverage, indicating missing edge cases and conditional logic tests.

3. **Function coverage** is low in some areas (especially `data-model.ts` at 17.64%), suggesting many exported functions aren't being tested.

## Recommended Action Plan

### Phase 1: Critical API Routes (Target: 90%+)
1. Add comprehensive tests for `verify-and-attest/route.ts`
2. Add tests for `iwps-query-proxy/route.ts`
3. Improve coverage for `discover-controlling-wallet/route.ts`

### Phase 2: Core Utilities (Target: 95%+)
1. Add tests for `registry.write.ts` (currently 49.36%!)
2. Improve `errors.ts` coverage
3. Add validation edge case tests

### Phase 3: UI Components (Target: 85%+)
1. Add interaction tests for `dashboard.tsx`
2. Add validation tests for `caip10-input.tsx`
3. Add component tests for `landing-page.tsx`

### Phase 4: Schema & Data Model (Target: 95%+)
1. Add comprehensive Zod schema validation tests
2. Improve branch coverage for `mapping.ts`
3. Test all validation functions in `data-model.ts`

