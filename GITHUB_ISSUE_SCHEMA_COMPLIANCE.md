# GitHub Issue: Schema Compliance Gaps

## Title
`[Schema] Multiple specification compliance gaps in data-model.ts`

---

## Description

### Summary
Automated specification compliance testing has identified **6 schema validation gaps** in `src/schema/data-model.ts` that violate the OMATrust Identity Specification. These gaps allow invalid data to pass validation, potentially causing issues with data integrity, security, and interoperability.

**Specification Reference:** OMATrust Identity Specification v1.0
- Section 5.1.1 (Onchain Metadata)
- Section 5.1.1.2 (dataUrl JSON Format)
- Section 5.1.2.2 (endpoints Object)

### Test Evidence
```
npm test -- tests/spec-compliance/omatrust-spec --run

5 failing tests related to schema validation:
- dataUrl accepts non-HTTP URLs
- EndpointConfig.name accepts empty string
- EndpointConfig missing required url field
- EndpointConfig.type enum not enforced
- description/summary missing max length constraints
```

---

## Issues Breakdown

### 🔴 High Priority

#### 1. `dataUrl` accepts non-HTTP URLs (Line 28)
**Current:**
```typescript
dataUrl: z.string().url(),
```

**Problem:** Accepts `ftp://`, `file://`, `data:` URLs which are insecure or unresolvable.

**Fix:**
```typescript
dataUrl: z.string().url().refine(
  (url) => url.startsWith('http://') || url.startsWith('https://'),
  { message: 'dataUrl must use HTTP or HTTPS protocol' }
),
```

#### 2. `EndpointConfig.endpoint` should be required (Line 60)
**Current:**
```typescript
endpoint: z.string().url().optional(),
```

**Problem:** Endpoints without URLs are non-functional.

**Fix:**
```typescript
endpoint: z.string().url(),  // Remove .optional()
```

---

### 🟡 Medium Priority

#### 3. `EndpointConfig.name` accepts empty string (Line 59)
**Current:**
```typescript
name: z.string().optional(),
```

**Problem:** Empty string `""` passes validation but is meaningless.

**Fix:**
```typescript
name: z.string().min(1, 'Endpoint name cannot be empty').optional(),
```

#### 4. `EndpointConfig` missing `type` enum validation (Lines 58-62)
**Current:** No `type` field exists.

**Problem:** API type is not validated against spec-defined values.

**Fix:**
```typescript
type: z.enum(['openapi', 'graphql', 'jsonrpc', 'mcp', 'a2a']).optional(),
```

---

### 🟢 Low Priority (Enhancements)

#### 5. `description` missing max length (Line 72)
**Spec Requirement:** Maximum 4000 characters

**Current:**
```typescript
description: z.string().min(10),
```

**Fix:**
```typescript
description: z.string().min(10).max(4000),
```

#### 6. `summary` missing max length (Line 78)
**Spec Requirement:** Maximum 80 characters

**Current:**
```typescript
summary: z.string().optional(),
```

**Fix:**
```typescript
summary: z.string().max(80).optional(),
```

---

## Complete Fix

Apply these changes to `src/schema/data-model.ts`:

```typescript
// Line 22-36: OnChainApp
export const OnChainApp = z.object({
  did: z.string().min(1, "DID is required"),
  initialVersionMajor: z.number().int().min(0),
  initialVersionMinor: z.number().int().min(0),
  initialVersionPatch: z.number().int().min(0),
  interfaces: z.number().int().nonnegative(),
  dataUrl: z.string().url().refine(                          // ✅ FIX #1
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    { message: 'dataUrl must use HTTP or HTTPS protocol' }
  ),
  dataHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  dataHashAlgorithm: z.literal(0).or(z.literal(1)),
  fungibleTokenId: z.string().optional().default(""),
  contractId: z.string().optional().default(""),
  traitHashes: z.array(z.string().regex(/^0x[0-9a-fA-F]{64}$/)).max(20).default([]),
  minter: z.string(),
  status: z.number().int().min(0).max(2).default(0),
});

// Lines 58-62: EndpointConfig
export const EndpointConfig = z.object({
  name: z.string().min(1).optional(),                        // ✅ FIX #3
  type: z.enum(['openapi', 'graphql', 'jsonrpc', 'mcp', 'a2a']).optional(),  // ✅ FIX #4
  endpoint: z.string().url(),                                // ✅ FIX #2 (required)
  schemaUrl: z.string().url().optional(),
}).merge(McpEndpointFields);

// Lines 69-99: OffChainMetadata
export const OffChainMetadata = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(10).max(4000),                 // ✅ FIX #5
  publisher: z.string().min(1),
  image: z.string().url(),
  external_url: z.string().url().optional(),
  summary: z.string().max(80).optional(),                    // ✅ FIX #6
  // ... rest unchanged
}).strict();
```

---

## Acceptance Criteria

- [ ] All 6 schema issues are fixed in `src/schema/data-model.ts`
- [ ] All spec-compliance tests pass: `npm test -- tests/spec-compliance/omatrust-spec --run`
- [ ] No regression in existing tests
- [ ] Update any form validation that depends on these schemas

---

## Impact Assessment

| Issue | Security | Data Integrity | UX | Breaking Change |
|-------|----------|----------------|-----|-----------------|
| dataUrl protocol | 🔴 High | 🔴 High | Low | Possible |
| endpoint required | Low | 🟠 Medium | Low | Yes |
| name empty string | Low | 🟡 Medium | Low | No |
| type enum | Low | 🟡 Medium | Low | No |
| description max | Low | Low | 🟡 Medium | No |
| summary max | Low | Low | 🟡 Medium | No |

**Note:** Making `endpoint` required may be a breaking change if existing data has endpoints without URLs.

---

## Related

- **Tracked in:** `OMATRUST_SPECIFICATION_REQUIREMENTS.md`
- **CI Workflow:** `.github/workflows/spec-compliance.yml`
- **Known Issues:** `SPECIFICATION_COMPLIANCE_ISSUES.md`

---

## Labels
`schema`, `spec-compliance`, `bug`, `data-model`, `validation`

## Assignees
(Assign to developer responsible for schema/data-model)

## Milestone
Specification Compliance v1.0

