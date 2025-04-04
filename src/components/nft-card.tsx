"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { NFT } from "@/types/nft"
import { getStatusLabel, getStatusClasses } from "@/types/nft"

interface NFTCardProps {
  nft: NFT
  onEdit: (nft: NFT) => void
}

export default function NFTCard({ nft, onEdit }: NFTCardProps) {
  // Debug log key generation
  const key = `${nft.did || 'unknown'}-${nft.version || 'unknown'}`;
  console.log(`NFTCard rendering with key: ${key}`, nft);
  
  // Ensure we have valid data
  const name = nft.name || "Unnamed App";
  const version = nft.version || "Unknown Version";
  const did = nft.did || "Unknown DID";
  const dataUrl = nft.dataUrl || "#";
  const status = typeof nft.status === 'number' ? nft.status : 0;
  
  return (
    <Card 
      className="overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer hover:scale-[1.02] border-2 hover:border-blue-500"
      onClick={() => onEdit(nft)}
    >
      <CardHeader className="p-4">
        <CardTitle className="flex justify-between items-start">
          <span className="truncate">{name}</span>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusClasses(status)}`}>
            {getStatusLabel(status)}
          </span>
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Version: {version}</p>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <div className="text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">DID: </span>
          <span className="text-slate-600 dark:text-slate-400 break-all">{did}</span>
        </div>
        {nft.contractAddress && (
          <div className="text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Contract: </span>
            <span className="text-slate-600 dark:text-slate-400 break-all">{nft.contractAddress}</span>
          </div>
        )}
        <div className="text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Data URL: </span>
          <span className="text-slate-600 dark:text-slate-400 break-all">{dataUrl}</span>
        </div>
      </CardContent>
    </Card>
  )
}