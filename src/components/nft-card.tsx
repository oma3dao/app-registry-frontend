"use client"

import React, { useEffect, useState } from 'react';
import {
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card"
import type { NFT } from "@/types/nft"
import { getStatusLabel, getStatusClasses } from "@/types/nft"
import { log } from "@/lib/log"
import { useNFTMetadata } from "@/lib/nft-metadata-context"
import {
  Globe,
  Apple,
  Smartphone,
  Laptop,
  Monitor,
  Gamepad2,
  ExternalLinkIcon,
  Image as ImageIcon, // Placeholder icon
  AlertTriangleIcon // Icon for error state
} from "lucide-react"

interface NFTCardProps {
  nft: NFT
  onNFTCardClick: (nft: NFT) => void
  showStatus?: boolean // Prop to control status visibility
}

// Mapping platform keys to icons
const platformIcons: Record<string, React.ReactNode> = {
  web: <Globe size={16} aria-label="Web" />,
  ios: <Apple size={16} aria-label="iOS" />,
  android: <Smartphone size={16} aria-label="Android" />,
  windows: <Laptop size={16} aria-label="Windows" />,
  macos: <Monitor size={16} aria-label="macOS" />,
  meta: <Gamepad2 size={16} aria-label="Meta Quest" />, // Using gamepad as generic VR
  playstation: <Gamepad2 size={16} aria-label="PlayStation" />, // Using generic gamepad
  xbox: <Gamepad2 size={16} aria-label="Xbox" />, // Using generic gamepad
  nintendo: <Gamepad2 size={16} aria-label="Nintendo Switch" />, // Using generic gamepad
};

export default function NFTCard({ nft, onNFTCardClick, showStatus = true }: NFTCardProps) {
  // Use the metadata context to get complete metadata
  const { getNFTMetadata } = useNFTMetadata();
  
  // Local state to store the metadata for this card
  const [nftMetadata, setNftMetadata] = useState<ReturnType<typeof getNFTMetadata> | null>(null);

  // Effect to fetch/update metadata when NFT changes
  useEffect(() => {
    const metadata = getNFTMetadata(nft); // Call inside useEffect
    setNftMetadata(metadata); // Update local state
    // Note: getNFTMetadata handles the actual fetching and caching logic internally
  }, [nft, getNFTMetadata]); // Rerun effect if nft prop or context function changes

  // Debug log key generation
  const key = `${nft.did || 'unknown'}-${nft.version || 'unknown'}`;
  log(`NFTCard rendering with key: ${key}`, nft);
  
  // Ensure we have valid data
  const name = nft.name || "Unnamed App";
  const version = nft.version || "Unknown Version";
  const did = nft.did || "Unknown DID";
  
  // Get image/icon from metadata context first, then fall back to NFT metadata
  const image = nftMetadata?.displayData.image || nft.metadata?.image || "";
  const isLoading = nftMetadata?.isLoading || false;
  
  // Determine if we have a valid image to display
  const hasImage = !isLoading && image && image.trim() !== '';
  
  // Get marketing/external URL from metadata context first, then fall back to NFT metadata
  const external_url = nftMetadata?.displayData.external_url || nft.metadata?.external_url || "";
  const status = typeof nft.status === 'number' ? nft.status : 0;

  // Determine available platforms from metadata context first, then fall back to NFT metadata
  const availablePlatformsFromContext = nftMetadata 
    ? Object.keys(nftMetadata.displayData.platforms)
    : [];
  
  // Fall back to NFT metadata platforms if context doesn't have any
  const availablePlatforms = availablePlatformsFromContext.length > 0
    ? availablePlatformsFromContext
    : (!nft.hasError && nft.metadata?.platforms 
        ? Object.keys(platformIcons).filter(platformKey => 
            nft.metadata!.platforms!.hasOwnProperty(platformKey)
          )
        : []);

  const handleCardClick = () => {
    if (!nft.hasError) {
      onNFTCardClick(nft);
    }
  };

  return (
    <Card 
      className={`overflow-hidden transition-all duration-200 border flex flex-col group min-h-[220px] ${nft.hasError ? 'border-red-500 bg-red-50 dark:bg-red-950 opacity-70 cursor-not-allowed' : 'hover:shadow-lg cursor-pointer hover:scale-[1.02] hover:border-blue-500'}`}
      onClick={handleCardClick}
      role="button"
      aria-label={nft.hasError ? `Invalid app data: ${nft.errorMessage}` : `View details for ${name} version ${version}`}
      aria-disabled={nft.hasError}
    >
      {/* Conditional rendering based on image availability */}
      {nft.hasError ? (
        // Error state layout
        <CardHeader className="p-4 pb-2 flex flex-row items-start gap-4">
          <div className="relative w-10 h-10 bg-red-100 dark:bg-red-900 flex items-center justify-center rounded flex-shrink-0">
            <AlertTriangleIcon size={24} className="text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex justify-between items-start gap-2">
              <CardTitle className="text-lg truncate flex-grow text-red-700 dark:text-red-300" title="Invalid App Data">Invalid App Data</CardTitle>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400 mt-1">
              <span>Version: {version}</span>
            </div>
          </div>
        </CardHeader>
      ) : hasImage ? (
        // With-image layout
        <CardHeader className="p-4 pb-2 flex flex-row items-start gap-4">
          <div className="relative w-10 h-10 flex items-center justify-center rounded flex-shrink-0">
            <img
              src={image}
              alt={`${name} icon`}
              width="40"
              height="40"
              className="rounded object-contain"
              loading="lazy"
            />
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex justify-between items-start gap-2">
              <CardTitle className="text-lg truncate flex-grow" title={name}>{name}</CardTitle>
              {showStatus && (
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusClasses(status)} flex-shrink-0`}>
                  {getStatusLabel(status)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400 mt-1">
              <span>Version: {version}</span>
              {external_url && (
                <a 
                  href={external_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 ml-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
                  aria-label={`Visit ${name} website (opens in new tab)`}
                >
                  <ExternalLinkIcon size={16} />
                </a>
              )}
            </div>
          </div>
        </CardHeader>
      ) : (
        // Text-only layout
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-lg truncate flex-grow" title={name}>{name}</CardTitle>
            {showStatus && (
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusClasses(status)} flex-shrink-0`}>
                {getStatusLabel(status)}
              </span>
            )}
          </div>
          <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400 mt-1">
            <span>Version: {version}</span>
            {external_url && (
              <a 
                href={external_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => e.stopPropagation()}
                className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 ml-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
                aria-label={`Visit ${name} website (opens in new tab)`}
              >
                <ExternalLinkIcon size={16} />
              </a>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className="p-4 pt-2 space-y-2 flex-grow">
         {/* Error Message Display */}
         {nft.hasError && (
            <div className="border-t border-red-300 dark:border-red-700 pt-3 mt-3">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Error:</p>
                <p className="text-xs text-red-600 dark:text-red-500">{nft.errorMessage || 'Unknown error.'}</p>
            </div>
         )}
         
         {/* Platform Icons (only if no error) */}
         {!nft.hasError && availablePlatforms.length > 0 && (
           <div className="flex flex-wrap gap-2 items-center border-t pt-3 mt-3">
             <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mr-1">Platforms:</span>
             {availablePlatforms.map(platformKey => (
               <span key={platformKey} title={platformKey.charAt(0).toUpperCase() + platformKey.slice(1)} className="text-slate-500 dark:text-slate-400">
                 {platformIcons[platformKey]}
               </span>
             ))}
           </div>
         )}
         {!nft.hasError && availablePlatforms.length === 0 && (
           <div className="border-t pt-3 mt-3">
             <p className="text-xs text-slate-500 italic">No platform information provided.</p>
           </div>
         )}

        {/* DID and Contract (only if no error) */}
        {!nft.hasError && (
            <>
                <div className="text-sm pt-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">DID: </span>
                  <span className="text-slate-600 dark:text-slate-400 break-all" title={did}>{did}</span>
                </div>
                {nft.contractAddress && (
                  <div className="text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Contract: </span>
                    <span className="text-slate-600 dark:text-slate-400 break-all" title={nft.contractAddress}>{nft.contractAddress}</span>
                  </div>
                )}
            </>
        )}
      </CardContent>
    </Card>
  )
}