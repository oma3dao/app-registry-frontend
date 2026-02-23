import { test, expect } from './fixtures';
import { setupTestPage } from './test-helpers';
import { setupTestWithIsolation } from './test-setup-helper';
import { makeApiRequest, checkServerAvailability } from './api-test-utilities';

test.describe('API Routes', () => {
  test.setTimeout(120000);

  let serverAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      serverAvailable = await checkServerAvailability(page);
    } finally {
      await context.close();
    }
  });

  test.beforeEach(async ({ page }) => {
    await setupTestWithIsolation(page);
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });
  });

  async function apiRequest(
    page: any,
    method: 'GET' | 'POST' | 'OPTIONS',
    url: string,
    options: {
      data?: any;
      headers?: Record<string, string>;
      retries?: number;
      timeout?: number;
      logRequest?: boolean;
    } = {},
  ) {
    const { response } = await makeApiRequest(page, method, url, options);
    return response;
  }

  test('rejects portal-url requests with invalid DID format', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const response = await apiRequest(
      page,
      'POST',
      `/api/portal-url/${encodeURIComponent('invalid-did-format')}/v/1.0.0`,
      {
        data: { location: 'https://test-app.example.com', sourceOs: 'web' },
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      },
    );

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(String(json.error).toLowerCase()).toMatch(/did|invalid|missing/);
  });

  test('rejects portal-url requests with missing IWPS parameters', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const response = await apiRequest(
      page,
      'POST',
      `/api/portal-url/${encodeURIComponent('did:web:test-app.example.com')}/v/1.0.0`,
      {
        data: {},
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      },
    );

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(String(json.error).toLowerCase()).toMatch(/iwps|parameter|required/);
  });

  test('rejects verify-and-attest requests with missing required fields', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const response = await apiRequest(page, 'POST', '/api/verify-and-attest', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json).toHaveProperty('error');
  });

  test('rejects controller-witness requests with missing required fields', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const response = await apiRequest(page, 'POST', '/api/controller-witness', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json).toHaveProperty('code', 'MISSING_FIELDS');
  });

  test('rejects controller-witness requests with invalid subject DID', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const validAddr = '0x' + 'a'.repeat(40);
    const response = await apiRequest(page, 'POST', '/api/controller-witness', {
      data: {
        attestationUid: '0x' + 'b'.repeat(64),
        chainId: 66238,
        easContract: '0x' + 'c'.repeat(40),
        schemaUid: '0x290ce7f909a98f74d2356cf24102ac813555fa0bcd456f1bab17da2d92632e1d',
        subject: 'not-a-valid-did',
        controller: `did:pkh:eip155:66238:${validAddr}`,
        method: 'dns-txt',
      },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json).toHaveProperty('code', 'INVALID_SUBJECT');
  });

  test('rejects controller-witness requests with invalid method', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const validAddr = '0x' + 'a'.repeat(40);
    const response = await apiRequest(page, 'POST', '/api/controller-witness', {
      data: {
        attestationUid: '0x' + 'b'.repeat(64),
        chainId: 66238,
        easContract: '0x' + 'c'.repeat(40),
        schemaUid: '0x290ce7f909a98f74d2356cf24102ac813555fa0bcd456f1bab17da2d92632e1d',
        subject: `did:pkh:eip155:66238:${validAddr}`,
        controller: `did:pkh:eip155:66238:${validAddr}`,
        method: 'invalid-method',
      },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json).toHaveProperty('code', 'INVALID_METHOD');
  });

  test('rejects malformed JSON for verify-and-attest', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const response = await apiRequest(page, 'POST', '/api/verify-and-attest', {
      data: 'invalid json{',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(400);
  });

  test('returns 405 for CORS preflight on verify-and-attest', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const response = await apiRequest(page, 'OPTIONS', '/api/verify-and-attest', {
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
      },
    });

    expect(response.status()).toBe(405);
  });

  test('returns consistent status for repeated invalid verify-and-attest requests', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const responses = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        apiRequest(page, 'POST', '/api/verify-and-attest', {
          data: { did: 'did:web:test-app.example.com', version: '1.0.0' },
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    responses.forEach((response) => {
      expect(response.status()).toBe(400);
    });
  });

  test('rejects validate-url requests with missing URL', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const response = await apiRequest(page, 'POST', '/api/validate-url', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(String(json.error)).toContain('URL is required');
  });

  test('rejects validate-url requests with invalid URL format', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const response = await apiRequest(page, 'POST', '/api/validate-url', {
      data: { url: 'not-a-valid-url' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(String(json.error)).toContain('Invalid URL format');
  });

  test('rejects fetch-metadata requests with missing URL parameter', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const response = await apiRequest(page, 'GET', '/api/fetch-metadata');

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(String(json.error)).toContain('URL parameter is required');
  });

  test('rejects fetch-metadata requests with invalid URL format', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const response = await apiRequest(
      page,
      'GET',
      `/api/fetch-metadata?url=${encodeURIComponent('not-a-valid-url')}`,
    );

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(String(json.error)).toContain('Invalid URL format');
  });

  test('rejects fetch-description requests with missing URL parameter', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const response = await apiRequest(page, 'GET', '/api/fetch-description');

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(String(json.error)).toContain('URL parameter is required');
  });

  test('rejects fetch-description requests with invalid URL format', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const response = await apiRequest(
      page,
      'GET',
      `/api/fetch-description?url=${encodeURIComponent('not-a-valid-url')}`,
    );

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(String(json.error)).toContain('Invalid URL format');
  });

  test('rejects discover-controlling-wallet requests with missing DID', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const response = await apiRequest(page, 'POST', '/api/discover-controlling-wallet', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(String(json.error)).toContain('DID is required');
  });

  test('rejects discover-controlling-wallet requests with invalid did:pkh format', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const response = await apiRequest(page, 'POST', '/api/discover-controlling-wallet', {
      data: { did: 'did:web:test-app.example.com' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(String(json.error)).toContain('Invalid did:pkh format');
  });

  test('returns consistent error status and payload shape across API endpoints', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');

    const endpoints = [
      { method: 'POST', path: '/api/validate-url', data: {}, expectedStatus: 400 },
      { method: 'GET', path: '/api/fetch-metadata', data: null, expectedStatus: 400 },
      { method: 'GET', path: '/api/fetch-description', data: null, expectedStatus: 400 },
      { method: 'POST', path: '/api/discover-controlling-wallet', data: {}, expectedStatus: 400 },
      { method: 'POST', path: '/api/controller-witness', data: {}, expectedStatus: 400 },
    ] as const;

    for (const endpoint of endpoints) {
      const response = await apiRequest(
        page,
        endpoint.method,
        endpoint.path,
        endpoint.method === 'POST'
          ? { data: endpoint.data, headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
          : { timeout: 30000 },
      );

      expect(response.status()).toBe(endpoint.expectedStatus);

      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        if (json && typeof json === 'object' && Object.keys(json).length > 0) {
          expect('error' in json || 'ok' in json).toBe(true);
        }
      }
    }
  });
});
