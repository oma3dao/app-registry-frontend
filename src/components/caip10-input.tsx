"use client"

import React, { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  CopyIcon, 
  CheckIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
} from "lucide-react"
import { normalizeCaip10, type NormalizationResult } from "@/lib/utils/caip10/normalize"
import { buildCaip10 } from "@/lib/utils/caip10/parse"
import { NON_EVM_CAIP2 } from "@/lib/utils/caip10/chains"
import { ChainSearchInput } from "@/components/chain-search-input"

type Namespace = "eip155" | "solana" | "sui";

interface Caip10InputProps {
  value?: string;
  onChange: (caip10: string | null) => void;
  className?: string;
  error?: string;
}

export function Caip10Input({
  value = "",
  onChange,
  className = "",
  error: externalError,
}: Caip10InputProps) {
  // Primary input state
  const [inputValue, setInputValue] = useState(value);
  const [validationResult, setValidationResult] = useState<NormalizationResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [namespace, setNamespace] = useState<Namespace>("eip155");
  const [evmChainId, setEvmChainId] = useState<number | null>(null);
  const [solanaRef, setSolanaRef] = useState<string>(NON_EVM_CAIP2.solana.mainnetRef);
  const [suiRef, setSuiRef] = useState<string>(NON_EVM_CAIP2.sui.mainnetRef);
  const [accountAddress, setAccountAddress] = useState("");
  
  // Ref for auto-scroll
  const builderRef = useRef<HTMLDivElement>(null);

  // Sync inputValue with external value prop
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Auto-scroll when builder opens
  useEffect(() => {
    if (builderOpen && builderRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        builderRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }, 100);
    }
  }, [builderOpen]);

  // Validate input on change
  useEffect(() => {
    if (!inputValue.trim()) {
      setValidationResult(null);
      return;
    }

    const result = normalizeCaip10(inputValue);
    setValidationResult(result);

    // If valid, sync builder with parsed values
    if (result.valid && result.parsed) {
      const { namespace: ns, reference, address } = result.parsed;
      
      if (ns === 'eip155') {
        setNamespace('eip155');
        setEvmChainId(parseInt(reference, 10));
        setAccountAddress(address);
      } else if (ns === 'solana') {
        setNamespace('solana');
        setSolanaRef(reference);
        setAccountAddress(address);
      } else if (ns === 'sui') {
        setNamespace('sui');
        setSuiRef(reference);
        setAccountAddress(address);
      }
    }
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
  };

  const handleInputBlur = () => {
    if (validationResult?.valid && validationResult.normalized) {
      // Update to normalized form
      setInputValue(validationResult.normalized);
      onChange(validationResult.normalized);
    } else if (!validationResult?.valid && inputValue.trim()) {
      // Invalid input - notify parent
      onChange(null);
    } else if (!inputValue.trim()) {
      onChange(null);
    }
  };

  const handleBuilderApply = () => {
    let reference = "";
    
    switch (namespace) {
      case "eip155":
        if (evmChainId === null || !accountAddress) return;
        reference = evmChainId.toString();
        break;
      case "solana":
        if (!accountAddress) return;
        reference = solanaRef;
        break;
      case "sui":
        if (!accountAddress) return;
        reference = suiRef;
        break;
    }

    const built = buildCaip10(namespace, reference, accountAddress);
    setInputValue(built);
    
    // Validate and normalize
    const result = normalizeCaip10(built);
    if (result.valid && result.normalized) {
      setInputValue(result.normalized);
      onChange(result.normalized);
      setBuilderOpen(false);
    }
  };

  const handleCopy = async () => {
    if (validationResult?.valid && validationResult.normalized) {
      await navigator.clipboard.writeText(validationResult.normalized);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const showError = externalError || (validationResult && !validationResult.valid && inputValue.trim());
  const errorMessage = externalError || validationResult?.error;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Info about chain support */}
      <div className="p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
        <div className="flex gap-2 items-start text-blue-700 dark:text-blue-400 text-sm">
          <InfoIcon size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="mt-1">If you know your contract&apos;s <strong>CAIP-10 ID</strong> (e.g., <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">eip155:11155111:0xAbc...</code>) paste it here.  If not, click on &quot;CAIP-10 Builder&quot; below.</p>
          </div>
        </div>
      </div>

      {/* Primary Input */}
      <div className="grid gap-2">
        <Label htmlFor="caip10-input">CAIP-10 Account</Label>
        <div className="flex items-center gap-2">
          <Input
            id="caip10-input"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="eip155:1:0xAbc123... or paste full CAIP-10"
            className={showError ? "border-red-500" : ""}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCopy}
            disabled={!validationResult?.valid}
            title="Copy normalized CAIP-10"
          >
            {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
          </Button>
        </div>

        {/* Error Message */}
        {showError && (
          <div className="flex gap-2 items-start text-red-600 dark:text-red-400 text-sm">
            <AlertCircleIcon size={16} className="mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success + Normalized Display */}
        {validationResult?.valid && (
          <div className="flex gap-2 items-start text-green-600 dark:text-green-400 text-sm">
            <CheckIcon size={16} className="mt-0.5 flex-shrink-0" />
            <span>Valid CAIP-10 (checksummed)</span>
          </div>
        )}
      </div>

      {/* Collapsible Builder */}
      <div ref={builderRef} className="border rounded-md">
        <button
          type="button"
          onClick={() => setBuilderOpen(!builderOpen)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <span className="text-sm font-medium">CAIP-10 Builder</span>
          {builderOpen ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
        </button>

        {builderOpen && (
          <div className="p-4 border-t space-y-4">
            {/* Namespace Selector */}
            <div className="grid gap-2">
              <Label htmlFor="namespace">Namespace</Label>
              <Select value={namespace} onValueChange={(v) => setNamespace(v as Namespace)}>
                <SelectTrigger id="namespace">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eip155">eip155 (EVM chains)</SelectItem>
                  <SelectItem value="solana">solana (Solana)</SelectItem>
                  <SelectItem value="sui">sui (Sui)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* EVM Chain Search */}
            {namespace === "eip155" && (
              <div className="grid gap-2">
                <Label htmlFor="evm-chain">Chain</Label>
                <ChainSearchInput
                  value={evmChainId}
                  onChange={(chainId) => setEvmChainId(chainId)}
                  placeholder="Search mainnets by name or ID..."
                />
                <p className="text-xs text-muted-foreground">
                  Search 19 mainnets, or paste complete CAIP-10 above for testnets/other chains
                </p>
              </div>
            )}

            {/* Solana Network - Mainnet only in dropdown */}
            {namespace === "solana" && (
              <div className="grid gap-2">
                <Label htmlFor="solana-ref">Network</Label>
                <Select value={solanaRef} onValueChange={setSolanaRef}>
                  <SelectTrigger id="solana-ref">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NON_EVM_CAIP2.solana.mainnetRef}>Mainnet</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  For devnet/testnet, paste full CAIP-10 above
                </p>
              </div>
            )}

            {/* Sui Network - Mainnet only in dropdown */}
            {namespace === "sui" && (
              <div className="grid gap-2">
                <Label htmlFor="sui-ref">Network</Label>
                <Select value={suiRef} onValueChange={setSuiRef}>
                  <SelectTrigger id="sui-ref">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NON_EVM_CAIP2.sui.mainnetRef}>Mainnet</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  For testnet/devnet, paste full CAIP-10 above
                </p>
              </div>
            )}

            {/* Account Address Field */}
            <div className="grid gap-2">
              <Label htmlFor="account-address">
                {namespace === "eip155" ? "Address" : "Account"}
              </Label>
              <Input
                id="account-address"
                value={accountAddress}
                onChange={(e) => setAccountAddress(e.target.value)}
                placeholder={
                  namespace === "eip155"
                    ? "0x1234567890abcdef..."
                    : namespace === "solana"
                    ? "TokenkegQfeZyiNw..."
                    : "0x1 (will be padded to 0x000...001)"
                }
              />
              <p className="text-xs text-muted-foreground">
                {namespace === "eip155" && "Address must be 20 bytes (0x + 40 hex). We'll store checksum form."}
                {namespace === "solana" && "Must be base58-encoded 32-byte public key."}
                {namespace === "sui" && "Must be hex (0x + up to 64 chars). Short forms are left-padded."}
              </p>
            </div>

            {/* Apply Button */}
            <Button 
              type="button"
              onClick={handleBuilderApply}
              disabled={
                !accountAddress ||
                (namespace === "eip155" && evmChainId === null)
              }
              className="w-full"
            >
              Use this
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}


