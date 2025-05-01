"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import NFTGrid from "@/components/nft-grid"
import NFTMintModal, { WizardStep } from "@/components/nft-mint-modal"
import NFTViewModal from "@/components/nft-view-modal"
import type { NFT } from "@/types/nft"
import { getAppsByMinter, registerApp, updateStatus } from "@/contracts/appRegistry"
import { useActiveAccount } from "thirdweb/react"
import { setMetadata } from "@/contracts/appMetadata"
import { log } from "@/lib/log"
import { fetchMetadataImage } from "@/lib/utils"
import { toast } from "sonner"

export default function Dashboard() {
  log("Component rendering");
  const account = useActiveAccount();
  const connectedAddress = account?.address;
  const [nfts, setNfts] = useState<NFT[]>([])
  const [isMintModalOpen, setIsMintModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [currentNft, setCurrentNft] = useState<NFT | null>(null)
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(true)
  const [currentStep, setCurrentStep] = useState(1);
  const [editMetadata, setEditMetadata] = useState<Record<string, any> | null>(null);

  // Fetch registered apps by the connected wallet
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setIsLoadingNFTs(true);
        log("Fetching apps from contract...")
        
        if (connectedAddress) {
          log("Fetching apps created by:", connectedAddress);
          const apps = await getAppsByMinter(connectedAddress);
          
          if (!apps || !Array.isArray(apps)) {
            console.error("Invalid apps data received:", apps);
            setNfts([]);
            setIsLoadingNFTs(false);
            return;
          }
          log(`Apps fetched: ${apps.length}`);

          // Augment apps with fetched metadata images
          const augmentedAppsPromises = apps.map(async (app) => {
            if (app && app.dataUrl) {
              const image = await fetchMetadataImage(app.dataUrl);
              if (image) {
                 const metadata = app.metadata || {}; 
                 return { 
                   ...app, 
                   metadata: { ...metadata, image } 
                 };
              }
            }
            return app; // Return original app if no dataUrl or fetch fails
          });

          // Wait for all metadata fetches to settle
          const augmentedAppsResults = await Promise.allSettled(augmentedAppsPromises);
          
          const finalApps = augmentedAppsResults
             .filter(result => result.status === 'fulfilled') // Keep successfully processed apps
             .map(result => (result as PromiseFulfilledResult<NFT>).value);

          // Instead of filtering, flag apps with missing DID or Version
          const appsWithFlags = finalApps.map(app => {
             let hasError = false;
             let errorMessage = "";
             if (!app) { // Handle potential null/undefined apps from augmentation results
                console.warn("Null/undefined app encountered after augmentation");
                // Depending on requirements, either skip or flag
                // Skipping for now, as we can't display anything useful
                return null; 
             } 
             if (!app.did || !app.version) {
               console.warn("App missing DID or Version after augmentation:", app);
               hasError = true;
               errorMessage = "Missing essential DID or Version information.";
             }
             // Return the app object, potentially adding error flags
             return { ...app, hasError, errorMessage }; 
          }).filter(app => app !== null) as (NFT & { hasError: boolean, errorMessage: string })[]; // Filter out nulls and assert type
          
          log(`Setting ${appsWithFlags.length} apps (including potentially invalid) in state`);
          setNfts(appsWithFlags);
        } else {
          log("No wallet connected, showing empty list");
          setNfts([]);
        }
      } catch (error) {
        console.error("Error fetching apps:", error)
        setNfts([])
      } finally {
        setIsLoadingNFTs(false);
      }
    }

    fetchApps()
  }, [connectedAddress])

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
    setCurrentStep(1);
    setIsMintModalOpen(true);
    log("Opening mint modal for new NFT");
  }

  // Opens the mint modal specifically for editing metadata (starts at step 2)
  const handleOpenMintModalFromView = (metadata: Record<string, any>, nft: NFT) => {
    log("Opening mint modal for editing metadata", { metadata, nft });
    setCurrentNft(nft);
    setEditMetadata(metadata);
    setCurrentStep(2);
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
  const handleRegisterApp = async (nft: NFT, currentStep: number) => {
    log("handleRegisterApp called with currentStep:", currentStep);
    log("NFT:", nft);
    try {
      if (!account) {
        console.error("No wallet connected");
        return Promise.reject(new Error("No wallet connected"));
      }

      // Extract and remove the isCustomUrls flag
      const isCustomUrls = 'isCustomUrls' in nft && (nft as any).isCustomUrls;
      if ('isCustomUrls' in nft) {
        delete (nft as any).isCustomUrls;
      }

      // Only register app if in step 1
      if (currentStep === 1) {
        log("Registering new app:", nft);
        const registeredNft = await registerApp(nft, account);

        // Update NFTs list if registration is successful
        if (registeredNft) {
          setNfts([...nfts, registeredNft]);
          toast.success("App registered successfully!");
        }
      }

      // Handle metadata setting if in step 5
      if (currentStep === 5 && nft.metadata) {
        log("Submitting metadata for app:", nft);
        const result = await setMetadata(nft, account);
        log("Metadata set result:", result);
        if (result) {
          toast.success("Metadata set successfully!");
        } else {
          toast.error("Failed to set metadata");
        }
      }

      return Promise.resolve();
    } catch (error) {
      console.error("Error in handleRegisterApp:", error);
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
      log(`Calling updateStatus function in appRegistry.ts`);
      
      // Update the NFT with the new status - this should trigger wallet transaction
      const updatedNft = await updateStatus({...nft, status: newStatus}, account);
      
      log(`Status update successful, updating UI`);
      
      // Update the local state with the updated NFT
      setNfts(prev => prev.map(item => (item.did === updatedNft.did ? updatedNft : item)));
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error updating status:", error);
      return Promise.reject(error);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">OMA3 App Registry Developer Portal</h1>
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
        handleCloseMintModal={handleCloseMintModal} 
        onSave={(nft) => handleRegisterApp(nft, currentStep)} 
        nft={currentNft}
        initialMetadata={editMetadata}
        currentStep={currentStep as WizardStep}
        onStepChange={(step) => setCurrentStep(step)}
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