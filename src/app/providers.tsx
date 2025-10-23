"use client";

import { ThirdwebProvider } from "thirdweb/react";
import { NFTMetadataProvider } from "@/lib/nft-metadata-context";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ThirdwebProvider>
      <NFTMetadataProvider>
        {children}
      </NFTMetadataProvider>
    </ThirdwebProvider>
  );
}


