"use client"

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
  ps5: <Gamepad2 size={16} aria-label="PlayStation" />, // Using generic gamepad
  xbox: <Gamepad2 size={16} aria-label="Xbox" />, // Using generic gamepad
  nintendo: <Gamepad2 size={16} aria-label="Nintendo Switch" />, // Using generic gamepad
};

export default function NFTCard({ nft, onNFTCardClick, showStatus = true }: NFTCardProps) {
  // Debug log key generation
  const key = `${nft.did || 'unknown'}-${nft.version || 'unknown'}`;
  log(`NFTCard rendering with key: ${key}`, nft);
  
  // Ensure we have valid data
  const name = nft.name || "Unnamed App";
  const version = nft.version || "Unknown Version";
  const did = nft.did || "Unknown DID";
  // Get image/icon and marketing/external URL from metadata
  const imageUrl = nft.metadata?.iconUrl || ""; // Maps to "image" key
  const externalUrl = nft.metadata?.marketingUrl || ""; // Maps to "external_url" key
  const status = typeof nft.status === 'number' ? nft.status : 0;

  // Determine available platforms by checking the nested structure
  const availablePlatforms = !nft.hasError && nft.metadata?.platforms 
    ? Object.keys(platformIcons).filter(platformKey => 
        // Check if the platform key exists in the nft's metadata.platforms object
        nft.metadata!.platforms!.hasOwnProperty(platformKey)
      )
    : [];

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
      <CardHeader className="p-4 pb-2 flex flex-row items-start gap-4">
        <div className={`relative w-10 h-10 bg-slate-200 dark:bg-slate-800 flex items-center justify-center rounded flex-shrink-0 ${nft.hasError ? 'bg-red-100 dark:bg-red-900' : ''}`}>
          {nft.hasError ? (
            <AlertTriangleIcon size={24} className="text-red-600 dark:text-red-400" />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={`${name} icon`}
              width="40"
              height="40"
              className="rounded object-contain"
              loading="lazy"
            />
          ) : (
            <ImageIcon size={24} className="text-slate-400 dark:text-slate-600" aria-hidden="true" />
          )}
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className={`text-lg truncate flex-grow ${nft.hasError ? 'text-red-700 dark:text-red-300' : ''}`} title={name}> {nft.hasError ? 'Invalid App Data' : name} </CardTitle>
            {!nft.hasError && showStatus && (
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusClasses(status)} flex-shrink-0`}>
                {getStatusLabel(status)}
              </span>
            )}
          </div>
          <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400 mt-1">
            <span>Version: {version}</span>
            {externalUrl && (
              <a 
                href={externalUrl} 
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