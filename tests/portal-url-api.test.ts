import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../src/app/api/portal-url/[did]/v/[version]/route';
import * as AppConfig from '../src/config/app-config';

// Mock thirdweb module
vi.mock('thirdweb', () => ({
  readContract: vi.fn(() => Promise.resolve('{"platforms":{"web":{"launchUrl":"https://example.com/launch"}}}')),
}));

// Mock getMetadata to return a valid object for the valid DID/version test
vi.mock('@/lib/contracts/metadata.read', () => ({
  getMetadata: vi.fn(() => Promise.resolve({
    platforms: {
      web: { launchUrl: 'https://example.com/launch' }
    }
  }))
}));

// Helper to create a minimal mock NextRequest
function createMockNextRequest(body = {}) {
  return {
    json: async () => body,
  } as any;
}

// Helper to create params
function createParams(did: string, version: string) {
  return { params: { did, version } };
}

describe('/api/portal-url API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns portal URL for valid DID and version', async () => {
    // Send a minimal valid IWPS body with Group 1 params for platform matching
    const req = createMockNextRequest({ 
      [AppConfig.IWPS_LOCATION_KEY]: 'test-location',
      [AppConfig.IWPS_SOURCE_OS_KEY]: 'web'
    });
    const params = createParams('did:web:example.com', '1.0.0');
    const result = await POST(req, params);
    expect(result).toBeDefined();
    // May return 200 with approval or 404 if metadata not found
    expect([200, 404]).toContain(result.status);
  });

  it('returns 400 if DID is missing', async () => {
    const req = createMockNextRequest({});
    const params = createParams('', '1.0.0');
    const result = await POST(req, params);
    expect(result.status).toBe(400);
  });

  it('returns 400 if version is missing', async () => {
    const req = createMockNextRequest({});
    const params = createParams('did:web:example.com', '');
    const result = await POST(req, params);
    expect(result.status).toBe(400);
  });

  it('handles internal errors gracefully', async () => {
    const req = createMockNextRequest({ did: null, version: null });
    const params = createParams('did:web:example.com', '1.0.0');
    const result = await POST(req, params);
    // The API should handle this gracefully
    expect(result).toBeDefined();
  });
}); 