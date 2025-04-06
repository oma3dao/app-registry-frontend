"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import NFTGrid from "@/components/nft-grid"
import NFTMintModal from "@/components/nft-mint-modal"
import NFTViewModal from "@/components/nft-view-modal"
import type { NFT } from "@/types/nft"
import { getAppsByMinter, registerApp, updateStatus } from "@/contracts/appRegistry"
import { useActiveAccount } from "thirdweb/react"
import { log } from "@/lib/log"

export default function Dashboard() {
  log("Dashboard component rendering");
  const account = useActiveAccount();
  const connectedAddress = account?.address;
  const [nfts, setNfts] = useState<NFT[]>([])
  const [isMintModalOpen, setIsMintModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [currentNft, setCurrentNft] = useState<NFT | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch registered apps by the connected wallet
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setIsLoading(true)
        log("Fetching apps from contract...")
        
        if (connectedAddress) {
          log("Fetching apps created by:", connectedAddress);
          const apps = await getAppsByMinter(connectedAddress);
          
          // Validate NFTs before setting them in state
          if (!apps || !Array.isArray(apps)) {
            console.error("Invalid apps data received:", apps);
            setNfts([]);
            return;
          }
          
          // Log the apps we received
          log("Apps fetched successfully:", apps);
          log("Number of apps:", apps.length);
          
          // Filter out invalid NFTs
          const validApps = apps.filter(app => {
            if (!app) {
              console.warn("Null or undefined app found");
              return false;
            }
            
            if (!app.did) {
              console.warn("App missing DID:", app);
              return false;
            }
            
            if (!app.version) {
              console.warn("App missing version:", app);
              return false;
            }
            
            return true;
          });
          
          // Log filtering results
          log(`Filtered apps: ${validApps.length} valid out of ${apps.length} total`);
          
          // Set only valid apps in state
          setNfts(validApps);
        } else {
          log("No wallet connected, showing empty list");
          setNfts([]);
        }
      } catch (error) {
        console.error("Error fetching apps:", error)
        setNfts([])
      } finally {
        setIsLoading(false)
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
    setIsMintModalOpen(true);
  }

  const handleCloseMintModal = () => {
    setIsMintModalOpen(false)
    setCurrentNft(null)
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
    try {
      if (!account) {
        console.error("No wallet connected");
        return Promise.reject(new Error("No wallet connected"));
      }

      // Mint modal should only be used for new app registration
      log("Registering new app:", nft);
      const registeredNft = await registerApp(nft, account)
      setNfts([...nfts, registeredNft])
      
      handleCloseMintModal()
      return Promise.resolve();
    } catch (error) {
      console.error("Error registering app:", error)
      return Promise.reject(error);
    }
  }

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

      log(`Dashboard: Updating status for ${nft.did} from ${nft.status} to ${newStatus}`);
      log(`Dashboard: Calling updateStatus function in appRegistry.ts`);
      
      // Update the NFT with the new status - this should trigger wallet transaction
      const updatedNft = await updateStatus({...nft, status: newStatus}, account);
      
      log(`Dashboard: Status update successful, updating UI`);
      
      // Update the local state with the updated NFT
      setNfts(prev => prev.map(item => (item.did === updatedNft.did ? updatedNft : item)));
      
      return Promise.resolve();
    } catch (error) {
      console.error("Dashboard: Error updating status:", error);
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
        isLoading={isLoading} 
      />

      {/* Mint Modal - Used only for registering new apps */}
      <NFTMintModal 
        isOpen={isMintModalOpen} 
        handleCloseMintModal={handleCloseMintModal} 
        onSave={handleRegisterApp} 
        nft={currentNft} 
      />

      {/* View Modal - Used for viewing app details and updating status */}
      <NFTViewModal 
        isOpen={isViewModalOpen} 
        handleCloseViewModal={handleCloseViewModal} 
        nft={currentNft} 
        onUpdateStatus={handleUpdateStatus} 
      />
    </div>
  )
}