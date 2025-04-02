"use client"

import { Button } from "@/components/ui/button"
import NFTCard from "@/components/nft-card"
import type { NFT } from "@/types/nft"
import { PlusIcon } from "lucide-react"

interface NFTGridProps {
  nfts: NFT[]
  onEdit: (nft: NFT) => void
  onMintFirst: () => void
  isLoading?: boolean
}

export default function NFTGrid({ nfts, onEdit, onMintFirst, isLoading = false }: NFTGridProps) {
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

  if (nfts.length === 0) {
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
          onClick={onMintFirst} 
          className="inline-flex items-center gap-2 text-lg leading-7 py-2 px-4 h-[52px] min-w-[165px]"
        >
          <PlusIcon size={20} />
          Register New App
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {nfts.map((nft) => (
        <NFTCard key={nft.id} nft={nft} onEdit={onEdit} />
      ))}
    </div>
  )
}

