/**
 * Verify & Attest API Route
 *
 * POST /api/verify-and-attest
 * Thin HTTP wrapper — delegates entirely to verifyAndAttest().
 *
 * Reference: controller-witness/route.ts for the same pattern.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAndAttest,
  VerifyAndAttestError,
  isDebugMode,
} from '@/lib/server/verify-and-attest-handler';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await verifyAndAttest(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof VerifyAndAttestError) {
      return NextResponse.json(error.body, { status: error.statusCode });
    }

    // Unexpected error
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json({
      ok: false,
      status: 'failed',
      error: 'Internal server error',
      ...(isDebugMode() && {
        details: errorMsg,
        stack: errorStack?.split('\n').slice(0, 10).join('\n'),
      }),
    }, { status: 500 });
  }
}
