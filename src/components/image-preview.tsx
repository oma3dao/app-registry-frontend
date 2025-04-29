"use client"

import { useState, useEffect, useCallback } from 'react'
import { ExternalLinkIcon, AlertCircleIcon, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { validateUrl } from '@/lib/validation'
import { debounce } from '@/lib/utils'

interface ImagePreviewProps {
  url: string
  className?: string
  alt?: string
}

/**
 * Component to preview an image from a URL
 * Shows a thumbnail of the image with loading and error states
 */
export function ImagePreview({ url, className = '', alt = 'Image preview' }: ImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [debouncedUrl, setDebouncedUrl] = useState<string>('')
  
  const updateDebouncedUrl = useCallback(
    debounce((newUrl: string) => {
      setDebouncedUrl(newUrl)
    }, 800),
    []
  )
  
  useEffect(() => {
    if (url && validateUrl(url)) {
      updateDebouncedUrl(url)
    } else {
      setDebouncedUrl('')
    }
  }, [url, updateDebouncedUrl])
  
  useEffect(() => {
    setIsLoading(true)
    setError(null)
    setDimensions(null)
    
    if (!debouncedUrl || !validateUrl(debouncedUrl)) {
      setIsLoading(false)
      return
    }
    
    const img = new Image()
    
    img.onload = () => {
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
      setIsLoading(false)
      setError(null)
    }
    
    img.onerror = () => {
      setError('Failed to load image')
      setIsLoading(false)
      setDimensions(null)
    }
    
    img.src = debouncedUrl
  }, [debouncedUrl])
  
  if (!url || !validateUrl(url)) {
    return null
  }
  
  return (
    <div className={`mt-2 ${className}`}>
      {isLoading ? (
        <div className="py-3 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">Loading image...</span>
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 text-red-600 text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
          <AlertCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : debouncedUrl ? (
        <Card className="overflow-hidden border-slate-200">
          <CardContent className="p-3">
            <div className="rounded-md overflow-hidden border border-slate-200 bg-slate-50 dark:bg-slate-800">
              <img 
                src={debouncedUrl} 
                alt={alt}
                className="max-h-[200px] w-auto mx-auto object-contain"
              />
            </div>
            
            {dimensions && (
              <div className="text-xs text-slate-500 mt-2">
                {dimensions.width} × {dimensions.height} px
              </div>
            )}
            
            <a 
              href={debouncedUrl || url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 dark:text-blue-400 text-xs flex items-center mt-2 hover:underline"
            >
              View full image <ExternalLinkIcon className="h-3 w-3 ml-1" />
            </a>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
} 