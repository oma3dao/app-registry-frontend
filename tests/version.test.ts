import { describe, it, expect } from 'vitest';
import {
  getCurrentVersion,
  formatVersion,
  compareVersions,
  isVersionGreater,
  isVersionEqual,
  parseVersion,
} from '@/lib/utils/version';
import type { Version } from '@/lib/contracts/types';

describe('version utilities', () => {
  describe('getCurrentVersion', () => {
    it('returns the last version from versionHistory array', () => {
      const versions: Version[] = [
        { major: 1, minor: 0, patch: 0 },
        { major: 1, minor: 1, patch: 0 },
        { major: 2, minor: 0, patch: 0 },
      ];
      expect(getCurrentVersion(versions)).toEqual({ major: 2, minor: 0, patch: 0 });
    });

    it('returns 0.0.0 for empty array', () => {
      expect(getCurrentVersion([])).toEqual({ major: 0, minor: 0, patch: 0 });
    });

    it('returns 0.0.0 for null or undefined', () => {
      expect(getCurrentVersion(null as any)).toEqual({ major: 0, minor: 0, patch: 0 });
      expect(getCurrentVersion(undefined as any)).toEqual({ major: 0, minor: 0, patch: 0 });
    });

    it('returns the only version for single-item array', () => {
      const versions: Version[] = [{ major: 1, minor: 2, patch: 3 }];
      expect(getCurrentVersion(versions)).toEqual({ major: 1, minor: 2, patch: 3 });
    });
  });

  describe('formatVersion', () => {
    it('formats version as string', () => {
      expect(formatVersion({ major: 1, minor: 2, patch: 3 })).toBe('1.2.3');
    });

    it('handles zero patch version', () => {
      expect(formatVersion({ major: 2, minor: 0, patch: 0 })).toBe('2.0.0');
    });

    it('handles zero minor version', () => {
      expect(formatVersion({ major: 3, minor: 0, patch: 5 })).toBe('3.0.5');
    });

    it('handles all zeros', () => {
      expect(formatVersion({ major: 0, minor: 0, patch: 0 })).toBe('0.0.0');
    });

    it('handles large version numbers', () => {
      expect(formatVersion({ major: 99, minor: 88, patch: 77 })).toBe('99.88.77');
    });
  });

  describe('compareVersions', () => {
    it('returns 0 for equal versions', () => {
      const v1: Version = { major: 1, minor: 2, patch: 3 };
      const v2: Version = { major: 1, minor: 2, patch: 3 };
      expect(compareVersions(v1, v2)).toBe(0);
    });

    it('returns 1 when first version is greater (major)', () => {
      const v1: Version = { major: 2, minor: 0, patch: 0 };
      const v2: Version = { major: 1, minor: 9, patch: 9 };
      expect(compareVersions(v1, v2)).toBe(1);
    });

    it('returns -1 when first version is less (major)', () => {
      const v1: Version = { major: 1, minor: 0, patch: 0 };
      const v2: Version = { major: 2, minor: 0, patch: 0 };
      expect(compareVersions(v1, v2)).toBe(-1);
    });

    it('returns 1 when first version is greater (minor)', () => {
      const v1: Version = { major: 1, minor: 5, patch: 0 };
      const v2: Version = { major: 1, minor: 3, patch: 0 };
      expect(compareVersions(v1, v2)).toBe(1);
    });

    it('returns -1 when first version is less (minor)', () => {
      const v1: Version = { major: 1, minor: 2, patch: 0 };
      const v2: Version = { major: 1, minor: 5, patch: 0 };
      expect(compareVersions(v1, v2)).toBe(-1);
    });

    it('returns 1 when first version is greater (patch)', () => {
      const v1: Version = { major: 1, minor: 2, patch: 5 };
      const v2: Version = { major: 1, minor: 2, patch: 3 };
      expect(compareVersions(v1, v2)).toBe(1);
    });

    it('returns -1 when first version is less (patch)', () => {
      const v1: Version = { major: 1, minor: 2, patch: 1 };
      const v2: Version = { major: 1, minor: 2, patch: 3 };
      expect(compareVersions(v1, v2)).toBe(-1);
    });
  });

  describe('isVersionGreater', () => {
    it('returns true when first version is greater', () => {
      const v1: Version = { major: 2, minor: 0, patch: 0 };
      const v2: Version = { major: 1, minor: 9, patch: 9 };
      expect(isVersionGreater(v1, v2)).toBe(true);
    });

    it('returns false when versions are equal', () => {
      const v1: Version = { major: 1, minor: 2, patch: 3 };
      const v2: Version = { major: 1, minor: 2, patch: 3 };
      expect(isVersionGreater(v1, v2)).toBe(false);
    });

    it('returns false when first version is less', () => {
      const v1: Version = { major: 1, minor: 0, patch: 0 };
      const v2: Version = { major: 2, minor: 0, patch: 0 };
      expect(isVersionGreater(v1, v2)).toBe(false);
    });
  });

  describe('isVersionEqual', () => {
    it('returns true for equal versions', () => {
      const v1: Version = { major: 1, minor: 2, patch: 3 };
      const v2: Version = { major: 1, minor: 2, patch: 3 };
      expect(isVersionEqual(v1, v2)).toBe(true);
    });

    it('returns false for different major versions', () => {
      const v1: Version = { major: 1, minor: 2, patch: 3 };
      const v2: Version = { major: 2, minor: 2, patch: 3 };
      expect(isVersionEqual(v1, v2)).toBe(false);
    });

    it('returns false for different minor versions', () => {
      const v1: Version = { major: 1, minor: 2, patch: 3 };
      const v2: Version = { major: 1, minor: 3, patch: 3 };
      expect(isVersionEqual(v1, v2)).toBe(false);
    });

    it('returns false for different patch versions', () => {
      const v1: Version = { major: 1, minor: 2, patch: 3 };
      const v2: Version = { major: 1, minor: 2, patch: 4 };
      expect(isVersionEqual(v1, v2)).toBe(false);
    });
  });

  describe('parseVersion', () => {
    it('parses valid version string', () => {
      expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('parses version with zeros', () => {
      expect(parseVersion('0.0.0')).toEqual({ major: 0, minor: 0, patch: 0 });
    });

    it('parses large version numbers', () => {
      expect(parseVersion('99.88.77')).toEqual({ major: 99, minor: 88, patch: 77 });
    });

    it('returns null for invalid version format', () => {
      expect(parseVersion('1.2')).toBeNull();
      expect(parseVersion('1.2.3.4')).toBeNull();
      expect(parseVersion('v1.2.3')).toBeNull();
      expect(parseVersion('abc')).toBeNull();
      expect(parseVersion('1.2.x')).toBeNull();
      expect(parseVersion('')).toBeNull();
    });

    it('returns null for non-numeric versions', () => {
      expect(parseVersion('a.b.c')).toBeNull();
    });

    it('handles version with leading zeros', () => {
      expect(parseVersion('01.02.03')).toEqual({ major: 1, minor: 2, patch: 3 });
    });
  });
});

