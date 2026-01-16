/**
 * Test Data Factories
 * 
 * Centralized test data generation for consistent test scenarios.
 * Use these factories to generate test data instead of hardcoding values.
 */

/**
 * Generate test app registration data
 */
export function createTestAppData(overrides?: Partial<TestAppData>): TestAppData {
  const timestamp = Date.now();
  const baseData: TestAppData = {
    appName: `Test App ${timestamp}`,
    version: '1.0.0',
    did: `did:test:${timestamp}`,
    description: 'Test application description',
    website: `https://test-app-${timestamp}.example.com`,
    category: 'Web App',
  };

  return { ...baseData, ...overrides };
}

/**
 * Generate invalid test data for validation testing
 */
export function createInvalidAppData(): Partial<TestAppData> {
  return {
    appName: '', // Empty name
    version: 'invalid-version', // Invalid format
    did: 'not-a-did', // Invalid DID format
    website: 'not-a-url', // Invalid URL
  };
}

/**
 * Generate minimal valid app data
 */
export function createMinimalAppData(): TestAppData {
  return {
    appName: 'Minimal Test App',
    version: '1.0.0',
    did: 'did:test:minimal',
    description: '',
    website: '',
    category: '',
  };
}

/**
 * Test app registration data structure
 */
export interface TestAppData {
  appName: string;
  version: string;
  did: string;
  description?: string;
  website?: string;
  category?: string;
}

/**
 * Generate random test user data
 */
export function createTestUserData(overrides?: Partial<TestUserData>): TestUserData {
  const timestamp = Date.now();
  const baseData: TestUserData = {
    walletAddress: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    email: `test-${timestamp}@example.com`,
    username: `testuser${timestamp}`,
  };

  return { ...baseData, ...overrides };
}

/**
 * Test user data structure
 */
export interface TestUserData {
  walletAddress: string;
  email?: string;
  username?: string;
}

/**
 * Generate test form data for wizard steps
 */
export function createWizardStepData(step: number, overrides?: Partial<Record<string, string>>): Record<string, string> {
  const baseData: Record<string, Record<string, string>> = {
    1: {
      appName: 'Test App',
      version: '1.0.0',
      did: 'did:test:123',
    },
    2: {
      description: 'Test description',
      website: 'https://test.example.com',
    },
    3: {
      category: 'Web App',
      tags: 'test,example',
    },
  };

  return { ...baseData[step] || {}, ...overrides };
}

