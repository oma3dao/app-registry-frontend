'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export function PreAlphaBanner() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Check if banner was previously dismissed
    const isDismissed = sessionStorage.getItem('preAlphaBannerDismissed')
    if (isDismissed) {
      setIsVisible(false)
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    sessionStorage.setItem('preAlphaBannerDismissed', 'true')
  }

  if (!isVisible) return null

  return (
    <div className="relative bg-yellow-100 text-black px-4 py-3 shadow-sm border-b">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p className="text-sm font-medium">
          Pre-Alpha Preview — Smart contracts are deployed to testnets only. Features are incomplete and may change.
        </p>
        <button
          onClick={handleDismiss}
          className="ml-4 p-1 hover:bg-yellow-200 rounded-full transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
} 