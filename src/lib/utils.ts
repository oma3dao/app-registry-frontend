import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Checks if the user is on a mobile device based on the user agent
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent
  
  // Check for common mobile device indicators in user agent
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
}
