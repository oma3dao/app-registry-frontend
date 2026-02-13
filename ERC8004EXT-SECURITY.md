# ERC-8004 Extension: Security & Ownership Verification

**Extension for enhanced metadata integrity and ownership confirmation**

---

## Abstract

This Extension to ERC-8004 describes optional features that address attack vectors increase the trust level of the Identity Registry to that of well known app stores. It introduces several key improvements:

1. **Onchain Registration File hash** - Enables cryptographic tracking of all changes to the Registration File.
2. **Agent versions** - Associates semantic information with different versions of agent implementations.
2. **Ownership verification** - Cryptographically links the owner of the NFT to the Registration File.

These extensions maintain backward compatibility with base ERC-8004 while providing stronger security guarantees for high-trust applications.

---

## Motivation

The base ERC-8004 specification provides agent discovery and registration but leaves metadata integrity and ownership verification as implementation details. Real-world deployments require:

- **Tamper detection**: Clients must detect when off-chain metadata has been modified without authorization
- **Change information**: If there is an authorized change, clients need version tracking to determine the extent of and adapt to the change
- **Ownership flexibility**: The owner of the token needs to stay in sync with control of the tokenURI endpoint even though token ownership changes
- **Query efficiency**: Direct onchain DID storage enables more efficient trust analysis

This Extension addresses these needs while preserving the flexibility and simplicity of the base specification.

## Definitions

The following terms are used throughout this specification:

