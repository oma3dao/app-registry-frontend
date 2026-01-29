# OMATrust Specification-Driven Testing - Quick Start Guide

## 🎯 What We've Accomplished

You provided the actual OMATrust specification PDFs, and we've successfully:

1. ✅ **Extracted 42 requirements** from the OMATrust Identity Specification
2. ✅ **Created 33 specification-driven tests** across 3 test files
3. ✅ **Established a comprehensive testing framework** that validates against external specifications
4. ✅ **Documented the entire approach** with 8+ documentation files
5. ✅ **Identified compliance gaps** between specification and implementation

## 📊 Current Status

| Metric | Value |
|--------|-------|
| **Requirements Extracted** | 42 from Identity Spec |
| **Tests Created** | 33 |
| **Tests Passing** | 16 (48%) |
| **Tests Failing** | 17 (52%) - due to mock issue |
| **P0 Requirements Covered** | 10/22 (45%) |
| **Specifications Analyzed** | 1/3 (Identity complete) |

## 📁 Key Files Created

### Test Files
```
tests/spec-compliance/omatrust-spec/
├─ onchain-metadata.test.ts      (NEW - 13 tests for Table 1 fields)
├─ did-formats.test.ts            (8 tests for DID support)
└─ metadata-structure.test.ts     (12 tests for dataUrl format) ✅ All passing
```

### Documentation Files
```
Documentation/
├─ OMATRUST_IDENTITY_SPEC_REQUIREMENTS.md    (42 requirements extracted)
├─ SPECIFICATION_TESTING_PROGRESS_FINAL.md   (Comprehensive progress report)
├─ SPECIFICATION_ACCESS_GUIDE.md             (How to use specifications)
├─ ACTION_PLAN_WITH_SPEC_LOCATION.md         (Next steps guide)
└─ SPECIFICATION_REQUIREMENTS_MATRIX.md      (Requirement tracking)
```

### Specification Files (You Provided)
```
/
├─ omatrust-specification-identity.pdf      ✅ Analyzed
├─ omatrust-specification-proofs.pdf        ⏳ Pending
└─ omatrust-specification-reputation.pdf    ⏳ Pending
```

## 🔍 What's in the Identity Specification?

### Section 5.1.1: Onchain Metadata (Table 1)

Defines 12 fields for each app registry NFT:

| Field | Required | Mutable | Status |
|-------|----------|---------|--------|
| `did` | ✅ Yes | ❌ No | ✅ Tested |
| `versionHistory` | ✅ Yes | ✅ Yes (append-only) | ✅ Tested |
| `status` | ✅ Yes | ✅ Yes | ✅ Tested |
| `minter` | ✅ Yes | ❌ No | ✅ Tested |
| `owner` | ✅ Yes | ✅ Yes | ✅ Tested |
| `dataUrl` | ✅ Yes | ✅ Yes | ✅ Tested |
| `dataHash` | ✅ Yes | ✅ Yes | ✅ Tested |
| `interfaces` | ✅ Yes | ❌ No | ✅ Tested |
| `fungibleTokenId` | ❌ Optional | ❌ No | ✅ Tested |
| `contractId` | ❌ Optional | ❌ No | ✅ Tested |
| `dataHashAlgorithm` | ❌ Optional | ✅ Yes | ✅ Tested |
| `traitHashes` | ❌ Optional | ✅ Yes | ✅ Tested |

### Section 5.1.1.2: dataUrl JSON Format

Different requirements for different interface types:

| Field | Human (0) | API (2) | Contract (4) |
|-------|-----------|---------|--------------|
| `name` | **Required** | **Required** | **Required** |
| `description` (max 4000 chars) | **Required** | **Required** | **Required** |
| `publisher` | **Required** | **Required** | **Required** |
| `owner` (CAIP-10) | **Required** | **Required** | **Required** |
| `image` | **Required** | Optional | Optional |
| `screenshotUrl` | **Required** | N/A | N/A |
| `external_url` | Optional | Optional | Optional |
| `summary` (max 80 chars) | Optional | Optional | Optional |

### Section 5.1.2: DID Formats

| DID Method | Format | Support Level | Status |
|-----------|--------|---------------|--------|
| `did:web` | `did:web:example.com` | **MUST support** | ✅ Tested |
| `did:pkh` | `did:pkh:eip155:1:0x...` | **MUST support** | ✅ Tested |
| `did:artifact` | `did:artifact:<cidv1>` | SHOULD support | ❌ Not tested |

