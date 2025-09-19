# app-registry-frontend

Front end for the Application Registry

## License and Participation

- Code is licensed under [MIT](./LICENSE)
- Contributor terms are defined in [CONTRIBUTING.md](./CONTRIBUTING.md)

**Licensing Notice**  
This initial version (v1) is released under MIT to maximize transparency and adoption.  

OMA3 may license future versions of this reference implementation under different terms (for example, the Business Source License, BSL) if forks or incompatible implementations threaten to fragment the ecosystem or undermine the sustainability of OMA3.  

OMA3 standards (such as specifications and schemas) will always remain open and are governed by [OMA3’s IPR Policy](https://www.oma3.org/intellectual-property-rights-policy).

## Purpose

This repository serves multiple purposes:
- **App Tokenization**: The repository implements a minting tool that allows developers to quickly tokenize their app onchain.
- **IWPS Demo**: The repository also implements a basic implementation of the Inter World Portaling System (IWPS), an appliction launching standard that is now in [draft form](../iwps-specification/blob/main/IWPS%20Base%20Specification.md).
- **Sample Code**: Developers can use the repository as sample code to implement their own:
  - App store
  - App tokenization tool
  - IWPS implementation (source or destination)

## Repository Overview

This repository is a Next.js application built with TypeScript, utilizing thirdweb for blockchain interactions. Below is a guide to key directories and files relevant to the purposes outlined above. For a more granular breakdown of the source code, including blockchain configuration (`chains.ts`, `contracts.ts`) and smart contract integration details, please also consult the [src/README.md](src/README.md) file.

**1. App Tokenization (Minting Tool & NFT Management):**

If you want to understand how applications are tokenized as NFTs or how to manage their metadata and status, refer to:

*   **Smart Contract Interaction:**
    *   `src/contracts/appRegistry.ts`: Contains functions for interacting with the main App Registry smart contract (fetching NFTs, updating status, etc.).
    *   `src/contracts/appMetadata.ts`: Contains functions for interacting with the optional App Metadata smart contract (dataUrl, iwpsPortalUri, etc.).
*   **Minting & Editing UI:**
    *   `src/components/nft-mint-modal.tsx`: The core component for the multi-stage wizard used to mint new app NFTs and edit existing ones. This is where developers input application details, metadata URLs, and IWPS URIs.
    *   `src/app/mint/page.tsx`: The page that hosts the minting functionality.
*   **NFT Data Types:**
    *   `src/types/nft.ts`: Defines the structure for NFT objects used throughout the application.
    *   `src/types/metadata-contract.ts`: Defines the structure for the metadata JSON expected by the `dataUrl`.

**2. IWPS Demo (Application Launching):**

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

**3. Sample Code & General Structure (Extending the App Registry):**

For developers looking to use this repository as a base for their own app store, tokenization tool, or a more custom IWPS implementation, here's the overall structure:

*   **Core Application Logic:**
    *   `src/app/`: Contains the main pages and API routes, following Next.js App Router conventions.
    *   `src/components/`: Reusable React components used throughout the application (modals, cards, UI elements).
    *   `src/lib/`: Utility functions, helper scripts (e.g., `utils.ts`, `validation.ts`, `log.ts`).
    *   `src/config/`: Application-wide configuration, such as `app-config.ts`.
    *   `src/types/`: TypeScript type definitions.
*   **Styling:**
    *   `src/app/globals.css` & `tailwind.config.ts`: For global styles and Tailwind CSS configuration.
    *   Shadcn/ui components are used and can be found in `src/components/ui/`.
*   **Blockchain Integration (thirdweb):**
    *   `src/lib/thirdweb.ts` (or similar, depending on your specific thirdweb setup file): Initializes and exports the thirdweb SDK client.
    *   Functions in `src/contracts/` demonstrate how to use the SDK to interact with your contracts.

## Setup

### Installation

Install the template using [thirdweb create](https://portal.thirdweb.com/cli/create)

```bash
  npx thirdweb create app --next
```

### Environment Variables

To run this project, copy .env.example into your .env.local file.

## Testing with Celo Alfajores Testnet

This application currently uses the App Registry contract deployed to the Celo Alfajores testnet for development and testing. THIS DOES NOT MEAN THE PRODUCTION APP REGISTRY CONTRACT WILL BE DEPLOYED TO CELO.  To interact with this application, you'll need to:

1. **Install MetaMask Mobile**
2. **Add Alfajores Testnet to MetaMask**
3. **Get test CELO tokens from the Alfajores faucet**

### Installing MetaMask

1. Visit [MetaMask.io](https://metamask.io/download/) to download the extension for your browser or download the app to your mobile device
2. Follow the setup instructions to create a new wallet or import an existing one
3. Make sure to securely store your recovery phrase

### Adding Celo Alfajores Testnet to MetaMask

#### Desktop Browser Extension:

1. Open MetaMask and click on the network dropdown (usually shows "Ethereum Mainnet")
2. Click "Add Network"
3. In newer versions, click "Add a network manually" at the bottom
4. Enter the following details:
   - **Network Name**: Celo Alfajores Testnet
   - **New RPC URL**: https://alfajores-forno.celo-testnet.org
   - **Chain ID**: 44787
   - **Currency Symbol**: CELO
   - **Block Explorer URL**: https://alfajores.celoscan.io

#### Mobile App:

1. Open the MetaMask app
2. Tap on the hamburger menu or the settings icon
3. Tap "Settings" → "Networks" → "Add Network"
4. Tap "Add a network manually" and enter the same details as above

### Getting Test CELO Tokens

1. Visit the [Alfajores Faucet](https://faucet.celo.org/alfajores)
2. Connect your wallet or paste your wallet address
3. Request the test CELO tokens
4. You can get additional tokens by signing in with GitHub (10x more tokens)
5. Wait a few moments for the tokens to appear in your wallet

### Connecting to the app

1. In Metamask, make sure you're using the Alfajores network (need to choose it in your Networks settings)
2. Hit the app connect button
3. Follow instructions

## Run locally

Install dependencies

```bash
yarn
```

Start development server

```bash
yarn dev
```

Create a production build

```bash
yarn build
```

Preview the production build

```bash
yarn start
```

## Resources

- [Documentation](https://portal.thirdweb.com/typescript/v5)
- [Templates](https://thirdweb.com/templates)
- [YouTube](https://www.youtube.com/c/thirdweb)
- [Blog](https://blog.thirdweb.com)

## Need help?

For help or feedback, please [visit our support site](https://thirdweb.com/support)
