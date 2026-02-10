/**
 * Controller Witness Attestation API Route
 *
 * POST /api/controller-witness
 * Thin HTTP wrapper — delegates entirely to submitControllerWitnessAttestation().
 * Emits a single structured JSON log line per request for Vercel Axiom.
 *
 * Reference: CONTROLLER-WITNESS-SCHEMA.md §4.2.4, §4.2.7
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  submitControllerWitnessAttestation,
  validateParams,
  ControllerWitnessRouteError,
  type ControllerWitnessAttestationParams,
} from '@/lib/server/controller-witness';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // Fields for the structured log line — populated progressively
  let params: Partial<ControllerWitnessAttestationParams> = {};
  let status = 500;
  let outcome: 'success' | 'existing' | 'error' = 'error';
  let errorCode: string | undefined;
  let witnessUid: string | undefined;

  try {
    const body = await req.json();
    const validated = validateParams(body);
    params = validated;

    const result = await submitControllerWitnessAttestation(validated);

    status = 200;
    outcome = result.existing ? 'existing' : 'success';
    witnessUid = result.uid;

    const elapsed = `${Date.now() - startTime}ms`;

    return NextResponse.json({ ...result, elapsed }, { status: 200 });
  } catch (error) {
    if (error instanceof ControllerWitnessRouteError) {
      status = error.statusCode;
      errorCode = error.code;
      const elapsed = `${Date.now() - startTime}ms`;
      return NextResponse.json(
        { error: error.message, code: error.code, elapsed },
        { status: error.statusCode },
      );
    }

    // Unexpected error
    status = 500;
    errorCode = 'SERVER_ERROR';
    const elapsed = `${Date.now() - startTime}ms`;
    const message =
      (error as any)?.reason || (error as any)?.message || 'Internal error';
    return NextResponse.json(
      { error: message, code: 'SERVER_ERROR', elapsed },
      { status: 500 },
    );
  } finally {
    // Single structured JSON log line per request (§4.2.7)
    const logEntry = {
      route: '/api/controller-witness',
      status,
      duration_ms: Date.now() - startTime,
      outcome,
      ...(errorCode && { error_code: errorCode }),
      subject: params.subject ?? null,
      controller: params.controller ?? null,
      method: params.method ?? null,
      chain_id: params.chainId ?? null,
      eas_contract: params.easContract ?? null,
      schema_uid: params.schemaUid ?? null,
      attestation_uid: params.attestationUid ?? null,
      ...(witnessUid && { witness_uid: witnessUid }),
    };
    console.log(JSON.stringify(logEntry));
  }
}
