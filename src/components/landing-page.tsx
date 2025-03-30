"use client"

import { Button } from "@/components/ui/button"

interface LandingPageProps {
  onConnect: () => void
}

export default function LandingPage({ onConnect }: LandingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          <span className="block text-primary">NFT App Registry</span>
          <span className="block text-slate-700 dark:text-slate-300">for Developers</span>
        </h1>

        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Mint NFTs to register and manage your applications on the blockchain. Secure, transparent, and decentralized
          app management for developers.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button size="lg" className="text-lg px-8 py-6" onClick={onConnect}>
            Get Started
          </Button>
        </div>

        <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium mb-2">Mint App NFTs</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Register your applications as unique NFTs on the blockchain
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium mb-2">Manage Ownership</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Transfer, update, or revoke access to your registered applications
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium mb-2">Developer Tools</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Access developer-focused tools and analytics for your app NFTs
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

