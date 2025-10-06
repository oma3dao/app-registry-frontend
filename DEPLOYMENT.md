# Deployment Configuration

This file documents the deployed infrastructure for the OMA3 App Registry Frontend.

## Thirdweb Server Wallets

Server wallets are HSM-backed wallets managed by Thirdweb for secure transaction signing in production.

### Active Wallets

**Verification Server (Testnet):**
- **Identifier:** `oma3-verification-test`
- **Address:** `0x9F34eCb069d3990228b9796B0d89b9DbF0522A50`
- **Smart Wallet:** `0xaB732b128B0a30e107B849B65A787de6C977C5C3`
- **Network:** OMAchain Testnet (66238)
- **Purpose:** DID verification attestations on testnet
- **Last Updated:** 2025-10-05

**Verification Server (Production):**
- **Identifier:** `oma3-verification-1`
- **Address:** 0x899cFF436F62caDa923f8Ae7F2660Ecd2e99Bf76
- **Smart Wallet:** 0x603B04a8D4E1228171447a0b1CF83CB389142CfC
- **Network:** OMAchain Mainnet
- **Purpose:** DID verification attestations on mainnet
- **Last Updated:** 2025-10-04

### How to Update

Run the wallet listing script in the solidity repo:
```bash
cd ../app-registry-evm-solidity
./scripts/deploy/list-server-wallets.sh
```

Then update this file with the output.

## Vercel Environment Variables

### Required for Production

**Authentication:**
- `THIRDWEB_SECRET_KEY` - Thirdweb project secret key (from dashboard)
- `THIRDWEB_SERVER_WALLET_ADDRESS` - Server wallet address from above (e.g., `0x7F16C09c3FDA956dD0CC3E21820E691EdD44B319`)

**Configuration:**
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` - Thirdweb client ID (public)
- `NEXT_PUBLIC_ACTIVE_CHAIN` - Network: `omachain-testnet` or `omachain-mainnet`

**Optional:**
- `NEXT_PUBLIC_DEBUG_ADAPTER` - Set to `true` for debug logging

### Vercel Deployment Environments

**Preview (preregistry.oma3.org):**
```
NEXT_PUBLIC_ACTIVE_CHAIN=omachain-testnet
THIRDWEB_SERVER_WALLET_ADDRESS=0x9F34eCb069d3990228b9796B0d89b9DbF0522A50
THIRDWEB_SECRET_KEY=[From Bitwarden]
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=[From Bitwarden]
```

**Production (appregistry.oma3.org):**
```
NEXT_PUBLIC_ACTIVE_CHAIN=omachain-mainnet
THIRDWEB_SERVER_WALLET_ADDRESS=[TBD - mainnet wallet]
THIRDWEB_SECRET_KEY=[From Bitwarden]
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=[From Bitwarden]
```

## Contract Addresses

Contract addresses are maintained in `src/config/chains.ts` and can be overridden via environment variables if needed.

### OMAchain Testnet (66238)
- **Registry:** `0xb493465Bcb2151d5b5BaD19d87f9484c8B8A8e83`
- **Metadata:** `0x13aD113D0DE923Ac117c82401e9E1208F09D7F19`
- **Resolver:** `0xe4E8FBf35b6f4D975B4334ffAfaEfd0713217cAb`
- **Deployer:** `0xC8cb41dD6F509f28cA4194f8e1574911281354eF`
- **Deployed:** 2025-10-04 21:45:35 UTC

### OMAchain Mainnet (999999)
- **Status:** Not deployed yet
- **Registry:** TBD
- **Metadata:** TBD
- **Resolver:** TBD

## Local Development

Local development uses `~/.ssh/test-evm-deployment-key` for signing (same as deployment scripts).

**No server wallet configuration needed for local dev!**

Required `.env`:
```bash
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_ACTIVE_CHAIN=omachain-testnet
NEXT_PUBLIC_DEBUG_ADAPTER=true
```

## Security Notes

1. **Server Wallet Private Keys:** Never exposed - managed by Thirdweb's HSM
2. **Secret Key Storage:** Stored in Bitwarden, set in Vercel env vars
3. **SSH Private Key:** For local dev only, never committed to git
4. **Contract Ownership:** Contracts owned by deployer wallet (`0xf39...`), not server wallet

## Related Files

- `src/config/chains.ts` - Chain and contract address configuration
- `src/config/env.ts` - Environment variable parsing and validation
- `.env.example` - Template for environment variables
- `../app-registry-evm-solidity/scripts/deploy/contract-addresses.txt` - Contract deployment history
