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
        <Caip10Input
          value={state.did?.startsWith("did:pkh:") ? state.did.replace("did:pkh:", "") : ""}
          onChange={(caip10) => {
            const newDid = caip10 ? `did:pkh:${caip10}` : "";
            updateField("did", newDid);
          }}
          error={errors?.did}
        />
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

      {/* did:pkh ownership info */}
      {didType === "did:pkh" && state.did && (
        <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md mt-4">
          <div className="flex gap-2 items-start text-blue-700 dark:text-blue-400">
            <InfoIcon size={18} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Smart Contract DIDs</p>
              <p className="mt-1">
                Smart contract DIDs (did:pkh) require verification of contract ownership.
                We will check the contract admin/owner wallet matches your connected wallet.
              </p>
            </div>
          </div>
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
