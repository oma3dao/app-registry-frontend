/**
 * Unit tests for POST /api/controller-witness route handler
 *
 * Tests the thin HTTP wrapper in route.ts: request parsing, response shaping,
 * error handling branches, and structured JSON logging (§4.2.7).
 *
 * The business logic (submitControllerWitnessAttestation, validateParams) is
 * tested separately in controller-witness.test.ts — here we mock them and
 * focus on the HTTP layer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the handler module before importing route
const mockSubmit = vi.fn();
const mockValidate = vi.fn();

vi.mock('@/lib/server/controller-witness-handler', () => ({
  submitControllerWitnessAttestation: (...args: unknown[]) => mockSubmit(...args),
  validateParams: (...args: unknown[]) => mockValidate(...args),
  ControllerWitnessRouteError: class ControllerWitnessRouteError extends Error {
    statusCode: number;
    code?: string;
    constructor(message: string, statusCode: number, code?: string) {
      super(message);
      this.name = 'ControllerWitnessRouteError';
      this.statusCode = statusCode;
      this.code = code;
    }
  },
}));

// Import the actual ControllerWitnessRouteError from the mock so instanceof works
import { ControllerWitnessRouteError } from '@/lib/server/controller-witness-handler';

// Import the route handler
import { POST } from '@/app/api/controller-witness/route';

/** Helper: create a mock NextRequest with a JSON body */
function mockRequest(body: Record<string, unknown>): any {
  return {
    json: vi.fn().mockResolvedValue(body),
  };
}

/** Helper: create a mock NextRequest that fails to parse JSON */
function mockBadRequest(): any {
  return {
    json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
  };
}

const validParams = {
  attestationUid: '0x' + 'a'.repeat(64),
  chainId: 66238,
  easContract: '0x' + 'b'.repeat(40),
  schemaUid: '0x' + 'c'.repeat(64),
  subject: 'did:web:example.com',
  controller: 'did:pkh:eip155:66238:0x' + 'd'.repeat(40),
  method: 'dns-txt',
};

