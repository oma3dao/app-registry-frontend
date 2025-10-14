import { NextResponse } from 'next/server';
import { generateNonceToken } from '@/lib/server/siwe-nonce';

export async function GET() {
  try {
    const nonce = generateNonceToken();
    console.log('[siwe-nonce] Generated nonce token');
    
    return NextResponse.json({ nonce });
  } catch (error) {
    console.error('[siwe-nonce] Error generating nonce:', error);
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    );
  }
}
