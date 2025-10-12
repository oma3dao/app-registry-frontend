/**
 * Step 1: Verification
 * Collects: App Name, Version, DID, Interface Flags
 * Triggers: Attestation-first verification
 */

"use client";

import React, { useState } from "react";
import type { StepRenderContext } from "@/lib/wizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DidWebInput } from "@/components/did-web-input";
import { Caip10Input } from "@/components/caip10-input";
import { DidVerification } from "@/components/did-verification";
import { InterfacesSelector } from "@/components/interfaces-selector";
import {
  NAME_PLACEHOLDER,
  VERSION_PLACEHOLDER,
} from "@/config/app-config";

export default function Step1_Verification({
  state,
  updateField,
  errors,
}: StepRenderContext) {
  // Local state for DID type selector
  const [didType, setDidType] = useState<"did:web" | "did:pkh" | "">(
    state.did?.startsWith("did:web:") ? "did:web" :
    state.did?.startsWith("did:pkh:") ? "did:pkh" : ""
  );

  const handleDidTypeChange = (newType: string) => {
    setDidType(newType as "did:web" | "did:pkh" | "");
    updateField("did", ""); // Clear DID when switching types
    updateField("_verificationStatus", "idle"); // Reset verification
  };

  return (
    <div className="space-y-6">
      {/* App Name */}
      <div className="space-y-2">
        <Label htmlFor="name">App Name</Label>
        <Input
          id="name"
          value={state.name || ""}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder={NAME_PLACEHOLDER}
          required
          className={errors?.name ? "border-red-500" : ""}
        />
        {errors?.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      {/* Version */}
      <div className="space-y-2">
        <Label htmlFor="version">Version</Label>
        <Input
          id="version"
          value={state.version || ""}
          onChange={(e) => updateField("version", e.target.value)}
          placeholder={VERSION_PLACEHOLDER}
          required
          className={errors?.version ? "border-red-500" : ""}
        />
        {errors?.version && (
          <p className="text-red-500 text-sm mt-1">{errors.version}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Semantic version (e.g., 1.0 or 1.0.0)
        </p>
      </div>

      {/* DID Explanation */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
        <div className="flex gap-2 items-start">
          <InfoIcon size={18} className="mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-2">What is a DID?</p>
            <p className="mb-2">
              A <strong>DID (Decentralized Identifier)</strong> is the main identifier for your app in the registry.
              Along with the major version, it uniquely identifies your tokenized app on-chain.
            </p>
            <p>
              Choose between a <strong>website-based DID</strong> (did:web) or a <strong>smart contract DID</strong> (did:pkh).
            </p>
          </div>
        </div>
      </div>

      {/* DID Type Selector */}
      <div className="space-y-2">
        <Label htmlFor="did-type">DID Type</Label>
        <Select value={didType} onValueChange={handleDidTypeChange}>
          <SelectTrigger id="did-type" className={errors?.did ? "border-red-500" : ""}>
            <SelectValue placeholder="Select DID type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="did:web">Website URL (did:web)</SelectItem>
            <SelectItem value="did:pkh">Smart Contract (did:pkh)</SelectItem>
          </SelectContent>
        </Select>
        {/* Show DID error even if DID type not yet selected */}
        {!didType && errors?.did && (
          <p className="text-red-500 text-sm mt-1">{errors.did}</p>
        )}
      </div>

      {/* Conditional DID Input based on type */}
      {didType === "did:web" && (
        <DidWebInput
          value={state.did || ""}
          onChange={(newDid) => updateField("did", newDid || "")}
          error={errors?.did}
        />
      )}

      {didType === "did:pkh" && (
        <div className="space-y-4">
          {/* Coming Soon Message */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg">
            <div className="flex gap-3 items-start">
              <InfoIcon size={20} className="mt-0.5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  🚧 Smart Contract DIDs - Coming Soon
                </p>
                <p className="text-yellow-800 dark:text-yellow-200 mb-3">
                  We&apos;re currently building the verification system for smart contract DIDs (did:pkh). 
                  This feature will support:
                </p>
                <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-200 ml-2">
                  <li><strong>Automated verification</strong> - Check contract owner/admin matches your wallet</li>
                  <li><strong>Delegate access</strong> - Prove ownership via deterministic token transfer</li>
                  <li><strong>Multi-chain support</strong> - Works across EVM and non-EVM chains</li>
                </ul>
                <p className="text-yellow-800 dark:text-yellow-200 mt-3">
                  For now, please use <strong>did:web</strong> (website-based DIDs) which are fully supported.
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                  Expected availability: Q4 2025
                </p>
              </div>
            </div>
          </div>

          {/* Disabled Input (for visual reference) */}
          <div className="opacity-50 pointer-events-none">
            <Caip10Input
              value=""
              onChange={() => {}}
              error={undefined}
            />
          </div>
        </div>
      )}

      {/* DID Verification - only for did:web */}
      {didType === "did:web" && state.did && (
        <div className="border-t pt-4 mt-2">
          <DidVerification
            did={state.did}
            onVerificationComplete={(verified) => {
              updateField("_verificationStatus", verified ? "ready" : "idle");
            }}
            isVerified={state._verificationStatus === "ready"}
          />
        </div>
      )}

      {/* Interface Selector */}
      <div className="border-t pt-4 mt-4">
        <InterfacesSelector
          value={state.interfaceFlags || { human: true, api: false, smartContract: false }}
          onChange={(flags) => {
            updateField("interfaceFlags", flags);
            // Clear API type if API is unchecked
            if (!flags.api) {
              updateField("apiType", null);
            }
          }}
        />
        
        {/* API Type Dropdown - Only show when API is checked */}
        {state.interfaceFlags?.api && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Label htmlFor="api-type" className="text-sm font-medium mb-2 block">
              What type of API? <span className="text-red-500">*</span>
            </Label>
            <Select
              value={state.apiType || ""}
              onValueChange={(value) => updateField("apiType", value as any)}
            >
              <SelectTrigger id="api-type" className="w-full">
                <SelectValue placeholder="Select API type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openapi">OpenAPI / REST</SelectItem>
                <SelectItem value="graphql">GraphQL</SelectItem>
                <SelectItem value="jsonrpc">JSON-RPC</SelectItem>
                <SelectItem value="mcp">MCP Server</SelectItem>
                <SelectItem value="a2a">A2A Agent</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              This will determine which fields appear in later steps and automatically add the corresponding trait (api:mcp, api:a2a, etc.)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
