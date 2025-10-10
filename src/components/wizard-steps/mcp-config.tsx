/**
 * MCP (Model Context Protocol) Configuration Component
 * Provides structured input for MCP server metadata
 */

"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info } from "lucide-react";
import type { McpConfig } from "@/types/metadata-contract";

interface McpConfigProps {
  value: McpConfig | undefined;
  onChange: (config: McpConfig | undefined) => void;
}

export function McpConfigEditor({ value, onChange }: McpConfigProps) {
  const config = value || { tools: [], resources: [], prompts: [], transport: {}, authentication: {} };
  
  // Add a new tool
  const addTool = () => {
    const newTool = { name: "", description: "", inputSchema: {} };
    onChange({
      ...config,
      tools: [...(config.tools || []), newTool],
    });
  };
  
  const updateTool = (index: number, field: string, value: any) => {
    const tools = [...(config.tools || [])];
    tools[index] = { ...tools[index], [field]: value };
    onChange({ ...config, tools });
  };
  
  const removeTool = (index: number) => {
    const tools = config.tools?.filter((_, i) => i !== index) || [];
    onChange({ ...config, tools });
  };
  
  // Add a new resource
  const addResource = () => {
    const newResource = { uri: "", name: "", description: "", mimeType: "" };
    onChange({
      ...config,
      resources: [...(config.resources || []), newResource],
    });
  };
  
  const updateResource = (index: number, field: string, value: any) => {
    const resources = [...(config.resources || [])];
    resources[index] = { ...resources[index], [field]: value };
    onChange({ ...config, resources });
  };
  
  const removeResource = (index: number) => {
    const resources = config.resources?.filter((_, i) => i !== index) || [];
    onChange({ ...config, resources });
  };
  
  // Add a new prompt
  const addPrompt = () => {
    const newPrompt = { name: "", description: "", arguments: [] };
    onChange({
      ...config,
      prompts: [...(config.prompts || []), newPrompt],
    });
  };
  
  const updatePrompt = (index: number, field: string, value: any) => {
    const prompts = [...(config.prompts || [])];
    prompts[index] = { ...prompts[index], [field]: value };
    onChange({ ...config, prompts });
  };
  
  const removePrompt = (index: number) => {
    const prompts = config.prompts?.filter((_, i) => i !== index) || [];
    onChange({ ...config, prompts });
  };

  return (
    <div className="space-y-6 p-4 border rounded-lg">
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded">
        <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">MCP Configuration</p>
          <p>Configure tools, resources, and prompts for AI agents to interact with your API. Learn more at <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="underline">modelcontextprotocol.io</a></p>
        </div>
      </div>
      
      {/* Tools */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-semibold">Tools <span className="text-red-500">*</span></Label>
          <Button type="button" size="sm" variant="outline" onClick={addTool}>
            <Plus size={14} className="mr-1" /> Add Tool
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Functions/capabilities your MCP server provides</p>
        
        {config.tools?.map((tool, index) => (
          <div key={index} className="p-3 bg-muted rounded space-y-2 border">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium">Tool {index + 1}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => removeTool(index)}>
                <Trash2 size={14} />
              </Button>
            </div>
            <Input
              placeholder="Tool name (e.g., 'search', 'create_file')"
              value={tool.name}
              onChange={(e) => updateTool(index, 'name', e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Description"
              value={tool.description}
              onChange={(e) => updateTool(index, 'description', e.target.value)}
              className="text-sm"
            />
            <Textarea
              placeholder='Input schema (JSON): {"type": "object", "properties": {...}}'
              value={typeof tool.inputSchema === 'string' ? tool.inputSchema : JSON.stringify(tool.inputSchema || {}, null, 2)}
              onChange={(e) => {
                try {
                  updateTool(index, 'inputSchema', JSON.parse(e.target.value));
                } catch {
                  updateTool(index, 'inputSchema', e.target.value);
                }
              }}
              rows={3}
              className="font-mono text-xs"
            />
          </div>
        ))}
      </div>
      
      {/* Resources */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-semibold">Resources <span className="text-red-500">*</span></Label>
          <Button type="button" size="sm" variant="outline" onClick={addResource}>
            <Plus size={14} className="mr-1" /> Add Resource
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Data sources or content your MCP server can access</p>
        
        {config.resources?.map((resource, index) => (
          <div key={index} className="p-3 bg-muted rounded space-y-2 border">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium">Resource {index + 1}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => removeResource(index)}>
                <Trash2 size={14} />
              </Button>
            </div>
            <Input
              placeholder="URI (e.g., 'file:///data', 'https://api.example.com/docs')"
              value={resource.uri}
              onChange={(e) => updateResource(index, 'uri', e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Resource name"
              value={resource.name}
              onChange={(e) => updateResource(index, 'name', e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Description (optional)"
              value={resource.description || ""}
              onChange={(e) => updateResource(index, 'description', e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="MIME type (optional, e.g., 'text/plain', 'application/json')"
              value={resource.mimeType || ""}
              onChange={(e) => updateResource(index, 'mimeType', e.target.value)}
              className="text-sm"
            />
          </div>
        ))}
      </div>
      
      {/* Prompts */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-semibold">Prompts <span className="text-red-500">*</span></Label>
          <Button type="button" size="sm" variant="outline" onClick={addPrompt}>
            <Plus size={14} className="mr-1" /> Add Prompt
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Pre-configured prompts agents can use</p>
        
        {config.prompts?.map((prompt, index) => (
          <div key={index} className="p-3 bg-muted rounded space-y-2 border">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium">Prompt {index + 1}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => removePrompt(index)}>
                <Trash2 size={14} />
              </Button>
            </div>
            <Input
              placeholder="Prompt name"
              value={prompt.name}
              onChange={(e) => updatePrompt(index, 'name', e.target.value)}
              className="text-sm"
            />
            <Textarea
              placeholder="Prompt description"
              value={prompt.description}
              onChange={(e) => updatePrompt(index, 'description', e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        ))}
      </div>
      
      {/* Transport & Authentication - Advanced (JSON mode) */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Transport & Authentication (Advanced)</Label>
        <p className="text-xs text-muted-foreground">
          Configure transport protocols (HTTP/stdio) and authentication methods. Paste JSON or leave empty for defaults.
        </p>
        <Textarea
          placeholder='{"transport": {"http": {...}}, "authentication": {"oauth2": {...}}}'
          value={JSON.stringify({ transport: config.transport, authentication: config.authentication }, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange({
                ...config,
                transport: parsed.transport || config.transport,
                authentication: parsed.authentication || config.authentication,
              });
            } catch {
              // Invalid JSON, ignore
            }
          }}
          rows={4}
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
}

