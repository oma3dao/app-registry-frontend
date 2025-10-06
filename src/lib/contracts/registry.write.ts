/**
 * Pure functions for preparing write transactions to the OMA3 App Registry contract
 * These functions prepare transactions but do NOT send them (that's done in hooks with account)
 * 
 * KEY ARCHITECTURE:
 * - All updates use DID + major version, not tokenIds
 * - Mint function takes 12 parameters
 * - Status enum: 0=Active, 1=Deprecated, 2=Replaced
 */

import { prepareContractCall } from 'thirdweb';
import { getAppRegistryContract } from './client';
import { normalizeEvmError } from './errors';
import type { Status, MintAppInput, UpdateAppInput, UpdateStatusInput } from './types';
import { normalizeDidWeb } from '../utils/did';

/**
 * Convert Status to number
 */
function statusToNumber(status: Status): number {
  switch (status) {
    case 'Active': return 0;
    case 'Deprecated': return 1;
    case 'Replaced': return 2;
    default: return 0;
  }
}

/**
 * Prepare a transaction to mint/register a new app
 * 
 * Contract signature (12 parameters):
 * function mint(
 *   string didString,
 *   uint16 interfaces,
 *   string dataUrl,
 *   bytes32 dataHash,
 *   uint8 dataHashAlgorithm,
 *   string fungibleTokenId,
 *   string contractId,
 *   uint8 initialVersionMajor,
 *   uint8 initialVersionMinor,
 *   uint8 initialVersionPatch,
 *   bytes32[] traitHashes,
 *   string metadataJson
 * ) returns (uint256 tokenId)
 * 
 * @param input App data for minting
 * @returns Prepared transaction ready to be sent with an account
 */
export function prepareMintApp(input: MintAppInput) {
  try {
    const contract = getAppRegistryContract();
    const normalizedDid = normalizeDidWeb(input.did);
    
    return prepareContractCall({
      contract,
      method: 'function mint(string, uint16, string, bytes32, uint8, string, string, uint8, uint8, uint8, bytes32[], string) returns (uint256)',
      params: [
        normalizedDid,                                          // 1. didString
        input.interfaces,                                      // 2. interfaces bitmap
        input.dataUrl,                                         // 3. dataUrl
        input.dataHash as `0x${string}`,                      // 4. dataHash
        input.dataHashAlgorithm,                              // 5. dataHashAlgorithm
        input.fungibleTokenId || '',                          // 6. fungibleTokenId (empty if not applicable)
        input.contractId || '',                               // 7. contractId (empty if not applicable)
        input.initialVersionMajor,                            // 8. initialVersionMajor
        input.initialVersionMinor,                            // 9. initialVersionMinor
        input.initialVersionPatch,                            // 10. initialVersionPatch
        (input.traitHashes || []).map(h => h as `0x${string}`), // 11. traitHashes
        input.metadataJson || '',                             // 12. metadataJson (empty to skip)
      ],
    });
  } catch (e) {
    console.error('[registry.write] Error preparing mint:', e);
    throw normalizeEvmError(e);
  }
}

/**
 * Prepare a transaction to update an app's status
 * 
 * @param input Status update data (DID + major + new status)
 * @returns Prepared transaction ready to be sent with an account
 */
export function prepareUpdateStatus(input: UpdateStatusInput) {
  try {
    const contract = getAppRegistryContract();
    const normalizedDid = normalizeDidWeb(input.did);
    const statusNum = statusToNumber(input.status);
    
    return prepareContractCall({
      contract,
      method: 'function updateStatus(string, uint8, uint8) external',
      params: [normalizedDid, input.major, statusNum],
    });
  } catch (e) {
    console.error('[registry.write] Error preparing status update:', e);
    throw normalizeEvmError(e);
  }
}

/**
 * Prepare a transaction to update app data, interfaces, and/or traits
 * 
 * Contract signature:
 * function updateAppControlled(
 *   string didString,
 *   uint8 major,
 *   string newDataUrl,
 *   bytes32 newDataHash,
 *   uint8 newDataHashAlgorithm,
 *   uint16 newInterfaces,
 *   bytes32[] newTraitHashes,
 *   uint8 newMinor,
 *   uint8 newPatch
 * )
 * 
 * @param input Update data
 * @returns Prepared transaction ready to be sent with an account
 */
export function prepareUpdateApp(input: UpdateAppInput) {
  try {
    const contract = getAppRegistryContract();
    const normalizedDid = normalizeDidWeb(input.did);
    
    return prepareContractCall({
      contract,
      method: 'function updateAppControlled(string, uint8, string, bytes32, uint8, uint16, bytes32[], uint8, uint8) external',
      params: [
        normalizedDid,                                         // didString
        input.major,                                          // major
        input.newDataUrl || '',                               // newDataUrl (empty = no change)
        (input.newDataHash as `0x${string}`) || '0x0000000000000000000000000000000000000000000000000000000000000000', // newDataHash (bytes32(0) = no change)
        input.newDataHashAlgorithm || 0,                      // newDataHashAlgorithm (0 = no change)
        input.newInterfaces || 0,                             // newInterfaces (0 = no change)
        (input.newTraitHashes || []).map(h => h as `0x${string}`), // newTraitHashes (empty = no change)
        input.newMinor,                                       // newMinor
        input.newPatch,                                       // newPatch
      ],
    });
  } catch (e) {
    console.error('[registry.write] Error preparing app update:', e);
    throw normalizeEvmError(e);
  }
}
