"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle, ExternalLink, Info } from "lucide-react";
import {
  calculateTransferAmount,
  formatTransferAmount,
  getRecipientAddress,
  getChainIdFromDid,
  getExplorerAddressUrl,
  getExplorerTxUrl,
} from "@/lib/verification/onchain-transfer";

interface OnchainTransferInstructionsProps {
  did: string;
  controllingWallet: string;
  onTransferProvided: (txHash: string) => void;
}

export function OnchainTransferInstructions({
  did,
  controllingWallet,
  onTransferProvided,
}: OnchainTransferInstructionsProps) {
  const account = useActiveAccount();
  const mintingWallet = account?.address;

  const [transferAmount, setTransferAmount] = useState<bigint | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    if (!mintingWallet) return;

    const extractedChainId = getChainIdFromDid(did);
    if (!extractedChainId) return;

    setChainId(extractedChainId);

    // Calculate the exact amount
    const amount = calculateTransferAmount(did, mintingWallet, extractedChainId);
    setTransferAmount(amount);
  }, [did, mintingWallet]);

  if (!mintingWallet || !transferAmount || !chainId) {
    return null;
  }

  const recipient = getRecipientAddress(chainId, mintingWallet);
  const { formatted, symbol, wei } = formatTransferAmount(transferAmount, chainId);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = () => {
    if (txHash.trim()) {
      onTransferProvided(txHash.trim());
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Instructions */}
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                Delegate Access Verification
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                To prove you control both wallets without exposing your admin wallet,
                send the exact amount below from your controlling wallet to your minting wallet.
              </p>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                ✅ Safer than connecting admin wallet directly  
                ✅ Clear signing - you see exactly what you&apos;re sending  
                ✅ Creates public proof of ownership
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Transfer Details */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border space-y-4">
        {/* From Address */}
        <div>
          <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            From (Controlling Wallet)
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded flex-1 font-mono">
              {controllingWallet}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(controllingWallet, "from")}
            >
              {copied === "from" ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                window.open(getExplorerAddressUrl(chainId, controllingWallet), "_blank")
              }
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* To Address */}
        <div>
          <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            To (Minting Wallet)
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded flex-1 font-mono">
              {recipient}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(recipient, "to")}
            >
              {copied === "to" ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Exact Amount (CRITICAL - Must be exact!)
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-lg font-bold bg-yellow-100 dark:bg-yellow-900 px-3 py-2 rounded flex-1 font-mono">
              {formatted} {symbol}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(formatted, "amount")}
            >
              {copied === "amount" ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Wei: {wei}
          </p>
        </div>
      </div>

      {/* Warning */}
      <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
        <AlertDescription>
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            ⚠️ Important:
          </p>
          <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
            <li>Send the <strong>exact amount</strong> shown above (including all decimals)</li>
            <li>Send from the <strong>controlling wallet</strong> ({controllingWallet.slice(0, 6)}...)</li>
            <li>Send to the <strong>minting wallet</strong> ({recipient.slice(0, 6)}...)</li>
            <li>Wait for transaction confirmation before continuing</li>
            <li>This creates a public, verifiable link between the two wallets</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Transaction Hash Input */}
      <div className="space-y-2">
        <Label htmlFor="txHash">
          Transaction Hash <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-2">
          <Input
            id="txHash"
            placeholder="0x..."
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            className="font-mono text-sm"
          />
          {txHash && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                window.open(getExplorerTxUrl(chainId, txHash), "_blank")
              }
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          After sending the transfer, paste the transaction hash here to verify
        </p>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!txHash.trim()}
        className="w-full"
      >
        Verify Transfer
      </Button>

      {/* Help Text */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <p className="font-medium">How to send the transfer:</p>
        <ol className="list-decimal list-inside ml-2 space-y-1">
          <li>Open your wallet (MetaMask, etc.) with the controlling wallet</li>
          <li>Send a transaction with the exact amount shown above</li>
          <li>To the minting wallet address</li>
          <li>Wait for confirmation (usually 1-2 minutes)</li>
          <li>Copy the transaction hash and paste it above</li>
        </ol>
      </div>
    </div>
  );
}