"use client";

import React from "react";
import type { StepRenderContext } from "@/lib/wizard";
import { isFieldRequired } from "@/lib/wizard/field-requirements";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UrlValidator } from "@/components/url-validator";

type PlatformKey = "web" | "ios" | "android" | "windows" | "macos" | "meta" | "playstation" | "xbox" | "nintendo";

const PLATFORMS: PlatformKey[] = ["web","ios","android","windows","macos","meta","playstation","xbox","nintendo"];

export default function Step5_HumanDistribution(ctx: StepRenderContext) {
  const { state, updateField, errors } = ctx;
  const req = (path: string) => isFieldRequired(path, state.interfaceFlags);
  const platformsErr = errors?.["metadata.platforms"]; 

  const getPlatform = (key: PlatformKey) => state.metadata?.platforms?.[key] || {};
  const setPlatform = (key: PlatformKey, field: "downloadUrl" | "launchUrl" | "supported", value: any) => {
    const current = state.metadata?.platforms || {};
    const next = { ...current, [key]: { ...(current[key] || {}), [field]: value } };
    updateField("metadata.platforms", next);
  };

  return (
    <div className="space-y-6">
      {platformsErr && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md" role="alert" aria-live="polite">
          <p className="text-sm text-red-700 dark:text-red-400">{platformsErr}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="iwpsPortalUrl" className="text-base font-semibold">IWPS Portal URL {req("iwpsPortalUrl") ? "*" : ""}</Label>
        <Input
          id="iwpsPortalUrl"
          type="url"
          placeholder="https://iwps.example.com/app/xyz"
          value={state.iwpsPortalUrl || ""}
          onChange={(e) => updateField("iwpsPortalUrl", e.target.value)}
          className={errors?.iwpsPortalUrl ? "border-red-500" : ""}
        />
        <UrlValidator url={state.iwpsPortalUrl || ""} />
        {errors?.iwpsPortalUrl && <p className="text-sm text-red-500">{errors.iwpsPortalUrl}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-base font-semibold">Platforms (at least one URL required)</Label>
        <p className="text-sm text-muted-foreground">Provide Download or Launch URL where applicable. Add supported features optionally.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {PLATFORMS.map((p) => {
            const details = getPlatform(p);
            return (
              <div key={p} className="p-3 rounded-md border">
                <div className="text-sm font-medium mb-2 capitalize">{p}</div>
                <div className="space-y-1">
                  <Input
                    type="url"
                    name={`metadata.platforms.${p}.downloadUrl`}
                    placeholder="Download URL"
                    value={details.downloadUrl || ""}
                    onChange={(e) => setPlatform(p, "downloadUrl", e.target.value)}
                  />
                  <UrlValidator url={details.downloadUrl || ""} />
                </div>
                <div className="space-y-1 mt-2">
                  <Input
                    type="url"
                    name={`metadata.platforms.${p}.launchUrl`}
                    placeholder="Launch URL"
                    value={details.launchUrl || ""}
                    onChange={(e) => setPlatform(p, "launchUrl", e.target.value)}
                  />
                  <UrlValidator url={details.launchUrl || ""} />
                </div>
                <div className="space-y-1 mt-2">
                  <Input
                    type="text"
                    name={`metadata.platforms.${p}.supported`}
                    placeholder="Supported features (comma-separated)"
                    value={(details.supported || []).join(", ")}
                    onChange={(e) => setPlatform(p, "supported", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
