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

  const getScreenshot = (idx: number) => state.metadata?.screenshotUrls?.[idx] || "";
  const setScreenshot = (idx: number, value: string) => {
    const current = state.metadata?.screenshotUrls || [];
    const next = [...current];
    next[idx] = value;
    updateField("metadata.screenshotUrls", next);
  };
  
  const getVideo = (idx: number) => state.metadata?.videoUrls?.[idx] || "";
  const setVideo = (idx: number, value: string) => {
    const current = state.metadata?.videoUrls || [];
    const next = [...current];
    next[idx] = value;
    updateField("metadata.videoUrls", next);
  };
  
  const get3dAsset = (idx: number) => state.metadata?.threeDAssetUrls?.[idx] || "";
  const set3dAsset = (idx: number, value: string) => {
    const current = state.metadata?.threeDAssetUrls || [];
    const next = [...current];
    next[idx] = value;
    updateField("metadata.threeDAssetUrls", next);
  };

  return (
    <div className="space-y-6">
      {/* Screenshots */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Screenshots {req("metadata.screenshotUrls") ? "*" : ""}</Label>
        <p className="text-sm text-muted-foreground">At least one valid URL is required. Up to 5.</p>
        {[0,1,2,3,4].map((i) => (
          <div key={i} className="space-y-1">
            <Input
              type="url"
              name={`metadata.screenshotUrls.${i}`}
              placeholder={`https://example.com/screenshot-${i+1}.png`}
              value={getScreenshot(i)}
              onChange={(e) => setScreenshot(i, e.target.value)}
              className={i === 0 && screenshotErr ? "border-red-500" : ""}
            />
            <UrlValidator url={getScreenshot(i)} />
          </div>
        ))}
        {screenshotErr && <p className="text-sm text-red-500">{screenshotErr}</p>}
      </div>
      
      {/* Video URLs */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Video URLs (Optional)</Label>
        <p className="text-sm text-muted-foreground">
          Links to promotional videos, demos, or tutorials. Up to 3.
        </p>
        {[0,1,2].map((i) => (
          <div key={i} className="space-y-1">
            <Input
              type="url"
              name={`metadata.videoUrls.${i}`}
              placeholder={`https://example.com/video-${i+1}.mp4 or YouTube/Vimeo URL`}
              value={getVideo(i)}
              onChange={(e) => setVideo(i, e.target.value)}
            />
            <UrlValidator url={getVideo(i)} />
          </div>
        ))}
      </div>
      
      {/* 3D Asset URLs */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">3D Asset URLs (Optional)</Label>
        <p className="text-sm text-muted-foreground">
          Links to 3D models (GLB, USDZ, etc.) for AR/VR experiences. Up to 3.
        </p>
        {[0,1,2].map((i) => (
          <div key={i} className="space-y-1">
            <Input
              type="url"
              name={`metadata.threeDAssetUrls.${i}`}
              placeholder={`https://example.com/model-${i+1}.glb`}
              value={get3dAsset(i)}
              onChange={(e) => set3dAsset(i, e.target.value)}
            />
            <UrlValidator url={get3dAsset(i)} />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Common formats: GLB, USDZ, FBX, OBJ
        </p>
      </div>
    </div>
  );
}
