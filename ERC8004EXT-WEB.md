# ERC-8004 Extension: Web Services Trust Layer

Extending ERC-8004 to any online service and bringing the open internet onto Ethereum.

## Abstract

This extension generalizes ERC-8004 beyond AI agents to provide a universal trust layer for any online service, including:

- **APIs** - REST, GraphQL, gRPC, WebSocket endpoints
- **Binaries** - Desktop applications, CLI tools, mobile apps
- **Websites** - Web applications, documentation sites, landing pages
- **Smart Contracts** - DeFi protocols, DAOs, on-chain services
- **Hybrid Services** - Services combining multiple interface types

By extending the agent registration model to arbitrary services, this specification enables decentralized discovery, reputation, and trust for the entire open internet.

## Motivation

The internet lacks a decentralized trust layer for service discovery and verification. Current problems include:

- **Centralized gatekeepers**: App stores and search engines control discovery
- **Fragmented trust**: Each platform has its own reputation system that keeps trust siloed and not interoperable
- **Limited verification**: Many services are not addressed by even the centralized gatekeepers

ERC-8004 provides the foundation for decentralized agent trust. This extension applies the same principles to all online services, enabling:

- **Universal discovery**: Single Identity Registry for all service types
- **Portable reputation**: Trust signals that work across platforms
- **Cryptographic verification**: Tamper-proof service metadata
- **Composable trust**: Services can build on each other's reputation

## Definitions

The following terms are used throughout this specification:

