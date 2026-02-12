/**
 * Controller Witness Allowlists
 *
 * Chains and EAS contracts that the witness server will accept.
 *
 * Schema approval is now derived from schemas.ts — any schema with a
 * `witness` config and a non-zero deployedUID is automatically approved.
 * Field mappings (subjectField, controllerField) come from the schema's
 * `witness` block too. No manual UID list to maintain.
 *
 * To approve a new chain: add an entry to APPROVED_WITNESS_CHAINS.
 */

import { omachainTestnet } from './chains';

/** chainId → EAS contract address */
export const APPROVED_WITNESS_CHAINS: Record<number, string> = {
  [omachainTestnet.id]: omachainTestnet.contracts.easContract,
  // [omachainMainnet.id]: omachainMainnet.contracts.easContract, // enable when deployed
};

export const APPROVED_CONTROLLER_WITNESS_ATTESTERS: Record<number, string[]> = {
  // Testnet issuers (from contract-addresses.txt)
  66238: [
    '0x7D5beD223Bc343F114Aa28961Cc447dbbc9c2330',
    '0x766910dc543034ce7a6525c1307c5b6fe92ebb0b',
  ],
  // Mainnet issuers — will differ from testnet
  // 6623: [],
};
