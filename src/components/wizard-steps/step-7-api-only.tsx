/**
 * Step 7: API-Only Fields
 * Only shown when API interface is enabled
 * 
 * Fields:
 * - mcp (Model Context Protocol) - complex JSON for AI agents
 * - a2a (Agent-to-Agent) - URL to agent card
 */

"use client";

import React, { useState } from "react";
import type { StepRenderContext } from "@/lib/wizard";
import { isFieldRequired } from "@/lib/wizard/field-requirements";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UrlValidator } from "@/components/url-validator";
import { Info, Code } from "lucide-react";

export default function Step7_ApiOnly(ctx: StepRenderContext) {
  const { state, updateField, errors } = ctx;
  const req = (path: string) => isFieldRequired(path, state.interfaceFlags);
  
  // Toggle between simple and JSON modes
  const [mcpMode, setMcpMode] = useState<'simple' | 'json'>('simple');
  const [mcpJsonInput, setMcpJsonInput] = useState("");

  const handleMcpJsonApply = () => {
    try {
      const parsed = JSON.parse(mcpJsonInput);
      updateField("metadata.mcp", parsed);
    } catch (error) {
      // Invalid JSON - show error
      alert("Invalid JSON format");
    }
  };

  return (
    <div className="space-y-6">
      {/* A2A Agent Card URL */}
      <div className="space-y-2">
        <Label htmlFor="a2a" className="text-base font-semibold">
          A2A Agent Card URL {req("metadata.a2a") ? "*" : "(Optional)"}
        </Label>
        <p className="text-sm text-muted-foreground">
          URL to your agent card following the Agent-to-Agent (A2A) standard
        </p>
        <Input
          id="a2a"
          type="url"
          placeholder="https://example.com/.well-known/agent-card.json"
          value={state.metadata?.a2a || ""}
          onChange={(e) => updateField("metadata.a2a", e.target.value)}
          className={errors?.["metadata.a2a"] ? "border-red-500" : ""}
        />
        <UrlValidator url={state.metadata?.a2a || ""} />
        {errors?.["metadata.a2a"] && (
          <p className="text-sm text-red-500">{errors["metadata.a2a"]}</p>
        )}
      </div>

      {/* MCP Configuration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">
            MCP (Model Context Protocol) {req("metadata.mcp") ? "*" : "(Optional)"}
          </Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMcpMode('simple')}
              className={`px-3 py-1 text-xs rounded ${
                mcpMode === 'simple'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setMcpMode('json')}
              className={`px-3 py-1 text-xs rounded ${
                mcpMode === 'json'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              JSON
            </button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Model Context Protocol configuration for AI agents to interact with your API
        </p>

        {mcpMode === 'json' ? (
          // JSON Mode - Paste full MCP config
          <div className="space-y-2">
            <Textarea
              placeholder='{"tools": [...], "resources": [...], "prompts": [...], "transport": {...}, "authentication": {...}}'
              value={mcpJsonInput || JSON.stringify(state.metadata?.mcp || {}, null, 2)}
              onChange={(e) => setMcpJsonInput(e.target.value)}
              className="font-mono text-xs"
              rows={12}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleMcpJsonApply}
                className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm"
              >
                Apply JSON
              </button>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded">
              <div className="flex gap-2 items-start text-blue-700 dark:text-blue-400 text-xs">
                <Info size={14} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">MCP Format</p>
                  <p>Paste your complete MCP configuration JSON. See the MCP specification at modelcontextprotocol.io for details.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Simple Mode - Show that MCP is complex, link to docs
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex gap-2 items-start text-sm">
              <Code size={18} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-2">MCP Configuration</p>
                <p className="text-xs text-muted-foreground mb-3">
                  The Model Context Protocol (MCP) allows AI agents to interact with your API. 
                  It requires a complex JSON structure with tools, resources, prompts, transport, and authentication.
                </p>
                <p className="text-xs">
                  <strong>Recommendation:</strong> Use JSON mode to paste a complete MCP configuration, or skip this field if you don&apos;t have an MCP server.
                </p>
                <p className="text-xs mt-2">
                  Learn more: <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">modelcontextprotocol.io</a>
                </p>
              </div>
            </div>
          </div>
        )}

        {errors?.["metadata.mcp"] && (
          <p className="text-sm text-red-500">{errors["metadata.mcp"]}</p>
        )}
      </div>
    </div>
  );
}

