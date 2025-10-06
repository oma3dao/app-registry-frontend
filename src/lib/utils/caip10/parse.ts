/**
 * CAIP-10 parsing utilities
 * Spec: https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md
 */

export interface ParsedCaip10 {
  namespace: string;
  reference: string;
  address: string;
}

/**
 * Parse a CAIP-10 account identifier
 * Format: namespace:reference:address
 * Example: eip155:1:0xAbc123...
 */
export function parseCaip10(input: string): ParsedCaip10 | Error {
  if (!input || typeof input !== 'string') {
    return new Error('CAIP-10 string is required');
  }

  const trimmed = input.trim();
  
  // CAIP-10 regex: namespace:reference:address
  const match = trimmed.match(/^(?<ns>[a-z0-9]+):(?<ref>[^:]+):(?<acct>.+)$/);
  
  if (!match || !match.groups) {
    return new Error('Invalid CAIP-10 format. Expected: namespace:reference:address');
  }

  const { ns, ref, acct } = match.groups;

  return {
    namespace: ns,
    reference: ref,
    address: acct,
  };
}

/**
 * Build a CAIP-10 string from components
 */
export function buildCaip10(namespace: string, reference: string, address: string): string {
  return `${namespace}:${reference}:${address}`;
}

