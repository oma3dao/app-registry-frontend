"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import NFTGrid from "@/components/nft-grid"
import NFTModal from "@/components/nft-modal"
import type { NFT } from "@/types/nft"
import { getAppsByMinter, registerApp, updateStatus } from "@/contracts/appRegistry"
import { useActiveAccount } from "thirdweb/react"

export default function Dashboard() {
  console.log("Dashboard component rendering");
  const account = useActiveAccount();
  const connectedAddress = account?.address;
  const [nfts, setNfts] = useState<NFT[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentNft, setCurrentNft] = useState<NFT | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch registered apps by the connected wallet
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setIsLoading(true)
        console.log("Fetching apps from contract...")
        
        if (connectedAddress) {
          console.log("Fetching apps created by:", connectedAddress);
          const apps = await getAppsByMinter(connectedAddress);
          console.log("Apps fetched:", apps);
          setNfts(apps);
        } else {
          console.log("No wallet connected, showing empty list");
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

  const handleOpenModal = (nft?: NFT) => {
    if (nft) {
      setCurrentNft(nft)
    } else {
      setCurrentNft(null)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setCurrentNft(null)
  }

  const handleSaveNft = async (nft: NFT) => {
    try {
      if (currentNft) {
        // Edit existing NFT - update status
        const updatedNft = await updateStatus(nft)
        setNfts(nfts.map((item) => (item.id === updatedNft.id ? updatedNft : item)))
      } else {
        // Add new NFT - register a new app
        const { id, ...nftWithoutId } = nft
        const registeredNft = await registerApp(nftWithoutId)
        setNfts([...nfts, registeredNft])
      }
      
      handleCloseModal()
    } catch (error) {
      console.error("Error interacting with contract:", error)
      // Handle error - you might want to show a notification to the user
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">OMA3 App Registry Developer Portal</h1>
        <div className="flex gap-4">
          <Button 
            size="lg"
            onClick={() => handleOpenModal()} 
            className="inline-flex items-center gap-2 text-lg leading-7 py-2 px-4 h-[52px] min-w-[165px]"
          >
            <PlusIcon size={20} />
            Register New App
          </Button>
          <Button size="lg" isConnectButton className="h-[52px]" />
        </div>
      </div>

      <NFTGrid nfts={nfts} onEdit={handleOpenModal} onMintFirst={() => handleOpenModal()} isLoading={isLoading} />

      <NFTModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveNft} nft={currentNft} />
    </div>
  )
}


