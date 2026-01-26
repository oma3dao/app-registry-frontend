/**
 * Attestation Query Utilities for App Registry
 * 
 * Functions for querying attestations by DID subject
 */

import { EAS, SchemaEncoder } from '@ethereum-attestation-service/eas-sdk'
import { ethers } from 'ethers'
import { getAllSchemas, type AttestationSchema } from '@/config/schemas'
import { getContractAddress } from '@/config/attestation-services'
import { didToAddress } from '@/lib/utils/did';
import { log } from '@/lib/log'

const OMACHAIN_TESTNET_RPC = 'https://rpc.testnet.chain.oma3.org/'
const OMACHAIN_TESTNET_ID = 66238

// Minimum number of attestations before including unversioned attestations
const MIN_ATTESTATIONS_THRESHOLD = 10

export interface AttestationQueryResult {
    uid: string
    attester: string
    recipient: string
    data: string
    time: number
    expirationTime: number
    revocationTime: number
    refUID: string
    revocable: boolean
    schemaId?: string
    schemaTitle?: string
    decodedData?: Record<string, any>
}

/**
 * Extract major version from a semver string (e.g., "1.2.3" -> "1")
 */
export function getMajorVersion(version: string | undefined): string | undefined {
    if (!version) return undefined
    const match = version.match(/^(\d+)/)
    return match ? match[1] : undefined
}

/**
 * Get attestations for a specific DID (by subject field)
 * @param did - The DID to query attestations for
 * @param limit - Maximum number of attestations to return
 * @param majorVersion - Optional major version to filter by (only include attestations with matching major version)
 * @returns Promise resolving to attestations for this DID
 */
export async function getAttestationsForDID(
    did: string,
    limit: number = 5,
    majorVersion?: string
): Promise<AttestationQueryResult[]> {
    try {
        const chainId = OMACHAIN_TESTNET_ID
        
        // Get EAS contract address
        const easContractAddress = getContractAddress('eas', chainId)
        log(`[AttestationQuery] EAS contract address for chain ${chainId}: ${easContractAddress}`)
        
        if (!easContractAddress) {
            throw new Error(`EAS not deployed on chain ${chainId}`)
        }

        // Get all schemas
        const schemas = getAllSchemas()
        const deployedSchemas = schemas.filter(schema => {
            const uid = schema.deployedUIDs?.[chainId]
            return uid && uid !== '0x0000000000000000000000000000000000000000000000000000000000000000'
        })

        log(`[AttestationQuery] Found ${deployedSchemas.length} deployed schemas`)
        
        if (deployedSchemas.length === 0) {
            log('[AttestationQuery] No schemas deployed')
            return []
        }

        // Setup provider and EAS
        const provider = new ethers.JsonRpcProvider(OMACHAIN_TESTNET_RPC)
        const eas = new EAS(easContractAddress)
        eas.connect(provider as any)

        // Compute DID address for querying attestations
        const didAddress = didToAddress(did)
        
        log(`[AttestationQuery] Querying attestations for DID: ${did}`)
        log(`[AttestationQuery] DID Address: ${didAddress}`)

        // Setup contract for querying
        const contract = new ethers.Contract(
            easContractAddress,
            ['event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)'],
            provider
        )

        const currentBlock = await provider.getBlockNumber()
        const startBlock = Math.max(0, currentBlock - 50000) // ~28 hours

        log(`[AttestationQuery] Querying blocks ${startBlock} to ${currentBlock}`)
        
        // Query events where recipient = didAddress
        const filter = contract.filters.Attested(didAddress)
        const events = await contract.queryFilter(filter, startBlock, currentBlock)

        log(`[AttestationQuery] Found ${events.length} events for DID`)

        // Process events (newest first)
        // Collect version-matched and unversioned attestations separately
        const versionMatchedAttestations: AttestationQueryResult[] = []
        const unversionedAttestations: AttestationQueryResult[] = []

        for (let i = events.length - 1; i >= 0; i--) {
            const event = events[i]
            
            try {
                // Type guard for EventLog
                if (!('args' in event)) continue
                
                const uid = event.args?.uid
                const schemaUID = event.args?.schemaUID

                if (!uid || !schemaUID) continue

                // Find matching schema
                const schema = deployedSchemas.find(s => 
                    s.deployedUIDs?.[chainId] === schemaUID
                )

                if (!schema) continue

                // Fetch full attestation data
                const attestation = await eas.getAttestation(uid)
                
                // Decode the attestation data
                const decodedData = decodeAttestationData(schema, attestation.data)

                // Verify this attestation is actually for our DID
                // (recipient is index address, but subject should match the DID)
                if (decodedData.subject !== did) {
                    log(`[AttestationQuery] Skipping - subject mismatch: ${decodedData.subject} !== ${did}`)
                    continue
                }

                const attestationResult: AttestationQueryResult = {
                    uid: attestation.uid,
                    attester: attestation.attester,
                    recipient: attestation.recipient,
                    data: attestation.data,
                    time: Number(attestation.time),
                    expirationTime: Number(attestation.expirationTime),
                    revocationTime: Number(attestation.revocationTime),
                    refUID: attestation.refUID,
                    revocable: attestation.revocable,
                    schemaId: schema.id,
                    schemaTitle: schema.title,
                    decodedData
                }

                // Categorize by version match
                if (majorVersion) {
                    const attestationMajorVersion = getMajorVersion(decodedData.version)
                    if (attestationMajorVersion === majorVersion) {
                        versionMatchedAttestations.push(attestationResult)
                    } else if (!attestationMajorVersion) {
                        // No version specified in attestation - collect separately
                        unversionedAttestations.push(attestationResult)
                    } else {
                        log(`[AttestationQuery] Skipping - major version mismatch: ${attestationMajorVersion} !== ${majorVersion}`)
                    }
                } else {
                    // No version filter - include all
                    versionMatchedAttestations.push(attestationResult)
                }

                // Stop if we have enough in both buckets
                if (versionMatchedAttestations.length >= limit && unversionedAttestations.length >= limit) {
                    break
                }
            } catch (err) {
                log('[AttestationQuery] Error processing event:', err)
            }
        }

        // Combine results: version-matched first, then fill with unversioned if below threshold
        let attestations = versionMatchedAttestations.slice(0, limit)
        
        if (majorVersion && attestations.length < MIN_ATTESTATIONS_THRESHOLD) {
            const remaining = limit - attestations.length
            const unversionedToAdd = unversionedAttestations.slice(0, remaining)
            attestations = [...attestations, ...unversionedToAdd]
            log(`[AttestationQuery] Added ${unversionedToAdd.length} unversioned attestations (below threshold of ${MIN_ATTESTATIONS_THRESHOLD})`)
        }

        log(`[AttestationQuery] Returning ${attestations.length} attestations (${versionMatchedAttestations.length} version-matched, ${unversionedAttestations.length} unversioned)`)
        return attestations

    } catch (error) {
        log('[AttestationQuery] Failed to get attestations:', error)
        return []
    }
}

