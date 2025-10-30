"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import NFTGrid from "@/components/nft-grid"
import NFTMintModal from "@/components/nft-mint-modal"
import NFTViewModal from "@/components/nft-view-modal"
import type { NFT } from "@/schema/data-model"
import { useAppsByOwner, useMintApp, useUpdateApp, useUpdateStatus, type Status } from "@/lib/contracts"
import { useActiveAccount } from "thirdweb/react"
import { useSetMetadata } from "@/lib/contracts"
import { log } from "@/lib/log"
import { fetchMetadataImage } from "@/lib/utils"
import { appSummariesToNFTsWithMetadata } from "@/lib/utils/app-converter"
import { hashTraits } from "@/lib/utils/traits";
import { canonicalizeForHash } from "@/lib/utils/dataurl";
import { buildOffchainMetadataObject } from "@/lib/utils/offchain-json";
import { toast } from "sonner"
import { env } from "@/config/env"
import { ExternalLinkIcon, InfoIcon } from "lucide-react"
import { toMintAppInput, toUpdateAppInput } from "@/schema/mapping"
import { useNFTMetadata } from "@/lib/nft-metadata-context"

export default function Dashboard() {
  log("Component rendering");
  const account = useActiveAccount();
  const connectedAddress = account?.address as `0x${string}` | undefined;
  const { clearCache } = useNFTMetadata();
  
  
  const [nfts, setNfts] = useState<NFT[]>([])
  const [isHydratingMetadata, setIsHydratingMetadata] = useState(false)
  const [isMintModalOpen, setIsMintModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [currentNft, setCurrentNft] = useState<NFT | null>(null)
  
  const [editMetadata, setEditMetadata] = useState<Record<string, any> | null>(null);
  
  // Use new hooks
  const { data: appsData, isLoading: isLoadingApps, error: appsError } = useAppsByOwner(connectedAddress);
  const { mint, isPending: isMinting } = useMintApp();
  const { updateApp, isPending: isUpdatingApp } = useUpdateApp();
  const { updateStatus: updateStatusFn, isPending: isUpdatingStatus } = useUpdateStatus();
  const { setMetadata, isPending: isSettingMetadata } = useSetMetadata();
  
  
  const isLoadingNFTs = isLoadingApps || isHydratingMetadata;

  // Convert AppSummary to NFT and augment with metadata when apps data changes
  useEffect(() => {
    const augmentApps = async () => {
      if (!appsData || appsData.length === 0) {
        log("No apps to augment");
        setNfts([]);
        setIsHydratingMetadata(false);
        return;
      }
      
      try {
        log(`Augmenting ${appsData.length} apps`);
        setIsHydratingMetadata(true);
        
        // Convert AppSummary[] to NFT[] and hydrate with metadata
        const nftApps = await appSummariesToNFTsWithMetadata(appsData, connectedAddress);
        
        log(`[dashboard] Converted and hydrated ${nftApps.length} apps from contract`);
        
        setNfts(nftApps);
        log(`Set ${nftApps.length} fully hydrated apps in state`);
      } catch (error) {
        console.error("Error augmenting apps:", error);
        setNfts([]);
      } finally {
        setIsHydratingMetadata(false);
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
    
    // Use the NFT as-is since it now has all flattened metadata fields
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

      // Set owner to connected wallet address in CAIP-10 format (will be included in metadata JSON)
      // Use buildCaip10 utility to ensure proper format: eip155:chainId:address
      const { buildCaip10 } = await import('@/lib/utils/caip10');
      const ownerCaip10 = buildCaip10('eip155', env.chainId.toString(), account.address);
      nft.owner = ownerCaip10;

      // Check if this is an edit operation
      const isEditMode = currentNft && currentNft.did === nft.did;
      
      if (isEditMode) {
        log("Updating existing app:", nft);
        log("Current NFT version:", currentNft.version);
        log("Current NFT minter (owner):", currentNft.minter);
        log("Connected wallet address:", account?.address);
        
        // Check if connected wallet is the owner
        if (currentNft.minter && account?.address && 
            currentNft.minter.toLowerCase() !== account.address.toLowerCase()) {
          const errorMsg = `You are not the owner of this app. Owner: ${currentNft.minter}, Connected: ${account.address}`;
          log(errorMsg);
          toast.error(errorMsg);
          return Promise.reject(new Error(errorMsg));
        }
        
        // Import mapping function
        const { toUpdateAppInput } = await import('@/schema/mapping');
        
        // Convert to update input
        const updateInput = toUpdateAppInput(nft, currentNft.version);
        
        log("Update input prepared:", updateInput);
        log("Update input keys:", Object.keys(updateInput));
        log("Update input did:", updateInput.did);
        log("Update input major:", updateInput.major);
        log("Update input newMinor:", updateInput.newMinor);
        log("Update input newPatch:", updateInput.newPatch);
        log("Update input newDataUrl:", updateInput.newDataUrl);
        log("Update input newDataHash:", updateInput.newDataHash);
        log("Update input newInterfaces:", updateInput.newInterfaces);
        log("Update input newTraitHashes:", updateInput.newTraitHashes);
        log("Update input metadataJson length:", updateInput.metadataJson?.length || 0);
        
        // The contract will fetch newDataUrl and verify its hash matches newDataHash
        // So the dataUrl MUST be publicly accessible and return the correct content
        log("WARNING: Contract will fetch newDataUrl and verify hash");
        log("Make sure the dataUrl is publicly accessible!");
        
        // Verify the hash matches what we computed
        if (updateInput.metadataJson) {
          const { keccak256 } = await import('ethers');
          const computedHash = keccak256(Buffer.from(updateInput.metadataJson));
          log("Computed hash from metadataJson:", computedHash);
          log("Provided newDataHash:", updateInput.newDataHash);
          log("Hashes match?", computedHash === updateInput.newDataHash);
        }
        
        // Fetch current on-chain data to compare
        log("Fetching current on-chain data for comparison...");
        const { getAppByDid } = await import('@/lib/contracts/registry.read');
        const currentOnChainApp = await getAppByDid(nft.did);
        if (currentOnChainApp) {
          log("Current on-chain dataUrl:", currentOnChainApp.dataUrl);
          log("Current on-chain dataHash:", currentOnChainApp.dataHash);
          log("Current on-chain interfaces:", currentOnChainApp.interfaces);
          log("Current on-chain traits count:", currentOnChainApp.traitHashes?.length || 0);
          log("New dataUrl same as current?", updateInput.newDataUrl === currentOnChainApp.dataUrl);
          log("New dataHash same as current?", updateInput.newDataHash === currentOnChainApp.dataHash);
          log("New interfaces same as current?", updateInput.newInterfaces === currentOnChainApp.interfaces);
        }
        
        // Notify user to check wallet for transaction approval
        toast.info("Please check your wallet to approve the update transaction", {
          duration: 8000,
        });
        
        // Use the update hook
        await updateApp(updateInput);
        
        // Clear metadata cache so it refetches with new data
        clearCache();
        
        // Update local state
        setNfts(prev => prev.map(item => 
          item.did === nft.did ? { ...item, ...nft } : item
        ));
        
        toast.success("App updated successfully!");
      } else {
        log("Registering new app:", nft);
        
        // Import mapping function
        const { toMintAppInput } = await import('@/schema/mapping');
        
        // Convert to mint input
        const mintInput = toMintAppInput(nft);
        
        // Notify user to check wallet for transaction approval
        toast.info("Please check your wallet to approve the transaction", {
          duration: 8000,
        });
        
        // Use the mint hook
        await mint(mintInput);

        // Set currentOwner to minter for fresh mints (they're the same at mint time)
        nft.currentOwner = account.address;

        // Add to local state
        setNfts([...nfts, nft]);
        toast.success("App registered successfully!");
      }
      
      handleCloseMintModal(); // Close modal after successful registration

      return Promise.resolve();
    } catch (error) {
      console.error("Error in handleRegisterApp:", error);
      const action = currentNft && currentNft.did === nft.did ? 'update' : 'register';
      toast.error(`Failed to ${action} app: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">My Registered Applications</h1>
      </div>

      {/* Testnet Faucet Notice - Only show on testnet (66238), hide on mainnet (999999) and localhost (31337) */}
      {env.chainId === 66238 && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex gap-3 items-start">
            <InfoIcon size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-grow">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-1">
                Need testnet OMA tokens?
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Get free OMA tokens from the{' '}
                <a 
                  href="https://faucet.testnet.chain.oma3.org/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  OMAchain Testnet Faucet
                  <ExternalLinkIcon size={14} />
                </a>
                {' '}to register apps and pay for transactions.  You can find your wallet address (it starts with 0x) by clicking the button in the top right corner of the screen.
              </p>
            </div>
          </div>
        </div>
      )}

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