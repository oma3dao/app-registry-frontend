/**
 * Error normalization for contract interactions
 */

export type NormalizedError = {
  code: string;
  message: string;
  cause?: unknown;
};

/**
 * Normalize EVM/contract errors into a consistent format
 * @param e The error to normalize
 * @returns Normalized error object with code, message, and optional cause
 */
/**
 * Type guard to check if error has a message property
 */
function hasMessage(e: unknown): e is { message: string } {
  return (
    typeof e === 'object' && 
    e !== null && 
    'message' in e && 
    typeof (e as Record<string, unknown>).message === 'string'
  );
}

/**
 * Type guard to check if error has a shortMessage property
 */
function hasShortMessage(e: unknown): e is { shortMessage: string } {
  return (
    typeof e === 'object' && 
    e !== null && 
    'shortMessage' in e && 
    typeof (e as Record<string, unknown>).shortMessage === 'string'
  );
}

export function normalizeEvmError(e: unknown): NormalizedError {
  const msg = hasShortMessage(e) ? e.shortMessage : hasMessage(e) ? e.message : 'Transaction failed';
  
  // User rejected transaction
  if (msg.match(/User rejected/i) || msg.match(/user denied/i) || msg.match(/rejected/i)) {
    return { 
      code: 'USER_REJECTED', 
      message: 'Transaction rejected by user', 
      cause: e 
    };
  }
  
  // Insufficient funds
  if (msg.match(/insufficient funds/i) || msg.match(/insufficient balance/i)) {
    return { 
      code: 'INSUFFICIENT_FUNDS', 
      message: 'Insufficient funds for transaction', 
      cause: e 
    };
  }
  
  // Nonce/sequence errors
  if (msg.match(/nonce/i) || msg.match(/sequence/i)) {
    return { 
      code: 'NONCE_ERROR', 
      message: 'Transaction nonce/sequence error', 
      cause: e 
    };
  }
  
  // Gas estimation errors
  if (msg.match(/gas/i) || msg.match(/out of gas/i)) {
    return { 
      code: 'GAS_ERROR', 
      message: 'Gas estimation failed or out of gas', 
      cause: e 
    };
  }
  
  // Network errors
  if (msg.match(/network/i) || msg.match(/connection/i) || msg.match(/timeout/i)) {
    return { 
      code: 'NETWORK_ERROR', 
      message: 'Network connection error', 
      cause: e 
    };
  }
  
  // Contract revert with reason
  if (msg.match(/revert/i)) {
    // Try to extract revert reason
    const reasonMatch = msg.match(/revert (?:reason: )?(.+?)(?:\n|$)/i);
    const reason = reasonMatch ? reasonMatch[1] : 'Transaction reverted';
    return { 
      code: 'CONTRACT_REVERT', 
      message: reason, 
      cause: e 
    };
  }
  
  // Default unknown error
  return { 
    code: 'UNKNOWN', 
    message: msg, 
    cause: e 
  };
}

/**
 * Check if an error is a user rejection
 * @param error The error to check
 * @returns True if the error is a user rejection
 */
export function isUserRejection(error: unknown): boolean {
  const normalized = normalizeEvmError(error);
  return normalized.code === 'USER_REJECTED';
}

/**
 * Get a user-friendly error message
 * @param error The error to format
 * @returns User-friendly error message
 */
export function formatErrorMessage(error: unknown): string {
  const normalized = normalizeEvmError(error);
  return normalized.message;
}
