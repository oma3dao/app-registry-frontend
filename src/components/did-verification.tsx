"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  InfoIcon,
  Loader2Icon
} from "lucide-react"
import { useActiveAccount } from "thirdweb/react"
import { normalizeDidWeb } from "@/lib/utils/did"
import { env } from "@/config/env"

interface DidVerificationProps {
  did: string;
  onVerificationComplete: (success: boolean) => void;
  isVerified: boolean;
}

export function DidVerification({ did, onVerificationComplete, isVerified }: DidVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const account = useActiveAccount();

  const handleVerify = async () => {
    console.log("[DidVerification] Starting verification...");

    if (!account) {
      console.log("[DidVerification] No account connected");
      setVerificationError("Please connect your wallet first");
      return;
    }

    if (!did || did.trim() === "") {
      console.log("[DidVerification] No DID provided");
      setVerificationError("Please enter a DID first");
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    // Normalize the DID (declare outside try so it's available in catch)
    const normalizedDid = did.startsWith("did:") ? did : normalizeDidWeb(did);

    try {
      console.log("[DidVerification] Normalized DID:", normalizedDid);
      console.log("[DidVerification] Connected address:", account.address);

      // Call unified verify-and-attest endpoint
      const response = await fetch("/api/verify-and-attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          did: normalizedDid,
          connectedAddress: account.address,
          requiredSchemas: ["oma3.ownership.v1"],
        }),
      });

      const result = await response.json();
      console.log("[DidVerification] API response:", result);

      if (response.ok && result.ok && result.status === 'ready') {
        console.log("[DidVerification] ✅ Verification successful!");
        if (result.txHashes) {
          console.log("[DidVerification] Transaction hashes:", result.txHashes);
        }
        onVerificationComplete(true);
      } else {
        // Log full error response to console for debugging
        console.error("[DidVerification] ❌ Verification failed - Full response:", result);

        // If there are error details, parse and log them
        if (result.details && Array.isArray(result.details)) {
          result.details.forEach((detail: any) => {
            console.error(`[DidVerification] 🔴 Error for schema "${detail.schema}":`, detail.error);

            // Try to parse the error string as JSON for better display
            try {
              const parsedError = JSON.parse(detail.error);
              console.error("[DidVerification] 📋 Parsed error object:", parsedError);
            } catch {
              // If not JSON, it's already a readable string
            }

            if (detail.diagnostics) {
              console.error("[DidVerification] 📊 Diagnostics:", detail.diagnostics);
            }
          });
        }

        // Show simple user-friendly message in UI
        const userMessage = result.error || "Verification failed. Check the console for details.";
        throw new Error(userMessage);
      }
    } catch (error: any) {
      console.error("[DidVerification] ❌ Verification failed:", error);

      // Show simple error message in UI
      const userMessage = error.message || "Verification failed. Check the console for details.";
      setVerificationError(userMessage);
      onVerificationComplete(false);
    } finally {
      setIsVerifying(false);
      console.log("[DidVerification] Verification complete");
    }
  };

  const renderInstructions = () => {
    // Extract domain from DID for display
    const domain = did.replace("did:web:", "").split("/")[0] || "yourdomain.com";

    // Get connected wallet address and active chain ID
    const walletAddress = account?.address || "0xYOUR_ADDRESS";
    const chainId = env.activeChain.chainId;

    // Format CAIP-10 identifier
    const caip10 = `eip155:${chainId}:${walletAddress}`;

    return (
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
        <div className="flex gap-2 items-start">
          <InfoIcon size={18} className="mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-2">Website DID (did:web) Requirements:</p>
            <p className="mb-2">To prove ownership of a website DID, you must use ONE of these methods:</p>

            <div className="ml-4 mb-3">
              <p className="font-medium mt-2">Method 1: DID Document</p>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>Host a DID document at: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">https://{domain}/.well-known/did.json</code></li>
                <li>Include your wallet address in the <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">verificationMethod</code> field</li>
                <li>Format: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs break-all">blockchainAccountId: &quot;{caip10}&quot;</code></li>
              </ul>

              <p className="font-medium mt-3">Method 2: DNS TXT Record</p>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>Add a TXT record at: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">_omatrust.{domain}</code></li>
                <li>Name: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs break-all">_omatrust</code></li>
                <li>Value: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs break-all">v=1;caip10={caip10}</code></li>
                <li className="text-xs text-gray-600 dark:text-gray-400">Note: Use semicolon (;) as separator. Spaces also supported but not recommended.</li>
                {!account && <li className="text-amber-600 dark:text-amber-400">⚠️ Connect your wallet to see your exact values</li>}
              </ul>
            </div>

            <a
              href="https://docs.oma3.org/registration-guide#did-web-verification"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium mt-2"
            >
              View detailed instructions
              <ExternalLinkIcon size={14} />
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderInstructions()}

      <div className="flex flex-col gap-3 pt-2">
        <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
          <div className="flex gap-2 items-start text-amber-700 dark:text-amber-400">
            <AlertCircleIcon size={18} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">⏱️ Important: DNS/Setup Propagation</p>
              <p className="mt-1">
                After setting up your DID document or DNS TXT record, <strong>wait at least 15 minutes</strong> before
                clicking the verification button. This allows DNS changes to propagate globally and ensures the
                verification server can see your settings.
              </p>
              <p className="mt-2">
                <strong>Before verifying:</strong>
              </p>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>Complete all setup steps above</li>
                <li>Double-check your wallet address matches exactly</li>
                <li>Wait 15+ minutes after making changes</li>
                <li>The verification will request a wallet signature to prove ownership</li>
              </ul>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleVerify}
          disabled={isVerifying || !account || isVerified}
          className="w-full"
          variant={isVerified ? "outline" : "default"}
        >
          {isVerifying ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : isVerified ? (
            <>
              <CheckCircleIcon className="mr-2 h-4 w-4" />
              Verified
            </>
          ) : (
            "Verify DID Ownership"
          )}
        </Button>

        {verificationError && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex gap-2 items-start text-red-700 dark:text-red-400">
              <AlertCircleIcon size={18} className="mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Verification Failed</p>
                <p className="mt-1">{verificationError}</p>
                <p className="mt-2 text-xs opacity-75">
                  💡 Open your browser's JavaScript console (F12) for detailed error information.
                </p>
              </div>
            </div>
          </div>
        )}

        {isVerified && (
          <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex gap-2 items-start text-green-700 dark:text-green-400">
              <CheckCircleIcon size={18} className="mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">DID Ownership Verified!</p>
                <p className="mt-1">Your attestation has been recorded. You can now proceed to the next step.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

