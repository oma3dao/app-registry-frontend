import { NextRequest, NextResponse } from 'next/server';

// Handler now accepts params for dynamic route segments
export async function POST(
  request: NextRequest,
  { params }: { params: { did: string; version: string } } // Added params
) {
  try {
    // Extract did and version from params
    const { did, version } = params; 

    const body = await request.json();

    // Forward the request to the portal-url endpoint
    // Construct the correct target URL including dynamic segments
    const portalUrlPath = `/api/portal-url/${encodeURIComponent(did)}/v/${encodeURIComponent(version)}`;
    const targetUrl = new URL(portalUrlPath, request.url);

    console.log(`[portal-uri] Forwarding request for ${did}/v/${version} to ${targetUrl.toString()}`);

    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward any other relevant headers if necessary
      },
      body: JSON.stringify(body),
    });

    const responseBody = await response.json();

    return NextResponse.json(responseBody, { status: response.status });

  } catch (error) {
    console.error('Error processing portal-uri request:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 