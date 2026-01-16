import { describe, it, expect } from 'vitest';
import { normalizeEvmError, isUserRejection, formatErrorMessage } from '@/lib/contracts/errors';

describe('Contract Errors', () => {
  describe('normalizeEvmError', () => {
    // Tests generic Error objects
    it('normalizes generic Error objects', () => {
      const error = new Error('Generic error message');
      const result = normalizeEvmError(error);

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('message');
      expect(result.message).toBe('Generic error message');
    });

    // Tests string errors
    it('converts string errors to normalized error objects', () => {
      const result = normalizeEvmError('String error message');

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('message');
      expect(result.message).toBe('Transaction failed');
    });

    // Tests user rejection errors
    it('identifies user rejection errors correctly', () => {
      const error = new Error('User rejected transaction');

      const result = normalizeEvmError(error);

      expect(result.code).toBe('USER_REJECTED');
      expect(result.message).toBe('Transaction rejected by user');
    });

    // Tests contract revert errors
    it('identifies contract revert errors', () => {
      const error = new Error('execution reverted: custom message');

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toContain('reverted');
    });

    // Tests errors with data property
    it('includes data property information', () => {
      const error: any = new Error('Data error');
      error.data = { message: 'Custom revert message' };

      const result = normalizeEvmError(error);

      expect(result.message).toContain('Data error');
    });

    // Tests null/undefined errors
    it('handles null errors', () => {
      const result = normalizeEvmError(null);

      expect(result).toHaveProperty('code');
      expect(result.code).toBe('UNKNOWN');
      expect(result.message).toBe('Transaction failed');
    });

    // Tests undefined errors
    it('handles undefined errors', () => {
      const result = normalizeEvmError(undefined);

      expect(result).toHaveProperty('code');
      expect(result.code).toBe('UNKNOWN');
      expect(result.message).toBe('Transaction failed');
    });

    // Tests errors with shortMessage (viem)
    it('uses shortMessage from viem errors', () => {
      const error: any = new Error('Long error');
      error.shortMessage = 'Short user-friendly message';

      const result = normalizeEvmError(error);

      expect(result.message).toBe('Short user-friendly message');
    });

    // Tests network errors
    it('identifies network errors', () => {
      const error = new Error('network error occurred');

      const result = normalizeEvmError(error);

      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toBe('Network connection error');
    });

    // Tests insufficient funds errors
    it('identifies insufficient funds errors', () => {
      const error = new Error('insufficient funds for transfer');

      const result = normalizeEvmError(error);

      expect(result.code).toBe('INSUFFICIENT_FUNDS');
      expect(result.message).toBe('Insufficient funds for transaction');
    });

    // Tests gas estimation errors
    it('identifies gas estimation errors', () => {
      const error = new Error('cannot estimate gas; transaction may fail');

      const result = normalizeEvmError(error);

      expect(result.code).toBe('GAS_ERROR');
      expect(result.message).toBe('Gas estimation failed or out of gas');
    });

    // Tests nonce errors
    it('identifies nonce errors', () => {
      const error = new Error('nonce too low');

      const result = normalizeEvmError(error);

      expect(result.code).toBe('NONCE_ERROR');
      expect(result.message).toBe('Transaction nonce/sequence error');
    });

    // Tests object errors without message
    it('handles objects without message property', () => {
      const error = { someProperty: 'value' };

      const result = normalizeEvmError(error);

      expect(result).toHaveProperty('code');
      expect(result.code).toBe('UNKNOWN');
    });

    // Tests errors with multiple properties
    it('prioritizes shortMessage when multiple properties present', () => {
      const error: any = new Error('Base message');
      error.shortMessage = 'User-friendly message';

      const result = normalizeEvmError(error);

      expect(result.message).toBe('User-friendly message');
    });

    // Tests cause preservation
    it('preserves original error as cause', () => {
      const error = new Error('Original error');

      const result = normalizeEvmError(error);

      expect(result.cause).toBe(error);
    });

    /**
     * Test: covers lines 110-139 - error selector matching logic
     * Tests error with data.data containing a known selector
     */
    it('extracts and matches known error selector from data.data', () => {
      const error: any = new Error('execution reverted');
      error.data = {
        data: '0xccdf6bd50000000000000000000000000000000000000000000000000000000000000000', // DIDCannotBeEmpty selector
      };

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Contract error: DIDCannotBeEmpty');
    });

    /**
     * Test: covers lines 110-139 - error selector matching logic
     * Tests error with data containing a known selector
     */
    it('extracts and matches known error selector from data', () => {
      const error: any = new Error('execution reverted');
      error.data = '0xa32712b80000000000000000000000000000000000000000000000000000000000000000'; // InterfacesCannotBeEmpty selector

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Contract error: InterfacesCannotBeEmpty');
    });

    /**
     * Test: covers lines 110-139 - error selector matching logic
     * Tests error with error.data containing a known selector
     */
    it('extracts and matches known error selector from error.data', () => {
      const error: any = {
        message: 'execution reverted',
        error: {
          data: '0x5f69c2550000000000000000000000000000000000000000000000000000000000000000', // NotAppOwner selector
        },
      };

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Contract error: NotAppOwner');
    });

    /**
     * Test: covers lines 110-139 - error selector matching logic
     * Tests error with cause.data containing a known selector
     */
    it('extracts and matches known error selector from cause.data', () => {
      const error: any = {
        message: 'execution reverted',
        cause: {
          data: '0x9d9b49ea0000000000000000000000000000000000000000000000000000000000000000', // AppNotFound selector
        },
      };

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Contract error: AppNotFound');
    });

    /**
     * Test: covers lines 110-139 - error selector matching logic
     * Tests error with unknown selector (line 137)
     */
    it('handles unknown error selector', () => {
      const error: any = new Error('execution reverted');
      error.data = '0xdeadbeef0000000000000000000000000000000000000000000000000000000000000000'; // Unknown selector

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Contract reverted with unknown error (selector: 0xdeadbeef)');
    });

    /**
     * Test: covers lines 110-139 - error selector matching logic
     * Tests error with invalid hex data (not starting with 0x)
     */
    it('handles error data that does not start with 0x', () => {
      const error: any = new Error('execution reverted');
      error.data = 'deadbeef'; // Invalid format (no 0x prefix)

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Transaction reverted');
    });

    /**
     * Test: covers line 92 branch - errorData is an empty string
     */
    it('handles error data that is an empty string', () => {
      const error: any = new Error('execution reverted');
      error.data = ''; // Empty string

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Transaction reverted');
    });

    /**
     * Test: covers line 92 branch - errorData starts with 0X (uppercase)
     */
    it('handles error data with uppercase 0X prefix', () => {
      const error: any = new Error('execution reverted');
      error.data = '0Xdeadbeef0000000000000000000000000000000000000000000000000000000000000000'; // Uppercase 0X

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      // startsWith('0x') is case-sensitive, so this won't match
      expect(result.message).toBe('Transaction reverted');
    });

    /**
     * Test: covers line 96 branch - data.data is null, falls back to data
     */
    it('handles error with data.data as null', () => {
      const error: any = new Error('execution reverted');
      error.data = {
        data: null, // null data.data
      };

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Transaction reverted');
    });

    /**
     * Test: covers line 96 branch - data.data is undefined, data is object with valid nested data
     */
    it('handles error with data.data undefined but error.data is valid', () => {
      const error: any = new Error('execution reverted');
      error.data = {
        // no data.data property, so this object itself becomes errorData (not a string)
        someOther: 'value',
      };

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Transaction reverted');
    });

    /**
     * Test: covers line 96 branch - fallback to error.data when data.data is falsy
     */
    it('handles error with fallback to error.data', () => {
      const error: any = {
        message: 'execution reverted',
        data: {
          data: '', // empty string is falsy, but data object itself is truthy
        },
        error: {
          data: '0xccdf6bd50000000000000000000000000000000000000000000000000000000000000000', // DIDCannotBeEmpty
        },
      };

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      // The empty string from data.data is falsy, so errorData = errorObj.data (the object)
      // Since the object is not a string, it goes to the else branch
      expect(result.message).toBe('Transaction reverted');
    });

    /**
     * Test: covers line 96 branch - fallback chain when data is undefined
     */
    it('handles error with fallback chain to cause.data', () => {
      const error: any = {
        message: 'execution reverted',
        // no data property
        // no error property
        cause: {
          data: '0xa32712b80000000000000000000000000000000000000000000000000000000000000000', // InterfacesCannotBeEmpty
        },
      };

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Contract error: InterfacesCannotBeEmpty');
    });

    /**
     * Test: covers line 92 branch - errorData is undefined (all fallbacks fail)
     */
    it('handles error when all data fallbacks are undefined', () => {
      const error: any = {
        message: 'execution reverted',
        // no data, error, or cause properties
      };

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Transaction reverted');
    });

    /**
     * Test: covers line 92 branch - errorData is 0 (falsy number)
     */
    it('handles error when data is 0', () => {
      const error: any = new Error('execution reverted');
      error.data = 0; // falsy number

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Transaction reverted');
    });

    /**
     * Test: covers line 92 branch - errorData is false
     */
    it('handles error when data is false', () => {
      const error: any = new Error('execution reverted');
      error.data = false; // falsy boolean

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Transaction reverted');
    });

    /**
     * Test: covers lines 110-139 - error selector matching logic
     * Tests error with non-string data
     */
    it('handles error data that is not a string', () => {
      const error: any = new Error('execution reverted');
      error.data = { someProperty: 'value' }; // Non-string data

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Transaction reverted');
    });

    /**
     * Test: covers line 92 branch - errorData is a number
     */
    it('handles error data that is a number', () => {
      const error: any = new Error('execution reverted');
      error.data = 12345; // Number data

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Transaction reverted');
    });

    /**
     * Test: covers line 92 branch - errorData is an array
     */
    it('handles error data that is an array', () => {
      const error: any = new Error('execution reverted');
      error.data = ['0xdeadbeef']; // Array data

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Transaction reverted');
    });

    /**
     * Test: covers line 92 branch - errorData is a boolean
     */
    it('handles error data that is a boolean', () => {
      const error: any = new Error('execution reverted');
      error.data = true; // Boolean data

      const result = normalizeEvmError(error);

      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.message).toBe('Transaction reverted');
    });

    /**
     * Test: covers lines 110-139 - error selector matching logic
     * Tests multiple known selectors to ensure all are covered
     */
    it('matches all known error selectors', () => {
      const selectors = [
        { selector: '0xccdf6bd5', name: 'DIDCannotBeEmpty' },
        { selector: '0xa32712b8', name: 'InterfacesCannotBeEmpty' },
        { selector: '0xdf9e8a81', name: 'DataUrlCannotBeEmpty' },
        { selector: '0x183b8716', name: 'NoChangesSpecified' },
        { selector: '0x5f69c255', name: 'NotAppOwner' },
        { selector: '0x9d9b49ea', name: 'AppNotFound' },
        { selector: '0x4ed80d10', name: 'InvalidVersion' },
        { selector: '0xcc1e4259', name: 'MinorIncrementRequired' },
        { selector: '0x31c6775f', name: 'PatchIncrementRequired' },
        { selector: '0xab880ba8', name: 'InterfaceRemovalNotAllowed' },
        { selector: '0xed9ad074', name: 'DataHashRequiredForTraitChange' },
        { selector: '0xde40be1e', name: 'DataHashMismatch' },
        { selector: '0x3336c292', name: 'MajorVersionChangeRequiresNewMint' },
        { selector: '0x1afb3651', name: 'DIDMajorAlreadyExists' },
        { selector: '0xc9671858', name: 'NewDIDRequired' },
      ];

      selectors.forEach(({ selector, name }) => {
        const error: any = new Error('execution reverted');
        error.data = selector + '0000000000000000000000000000000000000000000000000000000000000000';

        const result = normalizeEvmError(error);

        expect(result.code).toBe('CONTRACT_REVERT');
        expect(result.message).toBe(`Contract error: ${name}`);
      });
    });
  });

  describe('isUserRejection', () => {
    // Tests user rejection detection
    it('returns true for user rejection errors', () => {
      const error = new Error('User rejected the transaction');

      const result = isUserRejection(error);

      expect(result).toBe(true);
    });

    // Tests non-rejection errors
    it('returns false for non-rejection errors', () => {
      const error = new Error('Some other error');

      const result = isUserRejection(error);

      expect(result).toBe(false);
    });
  });

  describe('formatErrorMessage', () => {
    // Tests error message formatting
    it('formats error message for user display', () => {
      const error = new Error('insufficient funds for transaction');

      const result = formatErrorMessage(error);

      expect(result).toBe('Insufficient funds for transaction');
    });

    // Tests generic error formatting
    it('formats generic errors', () => {
      const error = new Error('Some generic error');

      const result = formatErrorMessage(error);

      expect(result).toBe('Some generic error');
    });
  });
});

