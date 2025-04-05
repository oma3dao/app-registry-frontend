"use client"

import { Button } from "@/components/ui/button"
import NFTCard from "@/components/nft-card"
import type { NFT } from "@/types/nft"
import { PlusIcon } from "lucide-react"

interface NFTGridProps {
  nfts: NFT[]
  onNFTCardClick: (nft: NFT) => void
  onOpenMintModal: () => void
  isLoading?: boolean
  className?: string
}

export default function NFTGrid({ nfts, onNFTCardClick, onOpenMintModal, isLoading = false, className = "" }: NFTGridProps) {
  // Debug log all NFTs
  console.log("NFTs received:", nfts);
  
  // Filter out duplicate NFTs by creating a unique key from DID and version
  const uniqueNfts = nfts.reduce<NFT[]>((acc, nft) => {
    // Debug log each NFT
    console.log("Processing NFT:", nft);
    
    // Make sure did and version exist
    if (!nft.did || !nft.version) {
      console.warn("NFT missing did or version:", nft);
      return acc;
    }
    
    const key = `${nft.did}-${nft.version}`;
    console.log("Generated key:", key);
    
    const existingIndex = acc.findIndex(item => `${item.did}-${item.version}` === key);
    
    if (existingIndex === -1) {
      // NFT with this key doesn't exist yet, add it
      console.log("Adding NFT with key:", key);
      acc.push(nft);
    } else {
      console.log("Duplicate NFT found with key:", key);
    }
    
    return acc;
  }, []);
  
  // Debug log unique NFTs
  console.log("Unique NFTs:", uniqueNfts);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Loading Applications...</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Fetching registered applications from the blockchain.
          </p>
        </div>
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  if (uniqueNfts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">No Applications Registered Yet</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Register your first application on OMA3&apos;s decentralized app registry.
          </p>
        </div>
        <Button 
          size="lg" 
          onClick={onOpenMintModal} 
          className="inline-flex items-center gap-2 text-lg leading-7 py-2 px-4 h-[52px] min-w-[165px]"
        >
          <PlusIcon size={20} />
          Register New App
        </Button>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {uniqueNfts.map((nft) => (
        <NFTCard key={`${nft.did}-${nft.version}`} nft={nft} onNFTCardClick={onNFTCardClick} />
      ))}
    </div>
  )
}