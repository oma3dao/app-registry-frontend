/**
 * Utilities for working with interface bitmaps
 * Interface types: 1=HumanApp, 2=ApiEndpoint, 4=SmartContract
 */

import { InterfaceType } from '../contracts/types';

/**
 * Check if interfaces bitmap includes Human App
 */
export function isHumanApp(interfaces: number): boolean {
  return (interfaces & InterfaceType.HumanApp) === InterfaceType.HumanApp;
}

/**
 * Check if interfaces bitmap includes API Endpoint
 */
export function isApiEndpoint(interfaces: number): boolean {
  return (interfaces & InterfaceType.ApiEndpoint) === InterfaceType.ApiEndpoint;
}

/**
 * Check if interfaces bitmap includes Smart Contract
 */
export function isSmartContract(interfaces: number): boolean {
  return (interfaces & InterfaceType.SmartContract) === InterfaceType.SmartContract;
}

/**
 * Build interfaces bitmap from boolean flags
 */
export function buildInterfaceBitmap(
  human: boolean,
  api: boolean,
  contract: boolean
): number {
  let bitmap = 0;
  if (human) bitmap |= InterfaceType.HumanApp;
  if (api) bitmap |= InterfaceType.ApiEndpoint;
  if (contract) bitmap |= InterfaceType.SmartContract;
  return bitmap;
}

/**
 * Get human-readable interface names
 */
export function getInterfaceNames(interfaces: number): string[] {
  const names: string[] = [];
  if (isHumanApp(interfaces)) names.push('Human App');
  if (isApiEndpoint(interfaces)) names.push('API Endpoint');
  if (isSmartContract(interfaces)) names.push('Smart Contract');
  return names;
}

/**
 * Get interface icons/emojis
 */
export function getInterfaceIcons(interfaces: number): string[] {
  const icons: string[] = [];
  if (isHumanApp(interfaces)) icons.push('🧑');
  if (isApiEndpoint(interfaces)) icons.push('🔌');
  if (isSmartContract(interfaces)) icons.push('📜');
  return icons;
}

/**
 * Get interface badge color class (for Tailwind)
 */
export function getInterfaceBadgeColor(interfaceType: InterfaceType): string {
  switch (interfaceType) {
    case InterfaceType.HumanApp:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case InterfaceType.ApiEndpoint:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case InterfaceType.SmartContract:
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

