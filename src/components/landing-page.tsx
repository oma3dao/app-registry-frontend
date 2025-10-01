"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import NFTGrid from "@/components/nft-grid"
import { useTotalApps, useAppsList } from "@/lib/contracts"
import type { NFT } from "@/types/nft"
import { LANDING_PAGE_NUM_APPS } from "@/config/app-config"
import NFTViewModal from "@/components/nft-view-modal"
import { log } from "@/lib/log"
import { useActiveAccount } from "thirdweb/react"

export default function LandingPage() {
  const [latestApps, setLatestApps] = useState<NFT[]>([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [currentNft, setCurrentNft] = useState<NFT | null>(null)
  const account = useActiveAccount()
  const [shouldLoadNFTs, setShouldLoadNFTs] = useState(false)
  const [startIndex, setStartIndex] = useState(1)
  
  // Use the new hooks
  const { data: totalAppsCount } = useTotalApps()
  const { data: appsData, isLoading: isLoadingApps } = useAppsList(startIndex, LANDING_PAGE_NUM_APPS)
  
  
  // Redirect to dashboard if wallet is connected
  useEffect(() => {
    if (account) {
      window.location.href = "/dashboard";
    }
  }, [account])
  
  // Calculate start index when total apps changes
  useEffect(() => {
    if (totalAppsCount > 0) {
      const calculatedStartIndex = Math.max(1, totalAppsCount - LANDING_PAGE_NUM_APPS + 1)
      log(`Total apps: ${totalAppsCount}, calculated start index: ${calculatedStartIndex}`)
      setStartIndex(calculatedStartIndex)
    }
  }, [totalAppsCount])
  
  // Process and augment apps when data changes
  useEffect(() => {
    if (!shouldLoadNFTs || !appsData?.items || appsData.items.length === 0) {
      return
    }
    
    const augmentApps = async () => {
      try {
        setIsLoadingImages(true)
        log(`Processing ${appsData.items.length} apps`)
        
        // Convert AppSummary to NFT type
        const nftApps = appsData.items.map((app) => {
          const nft: NFT = {
            did: app.did,
            name: app.name || '',
            version: app.version || '1.0.0',
            dataUrl: app.dataUrl || '',
            status: app.status === 'Active' ? 0 : app.status === 'Inactive' ? 1 : 2,
            minter: app.minter || '',
            iwpsPortalUri: app.iwpsPortalUri || '',
            agentApiUri: app.agentApiUri || '',
            contractAddress: app.contractAddress || '',
          }
          
          return nft
        })

        const augmentedAppsResults = nftApps.map(app => ({ status: 'fulfilled' as const, value: app }))
        
        const finalApps = augmentedAppsResults
          .filter(result => result.status === 'fulfilled')
          .map(result => (result as PromiseFulfilledResult<NFT>).value)

        const reversedApps = finalApps.reverse()
        log(`Showing the latest ${reversedApps.length} apps`)
        setLatestApps(reversedApps)
      } catch (error) {
        log("Error augmenting apps:", error)
        setLatestApps([])
      } finally {
        setIsLoadingImages(false)
      }
    }
    
    augmentApps()
  }, [appsData, shouldLoadNFTs])
  
  // Add 1-second delay before loading NFTs to allow connect button to load first
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoadNFTs(true)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])
  
  const isLoading = isLoadingApps || isLoadingImages

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

