"use client"

import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckIcon, AlertCircleIcon, InfoIcon } from "lucide-react"
import { normalizeDomain } from "@/lib/utils/did"

interface DidWebInputProps {
  value?: string;
  onChange: (did: string | null) => void;
  className?: string;
  error?: string;
}

/**
 * Simple input for did:web identifiers
 * Shows "did:web:" prefix, user just enters domain
 */
export function DidWebInput({
  value = "",
  onChange,
  className = "",
  error: externalError,
}: DidWebInputProps) {
  const [domain, setDomain] = useState("");
  const [internalError, setInternalError] = useState<string | null>(null);

  // Parse existing DID on mount
  useEffect(() => {
    if (value && value.startsWith("did:web:")) {
      setDomain(value.replace("did:web:", ""));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDomain = e.target.value;
    setDomain(newDomain);
    setInternalError(null);
  };

  const handleBlur = () => {
    if (!domain.trim()) {
      onChange(null);
      return;
    }

    // Basic domain validation
    const normalized = normalizeDomain(domain);
    
    // Basic domain regex
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    
    if (!domainRegex.test(normalized)) {
      setInternalError("Invalid domain format");
      onChange(null);
      return;
    }

    const did = `did:web:${normalized}`;
    onChange(did);
  };

  const completeDid = domain ? `did:web:${normalizeDomain(domain)}` : "";
  const showError = externalError || internalError;
  const errorMessage = externalError || internalError;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid gap-2">
        <Label htmlFor="did-web-domain">Domain</Label>
        <div className="flex items-center border rounded-md">
          <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-r select-none">
            did:web:
          </span>
          <Input
            id="did-web-domain"
            value={domain}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="example.com"
            className={`border-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${showError ? "border-red-500" : ""}`}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Enter your domain (e.g., example.com or app.example.com)
        </p>

        {/* Error */}
        {showError && (
          <div className="flex gap-2 items-start text-red-600 dark:text-red-400 text-sm">
            <AlertCircleIcon size={16} className="mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success */}
        {!showError && domain && (
          <div className="flex gap-2 items-start text-green-600 dark:text-green-400 text-sm">
            <CheckIcon size={16} className="mt-0.5 flex-shrink-0" />
            <span>Valid domain format</span>
          </div>
        )}
      </div>

      {/* Complete DID Preview */}
      {completeDid && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex gap-2 items-start">
            <InfoIcon size={16} className="mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                Complete DID:
              </p>
              <code className="text-xs text-blue-700 dark:text-blue-300 break-all block font-mono">
                {completeDid}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

