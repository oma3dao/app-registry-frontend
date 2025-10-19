/**
 * Step 6: Review & Submit
 * Shows all collected inputs and computed artifacts (interfaces bitmap, dataHash, dataHashAlgorithm),
 * plus a JSON preview for custom dataUrl hosting.
 */

import { useMemo } from "react";
import type { StepRenderContext } from "@/lib/wizard";
import { computeInterfacesBitmap } from "@/lib/utils/interfaces";
import { canonicalizeForHash } from "@/lib/utils/dataurl";
import { buildOffchainMetadataObject } from "@/lib/utils/offchain-json";

function dashIfEmpty(v: any): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "string" && v.trim() === "") return "—";
  if (Array.isArray(v) && v.length === 0) return "—";
  return String(v);
}

export default function Step6_Review({ state }: StepRenderContext) {
  const interfacesBitmap = useMemo(() => {
    const flags = state.interfaceFlags || { human: false, api: false, smartContract: false };
    return computeInterfacesBitmap(flags);
  }, [state.interfaceFlags]);

  const { metadataPreview, jcsJsonForHash } = useMemo(() => {
    try {
      // Pass flattened state directly - all fields at top level (no nested metadata)
      const out = buildOffchainMetadataObject({
        ...state, // Spread all flattened fields (name, description, endpoint, mcp, platforms, traits, etc.)
      });

      // Debug: Log what we're getting
      console.log('[Step6 Review] state.mcp:', state.mcp);
      console.log('[Step6 Review] state.endpoint:', state.endpoint);
      console.log('[Step6 Review] state.platforms:', state.platforms);
      console.log('[Step6 Review] buildOffchainMetadataObject output:', out);

      const pretty = JSON.stringify(out, null, 2);
      const { jcsJson } = canonicalizeForHash(out);
      return { metadataPreview: pretty, jcsJsonForHash: jcsJson };
    } catch (err) {
      console.error('[Step6 Review] Error building metadata:', err);
      return { metadataPreview: "{}", jcsJsonForHash: "{}" };
    }
  }, [state]);

  const { dataHashHex, dataHashAlgorithm } = useMemo(() => {
    // Algorithm: 0 = keccak256 (default)
    const algo = 0;
    try {
      // Hash only when meaningful metadata exists; otherwise zero hash
      const hasMeta = !!(
        state.description || state.image || state.external_url ||
        state.summary || state.publisher ||
        state.legalUrl || state.supportUrl ||
        (state.screenshotUrls && state.screenshotUrls.length > 0) ||
        (state.platforms && Object.keys(state.platforms).length > 0) ||
        state.endpoint || state.mcp || state.traits
      );
      if (!hasMeta) {
        return { dataHashHex: "0x" + "0".repeat(64), dataHashAlgorithm: algo };
      }
      const { hash } = canonicalizeForHash(JSON.parse(metadataPreview));
      return { dataHashHex: hash, dataHashAlgorithm: algo };
    } catch (_) {
      return { dataHashHex: "0x" + "0".repeat(64), dataHashAlgorithm: algo };
    }
  }, [metadataPreview]);

  const flags = state.interfaceFlags || { human: false, api: false, smartContract: false };

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Review all details. The wizard mints only the Registry token. If using a custom dataUrl, copy the JSON below and host it at your endpoint.
      </div>

      {/* Identifiers & Interfaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Identifiers</div>
          <div className="text-sm">Name: {dashIfEmpty(state.name)}</div>
          <div className="text-sm break-all">DID: {dashIfEmpty(state.did)}</div>
          <div className="text-sm">Version: {dashIfEmpty(state.version)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Interfaces</div>
          <div className="text-sm">Human: {flags.human ? "Yes" : "No"}</div>
          <div className="text-sm">API: {flags.api ? "Yes" : "No"}</div>
          <div className="text-sm">Smart Contract: {flags.smartContract ? "Yes" : "No"}</div>
          <div className="text-sm">Bitmap: {interfacesBitmap}</div>
        </div>
      </div>

      {/* On-chain Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">On‑Chain Inputs</div>
          <div className="text-sm break-all">Data URL: {dashIfEmpty(state.dataUrl)}</div>
          <div className="text-sm break-all">Contract ID: {dashIfEmpty(state.contractId)}</div>
          <div className="text-sm break-all">Fungible Token ID: {dashIfEmpty(state.fungibleTokenId)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Traits</div>
          <div className="text-sm break-words">
            {Array.isArray(state.traits) && state.traits.length > 0 ? state.traits.join(", ") : "—"}
          </div>
        </div>
      </div>

      {/* Off-chain Common */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Common (Off‑Chain)</div>
          <div className="text-sm">Description: {dashIfEmpty(state.description)}</div>
          <div className="text-sm break-all">Marketing URL: {dashIfEmpty(state.external_url)}</div>
          <div className="text-sm break-all">Icon URL: {dashIfEmpty(state.image)}</div>
          <div className="text-sm">Summary: {dashIfEmpty(state.summary)}</div>
          <div className="text-sm">Publisher: {dashIfEmpty(state.publisher)}</div>
          <div className="text-sm break-all">Legal URL: {dashIfEmpty(state.legalUrl)}</div>
          <div className="text-sm break-all">Support URL: {dashIfEmpty(state.supportUrl)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Media</div>
          <div className="text-sm break-words">
            Screenshots: {state.screenshotUrls && state.screenshotUrls.length > 0 ? state.screenshotUrls.join(", ") : "—"}
          </div>
        </div>
      </div>

      {/* Distribution */}
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Distribution</div>
        <div className="text-sm break-all">IWPS Portal URL: {dashIfEmpty(state.iwpsPortalUrl)}</div>
        <div className="text-sm">
          Platforms:
          <div className="mt-1 pl-3 border-l">
            {state.platforms && Object.keys(state.platforms).length > 0 ? (
              Object.entries(state.platforms).map(([platform, details]) => {
                const platformDetails = details as import('@/types/metadata-contract').PlatformDetails | undefined;
                return (
                  <div key={platform} className="text-sm mb-1">
                    <span className="font-medium capitalize">{platform}:</span>{" "}
                    <span className="break-all">download={dashIfEmpty(platformDetails?.downloadUrl)}, launch={dashIfEmpty(platformDetails?.launchUrl)}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-sm">—</div>
            )}
          </div>
        </div>
      </div>

      {/* Computed Artifacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Data Hash</div>
          <div className="text-sm break-all">{dataHashHex}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Data Hash Algorithm</div>
          <div className="text-sm">{dataHashAlgorithm} (keccak256)</div>
        </div>
      </div>

      {/* JSON Preview */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Off‑chain JSON (copy/paste)</div>
        <pre className="text-xs bg-muted/30 rounded-md p-3 overflow-auto max-h-64">
          {metadataPreview}
        </pre>
      </div>
    </div>
  );
}
