# app-registry-frontend

Front end for the OMATrust App Registry

## License and Participation

- Code is licensed under [MIT](./LICENSE)
- Contributor terms are defined in [CONTRIBUTING.md](./CONTRIBUTING.md)

**Licensing Notice**  
This initial version (v1) is released under MIT to maximize transparency and adoption.  

OMA3 may license future versions of this reference implementation under different terms (for example, the Business Source License, BSL) if forks or incompatible implementations threaten to fragment the ecosystem or undermine the sustainability of OMA3.  

OMA3 standards (such as specifications and schemas) will always remain open and are governed by [OMA3’s IPR Policy](https://www.oma3.org/intellectual-property-rights-policy).

## Purpose

This repository serves multiple purposes:
- **App Registry**: The repository implements the front-end of the OMATrust registry on OMAChain.  It provides the easiest way for app developers to registry apps with OMATrust and allows clients to discover, trust, and utilize them.  For more details on OMATrust, see [the docs](https://github.com/oma3dao/omatrust-docs).
- **Sample Code**: Developers can use the repository as sample code to implement their own clients such as discovery tools and app stores.
- **IWPS Demo**: The repository also implements a basic implementation of the Inter World Portaling System (IWPS), an appliction launching standard that is now in [draft form](../iwps-specification/blob/main/IWPS%20Base%20Specification.md).
- **ERC-8004 Compatible**: The registry supports both ERC-8004 compliant registration and gas-efficient native functions.

## Repository Overview

This repository is a Next.js application built with TypeScript, utilizing thirdweb for blockchain interactions. The wizard has been restructured (modal‑owned step state, single‑submit mint), and contract I/O has moved under `src/lib/contracts`. Below reflects the current layout.

**1. App Tokenization (Wizard & NFT Management):**

If you want to understand how applications are tokenized as NFTs or how to manage their metadata and status, refer to:

*   **Contract Interaction (current):**
    *   `src/lib/contracts/registry.write.ts` / `src/lib/contracts/registry.hooks.ts` — prepare and send Registry txs (mint, update status)
    *   `src/lib/contracts/metadata.*.ts` — App Metadata contract helpers (optional on‑chain storage)
*   **Wizard UI:**
    *   `src/components/nft-mint-modal.tsx` — multi‑step wizard; modal owns step state; calls parent `onSubmit` only at Step 6 (Review & Mint)
    *   `src/lib/wizard/registry.tsx` — step definitions, validation and visibility
    *   `src/lib/wizard/field-requirements.ts` — dynamic required/optional flags per interface type
*   **Deterministic hashing & JSON:**
    *   `src/lib/utils/offchain-json.ts` — spec‑aligned builder for DataURL JSON (omits empty fields)
    *   `src/lib/utils/dataurl.ts` — JCS canonicalization + keccak256 hashing and verification
*   **NFT Data Types:**
    *   `src/types/nft.ts` — App NFT shape used by wizard and dashboard

**2. Project Structure (Extending the App Registry):**

For developers looking to use this repository as a base for their own client, here's the overall structure:

*   **Core Application Logic:**
    *   `src/app/`: Main pages and API routes (Next.js App Router)
    *   `src/components/`: Reusable UI components (modals, cards, etc.)
    *   `src/lib/`: Utilities and helpers (e.g., `utils.ts`, `validation.ts`, `log.ts`)
    *   `src/config/`: Configuration (`chains.ts`, `env.ts`)
    *   `src/types/`: TypeScript type definitions
*   **Styling:**
    *   `src/app/globals.css` & `tailwind.config.ts`: Global styles and Tailwind config
    *   Shadcn/ui components are used and can be found in `src/components/ui/`
*   **Blockchain Integration (thirdweb):**
    *   `src/app/client.ts` — creates the thirdweb client from env
    *   `src/lib/contracts/client.ts` — resolves active chain and returns typed contracts
    *   `src/config/chains.ts` + `src/config/env.ts` — numeric chain IDs, RPC, and contract addresses

**3. IWPS Demo (Application Launching):**

To understand or extend the IWPS implementation for launching applications, these are the key areas:

*   **Frontend Launch Flow:**
    *   `src/components/nft-view-modal.tsx`: Displays app details and initiates the IWPS launch sequence via the "Launch" button.
    *   `src/components/launch-confirmation-dialog.tsx`: The dialog shown to the user to confirm the launch, display a PIN (if applicable), and proceed to the destination or download URL.
    *   `src/lib/iwps.ts`: Contains client-side helper functions for the IWPS flow, such as detecting device parameters, generating teleport IDs/PINs, and constructing the request body for the proxy.
*   **Backend API Endpoints (IWPS Source Implementation):**
    *   `src/app/api/portal-url/[did]/v/[version]/route.ts`: The core IWPS `portal-url` endpoint for apps that use OMA3's default "app hosting" service. It receives IWPS parameters, fetches app metadata, performs platform matching, and returns the launch/download details.
    *   `src/config/app-config.ts`: Defines  constants used by the IWPS endpoints, including parameter keys (`IWPS_*_KEY`) and default values.  Values reflect the current draft of OMA3 specifications.
*   **Backend Proxy (CORS & IWPS Destination Call):**
    *   `src/app/api/iwps-query-proxy/route.ts`: A backend proxy that the frontend calls. This proxy then makes a server-to-server request to the target application's `iwpsPortalUrl` (which might be an external domain or our own `portal-url` endpoint), forwarding the IWPS parameters. This is necessary for bypassing browser CORS restrictions when the target IWPS endpoint is on a different domain.
*   **Redirect (Legacy/Alternative URI):**
    *   `vercel.json`: Contains redirect rules. Currently used to redirect legacy `/api/portal-uri/...` requests to the `/api/portal-url/...` endpoint, ensuring backward compatibility or cleaner URLs.

## Setup local development environment

### Install dependencies

```bash
npm install
```

### Environment Variables

To run this project, copy .env.example into your .env.local file.

### Start development server

```bash
npm run dev
```

### Start a production build

```bash
npm run build
npm run start
```

### Testnet

This application currently supports OMAChain testnet for development and testing.  See [src/config/chains.ts](src/config/chains.ts) for config details.

### Connecting a Wallet

#### OMA3 Embedded Wallet

The front-end gives users the option to create an embedded wallet using social login (such as Google, Apple, or Facebook).  This is the easiest onboarding path for users and automatically supports OMAChain:

1.  Click "Connect"
2.  Choose your social login
3.  Click on the wallet button at the top right of the screen

#### Metamask Browser Extension

1. Visit [MetaMask.io](https://metamask.io/download/) to download the extension and install it
1. Open MetaMask and click on the network dropdown (usually shows "Ethereum Mainnet")
2. Click "Add Network"
3. In newer versions, click "Add a network manually" at the bottom
4. Enter the following details:
   - **Network Name**: OMAchain Testnet
   - **New RPC URL**: https://rpc.testnet.chain.oma3.org/
   - **Chain ID**: 66238
   - **Currency Symbol**: OMA
   - **Block Explorer URL**: https://explorer.testnet.chain.oma3.org/
5.  Hit the "Connect" button on the website and confirm the login in the wallet

#### Metamask Mobile App:

1. Download and open the MetaMask app
2. Tap on the hamburger menu or the settings icon
3. Tap "Settings" → "Networks" → "Add Network"
4. Tap "Add a network manually" and enter the same details as above
5. Hit the "Connect" button on the website and confirm the login in the wallet

### Getting Test OMA Tokens (required to register applications)

1. Visit the [OMAChain Testnet Faucet](https://faucet.testnet.chain.oma3.org)
2. Paste in your wallet address
3. Request the test OMA tokens

## Deployment

### Production Deployment (registry.omatrust.org)

The application is deployed on Vercel and accessible at [registry.omatrust.org](https://registry.omatrust.org).

**Branch:** `main`  
**Chain:** OMAchain Testnet (66238) - will switch to mainnet when launched

### Environment Variables

**Required (Public):**
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` - Thirdweb client ID for RPC access
- `NEXT_PUBLIC_ACTIVE_CHAIN` - Active chain: `localhost`, `omachain-testnet`, or `omachain-mainnet`

**Required (Server-side, Production only):**
- `THIRDWEB_SECRET_KEY` - Thirdweb secret key for managed wallets (HSM-backed)
- `THIRDWEB_SERVER_WALLET_ADDRESS` - Server wallet address for signing attestations

**Optional:**
- `NEXT_PUBLIC_DEBUG_ADAPTER` - Set to `true` for debug logging
- `NEXT_PUBLIC_APP_BASE_URL` - Canonical URL for on-chain storage (defaults to `https://registry.omatrust.org`)

**Vercel-specific (automatic):**
- `NEXT_PUBLIC_VERCEL_URL` - Used for runtime API calls in preview deployments (never for on-chain storage)

See `.env.example` for complete list and descriptions.

### Server Wallets

Server wallets are HSM-backed wallets managed by Thirdweb for secure transaction signing in production.

**Testnet Wallet:**
- **Address:** `0x9F34eCb069d3990228b9796B0d89b9DbF0522A50`
- **Smart Wallet:** `0xaB732b128B0a30e107B849B65A787de6C977C5C3`
- **Network:** OMAchain Testnet (66238)
- **Purpose:** DID verification attestations

**Production Wallet (Mainnet):**
- **Address:** `0x899cFF436F62caDa923f8Ae7F2660Ecd2e99Bf76`
- **Smart Wallet:** `0x603B04a8D4E1228171447a0b1CF83CB389142CfC`
- **Network:** OMAchain Mainnet
- **Purpose:** DID verification attestations (when mainnet launches)

To list current wallets:
```bash
cd ../app-registry-evm-solidity
./scripts/deploy/list-server-wallets.sh
```

### Contract Addresses

Contract addresses are configured in `src/config/chains.ts`.

**OMAchain Testnet (66238):**
- **Registry:** `0xb493465Bcb2151d5b5BaD19d87f9484c8B8A8e83`
- **Metadata:** `0x13aD113D0DE923Ac117c82401e9E1208F09D7F19`
- **Resolver:** `0xe4E8FBf35b6f4D975B4334ffAfaEfd0713217cAb`
- **Deployer:** `0xC8cb41dD6F509f28cA4194f8e1574911281354eF`
- **Deployed:** 2025-10-04 21:45:35 UTC

**OMAchain Mainnet:**
- **Status:** Not deployed yet
- Contracts will be deployed when mainnet launches

### Local Development

Local development uses `~/.ssh/test-evm-deployment-key` for signing (same key as deployment scripts).

**No server wallet configuration needed for local dev!**

Required `.env.local`:
```bash
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_ACTIVE_CHAIN=localhost
NEXT_PUBLIC_DEBUG_ADAPTER=true
```

### Security Notes

1. **Server Wallet Private Keys:** Never exposed - managed by Thirdweb's HSM
2. **Secret Key Storage:** Stored in Bitwarden, set in Vercel environment variables
3. **SSH Private Key:** For local dev only, never committed to git
4. **Contract Ownership:** Contracts owned by deployer wallet, not server wallet

## Frontend Architecture

For more information on the source code for this frontend, visit [src/README.md](src/README.md).

## ERC-8004 Registration

The app registry supports two registration paths, giving developers flexibility between standards compliance and gas optimization:

### Two Registration Functions

**1. ERC-8004 Compliant `register()` Function**

The standard-compliant path uses a metadata array structure:

```solidity
function register(
  string memory _tokenURI,
  MetadataEntry[] memory _metadata
) returns (uint256 tokenId)
```

This approach provides:
- Full ERC-8004 specification compliance
- Future compatibility with ERC-8004 tooling
- Standardized metadata key-value structure

**2. Gas-Efficient Native `mint()` Function**

The optimized path uses direct parameters:

```solidity
function mint(
  string didString,
  uint16 interfaces,
  string dataUrl,
  bytes32 dataHash,
  // ... additional parameters
) returns (uint256 tokenId)
```

This approach provides:
- Lower gas costs through direct parameter passing
- Optimized for high-volume registrations

### Reading Metadata: `getMetadata()` Function

Both registration paths store data identically on-chain. Retrieve specific metadata fields using:

```solidity
function getMetadata(uint256 agentId, string key) 
  returns (bytes value)
```

This allows querying individual metadata fields (e.g., "did", "interfaces", "dataHash") regardless of which registration function was used, ensuring consistent data access across the ecosystem.

### Choosing Your Path

- Use `register()` for ERC-8004 compliance and ecosystem compatibility
- Use `mint()` when gas efficiency is the priority
- Both functions produce identical on-chain data and support the same `getMetadata()` interface

The frontend automatically uses the appropriate function based on configuration. See `src/lib/contracts/registry.write.ts` for implementation details.

## Optional Onchain Metadata Architecture

The OMA Trust Registry stores application metadata, both onchain and offchain. Certain types of metadata, such as the DID, must be stored on-chain. But for most of the metadata the developer has the option to store it either on-chain or off-chain. To store the metadata on-chain, OMA3 provides a metadata smart contract that essentially stores the whole metadata JSON object as a string onchain.

### Storage Strategy: DID-Only Indexing

The optional OMA3AppMetadata contract uses a **DID-only storage strategy** for gas efficiency:

- **Storage:** Metadata is indexed by **base DID only** (not versioned DID)
  - Example: `did:web:example.com` → metadata
  - All versions (v1.0, v2.0, v3.0) share the same metadata
  
- **Onchain Metadata API Layer:** The `/api/data-url` endpoint accepts versioned URLs but strips the version before querying
  - Request: `/api/data-url/did:web:example.com/v/2.0` (RESTful, includes version)
  - Query: `getMetadataJson("did:web:example.com")` (base DID only)
  - Result: Same metadata for all versions

- **Version Tracking:** Events include full version context (major.minor.patch)
  - `MetadataSet` events: `(did, major, minor, patch, metadataJson, hash, timestamp)`
  - Shows which version triggered each metadata update
  - Example: "v2.1.0 updated metadata at block 12345"
  - Complete historical audit trail via blockchain events
  - Much cheaper than storing duplicates on-chain

**Contract Interface:**
```solidity
// Registry calls with version components (no string concatenation)
setMetadataForRegistry(string did, uint8 major, uint8 minor, uint8 patch, string metadataJson)
```

**Why This Design?**
- Gas efficiency: No duplicate metadata storage across versions
- Version tracking: Events show which version updated metadata
- Most apps don't need version-specific metadata
- Apps requiring version-specific metadata can use custom `dataUrl` (self-hosted)
- Events provide immutable history when needed
