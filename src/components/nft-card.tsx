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
      <CardHeader className="p-4">
        <CardTitle className="flex justify-between items-start">
          <span className="truncate">{nft.name}</span>
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Version: {nft.version}</p>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <div className="text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">DID: </span>
          <span className="text-slate-600 dark:text-slate-400 break-all">{nft.did}</span>
        </div>
        {nft.contractAddress && (
          <div className="text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Contract: </span>
            <span className="text-slate-600 dark:text-slate-400 break-all">{nft.contractAddress}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button variant="outline" size="sm" className="flex items-center gap-1" asChild>
          <a href={nft.dataUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon size={14} />
            <span>Data</span>
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

