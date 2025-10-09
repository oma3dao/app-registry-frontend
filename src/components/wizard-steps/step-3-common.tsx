"use client";

import React from "react";
import type { StepRenderContext } from "@/lib/wizard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UrlValidator } from "@/components/url-validator";
import { Textarea } from "@/components/ui/textarea";
import { isFieldRequired } from "@/lib/wizard/field-requirements";

export default function Step3_Common(ctx: StepRenderContext) {
  const { state, updateField, errors } = ctx;

  const flags = state.interfaceFlags;
  const req = (path: string) => isFieldRequired(path, flags);

  const descErr = errors?.["metadata.description"]; 
  const extErr = errors?.["metadata.external_url"]; 
  const imgErr = errors?.["metadata.image"]; 
  const sumErr = errors?.["metadata.summary"]; 
  const pubErr = errors?.["metadata.publisher"]; 
  const legalErr = errors?.["metadata.legalUrl"]; 
  const supportErr = errors?.["metadata.supportUrl"]; 

  return (
    <div className="space-y-6">
      {/* Description (text) */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-semibold">
          Description {req("metadata.description") ? "*" : ""}
        </Label>
        <p className="text-sm text-muted-foreground">
          A concise description of your app. Markdown supported.
        </p>
        <Textarea
          id="description"
          name="metadata.description"
          placeholder="Describe your app..."
          value={state.metadata?.description || ""}
          onChange={(e) => updateField("metadata.description", e.target.value)}
          className={descErr ? "border-red-500" : ""}
          rows={5}
        />
        {descErr && <p className="text-sm text-red-500">{descErr}</p>}
      </div>

      {/* Marketing/External URL */}
      <div className="space-y-2">
        <Label htmlFor="externalUrl" className="text-base font-semibold">
          Marketing URL {req("metadata.external_url") ? "*" : ""}
        </Label>
        <p className="text-sm text-muted-foreground">
          Public landing page or marketing site for your app.
        </p>
        <Input
          id="externalUrl"
          name="metadata.external_url"
          type="url"
          placeholder="https://example.com"
          value={state.metadata?.external_url || ""}
          onChange={(e) => updateField("metadata.external_url", e.target.value)}
          className={extErr ? "border-red-500" : ""}
        />
        {extErr && <p className="text-sm text-red-500">{extErr}</p>}
        <UrlValidator url={state.metadata?.external_url || ""} />
      </div>

      {/* Icon/Image URL */}
      <div className="space-y-2">
        <Label htmlFor="imageUrl" className="text-base font-semibold">
          Icon URL {req("metadata.image") ? "*" : ""}
        </Label>
        <p className="text-sm text-muted-foreground">
          App icon (recommended 1024×1024, square).
        </p>
        <Input
          id="imageUrl"
          name="metadata.image"
          type="url"
          placeholder="https://example.com/icon.png"
          value={state.metadata?.image || ""}
          onChange={(e) => updateField("metadata.image", e.target.value)}
          className={imgErr ? "border-red-500" : ""}
        />
        {imgErr && <p className="text-sm text-red-500">{imgErr}</p>}
        <UrlValidator url={state.metadata?.image || ""} />
      </div>

      {/* Optional fields (may be required by some interface rules later) */}
      <div className="space-y-2">
        <Label htmlFor="summary" className="text-base font-semibold">
          Summary {req("metadata.summary") ? "*" : ""}
        </Label>
        <Input
          id="summary"
          name="metadata.summary"
          type="text"
          placeholder="Short app summary"
          value={state.metadata?.summary || ""}
          onChange={(e) => updateField("metadata.summary", e.target.value)}
          className={sumErr ? "border-red-500" : ""}
        />
        {sumErr && <p className="text-sm text-red-500">{sumErr}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="publisher" className="text-base font-semibold">
          Publisher {req("metadata.publisher") ? "*" : ""}
        </Label>
        <Input
          id="publisher"
          name="metadata.publisher"
          type="text"
          placeholder="Your organization"
          value={state.metadata?.publisher || ""}
          onChange={(e) => updateField("metadata.publisher", e.target.value)}
          className={pubErr ? "border-red-500" : ""}
        />
        {pubErr && <p className="text-sm text-red-500">{pubErr}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="legalUrl" className="text-base font-semibold">
          Legal URL {req("metadata.legalUrl") ? "*" : ""}
        </Label>
        <Input
          id="legalUrl"
          name="metadata.legalUrl"
          type="url"
          placeholder="https://example.com/legal"
          value={state.metadata?.legalUrl || ""}
          onChange={(e) => updateField("metadata.legalUrl", e.target.value)}
          className={legalErr ? "border-red-500" : ""}
        />
        {legalErr && <p className="text-sm text-red-500">{legalErr}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="supportUrl" className="text-base font-semibold">
          Support URL {req("metadata.supportUrl") ? "*" : ""}
        </Label>
        <Input
          id="supportUrl"
          name="metadata.supportUrl"
          type="url"
          placeholder="https://example.com/support"
          value={state.metadata?.supportUrl || ""}
          onChange={(e) => updateField("metadata.supportUrl", e.target.value)}
          className={supportErr ? "border-red-500" : ""}
        />
        {supportErr && <p className="text-sm text-red-500">{supportErr}</p>}
      </div>
    </div>
  );
}
