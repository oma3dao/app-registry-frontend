import { MetadataContractData } from './metadata-contract';

export interface NFT {
    did: string   // Primary identifier
    name: string
    version: string
    dataUrl: string
    iwpsPortalUri: string
    agentApiUri: string
    contractAddress?: string
    status: number // 0: Active, 1: Deprecated, 2: Replaced
    minter: string // Ethereum address of the app creator
    
    // Metadata fields
    metadata?: MetadataContractData;
}

/**
 * Application status options used throughout the app
 */
export const APP_STATUSES = [
  { value: 0, label: "Active" },
  { value: 1, label: "Deprecated" },
  { value: 2, label: "Replaced" },
]

/**
 * Helper function to get status label from status value
 */
export const getStatusLabel = (status: number): string => {
  // Ensure status is a number
  if (typeof status !== 'number') {
    console.warn(`Invalid status value: ${status}, using default status (0)`);
    status = 0;
  }
  
  const statusObj = APP_STATUSES.find(s => s.value === status)
  return statusObj?.label || "Unknown"
}

/**
 * Get CSS classes for status badge based on status value
 */
export const getStatusClasses = (status: number): string => {
  // Ensure status is a number
  if (typeof status !== 'number') {
    console.warn(`Invalid status value: ${status}, using default status (0)`);
    status = 0;
  }
  
  return status === 0 ? "bg-green-100 text-green-800" : 
         status === 1 ? "bg-red-100 text-red-800" : 
         status === 2 ? "bg-yellow-100 text-yellow-800" : 
         "bg-gray-100 text-gray-800"
}