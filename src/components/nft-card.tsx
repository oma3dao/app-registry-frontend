"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { NFT } from "@/types/nft"
import { EditIcon, ExternalLinkIcon } from "lucide-react"

interface NFTCardProps {
  nft: NFT
  onEdit: (nft: NFT) => void
}

export default function NFTCard({ nft, onEdit }: NFTCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={nft.imageUrl || "/placeholder.svg?height=200&width=400"}
          alt={nft.name}
          className="w-full h-full object-cover"
        />
      </div>
      <CardHeader className="p-4">
        <CardTitle className="flex justify-between items-start">
          <span className="truncate">{nft.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{nft.description}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button variant="outline" size="sm" className="flex items-center gap-1" asChild>
          <a href={nft.appUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon size={14} />
            <span>Visit</span>
          </a>
        </Button>
        <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => onEdit(nft)}>
          <EditIcon size={14} />
          <span>Edit</span>
        </Button>
      </CardFooter>
    </Card>
  )
}

