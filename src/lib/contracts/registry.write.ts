/**
 * Pure functions for preparing write transactions to the OMA3 App Registry contract
 * These functions prepare transactions but do NOT send them (that's done in hooks with account)
 */

import { prepareContractCall } from 'thirdweb';
import { getRegistryContract } from './client';
import { appRegistryLegacyAbi } from './abi/appRegistry.legacy.abi';
import { celoAlfajores } from '@/config/chains';
import { normalizeEvmError } from './errors';
import type { Status, MintAppInput } from './types';

// Use the existing contract address from config
const REGISTRY_ADDRESS = celoAlfajores.contracts.OMA3AppRegistry;

/**
 * Prepare a transaction to mint/register a new app
 * @param input App data for minting
 * @returns Prepared transaction ready to be sent with an account
 */
export function prepareMintApp(input: MintAppInput) {
  try {
    const contract = getRegistryContract(appRegistryLegacyAbi, REGISTRY_ADDRESS);
    
    // Convert name and version to bytes32 for legacy contract
    const nameBytes32 = ('0x' + Buffer.from(input.name.padEnd(32, '\0')).toString('hex')) as `0x${string}`;
    const versionBytes32 = ('0x' + Buffer.from(input.version.padEnd(32, '\0')).toString('hex')) as `0x${string}`;
    
    return prepareContractCall({
      contract,
      method: 'function mint(string, bytes32, bytes32, string, string, string, string) returns (bool)',
      params: [
        input.did,
        nameBytes32,
        versionBytes32,
        input.dataUrl || '',
        input.iwpsPortalUri || '',
        input.agentApiUri || '',
        input.contractAddress || '',
      ],
    });
  } catch (e) {
    throw normalizeEvmError(e);
  }
}

/**
 * Prepare a transaction to update an app's status
 * @param did The DID of the app to update
 * @param status The new status
 * @returns Prepared transaction ready to be sent with an account
 */
export function prepareUpdateStatus(did: string, status: Status) {
  try {
    const contract = getRegistryContract(appRegistryLegacyAbi, REGISTRY_ADDRESS);
    
    // Map Status to number for legacy contract
    const statusNum = status === 'Active' ? 0 : status === 'Inactive' ? 1 : 2;
    
    return prepareContractCall({
      contract,
      method: 'function updateStatus(string, uint8) returns (bool)',
      params: [did, statusNum],
    });
  } catch (e) {
    throw normalizeEvmError(e);
  }
}