/**
 * Deduplicate attestations by keeping only the latest per attester+subject+version combination.
 * This implements the supersession logic defined in the spec: when a user submits multiple
 * reviews for the same subject (and version), only the most recent one should be considered.
 * 
 * @param attestations - List of attestations (should already be sorted newest first)
 * @returns Deduplicated list with only the latest attestation per attester+subject+version
 */
export function deduplicateReviews(attestations: AttestationQueryResult[]): AttestationQueryResult[] {
    const seen = new Map<string, AttestationQueryResult>()
    
    for (const attestation of attestations) {
        if (attestation.schemaId !== 'user-review') {
            continue
        }
        
        // Create unique key from attester + subject + version
        const subject = attestation.decodedData?.subject || ''
        const version = attestation.decodedData?.version || ''
        const key = `${attestation.attester}|${subject}|${version}`
        
        // Keep only the first (newest) attestation for each key
        // Since attestations are sorted newest first, we skip if we've already seen this key
        if (!seen.has(key)) {
            seen.set(key, attestation)
        }
    }
    
    return Array.from(seen.values())
}

/**
 * Calculate average rating from user review attestations
 * Automatically deduplicates reviews to only count the latest per attester+subject+version
 * @param attestations - List of attestations
 * @returns Average rating and count
 */
export function calculateAverageRating(attestations: AttestationQueryResult[]): { average: number, count: number } {
    // First deduplicate to get only latest review per attester+subject+version
    const dedupedReviews = deduplicateReviews(attestations)
    
    const reviews = dedupedReviews.filter(a => 
        a.schemaId === 'user-review' && 
        (a.decodedData?.ratingValue || a.decodedData?.rating) &&
        a.revocationTime === 0 // Not revoked
    )

    if (reviews.length === 0) {
        return { average: 0, count: 0 }
    }

    const sum = reviews.reduce((total, review) => {
        const ratingValue = review.decodedData?.ratingValue || review.decodedData?.rating;
        const rating = typeof ratingValue === 'bigint' ? Number(ratingValue) : Number(ratingValue || 0);
        return total + rating
    }, 0)

    return {
        average: sum / reviews.length,
        count: reviews.length
    }
}

/**
 * Decode attestation data using schema definition
 */
function decodeAttestationData(schema: AttestationSchema, encodedData: string): Record<string, any> {
    try {
        const schemaString = schema.fields.map(field => {
            let solidityType: string
            switch (field.type) {
                case 'integer':
                    solidityType = field.max && field.max <= 255 ? 'uint8' : 'uint256'
                    break
                case 'datetime':
                case 'uri':
                case 'enum':
                    solidityType = 'string'
                    break
                case 'array':
                    solidityType = 'string[]'
                    break
                default:
                    solidityType = 'string'
                    break
            }
            return `${solidityType} ${field.name}`
        }).join(',')

        const encoder = new SchemaEncoder(schemaString)
        const decoded = encoder.decodeData(encodedData)

        const result: Record<string, any> = {}
        decoded.forEach((item: any) => {
            // EAS decoded data has structure: { name, type, value: { value, type, name } }
            // We want the innermost value, not the wrapper object
            if (item.value && typeof item.value === 'object' && 'value' in item.value) {
                result[item.name] = item.value.value
            } else {
                result[item.name] = item.value
            }
        })

        return result
    } catch (err) {
        log('[AttestationQuery] Error decoding:', err)
        return {}
    }
}
