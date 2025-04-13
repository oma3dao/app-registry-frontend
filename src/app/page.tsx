"use client";

import Image from "next/image";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client } from "./client";
import { useState } from "react"
import LandingPage from "../components/landing-page"
import Dashboard from "../components/dashboard"

export default function Home() {
  const account = useActiveAccount();

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {!account ? <LandingPage /> : <Dashboard />}
    </main>
  )
}
