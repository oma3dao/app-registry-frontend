/**
 * Pure functions for preparing write transactions to the OMA3 App Registry contract
 * These functions prepare transactions but do NOT send them (that's done in hooks with account)
 */

import { prepareContractCall } from 'thirdweb';
import { getAppRegistryContract } from './client';
import { normalizeEvmError } from './errors';
import type { Status, MintAppInput } from './types';
import { stringToBytes32 } from '../utils/bytes32';
import { statusToNumber } from '../utils/status';

/**
 * Prepare a transaction to mint/register a new app
 * @param input App data for minting
 * @returns Prepared transaction ready to be sent with an account
 */
export function prepareMintApp(input: MintAppInput) {
  try {
    const contract = getAppRegistryContract();
    
    // Convert name and version to bytes32 using utility
    const nameBytes32 = stringToBytes32(input.name);
    const versionBytes32 = stringToBytes32(input.version);
    
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
    const contract = getAppRegistryContract();
    
    // Convert Status to number using utility
    const statusNum = statusToNumber(status);
    
    return prepareContractCall({
      contract,
      method: 'function updateStatus(string, uint8) returns (bool)',
      params: [did, statusNum],
    });
  } catch (e) {
    throw normalizeEvmError(e);
  }
}
