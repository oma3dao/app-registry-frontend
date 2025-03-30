"use client"

import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          <span className="block text-primary">OMA3 App Registry</span>
          <span className="block text-slate-700 dark:text-slate-300">Developer Portal</span>
        </h1>

        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Register your applications as NFTs on the blockchain to make them discoverable by any application store, including OMA3's Spatial Store.<br/><br/>Connect your wallet to get started.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button isConnectButton />
        </div>

        <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium mb-2">Register</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Register your applications
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium mb-2">Manage</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Update the status of your applications
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium mb-2">Dev Tools</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

