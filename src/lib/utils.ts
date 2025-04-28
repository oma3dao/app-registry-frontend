import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function for conditionally joining class names
 * Combines clsx and tailwind-merge for optimized class handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if the device is mobile based on userAgent
 * Used for displaying appropriate UI/guidance
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent
  
  // Check for common mobile device indicators in user agent
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
}

/**
 * Debounce function
 * @param fn Function to debounce
 * @param ms Milliseconds to wait before invoking the function
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T, 
  ms = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  
  return function(this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      fn.apply(this, args)
      timeoutId = null
    }, ms)
  }
}

/**
 * Builds a versioned DID string in the format DID/v/[version]
 * @param did The base DID string
 * @param version The version
 * @returns The versioned DID string
 * @throws Error if version is undefined
 */
export function buildVersionedDID(did: string, version: string): string {
  if (version === undefined) {
    throw new Error('Version is required');
  }
  return `${did}/v/${version}`
}
