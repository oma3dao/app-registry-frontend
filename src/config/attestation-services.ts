import { omachainTestnet, omachainMainnet } from './chains'

// Attestation service configuration
export interface AttestationServiceConfig {
  id: string
  name: string
  description: string
  website: string
  docs: string
  supportedChains: number[]
  contracts: Record<number, string> // chainId -> contract address
  features: string[]
  estimatedGasCost?: Record<number, bigint> // chainId -> gas cost in wei
}

// EAS (Ethereum Attestation Service) Configuration for OMAchain
export const EAS_CONFIG: AttestationServiceConfig = {
  id: 'eas',
  name: 'Ethereum Attestation Service',
  description: 'Decentralized attestation service on OMAchain',
  website: 'https://attest.org/',
  docs: 'https://docs.attest.org/',
  supportedChains: [omachainTestnet.id, omachainMainnet.id],
  contracts: {
    [omachainTestnet.id]: omachainTestnet.contracts.easContract,
    [omachainMainnet.id]: omachainMainnet.contracts.easContract || '0x0000000000000000000000000000000000000000',
  },
  features: [
    'On-chain attestations',
    'Schema registry',
    'Revocation support',
    'Composable attestations',
    'OMAchain native'
  ],
  estimatedGasCost: {
    [omachainTestnet.id]: BigInt('100000'),
    [omachainMainnet.id]: BigInt('100000')
  }
}

// All available attestation services
export const ATTESTATION_SERVICES: Record<string, AttestationServiceConfig> = {
  [EAS_CONFIG.id]: EAS_CONFIG
}

// Helper functions
export function getAttestationService(id: string): AttestationServiceConfig | undefined {
  return ATTESTATION_SERVICES[id]
}

export function getServicesForChain(chainId: number): AttestationServiceConfig[] {
  return Object.values(ATTESTATION_SERVICES).filter(
    service => service.supportedChains.includes(chainId)
  )
}

export function getContractAddress(serviceId: string, chainId: number): string | undefined {
  const service = getAttestationService(serviceId)
  return service?.contracts[chainId]
}

export function getAllServiceIds(): string[] {
  return Object.keys(ATTESTATION_SERVICES)
}

// Query configuration for fetching latest attestations
export const ATTESTATION_QUERY_CONFIG = {
  // Progressive block ranges to try when querying for attestations
  // Tries smaller ranges first for efficiency, expands if needed
  blockRanges: [
    { blocks: 1000, label: '~30 minutes' },
    { blocks: 10000, label: '~5 hours' },
    { blocks: 1000000, label: '~20 days' }
  ],
  // Default number of attestations to display
  defaultLimit: 20,
  // Safety multiplier when fetching events (to account for filtering)
  fetchMultiplier: 2
} 