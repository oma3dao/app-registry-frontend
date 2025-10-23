import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PreAlphaBanner } from "@/components/pre-alpha-banner";
import { Navigation } from "@/components/navigation";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import { supportedWalletChains } from "@/config/chains";
import { defineChain } from "thirdweb/chains";
import { client } from "./client";

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

// Map configured wallet chains to thirdweb chain definitions
const supportedChains = supportedWalletChains.map((chain) =>
  defineChain({
    id: chain.id,
    rpc: chain.rpc,
    name: chain.name,
    nativeCurrency: chain.nativeCurrency,
    blockExplorers: chain.blockExplorers,
  })
);

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
        <Providers>
          <Navigation />
          {children}
        </Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}