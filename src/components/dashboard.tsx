"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import NFTGrid from "@/components/nft-grid"
import NFTModal from "@/components/nft-modal"
import type { NFT } from "@/types/nft"

export default function Dashboard() {
  const [nfts, setNfts] = useState<NFT[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentNft, setCurrentNft] = useState<NFT | null>(null)

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

  const handleSaveNft = (nft: NFT) => {
    if (currentNft) {
      // Edit existing NFT
      setNfts(nfts.map((item) => (item.id === nft.id ? nft : item)))
    } else {
      // Add new NFT
      setNfts([...nfts, { ...nft, id: Date.now().toString() }])
    }
    handleCloseModal()
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

      <NFTGrid nfts={nfts} onEdit={handleOpenModal} onMintFirst={() => handleOpenModal()} />

      <NFTModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveNft} nft={currentNft} />
    </div>
  )
}