| Term                     | Definition                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Extension**            | This specification document.                                                                                                        |
| **Base Specification**   | The [base ERC-8004 specification document](https://github.com/erc-8004/erc-8004-contracts/blob/master/ERC8004SPEC.md).              |
| **Security Extension**   | The [Security Extension document](https://github.com/oma3dao/erc-8004-contracts/blob/master/ERC8004SPECEXT-SECURITY.md).            |
| **Identity Registry**    | The ERC-721 contract that stores agent registrations as defined in the Base Specification.                                          |
| **System**               | Identity Registry plus any other supporting smart contracts or software that comply with the Extension.                             |
| **Client**               | Software that queries the System to obtain information about an Agent. Examples include wallets, marketplaces, and other agents.    |
| **Service**              | Any software that provides a service to Clients.                                                                                    |
| **Agent**                | A Service registered in the Identity Registry.                                                                                      |
| **DID**                  | Decentralized Identifier as defined by the [W3C specification](https://www.w3.org/TR/did-core/#terminology).                        |
| **didHash**              | Hash of the canonical DID (see [ERC-8004 Security Extension](./ERC8004EXT-SECURITY.md#didhash)).                                    |

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

This Extension extends the Base Specification and Security Extension requirements for an Identity Registry in ERC-8004. 

### Interfaces Onchain Field

Extension Identity Registry implementations MUST support `interfaces` as a metadata key.  The `interfaces` field value MUST comply with the following bitmap values:

| Bit | Value | Type            | Description                                                    |
| --- | ----- | --------------- | -------------------------------------------------------------- |
| 0   | 1     | Human           | Service designed for human interaction (web apps, desktop apps)|
| 1   | 2     | API             | Service designed for programmatic access (REST, GraphQL, etc.) |
| 2   | 4     | Smart Contract  | On-chain service (DeFi protocol, DAO, etc.)                    |

**Multiple interfaces** MAY be combined using bitwise OR:
- `interfaces = 3` (1 | 2) = Human + API (e.g., web app with API)
- `interfaces = 7` (1 | 2 | 4) = All types (e.g., DeFi protocol with web UI and API)

### ContractId

**Purpose**

The `contractId` field supports the Smart Contract interface type. Examples of smart contract services include DeFi protocols, DAOs, and token projects.  It also supports hybrid services that offer smart contract services as well as an off-chain API, or a downloadable app. 

**Format**

Extension Identity Registry implementations MUST support `contractId` as a metadata key. The `contractId` field value MUST be a [CAIP-10](https://chainagnostic.org/CAIPs/caip-10) identifier:

```
contractId = "eip155:1:0x1234567890123456789012345678901234567890"
```

Where:
- `eip155` = namespace (EVM chains)
- `1` = chain ID (Ethereum Mainnet)
- `0x1234...` = contract address (checksummed)

**Immutability**

The `contractId` field MUST be immutable after registration. Changes to `contractId` require registaring a new NFT with new DID.

**Verification**

Extension Identity Registries implementing the Security Extension MUST verify control of any declared `contractId` using one of the approved methods below.
Registries that do not implement the Security Extension SHOULD still perform this verification and emit a proof-of-control event for indexers.

Clients MUST treat unverified contracts as untrusted.

Before applying any verification method, the verifier MUST determine the controlling wallet for the referenced contract:

1. Parse the `contractId` to extract `chainId` and `contractAddress`.
2. Resolve the controlling wallet using the following priority:
- If upgradeable, read `eip1967.proxy.admin` or equivalent metadata slot.
- Else if contract exposes `owner()` or `getRoleAdmin()`, call and record result.
- Else, default to the deployer address from the creation transaction.
3. If no controlling wallet can be found, the contract is non-verifiable unless a valid attestation (Method 2) exists.

**Method 1: Direct Ownership**

If the minting address equals the discovered controlling wallet,
the contract control is considered automatically verified.

Steps:

1. Obtain controlling wallet via Control Discovery.
2. Compare with minting address:

```solidity
if (mintAddress == controllingWallet) verified = true;
```

**Method 2: Ownership Proof Transaction**

For contracts with a discoverable controlling wallet:

1. Compute `didHash = keccak256(canonicalizeDID(serviceDID))`.
2. Derive a deterministic verification amount:
`ownershipVerificationAmount = BASE(chainId) + (uint256(didHash) % RANGE(chainId))` 
where:
- `BASE(chainId)` is a minimum dust-free value (e.g., 10¹⁴ wei on Ethereum).
- `RANGE(chainId)` ≤ 10 % of `BASE(chainId)` to introduce minor entropy.
3. Locate a confirmed native-asset transfer satisfying:
- `from` = discovered controlling wallet
- `to` = minting wallet (EVM) or chain’s OMA sink address (non-EVM)
- `value` = `ownershipVerificationAmount`
- `blockTime` within verifier’s validity window
4. Validate minimum confirmations and ensure transaction canonicality.
5. Re-check that the sending wallet still controls the contract at verification time.
6. Record the verification result or emit a `ContractVerified` event.

This method creates an immutable, public proof linking the controller to the minter and is fully chain-verifiable.

**Method 3: Attestation-Based Verification**

For contracts that cannot originate native transfers (e.g., vaults, timelocks, DAO executors) or non-EVM deployments:

1. A Trusted Issuer (such as OMATrust, DAO, or auditor) manually verifies that the minter is authorized to represent the controlling address.
- Verification MAY involve dual signatures, multisig confirmation, or cross-account challenge transactions.
2. The Issuer creates and publishes an attestation binding the minter address to the controlling wallet using EAS.
3. Clients MUST accept the binding only if:
- The attestation originates from a trusted Issuer, and
- The verification mechanism used is disclosed and recognized.

This method allows delegated or off-chain confirmation of control while maintaining verifiable provenance.

**Applicability**

These verification mechanisms apply to both `contractId` and `did:pkh` identifiers.

**Security Considerations**

- The ownership proof creates a public, verifiable on-chain link between the controlling wallet and minting wallet
- Developers SHOULD NOT use high-security treasury addresses for ownership proofs
- Clients MUST treat unverified `contractId` values as untrusted
- Attestations SHOULD only be accepted from trusted Issuers with accepted verification mechanisms

### Traits

**Onchain Traits**

Traits are arrays of keywords that improve discoverability of registrations.  Extension Identity Registry implementations MUST support `traitHashes` as a metadata key.  The `traitHashes` field value MUST be an array of keccak-246 hashes of strings.  

Extension Identity Registry implementations MUST support the following functions:

```solidity
/**
 * @notice Check if a registration has any of the specified traits
 * @param did The agent's DID
 * @param major The major version number
 * @param traits Array of trait hashes to check
 * @return hasTraits True if the registration has at least one of the traits
 */
function hasAnyTraits(string memory did, uint8 major, bytes32[] memory traits) external view returns (bool hasTraits);

/**
 * @notice Check if a registration has all of the specified traits
 * @param did The agent's DID
 * @param major The major version number
 * @param traits Array of trait hashes to check
 * @return hasTraits True if the registration has all of the traits
 */
function hasAllTraits(string memory did, uint8 major, bytes32[] memory traits) external view returns (bool hasTraits);
```

**Offchain Traits**

Traits MAY be stored in the Registration File (see below) to improve offchain discoverability of registrations.

**Standardized Traits**

This extension defines the following trait values to improve interoperability of discovery:

| Trait String         | Description                                                                         |
| -------------------- | ----------------------------------------------------------------------------------- |
| "api:openapi"        | Include this if the interface field has a value of 2 and the API format is OpenAPI. |
| "api:graphql"        | Include this if the interface field has a value of 2 and the API format is GraphQL. |
| “api:jsonrpc”        | Include this if the interface field has a value of 2 and the API format is JSON-RPC.|
| "api:mcp"            | Include this if the interface field has a value of 2 and the API format is OpenAPI. |
| "api:a2a"            | Include this if the interface field has a value of 2 and the API format is A2A.     |
| "api:oasf"           | Include this if the interface field has a value of 2 and supports OASF capabilities.|
| “pay:x402”           | Include this if the endpoint supports x402 payments.                                |
| “pay:manual”         | Include this if the endpoint supports traditional payments.                         |

**Note**: Traits are capability flags that complement the `endpoints[].name` field defined in the base specification. The `name` field identifies the endpoint type (e.g., `"MCP"`, `"OPENAPI"`), while traits provide additional capability information (e.g., `"pay:x402"` indicates payment support).

### DID

`did` is a required field in the Base Specification.  To identify registrations with Smart Contract `interface` bitmaps Clients MUST use the `did:pkh` DID method for `did`.  

If did:pkh is used, the Identity Registry MUST confirm ownership of the contract address in the DID using one of the methods defined in the `contractId` section above.  

### Registration File Extensions

This Extension adds additional fields to the Registration File. The "Human", "API", and "Contract" columns signify if a field is required for the particular interface.

| Key          | Format         | Human  | API    | Contract | Description                                                                  |
| ------------ | -------------- | ------ | ------ | -------- | ---------------------------------------------------------------------------- |
| `image`      | string (URI)   | MUST   | SHOULD | SHOULD   | URI to service image. SHOULD be present for ERC-721 compatibility.           |
| `publisher`  | string         | MUST   | SHOULD | SHOULD   | Name of the entity that owns the NFT pointed to in `registrations`.   |
| `summary`    | string         | SHOULD | MAY    | MAY      | Short description of the service. Max 80 chars.                              |
| `traits`     | array (string) | MAY    | SHOULD | MAY      | Array of trait strings for discoverability. Max 20 traits, 120 chars total.  |
| `artifacts`  | object         | MAY    | MAY    | MAY      | Content-addressable artifact verification (see below).                       |

Additional fields for UX, platform-specific metadata, and operational information SHOULD be defined in specific implementations.

### Artifacts

The `artifacts` field enables content-addressable verification of downloadable payloads (binaries, containers, websites).

**Format**

The `artifacts` field MUST be a JSON object where keys are `artifactDid` identifiers and values are artifact objects.

**Artifact DID**

Artifact DIDs use the format `did:artifact:<cidv1>` where `<cidv1>` is a CIDv1 (base32-lower) of the artifact's SHA-256 hash.

**Artifact Object**

Each artifact object MUST contain:

| Field          | Format         | Required | Description                                                    |
| -------------- | -------------- | -------- | -------------------------------------------------------------- |
| `type`         | string         | MUST     | Artifact type: "binary", "container", or "website"             |
| `downloadUrls` | array (string) | MUST     | Array of URIs where the artifact can be downloaded             |

Additional fields MAY be included for implementation-specific verification (signatures, provenance, SRI manifests, etc.). See implementation profiles for details.

**Example**

```json
{
  "artifacts": {
    "did:artifact:bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi": {
      "type": "binary",
      "downloadUrls": [
        "https://dl.example.com/app.exe",
        "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
      ]
    }
  }
}
```

**Verification**

Clients MUST verify that the downloaded artifact's bytes hash is equal to the CIDv1 in the `artifactDid`. Additional verification mechanisms (signatures, transparency logs, etc.) are implementation-specific.

### Registration File Examples

**Binary Registration File Example**

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "DataViz Pro",
  "description": "Professional data visualization tool",
  "image": "https://example.com/app-icon.png",
  "registrations": [
    {
      "did": "did:web:dataviz.example.com",
      "agentRegistry": "eip155:1:0xRegistryAddress"
    }
  ],
  "publisher": "eip155:1:0x1234567890123456789012345678901234567890",
  "summary": "Professional data visualization for enterprises",
  "traits": ["visualization", "analytics", "enterprise"],
  "artifacts": {
    "did:artifact:bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi": {
      "type": "binary",
      "downloadUrls": [
        "https://downloads.example.com/DataViz-Setup.exe",
        "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
      ]
    }
  }
}
```

## EAS Attestations

This Extension primarily addresses discoverability for apps.  However, when this Extension is paired with the [ERC-8004 EAS Extension](https://github.com/oma3dao/erc-8004-contracts/blob/master/ERC8004SPECEXT-EAS.md) it enables a complete trust layer for every service on the internet.

## Copyright

Copyright and related rights waived via CC0.
