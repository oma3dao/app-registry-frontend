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
 * Prepare a transaction to mint/register a new app using native mint function
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
    console.log('⚡ [prepareMintApp] Preparing native mint() transaction with 12 parameters');
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
 * Prepare a transaction to register a new app using ERC-8004 register function
 * 
 * Contract signature:
 * function register(
 *   string memory _tokenURI,
 *   MetadataEntry[] memory _metadata
 * ) returns (uint256 tokenId)
 * 
 * MetadataEntry: { string key, bytes value }
 * 
 * @param input App data for registration
 * @returns Prepared transaction ready to be sent with an account
 */
export function prepareRegisterApp8004(input: MintAppInput) {
  try {
    console.log('🔵 [prepareRegisterApp8004] Preparing ERC-8004 register() transaction with metadata array');
    const contract = getAppRegistryContract();
    const normalizedDid = normalizeDidWeb(input.did);

    // Import viem's encodeAbiParameters for proper ABI encoding
    // The contract uses abi.decode(), so we must use abi.encode() format
    const { encodeAbiParameters } = require('viem');
    
    const abiEncodeString = (str: string): `0x${string}` => {
      return encodeAbiParameters([{ type: 'string' }], [str]);
    };
    
    const abiEncodeUint8 = (num: number): `0x${string}` => {
      return encodeAbiParameters([{ type: 'uint8' }], [num]);
    };
    
    const abiEncodeUint16 = (num: number): `0x${string}` => {
      return encodeAbiParameters([{ type: 'uint16' }], [num]);
    };
    
    const abiEncodeBytes32Array = (arr: string[]): `0x${string}` => {
      return encodeAbiParameters([{ type: 'bytes32[]' }], [arr as `0x${string}`[]]);
    };

    // Build metadata array according to ERC-8004 spec
    // MetadataEntry: { string key, bytes value }
    // IMPORTANT: Keys must match OMA3MetadataKeys constants (e.g., "omat.did")
    // IMPORTANT: Values must be ABI-encoded because contract uses abi.decode()
    const metadata: Array<{ key: string; value: `0x${string}` }> = [
      { key: 'omat.did', value: abiEncodeString(normalizedDid) },
      { key: 'omat.interfaces', value: abiEncodeUint16(input.interfaces) },
      { key: 'omat.dataHash', value: input.dataHash as `0x${string}` }, // Already bytes32
      { key: 'omat.dataHashAlgorithm', value: abiEncodeUint8(input.dataHashAlgorithm) },
      { key: 'omat.versionMajor', value: abiEncodeUint8(input.initialVersionMajor) },
      { key: 'omat.versionMinor', value: abiEncodeUint8(input.initialVersionMinor) },
      { key: 'omat.versionPatch', value: abiEncodeUint8(input.initialVersionPatch) },
    ];

    // Add optional fields if provided
    if (input.fungibleTokenId) {
      metadata.push({ key: 'omat.fungibleTokenId', value: abiEncodeString(input.fungibleTokenId) });
    }
    if (input.contractId) {
      metadata.push({ key: 'omat.contractId', value: abiEncodeString(input.contractId) });
    }
    if (input.traitHashes && input.traitHashes.length > 0) {
      metadata.push({ key: 'omat.traitHashes', value: abiEncodeBytes32Array(input.traitHashes) });
    }
    if (input.metadataJson) {
      metadata.push({ key: 'omat.metadataJson', value: abiEncodeString(input.metadataJson) });
    }

    console.log(`🔵 [prepareRegisterApp8004] Metadata array contains ${metadata.length} entries:`, 
      metadata.map(m => m.key).join(', '));
    console.log('🔵 [prepareRegisterApp8004] Sample metadata entry:', metadata[0]);
    console.log('🔵 [prepareRegisterApp8004] Full metadata array:', JSON.stringify(metadata, null, 2));

    // Try using the ABI directly instead of method string
    // This might work better with thirdweb's type system
    try {
      return prepareContractCall({
        contract,
        method: {
          name: 'register',
          type: 'function',
          inputs: [
            { name: '_tokenURI', type: 'string' },
            { 
              name: '_metadata', 
              type: 'tuple[]',
              components: [
                { name: 'key', type: 'string' },
                { name: 'value', type: 'bytes' }
              ]
            }
          ],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'nonpayable'
        },
        params: [input.dataUrl, metadata],
      });
    } catch (abiError) {
      console.error('🔵 [prepareRegisterApp8004] ABI method failed, trying string method:', abiError);
      // Fallback to string method
      return prepareContractCall({
        contract,
        method: 'function register(string, tuple(string key, bytes value)[]) returns (uint256)',
        params: [input.dataUrl, metadata as any],
      } as any);
    }
  } catch (e) {
    console.error('[registry.write] Error preparing ERC-8004 register:', e);
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
 *   uint8 newPatch,
 *   string metadataJson
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
      method: 'function updateAppControlled(string, uint8, string, bytes32, uint8, uint16, bytes32[], uint8, uint8, string) external',
      params: [
        normalizedDid,                                         // 1. didString
        input.major,                                          // 2. major
        input.newDataUrl || '',                               // 3. newDataUrl (empty = no change)
        (input.newDataHash as `0x${string}`) || '0x0000000000000000000000000000000000000000000000000000000000000000', // 4. newDataHash (bytes32(0) = no change)
        input.newDataHashAlgorithm || 0,                      // 5. newDataHashAlgorithm (0 = no change)
        input.newInterfaces || 0,                             // 6. newInterfaces (0 = no change)
        (input.newTraitHashes || []).map(h => h as `0x${string}`), // 7. newTraitHashes (empty = no change)
        input.newMinor,                                       // 8. newMinor
        input.newPatch,                                       // 9. newPatch
        input.metadataJson || '',                             // 10. metadataJson (empty to skip)
      ],
    });
  } catch (e) {
    console.error('[registry.write] Error preparing app update:', e);
    throw normalizeEvmError(e);
  }
}
