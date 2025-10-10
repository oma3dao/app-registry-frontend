import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { PreAlphaBanner } from "@/components/pre-alpha-banner";
import { Navigation } from "@/components/navigation";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { NFTMetadataProvider } from "@/lib/nft-metadata-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OMATrust Registry Developer Portal",
  description: "Register and manage your applications on the OMATrust App Registry",
  keywords: ["OMA3", "OMATrust", "Web3", "App Registry", "Blockchain", "NFT", "Developer Portal"],
  authors: [{ name: "OMA3" }],
  openGraph: {
    title: "OMATrust Registry Developer Portal",
    description: "Register and manage your applications on OMATrust",
    type: "website",
    url: "https://oma3.org",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
       <head>
        <Script
          src="https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=RY5MAa"
          strategy="afterInteractive"
        />
      </head>
     <body className={inter.className}>
        <PreAlphaBanner />
        <ThirdwebProvider>
          <Navigation />
          <NFTMetadataProvider>
            {children}
          </NFTMetadataProvider>
        </ThirdwebProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}