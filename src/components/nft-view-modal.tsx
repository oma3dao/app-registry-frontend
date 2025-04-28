"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

interface NFTViewModalProps {
  isOpen: boolean
  handleCloseViewModal: () => void
  nft: NFT | null
  onUpdateStatus: (nft: NFT, newStatus: number) => Promise<void>
}

export default function NFTViewModal({ isOpen, handleCloseViewModal, nft, onUpdateStatus }: NFTViewModalProps) {
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<number>(0)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showTxAlert, setShowTxAlert] = useState(false)
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)
  const [metadataExists, setMetadataExists] = useState(false)
  
  // Get the connected wallet address to check if user is the minter
  const account = useActiveAccount();
  const connectedAddress = account?.address?.toLowerCase();
  
  // Determine if the current user can edit the status (is the minter)
  const canEditStatus = connectedAddress && nft && 
    nft.minter.toLowerCase() === connectedAddress;
    
  // Determine if status has been changed from original
  const statusChanged = nft && selectedStatus !== nft.status;

  // Reset state when modal opens with new NFT
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCloseViewModal()
      setIsEditingStatus(false)
      setShowTxAlert(false)
    } else if (nft) {
      // Initialize with current NFT status
      setSelectedStatus(nft.status)
    }
  }
  
  // Update selected status and check for metadata when NFT changes or modal opens
  useEffect(() => {
    if (isOpen && nft) {
      setSelectedStatus(nft.status); // Update status selector
      
      // Reset metadata check state
      setIsLoadingMetadata(true);
      setMetadataExists(false);
      
      const checkMetadata = async () => {
        try {
          const versionedDid = buildVersionedDID(nft.did, nft.version);
          log(`[NFTViewModal] Checking metadata for versioned DID: ${versionedDid}`);
          const metadataJson = await getMetadata(versionedDid);
          if (metadataJson !== null) {
            log("[NFTViewModal] Metadata found.");
            setMetadataExists(true);
          } else {
            log("[NFTViewModal] Metadata not found.");
          }
        } catch (error) {
          // Error building versioned DID or other unexpected issue
          console.error("[NFTViewModal] Error checking metadata:", error);
          setMetadataExists(false); // Assume no metadata on error
        } finally {
          setIsLoadingMetadata(false);
        }
      };
      
      checkMetadata();
      
    } else {
       // Reset state if modal is closed or no NFT
       setIsLoadingMetadata(false);
       setMetadataExists(false);
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
      
      // Create updated NFT with new status
      const updatedNft: NFT = {
        ...nft,
        status: selectedStatus
      }
      
      log(`Updating ${nft.did} status from ${nft.status} to ${selectedStatus}`)
      await onUpdateStatus(updatedNft, selectedStatus)
      setIsEditingStatus(false)
      
      // Close the modal after successful update
      handleCloseViewModal()
    } catch (error) {
      console.error("Error updating status:", error)
      setShowTxAlert(false)
    } finally {
      setIsUpdating(false)
    }
  }

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
        
        {showTxAlert && (
          <TransactionAlert 
            title="Status Update Transaction" 
            description="Please approve the transaction in your wallet to update the app status."
            isMobile={isMobile()}
          />
        )}
        
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label className="text-base font-medium">Status</Label>
              
              {isEditingStatus && canEditStatus ? (
                <div className="flex items-center gap-2">
                  <Select 
                    value={selectedStatus.toString()} 
                    onValueChange={(value: string) => setSelectedStatus(parseInt(value))}
                  >
                    <SelectTrigger className="w-[180px]">
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
                  <span className={`px-2 py-1 rounded-full text-sm ${getStatusClasses(nft.status)}`}>
                    {getStatusLabel(nft.status)}
                  </span>
                  {canEditStatus && (
                    <Button 
                      variant="outline" 
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
            <Label className="text-base font-medium">DID</Label>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md break-all">
              {nft.did}
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label className="text-base font-medium">Data URL</Label>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md break-all">
              <a href={nft.dataUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {nft.dataUrl}
              </a>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label className="text-base font-medium">IWPS Portal URI</Label>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md break-all">
              <a href={nft.iwpsPortalUri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {nft.iwpsPortalUri}
              </a>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label className="text-base font-medium">Agent Portal URI</Label>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md break-all">
              <a href={nft.agentApiUri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {nft.agentApiUri}
              </a>
            </div>
          </div>
          
          {nft.contractAddress && (
            <div className="grid gap-2">
              <Label className="text-base font-medium">Contract Address</Label>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md break-all">
                {nft.contractAddress}
              </div>
            </div>
          )}
          
          <div className="grid gap-2">
            <Label className="text-base font-medium">Minter</Label>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md break-all">
              {nft.minter}
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          {/* Spacer to push buttons right, or adjust justify-content above */} 
          <div className="flex-grow"></div> 
          
          {/* Edit Metadata Button - Enabled based on metadata check */}
          <Button 
            variant="secondary" 
            onClick={() => log('Edit Metadata clicked - Placeholder')} 
            disabled={isLoadingMetadata || !metadataExists}
            className="order-first sm:order-none" 
          >
            {isLoadingMetadata ? "Checking Metadata..." : "Edit Metadata"}
          </Button>
          
          {isEditingStatus && statusChanged && canEditStatus ? (
              <Button 
                onClick={handleStatusChange}
                disabled={isUpdating}
              >
                {isUpdating ? "Saving..." : "Save changes"}
              </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={handleCloseViewModal}
              disabled={isUpdating}
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 