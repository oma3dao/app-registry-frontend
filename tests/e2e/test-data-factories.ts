/**
 * Test Data Factories
 * 
 * Utilities for generating test data in a consistent and maintainable way.
 * These factories help avoid hard-coded test data and make tests more maintainable.
 * 
 * Usage:
 * ```typescript
 * import { createTestUrl, createTestDID, createTestAppData } from './test-data-factories';
 * 
 * const url = createTestUrl();
 * const did = createTestDID();
 * const appData = createTestAppData();
 * ```
 */

/**
 * Generate a unique test URL
 * @param domain - Optional domain (default: 'example.com')
 * @param path - Optional path
 * @returns A unique test URL
 */
export function createTestUrl(domain: string = 'example.com', path: string = ''): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const pathSegment = path ? `/${path}` : '';
  return `https://${domain}${pathSegment}?test=${timestamp}-${random}`;
}

/**
 * Generate a unique test DID (Decentralized Identifier)
 * @param format - DID format (default: 'did:pkh')
 * @param chain - Blockchain chain (default: 'eip155:1')
 * @returns A unique test DID
 */
export function createTestDID(format: string = 'did:pkh', chain: string = 'eip155:1'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const address = `0x${random}${timestamp.toString(16).substring(0, 32)}`.substring(0, 42);
  return `${format}:${chain}:${address}`;
}

/**
 * Generate test app registration data
 * @param overrides - Optional overrides for default values
 * @returns Test app registration data
 */
export function createTestAppData(overrides: Partial<{
  name: string;
  url: string;
  description: string;
  category: string;
}> = {}): {
  name: string;
  url: string;
  description: string;
  category: string;
} {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return {
    name: overrides.name || `Test App ${timestamp}`,
    url: overrides.url || createTestUrl('test-app.com', 'app'),
    description: overrides.description || `Test application description ${random}`,
    category: overrides.category || 'utility',
  };
}

/**
 * Generate test metadata
 * @param overrides - Optional overrides for default values
 * @returns Test metadata object
 */
export function createTestMetadata(overrides: Partial<{
  title: string;
  description: string;
  image: string;
  url: string;
}> = {}): {
  title: string;
  description: string;
  image: string | null;
  url: string;
} {
  const timestamp = Date.now();
  
  return {
    title: overrides.title || `Test Title ${timestamp}`,
    description: overrides.description || `Test description ${timestamp}`,
    image: overrides.image || null,
    url: overrides.url || createTestUrl('test-metadata.com'),
  };
}

/**
 * Generate test wallet address
 * @param prefix - Address prefix (default: '0x')
 * @returns A test Ethereum wallet address
 */
export function createTestWalletAddress(prefix: string = '0x'): string {
  const random = Math.random().toString(16).substring(2, 10);
  const timestamp = Date.now().toString(16);
  const address = `${random}${timestamp}`.substring(0, 40);
  return `${prefix}${address}`;
}

/**
 * Generate test email address
 * @param domain - Email domain (default: 'test.example.com')
 * @returns A unique test email address
 */
export function createTestEmail(domain: string = 'test.example.com'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}@${domain}`;
}

/**
 * Generate test form data
 * @param overrides - Optional overrides for default values
 * @returns Test form data object
 */
export function createTestFormData(overrides: Record<string, any> = {}): Record<string, any> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return {
    name: `Test Name ${timestamp}`,
    email: createTestEmail(),
    message: `Test message ${random}`,
    ...overrides,
  };
}

/**
 * Generate test API request data
 * @param endpoint - API endpoint type
 * @param overrides - Optional overrides for default values
 * @returns Test API request data
 */
export function createTestApiRequest(
  endpoint: 'validate-url' | 'fetch-metadata' | 'fetch-description' | 'discover-wallet',
  overrides: Record<string, any> = {}
): Record<string, any> {
  const baseData: Record<string, any> = {
    'validate-url': {
      url: createTestUrl(),
    },
    'fetch-metadata': {
      url: createTestUrl(),
    },
    'fetch-description': {
      url: createTestUrl(),
    },
    'discover-wallet': {
      did: createTestDID(),
    },
  };

  return {
    ...baseData[endpoint],
    ...overrides,
  };
}

/**
 * Generate test error response
 * @param message - Error message
 * @param code - Error code (optional)
 * @returns Test error response object
 */
export function createTestErrorResponse(
  message: string = 'Test error message',
  code?: string
): { error: string; code?: string; details?: string } {
  return {
    error: message,
    ...(code && { code }),
    ...(code && { details: `Error details for ${code}` }),
  };
}

/**
 * Generate test success response
 * @param data - Response data
 * @returns Test success response object
 */
export function createTestSuccessResponse<T>(data: T): { ok: boolean; data: T } {
  return {
    ok: true,
    data,
  };
}

/**
 * Generate array of test items
 * @param count - Number of items to generate
 * @param factory - Factory function to create each item
 * @returns Array of test items
 */
export function createTestArray<T>(
  count: number,
  factory: (index: number) => T
): T[] {
  return Array.from({ length: count }, (_, index) => factory(index));
}

/**
 * Generate test URL with various formats
 * @param type - URL type
 * @returns Test URL in specified format
 */
export function createTestUrlByType(
  type: 'http' | 'https' | 'ip' | 'localhost' | 'invalid' = 'https'
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  switch (type) {
    case 'http':
      return `http://example.com/test-${timestamp}-${random}`;
    case 'https':
      return `https://example.com/test-${timestamp}-${random}`;
    case 'ip':
      return `http://192.168.1.1/test-${timestamp}-${random}`;
    case 'localhost':
      return `http://localhost:3000/test-${timestamp}-${random}`;
    case 'invalid':
      return `not-a-valid-url-${timestamp}`;
    default:
      return `https://example.com/test-${timestamp}-${random}`;
  }
}

/**
 * Generate test data with specific constraints
 * @param constraints - Data constraints
 * @returns Test data matching constraints
 */
export function createTestDataWithConstraints<T extends Record<string, any>>(
  constraints: {
    [K in keyof T]: (index?: number) => T[K];
  },
  count: number = 1
): T[] {
  return Array.from({ length: count }, (_, index) => {
    const data = {} as T;
    for (const key in constraints) {
      data[key] = constraints[key](index);
    }
    return data;
  });
}

/**
 * Generate random string
 * @param length - String length (default: 10)
 * @returns Random string
 */
export function createRandomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generate random number
 * @param min - Minimum value (default: 0)
 * @param max - Maximum value (default: 100)
 * @returns Random number
 */
export function createRandomNumber(min: number = 0, max: number = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate test date
 * @param offsetDays - Days offset from today (default: 0)
 * @returns Test date string
 */
export function createTestDate(offsetDays: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
}

