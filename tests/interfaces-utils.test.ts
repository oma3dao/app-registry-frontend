import { describe, it, expect } from 'vitest';
import {
  computeInterfacesBitmap,
  parseBitmapToFlags,
  DEFAULT_INTERFACE_FLAGS,
} from '@/lib/utils/interfaces';
import type { InterfaceFlags } from '@/types/form';

describe('interfaces utilities', () => {
  describe('computeInterfacesBitmap', () => {
    it('computes bitmap for human only', () => {
      const flags: InterfaceFlags = { human: true, api: false, smartContract: false };
      expect(computeInterfacesBitmap(flags)).toBe(1); // 0b001
    });

    it('computes bitmap for api only', () => {
      const flags: InterfaceFlags = { human: false, api: true, smartContract: false };
      expect(computeInterfacesBitmap(flags)).toBe(2); // 0b010
    });

    it('computes bitmap for smart contract only', () => {
      const flags: InterfaceFlags = { human: false, api: false, smartContract: true };
      expect(computeInterfacesBitmap(flags)).toBe(4); // 0b100
    });

    it('computes bitmap for all interfaces', () => {
      const flags: InterfaceFlags = { human: true, api: true, smartContract: true };
      expect(computeInterfacesBitmap(flags)).toBe(7); // 0b111 = 1+2+4
    });

    it('computes bitmap for human and api', () => {
      const flags: InterfaceFlags = { human: true, api: true, smartContract: false };
      expect(computeInterfacesBitmap(flags)).toBe(3); // 0b011 = 1+2
    });

    it('computes bitmap for human and smart contract', () => {
      const flags: InterfaceFlags = { human: true, api: false, smartContract: true };
      expect(computeInterfacesBitmap(flags)).toBe(5); // 0b101 = 1+4
    });

    it('computes bitmap for api and smart contract', () => {
      const flags: InterfaceFlags = { human: false, api: true, smartContract: true };
      expect(computeInterfacesBitmap(flags)).toBe(6); // 0b110 = 2+4
    });

    it('computes bitmap for no interfaces', () => {
      const flags: InterfaceFlags = { human: false, api: false, smartContract: false };
      expect(computeInterfacesBitmap(flags)).toBe(0);
    });
  });

  describe('parseBitmapToFlags', () => {
    it('parses bitmap 1 to human only', () => {
      const flags = parseBitmapToFlags(1);
      expect(flags).toEqual({ human: true, api: false, smartContract: false });
    });

    it('parses bitmap 2 to api only', () => {
      const flags = parseBitmapToFlags(2);
      expect(flags).toEqual({ human: false, api: true, smartContract: false });
    });

    it('parses bitmap 4 to smart contract only', () => {
      const flags = parseBitmapToFlags(4);
      expect(flags).toEqual({ human: false, api: false, smartContract: true });
    });

    it('parses bitmap 7 to all interfaces', () => {
      const flags = parseBitmapToFlags(7);
      expect(flags).toEqual({ human: true, api: true, smartContract: true });
    });

    it('parses bitmap 3 to human and api', () => {
      const flags = parseBitmapToFlags(3);
      expect(flags).toEqual({ human: true, api: true, smartContract: false });
    });

    it('parses bitmap 5 to human and smart contract', () => {
      const flags = parseBitmapToFlags(5);
      expect(flags).toEqual({ human: true, api: false, smartContract: true });
    });

    it('parses bitmap 6 to api and smart contract', () => {
      const flags = parseBitmapToFlags(6);
      expect(flags).toEqual({ human: false, api: true, smartContract: true });
    });

    it('parses bitmap 0 to no interfaces', () => {
      const flags = parseBitmapToFlags(0);
      expect(flags).toEqual({ human: false, api: false, smartContract: false });
    });
  });

  describe('DEFAULT_INTERFACE_FLAGS', () => {
    it('defaults to human only', () => {
      expect(DEFAULT_INTERFACE_FLAGS).toEqual({
        human: true,
        api: false,
        smartContract: false,
      });
    });

    it('computes to bitmap 1', () => {
      expect(computeInterfacesBitmap(DEFAULT_INTERFACE_FLAGS)).toBe(1);
    });
  });

  describe('round-trip conversions', () => {
    it('bitmap to flags to bitmap preserves value', () => {
      const bitmaps = [0, 1, 2, 3, 4, 5, 6, 7];

      bitmaps.forEach(bitmap => {
        const flags = parseBitmapToFlags(bitmap);
        const reconstructed = computeInterfacesBitmap(flags);
        expect(reconstructed).toBe(bitmap);
      });
    });

    it('flags to bitmap to flags preserves value', () => {
      const flagCombinations: InterfaceFlags[] = [
        { human: false, api: false, smartContract: false },
        { human: true, api: false, smartContract: false },
        { human: false, api: true, smartContract: false },
        { human: false, api: false, smartContract: true },
        { human: true, api: true, smartContract: false },
        { human: true, api: false, smartContract: true },
        { human: false, api: true, smartContract: true },
        { human: true, api: true, smartContract: true },
      ];

      flagCombinations.forEach(flags => {
        const bitmap = computeInterfacesBitmap(flags);
        const reconstructed = parseBitmapToFlags(bitmap);
        expect(reconstructed).toEqual(flags);
      });
    });
  });
});