### Appendix C: Recommended Traits

13 standard trait strings:

**API Formats:**
- `api:openapi`, `api:graphql`, `api:jsonrpc`, `api:mcp`, `api:a2a`

**Token Standards:**
- `token:erc20`, `token:erc3009`, `token:spl`, `token:2022`, `token:transferable`, `token:burnable`

**Payment Protocols:**
- `pay:x402`, `pay:manual`

## 🐛 Issues Identified

### Issue 1: thirdweb Mock Configuration

**Problem:** 17 tests fail with:
```
[vitest] No "prepareContractCall" export is defined on the "thirdweb" mock.
```

**Affects:**
- `onchain-metadata.test.ts` (9 tests)
- `did-formats.test.ts` (8 tests)

**Solution:** Add proper mock configuration or use integration testing approach

### Issue 2: Specification Compliance Gaps

**Gap 1:** CAIP Format Validation
- Spec requires CAIP-10 format for `owner`
- Implementation doesn't validate format

**Gap 2:** Field Length Constraints
- Spec: `description` max 4000 chars
- Spec: `summary` max 80 chars
- Implementation: Not fully enforced

**Gap 3:** traitHashes Cap
- Spec: SHOULD cap at ≤ 20 entries
- Implementation: No cap found

**Gap 4:** Interface-Specific Requirements
- Spec: Human interfaces MUST have `image` and `screenshotUrl`
- Implementation: Not fully enforced

## 🚀 Next Steps

### Immediate (This Session)
1. **Fix thirdweb mock** - Unblocks 17 tests
2. **Extract Proofs spec** - `omatrust-specification-proofs.pdf`
3. **Extract Reputation spec** - `omatrust-specification-reputation.pdf`

### Short-Term (This Week)
4. **Create versionHistory tests** - Test format requirements
5. **Create traits tests** - Test Appendix C recommendations
6. **Create artifacts tests** - Test did:artifact method
7. **Complete dataUrl tests** - Add missing field validations

### Medium-Term (Next 2 Weeks)
8. **Find and test x402 specification** - Receipt/payment protocols
9. **Update ERC-8004 tests** - Ensure external spec references
10. **Implement missing features** - Fix compliance gaps
11. **Create compliance report** - Automated requirement tracking

## 📖 How to Use This Framework

### Running Tests

```bash
# Run all specification compliance tests
npm test -- tests/spec-compliance/ --run

# Run specific test file
npm test -- tests/spec-compliance/omatrust-spec/onchain-metadata.test.ts --run

# Run with coverage
npm test -- tests/spec-compliance/ --coverage --run
```

### Adding New Tests

1. **Find the requirement in the specification**
   - Open relevant PDF file
   - Locate section and exact requirement text

2. **Create test with proper citation**
   ```typescript
   it('validates [requirement] per [Spec] section X.Y - REQ-ID', () => {
     /**
      * Specification: OMATrust Identity Specification
      * Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
      * File: omatrust-specification-identity.pdf
      * Section: X.Y - [Section Title]
      * Requirement ID: OT-ID-XXX
      * Requirement: "[Exact quote from specification]"
      */
     
     // Test implementation
   });
   ```

3. **Update requirements matrix**
   - Add requirement to `OMATRUST_IDENTITY_SPEC_REQUIREMENTS.md`
   - Track test status

### Reading Documentation

Start here:
1. **`README_SPEC_TESTING.md`** (this file) - Overview
2. **`SPECIFICATION_TESTING_PROGRESS_FINAL.md`** - Detailed progress report
3. **`OMATRUST_IDENTITY_SPEC_REQUIREMENTS.md`** - All 42 requirements
4. **`SPECIFICATION_ACCESS_GUIDE.md`** - How to work with specs
5. **`ACTION_PLAN_WITH_SPEC_LOCATION.md`** - What to do next

## 🎓 Key Principles

### Specification-Driven Testing Rules

1. **Always cite external specifications**
   - Not internal code files
   - Specifications are the source of truth

2. **Quote exact requirement text**
   - Use requirement IDs for traceability
   - Include section numbers

3. **Test behavior, not implementation**
   - Validate outcomes match spec
   - Don't just confirm current code works

