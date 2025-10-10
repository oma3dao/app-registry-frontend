"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import NFTGrid from "@/components/nft-grid"
import NFTMintModal from "@/components/nft-mint-modal"
import NFTViewModal from "@/components/nft-view-modal"
import type { NFT } from "@/types/nft"
import { useAppsByOwner, useMintApp, useUpdateStatus, type Status } from "@/lib/contracts"
import { useActiveAccount } from "thirdweb/react"
import { useSetMetadata } from "@/lib/contracts"
import { log } from "@/lib/log"
import { fetchMetadataImage } from "@/lib/utils"
import { appSummariesToNFTs } from "@/lib/utils/app-converter"
import { hashTraits } from "@/lib/utils/traits";
import { canonicalizeForHash } from "@/lib/utils/dataurl";
import { buildOffchainMetadataObject } from "@/lib/utils/offchain-json";
import { toast } from "sonner"

export default function Dashboard() {
  log("Component rendering");
  const account = useActiveAccount();
  const connectedAddress = account?.address as `0x${string}` | undefined;
  
  
  const [nfts, setNfts] = useState<NFT[]>([])
  const [isMintModalOpen, setIsMintModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [currentNft, setCurrentNft] = useState<NFT | null>(null)
  
  const [editMetadata, setEditMetadata] = useState<Record<string, any> | null>(null);
  
  // Use new hooks
  const { data: appsData, isLoading: isLoadingApps, error: appsError } = useAppsByOwner(connectedAddress);
  const { mint, isPending: isMinting } = useMintApp();
  const { updateStatus: updateStatusFn, isPending: isUpdatingStatus } = useUpdateStatus();
  const { setMetadata, isPending: isSettingMetadata } = useSetMetadata();
  
  
  const isLoadingNFTs = isLoadingApps;

  // Convert AppSummary to NFT and augment with metadata when apps data changes
  useEffect(() => {
    const augmentApps = async () => {
      if (!appsData || appsData.length === 0) {
        log("No apps to augment");
        setNfts([]);
        return;
      }
      
      try {
        log(`Augmenting ${appsData.length} apps`);
        
        // Convert AppSummary[] to NFT[] using utility function
        const nftApps = appSummariesToNFTs(appsData, connectedAddress);
        
        log(`[dashboard] Converted ${nftApps.length} apps from contract`);
        
        setNfts(nftApps);
        log(`Set ${nftApps.length} apps in state`);
      } catch (error) {
        console.error("Error augmenting apps:", error);
        setNfts([]);
      }
    };
    
    augmentApps();
  }, [appsData, connectedAddress]);
  
  // Show error toast if apps failed to load
  useEffect(() => {
    if (appsError) {
      toast.error(`Failed to load apps: ${appsError.message}`);
    }
  }, [appsError]);

  // Opens the mint modal - only for creating new apps
  const handleOpenMintModal = (nft?: NFT) => {
    // The mint modal should only be used for creating new NFTs
    // Existing NFTs should be viewed/edited in the view modal
    if (nft) {
      log("Opening view modal for existing NFT instead of mint modal");
      handleOpenViewModal(nft);
      return;
    }
    
    setCurrentNft(null);
    setEditMetadata(null);
    
    setIsMintModalOpen(true);
    log("Opening mint modal for new NFT");
  }

  // Opens the mint modal specifically for editing metadata (starts at step 2)
  const handleOpenMintModalFromView = (metadata: Record<string, any>, nft: NFT) => {
    log("Opening mint modal for editing metadata", { metadata, nft });
    setCurrentNft(nft);
    setEditMetadata(metadata);
    
    setIsViewModalOpen(false); // Close the view modal
    setIsMintModalOpen(true);  // Open the mint modal
  }

  const handleCloseMintModal = () => {
    setIsMintModalOpen(false)
    setCurrentNft(null)
    setEditMetadata(null)
  }

  // Opens the view modal - only for viewing and updating status of existing apps
  const handleOpenViewModal = (nft: NFT) => {
    setCurrentNft(nft)
    setIsViewModalOpen(true)
  }

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false)
    setCurrentNft(null)
  }

  // Handles registering a new app from the mint modal
  const handleRegisterApp = async (nft: NFT) => {
    log("handleRegisterApp called (submit)");
    log("NFT:", nft);
    try {
      if (!account) {
        console.error("No wallet connected");
        return Promise.reject(new Error("No wallet connected"));
      }

      // Extract and remove the isCustomUrls flag (temporary flag added by wizard)
      const nftWithExtras = nft as NFT & { isCustomUrls?: boolean };
      const isCustomUrls = 'isCustomUrls' in nftWithExtras && nftWithExtras.isCustomUrls;
      if ('isCustomUrls' in nftWithExtras) {
        delete nftWithExtras.isCustomUrls;
      }

      // Submit (handled at Step 6 inside modal)
      log("Registering new app:", nft);
        
        // Parse version string (e.g., "1.0.0" -> {major: 1, minor: 0, patch: 0})
        const versionParts = nft.version.split('.').map(Number);
        const [major = 1, minor = 0, patch = 0] = versionParts;
        
        // Build the same off-chain object used in Step 6 and compute JCS hash
        const offchainObj = buildOffchainMetadataObject({
          name: nft.name,
          metadata: nft.metadata,
          extra: {
            iwpsPortalUrl: nft.iwpsPortalUrl,
            traits: Array.isArray(nft.traits) ? nft.traits : undefined,
          }
        });
        const jcs = canonicalizeForHash(offchainObj);
        const dataHash = jcs ? jcs.hash : ('0x' + '0'.repeat(64)) as `0x${string}`;
        log("[dashboard.tsx:handleRegisterApp] Computed dataHash (JCS keccak256):", dataHash);
        log(`[dashboard.tsx:handleRegisterApp] Canonical (JCS) JSON length: ${jcs.jcsJson.length}`);
        
        // Hash traits if provided
        const traitHashes = nft.traits ? hashTraits(nft.traits) : [];
        
        // Notify user to check wallet for transaction approval
        toast.info("Please check your wallet to approve the transaction", {
          duration: 8000,
        });
        
        // Use the new mint hook with proper structure
        await mint({
          did: nft.did,
          interfaces: 1, // Default to human interface (bitmap: 1=human)
          dataUrl: nft.dataUrl || '',
          dataHash,
          dataHashAlgorithm: 0, // keccak256
          fungibleTokenId: nft.fungibleTokenId || '',
          contractId: nft.contractId || '',
          initialVersionMajor: major,
          initialVersionMinor: minor,
          initialVersionPatch: patch,
          traitHashes,
          metadataJson: jcs.jcsJson,
        });

        // Add to local state (it will be refetched automatically but this provides immediate feedback)
        setNfts([...nfts, nft]);
        toast.success("App registered successfully!");
      handleCloseMintModal(); // Close modal after successful registration

      return Promise.resolve();
    } catch (error) {
      console.error("Error in handleRegisterApp:", error);
      toast.error(`Failed to register app: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return Promise.reject(error);
    }
  };

  // Handles updating an app's status from the view modal
  const handleUpdateStatus = async (nft: NFT, newStatus: number) => {
    try {
      if (!account) {
        console.error("No account connected, cannot update status");
        return Promise.reject(new Error("No account connected"));
      }
      
      // Validate status
      if (typeof newStatus !== 'number' || newStatus < 0 || newStatus > 2) {
        const errorMsg = `Invalid status value: ${newStatus}. Status must be 0 (Active), 1 (Deprecated), or 2 (Replaced).`;
        console.error(errorMsg);
        return Promise.reject(new Error(errorMsg));
      }

      log(`Updating status for ${nft.did} from ${nft.status} to ${newStatus}`);
      
      // Map number status to Status type (Contract: 0=Active, 1=Deprecated, 2=Replaced)
      const statusMap: Record<number, Status> = { 0: 'Active', 1: 'Deprecated', 2: 'Replaced' };
      const statusType = statusMap[newStatus] || 'Active';
      
      // Use the new updateStatus hook
      await updateStatusFn(nft.did, statusType);
      
      log(`Status update successful, updating UI`);
      
      // Update the local state with the updated status
      setNfts(prev => prev.map(item => 
        item.did === nft.did ? { ...item, status: newStatus } : item
      ));
      
      toast.success("Status updated successfully!");
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
      return Promise.reject(error);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">OMATrust Registry Developer Portal</h1>
        <div className="flex gap-4">
          <Button 
            size="lg"
            onClick={() => handleOpenMintModal()} 
            className="inline-flex items-center gap-2 text-lg leading-7 py-2 px-4 h-[52px] min-w-[165px]"
          >
            <PlusIcon size={20} />
            Register New App
          </Button>
          <Button size="lg" isConnectButton className="h-[52px]" />
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">My Registered Applications</h1>
      </div>

      <NFTGrid 
        nfts={nfts} 
        onNFTCardClick={handleOpenViewModal} 
        onOpenMintModal={() => handleOpenMintModal()} 
        isLoading={isLoadingNFTs} 
        showStatus={true}
      />

      {/* Mint Modal - Used for registering new apps and editing metadata */}
      <NFTMintModal 
        isOpen={isMintModalOpen} 
        onClose={handleCloseMintModal} 
        onSubmit={(nft) => handleRegisterApp(nft)} 
        initialData={currentNft || undefined}
      />

      {/* View Modal - Used for viewing app details and updating status */}
      <NFTViewModal 
        isOpen={isViewModalOpen} 
        handleCloseViewModal={handleCloseViewModal} 
        nft={currentNft} 
        onUpdateStatus={handleUpdateStatus}
        onEditMetadata={handleOpenMintModalFromView}
      />
    </div>
  )
}