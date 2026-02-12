/**
 * Controller Witness Allowlists
 *
 * Chains, EAS contracts, and schema UIDs that the witness server
 * will accept. Separate from chains.ts / schemas.ts because the
 * witness has its own approval criteria.
 *
 * To approve a new chain: add an entry to APPROVED_WITNESS_CHAINS.
 * To approve a new schema: add a UID to APPROVED_CONTROLLER_SCHEMA_UIDS.
 */

import { omachainTestnet } from './chains';

/** chainId → EAS contract address */
export const APPROVED_WITNESS_CHAINS: Record<number, string> = {
  [omachainTestnet.id]: omachainTestnet.contracts.easContract,
  // [omachainMainnet.id]: omachainMainnet.contracts.easContract, // enable when deployed
};

export const APPROVED_CONTROLLER_SCHEMA_UIDS: string[] = [
  '0x807b38ce9aa23fdde4457de01db9c5e8d6ec7c8feebee242e52be70847b7b966', // key-binding on OMAchain testnet (redeployed)
  '0x290ce7f909a98f74d2356cf24102ac813555fa0bcd456f1bab17da2d92632e1d', // key-binding on OMAchain testnet (original — keep for existing attestations)
  // '0xed79388b434965a35d50573b75f4bbd6e3bc7912103c4a6ac0aff6a510ccadac', // linked-identifier on OMAchain testnet — not yet enabled (requires per-platform social API integration)
];

/**
 * Schema-specific field mapping.
 *
 * The `controllerField` varies by schema — key-binding uses `keyId`,
 * linked-identifier uses `linkedId`. The `subjectField` is `"subject"`
 * on every schema today but is included for future-proofing.
 *
 * The EAS schema string is sourced from schemas.ts (auto-generated from
 * .eas.json files) rather than hardcoded here.
 */
export interface SchemaFieldMapping {
  /** Decoded field name that maps to the request's `subject` */
  subjectField: string;
  /** Decoded field name that maps to the request's `controller` */
  controllerField: string;
}

export const SCHEMA_FIELD_MAPPINGS: Record<string, SchemaFieldMapping> = {
  // key-binding: subject + keyId (redeployed)
  '0x807b38ce9aa23fdde4457de01db9c5e8d6ec7c8feebee242e52be70847b7b966': {
    subjectField: 'subject',
    controllerField: 'keyId',
  },
  // key-binding: subject + keyId (original — keep for existing attestations)
  '0x290ce7f909a98f74d2356cf24102ac813555fa0bcd456f1bab17da2d92632e1d': {
    subjectField: 'subject',
    controllerField: 'keyId',
  },
  // linked-identifier: subject + linkedId (uncomment when enabled above)
  // '0xed79388b434965a35d50573b75f4bbd6e3bc7912103c4a6ac0aff6a510ccadac': {
  //   subjectField: 'subject',
  //   controllerField: 'linkedId',
  // },
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