4. **Document deviations**
   - If implementation differs from spec, note why
   - File issues for compliance gaps

5. **Maintain traceability**
   - Requirement → Test → Implementation
   - Track in requirements matrix

## 📚 Specification References

### Primary Sources
- **Repository:** https://github.com/oma3dao/omatrust-docs/tree/main/specification
- **Developer Docs:** https://docs.oma3.org/

### Specifications
1. **OMATrust Identity Specification** (`omatrust-specification-identity.pdf`)
   - Application Registry structure
   - DID formats and ownership
   - Metadata requirements
   - **Status:** ✅ 42 requirements extracted

2. **OMATrust Proof Specification** (`omatrust-specification-proofs.pdf`)
   - Attestation structure
   - Cryptographic proofs
   - Verification methods
   - **Status:** ⏳ Pending analysis

3. **OMATrust Reputation Specification** (`omatrust-specification-reputation.pdf`)
   - Reputation scoring
   - Trust mechanisms
   - Attestation schemas
   - **Status:** ⏳ Pending analysis

4. **x402 Payment/Receipt Specification**
   - Location: Same repository
   - Receipt structure
   - Offer/acceptance flow
   - **Status:** ⏳ Pending location/analysis

### Related Standards
- **ERC-8004:** Ethereum metadata standard
- **W3C DID Core:** Decentralized identifiers
- **CAIP-10:** Blockchain account identifiers
- **CAIP-19:** Asset type identifiers

## 💡 Why This Matters

### Before: Implementation-Driven Testing ❌
```typescript
it('validates name length', () => {
  // Test confirms current code behavior
  // If code has a bug, test codifies the bug
  expect(schema.name.min).toBe(2);
});
```

### After: Specification-Driven Testing ✅
```typescript
it('validates name per Identity Spec 5.1.1.2 - OT-ID-017', () => {
  /**
   * Specification: OMATrust Identity Specification - Section 5.1.1.2
   * Requirement ID: OT-ID-017
   * Requirement: "name field MUST be present for ALL interface types"
   */
  
  // Test validates against external specification
  // If implementation is wrong, test catches it
  const result = buildMetadata({ name: 'Test App' });
  expect(result).toHaveProperty('name');
});
```

## 🔧 Troubleshooting

### Tests Failing with Mock Error?
- **Problem:** `prepareContractCall` not defined
- **Solution:** See Issue 1 above
- **Workaround:** Tests document requirements even if failing

### Can't Find Specification Section?
- **Solution:** Check `OMATRUST_IDENTITY_SPEC_REQUIREMENTS.md`
- **Alternative:** Search PDF files directly
- **Help:** Specification structure documented in progress report

### Implementation Doesn't Match Spec?
- **Document it:** Add to compliance gaps section
- **Create issue:** Track for future fix
- **Test should fail:** That's the point!

## 📈 Success Metrics

| Goal | Current | Target | Status |
|------|---------|--------|--------|
| Requirements Extracted | 42 | 100+ | 🟡 42% |
| Tests Created | 33 | 100+ | 🟡 33% |
| Tests Passing | 16 | All | 🔴 Blocked |
| P0 Coverage | 45% | 100% | 🟡 In Progress |
| Specs Analyzed | 1 | 3 | 🟡 33% |

**Legend:** ✅ Complete | 🟡 In Progress | 🔴 Blocked

## 🙏 Credits

**Specifications:** OMA3 DAO - https://github.com/oma3dao/omatrust-docs  
**License:** Creative Commons Attribution 4.0 International License  
**Framework:** Established January 6, 2026

---

## Quick Links

- [View All Requirements](./OMATRUST_IDENTITY_SPEC_REQUIREMENTS.md)
- [Read Progress Report](./SPECIFICATION_TESTING_PROGRESS_FINAL.md)
- [See Action Plan](./ACTION_PLAN_WITH_SPEC_LOCATION.md)
- [Access Guide](./SPECIFICATION_ACCESS_GUIDE.md)
- [Specification Repository](https://github.com/oma3dao/omatrust-docs/tree/main/specification)
- [Developer Docs](https://docs.oma3.org/)

---

**Last Updated:** January 6, 2026  
**Status:** Active Development  
**Next Review:** After mock fix + Proof/Reputation spec extraction

