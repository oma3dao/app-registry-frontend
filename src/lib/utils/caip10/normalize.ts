/**
 * CAIP-10 normalization - validates and normalizes addresses per namespace
 */

import { buildCaip10, parseCaip10, type ParsedCaip10 } from './parse';
import { validateEvm } from './validators/evm';
import { validateSolana } from './validators/solana';
import { validateSui } from './validators/sui';

export interface NormalizationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
  parsed?: ParsedCaip10;
}

/**
 * Normalize a CAIP-10 string
 * Validates format, namespace-specific rules, and returns normalized form
 */
export function normalizeCaip10(input: string): NormalizationResult {
  // Parse
  const parsed = parseCaip10(input);
  if (parsed instanceof Error) {
    return {
      valid: false,
      error: parsed.message,
    };
  }

  const { namespace, reference, address } = parsed;

  // Route to namespace-specific validator
  switch (namespace.toLowerCase()) {
    case 'eip155': {
      const result = validateEvm(reference, address);
      if (!result.valid) {
        return {
          valid: false,
          error: result.error,
        };
      }

      return {
        valid: true,
        normalized: buildCaip10('eip155', reference, result.normalizedAddress!),
        parsed,
      };
    }

    case 'solana': {
      const result = validateSolana(reference, address);
      if (!result.valid) {
        return {
          valid: false,
          error: result.error,
        };
      }

      return {
        valid: true,
        normalized: buildCaip10('solana', reference.toLowerCase(), result.normalizedAddress!),
        parsed,
      };
    }

    case 'sui': {
      const result = validateSui(reference, address);
      if (!result.valid) {
        return {
          valid: false,
          error: result.error,
        };
      }

      return {
        valid: true,
        normalized: buildCaip10('sui', reference.toLowerCase(), result.normalizedAddress!),
        parsed,
      };
    }

    default:
      return {
        valid: false,
        error: `Unsupported namespace: ${namespace}. Supported: eip155, solana, sui`,
      };
  }
}

