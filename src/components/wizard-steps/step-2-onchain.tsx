/**
 * Step 2: Onchain Data
 * Collects fields that are stored directly on-chain in the registry contract
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { StepRenderContext } from "@/lib/wizard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import { Caip10Input } from "@/components/caip10-input";
import { validateCaipAddress, validateCaip19Token } from "@/lib/validation";
import { env } from "@/config/env";
import { UrlValidator } from "@/components/url-validator";

export default function Step2_Onchain(ctx: StepRenderContext) {
  const { state, updateField, errors } = ctx;
  
  // Helper functions to match old API
  const formData = state;
  const updateFormData = useCallback((updates: Record<string, any>) => {
    Object.entries(updates).forEach(([key, value]) => {
      updateField(key, value);
    });
  }, [updateField]);
  
  // Local state for custom URL toggle and traits input
  // Initialize based on whether dataUrl is our hosted URL
  const { isOurHostedUrl } = require('@/schema/mapping');
  const [isCustomizingUrl, setIsCustomizingUrl] = useState(() => {
    // If dataUrl exists and is NOT our hosted URL, then it's custom
    return formData.dataUrl ? !isOurHostedUrl(formData.dataUrl) : false;
  });
  const [traitsInput, setTraitsInput] = useState("");
  
  // Sync traitsInput with formData.traits when navigating back to this step
  useEffect(() => {
    const currentTraits = formData.traits || [];
    console.log('[step-2] formData.traits:', currentTraits);
    const currentInput = currentTraits.join(", ");
    console.log('[step-2] traitsInput will be set to:', currentInput);
    // Only update if different to avoid cursor jumping
    if (currentInput !== traitsInput) {
      setTraitsInput(currentInput);
    }
  }, [formData.traits]);
  
  // Auto-generate dataUrl when not customizing
  useEffect(() => {
    if (!isCustomizingUrl && formData.did && formData.version) {
      const baseUrl = env.appBaseUrl;
      // Create versionedDID in the format: did:namespace:path/v/version
      const versionedDID = `${formData.did}/v/${formData.version}`;
      // Generate RESTful path-based URL (e.g., /api/data-url/did:web:example.com/v/1.0)
      // This URL is stored on-chain and used for all metadata fetching
      const generatedUrl = `${baseUrl}/api/data-url/${versionedDID}`;
      updateFormData({ dataUrl: generatedUrl });
    }
  }, [isCustomizingUrl, formData.did, formData.version, updateFormData]);

  const handleCustomUrlToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsCustomizingUrl(checked);
    
    if (checked) {
      // Clear the field when customizing
      updateFormData({ dataUrl: "" });
    } else {
      // Recreate the default URL when unchecking
      if (formData.did && formData.version) {
        const baseUrl = env.appBaseUrl;
        const versionedDID = `${formData.did}/v/${formData.version}`;
        // Generate RESTful path-based URL
        const generatedUrl = `${baseUrl}/api/data-url/${versionedDID}`;
        updateFormData({ dataUrl: generatedUrl });
      }
    }
  };

  const handleContractIdChange = (did: string | null) => {
    updateFormData({ contractId: did || undefined });
  };

  const handleFungibleTokenIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateFormData({ fungibleTokenId: value || undefined });
  };

  // Get trait suggestions based on selected interfaces
  const getTraitSuggestions = (): string => {
    const suggestions: string[] = [];
    
    // Payment trait (applies to all)
    suggestions.push("pay:x402");
    
    // API-specific traits
    if (formData.interfaceFlags?.api) {
      suggestions.push("api:mcp", "api:a2a", "api:openapi", "api:graphql", "api:jsonrpc");
    }
    
    // General traits (always show)
    suggestions.push("pay:x402", "social", "defi", "nft", "gaming");
    
    return suggestions.join(", ");
  };
  
  // Parse traits from comma or space-separated input
  const parseTraits = (input: string): string[] => {
    if (!input.trim()) return [];
    
    // Split by comma or whitespace, filter empty strings
    return input
      .split(/[,\s]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);
  };

  // Auto-manage API trait based on selected API type
  useEffect(() => {
    const currentTraits = formData.traits || [];
    const allApiTraits = ['api:openapi', 'api:graphql', 'api:jsonrpc', 'api:mcp', 'api:a2a'];
    
    // Remove all API traits first (clean slate)
    let cleanedTraits = currentTraits.filter((t: string) => !allApiTraits.includes(t));
    
    // If API interface is enabled and type is selected, add the correct trait
    if (formData.interfaceFlags?.api && formData.apiType) {
      const apiTrait = `api:${formData.apiType}`;
      
      // Check if we can add (max 20 traits)
      if (cleanedTraits.length < 20) {
        cleanedTraits.push(apiTrait);
      } else {
        // Max traits reached - show warning but don't add
        // (Warning is already shown in UI)
        return;
      }
    }
    
    // Update if changed
    if (JSON.stringify(cleanedTraits) !== JSON.stringify(currentTraits)) {
      updateFormData({ traits: cleanedTraits.length > 0 ? cleanedTraits : undefined });
    }
  }, [formData.apiType, formData.interfaceFlags?.api]);
  
  const handleTraitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTraitsInput(value);
    // Don't parse immediately - let user type commas and spaces
  };

  const handleTraitsBlur = () => {
    // Parse only when user leaves the field
    const parsed = parseTraits(traitsInput);
    updateFormData({ traits: parsed.length > 0 ? parsed : undefined });
  };

  return (
    <div className="space-y-6">
      {/* Data URL Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dataUrl" className="text-base font-semibold">
            Data URL *
          </Label>
          <p className="text-sm text-muted-foreground">
            Points to the JSON metadata for your app (off-chain data like description, images, etc.)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="customizeUrl"
            checked={isCustomizingUrl}
            onChange={handleCustomUrlToggle}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label
            htmlFor="customizeUrl"
            className="text-sm font-normal cursor-pointer"
          >
            I want to host metadata at my own URL
          </Label>
        </div>

        {isCustomizingUrl ? (
          <div className="space-y-2">
            <Input
              id="dataUrl"
              type="url"
              placeholder="https://example.com/metadata.json"
              value={formData.dataUrl || ""}
              onChange={(e) => updateFormData({ dataUrl: e.target.value })}
              className={errors?.dataUrl ? "border-red-500" : ""}
            />
            {errors?.dataUrl && (
              <p className="text-sm text-red-500">{errors.dataUrl}</p>
            )}
            <UrlValidator url={formData.dataUrl || ""} />
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Custom URL Mode:</strong> When you submit, we&apos;ll generate the off‑chain JSON preview for you to copy and host at your URL. The registry stores only the pointer.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              id="dataUrl"
              type="url"
              value={formData.dataUrl || ""}
              readOnly
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated based on your DID and version. If you switch to a custom URL, we’ll still build the JSON for you in Review.
            </p>
          </div>
        )}
      </div>

      {/* Contract ID (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="contractId" className="text-base font-semibold">
          Contract ID (Optional)
        </Label>
        <p className="text-sm text-muted-foreground">
          If your app is a smart contract, provide its address in CAIP-10 format
        </p>
        <Caip10Input
          value={formData.contractId || ""}
          onChange={handleContractIdChange}
          error={errors?.contractId}
        />
        {errors?.contractId && (
          <p className="text-sm text-red-500">{errors.contractId}</p>
        )}
      </div>

      {/* Fungible Token ID (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="fungibleTokenId" className="text-base font-semibold">
          Fungible Token ID (Optional)
        </Label>
        <p className="text-sm text-muted-foreground">
          If your app uses or represents a fungible token (ERC-20, ERC-1155), provide its ID in CAIP-19 format
        </p>
        <Input
          id="fungibleTokenId"
          type="text"
          placeholder="eip155:1/erc20:0x..."
          value={formData.fungibleTokenId || ""}
          onChange={handleFungibleTokenIdChange}
          className={errors?.fungibleTokenId ? "border-red-500" : ""}
        />
        {errors?.fungibleTokenId && (
          <p className="text-sm text-red-500">{errors.fungibleTokenId}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Format: <code className="bg-muted px-1 rounded">namespace:reference/assetNamespace:assetReference</code>
        </p>
      </div>

      {/* Traits (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="traits" className="text-base font-semibold">
          Traits (Optional)
        </Label>
        <p className="text-sm text-muted-foreground">
          Enter traits separated by commas or spaces. Each trait represents an app capability or feature. Hashes will be generated automatically during minting.
        </p>
        
        {/* Warning if max traits reached and API trait can't be auto-added */}
        {formData.interfaceFlags?.api && formData.apiType && (formData.traits?.length || 0) >= 20 && !formData.traits?.includes(`api:${formData.apiType}`) && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              <strong>Maximum traits reached (20).</strong> Remove a trait to auto-add <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">api:{formData.apiType}</code> for your selected API type.
            </p>
          </div>
        )}
        
        <Input
          id="traits"
          type="text"
          placeholder={getTraitSuggestions()}
          value={traitsInput}
          onChange={handleTraitsChange}
          onBlur={handleTraitsBlur}
        />
        
        {/* Show parsed traits */}
        {formData.traits && formData.traits.length > 0 && (
          <div className="p-3 bg-muted rounded-md space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Parsed {formData.traits.length} trait{formData.traits.length !== 1 ? 's' : ''}:
            </p>
            {formData.traits.map((trait: string, index: number) => (
              <code key={index} className="block text-xs">
                {index + 1}. {trait}
              </code>
            ))}
          </div>
        )}
        
        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-xs">
          <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Trait Suggestions:</p>
          <div className="text-blue-700 dark:text-blue-300 space-y-1">
            <p><strong>Payment:</strong> <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">pay:x402</code> (applies to all interfaces)</p>
            {formData.interfaceFlags?.api && (
              <p><strong>API:</strong> <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">api:mcp</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">api:rest</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">api:graphql</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">api:grpc</code></p>
            )}
            <p><strong>General:</strong> <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">gaming</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">social</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">defi</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">nft</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">metaverse</code></p>
            <p className="text-xs mt-2">
              <a 
                href="https://github.com/oma3dao/omatrust-docs/blob/main/specification/omatrust-specification.md#appendix-c---trait-names" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                View full trait list in specification →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}