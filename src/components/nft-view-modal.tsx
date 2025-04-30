"use client"

import React from 'react';
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { NFT } from "@/types/nft"
import { APP_STATUSES, getStatusLabel, getStatusClasses } from "@/types/nft"
import { useActiveAccount } from "thirdweb/react"
import { TransactionAlert } from "@/components/ui/transaction-alert"
import { isMobile, buildVersionedDID } from "@/lib/utils"
import { log } from "@/lib/log"
import { getMetadata } from "@/contracts/appMetadata"
import { AlertCircleIcon } from 'lucide-react';
import { toast } from "sonner"
import { METADATA_EDIT_ELIGIBLE_BASE_URLS } from "@/config/app-config";

interface NFTViewModalProps {
  isOpen: boolean
  handleCloseViewModal: () => void
  nft: NFT | null
  onUpdateStatus: (nft: NFT, newStatus: number) => Promise<void>
  onEditMetadata?: (metadata: Record<string, any>, nft: NFT) => void
}

export default function NFTViewModal({ isOpen, handleCloseViewModal, nft, onUpdateStatus, onEditMetadata }: NFTViewModalProps) {
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<number>(0)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showTxAlert, setShowTxAlert] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [metadataExists, setMetadataExists] = useState(false)
  
  // Get the connected wallet address to check if user is the minter
  const account = useActiveAccount();
  const connectedAddress = account?.address?.toLowerCase();
  
  // Determine if the current user can edit the status (is the minter)
  const canEditStatus = connectedAddress && nft && 
    nft.minter.toLowerCase() === connectedAddress;
    
  // Determine if status has been changed from original
  const statusChanged = nft && selectedStatus !== nft.status;

  // Check if the dataUrl base URL matches the eligible ones for editing metadata
  const canEditMetadata = nft && METADATA_EDIT_ELIGIBLE_BASE_URLS.some(baseUrl => {
    const isMatch = nft.dataUrl.includes(baseUrl);
    log(`[NFTViewModal] Checking dataUrl: ${nft.dataUrl}, Base URL: ${baseUrl}, Match: ${isMatch}`);
    return isMatch;
  });

  // Reset state when modal opens with new NFT
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCloseViewModal()
      setIsEditingStatus(false)
      setShowTxAlert(false)
      setTxError(null)
    } else if (nft) {
      setSelectedStatus(nft.status)
      setShowTxAlert(false)
      setTxError(null)
    } else {
       // Reset state if modal is closed or no NFT
       // setIsLoadingMetadata(false); // These might not be needed if checkMetadata is elsewhere or not used
       // setMetadataExists(false);
    }
  }
  
  const checkMetadata = async () => {
    log('checkMetadata called');
    if (!nft) return null;
    try {
      const versionedDid = buildVersionedDID(nft.did, nft.version);
      log(`[NFTViewModal] Checking metadata for versioned DID: ${versionedDid}`);
      const metadataJson = await getMetadata(versionedDid);
      if (metadataJson !== null) {
        log("[NFTViewModal] Metadata found.");
        setMetadataExists(true);
        return metadataJson;
      } else {
        log("[NFTViewModal] Metadata not found.");
        setMetadataExists(false);
        return null;
      }
    } catch (error) {
      console.error("[NFTViewModal] Error checking metadata:", error);
      setMetadataExists(false);
      return null;
    }
  };

  useEffect(() => {
    if (isOpen && nft) {
      setSelectedStatus(nft.status); // Update status selector
    } else {
       // Reset state if modal is closed or no NFT
    }
  }, [nft, isOpen]); // Rerun when modal opens or NFT changes

  const handleStatusChange = async () => {
    if (!nft || !canEditStatus || !statusChanged) return
    
    try {
      // Validate status before updating
      if (typeof selectedStatus !== 'number' || selectedStatus < 0 || selectedStatus > 2) {
        console.error(`Invalid status value: ${selectedStatus}. Status must be 0 (Active), 1 (Deprecated), or 2 (Replaced).`);
        return;
      }
      
      setIsUpdating(true)
      setShowTxAlert(true)
      setTxError(null)
      
      // Create updated NFT with new status
      const updatedNft: NFT = {
        ...nft,
        status: selectedStatus
      }
      
      log(`Updating ${nft.did} status from ${nft.status} to ${selectedStatus}`)
      await onUpdateStatus(updatedNft, selectedStatus)
      setIsEditingStatus(false)
      setShowTxAlert(false)
      
      // Show success toast before closing
      toast.success("Status updated successfully!")
      
      // Close the modal after successful update
      handleCloseViewModal()
    } catch (error) {
      // Use log() instead of console.error for transaction errors
      log("Error updating status:", error)
      setShowTxAlert(false) // Hide pending alert
      
      // Extract and set error message for display
      let errorMessage = "Failed to update status";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      setTxError(errorMessage);
      
    } finally {
      setIsUpdating(false)
    }
  }

  // Log the conditions for enabling the Edit Metadata button
  log(`[NFTViewModal] metadataExists: ${metadataExists}, canEditMetadata: ${canEditMetadata}`);

  const buttonStyle = "bg-black text-white hover:bg-black/90";

  const handleEditMetadata = async () => {
    log('handleEditMetadata called');
    const metadata = await checkMetadata();
    // Convert metadata to an object if it's not already one
    const metadataObject = (typeof metadata === 'object' && metadata !== null) ? metadata : {};

    // Call the parent component's onEditMetadata function if provided
    if (onEditMetadata && nft) {
      onEditMetadata(metadataObject, nft);
    } else {
      log('onEditMetadata prop not provided or nft is null');
      handleCloseViewModal();
    }
  };

  if (!nft) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{nft.name}</DialogTitle>
          <DialogDescription className="text-md flex items-center gap-2">
            <span>Version: {nft.version}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusClasses(nft.status)}`}>
              {getStatusLabel(nft.status)}
            </span>
          </DialogDescription>
        </DialogHeader>
        
        {/* Pending Transaction Alert */}
        {showTxAlert && (
          <TransactionAlert 
            title="Status Update Transaction" 
            description="Please approve the transaction in your wallet to update the app status."
            isMobile={isMobile()}
          />
        )}
        
        {/* Error Display Box */}
        {txError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex gap-2 items-start text-red-700 dark:text-red-400">
              <AlertCircleIcon size={18} className="mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-1">Status Update Error</p>
                <p>{txError}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="status-select" id="status-label" className="text-base font-medium">Status</Label>
              
              {isEditingStatus && canEditStatus ? (
                <div className="flex items-center gap-2">
                  <Select 
                    value={selectedStatus.toString()} 
                    onValueChange={(value: string) => setSelectedStatus(parseInt(value))}
                  >
                    <SelectTrigger id="status-select" className="w-[180px]" aria-labelledby="status-label">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {APP_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value.toString()}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditingStatus(false)}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span id="status" className={`px-2 py-1 rounded-full text-sm ${getStatusClasses(nft.status)}`}>
                    {getStatusLabel(nft.status)}
                  </span>
                  {canEditStatus && (
                    <Button 
                      className={buttonStyle} 
                      size="sm" 
                      onClick={() => setIsEditingStatus(true)}
                    >
                      Change
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="did-display" className="text-base font-medium">DID</Label>
            <div id="did-display" className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md break-all">
              {nft.did}
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="data-url-display" className="text-base font-medium">Data URL</Label>
            <div id="data-url-display" className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md break-all">
              <a href={nft.dataUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {nft.dataUrl}
              </a>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="iwps-portal-display" className="text-base font-medium">IWPS Portal URI</Label>
            <div id="iwps-portal-display" className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md break-all">
              <a href={nft.iwpsPortalUri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {nft.iwpsPortalUri}
              </a>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="agent-portal-display" className="text-base font-medium">Agent Portal URI</Label>
            <div id="agent-portal-display" className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md break-all">
              <a href={nft.agentApiUri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {nft.agentApiUri}
              </a>
            </div>
          </div>
          
          {nft.contractAddress && (
            <div className="grid gap-2">
              <Label htmlFor="contract-address-display" className="text-base font-medium">Contract Address</Label>
              <div id="contract-address-display" className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md break-all">
                {nft.contractAddress}
              </div>
            </div>
          )}
          
          <div className="grid gap-2">
            <Label htmlFor="minter-display" className="text-base font-medium">Minter</Label>
            <div id="minter-display" className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md break-all">
              {nft.minter}
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          {/* Spacer to push buttons right, or adjust justify-content above */} 
          <div className="flex-grow"></div> 
          
          {/* Edit Metadata Button - Enabled based on metadata check */}
          <Button 
            className={`${buttonStyle} order-first sm:order-none`} 
            onClick={handleEditMetadata} 
            disabled={!canEditMetadata}
          >
            Edit Metadata
          </Button>
          
          {isEditingStatus && statusChanged && canEditStatus ? (
              <Button 
                onClick={handleStatusChange}
                disabled={isUpdating}
              >
                {isUpdating ? "Saving..." : "Save changes"}
              </Button>
          ) : (
            <DialogClose asChild>
              <Button 
                variant="outline" 
                disabled={isUpdating}
              >
                Close
              </Button>
            </DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 