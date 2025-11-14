import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../src/app/api/portal-url/[did]/v/[version]/route';
import * as AppConfig from '../src/config/app-config';
import { getMetadata } from '@/lib/contracts/metadata.read';

vi.mock('@/lib/contracts/metadata.read', () => ({
  getMetadata: vi.fn(),
}));

const createParams = (did: string, version: string) => ({ params: { did, version } });

const createMockNextRequest = (body: Record<string, unknown> = {}) => ({
  json: vi.fn(async () => body),
}) as unknown as Request;

describe('/api/portal-url API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMetadata).mockResolvedValue({
      platforms: {
        web: { launchUrl: 'https://example.com/launch', downloadUrl: 'https://example.com/download' },
      },
    } as any);
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('returns approval and URLs when metadata contains a matching platform', async () => {
    const req = createMockNextRequest({
      [AppConfig.IWPS_LOCATION_KEY]: 'test-location',
      [AppConfig.IWPS_SOURCE_OS_KEY]: 'web',
      [AppConfig.IWPS_TELEPORT_ID_KEY]: 'teleport-1',
      [AppConfig.IWPS_USER_ID_KEY]: 'user-1',
      [AppConfig.IWPS_TELEPORT_PIN_KEY]: '1234',
      [AppConfig.IWPS_SOURCE_ACK_URL_KEY]: 'https://ack.com',
      [AppConfig.IWPS_SOURCE_NACK_URL_KEY]: 'https://nack.com',
    });

    const res = await POST(req as any, createParams('did:web:example.com', '1.0.0'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toMatchObject({
      [AppConfig.IWPS_APPROVAL_KEY]: true,
      [AppConfig.IWPS_DESTINATION_URL_KEY]: 'https://example.com/launch',
      [AppConfig.IWPS_DOWNLOAD_URL_KEY]: 'https://example.com/download',
      [AppConfig.IWPS_EXPIRATION_KEY]: 0,
    });
  });

  it('uses platform-specific match when web is missing', async () => {
    vi.mocked(getMetadata).mockResolvedValueOnce({
      platforms: {
        ios: { launchUrl: 'https://ios.example.com' },
      },
    } as any);

    const req = createMockNextRequest({
      [AppConfig.IWPS_SOURCE_OS_KEY]: 'iOS',
    });

    const res = await POST(req as any, createParams('did:web:example.com', '1.0.0'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      [AppConfig.IWPS_APPROVAL_KEY]: true,
      [AppConfig.IWPS_DESTINATION_URL_KEY]: 'https://ios.example.com',
    });
  });

  it('returns an error when platform is not supported', async () => {
    vi.mocked(getMetadata).mockResolvedValueOnce({
      platforms: {
        ios: { launchUrl: 'https://ios.example.com' },
      },
    } as any);

    const req = createMockNextRequest({
      [AppConfig.IWPS_SOURCE_OS_KEY]: 'android',
    });

    const res = await POST(req as any, createParams('did:web:example.com', '1.0.0'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      [AppConfig.IWPS_APPROVAL_KEY]: false,
      [AppConfig.IWPS_ERROR_KEY]: 'Platform not supported based on provided source parameters.',
    });
  });

  it('returns 400 when Group 2 parameters are partially provided', async () => {
    const req = createMockNextRequest({
      [AppConfig.IWPS_SOURCE_OS_KEY]: 'web',
      [AppConfig.IWPS_TELEPORT_ID_KEY]: 'partial',
    });

    const res = await POST(req as any, createParams('did:web:example.com', '1.0.0'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Incomplete Group 2 parameters');
  });

  it('requires at least one IWPS parameter when sourceOs is missing', async () => {
    const req = createMockNextRequest({});

    const res = await POST(req as any, createParams('did:web:example.com', '1.0.0'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Request must include some IWPS parameters (either Group 1 or Group 2 related).');
  });

  it('returns 500 when metadata fetch fails', async () => {
    vi.mocked(getMetadata).mockRejectedValueOnce(new Error('fetch failed'));

    const req = createMockNextRequest({
      [AppConfig.IWPS_SOURCE_OS_KEY]: 'web',
    });

    const res = await POST(req as any, createParams('did:web:example.com', '1.0.0'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to retrieve application metadata');
  });

  it('returns 404 when metadata is not found', async () => {
    vi.mocked(getMetadata).mockResolvedValueOnce(null);

    const req = createMockNextRequest({
      [AppConfig.IWPS_SOURCE_OS_KEY]: 'web',
    });

    const res = await POST(req as any, createParams('did:web:missing.com', '1.0.0'));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Application metadata not found for the specified DID and version');
  });

  it('returns 400 if DID is invalid', async () => {
    const req = createMockNextRequest({
      [AppConfig.IWPS_SOURCE_OS_KEY]: 'web',
    });
    const res = await POST(req as any, createParams('', '1.0.0'));
    expect(res.status).toBe(400);
  });

  it('returns 400 if version is invalid', async () => {
    const req = createMockNextRequest({
      [AppConfig.IWPS_SOURCE_OS_KEY]: 'web',
    });
    const res = await POST(req as any, createParams('did:web:example.com', ''));
    expect(res.status).toBe(400);
  });

  it('returns 400 when request body contains invalid JSON', async () => {
    const req = {
      json: vi.fn(async () => {
        throw new SyntaxError('invalid json');
      }),
    };

    const res = await POST(req as any, createParams('did:web:example.com', '1.0.0'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid JSON body');
  });

  it('returns 500 when body parsing throws a non-syntax error', async () => {
    const req = {
      json: vi.fn(async () => {
        throw new Error('unexpected error');
      }),
    };

    const res = await POST(req as any, createParams('did:web:example.com', '1.0.0'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal Server Error');
  });
});