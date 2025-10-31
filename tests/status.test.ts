import { describe, it, expect, vi } from 'vitest';
import {
  numberToStatus,
  statusToNumber,
  isValidStatus,
  getStatusLabel,
  getStatusColor,
} from '@/lib/utils/status';
import type { Status } from '@/lib/contracts/types';

describe('status utilities', () => {
  describe('numberToStatus', () => {
    it('converts 0 to Active', () => {
      expect(numberToStatus(0)).toBe('Active');
    });

    it('converts 1 to Deprecated', () => {
      expect(numberToStatus(1)).toBe('Deprecated');
    });

    it('converts 2 to Replaced', () => {
      expect(numberToStatus(2)).toBe('Replaced');
    });

    it('defaults to Active for unknown numbers', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(numberToStatus(3)).toBe('Active');
      expect(numberToStatus(999)).toBe('Active');
      expect(numberToStatus(-1)).toBe('Active');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown status number: 3, defaulting to Active');
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('statusToNumber', () => {
    it('converts Active to 0', () => {
      expect(statusToNumber('Active')).toBe(0);
    });

    it('converts Deprecated to 1', () => {
      expect(statusToNumber('Deprecated')).toBe(1);
    });

    it('converts Replaced to 2', () => {
      expect(statusToNumber('Replaced')).toBe(2);
    });

    it('round-trip conversion works', () => {
      const statuses: Status[] = ['Active', 'Deprecated', 'Replaced'];
      statuses.forEach(status => {
        const num = statusToNumber(status);
        const backToStatus = numberToStatus(num);
        expect(backToStatus).toBe(status);
      });
    });
  });

  describe('isValidStatus', () => {
    it('returns true for Active', () => {
      expect(isValidStatus('Active')).toBe(true);
    });

    it('returns true for Deprecated', () => {
      expect(isValidStatus('Deprecated')).toBe(true);
    });

    it('returns true for Replaced', () => {
      expect(isValidStatus('Replaced')).toBe(true);
    });

    it('returns false for invalid status strings', () => {
      expect(isValidStatus('Unknown')).toBe(false);
      expect(isValidStatus('active')).toBe(false); // case sensitive
      expect(isValidStatus('ACTIVE')).toBe(false);
      expect(isValidStatus('')).toBe(false);
      expect(isValidStatus('Pending')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isValidStatus(0 as any)).toBe(false);
      expect(isValidStatus(null as any)).toBe(false);
      expect(isValidStatus(undefined as any)).toBe(false);
    });
  });

  describe('getStatusLabel', () => {
    it('returns the status as-is for Active', () => {
      expect(getStatusLabel('Active')).toBe('Active');
    });

    it('returns the status as-is for Deprecated', () => {
      expect(getStatusLabel('Deprecated')).toBe('Deprecated');
    });

    it('returns the status as-is for Replaced', () => {
      expect(getStatusLabel('Replaced')).toBe('Replaced');
    });

    it('returns human-readable labels for all status types', () => {
      const statuses: Status[] = ['Active', 'Deprecated', 'Replaced'];
      statuses.forEach(status => {
        const label = getStatusLabel(status);
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getStatusColor', () => {
    it('returns green color for Active', () => {
      expect(getStatusColor('Active')).toBe('text-green-600 dark:text-green-400');
    });

    it('returns yellow color for Deprecated', () => {
      expect(getStatusColor('Deprecated')).toBe('text-yellow-600 dark:text-yellow-400');
    });

    it('returns red color for Replaced', () => {
      expect(getStatusColor('Replaced')).toBe('text-red-600 dark:text-red-400');
    });

    it('returns valid Tailwind color classes', () => {
      const statuses: Status[] = ['Active', 'Deprecated', 'Replaced'];
      statuses.forEach(status => {
        const color = getStatusColor(status);
        expect(color).toMatch(/^text-\w+-\d{3}/); // Matches Tailwind color pattern
        expect(color).toContain('dark:'); // Contains dark mode variant
      });
    });
  });
});

