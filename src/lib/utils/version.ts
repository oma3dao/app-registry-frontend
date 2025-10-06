/**
 * Version utility functions for semantic versioning
 */

import type { Version } from '../contracts/types';

/**
 * Get the current (latest) version from versionHistory array
 */
export function getCurrentVersion(versionHistory: Version[]): Version {
  if (!versionHistory || versionHistory.length === 0) {
    return { major: 0, minor: 0, patch: 0 };
  }
  return versionHistory[versionHistory.length - 1];
}

/**
 * Format version as string (e.g., "1.2.3")
 */
export function formatVersion(version: Version): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Compare two versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: Version, b: Version): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

/**
 * Check if version a is greater than version b
 */
export function isVersionGreater(a: Version, b: Version): boolean {
  return compareVersions(a, b) > 0;
}

/**
 * Check if versions are equal
 */
export function isVersionEqual(a: Version, b: Version): boolean {
  return compareVersions(a, b) === 0;
}

/**
 * Parse version string (e.g., "1.2.3") to Version object
 */
export function parseVersion(versionString: string): Version | null {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

