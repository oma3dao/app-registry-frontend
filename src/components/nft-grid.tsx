"use client"

import { Button } from "@/components/ui/button"
import NFTCard from "@/components/nft-card"
import type { NFT } from "@/types/nft"
import { PlusIcon } from "lucide-react"

interface NFTGridProps {
  nfts: NFT[]
  onEdit: (nft: NFT) => void
  onMintFirst: () => void
}

export default function NFTGrid({ nfts, onEdit, onMintFirst }: NFTGridProps) {
  if (nfts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">No Applications Registered Yet</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Register your first application on OMA3's decentralized app registry.
          </p>
        </div>
        <Button size="lg" onClick={onMintFirst} className="flex items-center gap-2">
          <PlusIcon size={16} />
          Register Your First App
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

