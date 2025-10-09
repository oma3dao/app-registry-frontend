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
    const flags = state.interfaceFlags || { human: true, api: false, smartContract: false };
    return computeInterfacesBitmap(flags);
  }, [state.interfaceFlags]);

  const { metadataPreview, jcsJsonForHash } = useMemo(() => {
    try {
      const out = buildOffchainMetadataObject({
        name: state.name,
        metadata: state.metadata,
        extra: {
          iwpsPortalUrl: state.iwpsPortalUrl,
          traits: Array.isArray(state.traits) ? state.traits : undefined,
        }
      });
      const pretty = JSON.stringify(out, null, 2);
      const { jcsJson } = canonicalizeForHash(out);
      return { metadataPreview: pretty, jcsJsonForHash: jcsJson };
    } catch (_) {
      return { metadataPreview: "{}", jcsJsonForHash: "{}" };
    }
  }, [state]);

  const { dataHashHex, dataHashAlgorithm } = useMemo(() => {
    // Algorithm: 0 = keccak256 (default)
    const algo = 0;
    try {
      // Hash only when meaningful metadata exists; otherwise zero hash
      const hasMeta = !!state.metadata && (
        state.metadata.description || state.metadata.image || state.metadata.external_url ||
        state.metadata.summary || state.metadata.publisher ||
        state.metadata.legalUrl || state.metadata.supportUrl ||
        (state.metadata.screenshotUrls && state.metadata.screenshotUrls.length > 0) ||
        (state.metadata.platforms && Object.keys(state.metadata.platforms).length > 0)
      );
      if (!hasMeta) {
        return { dataHashHex: "0x" + "0".repeat(64), dataHashAlgorithm: algo };
      }
      const { hash } = canonicalizeForHash(JSON.parse(metadataPreview));
      return { dataHashHex: hash, dataHashAlgorithm: algo };
    } catch (_) {
      return { dataHashHex: "0x" + "0".repeat(64), dataHashAlgorithm: algo };
    }
  }, [metadataPreview, state.metadata]);

  const flags = state.interfaceFlags || { human: true, api: false, smartContract: false };

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
          <div className="text-sm">DID: {dashIfEmpty(state.did)}</div>
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
          <div className="text-sm">Description: {dashIfEmpty(state.metadata?.description)}</div>
          <div className="text-sm break-all">Marketing URL: {dashIfEmpty(state.metadata?.external_url)}</div>
          <div className="text-sm break-all">Icon URL: {dashIfEmpty(state.metadata?.image)}</div>
          <div className="text-sm">Summary: {dashIfEmpty(state.metadata?.summary)}</div>
          <div className="text-sm">Publisher: {dashIfEmpty(state.metadata?.publisher)}</div>
          <div className="text-sm break-all">Legal URL: {dashIfEmpty(state.metadata?.legalUrl)}</div>
          <div className="text-sm break-all">Support URL: {dashIfEmpty(state.metadata?.supportUrl)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Media</div>
          <div className="text-sm break-words">
            Screenshots: {state.metadata?.screenshotUrls && state.metadata.screenshotUrls.length > 0 ? state.metadata.screenshotUrls.join(", ") : "—"}
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
            {state.metadata?.platforms && Object.keys(state.metadata.platforms).length > 0 ? (
              Object.entries(state.metadata.platforms).map(([platform, details]) => {
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
