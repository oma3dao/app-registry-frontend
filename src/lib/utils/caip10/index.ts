/**
 * CAIP-10 utilities - main export
 */

export { parseCaip10, buildCaip10, type ParsedCaip10 } from './parse';
export { normalizeCaip10, type NormalizationResult } from './normalize';
export { NON_EVM_CAIP2 } from './chains';
export { ALL_CHAINS, searchChains, getChainById, type ChainInfo } from './all-chains';
export { validateEvm, toEip55, isEvmAddress, type EvmValidationResult } from './validators/evm';
export { validateSolana, isBase58, type SolanaValidationResult } from './validators/solana';
export { validateSui, normalize0x32Bytes, isSuiAddress, type SuiValidationResult } from './validators/sui';

