import type { InterfaceFlags } from '@/types/form';

/**
 * Compute interfaces bitmap from flags
 * Human = 1, API = 2, Smart Contract = 4
 * 
 * @param flags Interface flags object
 * @returns Bitmap value for on-chain storage
 */
export function computeInterfacesBitmap(flags: InterfaceFlags): number {
  return (
    (flags.human ? 1 : 0) +
    (flags.api ? 2 : 0) +
    (flags.smartContract ? 4 : 0)
  );
}

/**
 * Parse interfaces bitmap to flags
 * 
 * @param bitmap Bitmap value from on-chain
 * @returns Interface flags object
 */
export function parseBitmapToFlags(bitmap: number): InterfaceFlags {
  return {
    human: (bitmap & 1) !== 0,
    api: (bitmap & 2) !== 0,
    smartContract: (bitmap & 4) !== 0,
  };
}

/**
 * Default interface flags (Human only)
 */
export const DEFAULT_INTERFACE_FLAGS: InterfaceFlags = {
  human: true,
  api: false,
  smartContract: false,
};