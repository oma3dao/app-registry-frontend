"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import NFTGrid from "@/components/nft-grid"
import { getTotalApps, getAppsWithPagination } from "@/contracts/appRegistry"
import type { NFT } from "@/types/nft"
import { LANDING_PAGE_NUM_APPS } from "@/config/app-config"
import NFTViewModal from "@/components/nft-view-modal"
import { log } from "@/lib/log"
import { fetchMetadataImage } from "@/lib/utils"
import { useActiveAccount } from "thirdweb/react"

export default function LandingPage() {
  const [latestApps, setLatestApps] = useState<NFT[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [currentNft, setCurrentNft] = useState<NFT | null>(null)
  const account = useActiveAccount()
  const [shouldLoadNFTs, setShouldLoadNFTs] = useState(false)
  
  useEffect(() => {
    if (account) {
      // Redirect to dashboard if wallet is connected
      window.location.href = "/dashboard";
      return;
    }

    setShouldLoadNFTs(true);

    const fetchLatestApps = async () => {
      try {
        setIsLoading(true)
        
        // Get total number of apps first to know how many there are
        const totalApps = await getTotalApps()
        log(`Total registered apps: ${totalApps}`)
        
        // If there are apps, fetch the latest ones
        if (totalApps > 0) {
          try {
            // Calculate the starting index based on total apps
            // If totalApps <= LANDING_PAGE_NUM_APPS, start from beginning (index 1)
            // Otherwise, start from (totalApps - LANDING_PAGE_NUM_APPS + 1)
            const startIndex = Math.max(1, totalApps - LANDING_PAGE_NUM_APPS + 1)
            log(`Fetching the latest apps starting from index ${startIndex}`)
            
            // Always use pagination to fetch the exact apps we need
            const apps = await getAppsWithPagination(startIndex, LANDING_PAGE_NUM_APPS)
            
            // Augment apps with fetched metadata images
            const augmentedAppsPromises = apps.map(async (app) => {
              if (app && app.dataUrl) {
                const imageUrl = await fetchMetadataImage(app.dataUrl);
                if (imageUrl) {
                   // Create a new object to avoid direct state mutation worries
                   // Ensure metadata object exists
                   const metadata = app.metadata || {}; 
                   return { 
                     ...app, 
                     metadata: { ...metadata, iconUrl: imageUrl } 
                   };
                }
              }
              return app; // Return original app if no dataUrl or fetch fails
            });

            // Wait for all metadata fetches to settle
            const augmentedAppsResults = await Promise.allSettled(augmentedAppsPromises);
            
            const finalApps = augmentedAppsResults
               .filter(result => result.status === 'fulfilled') // Keep only successfully processed apps
               .map(result => (result as PromiseFulfilledResult<NFT>).value);

            const reversedApps = finalApps.reverse(); // Reverse after augmentation
            log(`Showing the latest ${reversedApps.length} augmented apps`);
            setLatestApps(reversedApps)
          } catch (getAppsError) {
            log("Error fetching apps:", getAppsError)
            // Continue showing loading state as false, but with no apps
          }
        } else {
          log("No apps registered yet or couldn't get total count")
          setLatestApps([]) // Ensure empty array if no apps
        }
      } catch (error) {
        log("Error fetching latest apps:", error)
        setLatestApps([]) // Ensure empty array on error
      } finally {
        setIsLoading(false)
      }
    }
    
    if (shouldLoadNFTs) {
      fetchLatestApps()
    }
  }, [account, shouldLoadNFTs])

  // Opens the view modal for an NFT
  const handleOpenViewModal = (nft: NFT) => {
    setCurrentNft(nft)
    setIsViewModalOpen(true)
  }

  // Closes the view modal
  const handleCloseViewModal = () => {
    setIsViewModalOpen(false)
    setCurrentNft(null)
  }

  // Stub function for updateStatus - not used on landing page but required by NFTViewModal
  const handleUpdateStatus = async (nft: NFT, newStatus: number): Promise<void> => {
    log("Status cannot be updated from landing page")
    return Promise.resolve()
  }
  
  // Dummy function for opening mint modal - not used on landing page but required by NFTGrid
  const handleOpenMintModal = () => {
    log("Mint modal cannot be opened from landing page")
  }
  
  return (
    <div className="flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl pt-12">
          <span className="block text-primary">OMA3 App Registry</span>
          <span className="block text-slate-700 dark:text-slate-300">Developer Portal</span>
        </h1>

        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Register your applications as NFTs on the blockchain to make them discoverable by any application store, including OMA3&apos;s Spatial Store.<br/><br/>Connect your wallet to get started.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button size="lg" isConnectButton />
        </div>

        <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium mb-2">Register</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Register your applications as NFTs on the blockchain
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium mb-2">Manage</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Update the status of your applications
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium mb-2">Dev Tools</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Coming soon
            </p>
          </div>
        </div>
        
        {shouldLoadNFTs && (
          <div className="pt-16 w-full">
            <h1 className="text-3xl font-bold mb-8 text-left">Latest Registered Apps</h1>
            <NFTGrid 
              nfts={latestApps} 
              onNFTCardClick={handleOpenViewModal}
              onOpenMintModal={handleOpenMintModal}
              isLoading={isLoading}
              showStatus={false}
              className="sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
            />
          </div>
        )}
      </div>

      {/* View Modal - Used for viewing app details */}
      <NFTViewModal 
        isOpen={isViewModalOpen} 
        handleCloseViewModal={handleCloseViewModal} 
        nft={currentNft} 
        onUpdateStatus={handleUpdateStatus} 
      />
    </div>
  )
}

