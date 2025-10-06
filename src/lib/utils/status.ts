/**
 * Status enum utilities for converting between contract numbers and Status types
 */

import type { Status } from '../contracts/types';

/**
 * Convert contract status number to Status type
 * Contract: 0=Active, 1=Deprecated, 2=Replaced
 * @param num Status number from contract (0, 1, or 2)
 * @returns Status type
 */
export function numberToStatus(num: number): Status {
  switch (num) {
    case 0: return 'Active';
    case 1: return 'Deprecated';
    case 2: return 'Replaced';
    default:
      console.warn(`Unknown status number: ${num}, defaulting to Active`);
      return 'Active';
  }
}

/**
 * Convert Status type to contract status number
 * Contract: 0=Active, 1=Deprecated, 2=Replaced
 * @param status Status type
 * @returns Status number for contract (0, 1, or 2)
 */
export function statusToNumber(status: Status): number {
  switch (status) {
    case 'Active': return 0;
    case 'Deprecated': return 1;
    case 'Replaced': return 2;
  }
}

/**
 * Validate if a status string is a valid Status type
 * @param status String to validate
 * @returns True if valid Status
 */
export function isValidStatus(status: string): status is Status {
  return status === 'Active' || status === 'Deprecated' || status === 'Replaced';
}

/**
 * Get a display-friendly status label
 * @param status Status type
 * @returns Human-readable label
 */
export function getStatusLabel(status: Status): string {
  return status;
}

/**
 * Get status color for UI display
 * @param status Status type
 * @returns Tailwind color class
 */
export function getStatusColor(status: Status): string {
  switch (status) {
    case 'Active': return 'text-green-600 dark:text-green-400';
    case 'Deprecated': return 'text-yellow-600 dark:text-yellow-400';
    case 'Replaced': return 'text-red-600 dark:text-red-400';
  }
}
