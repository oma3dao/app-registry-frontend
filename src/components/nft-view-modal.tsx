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
import type { NFT } from "@/schema/data-model"
import { APP_STATUSES, getStatusLabel, getStatusClasses } from "@/schema/data-model"
import { useActiveAccount } from "thirdweb/react"
import { TransactionAlert } from "@/components/ui/transaction-alert"
import { isMobile, buildVersionedDID } from "@/lib/utils"
import { log } from "@/lib/log"
import { useMetadata } from "@/lib/contracts"
import { AlertCircleIcon, Image as ImageIcon, ExternalLinkIcon, RocketIcon, CheckCircle2, XCircle, Loader2, Shield } from 'lucide-react';
import { toast } from "sonner"
import * as AppConfig from "@/config/app-config";
import { useNFTMetadata } from "@/lib/nft-metadata-context";
import { buildIwpsProxyRequest } from "@/lib/iwps";
import LaunchConfirmationDialog from '@/components/launch-confirmation-dialog';
import { ethers } from "ethers";
import { env } from "@/config/env";

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
  const [isLoadingDescription, setIsLoadingDescription] = useState(false)
  const [showLaunchConfirmation, setShowLaunchConfirmation] = useState(false);
  const [attestationStatus, setAttestationStatus] = useState<{
    checking: boolean;
    hasAttestation: boolean;
    message?: string;
  }>({ checking: false, hasAttestation: false });
  
  // Use metadata hook
  const versionedDid = nft ? buildVersionedDID(nft.did, nft.version) : undefined;
  const { data: contractMetadata, isLoading: isLoadingContractMetadata } = useMetadata(versionedDid);
  const [launchData, setLaunchData] = useState<{
    appName: string;
    destinationUrl?: string | null;
    downloadUrl?: string | null;
    location?: string | null;
    teleportPin?: string | null;
  } | null>(null);
  
  // Use the metadata context to get complete metadata
  const { getNFTMetadata, fetchNFTDescription } = useNFTMetadata();
  const nftMetadata = nft ? getNFTMetadata(nft) : null;
  
  // Check for attestation when modal opens (separate from hash verification)
  useEffect(() => {
    if (!isOpen || !nft?.did) {
      setAttestationStatus({ checking: false, hasAttestation: false });
      return;
    }
    
    const checkAttestation = async () => {
      try {
        setAttestationStatus({ checking: true, hasAttestation: false, message: 'Checking attestation...' });
        
        // Check if resolver is configured
        if (env.resolverAddress === ethers.ZeroAddress) {
          setAttestationStatus({ checking: false, hasAttestation: false, message: 'Resolver not configured' });
          return;
        }
        
        // Get app data from registry to get dataHash
        const { getAppByDid } = await import('@/lib/contracts/registry.read');
        const appData = await getAppByDid(nft.did);
        
        if (!appData) {
          setAttestationStatus({ checking: false, hasAttestation: false });
          return;
        }
        
        // Query resolver contract for attestation
        const { getResolverContract } = await import('@/lib/contracts/client');
        const { readContract } = await import('thirdweb');
        
        const resolver = getResolverContract();
        const didHash = ethers.id(nft.did) as `0x${string}`;
        
        const hasAttestation = await readContract({
          contract: resolver,
          method: 'function checkDataHashAttestation(bytes32 didHash, bytes32 dataHash) view returns (bool)',
          params: [didHash, appData.dataHash as `0x${string}`]
        }) as boolean;
        
        setAttestationStatus({ 
          checking: false, 
          hasAttestation,
          message: hasAttestation ? 'Data hash attested by trusted oracle' : 'No attestation found'
        });
      } catch (error) {
        console.error('[NFTViewModal] Attestation check error:', error);
        setAttestationStatus({ 
          checking: false, 
          hasAttestation: false,
          message: 'Attestation check failed'
        });
      }
    };
    
    checkAttestation();
  }, [isOpen, nft?.did]);
  
  // Extract metadata values with fallbacks
  const image = nftMetadata?.displayData.image || nft?.image || "";
  const external_url = nftMetadata?.displayData.external_url || nft?.external_url || "";
  const description = nftMetadata?.displayData.description || nft?.description || "";
  const screenshotUrls = nftMetadata?.displayData.screenshotUrls || [];
  const platforms = nftMetadata?.displayData.platforms || {};
  const isLoading = nftMetadata?.isLoading || false;
  
  // Get the connected wallet address to check if user is the minter
  const account = useActiveAccount();
  const connectedAddress = account?.address?.toLowerCase();
  
  // Determine if the current user can edit the status (is the minter)
  // Default to false when no account or nft data is available
  const isOwner = Boolean(connectedAddress && nft && 
    nft.minter.toLowerCase() === connectedAddress);
    
  // Determine if status has been changed from original
  const statusChanged = nft && selectedStatus !== nft.status;

  // Owner can edit metadata
  const canEditMetadata = nft && isOwner;

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
    }
  }
  
  // Update metadata exists when contract metadata changes
  useEffect(() => {
    if (contractMetadata !== null) {
      log("[NFTViewModal] Metadata found.");
      setMetadataExists(true);
    } else if (contractMetadata === null && !isLoadingContractMetadata) {
      log("[NFTViewModal] Metadata not found.");
      setMetadataExists(false);
    }
  }, [contractMetadata, isLoadingContractMetadata]);

  useEffect(() => {
    if (isOpen && nft) {
      setSelectedStatus(nft.status); // Update status selector
    }
  }, [nft, isOpen]); // Rerun when modal opens or NFT changes

  // Description is now directly available in the metadata
  useEffect(() => {
    // No need to fetch description separately since it's part of the main metadata
    setIsLoadingDescription(false);
  }, [isOpen, nft, nftMetadata]);

  const handleStatusChange = async () => {
    if (!nft || !isOwner || !statusChanged) return
    
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

  const handleEditMetadata = () => {
    log('handleEditMetadata called');
    
    // Use the NFT object directly - it now has all metadata hydrated
    // No need to fetch from contractMetadata or metadata context
    if (onEditMetadata && nft) {
      console.log('[nft-view-modal] Passing NFT to edit:', nft);
      console.log('[nft-view-modal] NFT.traits:', nft.traits);
      console.log('[nft-view-modal] NFT.summary:', nft.summary);
      // Pass the NFT as both metadata and nft (for backwards compatibility)
      onEditMetadata(nft, nft);
    } else {
      log('onEditMetadata prop not provided or nft is null');
      handleCloseViewModal();
    }
  };

  // New handler function for the Launch button
  const handleLaunch = async () => {
    if (!nft) return;
    log("Launch clicked for:", nft.did, nft.version);
    toast.info("Initiating launch sequence..."); 

    // Get target URL from NFT data
    const targetUrl = nft.dataUrl;
    if (!targetUrl) {
      console.error("Cannot launch: Missing data URL on NFT data.");
      toast.error("Cannot launch: Application is missing required configuration.");
      return;
    }

    const { requestBody, generatedPin: _teleportPin } = buildIwpsProxyRequest(nft);

    log("Body for Proxy (from iwps.ts):", JSON.stringify(requestBody, null, 2));
    log("Generated PIN (from iwps.ts):", _teleportPin);

    try {
      const response = await fetch('/api/iwps-query-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody), 
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) { /* Ignore */ }
        const errorMessage = errorData?.error || `Proxy request failed with status: ${response.status}`;
        console.error("Error from proxy:", errorMessage);
        toast.error(`Launch Error: ${errorMessage}`);
        return;
      }

      const proxyResponse = await response.json();
      log("Response from Proxy:", proxyResponse);

      const {
        [AppConfig.IWPS_APPROVAL_KEY]: approval,
        [AppConfig.IWPS_LOCATION_KEY]: location,
        [AppConfig.IWPS_DESTINATION_URL_KEY]: destinationUrl,
        [AppConfig.IWPS_DOWNLOAD_URL_KEY]: downloadUrl,
        [AppConfig.IWPS_ERROR_KEY]: error,
        // [AppConfig.IWPS_UPDATED_PORTAL_URL_KEY]: portalUrl, // Not yet handled
        // [AppConfig.IWPS_EXPIRATION_KEY]: expiration, // Not yet handled
      } = proxyResponse;

      log("Extracted from proxy response:", { approval, location, destinationUrl, downloadUrl, error });
      
      if (approval === false) {
        toast.error(`Launch Denied: ${error || 'No reason provided.'}`);
        return;
      }
      
      // If approved, set data and show confirmation dialog
      setLaunchData({
        appName: nft.name || "Application",
        destinationUrl: destinationUrl as string | null,
        downloadUrl: downloadUrl as string | null,
        location: location as string | null,
        teleportPin: _teleportPin, // The PIN generated before the proxy call
      });
      setShowLaunchConfirmation(true);

    } catch (error) {
      console.error("Failed to call IWPS proxy:", error);
      toast.error("Launch failed: Could not connect to the launch service.");
      if (error instanceof Error) {
        console.error("Detailed error:", error.message);
      }
    }
  };

  if (!nft) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 border-b pb-4">
            <div className="flex justify-between items-end gap-4">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden border">
                  {!isLoading && image ? (
                    <img src={image} alt={`${nft.name || 'App'} icon`} className="w-full h-full object-contain" />
                  ) : <ImageIcon className="w-10 h-10 text-muted-foreground" />}
                </div>
                <div className="flex-grow">
                  <DialogTitle className="text-2xl mb-1">{nftMetadata?.displayData.name || nft.name || 'Unnamed App'}</DialogTitle>
                  <div className="text-md flex flex-col gap-2 text-muted-foreground">
                    <span>Version: {nft.version}</span>
                    {/* Interfaces */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">Interfaces:</span>
                      {!!(nft.interfaces & 1) && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs">Human</span>}
                      {!!(nft.interfaces & 2) && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">API</span>}
                      {!!(nft.interfaces & 4) && <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs">Contract</span>}
                    </div>
                    {isOwner && (
                      <span className={`px-2 py-0.5 rounded-full text-xs w-fit ${getStatusClasses(nft.status)}`}>
                        {getStatusLabel(nft.status)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleLaunch} 
                className={`${buttonStyle} flex-shrink-0`} 
              >
                <RocketIcon className="mr-2 h-5 w-5" /> Launch
              </Button>
            </div>
          </DialogHeader>
          
          {/* Alerts - keep outside scrolling area */}
          {showTxAlert && (
            <TransactionAlert 
              title="Status Update Transaction" 
              description="Please approve the transaction in your wallet to update the app status."
              isMobile={isMobile()}
            />
          )}
          
          {/* Error Display Box */}
          {txError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md flex-shrink-0">
              <div className="flex gap-2 items-start text-red-700 dark:text-red-400">
                <AlertCircleIcon size={18} className="mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Status Update Error</p>
                  <p>{txError}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Scrollable content area */}
          <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            <div className="grid gap-4 py-3">
              {/* Status section - only visible to the owner */}
              {isOwner && (
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="status-select" id="status-label" className="text-base font-medium">Status</Label>
                    
                    {isEditingStatus && isOwner ? (
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
                        {isOwner && (
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
              )}
              
              {/* Publisher and Website - Compact 2-column */}
              {!isLoading && (nftMetadata?.rawData?.publisher || external_url) && (
                <div className="grid grid-cols-2 gap-3">
                  {nftMetadata?.rawData?.publisher && (
                    <div className="grid gap-1">
                      <Label className="text-sm font-medium">Publisher</Label>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">
                        {nftMetadata.rawData.publisher}
                      </div>
                    </div>
                  )}
                  
                  {external_url && (
                    <div className="grid gap-1">
                      <Label className="text-sm font-medium">Website</Label>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">
                        <a href={external_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                          {external_url}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Description - More Compact */}
              {!isLoading && description && (
                <div className="grid gap-1">
                  <Label className="text-sm font-medium">Description</Label>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs leading-relaxed">
                    {description}
                  </div>
                </div>
              )}
              
              {/* Traits and Platforms - Compact side-by-side */}
              {!isLoading && ((nft.traits && nft.traits.length > 0) || Object.keys(platforms).length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {/* Traits */}
                  {nft.traits && nft.traits.length > 0 && (
                    <div className="grid gap-1">
                      <Label className="text-sm font-medium">Traits</Label>
                      <div className="flex flex-wrap gap-1 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                        {nft.traits.map((trait, index) => (
                          <span 
                            key={index} 
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded text-xs"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Platforms */}
                  {Object.keys(platforms).length > 0 && (
                    <div className="grid gap-1">
                      <Label className="text-sm font-medium">Platforms</Label>
                      <div className="flex flex-wrap gap-1 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                        {Object.keys(platforms).map((platform) => (
                          <span 
                            key={platform} 
                            className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs capitalize"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* DID and Data URL - Compact */}
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <Label htmlFor="did-display" className="text-sm font-medium">DID</Label>
                  <div id="did-display" className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs break-all">
                    {nft.did}
                  </div>
                </div>
                
                <div className="grid gap-1">
                  <Label htmlFor="data-url-display" className="text-sm font-medium">Data URL</Label>
                  <div id="data-url-display" className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs break-all">
                    <a href={nft.dataUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {nft.dataUrl}
                    </a>
                  </div>
                
                  {/* Data Hash Verification Status (from metadata context) */}
                  {nftMetadata?.dataHashVerification && (
                    <div className={`flex items-center gap-2 p-1.5 rounded text-xs ${
                      nftMetadata.dataHashVerification.isValid 
                        ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' 
                        : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                    }`}>
                      {nftMetadata.dataHashVerification.isValid ? (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Data verified</span>
                          {attestationStatus.hasAttestation && (
                            <span title={attestationStatus.message}>
                              <Shield size={12} className="ml-1" />
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <XCircle size={14} />
                          <span>Hash mismatch</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Attestation checking indicator */}
                  {attestationStatus.checking && (
                    <div className="flex items-center gap-2 p-1.5 rounded text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Checking attestation...</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Description Section - Only show when loaded */}
              {!isLoadingDescription && description && (
                <div className="grid gap-2">
                  <Label htmlFor="description-content-display" className="text-base font-medium">Description</Label>
                  <div 
                    id="description-content-display" 
                    className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md overflow-hidden"
                  >
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {description}
                    </div>
                  </div>
                </div>
              )}
              
              {nft.iwpsPortalUrl && (
                <div className="grid gap-2">
                  <Label htmlFor="iwps-portal-display" className="text-base font-medium">IWPS Portal URL</Label>
                  <div id="iwps-portal-display" className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md break-all">
                    <a href={nft.iwpsPortalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {nft.iwpsPortalUrl}
                    </a>
                  </div>
                </div>
              )}
              
              {/* Already showing contractId above */}
              
              <div className="grid gap-2">
                <Label htmlFor="minter-display" className="text-base font-medium">Minter</Label>
                <div id="minter-display" className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md break-all">
                  {nft.minter}
                </div>
              </div>
              
              {/* Screenshots Section - Compact grid at bottom */}
              {!isLoading && screenshotUrls.length > 0 && (
                <div className="grid gap-1">
                  <Label className="text-sm font-medium">Screenshots</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {screenshotUrls.map((url, index) => (
                      <div key={index} className="aspect-video bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
                        <img 
                          src={url} 
                          alt={`Screenshot ${index + 1}`} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Static footer */}
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end mt-4 pt-4 border-t flex-shrink-0">
            {/* Spacer to push buttons right, or adjust justify-content above */} 
            <div className="flex-grow"></div> 
            
            {/* Edit Metadata Button - Only shown if user can edit and is the owner */}
            {canEditMetadata && (
              <Button 
                className={`${buttonStyle} order-first sm:order-none`} 
                onClick={handleEditMetadata}
              >
                Edit Metadata
              </Button>
            )}
            
            {isEditingStatus && statusChanged && isOwner ? (
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
      {launchData && (
        <LaunchConfirmationDialog 
          isOpen={showLaunchConfirmation}
          onClose={() => {
            setShowLaunchConfirmation(false);
            setLaunchData(null);
          }}
          appName={launchData.appName}
          destinationUrl={launchData.destinationUrl}
          downloadUrl={launchData.downloadUrl}
          location={launchData.location}
          teleportPin={launchData.teleportPin}
        />
      )}
    </>
  )
} 