describe('POST /api/controller-witness', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockSubmit.mockReset();
    mockValidate.mockReset();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Default: validateParams returns the params as-is
    mockValidate.mockImplementation((body: Record<string, unknown>) => body);
  });

  describe('success responses', () => {
    it('returns 200 with result and elapsed on new attestation', async () => {
      mockSubmit.mockResolvedValue({
        success: true,
        uid: '0x' + 'f'.repeat(64),
        txHash: '0xtxhash',
        blockNumber: 42,
        observedAt: 1700000000,
        existing: false,
      });

      const req = mockRequest(validParams);
      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.uid).toBe('0x' + 'f'.repeat(64));
      expect(body.existing).toBe(false);
      expect(body.elapsed).toMatch(/^\d+ms$/);
    });

    it('returns 200 with existing=true for cached attestation', async () => {
      mockSubmit.mockResolvedValue({
        success: true,
        uid: '0xexisting',
        txHash: null,
        blockNumber: null,
        observedAt: 12345,
        existing: true,
      });

      const req = mockRequest(validParams);
      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.existing).toBe(true);
      expect(body.uid).toBe('0xexisting');
      expect(body.txHash).toBeNull();
    });
  });

  describe('error responses', () => {
    it('returns ControllerWitnessRouteError status and code', async () => {
      mockValidate.mockImplementation(() => {
        throw new ControllerWitnessRouteError('Missing required fields: subject', 400, 'MISSING_FIELDS');
      });

      const req = mockRequest({});
      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Missing required fields: subject');
      expect(body.code).toBe('MISSING_FIELDS');
      expect(body.elapsed).toMatch(/^\d+ms$/);
    });

    it('returns 403 for CHAIN_NOT_APPROVED', async () => {
      mockSubmit.mockRejectedValue(
        new ControllerWitnessRouteError('Chain 99999 is not approved', 403, 'CHAIN_NOT_APPROVED'),
      );

      const req = mockRequest(validParams);
      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.code).toBe('CHAIN_NOT_APPROVED');
    });

    it('returns 500 with SERVER_ERROR for unexpected errors', async () => {
      mockSubmit.mockRejectedValue(new Error('Something unexpected'));

      const req = mockRequest(validParams);
      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.code).toBe('SERVER_ERROR');
      expect(body.error).toBe('Something unexpected');
      expect(body.elapsed).toMatch(/^\d+ms$/);
    });

    it('returns 500 with reason field from ethers errors', async () => {
      const ethersError: any = new Error('call revert exception');
      ethersError.reason = 'execution reverted: Not authorized';
      mockSubmit.mockRejectedValue(ethersError);

      const req = mockRequest(validParams);
      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('execution reverted: Not authorized');
    });

    it('returns 500 with fallback message when error has no message or reason', async () => {
      mockSubmit.mockRejectedValue({});

      const req = mockRequest(validParams);
      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Internal error');
    });

    it('handles JSON parse failure from request body', async () => {
      const req = mockBadRequest();
      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.code).toBe('SERVER_ERROR');
      expect(body.error).toContain('Unexpected token');
    });
  });

  describe('structured logging (§4.2.7)', () => {
    it('logs structured JSON on success with correct fields', async () => {
      mockSubmit.mockResolvedValue({
        success: true,
        uid: '0x' + 'f'.repeat(64),
        txHash: '0xtxhash',
        blockNumber: 42,
        observedAt: 1700000000,
        existing: false,
      });

      const req = mockRequest(validParams);
      await POST(req);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleSpy.mock.calls[0][0] as string);

      expect(logEntry.route).toBe('/api/controller-witness');
      expect(logEntry.status).toBe(200);
      expect(logEntry.outcome).toBe('success');
      expect(typeof logEntry.duration_ms).toBe('number');
      expect(logEntry.duration_ms).toBeGreaterThanOrEqual(0);
      expect(logEntry.subject).toBe(validParams.subject);
      expect(logEntry.controller).toBe(validParams.controller);
      expect(logEntry.method).toBe(validParams.method);
      expect(logEntry.chain_id).toBe(validParams.chainId);
      expect(logEntry.eas_contract).toBe(validParams.easContract);
      expect(logEntry.schema_uid).toBe(validParams.schemaUid);
      expect(logEntry.attestation_uid).toBe(validParams.attestationUid);
      expect(logEntry.witness_uid).toBe('0x' + 'f'.repeat(64));
      // error_code should NOT be present on success
      expect(logEntry.error_code).toBeUndefined();
    });

    it('logs outcome "existing" for cached attestation', async () => {
      mockSubmit.mockResolvedValue({
        success: true,
        uid: '0xexisting',
        txHash: null,
        blockNumber: null,
        observedAt: 12345,
        existing: true,
      });

      const req = mockRequest(validParams);
      await POST(req);

      const logEntry = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(logEntry.outcome).toBe('existing');
      expect(logEntry.witness_uid).toBe('0xexisting');
    });

    it('logs error_code and outcome "error" on ControllerWitnessRouteError', async () => {
      mockSubmit.mockRejectedValue(
        new ControllerWitnessRouteError('Schema not approved', 403, 'SCHEMA_NOT_APPROVED'),
      );

      const req = mockRequest(validParams);
      await POST(req);

      const logEntry = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(logEntry.status).toBe(403);
      expect(logEntry.outcome).toBe('error');
      expect(logEntry.error_code).toBe('SCHEMA_NOT_APPROVED');
      expect(logEntry.witness_uid).toBeUndefined();
    });

    it('logs SERVER_ERROR code on unexpected error', async () => {
      mockSubmit.mockRejectedValue(new Error('kaboom'));

      const req = mockRequest(validParams);
      await POST(req);

      const logEntry = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(logEntry.status).toBe(500);
      expect(logEntry.outcome).toBe('error');
      expect(logEntry.error_code).toBe('SERVER_ERROR');
    });

    it('logs null params when validation fails before params are set', async () => {
      mockValidate.mockImplementation(() => {
        throw new ControllerWitnessRouteError('Missing fields', 400, 'MISSING_FIELDS');
      });

      // Send empty body — params never get populated
      const req = mockRequest({});
      await POST(req);

      const logEntry = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(logEntry.subject).toBeNull();
      expect(logEntry.controller).toBeNull();
      expect(logEntry.method).toBeNull();
      expect(logEntry.chain_id).toBeNull();
    });

    it('logs null params when request JSON is unparseable', async () => {
      const req = mockBadRequest();
      await POST(req);

      const logEntry = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(logEntry.subject).toBeNull();
      expect(logEntry.controller).toBeNull();
      expect(logEntry.status).toBe(500);
    });
  });
});
