"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

import { OnchainTransferInstructions } from "@/components/onchain-transfer-instructions";

interface DidPkhVerificationProps {
  did: string;
  onVerificationComplete: (verified: boolean) => void;
  isVerified: boolean;
}

type VerificationStatus = "idle" | "checking" | "verified" | "failed";

export function DidPkhVerification({
  did,
  onVerificationComplete,
  isVerified,
}: DidPkhVerificationProps) {
  const account = useActiveAccount();
  const [status, setStatus] = useState<VerificationStatus>(
    isVerified ? "verified" : "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [verificationMethodUsed, setVerificationMethodUsed] = useState<string | null>(null);
  const [controllingWallet, setControllingWallet] = useState<string | null>(null);

  const handleDiscoverWallet = async () => {
    setStatus("checking");
    setError(null);

    try {
      // Call API to discover controlling wallet (without verification)
      const response = await fetch("/api/discover-controlling-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ did }),
      });

      const data = await response.json();

      if (data.ok && data.controllingWallet) {
        setControllingWallet(data.controllingWallet);
        setStatus("idle"); // Back to idle, ready for transfer
      } else {
        setStatus("failed");
        setError(
          data.error ||
          "Could not discover controlling wallet. The contract may not have standard ownership functions."
        );
      }
    } catch (err) {
      setStatus("failed");
      setError(
        err instanceof Error ? err.message : "Failed to discover controlling wallet"
      );
    }
  };

  const handleAutomatedVerify = async () => {
    if (!account?.address) {
      setError("Please connect your wallet first");
      return;
    }

    setStatus("checking");
    setError(null);

    try {
      const response = await fetch("/api/verify-and-attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          did,
          connectedAddress: account.address,
          requiredSchemas: ["oma3.ownership.v1"],
        }),
      });

      const data = await response.json();

      if (data.ok && data.status === "ready") {
        setStatus("verified");
        setVerificationMethodUsed(data.debug?.verificationMethod || "contract ownership");
        onVerificationComplete(true);
      } else {
        setStatus("failed");
        setError(
          data.error ||
          "Verification failed. Your wallet must be the contract owner/admin."
        );
        onVerificationComplete(false);
      }
    } catch (err) {
      setStatus("failed");
      setError(
        err instanceof Error ? err.message : "Failed to verify contract ownership"
      );
      onVerificationComplete(false);
    }
  };

  const handleTransferVerify = async (txHash: string) => {
    if (!account?.address) {
      setError("Please connect your wallet first");
      return;
    }

    setStatus("checking");
    setError(null);

    try {
      const response = await fetch("/api/verify-and-attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          did,
          connectedAddress: account.address,
          requiredSchemas: ["oma3.ownership.v1"],
          txHash, // Include txHash for transfer verification
        }),
      });

      const data = await response.json();

      if (data.ok && data.status === "ready") {
        setStatus("verified");
        setVerificationMethodUsed("onchain transfer");
        onVerificationComplete(true);
      } else {
        setStatus("failed");
        setError(
          data.error ||
          "Transfer verification failed. Please check the transaction hash and try again."
        );
        onVerificationComplete(false);
      }
    } catch (err) {
      setStatus("failed");
      setError(
        err instanceof Error ? err.message : "Failed to verify transfer"
      );
      onVerificationComplete(false);
    }
  };

  if (!account?.address) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please connect your wallet to verify contract ownership.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Verification Status */}
      {status === "idle" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Contract Ownership Verification Required</p>
              <p className="text-sm">
                You have two options to verify ownership:
              </p>
              <ul className="text-sm list-disc list-inside ml-2 space-y-2">
                <li>
                  <strong>Option 1 (Recommended):</strong> Send a small transfer from the controlling wallet to prove ownership.
                  Safer - doesn&apos;t require connecting your admin wallet. Click "Discover Controlling Wallet" to start.
                </li>
                <li>
                  <strong>Option 2:</strong> If your connected wallet is the contract owner/admin, 
                  click "Verify Wallet Ownership" to verify automatically.
                </li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {status === "checking" && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Verifying Contract Ownership...</p>
              <p className="text-sm">
                Checking contract ownership patterns on-chain. This may take a few seconds.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {status === "verified" && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-green-900 dark:text-green-100">
                ✅ Contract Ownership Verified
              </p>
              <p className="text-sm text-green-800 dark:text-green-200">
                Your wallet is confirmed as the contract owner/admin.
              </p>
              {verificationMethodUsed && (
                <p className="text-xs text-green-700 dark:text-green-300">
                  Verified via: {verificationMethodUsed}
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {status === "failed" && (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-red-900 dark:text-red-100">
                ❌ Verification Failed
              </p>
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                Make sure:
              </p>
              <ul className="text-xs text-red-700 dark:text-red-300 list-disc list-inside ml-2">
                <li>Your wallet is the contract owner or admin</li>
                <li>The contract has owner(), admin(), or getOwner() function</li>
                <li>Or the contract uses EIP-1967 proxy pattern</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Verification Buttons */}
      {(status === "idle" || status === "failed") && (
        <div className="space-y-3">
          <Button
            onClick={handleDiscoverWallet}
            variant="outline"
            className="w-full"
          >
            Discover Controlling Wallet
          </Button>
          
          <Button
            onClick={handleAutomatedVerify}
            variant="default"
            className="w-full"
          >
            Verify Wallet Ownership
          </Button>
        </div>
      )}
      
      {/* Show transfer instructions after discovering wallet */}
      {controllingWallet && (status === "idle" || status === "failed") && (
        <div className="border-t pt-4 mt-4">
          <OnchainTransferInstructions
            did={did}
            controllingWallet={controllingWallet}
            onTransferProvided={handleTransferVerify}
          />
        </div>
      )}
    </div>
  );
}
