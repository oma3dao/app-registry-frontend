"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import NFTGrid from "@/components/nft-grid"
import { useAppsList } from "@/lib/contracts"
import { getTotalActiveApps, listActiveApps } from "@/lib/contracts/registry.read"
import type { NFT } from "@/schema/data-model"
import { LANDING_PAGE_NUM_APPS } from "@/config/app-config"
import NFTViewModal from "@/components/nft-view-modal"
import { log } from "@/lib/log"
import { useActiveAccount } from "thirdweb/react"
import { appSummariesToNFTsWithMetadata } from "@/lib/utils/app-converter"

export default function LandingPage() {
  const [latestApps, setLatestApps] = useState<NFT[]>([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [currentNft, setCurrentNft] = useState<NFT | null>(null)
  const account = useActiveAccount()
  const [shouldLoadNFTs, setShouldLoadNFTs] = useState(false)
  const [startIndex, setStartIndex] = useState(1)
  
  // Fetch total and latest apps (client-side for landing page)
  const [totalAppsCount, setTotalAppsCount] = useState(0);
  const [appsData, setAppsData] = useState<{ items: any[] } | null>(null);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  
  // Fetch total apps count
  useEffect(() => {
    if (!shouldLoadNFTs) return;
    
    getTotalActiveApps()
      .then(count => {
        setTotalAppsCount(count);
        log(`[LandingPage] Total active apps: ${count}`);
      })
      .catch(error => {
        console.error('[LandingPage] Error fetching total apps:', error);
        setTotalAppsCount(0);
      });
  }, [shouldLoadNFTs]);
  
  // Fetch latest apps
  useEffect(() => {
    if (!shouldLoadNFTs || totalAppsCount === 0) return;
    
    setIsLoadingApps(true);
    // Contract uses 0-based indexing, so start from 0 for the latest apps
    const calculatedStartIndex = Math.max(0, totalAppsCount - LANDING_PAGE_NUM_APPS);
    
    log(`[LandingPage] Querying from index ${calculatedStartIndex}, pageSize ${LANDING_PAGE_NUM_APPS}`);
    
    listActiveApps(calculatedStartIndex, LANDING_PAGE_NUM_APPS)
      .then(result => {
        log(`[LandingPage] Result:`, result);
        log(`[LandingPage] Fetched ${result.items?.length || 0} apps`);
        setAppsData(result);
      })
      .catch(error => {
        console.error('[LandingPage] Error fetching apps:', error);
        setAppsData({ items: [] });
      })
      .finally(() => {
        setIsLoadingApps(false);
      });
  }, [shouldLoadNFTs, totalAppsCount]);
  
  // Process and augment apps when data changes
  useEffect(() => {
    if (!shouldLoadNFTs || !appsData?.items || appsData.items.length === 0) {
      return
    }
    
    const augmentApps = async () => {
      try {
        setIsLoadingImages(true)
        log(`Processing ${appsData.items.length} apps`)
        
        // Convert AppSummary to NFT type and hydrate with metadata
        const nftApps = await appSummariesToNFTsWithMetadata(appsData.items)

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
          <span className="block text-primary">OMATrust App Registry</span>
          <span className="block text-slate-700 dark:text-slate-300">Trust for Online Services</span>
        </h1>

        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          OMATrust is the open internet&apos;s decentralized trust layer. It brings the security and comfort of curated stores to the whole internet. Get started and register your services today.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4" id="hero-connect">
          <Button 
            size="lg" 
            isConnectButton 
            className="min-w-[165px] px-8 py-6 text-lg font-semibold rounded-md"
            connectButtonProps={{ label: "Get Started" }}
          />
          <style>{`
            #hero-connect .tw-connect-wallet {
              min-width: 165px !important;
              height: auto !important;
              font-size: 1.125rem !important;
              padding: 1.5rem 2rem !important;
              background-color: rgb(37 99 235) !important;
              color: white !important;
              border-radius: 0.375rem !important;
              font-weight: 600 !important;
              line-height: 1.75rem !important;
            }
            #hero-connect .tw-connect-wallet:hover {
              background-color: rgb(29 78 216) !important;
            }
            #hero-connect .tw-connect-wallet:focus {
              outline: none !important;
              box-shadow: 0 0 0 2px rgb(59 130 246 / 0.5), 0 0 0 4px white !important;
            }
          `}</style>
        </div>

        {/* Row 1: Core Actions */}
        <div className="pt-8">
          <h3 className="text-3xl font-bold mb-6 text-slate-700 dark:text-slate-300">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <h4 className="text-lg font-medium mb-2">Register & Manage</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Tokenize your apps and make them discoverable by websites, app stores, and agents. 
                Update metadata and ownership information as your apps evolve.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <h4 className="text-lg font-medium mb-2">Build Reputation</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Collect attestations and grow your app&apos;s reputation. Integrate user review widgets and encourage your community to visit {' '}
                <a 
                  href="https://reputation.omatrust.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  reputation.omatrust.org
                </a>
                {' '}to vouch for your app.
              </p>
            </div>
          </div>
        </div>

        {/* Row 2: Example Use Cases */}
        <div className="pt-8">
          <h3 className="text-3xl font-bold mb-6 text-slate-700 dark:text-slate-300">What You Can Register</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <h4 className="text-lg font-medium mb-2">Websites and Binaries</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Submit your app domain to make your site and downloadables verifiable through OMATrust.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <h4 className="text-lg font-medium mb-2">API Endpoints</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Publish metadata and reputation for your API endpoints, enabling clients to verify authenticity and uptime.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <h4 className="text-lg font-medium mb-2">AI Agents</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Register A2A agents and MCP servers to display certifications and enable trusted agent-to-agent interactions.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <h4 className="text-lg font-medium mb-2">Smart Contracts</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Declare your smart contracts to enable verifiable cybersecurity audits and signal authenticity.
              </p>
            </div>
          </div>
        </div>
        
        {shouldLoadNFTs && (
          <div className="pt-16 w-full">
            <h1 className="text-3xl font-bold mb-8 text-left">Latest Registrations</h1>
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

