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

