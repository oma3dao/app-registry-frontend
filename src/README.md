# OMATrust App Registry Frontend Code

This directory contains the source code for the OMATrust App Registry frontend application.

## Configuration & Integration (current)

### Chains & Environment

- `src/config/chains.ts` — numeric chain IDs, RPC, explorers, and contract addresses per network
- `src/config/env.ts` — selects active chain preset and exposes registry/metadata/resolver addresses

### Thirdweb Client & Contracts

- `src/app/client.ts` — creates the thirdweb client from `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`
- `src/lib/contracts/client.ts` — resolves the active chain (`defineChain`) and returns typed contract instances:
  - `getAppRegistryContract()`
  - `getAppMetadataContract()`
  - `getResolverContract()`

### Registry Interaction (read/write)

- `src/lib/contracts/registry.hooks.ts` — React hooks (e.g., `useMintApp`, `useUpdateStatus`, `useAppsByOwner`)
- `src/lib/contracts/registry.write.ts` — pure tx builders (e.g., `prepareMintApp`) used by hooks
- `src/lib/contracts/metadata.*.ts` — optional App Metadata read/write helpers

### Wizard & Deterministic JSON

- `src/components/nft-mint-modal.tsx` — modal‑owned step state; calls parent `onSubmit` only at Step 6 (Review & Mint)
- `src/lib/wizard/registry.tsx` — step definitions, validation, visibility rules
- `src/lib/wizard/field-requirements.ts` — dynamic requiredness per interface type
- `src/lib/utils/offchain-json.ts` — builds spec‑aligned DataURL JSON (omits empty fields)
- `src/lib/utils/dataurl.ts` — JCS canonicalization + keccak256 hashing and verification helpers

## Examples

### Get a contract instance

```ts
import { getAppRegistryContract } from "@/lib/contracts/client";

const registry = getAppRegistryContract();
```

### Mint via hook (recommended)

```ts
import { useMintApp } from "@/lib/contracts";

const { mint } = useMintApp();

await mint({
  did: "did:web:example.com",
  interfaces: 1,
  dataUrl: "https://example.com/app.json",
  dataHash: "0x…", // JCS keccak256 of off-chain JSON
  dataHashAlgorithm: 0,
  initialVersionMajor: 1,
  initialVersionMinor: 0,
  initialVersionPatch: 0,
  traitHashes: [],
  metadataJson: "{…}" // JCS string (optional on-chain mirror)
});
```

### Build spec‑aligned off‑chain JSON and hash

```ts
import { buildOffchainMetadataObject } from "@/lib/utils/offchain-json";
import { canonicalizeForHash } from "@/lib/utils/dataurl";

const offchain = buildOffchainMetadataObject({ name, metadata });
const { jcsJson, hash } = canonicalizeForHash(offchain);
```

## Best Practices

1. **Single Source of Truth**: Numeric chain IDs and addresses live in `src/config/chains.ts`; `src/config/env.ts` selects the active preset.
2. **Deterministic Off‑chain Data**: Always JCS‑canonicalize the spec‑aligned JSON before hashing; use the shared builder to avoid drift.
3. **Modal‑Owned Flow**: The wizard modal owns step state and only submits on Step 6 for consistency.
4. **Type Safety**: Prefer typed hooks and tx builders under `src/lib/contracts`. 