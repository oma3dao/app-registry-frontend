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
    // Try to extract revert reason from various formats
    const reasonMatch = msg.match(/revert (?:reason: )?(.+?)(?:\n|$)/i);
    let reason = reasonMatch ? reasonMatch[1] : 'Transaction reverted';

    // Try to extract custom error name from error data
    // Custom errors are encoded as: selector(4 bytes) + encoded params
    if (typeof e === 'object' && e !== null) {
      const errorObj = e as any;

      // Debug: log the entire error object structure
      console.log('[normalizeEvmError] Full error object (stringified):', JSON.stringify(errorObj, null, 2));
      console.log('[normalizeEvmError] Error keys:', Object.keys(errorObj));

      // Check for error data in various locations
      const errorData = errorObj.data?.data || errorObj.data || errorObj.error?.data || errorObj.cause?.data;

      console.log('[normalizeEvmError] Extracted errorData:', errorData);

      if (errorData && typeof errorData === 'string' && errorData.startsWith('0x')) {
        // Extract the error selector (first 4 bytes / 8 hex chars after 0x)
        const selector = errorData.slice(0, 10);
        console.log('[normalizeEvmError] Error selector:', selector);

        // Map of known error selectors from the contract
        const errorSelectors: Record<string, string> = {
          '0xccdf6bd5': 'DIDCannotBeEmpty',
          '0xa32712b8': 'InterfacesCannotBeEmpty',
          '0xdf9e8a81': 'DataUrlCannotBeEmpty',
          '0x183b8716': 'NoChangesSpecified',
          '0x5f69c255': 'NotAppOwner',
          '0x9d9b49ea': 'AppNotFound',
          '0x4ed80d10': 'InvalidVersion',
          '0xcc1e4259': 'MinorIncrementRequired',
          '0x31c6775f': 'PatchIncrementRequired',
          '0xab880ba8': 'InterfaceRemovalNotAllowed',
          '0xed9ad074': 'DataHashRequiredForTraitChange',
          '0xde40be1e': 'DataHashMismatch',
          '0x3336c292': 'MajorVersionChangeRequiresNewMint',
          '0x1afb3651': 'DIDMajorAlreadyExists',
          '0xc9671858': 'NewDIDRequired',
        };

        const errorName = errorSelectors[selector];
        if (errorName) {
          reason = `Contract error: ${errorName}`;
          console.log('[normalizeEvmError] Matched error name:', errorName);
        } else {
          reason = `Contract reverted with unknown error (selector: ${selector})`;
          console.log('[normalizeEvmError] Unknown error selector');
        }
      } else {
        console.log('[normalizeEvmError] No error data found or invalid format');
      }
    }

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
