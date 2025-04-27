"use client"

import { useState, useEffect, useCallback } from 'react'
import { CheckCircleIcon, XCircleIcon, Loader2Icon, ExternalLinkIcon } from 'lucide-react'
import { validateUrl } from '@/lib/validation'
import { debounce } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface UrlValidatorProps {
  url: string
  className?: string
}

/**
 * Simple URL validator component that shows a green check or red X
 * Uses a lightweight API endpoint that just checks URL accessibility
 */
export function UrlValidator({ url, className = '' }: UrlValidatorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [hostname, setHostname] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  
  const checkUrl = async (urlToCheck: string) => {
    // Don't check if URL is empty or invalid format
    if (!urlToCheck || !validateUrl(urlToCheck)) {
      setIsValid(false)
      setError('Invalid URL format')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Extract hostname for display
      const urlObj = new URL(urlToCheck)
      setHostname(urlObj.hostname)
      
      const response = await fetch('/api/validate-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlToCheck }),
      })
      
      const data = await response.json()
      
      // Set validity based on the response
      setIsValid(data.isValid)
      
      // If not valid, set error message
      if (!data.isValid) {
        setError(data.error || 'URL is not accessible')
      }
      
    } catch (err) {
      setIsValid(false)
      setError('Failed to validate URL')
      console.error('Error validating URL:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Create debounced version of the check function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedCheck = useCallback(
    debounce((urlToCheck: string) => checkUrl(urlToCheck), 800),
    []
  )
  
  // Reset and check when URL changes
  useEffect(() => {
    // Reset states
    setIsValid(null)
    setError(null)
    
    if (url && validateUrl(url)) {
      debouncedCheck(url)
    } else if (url) {
      // URL present but invalid format
      setIsValid(false)
      setError('Invalid URL format')
      setIsLoading(false)
    } else {
      // Empty URL
      setIsValid(null)
      setError(null)
      setIsLoading(false)
    }
  }, [url, debouncedCheck])
  
  // Don't render anything if URL is empty
  if (!url) {
    return null
  }
  
  return (
    <div className={`flex items-center gap-2 mt-1 ${className}`}>
      {isLoading ? (
        <Loader2Icon className="h-4 w-4 text-blue-500 animate-spin" />
      ) : isValid === true ? (
        <CheckCircleIcon className="h-4 w-4 text-green-500" />
      ) : isValid === false ? (
        <XCircleIcon className="h-4 w-4 text-red-500" />
      ) : null}
      
      {hostname && (
        <span className="text-xs text-slate-500">{hostname}</span>
      )}
      
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
      
      {isValid && (
        <Button 
          variant="link" 
          size="sm" 
          asChild 
          className="p-0 h-auto text-xs ml-auto"
        >
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center"
          >
            Open <ExternalLinkIcon className="h-3 w-3 ml-1" />
          </a>
        </Button>
      )}
    </div>
  )
} 