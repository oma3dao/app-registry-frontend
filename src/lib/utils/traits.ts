/**
 * Utility functions for handling traits and trait hashing
 */

import { ethers } from 'ethers';

/**
 * Hash a single trait string to bytes32 format
 * @param trait The trait string to hash
 * @returns The keccak256 hash as a hex string with 0x prefix
 */
export function hashTrait(trait: string): `0x${string}` {
  return ethers.id(trait) as `0x${string}`;
}

/**
 * Hash an array of traits to bytes32 format
 * @param traits Array of trait strings
 * @returns Array of keccak256 hashes as hex strings with 0x prefix
 */
export function hashTraits(traits: string[]): `0x${string}`[] {
  return traits.map(trait => hashTrait(trait));
}
