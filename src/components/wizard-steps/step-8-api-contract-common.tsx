/**
 * Step 8: API & Smart Contract Common Fields
 * Shown when API OR Smart Contract interface is enabled
 * 
 * Fields:
 * - endpoint (url, format, schemaUrl)
 * - interfaceVersions (array of version strings)
 */

"use client";

import React from "react";
import type { StepRenderContext } from "@/lib/wizard";
import { isFieldRequired } from "@/lib/wizard/field-requirements";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UrlValidator } from "@/components/url-validator";
import { Info } from "lucide-react";

export default function Step8_ApiContractCommon(ctx: StepRenderContext) {
  const { state, updateField, errors } = ctx;
  const req = (path: string) => isFieldRequired(path, state.interfaceFlags);
  
  const endpoint = state.metadata?.endpoint || { url: '', format: '', schemaUrl: '' };

  return (
    <div className="space-y-6">
      {/* Endpoint Configuration */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-base font-semibold">
            API Endpoint Configuration {req("metadata.endpoint") ? "*" : ""}
          </Label>
          <p className="text-sm text-muted-foreground">
            Configure the endpoint where clients can access your API or smart contract
          </p>
        </div>

        {/* Endpoint URL */}
        <div className="space-y-2">
          <Label htmlFor="endpoint-url" className="text-sm font-medium">
            Endpoint URL {req("metadata.endpoint.url") ? "*" : ""}
          </Label>
          <Input
            id="endpoint-url"
            type="url"
            placeholder="https://api.example.com/v1"
            value={endpoint.url || ""}
            onChange={(e) => updateField("metadata.endpoint.url", e.target.value)}
            className={errors?.["metadata.endpoint.url"] ? "border-red-500" : ""}
          />
          <UrlValidator url={endpoint.url || ""} />
          {errors?.["metadata.endpoint.url"] && (
            <p className="text-sm text-red-500">{errors["metadata.endpoint.url"]}</p>
          )}
          <p className="text-xs text-muted-foreground">
            For smart contracts: Use RPC endpoint URL (e.g., https://rpc.chain.com)
          </p>
        </div>

        {/* API Format */}
        <div className="space-y-2">
          <Label htmlFor="endpoint-format" className="text-sm font-medium">
            API Format {req("metadata.endpoint.format") ? "*" : "(Optional)"}
          </Label>
          <Input
            id="endpoint-format"
            type="text"
            placeholder="REST, GraphQL, JSON-RPC, gRPC, etc."
            value={endpoint.format || ""}
            onChange={(e) => updateField("metadata.endpoint.format", e.target.value)}
            className={errors?.["metadata.endpoint.format"] ? "border-red-500" : ""}
          />
          {errors?.["metadata.endpoint.format"] && (
            <p className="text-sm text-red-500">{errors["metadata.endpoint.format"]}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Examples: REST, GraphQL, JSON-RPC, gRPC
          </p>
        </div>

        {/* Schema URL */}
        <div className="space-y-2">
          <Label htmlFor="endpoint-schema-url" className="text-sm font-medium">
            API Documentation URL {req("metadata.endpoint.schemaUrl") ? "*" : "(Optional)"}
          </Label>
          <Input
            id="endpoint-schema-url"
            type="url"
            placeholder="https://api.example.com/docs or https://example.com/openapi.json"
            value={endpoint.schemaUrl || ""}
            onChange={(e) => updateField("metadata.endpoint.schemaUrl", e.target.value)}
            className={errors?.["metadata.endpoint.schemaUrl"] ? "border-red-500" : ""}
          />
          <UrlValidator url={endpoint.schemaUrl || ""} />
          {errors?.["metadata.endpoint.schemaUrl"] && (
            <p className="text-sm text-red-500">{errors["metadata.endpoint.schemaUrl"]}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Link to OpenAPI spec, GraphQL schema, or documentation
          </p>
        </div>
      </div>

      {/* Interface Versions */}
      <div className="space-y-2">
        <Label htmlFor="interface-versions" className="text-base font-semibold">
          Interface Versions {req("metadata.interfaceVersions") ? "*" : "(Optional)"}
        </Label>
        <p className="text-sm text-muted-foreground">
          Comma-separated list of interface/API versions you support
        </p>
        <Input
          id="interface-versions"
          type="text"
          placeholder="v1, v2, v3 or 1.0.0, 2.0.0"
          value={state.metadata?.interfaceVersions?.join(", ") || ""}
          onChange={(e) => {
            const versions = e.target.value
              .split(",")
              .map(v => v.trim())
              .filter(v => v.length > 0);
            updateField("metadata.interfaceVersions", versions.length > 0 ? versions : undefined);
          }}
          className={errors?.["metadata.interfaceVersions"] ? "border-red-500" : ""}
        />
        {errors?.["metadata.interfaceVersions"] && (
          <p className="text-sm text-red-500">{errors["metadata.interfaceVersions"]}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Examples: "v1, v2" or "1.0.0, 2.0.0, 3.0.0"
        </p>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
        <div className="flex gap-2 items-start text-blue-700 dark:text-blue-400 text-sm">
          <Info size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">API & Contract Interface Fields</p>
            <p className="text-xs">
              These fields help clients discover and interact with your API or smart contract.
              The endpoint URL is the primary access point for programmatic interaction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

