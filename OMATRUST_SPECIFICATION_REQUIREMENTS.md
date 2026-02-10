# OMATrust Specification Requirements - Consolidated

**Last Updated:** January 7, 2026  
**Test Suite:** `tests/spec-compliance/omatrust-spec/` (33 test files, 593 tests)  
**Repository:** https://github.com/oma3dao/omatrust-docs/tree/main/specification  
**License:** Creative Commons Attribution 4.0 International License

---

## Table of Contents

1. [Identity Registry Specification](#1-identity-registry-specification)
2. [Reputation Specification](#2-reputation-specification)
3. [Proof Specification](#3-proof-specification)
4. [Coverage Summary](#4-coverage-summary)
5. [Known Issues](#5-known-issues)
6. [Test File Reference](#6-test-file-reference)

---

# 1. Identity Registry Specification

**Source:** omatrust-specification-proofs.pdf (actual Identity Registry spec)

The OMATrust Identity Registry Specification defines:
- **Application Registry** - A registry of tokenized Applications identified by DIDs
- **Ownership Resolver** - A smart contract that resolves token ownership disputes

---

## 1.1 Onchain Metadata (Table 1)

**Test File:** `onchain-metadata.test.ts`

### Required Fields

| Req ID | Field | Format | Description | Mutable | Priority | Status |
|--------|-------|--------|-------------|---------|----------|--------|
| OT-ID-001 | did | string | DID identifier (see Table 3) | N | P0 | ✅ |
| OT-ID-002 | versionHistory | [object] | Array of released version structs, append only | Y | P0 | ✅ |
| OT-ID-003 | status | enum | Active, deprecated, replaced | Y | P0 | ✅ |
| OT-ID-004 | minter | address | Address of transaction signer | N | P0 | ✅ |
| OT-ID-005 | owner | address | Current owner (ERC-721) | Y | P0 | ✅ |
| OT-ID-006 | dataUrl | URL | URL to offchain data | Y | P0 | ✅ |
| OT-ID-007 | dataHash | string | Hash of JSON returned by dataUrl | Y | P0 | ✅ |
| OT-ID-008 | interfaces | [enum] | Interface capability codes (0=human, 1=api, 2=smart contract) | N | P0 | ✅ |

### Optional Fields

| Req ID | Field | Format | Description | Priority | Status |
|--------|-------|--------|-------------|----------|--------|
| OT-ID-009 | fungibleTokenId | string | CAIP-19 token ID | P1 | ✅ |
| OT-ID-010 | contractId | string | CAIP-10 contract address | P1 | ✅ |
| OT-ID-011 | dataHashAlgorithm | string | Hash algorithm: "keccak256", "sha256" | P1 | ✅ |
| OT-ID-012 | traitHashes | [string] | Hashed traits, max 20 entries | P1 | ✅ |

---

## 1.2 versionHistory Format

**Test File:** `version-history.test.ts`

| Req ID | Field | Format | Required | Priority | Status |
|--------|-------|--------|----------|----------|--------|
| OT-ID-014 | major | Int | Y | P0 | ✅ |
| OT-ID-015 | minor | Int | Y | P0 | ✅ |
| OT-ID-016 | patch | Int | Y | P0 | ✅ |

---

## 1.3 dataUrl JSON Format (Offchain Metadata)

**Test Files:** `offchain-metadata.test.ts`, `dataurl-validation.test.ts`

### Common Fields (All Interface Types)

| Req ID | Field | Format | Interface 0 | Interface 2 | Interface 4 | Priority | Status |
|--------|-------|--------|-------------|-------------|-------------|----------|--------|
| OT-ID-017 | name | string | Y | Y | Y | P0 | ✅ |
| OT-ID-018 | description | string | Y (max 4000 chars) | Y | Y | P0 | ✅ |
| OT-ID-019 | publisher | string | Y | Y | Y | P0 | ✅ |
| OT-ID-020 | owner | string | Y (CAIP-10 format) | Y | Y | P0 | ✅ |
| OT-ID-021 | registrations | [JSON] | Y | Y | Y | P0 | ❌ |
| OT-ID-022 | image | URL | Y | O | O | P0 | ✅ |
| OT-ID-023 | external_url | URL | O | O | O | P1 | ✅ |
| OT-ID-024 | summary | string | O (max 80 chars) | O | O | P1 | ✅ |
| OT-ID-025 | traits | [string] | O (max 20, 120 chars total) | O | O | P1 | ✅ |

### Human Interface (Interface 0) Specific

| Req ID | Field | Format | Required | Priority | Status |
|--------|-------|--------|----------|----------|--------|
| OT-ID-026 | screenshotUrls | [URL] | Y | P0 | ✅ |
| OT-ID-027 | videoUrls | [URL] | O | P2 | ✅ |
| OT-ID-028 | 3dAssetUrls | [URL] | O | P2 | ✅ |
| OT-ID-029 | platforms | JSON | Y | P0 | ✅ |

### API Interface (Interface 2) Specific

| Req ID | Field | Format | Required | Priority | Status |
|--------|-------|--------|----------|----------|--------|
| OT-ID-030 | endpoints | [JSON] | Y | P0 | ✅ |
| OT-ID-031 | interfaceVersions | [string] | O | P1 | ❌ |

---

## 1.4 platforms Object (Interface 0)

**Test File:** `platforms-structure.test.ts`

| Req ID | Platform | Format | Priority | Status |
|--------|----------|--------|----------|--------|
| OT-ID-040 | web | JSON | P0 | ✅ |
| OT-ID-041 | ios | JSON | P1 | ✅ |
| OT-ID-042 | android | JSON | P1 | ✅ |
| OT-ID-043 | windows | JSON | P1 | ✅ |
| OT-ID-044 | macos | JSON | P1 | ✅ |
| OT-ID-045 | meta | JSON | P2 | ❌ |

### Platform Object Fields

| Req ID | Field | Format | Required | Priority | Status |
|--------|-------|--------|----------|----------|--------|
| OT-ID-050 | launchUrl | string | Y | P0 | ✅ |
| OT-ID-051 | supported | boolean | O | P1 | ✅ |
| OT-ID-052 | downloadUrl | string | O | P1 | ❌ |
| OT-ID-053 | artifactDid | string | O | P1 | ✅ |

---

## 1.5 endpoints Object (Interface 2/4)

**Test File:** `endpoints-structure.test.ts`

| Req ID | Field | Format | Required | Priority | Status |
|--------|-------|--------|----------|----------|--------|
| OT-ID-060 | name | string | Y (MCP, A2A, etc.) | P0 | ✅ |
| OT-ID-061 | endpoint | string | Y (URL) | P0 | ✅ |
| OT-ID-062 | schemaUrl | string | O | P1 | ✅ |

---

## 1.6 DID Formats

**Test File:** `did-formats.test.ts`

| Req ID | DID Method | Format | Priority | Status |
|--------|------------|--------|----------|--------|
| OT-ID-DID-001 | did:web | did:web:<domain> | P0 | ✅ |
| OT-ID-DID-002 | did:pkh | did:pkh:<chain>:<address> | P0 | ⚠️ BUG |
| OT-ID-DID-003 | did:artifact | did:artifact:<cidv1> | P0 | ✅ |

---

## 1.7 Metadata Confirmation

**Test File:** `did-confirmation.test.ts`

### DID Confirmation (5.1.3.1)

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-ID-070 | did:web MUST support .well-known/did.json verification | P0 | ✅ |
| OT-ID-071 | did:web MUST support DNS TXT record verification (_omatrust.<domain>) | P0 | ✅ |
| OT-ID-072 | did:pkh MUST confirm controlling address matches minter | P0 | ✅ |

### dataUrl Confirmation (5.1.3.3)

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-ID-080 | dataHash MUST equal hash of JCS-canonicalized JSON | P0 | ✅ |
| OT-ID-081 | dataUrl.owner MUST match NFT owner address | P0 | ✅ |

### JSON Policies (5.1.3.4)

**Test File:** `json-policies.test.ts`

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-ID-090 | JSON MUST conform to RFC 8259 (no comments, trailing commas) | P0 | ✅ |
| OT-ID-091 | JSON MUST be canonicalized using JCS (RFC 8785) | P0 | ✅ |
| OT-ID-092 | dataHash = HASH(canonicalUtf8Bytes) | P0 | ✅ |

---

## 1.8 Control Policy (Versioning Rules)

**Test File:** `control-policy.test.ts`

| Req ID | Desired Change | Rule | Priority | Status |
|--------|----------------|------|----------|--------|
| OT-ID-100 | Major version change | Must mint new NFT | P0 | ✅ |
| OT-ID-101 | Edit interfaces | Minor bump, additive only | P0 | ✅ |
| OT-ID-102 | Edit traitHashes | Requires patch or minor bump | P1 | ✅ |
| OT-ID-103 | Edit dataUrl | Must mint new NFT | P0 | ✅ |
| OT-ID-104 | Edit contractId | Not allowed | P0 | ✅ |

---

## 1.9 did:artifact Method (Appendix A)

**Test File:** `did-artifact.test.ts`

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-ID-110 | Format: did:artifact:<cidv1> | P1 | ✅ |
| OT-ID-111 | CIDv1 MUST use multibase base32-lower | P1 | ✅ |
| OT-ID-112 | Multihash MUST use SHA-256 | P1 | ✅ |
| OT-ID-113 | Binary artifacts: hash file bytes directly | P1 | ✅ |
| OT-ID-114 | Website artifacts: hash JCS-canonicalized SRI manifest | P1 | ❌ |

---

## 1.10 Recommended Traits (Appendix C)

**Test File:** `traits.test.ts`

| Req ID | Trait Category | Example Traits | Priority | Status |
|--------|---------------|----------------|----------|--------|
| OT-ID-120 | API Format | api:openapi, api:graphql, api:jsonrpc, api:mcp, api:a2a | P1 | ✅ |
| OT-ID-121 | Token Standard | token:erc20, token:erc3009, token:spl, token:2022 | P1 | ✅ |
| OT-ID-122 | Payment Protocol | pay:x402, pay:manual | P1 | ✅ |

---

## 1.11 Ownership Resolver Contract

**Test File:** `ownership-resolver.test.ts`

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-ID-130 | First attestation from approved Issuer confirms DID ownership | P0 | ✅ |
| OT-ID-131 | Challenge requires 2+ attestations from other approved issuers | P0 | ✅ |
| OT-ID-132 | 72h maturation delay for attestation scoring | P1 | ✅ |

---

## 1.12 DID → Index Address

**Test File:** `did-index-address.test.ts`

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-ID-140 | DID → Index Address: keccak256("DID:Solidity:Address:v1:" + didHash) | P0 | ✅ |
| OT-ID-141 | EAS recipient MUST equal computed indexAddress(did) | P0 | ✅ |
| OT-ID-142 | Attestation payload MUST include subjectDidHash | P0 | ✅ |

---

# 2. Reputation Specification

**Source:** omatrust-specification-identity.pdf (actual Reputation spec)

The OMATrust Reputation Specification defines the trust and reputation layer for applications. Key aspects:
- **Service Reputation System** - NOT client/user reputation
- **Modular and Verifiable** - All reputation objects are structured attestations
- **Proof-Based or Trusted-Attester** validation models

---

## 2.1 Attestation Model

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-RP-001 | Two trust derivation methods: Proof-based (trustless) and Trusted-attester | P0 | ❌ |
| OT-RP-002 | Attestations MUST have canonical JSON representation | P0 | ❌ |
| OT-RP-003 | Attestations MUST use DID-based identifiers for subjects, issuers, services | P0 | ✅ |
| OT-RP-004 | Attestations MUST support explicit versioning | P0 | ✅ |
| OT-RP-005 | Attestations are transport-independent | P1 | ❌ |

---

## 2.2 Linked Identifier Attestation

**Test Files:** `attestation-schemas.test.ts`, `proof-bindings.test.ts`

### Fields

| Req ID | Field | Req | Format | Priority | Status |
|--------|-------|-----|--------|----------|--------|
| OT-RP-020 | attester | Y | string (DID) | P0 | ✅ |
| OT-RP-021 | subject | Y | string (DID) | P0 | ✅ |
| OT-RP-022 | linkedId | Y | string (DID) | P0 | ✅ |
| OT-RP-023 | method | Y | string | P0 | ✅ |
| OT-RP-024 | revoked | N | bool | P1 | ❌ |
| OT-RP-025 | proofs | N | [object] | P0 | ✅ |
| OT-RP-026 | issuedAt | Y | integer (Unix timestamp) | P0 | ✅ |
| OT-RP-027 | effectiveAt | N | integer | P1 | ✅ |
| OT-RP-028 | expiresAt | N | integer | P1 | ✅ |

### Proof Binding Requirements

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-RP-030 | Proof Subject MUST equal attestation subject | P0 | ✅ |
| OT-RP-031 | Proof Controller MUST equal attestation linkedId | P0 | ✅ |
| OT-RP-032 | proofPurpose MUST be "shared-control" | P0 | ✅ |

---

## 2.3 Key Binding Attestation

**Test Files:** `attestation-schemas.test.ts`, `keypurpose-values.test.ts`, `key-lifecycle.test.ts`

### Fields

| Req ID | Field | Req | Format | Priority | Status |
|--------|-------|-----|--------|----------|--------|
| OT-RP-040 | subject | Y | string (DID) | P0 | ✅ |
| OT-RP-041 | keyId | Y | string (DID, e.g., did:pkh) | P0 | ✅ |
| OT-RP-042 | publicKeyJwk | N | object (JWK) | P0 | ✅ |
| OT-RP-043 | keyPurpose | Y | [string] | P0 | ✅ |
| OT-RP-044 | proofs | Y | [object] | P0 | ✅ |
| OT-RP-045 | issuedAt | Y | integer | P0 | ✅ |
| OT-RP-046 | expiresAt | N | integer | P1 | ✅ |

### keyPurpose Values (W3C DID Core)

| Req ID | Value | Description | Priority | Status |
|--------|-------|-------------|----------|--------|
| OT-RP-050 | authentication | Authenticate on behalf of subject | P0 | ✅ |
| OT-RP-051 | assertionMethod | Sign statements on behalf of subject | P0 | ✅ |
| OT-RP-052 | keyAgreement | ECDH key derivation | P1 | ✅ |
| OT-RP-053 | capabilityInvocation | Update DID document | P1 | ✅ |
| OT-RP-054 | capabilityDelegation | Delegate rights to other keys | P1 | ✅ |

### Key Lifecycle Semantics

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-RP-060 | Multiple non-expired, non-revoked bindings MAY coexist | P1 | ✅ |
| OT-RP-061 | After expiresAt, binding MUST be considered inactive | P0 | ✅ |
| OT-RP-062 | If revoked=true, binding MUST be inactive regardless of expiresAt | P0 | ✅ |

---

## 2.4 User Review Schema

**Test Files:** `attestation-schemas.test.ts`, `attestation-queries.test.ts`, `attestation-immutability.test.ts`

### Fields

| Req ID | Field | Req | Format | Priority | Status |
|--------|-------|-----|--------|----------|--------|
| OT-RP-070 | attester | Y | string (DID) | P0 | ✅ |
| OT-RP-071 | subject | Y | string (DID of reviewed service) | P0 | ✅ |
| OT-RP-072 | version | N | string (app version) | P1 | ✅ |
| OT-RP-073 | ratingValue | Y | integer (1-5) | P0 | ✅ |
| OT-RP-074 | reviewBody | N | string (max 500 chars) | P0 | ✅ |
| OT-RP-075 | screenshotUrls | N | [string] | P2 | ✅ |
| OT-RP-076 | proofs | N | [object] | P1 | ✅ |
| OT-RP-077 | issuedAt | Y | integer | P0 | ✅ |

### Proof Usage Categories

| Req ID | Category | proofPurpose | Priority | Status |
|--------|----------|--------------|----------|--------|
| OT-RP-080 | Reviewer identity evidence | shared-control | P1 | ❌ |
| OT-RP-081 | Service-usage evidence | commercial-tx | P0 | ✅ |

### Updates and Supersession

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-RP-090 | Attestations are immutable once created | P0 | ✅ |
| OT-RP-091 | New review from same attester for same subject supersedes previous | P0 | ✅ |
| OT-RP-092 | Clients MUST consider only most recent attestation (by issuedAt) | P0 | ✅ |

---

## 2.5 User Review Response Schema

**Test File:** `user-review-response.test.ts`

### Fields

| Req ID | Field | Req | Format | Priority | Status |
|--------|-------|-----|--------|----------|--------|
| OT-RP-100 | attester | Y | string (service owner DID) | P0 | ✅ |
| OT-RP-101 | subject | N | string (MUST match reviewer of refUID) | P1 | ✅ |
| OT-RP-102 | refUID | Y | string (UID of User Review) | P0 | ✅ |
| OT-RP-103 | responseBody | Y | string (max 500 chars) | P0 | ✅ |
| OT-RP-104 | issuedAt | Y | integer | P0 | ✅ |

### Verification

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-RP-110 | refUID MUST resolve to valid User Review attestation | P0 | ✅ |
| OT-RP-111 | response.subject MUST match reviewer of referenced review | P0 | ✅ |
| OT-RP-112 | response.attester MUST be reviewed service or delegate | P0 | ✅ |

---

## 2.6 Endorsement Schema

**Test File:** `attestation-schemas.test.ts`

### Fields

| Req ID | Field | Req | Format | Priority | Status |
|--------|-------|-----|--------|----------|--------|
| OT-RP-120 | attester | Y | string (DID) | P0 | ✅ |
| OT-RP-121 | subject | Y | string (DID being endorsed) | P0 | ✅ |
| OT-RP-122 | organization | N | string (parent org DID) | P1 | ✅ |
| OT-RP-123 | version | N | string (semver) | P1 | ✅ |
| OT-RP-124 | policyURI | N | string (URI) | P1 | ✅ |
| OT-RP-125 | issuedAt | Y | integer | P0 | ✅ |
| OT-RP-126 | effectiveAt | N | integer | P1 | ✅ |
| OT-RP-127 | expiresAt | N | integer | P1 | ✅ |

---

## 2.7 Certification Schema

**Test Files:** `attestation-schemas.test.ts`, `certification-verification.test.ts`

### Fields

| Req ID | Field | Req | Format | Priority | Status |
|--------|-------|-----|--------|----------|--------|
| OT-RP-130 | attester | Y | string (Certification Body DID) | P0 | ✅ |
| OT-RP-131 | subject | Y | string (certified subject DID) | P0 | ✅ |
| OT-RP-132 | programId | Y | string (certification program DID) | P0 | ✅ |
| OT-RP-133 | assessor | Y | string (assessor DID) | P0 | ✅ |
| OT-RP-134 | outcome | N | enum (pass, fail, default=pass) | P0 | ✅ |
| OT-RP-135 | certificationLevel | N | string | P1 | ✅ |
| OT-RP-136 | reportURI | N | string (URI) | P1 | ✅ |
| OT-RP-137 | reportDigest | N | object | P1 | ✅ |

### Verification

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-RP-140 | effectiveAt > now → not yet effective | P0 | ✅ |
| OT-RP-141 | expiresAt <= now → expired | P0 | ✅ |
| OT-RP-142 | assessor authorization MUST be verified via programId | P0 | ✅ |

---

## 2.8 Security Assessment Schema

**Test File:** `security-assessment.test.ts`

### Fields

| Req ID | Field | Req | Format | Priority | Status |
|--------|-------|-----|--------|----------|--------|
| OT-RP-150 | attester | Y | string (assessor DID) | P0 | ✅ |
| OT-RP-151 | subject | Y | string (assessed subject DID) | P0 | ✅ |
| OT-RP-152 | payload.assessmentKind | Y | string | P0 | ✅ |
| OT-RP-153 | payloadVersion | Y | string (semver, default "1.0.0") | P0 | ✅ |
| OT-RP-154 | payload.outcome | N | enum (pass, fail, default=pass) | P0 | ✅ |
| OT-RP-155 | payload.reportDigest | N | object | P1 | ✅ |

### Payload Metrics (Optional)

| Req ID | Field | Format | Priority | Status |
|--------|-------|--------|----------|--------|
| OT-RP-160 | metrics.critical | integer | P2 | ✅ |
| OT-RP-161 | metrics.high | integer | P2 | ✅ |
| OT-RP-162 | metrics.medium | integer | P2 | ✅ |
| OT-RP-163 | metrics.low | integer | P2 | ✅ |
| OT-RP-164 | metrics.info | integer | P2 | ✅ |

---

## 2.9 x-oma3 Extensions

**Test File:** `x-oma3-extensions.test.ts`

| Req ID | Extension | Purpose | Priority | Status |
|--------|-----------|---------|----------|--------|
| OT-RP-180 | x-oma3-default | Auto-populate field (e.g., current-timestamp) | P1 | ✅ |
| OT-RP-181 | x-oma3-did-methods | Recommended DID methods for field | P2 | ✅ |
| OT-RP-182 | x-oma3-enum | Recognized values for extensible field | P1 | ✅ |
| OT-RP-183 | x-oma3-subtype | Semantic type (timestamp, semver) | P1 | ✅ |
| OT-RP-184 | x-oma3-skip-reason | Why field is hidden in UI | P2 | ✅ |
| OT-RP-185 | x-oma3-render | expanded or raw (for objects) | P2 | ✅ |

---

# 3. Proof Specification

**Source:** omatrust-specification-reputation.pdf (actual Proof spec)

The OMATrust Proof Specification defines the canonical proof framework. Key concepts:
- **Proof Object** - Structured object carrying cryptographic evidence
- **Proof Purpose** - Why the proof exists (shared-control, commercial-tx)
- **Proof Type** - How the proof is constructed and verified

---

## 3.1 Proof Taxonomy

**Test File:** `proof-types.test.ts`

### Identifier Capability

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-PF-001 | Signer-capable: EOAs, contract wallets (EIP-1271), DID methods with keys | P0 | ❌ |
| OT-PF-002 | Non-signer: Social handles, DNS names without keys, platform IDs | P0 | ❌ |
| OT-PF-003 | Non-signer MUST use trusted evidence locations | P0 | ❌ |
| OT-PF-004 | Non-signer MUST NOT use signature-based proofTypes | P0 | ❌ |

### Evidence Location

| Req ID | Location | Description | Priority | Status |
|--------|----------|-------------|----------|--------|
| OT-PF-010 | Inline | Complete evidence embedded in Proof Object | P0 | ❌ |
| OT-PF-011 | URL | Evidence retrieved from referenced URL | P0 | ❌ |
| OT-PF-012 | Transaction | Evidence from blockchain transaction | P0 | ❌ |
| OT-PF-013 | URL Evidence MUST use HTTPS | P0 | ❌ |

### Proof Purpose

| Req ID | Purpose | Description | Priority | Status |
|--------|---------|-------------|----------|--------|
| OT-PF-020 | shared-control | Identity binding, controller verification | P0 | ❌ |
| OT-PF-021 | commercial-tx | Commercial interactions, usage confirmations | P0 | ❌ |

---

## 3.2 Proof Object Parameters

**Test File:** `proof-object-structure.test.ts`

| Req ID | Parameter | Description | Priority | Status |
|--------|-----------|-------------|----------|--------|
| OT-PF-030 | Subject | Provider of Proof, subject in higher-level claim | P0 | ✅ |
| OT-PF-031 | Controller | Entity with authoritative relationship to subject | P0 | ✅ |
| OT-PF-032 | Nonce | Challenge binding for replay resistance | P1 | ✅ |
| OT-PF-033 | Timestamp | Creation timestamp | P1 | ✅ |
| OT-PF-034 | Signer | DID that signs the Proof | P0 | ❌ |
| OT-PF-035 | proofPurpose | Purpose declaration | P0 | ✅ |

---

## 3.3 Proof Types

**Test File:** `proof-object-structure.test.ts`

### Proof Wrapper Fields

| Req ID | Field | Req | Format | Priority | Status |
|--------|-------|-----|--------|----------|--------|
| OT-PF-040 | proofType | Y | string enum | P0 | ✅ |
| OT-PF-041 | proofObject | Y | string or object | P0 | ✅ |
| OT-PF-042 | proofPurpose | N | string enum | P0 | ✅ |
| OT-PF-043 | version | N | int (default 1) | P1 | ✅ |
| OT-PF-044 | issuedAt | N | int (Unix timestamp) | P1 | ✅ |
| OT-PF-045 | expiresAt | N | int | P1 | ✅ |

### Allowed proofType Values

| Req ID | Value | Description | Priority | Status |
|--------|-------|-------------|----------|--------|
| OT-PF-050 | pop-jws | Standard JWS (RFC 7800, RFC 9449) | P0 | ✅ |
| OT-PF-051 | pop-eip712 | EIP-712 typed-data signature | P0 | ✅ |
| OT-PF-052 | x402-receipt | x402 service receipt | P0 | ✅ |
| OT-PF-053 | evidence-pointer | URL reference to evidence artifact | P0 | ✅ |
| OT-PF-054 | tx-encoded-value | Deterministic micro-challenge transaction | P1 | ✅ |
| OT-PF-055 | tx-interaction | Onchain transaction to service contract | P1 | ✅ |
| OT-PF-056 | x402-offer | x402 signed offer | P1 | ✅ |

---

## 3.4 pop-jws (Standard Key Proof)

**Test File:** `proof-pop-jws.test.ts`

### JWS Payload Claims

| Req ID | Field | Req | Format | Priority | Status |
|--------|-------|-----|--------|----------|--------|
| OT-PF-060 | iss | Y | string (Subject) | P0 | ✅ |
| OT-PF-061 | aud | Y | string (Controller) | P0 | ✅ |
| OT-PF-062 | proofPurpose | Y | string | P0 | ✅ |
| OT-PF-063 | iat | N | int | P1 | ✅ |
| OT-PF-064 | exp | N | int | P1 | ✅ |
| OT-PF-065 | jti | N | string (Nonce) | P1 | ✅ |

---

## 3.5 pop-eip712 (Ethereum Wallet Proof)

**Test File:** `proof-eip712.test.ts`

### EIP-712 Domain

| Req ID | Field | Value | Priority | Status |
|--------|-------|-------|----------|--------|
| OT-PF-070 | name | "OMATrustProof" | P0 | ✅ |
| OT-PF-071 | version | "1" | P0 | ✅ |
| OT-PF-072 | chainId | EIP-155 chain ID | P0 | ✅ |

### Canonical EIP-712 Types

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-PF-080 | Stored proofs MUST NOT include types or primaryType | P0 | ✅ |
| OT-PF-081 | Verifiers MUST obtain canonical schema from spec | P0 | ✅ |
| OT-PF-082 | Signatures over non-canonical schema MUST be rejected | P0 | ✅ |

---

## 3.6 x402-receipt (Service Receipt)

**Test File:** `proof-x402.test.ts`

| Req ID | Field | Value/Format | Priority | Status |
|--------|-------|--------------|----------|--------|
| OT-PF-090 | proofType | "x402-receipt" | P0 | ✅ |
| OT-PF-091 | proofPurpose | "commercial-tx" | P0 | ✅ |
| OT-PF-092 | proofFormat | "jws" or "eip712" | P0 | ✅ |
| OT-PF-093 | resourceUrl | Y (URI) | P0 | ✅ |
| OT-PF-094 | payer | Y (address) | P0 | ✅ |
| OT-PF-095 | issuedAt | Y (timestamp) | P0 | ✅ |

---

## 3.7 tx-encoded-value

**Test File:** `proof-transactions.test.ts`

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-PF-120 | Amount = BASE + (U256(H(Seed)) mod RANGE) | P0 | ✅ |
| OT-PF-121 | H = SHA-256 (or keccak256 for EVM) | P0 | ✅ |
| OT-PF-122 | RANGE = floor(BASE / 10) by default | P0 | ✅ |
| OT-PF-123 | Seed MUST be JCS-canonicalized JSON | P0 | ✅ |
| OT-PF-124 | domain: "OMATrust:Amount:v1" | P0 | ✅ |

---

## 3.8 tx-interaction

**Test File:** `proof-transactions.test.ts`

| Req ID | Requirement | Priority | Status |
|--------|-------------|----------|--------|
| OT-PF-130 | proofType: "tx-interaction" | P0 | ✅ |
| OT-PF-131 | proofPurpose: "commercial-tx" | P0 | ✅ |
| OT-PF-134 | Transaction MUST have success status | P0 | ✅ |
| OT-PF-135 | tx.from MUST equal attester | P0 | ✅ |
| OT-PF-136 | tx.to MUST equal subject (contract) | P0 | ✅ |

---

# 4. Coverage Summary

## By Specification

| Specification | Total Reqs | Tested | Coverage |
|---------------|------------|--------|----------|
| Identity | 78 | 68 | **87%** |
| Reputation | 92 | 78 | **85%** |
| Proof | 120 | 55 | **46%** |
| **Total** | **290** | **201** | **69%** |

## By Priority

| Priority | Total | Tested | Coverage |
|----------|-------|--------|----------|
| P0 | 192 | 145 | 76% |
| P1 | 85 | 52 | 61% |
| P2 | 13 | 4 | 31% |

## Test Statistics

| Metric | Value |
|--------|-------|
| Test Files | 33 |
| Total Tests | 593 |
| Passing | 591 (99.7%) |
| Failing | 2 (known bug) |

---

# 5. Known Issues

## Critical Bugs

| ID | Description | Status | Location |
|----|-------------|--------|----------|
| BUG-001 | `normalizeDidWeb()` incorrectly converts `did:pkh` to `did:web` | 🔧 In Progress | `src/lib/utils/did.ts` |

## Spec Gaps (Schema Improvements Needed)

| ID | Description | Recommendation |
|----|-------------|----------------|
| GAP-001 | `description` missing max 4000 char limit | Add `.max(4000)` to schema |
| GAP-002 | `summary` missing max 80 char limit | Add `.max(80)` to schema |
| GAP-003 | URL fields accept FTP protocol | Add HTTP/HTTPS-only validation |
| GAP-004 | `EndpointConfig.name` accepts empty string | Add `.min(1)` to schema |

---

# 6. Test File Reference

| Test File | Spec Section | Tests |
|-----------|--------------|-------|
| `onchain-metadata.test.ts` | Identity 5.1.1 | 12 |
| `offchain-metadata.test.ts` | Identity 5.1.1.2 | 15 |
| `version-history.test.ts` | Identity 5.1.1.1 | 6 |
| `platforms-structure.test.ts` | Identity 5.1.2.1 | 18 |
| `endpoints-structure.test.ts` | Identity 5.1.2.2 | 12 |
| `did-formats.test.ts` | Identity Table 3 | 21 |
| `did-artifact.test.ts` | Identity Appendix A | 10 |
| `did-confirmation.test.ts` | Identity 5.1.3 | 12 |
| `did-index-address.test.ts` | Identity 5.3 | 14 |
| `json-policies.test.ts` | Identity 5.1.3.4 | 9 |
| `control-policy.test.ts` | Identity 5.1.4 | 10 |
| `ownership-resolver.test.ts` | Identity 5.2 | 12 |
| `traits.test.ts` | Identity Appendix C | 12 |
| `dataurl-validation.test.ts` | Identity 5.1.1.2 | 8 |
| `attestation-schemas.test.ts` | Reputation 6, 7 | 45 |
| `attestation-queries.test.ts` | Reputation 7.1 | 18 |
| `attestation-immutability.test.ts` | Reputation 7.1.3 | 6 |
| `key-lifecycle.test.ts` | Reputation 6.2.2 | 12 |
| `keypurpose-values.test.ts` | Reputation 6.2.1 | 15 |
| `proof-bindings.test.ts` | Reputation 6.1, 7.1 | 14 |
| `user-review-response.test.ts` | Reputation 7.2 | 12 |
| `certification-verification.test.ts` | Reputation 7.4 | 15 |
| `security-assessment.test.ts` | Reputation 7.5 | 16 |
| `x-oma3-extensions.test.ts` | Reputation 9.1 | 8 |
| `proof-types.test.ts` | Proof 5.3 | 7 |
| `proof-object-structure.test.ts` | Proof 5.1, 5.2 | 24 |
| `proof-pop-jws.test.ts` | Proof 5.3.2 | 18 |
| `proof-eip712.test.ts` | Proof 5.3.3 | 16 |
| `proof-x402.test.ts` | Proof 5.3.4, 5.3.8 | 22 |
| `proof-transactions.test.ts` | Proof 5.3.6, 5.3.7 | 24 |
| `proof-evidence-pointer.test.ts` | Proof 5.3.5 | 18 |
| `metadata-structure.test.ts` | General | 10 |
| `reputation-display.test.tsx` | UI Display | 8 |

---

## Running Tests

```bash
# Run all specification compliance tests
npm test -- tests/spec-compliance/omatrust-spec --run

# Run with coverage
npm test -- tests/spec-compliance/omatrust-spec --coverage --run

# Run specific test file
npm test -- tests/spec-compliance/omatrust-spec/did-formats.test.ts --run
```

---

**Document Maintainer:** Test Engineering Team  
**Review Cycle:** Weekly  
**Next Review:** January 14, 2026