| Term                     | Definition                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Extension**            | This specification document.                                                                                                        |
| **Base Specification**   | The [base ERC-8004 specification document](https://github.com/erc-8004/erc-8004-contracts/blob/master/ERC8004SPEC.md).              |
| **Identity Registry**    | The ERC-721 contract that stores agent registrations and complies with the Extension and Base Specification.                        |
| **System**               | Identity Registry plus any other supporting smart contracts or software that comply with the Extension.                             |
| **Agent**                | A software service registered in the Identity Registry.                                                                             |
| **Client**               | Software that queries the System to obtain information about an Agent. Examples include wallets, marketplaces, and other agents.    |
| **Onchain Data**         | Data stored directly in the Identity Registry smart contract.                                                                       |
| **Offchain Data**        | Data stored outside the blockchain, typically in JSON format at a URL specified by `tokenURI()` or in event logs.                   |
| **Registration File**    | The JSON document returned by `tokenURI()` containing agent metadata such as name, description, endpoints, and version information. |
| **DID**                  | Decentralized Identifier as defined by the [W3C specification](https://www.w3.org/TR/did-core/#terminology)                         |
| **didHash**              | Hash of a DID as defined below.                                                                                                     |

Terms defined in the Base Specification are incorporated by reference.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

The words refer to compliance with this Extension specification.  Implementation of this Extension is OPTIONAL and does not affect compliance with the base ERC-8004 specification.

### Identity Registry Interface

The Identity Registry MUST support the Solidity interface as defined here. The interface is designed to be composed with the base `IERC8004` interface defined in the [base specification](./ERC8004SPEC.md#solidity-interface).

```solidity
import "./IERC8004.sol";

/**
 * @title IERC8004Security
 * @notice ERC-8004 Security Extension
 * @dev Extends base ERC-8004 with required metadata support and enhanced registration
 */
interface IERC8004Security is IERC8004 {

    /**
     * @dev Emitted when a new agent is registered with extended metadata
     * @param agentId The token ID assigned to the agent
     * @param tokenURI The URI pointing to the agent's Registration File
     * @param didHash The keccak256 hash of the agent's DID
     * @param owner The address that owns the newly minted agent NFT
     * @param versionMajor The major version of the registration
     * @param registrationBlock The block number that includes the registration
     * @param registrationTimestamp The block timestamp when registration occurred
     */
    event RegisteredExtended(
        uint256 indexed agentId,
        string tokenURI,
        address indexed owner,
        bytes32 indexed didHash,
        uint8 versionMajor, 
        uint256 registrationBlock,
        uint256 registrationTimestamp
    );

    /**
     * @notice Get metadata value for a specific key (REQUIRED in this Extension)
     * @dev This function is OPTIONAL in base ERC-8004 but REQUIRED in the Security Extension
     * @param agentId The token ID to query
     * @param key The metadata key to retrieve
     * @return value The metadata value as bytes
     */
    function getMetadata(
        uint256 agentId,
        string memory key
    ) external view returns (bytes memory value);

    /**
     * @notice Register a new agent with tokenURI and metadata (overload from base spec)
     * @dev Extends base register() to emit RegisteredExtended event with didHash
     * @param tokenURI The URI pointing to the agent's Registration File
     * @param metadata Array of metadata entries (MUST include "did", "dataHash", etc.)
     * @return agentId The token ID of the newly registered agent
     */
    function register(
        string memory tokenURI,
        MetadataEntry[] memory metadata
    ) external returns (uint256 agentId);

    /**
     * @notice Batch-set metadata values for an existing agent
     * @dev Updates multiple metadata entries atomically
     * @param agentId The token ID to update
     * @param metadata Array of metadata entries to set
     */
    function setMetadata(
        uint256 agentId,
        MetadataEntry[] memory metadata
    ) external;
}
```

**Minter Control Verification:**

To ensure that the minter controls the domain referenced in `did`, implementations MUST verify the domain is under common control with the minter through one of the following methods:

**Method 1: DNS TXT Record Verification**

For `did:web` DIDs, the minter MUST prove domain control by adding a DNS TXT record:

```
Record Name: _wallets.yourdomain.com
Record Type: TXT
Record Value: v=1;caip10=eip155:66238:0xd434dd2861Af0E1c5Cd9A4Df171a9dfA45Cd7d29
```

Format specification:
- Use semicolon (`;`) as separator between fields
- Spaces are supported but not recommended
- `v=1` indicates the version of the verification protocol
- `caip10` field contains the CAIP-10 identifier of the minting address

Verification Process:
1. Extract the domain from `did`, including subdomains
2. Query DNS TXT record at `_wallets.{domain}`
3. Parse the `caip10` field from the TXT record value
4. Verify the address matches the minter's address

**Method 2: Registration File Owner Field**

Alternatively, the minter MAY prove control by including an `owner` field in the Registration File that matches the minting address:

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "owner": "eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  ...
}
```

Verification Process:
1. Fetch the Registration File from `tokenURI`
2. Parse the `owner` field (CAIP-10 format)
3. Verify the address matches the minter's address

**Mismatched `did` and `tokenUri`**

If `tokenUri` and `did` do not share the same domain (e.g.- `tokenUri` is hosted on a domain different from `did`), the Registration File MUST include the `owner` field and it MUST match the minter address.

To satisfy this requirement, the System MAY utilize an offchain oracle to implement Method 1 and/or Method 2.

**Implementation Requirements:**

- Implementations MUST support at least one verification method
- Implementations MAY support both methods for defense in depth
- Verification SHOULD occur during the `register()` call
- Failed verification SHOULD revert the registration transaction

**Interface Notes:**

- The `MetadataSet` event MUST be emitted for every change in onchain metadata- one for each metadata key changed. 
- The Extension makes the `getMetadata()` function from Base Specification REQUIRED
- The `register()` overload with metadata is inherited from the Base Specification and MUST emit the `RegisteredExtended` event
- The `setMetadata()` batch function provides efficient multi-key updates
- The `RegisteredExtended` event includes `didHash` and other parameters and augments the Base Specification `Registered` event

### Identity Registry Onchain Metadata

The Extension defines the following onchain metadata keys:

| Key            | Format       | Required | Description                                                            |
| ---------------| ------------ | -------- | ---------------------------------------------------------------------- |
| `dataHash`     | bytes32      | MUST     | Hash of the Registration File defined below                            |
| `did`          | string       | MUST     | Agent's DID (e.g.- did:web:exampleTokenURI.com/.well-known/agent.json) |
| `versionMajor` | uint8        | MUST     | Value of the x in the version x.y.z                                    |
| `versionMinor` | uint8        | MUST     | Value of the y in the version x.y.z                                    |
| `versionPatch` | uint8        | MUST     | Value of the z in the version x.y.z                                    |
| `status`       | uint8        | MUST     | Owner controlled field (0=active, 1=deprecated, 2=replaced)            |

**dataHash**
- a `dataHash` is computed offchain as the keccak-256 of the JCS-canonicalized Registration File.
- `dataHash` MUST be updated every time Registration File changes.
- Illustrative Typescript example:

```typescript
import { keccak256, toUtf8Bytes } from "ethers";

function jcsNormalizeJson(value: any): string {
  const stringify = (v: any): string => {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stringify).join(',') + ']';
    const keys = Object.keys(v).sort();
    const entries = keys.map(k => JSON.stringify(k) + ':' + stringify(v[k]));
    return '{' + entries.join(',') + '}';
  };
  return stringify(value);
}

dataHash = keccak256(toUtf8Bytes(jcsNormalizeJson(json))) as `0x${string}`;
```

**did**

- `did` and `versionMajor` combination MUST have a unique `tokenId` and the Identity Registry MUST reject registrations that duplicate this combination in the contact.
- DID changes MUST require new agent registration
- Implementations MUST use the did:web DID method for storing URLs

**didHash**

`didHash` is a more efficient way to store and search because it can be stored as a fixed length bytes32.  It is used in functions and events.  `didHash`:

- MAY be used for more efficient contract storage
- MAY be used for events and indexing
- MUST be the Keccak-256 hash of the canonicalized DID encoded as UTF-8 bytes.  Illustrative Typescript example for `did:web`:

```typescript
import { keccak256, toUtf8Bytes } from "ethers"

export function canonicalizeDID(did: string): string {
  if (!did.startsWith('did:')) {
    throw new Error('Invalid DID format: must start with "did:"')
  }

  const parts = did.split(':')
  if (parts.length < 3) {
    throw new Error('Invalid DID format: insufficient parts')
  }

  const method = parts[1]
  const hostAndPath = parts.slice(2).join(':')
  const [host, ...pathParts] = hostAndPath.split('/')
  const canonicalHost = host.toLowerCase()
  const path = pathParts.length > 0 ? '/' + pathParts.join('/') : ''
  
  return `did:web:${canonicalHost}${path}`
}

export function computeDidHash(did: string): string {
  const canonicalDid = canonicalizeDID(did)
  return keccak256(toUtf8Bytes(canonicalDid))
}

didHash = computeDidHash(did);
```

**Versioning**

The Extension tracks version to give semantic information to Clients so they know how to use the Registration File. For example, a new major version is a breaking change.  See the Semantic Versioning section below for details.

**Status**

The status key allows agent owners to signal that an agent is out of commission.  

### Identity Registry Functions

The Extension adds additional functions to augment the Extension IERC8004Security interface.

**Registration Data Structure:**

The below query functions SHOULD return registration data in a structured format that includes:

```solidity
struct RegistrationView {
    address currentOwner;        // Current NFT owner (may differ from minter)
    string did;                  // Agent's DID
    bytes32 dataHash;            // Hash of Registration File
    string tokenUri;             // URL to Registration File (tokenURI)
    uint8 versionMajor;          // Major version
    uint8 versionMinor;          // Minor version
    uint8 versionPatch;          // Patch version
    uint8 status;                // Status (0=active, 1=deprecated, 2=replaced)
    // Additional implementation-specific fields MAY be included
}
```

Original token minter MAY be included as `minter` to identify the original registrant. Provenance remains recoverable via the Registered or RegisteredExtended events.

**Core Query Functions:**

The following functions MUST be implemented:

```solidity
/**
 * @notice Get a single registration by token ID
 * @param agentId The token ID to query
 * @return registration The registration data
 */
function getRegistration(uint256 agentId) external view returns (RegistrationView memory registration);

/**
 * @notice Get a single registration by DID and major version
 * @param did The agent's DID
 * @param major The major version number
 * @return registration The registration data
 */
function getRegistration(string memory did, uint8 major) external view returns (RegistrationView memory registration);
```

The following functions SHOULD be implemented:

```solidity
/**
 * @notice Get DID by token ID
 * @param tokenId The token ID to query
 * @return did The DID string for the given token
 */
function getDIDByTokenId(uint256 tokenId) external view returns (string memory did);

/**
 * @notice Get the latest major version for a DID
 * @param didHash The keccak256 hash of the DID
 * @return major The highest major version number for this DID
 */
function latestMajor(bytes32 didHash) external view returns (uint8 major);
```

The following function MAY be implemented:

```solidity
/**
 * @notice Get the latest registration for a DID (uses latest major version)
 * @param did The agent's DID
 * @return registration The registration data for the latest major version
 */
function getRegistration(string memory did) external view returns (RegistrationView memory registration);

/**
 * @notice Compute DID hash from DID string
 * @param didString The DID as string
 * @return didHash The keccak256 hash of the DID
 */
function getDidHash(string memory didString) external pure returns (bytes32 didHash);
```

**Implementation Notes:**

- The three `getRegistration()` overloads provide flexible query patterns by tokenId, DID+version, or latest DID
- Implementations MAY add additional query functions beyond those specified here
- The `RegistrationView` struct MAY include additional implementation-specific fields

### Registration File

This Extension adds additional fields to the Registration File:

| Key            | Format       | Required | Description                                                               |
| ---------------| ------------ | -------- | ------------------------------------------------------------------------- |
| `owner`        | string       | MUST     | CAIP-10 ID of the address that owns the NFT pointed to in `registrations` |
| `external_url` | string       | MAY      | URL of the app’s marketing website. Matches ERC-721 metadata extension.   |
| `version`      | string       | SHOULD   | If present, MUST match version stored as onchain data.                    |

### Semantic Versioning

This Extension adopts Semantic Versioning (SemVer) to communicate the magnitude and intent of changes to agent metadata and behavior. Versioning complements cryptographic integrity (dataHash) by providing human-readable signals about trust recalibration needs.

**Version Format:**

Versions MUST follow the format `MAJOR.MINOR.PATCH` where:

- **MAJOR**: Incremented for incompatible changes that break existing integrations or fundamentally alter agent behavior
- **MINOR**: Incremented for backward-compatible functionality additions
- **PATCH**: Incremented for backward-compatible bug fixes or metadata updates

**Version Storage:**

Implementations MAY store version history on-chain.  An implementation example:

```solidity
struct Version {
    uint8 major;
    uint8 minor;
    uint8 patch;
}

// Append-only version history
Version[] public versionHistory;
```

**Metadata Rules:**

Changes to any metadata except for status MUST be accompanied by a bump in version. This implies that changes to Registration File also require a bump in version as dataHash changes.

| Desired Change                              | On-chain Rule                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| Move from `(did, major)` → `(did, major+i)` | Must mint a new NFT (same `did` but `majorVersion+i`)                                  |
| Edit `dataHash`                             | Requires `patchVersion+i` or `minorVersion+i`                                          |
| Edit `tokenUri`                             | Must mint a new NFT                                                                    |
| Change `status`                             | Allowed without version changes                                                        |
| Transfer NFT ownership                      | New Registration File `owner` field -> new `dataHash` -> new version                   |

**Version Rules**

- Identiy Registry MUST reject decreases in version.
- Identity Registry MUST reject updates without a version change
- Clients MUST NOT trust version downgrades

### Registration File Registrations Field

This Extension imposes further requirements on the `registrations` array in the Registration File (as defined in the Base Specification).  Specifically, it:

- adds an additional `did` field as an alternative to the `agentId` field inside an object in the `registrations` field.   
- establishes a canonical source of truth model for multi-registry scenarios.

**`registrations.did`**

IERC8004Security Identity Registry is indexed both by `tokenId` and `did`.  Therefore, only one of these fields is required to uniquely identify an NFT in conjunction with the CAIP-10 ID stated in `registrations.agentRegistry`.  This is important because when an NFT is first registered it MUST include a `dataHash` metadata key, which means the Registration File needs to be constructed before registration. If `tokenId` were the only way to uniquely identify an NFT then the `dataHash` would not be able to be computed as `tokenId` is not yet known before registration. Therefore, registration object cooresponding to the Identity Registry in which the Agent will be registered MUST only include `agentRegistry` and `did`.  After registration, the object MUST include `did` or `tokenId`.

**Canonical Registration:**

The first registration object in the `registrations` array MUST be treated as the canonical source of truth for the agent's identity and metadata. This canonical registration MUST represent the authoritative version of the agent’s metadata.

**Secondary Registrations:**

Additional registration objects in the `registrations` array (if present) represent secondary or mirror registrations. These secondary registrations:

- MUST defer to the canonical registration for authoritative offchain metadata
- SHOULD be kept synchronized with the canonical registration
- MAY be updated manually by the agent owner to achieve this synchronization
- MAY implement cross-chain or cross-contract synchronization mechanisms

The choice of synchronization strategy is implementation-specific and outside the scope of this specification.

**Example Registration File with Multiple Registrations:**

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "myAgentName",
  "registrations": [
    {
      "did": "did:web:example.com/myagent",
      "agentRegistry": "eip155:1:0x1234...5678",
    },
    {
      "agentId": 15,
      "agentRegistry": "eip155:8453:0xabcd...ef01",
    }
  ],
  ...
}
```

### Client Requirements

**Offchain Registrations Verification:**

Offchain Clients using this Extension SHOULD:

1. Verify the first registration object in the `registrations` array
2. Fetch on-chain data from the canonical registry to validate metadata
3. Treat secondary registrations as informational only unless explicitly verified
4. Check synchronization status when relying on secondary registrations

**Registration File `owner` Verification**

Clients MUST verify ownership using the following algorithm:

1. Fetch the Registration File from `tokenURI()` or `getRegistration().tokenUri`
2. Extract the address from the `owner` field CAIP-10 identifier
3. Compare with the on-chain NFT owner via `ownerOf(agentId)` or `getRegistration().currentOwner`
4. If they match, ownership is confirmed. If not, the client SHOULD treat the agent as unverified

**`dataHash` Validation**

Clients MUST recompute hashes from the Registration File and compare with on-chain dataHash.

1. Fetch `dataHash` and `tokenUri` using `getMetadata()` or `getRegistration()`
2. Fetch the Registration File from `tokenUri`
3. Compute the hash using the Keccak-256 hash of the canonicalized Registration File encoded as UTF-8 bytes
4. Compare the computed hash to dataHash and reject if not equal.

**Security Considerations:**

- The `owner` field provides an additional verification layer beyond on-chain ownership
- Clients SHOULD check both on-chain `ownerOf()` and off-chain `owner` field
- Mismatches indicate potential compromise or stale metadata
- Implementations MAY require attestations confirming the `owner` field is current
- Version changes SHOULD be monotonically increasing (no downgrades)
- Clients SHOULD verify version history is append-only and timestamps are sequential
- Clients SHOULD verify that registrationBlock and registrationTimestamp are consistent with chain history and not reused across different DIDs.

## Copyright

Copyright and related rights waived via CC0.
