/**
 * Step 7: Endpoint Configuration
 * Shown when API OR Smart Contract interface is enabled
 * 
 * For APIs:
 * - endpoint.url (required based on API type)
 * - endpoint.schemaUrl (optional)
 * - interfaceVersions (optional)
 * - mcp config (only for MCP type)
 * 
 * For Smart Contracts:
 * - endpoint.url (optional recommended RPC)
 * - endpoint.schemaUrl (optional)
 */

"use client";

import React from "react";
import type { StepRenderContext } from "@/lib/wizard";
import { isFieldRequired } from "@/lib/wizard/field-requirements";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UrlValidator } from "@/components/url-validator";
import { McpConfigEditor } from "./mcp-config";

export default function Step7_ApiOnly(ctx: StepRenderContext) {
  const { state, updateField, errors } = ctx;
  const req = (path: string) => isFieldRequired(path, state.interfaceFlags);
  
  // Get selected API type (null if only contract)
  const apiType = state.apiType;
  const isContractOnly = state.interfaceFlags?.smartContract && !state.interfaceFlags?.api;
  
  // If API selected but no API type yet, prompt user
  if (state.interfaceFlags?.api && !apiType) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg text-center">
        <p className="text-sm text-yellow-900 dark:text-yellow-100">
          Please select an API type in Step 1 (Verification) to configure API-specific fields.
        </p>
      </div>
    );
  }

  const endpoint = state.endpoint || { url: '', schemaUrl: '' };
  
  // Get endpoint labels based on interface type
  const getEndpointLabels = () => {
    // Smart contract only
    if (isContractOnly) {
      return {
        url: 'Recommended RPC Endpoint',
        urlDesc: 'Optional: Recommend a specific RPC endpoint for interacting with your contract',
        urlPlaceholder: 'https://mainnet.optimism.io or https://opt-mainnet.g.alchemy.com/v2/...',
        required: false,
      };
    }
    
    // API types
    switch (apiType) {
      case 'a2a':
        return {
          url: 'Agent Card URL',
          urlDesc: 'URL to your .well-known/agent-card.json endpoint',
          urlPlaceholder: 'https://example.com/.well-known/agent-card.json',
          required: true,
        };
      case 'mcp':
        return {
          url: 'MCP Server URL',
          urlDesc: 'Base URL of your MCP server endpoint',
          urlPlaceholder: 'https://mcp.example.com',
          required: true,
        };
      case 'graphql':
        return {
          url: 'GraphQL Endpoint URL',
          urlDesc: 'URL to your GraphQL API endpoint',
          urlPlaceholder: 'https://api.example.com/graphql',
          required: true,
        };
      case 'jsonrpc':
        return {
          url: 'JSON-RPC Endpoint URL',
          urlDesc: 'URL to your JSON-RPC API endpoint',
          urlPlaceholder: 'https://rpc.example.com',
          required: true,
        };
      default: // openapi
        return {
          url: 'API Endpoint URL',
          urlDesc: 'Base URL of your REST/OpenAPI endpoint',
          urlPlaceholder: 'https://api.example.com/v1',
          required: true,
        };
    }
  };
  
  const labels = getEndpointLabels();

  return (
    <div className="space-y-6">
      {/* Show info about selected type */}
      {apiType && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm">
            <strong>Selected API Type:</strong> {apiType.toUpperCase()} 
            <span className="ml-2 text-xs text-muted-foreground">(Trait: api:{apiType} will be auto-added)</span>
          </p>
        </div>
      )}
      
      {isContractOnly && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Smart Contract Configuration</strong>
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Your contract address and chain ID are already specified in your DID. 
            You can optionally recommend an RPC endpoint for optimal performance.
          </p>
        </div>
      )}
      
      {state.interfaceFlags?.api && state.interfaceFlags?.smartContract && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded">
          <p className="text-sm text-yellow-900 dark:text-yellow-100">
            <strong>Note:</strong> You&apos;ve selected both API and Smart Contract interfaces.
          </p>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
            The endpoint URL will be used for your <strong>{apiType?.toUpperCase()} API</strong>. 
            Your smart contract&apos;s chain and address are already in the DID (did:pkh).
          </p>
        </div>
      )}
      
      {/* Endpoint Configuration - Required for ALL API types */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-base font-semibold">Endpoint Configuration</Label>
          <p className="text-sm text-muted-foreground">
            Configure the endpoint where clients can access your API
          </p>
        </div>
        
        {/* Endpoint URL */}
        <div className="space-y-2">
          <Label htmlFor="endpoint-url" className="text-sm font-medium">
            {labels.url} {labels.required && <span className="text-red-500">*</span>}
          </Label>
          <p className="text-xs text-muted-foreground">{labels.urlDesc}</p>
          <Input
            id="endpoint-url"
            type="url"
            placeholder={labels.urlPlaceholder}
            value={endpoint.url || ""}
            onChange={(e) => updateField("metadata.endpoint.url", e.target.value)}
            className={errors?.["metadata.endpoint.url"] ? "border-red-500" : ""}
          />
          <UrlValidator url={endpoint.url || ""} />
          {errors?.["metadata.endpoint.url"] && (
            <p className="text-sm text-red-500">{errors["metadata.endpoint.url"]}</p>
          )}
        </div>
        
        {/* Schema/Documentation URL */}
        <div className="space-y-2">
          <Label htmlFor="endpoint-schema-url" className="text-sm font-medium">
            Schema / Documentation URL (Optional)
          </Label>
          <p className="text-xs text-muted-foreground mb-1">
            <strong>Preferred:</strong> Machine-readable schema file for client auto-configuration. 
            <strong>Fallback:</strong> Human-readable documentation page.
          </p>
          <Input
            id="endpoint-schema-url"
            type="url"
            placeholder={
              apiType === 'graphql' ? 'https://api.example.com/graphql?sdl' :
              apiType === 'openapi' ? 'https://api.example.com/openapi.json' :
              apiType === 'jsonrpc' ? 'https://api.example.com/schema.json' :
              isContractOnly ? 'https://etherscan.io/address/0x...' :
              'https://api.example.com/schema.json'
            }
            value={endpoint.schemaUrl || ""}
            onChange={(e) => updateField("metadata.endpoint.schemaUrl", e.target.value)}
          />
          <UrlValidator url={endpoint.schemaUrl || ""} />
          <p className="text-xs text-muted-foreground">
            {apiType === 'graphql' && 'Ideally: GraphQL SDL/schema file. Fallback: Documentation page'}
            {apiType === 'openapi' && 'Ideally: OpenAPI/Swagger JSON spec. Fallback: Documentation page'}
            {apiType === 'jsonrpc' && 'Ideally: JSON schema defining methods. Fallback: Documentation page'}
            {apiType === 'a2a' && 'Ideally: Agent capabilities schema. Fallback: Documentation page'}
            {apiType === 'mcp' && 'Ideally: MCP server schema. Fallback: Documentation page'}
            {isContractOnly && 'Ideally: ABI JSON file. Fallback: Block explorer or documentation'}
          </p>
        </div>
        
        {/* Interface Versions - Only for APIs, not contracts */}
        {!isContractOnly && (
          <div className="space-y-2">
            <Label htmlFor="interface-versions" className="text-sm font-medium">
              Interface Versions (Optional)
            </Label>
            <Input
              id="interface-versions"
              type="text"
              placeholder="v1, v2, v3 or 1.0.0, 2.0.0"
              value={state.interfaceVersions?.join(", ") || ""}
              onChange={(e) => {
                const versions = e.target.value
                  .split(",")
                  .map(v => v.trim())
                  .filter(v => v.length > 0);
                updateField("metadata.interfaceVersions", versions.length > 0 ? versions : undefined);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {apiType === 'mcp' && 'MCP versions your server supports (e.g., "1.0", "2.0")'}
              {apiType === 'a2a' && 'A2A protocol versions you support'}
              {apiType === 'graphql' && 'GraphQL specification versions'}
              {!apiType || (apiType !== 'mcp' && apiType !== 'a2a' && apiType !== 'graphql') && 'API versions your endpoint supports'}
            </p>
          </div>
        )}
      </div>
      {/* MCP Configuration - Only for MCP type (additional to endpoint) */}
      {apiType === 'mcp' && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            MCP (Model Context Protocol) Configuration
          </Label>
          <p className="text-sm text-muted-foreground">
            Configure tools, resources, and prompts for AI agents
          </p>
          
          <McpConfigEditor
            value={state.mcp}
            onChange={(mcpConfig) => updateField("mcp", mcpConfig)}
          />
          
          {errors?.mcp && (
            <p className="text-sm text-red-500">{errors.mcp}</p>
          )}
        </div>
      )}
    </div>
  );
}

