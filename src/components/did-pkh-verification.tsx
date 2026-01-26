"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";

import { OnchainTransferInstructions } from "@/components/onchain-transfer-instructions";
import { isEvmDidPkh, getNamespaceFromDidPkh } from "@/lib/utils/did";

interface DidPkhVerificationProps {
  did: string;
  onVerificationComplete: (verified: boolean) => void;
  isVerified: boolean;
}

type VerificationStatus = "idle" | "discovering" | "ready-for-transfer" | "checking" | "verified" | "failed";

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

  // Check if DID is a supported EVM chain
  const isEvm = isEvmDidPkh(did);
  const namespace = getNamespaceFromDidPkh(did);

  // Auto-discover controlling wallet when DID changes
  useEffect(() => {
    if (!did || !account?.address || isVerified || !isEvm) return;

    const discoverAndCheckWallet = async () => {
      setStatus("discovering");
      setError(null);
      setControllingWallet(null);

      try {
        // Call API to discover controlling wallet
        const response = await fetch("/api/discover-controlling-wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ did }),
        });

        const data = await response.json();

        if (data.ok && data.controllingWallet) {
          const discoveredWallet = data.controllingWallet.toLowerCase();
          const connectedWallet = account.address.toLowerCase();

          setControllingWallet(data.controllingWallet);

          // Check if connected wallet is the controlling wallet
          if (discoveredWallet === connectedWallet) {
            // Auto-verify since wallets match
            await handleAutomatedVerify();
          } else {
            // Show transfer instructions
            setStatus("ready-for-transfer");
          }
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

    discoverAndCheckWallet();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [did, account?.address, isVerified]);

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

  // Show warning for non-EVM DIDs
  if (!isEvm) {
    return (
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Non-EVM Chain Detected
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              The DID uses the <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{namespace}</code> namespace, 
              which is not yet supported for direct ownership verification.
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Support for non-EVM chains (Solana, Cosmos, etc.) via key binding attestations is coming soon.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Discovering Status */}
      {status === "discovering" && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Discovering Controlling Wallet...</p>
              <p className="text-sm">
                Looking up the contract owner on-chain. This may take a few seconds.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Ready for Transfer - Show instructions */}
      {status === "ready-for-transfer" && controllingWallet && (
        <>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Ownership Verification Required</p>
                <p className="text-sm">
                  The controlling wallet (<code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{controllingWallet.slice(0, 6)}...{controllingWallet.slice(-4)}</code>) 
                  is different from your connected wallet. 
                  Send a small transfer to prove you control both wallets.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <OnchainTransferInstructions
            did={did}
            controllingWallet={controllingWallet}
            onTransferProvided={handleTransferVerify}
          />
        </>
      )}

      {/* Checking Status */}
      {status === "checking" && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Verifying Ownership...</p>
              <p className="text-sm">
                Checking ownership proof on-chain. This may take a few seconds.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Verified Status */}
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

      {/* Failed Status */}
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

      {/* Retry button when failed */}
      {status === "failed" && (
        <Button
          onClick={handleAutomatedVerify}
          variant="default"
          className="w-full"
        >
          Verify Wallet Ownership
        </Button>
      )}
    </div>
  );
}
