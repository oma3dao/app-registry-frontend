"use client";

import React from "react";
import type { StepRenderContext } from "@/lib/wizard";
import { isFieldRequired } from "@/lib/wizard/field-requirements";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UrlValidator } from "@/components/url-validator";

export default function Step4_HumanMedia(ctx: StepRenderContext) {
  const { state, updateField, errors } = ctx;
  const req = (path: string) => isFieldRequired(path, state.interfaceFlags);

  const screenshotErr = errors?.["metadata.screenshotUrls"];

  const get = (idx: number) => state.metadata?.screenshotUrls?.[idx] || "";
  const set = (idx: number, value: string) => {
    const current = state.metadata?.screenshotUrls || [];
    const next = [...current];
    next[idx] = value;
    updateField("metadata.screenshotUrls", next);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-base font-semibold">Screenshots {req("metadata.screenshotUrls") ? "*" : ""}</Label>
        <p className="text-sm text-muted-foreground">At least one valid URL is required. Up to 5.</p>
        {[0,1,2,3,4].map((i) => (
          <div key={i} className="space-y-1">
            <Input
              type="url"
              name={`metadata.screenshotUrls.${i}`}
              placeholder={`https://example.com/screenshot-${i+1}.png`}
              value={get(i)}
              onChange={(e) => set(i, e.target.value)}
              className={i === 0 && screenshotErr ? "border-red-500" : ""}
            />
            <UrlValidator url={get(i)} />
          </div>
        ))}
        {screenshotErr && <p className="text-sm text-red-500">{screenshotErr}</p>}
      </div>
    </div>
  );
}
